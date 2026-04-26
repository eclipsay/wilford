import { spawn } from "node:child_process";

const host = process.env.WILFORD_SSH_HOST || "ubuntu@15.204.118.151";
const appDir = process.env.WILFORD_APP_DIR || "/var/www/wilford";

const commands = {
  shell: "",
  panel: "bash deploypanel",
  "panel-full": [
    `cd ${appDir}`,
    "git pull origin main",
    "npm install",
    "npm run build --workspace @wilford/panel",
    "pm2 restart wilford-panel",
    "pm2 save"
  ].join(" && "),
  all: [`cd ${appDir}`, "git pull", "pm2 restart all"].join(" && "),
  services: [
    `cd ${appDir}`,
    "git pull",
    "pm2 restart wilford-api",
    "pm2 restart wilford-panel",
    "pm2 save"
  ].join(" && ")
};

function printHelp() {
  console.log(`Wilford remote helpers

Usage:
  npm.cmd run remote:shell        Open SSH shell
  npm.cmd run remote:panel        Run: bash deploypanel
  npm.cmd run remote:panel:full   Pull, install, build panel workspace, restart panel
  npm.cmd run remote:all          Pull and restart all PM2 processes
  npm.cmd run remote:services     Pull, restart API + panel, and save PM2

Environment overrides:
  WILFORD_SSH_HOST=${host}
  WILFORD_APP_DIR=${appDir}

This script does not store the SSH password. Type it when ssh prompts.`);
}

const action = process.argv[2] || "help";

if (action === "help" || !Object.hasOwn(commands, action)) {
  printHelp();
  process.exit(action === "help" ? 0 : 1);
}

const sshArgs = commands[action] ? [host, commands[action]] : [host];

console.log(`Connecting to ${host}...`);
if (commands[action]) {
  console.log(`Running remote command:\n${commands[action]}`);
}

const child = spawn("ssh", sshArgs, {
  stdio: "inherit",
  shell: process.platform === "win32"
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
