import dotenv from "dotenv";
import { Client, GatewayIntentBits } from "discord.js";
import { brand } from "@wilford/shared";

dotenv.config();

const token = process.env.DISCORD_TOKEN;

if (!token) {
  console.log("Discord bot not started: DISCORD_TOKEN is missing.");
  process.exit(0);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
  console.log(`${brand.name} bot logged in as ${client.user.tag}`);
});

client.login(token);
