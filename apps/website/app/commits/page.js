import Link from "next/link";
import {
  fallbackCommits,
  filterVisibleCommits,
  formatShortSha
} from "@wilford/shared";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";

async function getCommits() {
  const baseUrl =
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    "http://localhost:4000";

  try {
    const response = await fetch(`${baseUrl}/api/commits`, {
      cache: "no-store"
    });

    if (!response.ok) {
      throw new Error("Failed to load commits");
    }

    const data = await response.json();
    return filterVisibleCommits(data.commits || []);
  } catch {
    return filterVisibleCommits(fallbackCommits);
  }
}

export default async function CommitsPage() {
  const commits = await getCommits();

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Transmission Feed"
        title="Recent Commits"
        description="Public repository activity, filtered to exclude restricted commit messages."
      />

      <main className="content">
        <section className="commit-panel">
          <div className="commit-panel__header">
            <div>
              <p className="eyebrow">Repository</p>
              <h2>eclipsay/wilford</h2>
            </div>
            <Link className="button" href="https://github.com/eclipsay/wilford">
              Open Repository
            </Link>
          </div>

          {commits.length ? (
            <div className="commit-log" role="list">
              {commits.map((commit) => (
                <Link
                  key={commit.sha}
                  className="commit-row"
                  href={commit.html_url || "#"}
                  target="_blank"
                  role="listitem"
                >
                  <span className="commit-row__sha">{formatShortSha(commit.sha)}</span>
                  <span className="commit-row__message">{commit.message}</span>
                  <span className="commit-row__meta">
                    <span>{commit.author}</span>
                    <span className="commit-row__dot">/</span>
                    <span>{commit.date}</span>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="panel">
              <p>No commits available yet. Connect the API to GitHub or use the local fallback feed.</p>
            </div>
          )}
        </section>
      </main>
    </SiteLayout>
  );
}
