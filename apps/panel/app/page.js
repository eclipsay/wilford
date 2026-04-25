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
      description="Overview of current public content, records, and repository activity."
    >
      <section className="cards">
        <article className="card">
          <p className="card__kicker">Members</p>
          <h2>{content.members.length}</h2>
          <p>Recognized records currently listed on the public site.</p>
        </article>
        <article className="card">
          <p className="card__kicker">Excommunications</p>
          <h2>{content.excommunications.length}</h2>
          <p>Removed or censured individuals currently listed.</p>
        </article>
        <article className="card">
          <p className="card__kicker">Commits</p>
          <h2>{commits.commits.length}</h2>
          <p>Visible repository commits after Wilford filtering.</p>
        </article>
      </section>

      <section className="panel-grid">
        <article className="panel-card">
          <p className="card__kicker">Homepage Settings</p>
          <h2>{content.settings.homepageHeadline}</h2>
          <p>{content.settings.homepageDescription}</p>
        </article>
        <article className="panel-card">
          <p className="card__kicker">Chairman</p>
          <h2>{content.settings.chairmanName}</h2>
          <p>Executive office identity currently published to the site.</p>
        </article>
      </section>
    </PanelShell>
  );
}
