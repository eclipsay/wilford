import { fetchPublic } from "../../lib/api";
import { requireAuth } from "../../lib/auth";
import { PanelShell } from "../../components/PanelShell";
import { DeployControl } from "../../components/DeployControl";

export default async function SystemPage() {
  await requireAuth();
  const health = await fetchPublic("/health");

  return (
    <PanelShell
      title="System"
      description="Operational controls for the panel and Discord bot."
    >
      <section className="cards">
        <article className="card">
          <p className="card__kicker">API</p>
          <h2>{health.ok ? "Online" : "Offline"}</h2>
          <p>Service: {health.service}</p>
        </article>
        <article className="card">
          <p className="card__kicker">Admin Key</p>
          <h2>{process.env.ADMIN_API_KEY ? "Ready" : "Missing"}</h2>
          <p>Required for protected write actions.</p>
        </article>
        <article className="card">
          <p className="card__kicker">Session</p>
          <h2>{process.env.PANEL_SESSION_SECRET ? "Ready" : "Missing"}</h2>
          <p>Required for panel login sessions.</p>
        </article>
        <article className="card">
          <p className="card__kicker">Discord Bot</p>
          <h2>{process.env.BOT_PM2_NAME || "Configured"}</h2>
          <p>PM2 process target for bot restart actions.</p>
        </article>
      </section>

      <DeployControl />
    </PanelShell>
  );
}
