"use client";

import { useEffect, useRef, useState } from "react";

const ACTIVE_JOB_STORAGE_KEY = "wilford-active-deploy-job";

function formatTimestamp(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

function formatStatus(status) {
  if (status === "queued") {
    return "Queued";
  }

  if (status === "running") {
    return "Running";
  }

  if (status === "completed") {
    return "Completed";
  }

  if (status === "failed") {
    return "Failed";
  }

  return "Idle";
}

export function DeployControl() {
  const [job, setJob] = useState(null);
  const [error, setError] = useState("");
  const pollRef = useRef(null);

  useEffect(() => {
    const savedJobId = window.localStorage.getItem(ACTIVE_JOB_STORAGE_KEY);

    if (savedJobId) {
      pollJob(savedJobId);
    }

    return () => {
      if (pollRef.current) {
        window.clearTimeout(pollRef.current);
      }
    };
  }, []);

  async function startDeploy(target) {
    setError("");

    try {
      const response = await fetch(`/api/system/deploy/${target}`, {
        method: "POST"
      });
      const payload = await response.json();

      if (!response.ok || !payload?.job?.id) {
        throw new Error(payload?.error || "Unable to start deployment.");
      }

      setJob(payload.job);
      window.localStorage.setItem(ACTIVE_JOB_STORAGE_KEY, payload.job.id);
      pollJob(payload.job.id);
    } catch (nextError) {
      setError(
        nextError instanceof Error ? nextError.message : "Unable to start deployment."
      );
    }
  }

  async function pollJob(jobId) {
    if (pollRef.current) {
      window.clearTimeout(pollRef.current);
    }

    try {
      const response = await fetch(`/api/system/deploy/jobs/${jobId}`, {
        cache: "no-store"
      });
      const payload = await response.json();

      if (!response.ok || !payload?.job) {
        throw new Error(payload?.error || "Unable to load deployment status.");
      }

      setJob(payload.job);

      if (["queued", "running"].includes(payload.job.status)) {
        pollRef.current = window.setTimeout(() => pollJob(jobId), 900);
        return;
      }

      window.localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
    } catch (nextError) {
      setError(
        nextError instanceof Error
          ? nextError.message
          : "Unable to load deployment status."
      );
      window.localStorage.removeItem(ACTIVE_JOB_STORAGE_KEY);
    }
  }

  const isRunning = ["queued", "running"].includes(job?.status);
  const consoleTitle =
    job?.target === "bot" ? "Discord Bot Output" : "Website Panel Output";
  const consoleStatus = job?.status || "idle";
  const consoleLines =
    Array.isArray(job?.lines) && job.lines.length
      ? job.lines
      : ["No deployment output has been captured yet."];

  return (
    <>
      <section className="panel-grid">
        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Website</p>
              <h2>Deploy Control Panel</h2>
            </div>
          </div>
          <p>
            Run the VPS panel deployment shortcut and stream the resulting output
            back into this console.
          </p>
          <button
            className="button button--solid"
            disabled={isRunning}
            onClick={() => startDeploy("panel")}
            type="button"
          >
            {isRunning && job?.target === "panel" ? "Deploying..." : "Deploy Website Panel"}
          </button>
        </article>

        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Discord Bot</p>
              <h2>Pull And Restart</h2>
            </div>
          </div>
          <p>
            Restart the Discord bot deployment flow using the server-side bot
            deploy configuration.
          </p>
          <button
            className="button button--solid"
            disabled={isRunning}
            onClick={() => startDeploy("bot")}
            type="button"
          >
            {isRunning && job?.target === "bot" ? "Deploying..." : "Deploy Bot"}
          </button>
        </article>
      </section>

      <section className="panel-card panel-card--wide">
        <div className="panel-card__header">
          <div>
            <p className="card__kicker">Deploy Console</p>
            <h2>{consoleTitle}</h2>
          </div>
        </div>
        {error ? <p className="form-error">{error}</p> : null}
        <div className="deploy-console">
          <div className="deploy-console__header">
            <span
              className={`deploy-console__status${
                consoleStatus === "failed" ? " deploy-console__status--error" : ""
              }`}
            >
              {formatStatus(consoleStatus)}
            </span>
            <small>{formatTimestamp(job?.updatedAt || job?.createdAt)}</small>
          </div>
          <div className="deploy-console__body">
            <article className="deploy-console__step">
              <pre>{consoleLines.join("\n")}</pre>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
