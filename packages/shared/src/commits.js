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
