import { PanelShell } from "../../components/PanelShell";
import { requireAuth } from "../../lib/auth";
import { fetchPublic } from "../../lib/api";
import { readAuditLog } from "../../lib/audit-log";

function normalizeTimestamp(value) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value || "Unknown time";
  }

  return date.toLocaleString();
}

export default async function AuditLogPage() {
  await requireAuth();
  let apiLogs = [];

  try {
    const content = await fetchPublic("/api/content");
    apiLogs = Array.isArray(content?.cryptoLogs) ? content.cryptoLogs : [];
  } catch {
    apiLogs = [];
  }

  const localLogs = await readAuditLog();
  const cryptoLogs = [...apiLogs, ...localLogs]
    .filter((entry) => entry && (entry.id || entry.createdAt))
    .reduce((entries, entry) => {
      const key = entry.id || `${entry.action}-${entry.createdAt}`;

      if (!entries.some((existing) => (existing.id || `${existing.action}-${existing.createdAt}`) === key)) {
        entries.push(entry);
      }

      return entries;
    }, [])
    .sort((left, right) => {
      const leftDate = new Date(left.createdAt || 0).getTime();
      const rightDate = new Date(right.createdAt || 0).getTime();
      return rightDate - leftDate;
    });

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
                  <small>{normalizeTimestamp(entry.createdAt)}</small>
                  <small>{entry.source || "archive"}</small>
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
