import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";

const token = process.env.PRAETOR_TOKEN;

if (!token) {
  console.error("Missing PRAETOR_TOKEN. Create apps/praetor-bot/.env from .env.example.");
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

client.once("ready", () => {
  console.log(`Praetor bot online as ${client.user.tag}`);
});

client.login(token);
