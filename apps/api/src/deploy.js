import { spawn } from "node:child_process";
import { config } from "./config.js";

const deployJobs = new Map();

function createJob(target) {
  const id = `deploy-${target}-${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const job = {
    id,
    target,
    status: "queued",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lines: [],
    steps: []
  };

  deployJobs.set(id, job);
  return job;
}

function appendJobLine(job, line) {
  job.lines.push(line);
  job.lines = job.lines.slice(-400);
  job.updatedAt = new Date().toISOString();
}

function getDeployPlan(target) {
  if (target === "bot") {
    return [
      { command: "git", args: ["pull", "--ff-only", "origin", "main"] },
      {
        command: "npm",
        args: ["run", "build", "--workspace", "@wilford/discord-bot"]
      },
      { command: "pm2", args: ["restart", config.botPm2Name] }
    ];
  }

  return [
    { command: "git", args: ["pull", "--ff-only", "origin", "main"] },
    { command: "npm", args: ["run", "build", "--workspace", "@wilford/panel"] },
    { command: "pm2", args: ["restart", config.panelPm2Name] }
  ];
}

async function runStep(job, step) {
  const commandLabel = `${step.command} ${step.args.join(" ")}`;
  const stepRecord = {
    command: commandLabel,
    stdout: "",
    stderr: ""
  };

  job.steps.push(stepRecord);
  appendJobLine(job, `$ ${commandLabel}`);

  await new Promise((resolve, reject) => {
    const child = spawn(step.command, step.args, {
      cwd: config.repoRoot,
      env: process.env,
      shell: false
    });

    child.stdout.on("data", (chunk) => {
      const text = chunk.toString();
      stepRecord.stdout += text;
      for (const line of text.split(/\r?\n/)) {
        if (line.trim()) {
          appendJobLine(job, line);
        }
      }
    });

    child.stderr.on("data", (chunk) => {
      const text = chunk.toString();
      stepRecord.stderr += text;
      for (const line of text.split(/\r?\n/)) {
        if (line.trim()) {
          appendJobLine(job, `! ${line}`);
        }
      }
    });

    child.on("error", (error) => {
      appendJobLine(job, `! ${error.message}`);
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        appendJobLine(job, `> completed with exit code 0`);
        resolve();
        return;
      }

      const error = new Error(`${commandLabel} failed with exit code ${code}`);
      appendJobLine(job, `! ${error.message}`);
      reject(error);
    });
  });
}

async function runDeployJob(job) {
  job.status = "running";
  job.updatedAt = new Date().toISOString();

  try {
    for (const step of getDeployPlan(job.target)) {
      await runStep(job, step);
    }

    job.status = "completed";
    job.updatedAt = new Date().toISOString();
  } catch (error) {
    job.status = "failed";
    job.updatedAt = new Date().toISOString();
    job.error =
      error instanceof Error ? error.message : "Deployment failed.";
  }
}

export function startDeployJob(target) {
  const job = createJob(target);
  runDeployJob(job);
  return job;
}

export function getDeployJob(id) {
  return deployJobs.get(id) || null;
}

export async function deployPanel() {
  const job = startDeployJob("panel");

  while (job.status === "queued" || job.status === "running") {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  if (job.status !== "completed") {
    throw new Error(job.error || "Panel deploy failed.");
  }

  return {
    ok: true,
    steps: job.steps.map((step) => ({
      command: step.command,
      stdout: step.stdout.trim(),
      stderr: step.stderr.trim()
    }))
  };
}

export async function deployDiscordBot() {
  const job = startDeployJob("bot");

  while (job.status === "queued" || job.status === "running") {
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  if (job.status !== "completed") {
    throw new Error(job.error || "Discord bot deploy failed.");
  }

  return {
    ok: true,
    steps: job.steps.map((step) => ({
      command: step.command,
      stdout: step.stdout.trim(),
      stderr: step.stderr.trim()
    }))
  };
}
