import Link from "next/link";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { getAuditLog, requireGovernmentUser } from "../../../lib/government-auth";
import { getDiscordBroadcasts } from "../../../lib/discord-broadcasts";

export const metadata = {
  title: "Audit Log | Government Access"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function GovernmentAuditPage() {
  await requireGovernmentUser("auditLog");
  const auditLog = await getAuditLog();
  const broadcasts = await getDiscordBroadcasts().catch(() => []);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Restricted Security Register"
        title="Audit Log"
        description="Login attempts, access denials, user control actions, and restricted edits."
      />

      <main className="content content--wide portal-page government-command-page">
        <Link className="button" href="/government-access">
          Back to Dashboard
        </Link>
        <section className="panel government-user-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Security Ledger</p>
              <h2>Audit Events</h2>
            </div>
          </div>
          <div className="government-audit-list">
            {auditLog.length ? (
              auditLog.map((entry) => (
                <article className={`government-audit-row government-audit-row--${entry.status}`} key={entry.id}>
                  <span>{entry.at}</span>
                  <strong>{entry.action}</strong>
                  <p>{entry.actor} / {entry.detail}</p>
                </article>
              ))
            ) : (
              <p className="court-empty">No audit events recorded.</p>
            )}
          </div>
        </section>
        <section className="panel government-user-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Official Communications</p>
              <h2>Discord Broadcast Attempts</h2>
            </div>
          </div>
          <div className="government-audit-list">
            {broadcasts.length ? (
              broadcasts.map((broadcast) => (
                <article className={`government-audit-row government-audit-row--${broadcast.status === "completed" ? "success" : broadcast.status}`} key={broadcast.id}>
                  <span>{broadcast.processedAt || broadcast.createdAt}</span>
                  <strong>{broadcast.type} / {broadcast.distribution}</strong>
                  <p>
                    {broadcast.requestedBy} / {broadcast.title} / Success: {broadcast.successCount} / Failed: {broadcast.failureCount}
                  </p>
                  {broadcast.error ? <p>{broadcast.error}</p> : null}
                  {broadcast.failures?.length ? (
                    <p>{broadcast.failures.map((failure) => `${failure.target}: ${failure.error}`).join(" | ")}</p>
                  ) : null}
                </article>
              ))
            ) : (
              <p className="court-empty">No Discord broadcasts recorded.</p>
            )}
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
