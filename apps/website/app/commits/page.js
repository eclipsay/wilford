import Link from "next/link";
import { filterVisibleCommits, formatShortSha } from "@wilford/shared";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";

async function getCommits() {
  const baseUrl =
    process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

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
    return [];
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
        <section className="panel">
          {commits.length ? (
            <div>
              {commits.map((commit) => (
                <div
                  key={commit.sha}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "120px 1fr 180px",
                    gap: "16px",
                    padding: "16px 0",
                    borderBottom: "1px solid rgba(211,157,79,0.18)"
                  }}
                >
                  <span style={{ color: "var(--gold)" }}>{formatShortSha(commit.sha)}</span>
                  <strong>{commit.message}</strong>
                  <span style={{ color: "var(--text-soft)", textAlign: "right" }}>
                    {commit.author}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p>No commits available yet. Connect the API to GitHub or use the local fallback feed.</p>
          )}

          <p style={{ marginTop: "24px" }}>
            <Link href="https://github.com/eclipsay/wilford">Open Repository</Link>
          </p>
        </section>
      </main>
    </SiteLayout>
  );
}
