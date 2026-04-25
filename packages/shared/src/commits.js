export function filterVisibleCommits(commits = []) {
  return commits.filter((commit) => {
    const message =
      commit?.message ?? commit?.commit?.message ?? "";
    return !message.toLowerCase().includes("silent");
  });
}

export function formatShortSha(sha = "") {
  return sha.slice(0, 7);
}

export const fallbackCommits = [
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
