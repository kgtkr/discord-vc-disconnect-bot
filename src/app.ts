import * as Discord from "discord.js";
import * as fs from "fs";
import * as cron from "node-cron";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v9";
import {
  SlashCommandStringOption,
  SlashCommandBuilder,
  SlashCommandBooleanOption,
} from "@discordjs/builders";
import level from "level";
import { v4 as uuidv4 } from "uuid";

const db = level("app.db");

const config: { token: string; appId: string } = JSON.parse(
  fs.readFileSync("config.json", { encoding: "utf8" })
);

const rest = new REST({ version: "9" }).setToken(config.token);
const client = new Discord.Client({
  intents: [Discord.Intents.FLAGS.GUILDS, Discord.Intents.FLAGS.GUILD_MEMBERS],
});

const scopeChoices: [string, string][] = [
  ["個人設定", "personal"],
  ["サーバー設定", "guild"],
  ["個人全サーバー共通設定", "global"],
];

const commands = [
  new SlashCommandBuilder()
    .setName("notification")
    .setDescription("DM通知設定")
    .addBooleanOption(
      new SlashCommandBooleanOption().setName("enable").setRequired(true)
    ),
  new SlashCommandBuilder()
    .setName("add")
    .setDescription("タイマー追加")
    .addStringOption(
      new SlashCommandStringOption()
        .setName("scope")
        .setRequired(true)
        .addChoices(scopeChoices)
    ),
  new SlashCommandBuilder().setName("remove").setDescription("タイマー削除"),
  new SlashCommandBuilder()
    .setName("list")
    .setDescription("タイマー一覧")
    .addStringOption(
      new SlashCommandStringOption().setName("scope").addChoices(scopeChoices)
    ),
].map((command) => command.toJSON());

type Notification = boolean;

function makeNotificationKey(userId: string): string {
  return `notification!${userId}`;
}

async function getNotification(userId: string): Promise<Notification> {
  try {
    const value = JSON.parse(await db.get(makeNotificationKey(userId)));
    return value;
  } catch {
    return false;
  }
}

async function setNotification(
  userId: string,
  value: Notification
): Promise<void> {
  await db.put(makeNotificationKey(userId), JSON.stringify(value));
}

type TimersId =
  | {
      type: "guild";
      guildId: string;
    }
  | {
      type: "global";
      userId: string;
    }
  | {
      type: "personal";
      userId: string;
      guildId: string;
    };

function timersIdToString(value: TimersId): string {
  switch (value.type) {
    case "guild":
      return `guild!${value.guildId}`;
    case "global":
      return `global!${value.userId}`;
    case "personal":
      return `personal!${value.userId}!${value.guildId}`;
  }
}

type TimerId = {
  id: string;
  timersId: TimersId;
};

function timerIdToString(value: TimerId): string {
  return `${timersIdToString(value.timersId)}!${value.id}`;
}

type Timer =
  | {
      type: "once";
      datetime: string;
    }
  | {
      type: "everyday";
      time: string;
    };

/*
通知設定
notification!{user_id}


timers_id
guild!{guild_id}
global!{user_id}
personal!{user_id}!{guild_id}

timer_id
{timers_id}!{uuid}

設定項目
timer!{timer_id}

キュー
jobs!{time_stamp}!{uuid}
*/

(async () => {
  try {
    await rest.put(Routes.applicationCommands(config.appId), {
      body: commands,
    });
  } catch (error) {
    console.error(error);
  }
})();

async function allKick() {
  for (const guild of client.guilds.cache.array()) {
    for (const member of guild.members.cache.array()) {
      try {
        await member.voice.kick();
      } catch (e) {
        console.error(e);
      }
    }
  }
}

client.on("ready", async () => {});

cron.schedule(
  "0 0 4,5,6,7 * * *",
  async () => {
    try {
      await allKick();
    } catch (e) {
      console.error(e);
    }
  },
  { timezone: "Asia/Tokyo" }
);

client.login(config.token);
