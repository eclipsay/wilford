const localDeployJobs = new Map();

function normalizeLinesFromSteps(steps) {
  const lines = [];

  for (const step of steps || []) {
    lines.push(`$ ${step.command}`);

    for (const line of String(step.stdout || "").split(/\r?\n/)) {
      if (line.trim()) {
        lines.push(line);
      }
    }

    for (const line of String(step.stderr || "").split(/\r?\n/)) {
      if (line.trim()) {
        lines.push(`! ${line}`);
      }
    }

    lines.push("> completed with exit code 0");
  }

  return lines;
}

export function createLocalDeployJob(target, payload) {
  const job = {
    id: `local-${target}-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    target,
    status: payload?.ok === false ? "failed" : "completed",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    steps: payload?.steps || [],
    lines: normalizeLinesFromSteps(payload?.steps || []),
    error: payload?.error || ""
  };

  if (!job.lines.length && job.error) {
    job.lines = [`! ${job.error}`];
  }

  localDeployJobs.set(job.id, job);
  return job;
}

export function getLocalDeployJob(id) {
  return localDeployJobs.get(id) || null;
}
