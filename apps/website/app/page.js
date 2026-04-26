import Link from "next/link";
import { formatShortSha } from "@wilford/shared";
import { SiteLayout } from "../components/SiteLayout";
import { getSiteContent, getVisibleCommits } from "../lib/content";

function getFeaturedMembers(members) {
  return members.slice(0, 3);
}

function getCommitPreview(commits) {
  return commits.slice(0, 4);
}

export default async function HomePage() {
  const [content, commits] = await Promise.all([
    getSiteContent(),
    getVisibleCommits()
  ]);

  const featuredMembers = getFeaturedMembers(content.members);
  const commitPreview = getCommitPreview(commits);

  return (
    <SiteLayout>
      <main className="content content--hero">
        <section className="hero-monument">
          <div className="hero-monument__copy">
            <p className="eyebrow hero-monument__eyebrow">
              {content.settings.homepageEyebrow}
            </p>
            <h1>{content.settings.homepageHeadline}</h1>
            <p className="lead hero-monument__lead">
              {content.settings.homepageDescription}
            </p>

            <div className="hero-monument__actions">
              <Link className="button button--solid-site" href="/information">
                Enter The Archive
              </Link>
              <Link className="button" href="/commits">
                View Commit Feed
              </Link>
            </div>

            <div className="hero-monument__decree">
              <span>Office of the Chairman</span>
              <strong>{content.settings.chairmanName}</strong>
              <p>
                Authority over industry, doctrine, and the forward direction of
                the Wilford state apparatus.
              </p>
            </div>
          </div>

          <div className="hero-monument__visual" aria-hidden="true">
            <div className="hero-banner hero-banner--left">
              <span>By {content.settings.chairmanName}&apos;s will, order prevails.</span>
            </div>
            <div className="hero-banner hero-banner--right">
              <span>One people. One industry. One Wilford.</span>
            </div>
            <div className="hero-guards">
              <span />
              <span />
            </div>
            <div className="hero-building">
              <div className="hero-building__roof" />
              <div className="hero-building__columns">
                {Array.from({ length: 6 }).map((_, index) => (
                  <span key={`column-${index}`} />
                ))}
              </div>
              <div className="hero-building__seal">
                <span>W</span>
              </div>
            </div>
            <div className="hero-chairman">
              <div className="hero-chairman__halo" />
              <div className="hero-chairman__crest">W</div>
              <div className="hero-chairman__title">
                <p>Chairman</p>
                <strong>{content.settings.chairmanName}</strong>
              </div>
            </div>
          </div>
        </section>

        <section className="value-strip">
          <article>
            <span>Built On</span>
            <strong>Unity</strong>
          </article>
          <article>
            <span>Driven By</span>
            <strong>Innovation</strong>
          </article>
          <article>
            <span>Protected By</span>
            <strong>Discipline</strong>
          </article>
          <article>
            <span>Guided By</span>
            <strong>The Chairman</strong>
          </article>
        </section>

        <section className="section-heading">
          <p className="eyebrow">State Bulletin</p>
          <h2>The Public Face Of Wilford</h2>
          <p className="lead">
            The front page now works like an official proclamation wall: history,
            doctrine, records, and live development activity all feeding one
            unified state narrative.
          </p>
        </section>

        <section className="grid grid--feature">
          <article className="panel panel--feature">
            <p className="eyebrow">Historical Marker</p>
            <h2>B-13</h2>
            <p>
              Sector B-13 remains a momentous part of Wilford Industries
              history, remembered as the district where internal order was
              reforged into doctrine and the modern public structure was born.
            </p>
          </article>
          <article className="panel panel--feature">
            <p className="eyebrow">Public Roster</p>
            <h2>{content.members.length} Recognized Members</h2>
            <p>
              Active records are published through the Chairman&apos;s archive and
              surfaced to the public through the roster and information pages.
            </p>
          </article>
          <article className="panel panel--feature">
            <p className="eyebrow">Discipline Register</p>
            <h2>{content.excommunications.length} Published Decrees</h2>
            <p>
              Excommunications remain visible as a matter of public discipline,
              historical accounting, and structural warning.
            </p>
          </article>
        </section>

        <section className="section-heading section-heading--split">
          <div>
            <p className="eyebrow">Operational Divisions</p>
            <h2>Archive, Records, Security, Development</h2>
          </div>
          <p className="lead">
            Each public page now maps to a recognizable Wilford function, making
            the site feel less like disconnected pages and more like a single
            institution with multiple chambers.
          </p>
        </section>

        <section className="grid grid--command">
          <Link className="panel panel--command" href="/information">
            <p className="eyebrow">Information</p>
            <h2>Lore And Events</h2>
            <p>
              Review official doctrine, major turning points, and the preserved
              narrative of Wilford expansion.
            </p>
          </Link>
          <Link className="panel panel--command" href="/members">
            <p className="eyebrow">Records</p>
            <h2>Members List</h2>
            <p>
              Inspect currently recognized members, their roles, divisions, and
              public standing.
            </p>
          </Link>
          <Link className="panel panel--command" href="/excommunication">
            <p className="eyebrow">Discipline</p>
            <h2>Excommunication List</h2>
            <p>
              Read public disciplinary decrees and the names of those removed
              from standing.
            </p>
          </Link>
          <Link className="panel panel--command" href="/commits">
            <p className="eyebrow">Development</p>
            <h2>Commit Feed</h2>
            <p>
              Live repository activity filtered through Wilford censorship
              policy and rendered as public build intelligence.
            </p>
          </Link>
          <Link className="panel panel--command" href="/decrypter">
            <p className="eyebrow">Encryption Office</p>
            <h2>AES256 Decrypter</h2>
            <p>
              Future deployment entry point for Wilford encryption and decrypter
              utilities.
            </p>
          </Link>
        </section>

        <section className="section-heading section-heading--split">
          <div>
            <p className="eyebrow">Live Registers</p>
            <h2>Recognized Personnel And Current Feed</h2>
          </div>
          <p className="lead">
            This section surfaces public records and current development in one
            view, so the site feels alive instead of decorative.
          </p>
        </section>

        <section className="panel-grid-site">
          <article className="panel panel--list">
            <div className="panel__header">
              <div>
                <p className="eyebrow">Featured Members</p>
                <h2>Standing Roster</h2>
              </div>
              <Link className="button" href="/members">
                Full List
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
                <p className="eyebrow">Transmission Feed</p>
                <h2>Recent Commits</h2>
              </div>
              <Link className="button" href="/commits">
                Open Feed
              </Link>
            </div>
            <div className="commit-log commit-log--compact">
              {commitPreview.map((commit) => (
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
