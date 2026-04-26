import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getSiteContent } from "../../lib/content";

export default async function MembersPage() {
  const content = await getSiteContent();
  const members = [...(content.members || [])].sort(
    (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)
  );
  const alliances = [...(content.alliances || [])].sort(
    (a, b) => Number(a.order ?? 0) - Number(b.order ?? 0)
  );

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Roster"
        title="Members And Alliances"
        description="Recognized members and aligned nations in the Wilford public network."
      />

      <main className="content">
        <section className="panel list-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Public Roster</p>
              <h2>Members</h2>
            </div>
          </div>
          <div className="public-roster">
            {members.map((member) => (
              <article className="public-roster__row" key={member.id}>
                <div className="public-roster__cell public-roster__cell--name">
                  <span>{member.name}</span>
                </div>
                <div className="public-roster__cell public-roster__cell--role">
                  <span>{member.role || "Member"}</span>
                  {member.division ? (
                    <>
                      <span className="public-roster__divider">|</span>
                      <span>{member.division}</span>
                    </>
                  ) : null}
                </div>
                <div className="public-roster__cell public-roster__cell--notes">
                  <span>{member.notes || "No public notes recorded."}</span>
                </div>
                <div className="public-roster__meta">
                  <strong>{member.status || "Active"}</strong>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="panel list-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Diplomatic Register</p>
              <h2>Alliances</h2>
            </div>
          </div>
          {alliances.length ? (
            <div className="public-roster public-roster--compact">
              {alliances.map((alliance) => (
                <article className="public-roster__row" key={alliance.id}>
                  <div className="public-roster__cell public-roster__cell--name">
                    <span>{alliance.name}</span>
                  </div>
                  <div className="public-roster__cell public-roster__cell--role">
                    <span>{alliance.classification || "Nation"}</span>
                  </div>
                  <div className="public-roster__cell public-roster__cell--notes">
                    <span>{alliance.notes || "No public notes recorded."}</span>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="lead">No allied nations are currently listed.</p>
          )}
        </section>
      </main>
    </SiteLayout>
  );
}
