import Link from "next/link";
import { fetchPublic } from "../lib/api";
import { requireAuth } from "../lib/auth";
import { PanelShell } from "../components/PanelShell";

export default async function PanelHomePage() {
  await requireAuth();
  const [content, commits] = await Promise.all([
    fetchPublic("/api/content"),
    fetchPublic("/api/commits")
  ]);

  return (
    <PanelShell
      title="Panel Dashboard"
      description="Quick access to the main Wilford controls."
    >
      <section className="cards">
        <article className="card">
          <p className="card__kicker">Members</p>
          <h2>{content.members.length}</h2>
          <p>Current public member records.</p>
        </article>
        <article className="card">
          <p className="card__kicker">Excommunications</p>
          <h2>{content.excommunications.length}</h2>
          <p>Published disciplinary entries.</p>
        </article>
        <article className="card">
          <p className="card__kicker">Commits</p>
          <h2>{commits.commits.length}</h2>
          <p>Visible commits after filtering.</p>
        </article>
      </section>

      <section className="panel-grid">
        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Primary Controls</p>
              <h2>Manage Site</h2>
            </div>
          </div>
          <div className="control-links">
            <Link className="button" href="/members">
              Members
            </Link>
            <Link className="button" href="/excommunications">
              Excommunications
            </Link>
            <Link className="button" href="/settings">
              Settings
            </Link>
            <Link className="button" href="/users">
              Users
            </Link>
            <Link className="button" href="/system">
              System
            </Link>
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Historical Note</p>
              <h2>B-13</h2>
            </div>
          </div>
          <p>
            B-13 remains a momentous part of Wilford history and serves as a
            reminder that structure and discipline are part of the public
            narrative.
          </p>
        </article>
      </section>
    </PanelShell>
  );
}
