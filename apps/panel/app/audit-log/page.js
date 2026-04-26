import { PanelShell } from "../../components/PanelShell";
import { requireAuth } from "../../lib/auth";
import { getPanelContentFile } from "../../lib/content-file";

export default async function AuditLogPage() {
  await requireAuth();
  const content = await getPanelContentFile();
  const cryptoLogs = content.cryptoLogs || [];

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
          <div className="record-list">
            {cryptoLogs.map((entry) => (
              <article className="record-item" key={entry.id}>
                <div className="record-copy">
                  <span className="record-order">{entry.action}</span>
                  <h2>{entry.messagePreview || "No text preview recorded."}</h2>
                  <p>{entry.encryptedPreview || "No ciphertext preview recorded."}</p>
                  <small>{entry.createdAt}</small>
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
