import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getSiteContent } from "../../lib/content";

export default async function MembersPage() {
  const content = await getSiteContent();

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Roster"
        title="Members List"
        description="A public-facing index for recognized members and current standing."
      />

      <main className="content">
        <section className="panel list-panel">
          <div className="public-record-list">
            {content.members.map((member) => (
              <article className="public-record-item" key={member.id}>
                <div>
                  <h2>{member.name}</h2>
                  <p>{member.role} / {member.division}</p>
                </div>
                <div className="public-record-meta">
                  <strong>{member.status}</strong>
                  <span>{member.notes}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
