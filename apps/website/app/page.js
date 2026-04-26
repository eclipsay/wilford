import Link from "next/link";
import { formatShortSha } from "@wilford/shared";
import { SiteLayout } from "../components/SiteLayout";
import { getSiteContent, getVisibleCommits } from "../lib/content";

export default async function HomePage() {
  const [content, commits] = await Promise.all([
    getSiteContent(),
    getVisibleCommits()
  ]);

  const featuredMembers = content.members.slice(0, 3);
  const recentCommits = commits.slice(0, 3);

  return (
    <SiteLayout>
      <main className="content content--hero">
        <section className="hero-simple">
          <div className="hero-simple__copy">
            <p className="eyebrow">{content.settings.homepageEyebrow}</p>
            <h1>{content.settings.homepageHeadline}</h1>
            <p className="lead">{content.settings.homepageDescription}</p>

            <div className="hero-simple__actions">
              <Link className="button button--solid-site" href="/information">
                Information
              </Link>
              <Link className="button" href="/members">
                Members
              </Link>
              <Link className="button" href="/commits">
                Commits
              </Link>
            </div>
          </div>

          <aside className="hero-simple__crest">
            <div className="hero-simple__seal">W</div>
            <p className="eyebrow">Office Of The Chairman</p>
            <h2>{content.settings.chairmanName}</h2>
            <p>
              Wilford Industries maintains order, records, and public doctrine
              through one unified command structure.
            </p>
          </aside>
        </section>

        <section className="summary-strip">
          <article>
            <span>Members</span>
            <strong>{content.members.length}</strong>
          </article>
          <article>
            <span>Excommunications</span>
            <strong>{content.excommunications.length}</strong>
          </article>
          <article>
            <span>Visible Commits</span>
            <strong>{commits.length}</strong>
          </article>
        </section>

        <section className="grid grid--feature">
          <article className="panel panel--feature">
            <p className="eyebrow">Historical Record</p>
            <h2>B-13</h2>
            <p>
              B-13 remains a momentous part of Wilford Industries history and is
              remembered as a defining point in the company&apos;s rise to order.
            </p>
          </article>
          <article className="panel panel--feature">
            <p className="eyebrow">Public Archive</p>
            <h2>Information Division</h2>
            <p>
              Lore, major events, and formal doctrine are preserved in a single
              archive for the public record.
            </p>
          </article>
          <article className="panel panel--feature">
            <p className="eyebrow">Current Status</p>
            <h2>Active Wilford Network</h2>
            <p>
              Member records, disciplinary notices, and development activity are
              all visible through the current site structure.
            </p>
          </article>
        </section>

        <section className="panel-grid-site">
          <article className="panel panel--list">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Featured Members</p>
                <h2>Standing Register</h2>
              </div>
              <Link className="button" href="/members">
                View All
              </Link>
            </div>
            <div className="public-record-list">
              {featuredMembers.map((member) => (
                <article className="public-record-item" key={member.id}>
                  <div>
                    <h3>{member.name}</h3>
                    <p>
                      {member.role} / {member.division}
                    </p>
                  </div>
                  <div className="public-record-meta">
                    <strong>{member.status}</strong>
                    <span>{member.notes}</span>
                  </div>
                </article>
              ))}
            </div>
          </article>

          <article className="panel panel--list">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Recent Commits</p>
                <h2>Development Feed</h2>
              </div>
              <Link className="button" href="/commits">
                Open Feed
              </Link>
            </div>
            <div className="commit-log commit-log--compact">
              {recentCommits.map((commit) => (
                <Link
                  key={commit.sha}
                  className="commit-row"
                  href={commit.html_url || "#"}
                  target="_blank"
                >
                  <span className="commit-row__sha">
                    {formatShortSha(commit.sha)}
                  </span>
                  <span className="commit-row__message">{commit.message}</span>
                  <span className="commit-row__meta">
                    <span>{commit.author}</span>
                    <span className="commit-row__dot">/</span>
                    <span>{commit.date}</span>
                  </span>
                </Link>
              ))}
            </div>
          </article>
        </section>
      </main>
    </SiteLayout>
  );
}
