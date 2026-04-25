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

    redirect("/system?deploy=success");
  } catch {
    redirect("/system?deploy=error");
  }
}

export default async function SystemPage({ searchParams }) {
  await requireAuth();
  const params = await searchParams;
  const health = await fetchPublic("/health");

  return (
    <PanelShell
      title="System"
      description="Service visibility and configuration status for the Wilford control plane."
    >
      {params?.deploy === "success" ? (
        <section className="panel-card system-banner">
          <p>The panel deploy completed. Latest changes were pulled and the PM2 process was restarted.</p>
        </section>
      ) : null}

      {params?.deploy === "error" ? (
        <section className="panel-card system-banner system-banner--error">
          <p>The deploy action failed. Check the API logs or PM2 logs on the VPS for the exact command error.</p>
        </section>
      ) : null}

      <section className="cards">
        <article className="card">
          <p className="card__kicker">API</p>
          <h2>{health.ok ? "Online" : "Offline"}</h2>
          <p>Service: {health.service}</p>
        </article>
        <article className="card">
          <p className="card__kicker">Admin Key</p>
          <h2>{process.env.ADMIN_API_KEY ? "Configured" : "Missing"}</h2>
          <p>The panel uses this key to write protected records through the API.</p>
        </article>
        <article className="card">
          <p className="card__kicker">Panel Auth</p>
          <h2>{process.env.PANEL_SESSION_SECRET ? "Configured" : "Missing"}</h2>
          <p>Username and password login is enabled when the panel auth variables exist on the API and panel.</p>
        </article>
      </section>

      <section className="panel-card form-card form-card--wide">
        <p className="card__kicker">Panel Deploy</p>
        <h2>Pull And Restart</h2>
        <p>
          This action runs a fast-forward `git pull`, rebuilds `@wilford/panel`,
          and restarts the `wilford-panel` PM2 process on the VPS.
        </p>
        <form action={deployPanelAction}>
          <button className="button button--solid" type="submit">
            Deploy Latest Panel
          </button>
        </form>
      </section>
    </PanelShell>
  );
}
