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
      title="Control Panel"
      description="A clean control surface for the website, records, and operational tools."
    >
      <section className="cards">
        <article className="card">
          <p className="card__kicker">Members</p>
          <h2>{content.members.length}</h2>
          <p>Public member entries.</p>
        </article>
        <article className="card">
          <p className="card__kicker">Alliances</p>
          <h2>{content.alliances.length}</h2>
          <p>Allied nations on the site.</p>
        </article>
        <article className="card">
          <p className="card__kicker">Discipline</p>
          <h2>{content.excommunications.length}</h2>
          <p>Excommunication records.</p>
        </article>
        <article className="card">
          <p className="card__kicker">Commits</p>
          <h2>{commits.commits.length}</h2>
          <p>Visible repository updates.</p>
        </article>
      </section>

      <section className="panel-card panel-card--wide">
        <div className="panel-card__header">
          <div>
            <p className="card__kicker">Snapshot</p>
            <h2>Current State</h2>
          </div>
        </div>
        <div className="stat-row">
          <div className="stat-chip">
            <span>Enemy nations</span>
            <strong>{content.enemyNations.length}</strong>
          </div>
          <div className="stat-chip">
            <span>Chairman</span>
            <strong>{content.settings.chairmanName}</strong>
          </div>
          <div className="stat-chip">
            <span>Headline</span>
            <strong>{content.settings.homepageHeadline}</strong>
          </div>
        </div>
      </section>
    </PanelShell>
  );
}
