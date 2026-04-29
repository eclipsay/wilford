import Link from "next/link";
import { notFound } from "next/navigation";
import {
  applicationStatuses,
  formatApplicationStatus,
  getCitizenApplicationById
} from "../../../../lib/citizen-applications";
import { PageHero } from "../../../../components/PageHero";
import { SiteLayout } from "../../../../components/SiteLayout";
import { requireGovernmentUser } from "../../../../lib/government-auth";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value) {
  const date = new Date(value);

  if (!Number.isFinite(date.getTime())) {
    return "Undated";
  }

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(date);
}

function discordThreadUrl(application) {
  const guildId = application.reviewGuildId || "@me";
  const threadId = application.discordThreadId || application.reviewThreadId;

  return threadId ? `https://discord.com/channels/${guildId}/${threadId}` : "";
}

export default async function CitizenshipDetailPage({ params, searchParams }) {
  const { id } = await params;
  const query = await searchParams;
  const user = await requireGovernmentUser("citizenshipReview");
  const application = await getCitizenApplicationById(id);

  if (!application) {
    notFound();
  }

  const threadUrl = discordThreadUrl(application);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Citizenship Case File"
        title={application.applicantName}
        description={`Application ${application.id}`}
      />

      <main className="content content--wide portal-page citizen-detail-page">
        <div className="sort-row">
          <Link className="button" href="/government-access/citizenship">
            Back to Applications
          </Link>
          {threadUrl ? (
            <a className="button" href={threadUrl}>
              Open Discord Thread
            </a>
          ) : null}
        </div>

        {query?.saved ? (
          <section className="application-notice">
            <strong>Case Updated</strong>
            <p>Application changes were saved and queued for Discord delivery when needed.</p>
          </section>
        ) : null}

        {query?.error ? (
          <section className="application-notice application-notice--error">
            <strong>Case Update Failed</strong>
            <p>{query?.error === "invalid-discord-id" ? "Valid Discord User ID is required to apply for citizenship." : "Application changes could not be saved."}</p>
            {query?.detail ? <p className="public-application-help">API detail: {String(query.detail)}</p> : null}
          </section>
        ) : null}

        <section className={`panel citizen-application-card citizen-application-card--${application.status}`}>
          <div className="panel__header">
            <div>
              <p className="eyebrow">{application.source} / {formatDate(application.submittedAt)}</p>
              <h2>{application.applicantName}</h2>
              <p className="public-application-help">Reviewed by {user.username} / {user.role}</p>
            </div>
            <div className="bulletin-editor-card__status">
              <span>Application Status</span>
              <strong>{formatApplicationStatus(application.status)}</strong>
            </div>
          </div>

          <div className="citizen-application-badges">
            {application.needsAttention ? <span>Needs Attention</span> : null}
            {application.status === "appealed" || application.appealReason ? <span>Appeal Requested</span> : null}
            {application.archived ? <span>Archived</span> : null}
          </div>

          <dl className="citizen-application-details">
            <div><dt>Age</dt><dd>{application.age}</dd></div>
            <div><dt>Timezone</dt><dd>{application.timezone}</dd></div>
            <div><dt>Discord</dt><dd>{application.discordHandle}</dd></div>
            <div>
              <dt>Discord ID</dt>
              <dd>
                {application.discordUserId || "Not provided"}
                {application.discordUserId ? (
                  <>
                    {" / "}
                    <a href={`https://discord.com/users/${application.discordUserId}`}>Open Discord Profile</a>
                  </>
                ) : null}
              </dd>
            </div>
            <div><dt>Email</dt><dd>{application.email || "Not provided"}</dd></div>
            <div><dt>Thread ID</dt><dd>{application.discordThreadId || application.reviewThreadId || "Not created"}</dd></div>
          </dl>

          <div className="citizen-application-answers">
            <section>
              <p className="eyebrow">Motivation</p>
              <p>{application.motivation}</p>
            </section>
            <section>
              <p className="eyebrow">Skills / Service</p>
              <p>{application.experience}</p>
            </section>
            {application.appealReason ? (
              <section>
                <p className="eyebrow">Appeal Reason</p>
                <p>{application.appealReason}</p>
              </section>
            ) : null}
          </div>
        </section>

        <section className="panel bulletin-control-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Case Actions</p>
              <h2>Decision and Response</h2>
            </div>
          </div>
          <form action="/government-access/citizenship/action" className="public-application-form" method="post">
            <input name="id" type="hidden" value={application.id} />
            <div className="public-application-grid">
              <label className="public-application-field">
                <span>Status</span>
                <select defaultValue={application.status} name="status">
                  {applicationStatuses.map((status) => (
                    <option key={status} value={status}>{formatApplicationStatus(status)}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field">
                <span>Decision Note</span>
                <input defaultValue={application.decisionNote} name="decisionNote" type="text" />
              </label>
              <label className="public-application-field">
                <span>Discord User ID</span>
                <input defaultValue={application.discordUserId} inputMode="numeric" maxLength={20} minLength={17} name="discordUserId" pattern="\d{17,20}" required type="text" />
                <small className="public-application-help">Link to Discord user for DMs, Citizen role assignment, economy identity, and future integrations.</small>
              </label>
            </div>
            <label className="public-application-field">
              <span>Public Response</span>
              <textarea name="publicResponse" placeholder="Message delivered to applicant where possible" rows="4" />
            </label>
            <label className="public-application-field">
              <span>Internal Notes</span>
              <textarea defaultValue={application.internalNotes} name="internalNotes" rows="6" />
            </label>
            <label className="public-application-toggle">
              <input defaultChecked={application.needsAttention} name="needsAttention" type="checkbox" />
              <span>Needs Attention</span>
            </label>
            {application.approvalProvisioning ? (
              <div className="application-notice">
                <strong>Citizen Login</strong>
                <p>
                  {application.approvalProvisioning.portalUsername || "Portal account"} /
                  {" "}{application.approvalProvisioning.credentialDeliveryStatus || "pending"}
                </p>
              </div>
            ) : null}
            <div className="bulletin-editor-card__actions">
              <button className="button button--solid-site" name="intent" type="submit" value="save">Save</button>
              <button className="button" name="intent" type="submit" value="under_review">Mark Under Review</button>
              <button className="button" name="intent" type="submit" value="request_info">Request Info</button>
              <button className="button" name="intent" type="submit" value="approve">Approve</button>
              {application.status === "approved" ? (
                <button className="button" name="intent" type="submit" value="resend_login">Resend Citizen Login</button>
              ) : null}
              <button className="button button--danger-site" name="intent" type="submit" value="reject">Reject</button>
              <button className="button" name="intent" type="submit" value="accept_appeal">Accept Appeal</button>
              <button className="button" name="intent" type="submit" value="reject_appeal">Reject Appeal</button>
              <button className="button" name="intent" type="submit" value="archive">Archive</button>
            </div>
          </form>
        </section>

        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Case History</p>
              <h2>Public Replies and Audit</h2>
            </div>
          </div>
          <div className="citizen-history-list">
            {[...(application.publicReplies || []), ...(application.applicationAuditLog || [])].length ? (
              [...(application.publicReplies || []), ...(application.applicationAuditLog || [])]
                .sort((a, b) => new Date(b.at || b.createdAt) - new Date(a.at || a.createdAt))
                .map((entry) => (
                  <article className="citizen-history-item" key={entry.id}>
                    <strong>{entry.action || "Public Reply"}</strong>
                    <span>{formatDate(entry.at || entry.createdAt)}</span>
                    <p>{entry.message || entry.detail}</p>
                    {entry.deliveryStatus ? <small>Discord: {entry.deliveryStatus}</small> : null}
                  </article>
                ))
            ) : (
              <p className="public-application-help">No case history has been recorded yet.</p>
            )}
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
