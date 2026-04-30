import { execFileSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { fallbackCommits, filterVisibleCommits } from "@wilford/shared";
import { config } from "./config.js";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "../../..");

function normalizeCommit(commit) {
  return {
    sha: commit.sha,
    author: commit.commit?.author?.name || "Unknown author",
    login: commit.author?.login || "github",
    date: commit.commit?.author?.date || "",
    message: commit.commit?.message || "",
    html_url: commit.html_url || "#"
  };
}

function getCommitUrl(sha) {
  return `https://github.com/${config.githubOwner}/${config.githubRepo}/commit/${sha}`;
}

function getLocalGitCommits() {
  try {
    const raw = execFileSync(
      "git",
      [
        "log",
        "--date=iso-strict",
        "--pretty=format:%H%x1f%an%x1f%ad%x1f%s%x1e",
        "-n",
        "12"
      ],
      {
        cwd: repoRoot,
        encoding: "utf8"
      }
    );

    return raw
      .split("\x1e")
      .map((entry) => entry.trim())
      .filter(Boolean)
      .map((entry) => {
        const [sha, author, date, message] = entry.split("\x1f");

        return {
          sha,
          author,
          login: config.githubOwner,
          date,
          message,
          html_url: getCommitUrl(sha)
        };
      });
  } catch {
    return [];
  }
}

export async function getCommits() {
  const headers = {
    Accept: "application/vnd.github+json",
    "User-Agent": "wilford-api",
    "X-GitHub-Api-Version": "2022-11-28"
  };

  if (config.githubToken) {
    headers.Authorization = `Bearer ${config.githubToken}`;
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${config.githubOwner}/${config.githubRepo}/commits?per_page=12`,
      { headers }
    );

    if (!response.ok) {
      throw new Error(`GitHub request failed with status ${response.status}`);
    }

    const data = await response.json();
    return filterVisibleCommits(data.map(normalizeCommit));
  } catch {
    const localCommits = getLocalGitCommits();

    if (localCommits.length) {
      return filterVisibleCommits(localCommits);
    }

    return filterVisibleCommits(fallbackCommits);
  }
}
