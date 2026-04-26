import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getSiteContent } from "../../lib/content";

function formatMemberLine(member) {
  return [member.name, member.role, member.division].filter(Boolean);
}

function formatAllianceLine(alliance) {
  return [alliance.name, alliance.classification, alliance.notes].filter(Boolean);
}

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
          <div className="public-flow-list">
            {members.map((member) => (
              <article className="public-flow-item" key={member.id}>
                <div className="public-flow-item__line">
                  {formatMemberLine(member).map((part, index) => (
                    <span className="public-flow-item__part" key={`${member.id}-${index}`}>
                      {index ? <span className="public-flow-item__divider">|</span> : null}
                      <span>{part}</span>
                    </span>
                  ))}
                </div>
                <div className="public-flow-item__meta">
                  <strong>{member.status || "Active"}</strong>
                  {member.notes ? <span>{member.notes}</span> : null}
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
            <div className="public-flow-list">
              {alliances.map((alliance) => (
                <article className="public-flow-item" key={alliance.id}>
                  <div className="public-flow-item__line">
                    {formatAllianceLine(alliance).map((part, index) => (
                      <span
                        className="public-flow-item__part"
                        key={`${alliance.id}-${index}`}
                      >
                        {index ? <span className="public-flow-item__divider">|</span> : null}
                        <span>{part}</span>
                      </span>
                    ))}
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
