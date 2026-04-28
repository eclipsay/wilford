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

export default async function BroadcastApprovalsPage({ searchParams }) {
  const params = await searchParams;
  const user = await requireGovernmentUser("broadcastApproval");
  const broadcasts = await getDiscordBroadcasts().catch(() => []);
  const pendingBroadcasts = broadcasts.filter(isAwaitingApproval);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Supreme Chairman Authority"
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
              <p className="eyebrow">Chairman Review</p>
              <h2>Pending Broadcast Requests</h2>
              <p className="public-application-help">
                Authenticated as {user.username} / {user.role}. Approval releases the request to the bot queue.
              </p>
            </div>
          </div>

          <div className="bulletin-editor-list">
            {pendingBroadcasts.length ? (
              pendingBroadcasts.map((broadcast) => (
                <article className="panel bulletin-editor-card" key={broadcast.id}>
                  <div className="panel__header bulletin-editor-card__header">
                    <div>
                      <p className="eyebrow">{broadcast.type} / {broadcast.distribution}</p>
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

                  <pre className="broadcast-preview">{broadcast.body}</pre>

                  <form action="/government-access/broadcast-approvals/action" className="public-application-form" method="post">
                    <input name="id" type="hidden" value={broadcast.id} />
                    <label className="public-application-field">
                      <span>Approval note optional</span>
                      <input name="approvalNote" placeholder="Reason, instruction, or record note" type="text" />
                    </label>
                    <div className="bulletin-editor-card__actions">
                      <button className="button button--solid-site" name="intent" type="submit" value="approve">
                        Approve Broadcast
                      </button>
                      <button className="button button--danger-site" name="intent" type="submit" value="decline">
                        Decline
                      </button>
                    </div>
                  </form>
                </article>
              ))
            ) : (
              <p className="court-empty">No broadcasts are waiting for Chairman approval.</p>
            )}
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
