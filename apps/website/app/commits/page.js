import Link from "next/link";
import { formatShortSha } from "@wilford/shared";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getSiteContent, getVisibleCommits } from "../../lib/content";

export default async function CommitsPage() {
  const [commits, content] = await Promise.all([
    getVisibleCommits(),
    getSiteContent()
  ]);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Transmission Feed"
        title="Recent Commits"
        description="Wilford Industries' latest visible commits from the official repository on GitHub."
      />

      <main className="content">
        <section className="commit-panel">
          <div className="commit-panel__header">
            <div>
              <p className="eyebrow">Repository</p>
              <h2>{content.settings.commitsRepository}</h2>
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
