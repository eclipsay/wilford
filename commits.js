(function () {
  const feed = document.getElementById("commit-feed");
  const status = document.getElementById("commit-status");

  if (!feed || !status) {
    return;
  }

  const owner = feed.dataset.owner;
  const repo = feed.dataset.repo;

  if (!owner || !repo) {
    status.textContent = "Offline";
    feed.innerHTML =
      '<article class="commit-card commit-card--error"><p>Repository configuration is missing.</p></article>';
    return;
  }

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/commits?per_page=12`;

  const formatDate = (value) => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date(value));
    } catch (_error) {
      return value;
    }
  };

  const escapeHtml = (value) =>
    value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");

  const renderCard = (commit) => {
    const message = commit.commit.message || "No commit message";
    const firstLine = message.split("\n")[0];
    const author = commit.commit.author?.name || "Unknown author";
    const date = commit.commit.author?.date || "";
    const shortSha = commit.sha.slice(0, 7);
    const commitUrl = commit.html_url || "#";

    return `
      <article class="commit-card">
        <div class="commit-card__topline">
          <span class="commit-card__sha">${escapeHtml(shortSha)}</span>
          <span class="commit-card__date">${escapeHtml(formatDate(date))}</span>
        </div>
        <h3>${escapeHtml(firstLine)}</h3>
        <p class="commit-card__meta">Issued by ${escapeHtml(author)}</p>
        <a class="commit-card__link" href="${escapeHtml(
          commitUrl
        )}" target="_blank" rel="noreferrer">Open on GitHub</a>
      </article>
    `;
  };

  const renderError = (message) => {
    status.textContent = "Unavailable";
    feed.innerHTML = `
      <article class="commit-card commit-card--error">
        <p>${escapeHtml(message)}</p>
      </article>
    `;
  };

  fetch(apiUrl, {
    headers: {
      Accept: "application/vnd.github+json",
    },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`GitHub request failed with status ${response.status}.`);
      }
      return response.json();
    })
    .then((commits) => {
      const visibleCommits = commits.filter((commit) => {
        const message = commit.commit?.message || "";
        return !message.toLowerCase().includes("silent");
      });

      status.textContent = `${visibleCommits.length} Visible`;

      if (!visibleCommits.length) {
        feed.innerHTML = `
          <article class="commit-card commit-card--empty">
            <p>No commits are currently visible after applying Wilford filtering.</p>
          </article>
        `;
        return;
      }

      feed.innerHTML = visibleCommits.map(renderCard).join("");
    })
    .catch((error) => {
      renderError(
        error.message ||
          "Unable to retrieve commits from GitHub at this time."
      );
    });
})();
