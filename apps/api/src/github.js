import { fallbackCommits, filterVisibleCommits } from "@wilford/shared";
import { config } from "./config.js";

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

export async function getCommits() {
  const headers = {
    Accept: "application/vnd.github+json"
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
    return filterVisibleCommits(fallbackCommits);
  }
}
