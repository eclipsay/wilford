import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { config } from "./config.js";

const execFileAsync = promisify(execFile);

async function run(command, args, cwd = config.repoRoot) {
  const result = await execFileAsync(command, args, {
    cwd,
    env: process.env
  });

  return {
    command: `${command} ${args.join(" ")}`,
    stdout: result.stdout?.trim() || "",
    stderr: result.stderr?.trim() || ""
  };
}

export async function deployPanel() {
  const steps = [];

  steps.push(await run("git", ["pull", "--ff-only", "origin", "main"]));
  steps.push(
    await run("npm", ["run", "build", "--workspace", "@wilford/panel"])
  );
  steps.push(await run("pm2", ["restart", config.panelPm2Name]));

  return {
    ok: true,
    steps
  };
}

export async function deployDiscordBot() {
  const steps = [];

  steps.push(await run("git", ["pull", "--ff-only", "origin", "main"]));
  steps.push(
    await run("npm", ["run", "build", "--workspace", "@wilford/discord-bot"])
  );
  steps.push(await run("pm2", ["restart", config.botPm2Name]));

  return {
    ok: true,
    steps
  };
}
