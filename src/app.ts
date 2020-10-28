import * as Discord from "discord.js";
import * as fs from "fs";
import * as cron from "node-cron";

const client = new Discord.Client();

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

cron.schedule("0 0 4,5,6,7 * * *", async () => {
  try {
    await allKick();
  } catch (e) {
    console.error(e);
  }
});

client.login(
  JSON.parse(fs.readFileSync("config.json", { encoding: "utf8" })).token
);
