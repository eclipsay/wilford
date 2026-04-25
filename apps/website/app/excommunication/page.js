import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getSiteContent } from "../../lib/content";

export default async function ExcommunicationPage() {
  const content = await getSiteContent();

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Discipline Register"
        title="Excommunication List"
        description="A formal register of those removed from standing."
      />

      <main className="content">
        <section className="panel list-panel">
          {content.excommunications.length ? (
            <div className="public-record-list">
              {content.excommunications.map((entry) => (
                <article className="public-record-item" key={entry.id}>
                  <div>
                    <h2>{entry.name}</h2>
                    <p>{entry.reason} / {entry.decree}</p>
                  </div>
                  <div className="public-record-meta">
                    <strong>{entry.date}</strong>
                    <span>{entry.notes}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="lead">No excommunications are currently published.</p>
          )}
        </section>
      </main>
    </SiteLayout>
  );
}
