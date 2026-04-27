import Link from "next/link";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { getAuditLog, requireGovernmentUser } from "../../../lib/government-auth";

export const metadata = {
  title: "Audit Log | Government Access"
};

export default async function GovernmentAuditPage() {
  await requireGovernmentUser("auditLog");
  const auditLog = await getAuditLog();

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
      </main>
    </SiteLayout>
  );
}
