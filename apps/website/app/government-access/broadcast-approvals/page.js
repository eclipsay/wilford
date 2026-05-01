import Link from "next/link";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { requireGovernmentUser } from "../../../lib/government-auth";
import { getDiscordBroadcasts } from "../../../lib/discord-broadcasts";

export const metadata = {
  title: "Broadcast Approvals | Government Access"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function isAwaitingApproval(broadcast) {
  return ["pending_approval", "approval_notified"].includes(broadcast.status);
}

function deliveryDetails(broadcast) {
  const distribution = String(broadcast.distribution || "none");
  const details = [];

  if (distribution === "announcement" || distribution === "announcement_and_dm_all") {
    details.push({
      label: "Server Announcement Channel",
      detail: "Channel: announcement channel",
      tone: "public"
    });
  }

  if (broadcast.pingOption === "everyone" || broadcast.pingOption === "here") {
    details.push({
      label: broadcast.pingOption === "everyone" ? "@everyone Ping" : "@here Ping",
      detail: broadcast.pingOption === "everyone"
        ? "You are about to send a message to all members."
        : "This broadcast will notify online members.",
      tone: "mass"
    });
  }

  if (distribution === "dm_all" || distribution === "announcement_and_dm_all") {
    details.push({
      label: "DM All Server Members",
      detail: "Mass Direct Message to all server members",
      tone: "mass"
    });
  }

  if (distribution === "specific_user") {
    details.push({
      label: "Specific Discord User",
      detail: `Target Discord ID: ${broadcast.targetDiscordId || "Not provided"}`,
      tone: "private"
    });
  }

  if (distribution === "mss_only") {
    details.push({
      label: "MSS Channel Only",
      detail: "Restricted Ministry of State Security delivery",
      tone: "restricted"
    });
  }

  if (distribution === "government_officials") {
    details.push({
      label: "Government Officials Only",
      detail: "Restricted government official delivery",
      tone: "restricted"
    });
  }

  if (!details.length) {
    details.push({
      label: "No Discord Delivery / Website Only",
      detail: "No Discord target selected",
      tone: "none"
    });
  }

  return details;
}

function linkedRecordLabel(broadcast) {
  if (!broadcast.linkedId) {
    return "No linked record";
  }

  return `${broadcast.linkedType || "record"}: ${broadcast.linkedId}`;
}

export default async function BroadcastApprovalsPage({ searchParams }) {
  const params = await searchParams;
  const user = await requireGovernmentUser("broadcastApproval");
  const broadcasts = await getDiscordBroadcasts().catch(() => []);
  const pendingBroadcasts = broadcasts.filter(isAwaitingApproval);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Executive Approval Authority"
        title="Broadcast Approvals"
        description="Approve or decline high-risk Discord broadcasts before server-wide delivery."
      />

      <main className="content content--wide portal-page government-command-page">
        <Link className="button" href="/government-access">
          Back to Dashboard
        </Link>

        {params?.saved ? (
          <section className="application-notice">
            <strong>Approval Register Updated</strong>
            <p>The broadcast request has been processed.</p>
          </section>
        ) : null}

        {params?.error ? (
          <section className="application-notice application-notice--error">
            <strong>Approval Action Failed</strong>
            <p>{params.detail || "The broadcast request could not be updated."}</p>
          </section>
        ) : null}

        <section className="panel government-user-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Chairman / Executive Director Review</p>
              <h2>Pending Broadcast Requests</h2>
              <p className="public-application-help">
                Authenticated as {user.username} / {user.role}. Approval releases the request to the bot queue.
              </p>
            </div>
          </div>

          <div className="bulletin-editor-list">
            {pendingBroadcasts.length ? (
              pendingBroadcasts.map((broadcast) => {
                const delivery = deliveryDetails(broadcast);

                return (
                  <article className={`panel bulletin-editor-card broadcast-approval-card broadcast-approval-card--${delivery[0]?.tone || "none"}`} key={broadcast.id}>
                    <div className="panel__header bulletin-editor-card__header">
                      <div>
                        <p className="eyebrow">Broadcast Type / {broadcast.type}</p>
                        <h2>{broadcast.title}</h2>
                        <p className="bulletin-editor-card__subtitle">
                          Requested by {broadcast.requestedBy} / {broadcast.requestedRole}
                        </p>
                      </div>
                      <div className="bulletin-editor-card__status">
                        <span>{broadcast.status}</span>
                        <strong>{broadcast.approvalRequestedAt || broadcast.createdAt}</strong>
                      </div>
                    </div>

                    <section className="broadcast-delivery-panel" aria-label="Broadcast delivery method">
                      <p className="eyebrow">Delivery Method</p>
                      <div className="broadcast-delivery-badges">
                        {delivery.map((item) => (
                          <span className={`broadcast-delivery-badge broadcast-delivery-badge--${item.tone}`} key={item.label}>
                            {item.label}
                          </span>
                        ))}
                      </div>
                      <div className="broadcast-delivery-details">
                        {delivery.map((item) => (
                          <p key={item.detail}>{item.detail}</p>
                        ))}
                      </div>
                    </section>

                    <dl className="broadcast-approval-meta">
                      <div>
                        <dt>Broadcast Type</dt>
                        <dd>{broadcast.type}</dd>
                      </div>
                      <div>
                        <dt>Requested By</dt>
                        <dd>{broadcast.requestedBy || "Unknown"} / {broadcast.requestedRole || "Unknown role"}</dd>
                      </div>
                      <div>
                        <dt>Approval Required</dt>
                        <dd>{broadcast.requiresApproval ? "Yes" : "No"}</dd>
                      </div>
                      <div>
                        <dt>Ping Option</dt>
                        <dd>{broadcast.pingOption || "none"}{broadcast.pingDeniedReason ? ` / downgraded: ${broadcast.pingDeniedReason}` : ""}</dd>
                      </div>
                      <div>
                        <dt>Linked Record</dt>
                        <dd>{linkedRecordLabel(broadcast)}</dd>
                      </div>
                    </dl>

                    <pre className="broadcast-preview">{broadcast.body}</pre>

                    <form action="/government-access/broadcast-approvals/action" className="public-application-form" method="post">
                      <input name="id" type="hidden" value={broadcast.id} />
                      <label className="public-application-field">
                        <span>Approval note optional</span>
                        <input name="approvalNote" placeholder="Reason, instruction, or record note" type="text" />
                      </label>
                      <div className="bulletin-editor-card__actions">
                        <button className="button button--solid-site" name="intent" type="submit" value="approve">
                          {broadcast.pingOption === "everyone" ? "Confirm Broadcast" : "Approve Broadcast"}
                        </button>
                        <button className="button button--danger-site" name="intent" type="submit" value="decline">
                          Decline
                        </button>
                      </div>
                    </form>
                  </article>
                );
              })
            ) : (
              <p className="court-empty">No broadcasts are waiting for Chairman approval.</p>
            )}
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
