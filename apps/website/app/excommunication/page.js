import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getSiteContent } from "../../lib/content";

export default async function ExcommunicationPage() {
  const content = await getSiteContent();
  const excommunications = [...(content.excommunications || [])].sort(
    (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)
  );
  const enemyNations = [...(content.enemyNations || [])].sort(
    (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)
  );

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Discipline Register"
        title="Excommunications And Enemy Nations"
        description="A formal register of removed individuals and hostile nations."
      />

      <main className="content">
        <section className="panel list-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Formal Register</p>
              <h2>Excommunications</h2>
            </div>
          </div>
          {excommunications.length ? (
            <div className="public-roster">
              {excommunications.map((entry) => (
                <article className="public-roster__row" key={entry.id}>
                  <div className="public-roster__cell public-roster__cell--name">
                    <span>{entry.name}</span>
                  </div>
                  <div className="public-roster__cell public-roster__cell--role">
                    <span>{entry.reason || "Removed"}</span>
                  </div>
                  <div className="public-roster__cell public-roster__cell--notes">
                    <span>{entry.notes || "No public notes recorded."}</span>
                  </div>
                  <div className="public-roster__meta">
                    <strong>{entry.date || "Undated"}</strong>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="lead">No excommunications are currently published.</p>
          )}
        </section>

        <section className="panel list-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">State Adversaries</p>
              <h2>Enemy Nations</h2>
            </div>
          </div>
          {enemyNations.length ? (
            <div className="public-roster public-roster--compact">
              {enemyNations.map((entry) => (
                <article className="public-roster__row" key={entry.id}>
                  <div className="public-roster__cell public-roster__cell--name">
                    <span>{entry.name}</span>
                  </div>
                  <div className="public-roster__cell public-roster__cell--role">
                    <span>{entry.classification || "Nation"}</span>
                  </div>
                  <div className="public-roster__cell public-roster__cell--notes">
                    <span>{entry.notes || "No public notes recorded."}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="lead">No enemy nations are currently listed.</p>
          )}
        </section>
      </main>
    </SiteLayout>
  );
}
