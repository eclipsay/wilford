import Link from "next/link";
import { formatShortSha } from "@wilford/shared";
import { fetchPublic } from "../lib/api";
import { requireAuth } from "../lib/auth";
import { PanelShell } from "../components/PanelShell";

function getRecentMembers(members) {
  return members.slice(0, 4);
}

function getRecentCommits(commits) {
  return commits.commits.slice(0, 5);
}

export default async function PanelHomePage() {
  await requireAuth();
  const [content, commits] = await Promise.all([
    fetchPublic("/api/content"),
    fetchPublic("/api/commits")
  ]);

  const recentMembers = getRecentMembers(content.members);
  const recentCommits = getRecentCommits(commits);

  return (
    <PanelShell
      title="Panel Dashboard"
      description="Internal command overview for records, deployments, public content, and controlled Wilford state messaging."
    >
      <section className="panel-hero">
        <div className="panel-hero__copy">
          <p className="panel-header__eyebrow">Command Status</p>
          <h2>{content.settings.homepageHeadline}</h2>
          <p>
            The public site, panel, and archive now operate as one controlled
            system. Use the sections below to modify records, supervise public
            narrative, and manage active operators.
          </p>
        </div>
        <div className="panel-hero__seal" aria-hidden="true">
          <span>W</span>
        </div>
      </section>

      <section className="cards">
        <article className="card">
          <p className="card__kicker">Members</p>
          <h2>{content.members.length}</h2>
          <p>Recognized records currently listed on the public site.</p>
        </article>
        <article className="card">
          <p className="card__kicker">Excommunications</p>
          <h2>{content.excommunications.length}</h2>
          <p>Removed or censured individuals currently listed.</p>
        </article>
        <article className="card">
          <p className="card__kicker">Commits</p>
          <h2>{commits.commits.length}</h2>
          <p>Visible repository commits after Wilford filtering.</p>
        </article>
        <article className="card">
          <p className="card__kicker">Chairman</p>
          <h2>{content.settings.chairmanName}</h2>
          <p>Executive office identity currently published to the site.</p>
        </article>
      </section>

      <section className="panel-grid">
        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Rapid Actions</p>
              <h2>Control Sections</h2>
            </div>
          </div>
          <div className="control-links">
            <Link className="button" href="/members">
              Edit Members
            </Link>
            <Link className="button" href="/excommunications">
              Edit Excommunications
            </Link>
            <Link className="button" href="/settings">
              Website Settings
            </Link>
            <Link className="button" href="/aes256">
              AES256 Console
            </Link>
            <Link className="button" href="/system">
              Deploy Panel
            </Link>
          </div>
        </article>

        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">State Record</p>
              <h2>B-13</h2>
            </div>
          </div>
          <p>
            B-13 is preserved here as a momentous part of Wilford Industries
            history, representing the point where internal enforcement matured
            into a permanent doctrine of order.
          </p>
          <p>
            Keep the public message aligned with that doctrine across lore,
            member records, and disciplinary publications.
          </p>
        </article>
      </section>

      <section className="panel-split">
        <article className="panel-card list-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Recent Members</p>
              <h2>Standing Register</h2>
            </div>
            <Link className="button button--ghost" href="/members">
              Manage
            </Link>
          </div>
          <div className="record-list">
            {recentMembers.map((member) => (
              <article className="record-item" key={member.id}>
                <div>
                  <h2>{member.name}</h2>
                  <p>{member.role} / {member.division}</p>
                  <small>{member.notes}</small>
                </div>
                <span className="status-badge">{member.status}</span>
              </article>
            ))}
          </div>
        </article>

        <article className="panel-card list-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Recent Activity</p>
              <h2>Commit Feed</h2>
            </div>
            <Link className="button button--ghost" href="/commits">
              Open Feed
            </Link>
          </div>
          <div className="record-list">
            {recentCommits.map((commit) => (
              <article className="commit-admin-row" key={commit.sha}>
                <span>{formatShortSha(commit.sha)}</span>
                <span>{commit.message}</span>
                <span>{commit.author}</span>
              </article>
            ))}
          </div>
        </article>
      </section>
    </PanelShell>
  );
}
