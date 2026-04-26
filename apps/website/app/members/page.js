import Link from "next/link";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getSiteContent } from "../../lib/content";

function sortMembers(members, sort) {
  const sorted = [...members];

  if (sort === "status") {
    return sorted.sort((a, b) => a.status.localeCompare(b.status) || a.name.localeCompare(b.name));
  }

  if (sort === "division") {
    return sorted.sort((a, b) => a.division.localeCompare(b.division) || a.name.localeCompare(b.name));
  }

  return sorted.sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0));
}

export default async function MembersPage({ searchParams }) {
  const content = await getSiteContent();
  const params = await searchParams;
  const sort = params?.sort || "order";
  const members = sortMembers(content.members, sort);
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
              <p className="eyebrow">Sort Records</p>
              <h2>Members</h2>
            </div>
            <div className="sort-row">
              <Link className={`button ${sort === "order" ? "button--active" : ""}`} href="/members?sort=order">
                Order
              </Link>
              <Link className={`button ${sort === "name" ? "button--active" : ""}`} href="/members?sort=name">
                Name
              </Link>
              <Link className={`button ${sort === "status" ? "button--active" : ""}`} href="/members?sort=status">
                Status
              </Link>
              <Link className={`button ${sort === "division" ? "button--active" : ""}`} href="/members?sort=division">
                Division
              </Link>
            </div>
          </div>
          <div className="public-record-list public-record-list--compact">
            {members.map((member) => (
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

        <section className="panel list-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Diplomatic Register</p>
              <h2>Alliances</h2>
            </div>
          </div>
          {alliances.length ? (
            <div className="public-record-list public-record-list--compact">
              {alliances.map((alliance) => (
                <article className="public-record-item" key={alliance.id}>
                  <div>
                    <h2>{alliance.name}</h2>
                    <p>{alliance.classification}</p>
                  </div>
                  <div className="public-record-meta">
                    <strong>Allied</strong>
                    <span>{alliance.notes}</span>
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
