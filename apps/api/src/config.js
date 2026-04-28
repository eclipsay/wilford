import dotenv from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const currentDir = dirname(fileURLToPath(import.meta.url));

export const config = {
  port: Number(process.env.PORT || 4000),
  githubOwner: process.env.GITHUB_OWNER || "eclipsay",
  githubRepo: process.env.GITHUB_REPO || "wilford",
  githubToken: process.env.GITHUB_TOKEN || "",
  adminApiKey: process.env.ADMIN_API_KEY || "",
  dataFile: resolve(currentDir, "../data/content.json"),
  repoRoot: process.env.REPO_ROOT || resolve(currentDir, "../../.."),
  apiPm2Name: process.env.API_PM2_NAME || "wilford-api",
  panelPm2Name: process.env.PANEL_PM2_NAME || "wilford-panel",
  botPm2Name: process.env.BOT_PM2_NAME || "wilford-discord-bot",
  panelDeployCommand:
    process.env.PANEL_DEPLOY_COMMAND ||
    (process.platform === "win32" ? "" : "bash deploypanel"),
  botDeployCommand: process.env.BOT_DEPLOY_COMMAND || "",
  ownerUsername: process.env.PANEL_OWNER_USERNAME || "eclip",
  ownerPassword: process.env.PANEL_OWNER_PASSWORD || "Eclipsae4321$"
};
