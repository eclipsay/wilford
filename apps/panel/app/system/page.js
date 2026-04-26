import { redirect } from "next/navigation";
import { fetchAdmin, fetchPublic } from "../../lib/api";
import { requireAuth } from "../../lib/auth";
import { PanelShell } from "../../components/PanelShell";

async function deployPanelAction() {
  "use server";

  try {
    await fetchAdmin("/api/admin/deploy/panel", {
      method: "POST",
      body: JSON.stringify({})
    });

    redirect("/system?panel=success");
  } catch {
    redirect("/system?panel=error");
  }
}

async function deployBotAction() {
  "use server";

  try {
    await fetchAdmin("/api/admin/deploy/bot", {
      method: "POST",
      body: JSON.stringify({})
    });

    redirect("/system?bot=success");
  } catch {
    redirect("/system?bot=error");
  }
}

function Banner({ kind, children }) {
  return (
    <section className={`panel-card system-banner${kind === "error" ? " system-banner--error" : ""}`}>
      <p>{children}</p>
    </section>
  );
}

export default async function SystemPage({ searchParams }) {
  await requireAuth();
  const params = await searchParams;
  const health = await fetchPublic("/health");

  return (
    <PanelShell
      title="System"
      description="Operational controls for the panel and Discord bot."
    >
      {params?.panel === "success" ? (
        <Banner kind="success">
          The panel deployment completed successfully.
        </Banner>
      ) : null}

      {params?.panel === "error" ? (
        <Banner kind="error">
          The panel deployment failed. Check PM2 and API logs for details.
        </Banner>
      ) : null}

      {params?.bot === "success" ? (
        <Banner kind="success">
          The Discord bot deployment completed successfully.
        </Banner>
      ) : null}

      {params?.bot === "error" ? (
        <Banner kind="error">
          The Discord bot deployment failed. Check PM2 and API logs for details.
        </Banner>
      ) : null}

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

      <section className="panel-grid">
        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Panel</p>
              <h2>Pull And Restart</h2>
            </div>
          </div>
          <p>
            Pull the latest code, rebuild `@wilford/panel`, and restart the
            panel PM2 process.
          </p>
          <form action={deployPanelAction}>
            <button className="button button--solid" type="submit">
              Deploy Panel
            </button>
          </form>
        </article>

        <article className="panel-card">
          <div className="panel-card__header">
            <div>
              <p className="card__kicker">Discord Bot</p>
              <h2>Pull And Restart</h2>
            </div>
          </div>
          <p>
            Pull the latest code, run the bot workspace build, and restart the
            Discord bot PM2 process.
          </p>
          <form action={deployBotAction}>
            <button className="button button--solid" type="submit">
              Deploy Bot
            </button>
          </form>
        </article>
      </section>

    </PanelShell>
  );
}
