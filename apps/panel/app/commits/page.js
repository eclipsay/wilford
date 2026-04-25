import Link from "next/link";
import { formatShortSha } from "@wilford/shared";
import { fetchPublic } from "../../lib/api";
import { requireAuth } from "../../lib/auth";
import { PanelShell } from "../../components/PanelShell";

export default async function PanelCommitsPage() {
  await requireAuth();
  const { commits } = await fetchPublic("/api/commits");

  return (
    <PanelShell
      title="Commits"
      description="Visible repository activity as currently provided to the public site."
    >
      <section className="panel-card list-card">
        <div className="record-list">
          {commits.map((commit) => (
            <Link
              className="commit-admin-row"
              href={commit.html_url || "#"}
              key={commit.sha}
              target="_blank"
            >
              <span>{formatShortSha(commit.sha)}</span>
              <strong>{commit.message}</strong>
              <span>{commit.author} / {commit.date}</span>
            </Link>
          ))}
        </div>
      </section>
    </PanelShell>
  );
}
