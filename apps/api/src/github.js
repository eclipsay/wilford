import { filterVisibleCommits } from "@wilford/shared";
import { config } from "./config.js";

const fallbackCommits = [
  {
    sha: "884ccce0ed8dd926579cc1a33dfbce536fc2d9ac",
    author: "Eclip",
    login: "eclipsay",
    date: "2026-04-25",
    message: "making commits page",
    html_url: "https://github.com/eclipsay/wilford/commit/884ccce0ed8dd926579cc1a33dfbce536fc2d9ac"
  },
  {
    sha: "e2562fad118d50a671467f490e1d0a066ed413a3",
    author: "Eclip",
    login: "eclipsay",
    date: "2026-04-25",
    message: "Sitemapping",
    html_url: "https://github.com/eclipsay/wilford/commit/e2562fad118d50a671467f490e1d0a066ed413a3"
  },
  {
    sha: "348f6931ac0ab691db590c76876f531283d3e789",
    author: "Eclip",
    login: "eclipsay",
    date: "2026-04-25",
    message: "ironing out the navmap of website",
    html_url: "https://github.com/eclipsay/wilford/commit/348f6931ac0ab691db590c76876f531283d3e789"
  },
  {
    sha: "44f76db8692ded27e03736d2e75a014ccbdfc6f2",
    author: "Eclip",
    login: "eclipsay",
    date: "2026-04-25",
    message: "First look at website",
    html_url: "https://github.com/eclipsay/wilford/commit/44f76db8692ded27e03736d2e75a014ccbdfc6f2"
  }
];

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
