import { PanelShell } from "../../components/PanelShell";
import { requireAuth } from "../../lib/auth";
import { readAuditLog } from "../../lib/audit-log";

export default async function AuditLogPage() {
  await requireAuth();
  const cryptoLogs = await readAuditLog();

  return (
    <PanelShell
      title="Audit Log"
      description="Recent encryption and decryption activity captured from the public AES256 tool."
    >
      <section className="panel-card">
        <div className="panel-card__header">
          <div>
            <p className="card__kicker">Crypto Activity</p>
            <h2>Encrypt And Decrypt Events</h2>
          </div>
        </div>
        {cryptoLogs.length ? (
          <div className="audit-log-list">
            {cryptoLogs.map((entry) => (
              <article className="audit-log-item" key={entry.id}>
                <div className="audit-log-item__meta">
                  <span className="record-order">{entry.action}</span>
                  <small>{entry.createdAt}</small>
                </div>
                <div className="audit-log-item__body">
                  <strong>{entry.messagePreview || "No text preview recorded."}</strong>
                  <p>{entry.encryptedPreview || "No ciphertext preview recorded."}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p>No audit events have been logged yet.</p>
        )}
      </section>
    </PanelShell>
  );
}
