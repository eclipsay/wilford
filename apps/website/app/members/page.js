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

  return sorted.sort((a, b) => a.name.localeCompare(b.name));
}

export default async function MembersPage({ searchParams }) {
  const content = await getSiteContent();
  const params = await searchParams;
  const sort = params?.sort || "name";
  const members = sortMembers(content.members, sort);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Roster"
        title="Members List"
        description="A public-facing index for recognized members and current standing."
      />

      <main className="content">
        <section className="panel list-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Sort Records</p>
              <h2>Current Members</h2>
            </div>
            <div className="sort-row">
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
          <div className="public-record-list">
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
      </main>
    </SiteLayout>
  );
}
