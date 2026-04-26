import Link from "next/link";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getSiteContent } from "../../lib/content";

function sortEntries(entries, sort) {
  const sorted = [...entries];

  if (sort === "date") {
    return sorted.sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.name.localeCompare(b.name));
  }

  if (sort === "reason") {
    return sorted.sort((a, b) => a.reason.localeCompare(b.reason) || a.name.localeCompare(b.name));
  }

  return sorted.sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
}

export default async function ExcommunicationPage({ searchParams }) {
  const content = await getSiteContent();
  const params = await searchParams;
  const sort = params?.sort || "order";
  const excommunications = sortEntries(content.excommunications, sort);
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
              <p className="eyebrow">Sort Records</p>
              <h2>Excommunications</h2>
            </div>
            <div className="sort-row">
              <Link className={`button ${sort === "order" ? "button--active" : ""}`} href="/excommunication?sort=order">
                Order
              </Link>
              <Link className={`button ${sort === "date" ? "button--active" : ""}`} href="/excommunication?sort=date">
                Date
              </Link>
              <Link className={`button ${sort === "name" ? "button--active" : ""}`} href="/excommunication?sort=name">
                Name
              </Link>
              <Link className={`button ${sort === "reason" ? "button--active" : ""}`} href="/excommunication?sort=reason">
                Reason
              </Link>
            </div>
          </div>
          {excommunications.length ? (
            <div className="public-record-list public-record-list--compact">
              {excommunications.map((entry) => (
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

        <section className="panel list-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">State Adversaries</p>
              <h2>Enemy Nations</h2>
            </div>
          </div>
          {enemyNations.length ? (
            <div className="public-record-list public-record-list--compact">
              {enemyNations.map((entry) => (
                <article className="public-record-item" key={entry.id}>
                  <div>
                    <h2>{entry.name}</h2>
                    <p>{entry.classification}</p>
                  </div>
                  <div className="public-record-meta">
                    <strong>Hostile</strong>
                    <span>{entry.notes}</span>
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
