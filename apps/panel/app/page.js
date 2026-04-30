import { fetchPublic } from "../lib/api";
import { fetchAdmin } from "../lib/api";
import { requireAuth } from "../lib/auth";
import { PanelShell } from "../components/PanelShell";
import { buildModuleHref, commandModules } from "../lib/command-modules";

function safeCount(value) {
  return Array.isArray(value) ? value.length : 0;
}

async function loadCommandSnapshot() {
  const requests = await Promise.allSettled([
    fetchPublic("/api/content"),
    fetchPublic("/api/commits"),
    fetchAdmin("/api/admin/articles"),
    fetchAdmin("/api/admin/discord-broadcasts"),
    fetchAdmin("/api/admin/government-access-store"),
    fetchAdmin("/api/admin/economy-store"),
    fetchAdmin("/api/admin/supreme-court-store"),
    fetchAdmin("/api/admin/enemies-of-state")
  ]);

  const [
    contentResult,
    commitsResult,
    articlesResult,
    broadcastsResult,
    governmentResult,
    economyResult,
    courtResult,
    enemiesResult
  ] = requests;

  const content =
    contentResult.status === "fulfilled"
      ? contentResult.value
      : {
          members: [],
          alliances: [],
          bulletins: [],
          excommunications: [],
          enemyNations: [],
          settings: {}
        };
  const commits =
    commitsResult.status === "fulfilled" ? commitsResult.value : { commits: [] };
  const articles =
    articlesResult.status === "fulfilled" ? articlesResult.value : { articles: [] };
  const broadcasts =
    broadcastsResult.status === "fulfilled"
      ? broadcastsResult.value
      : { broadcasts: [] };
  const government =
    governmentResult.status === "fulfilled"
      ? governmentResult.value
      : {
          governmentUsers: [],
          governmentAuditLog: [],
          publicApplications: [],
          citizenRecords: [],
          citizenRequests: [],
          citizenAlerts: [],
          districtProfiles: []
        };
  const economy =
    economyResult.status === "fulfilled"
      ? economyResult.value
      : { economy: { wallets: [], stockCompanies: [] } };
  const court =
    courtResult.status === "fulfilled"
      ? courtResult.value
      : { supremeCourtCases: [], supremeCourtPetitions: [] };
  const enemies =
    enemiesResult.status === "fulfilled"
      ? enemiesResult.value
      : { enemyOfStateEntries: [] };

  return {
    content,
    commits,
    counts: {
      members: safeCount(content.members),
      alliances: safeCount(content.alliances),
      bulletins: safeCount(content.bulletins),
      excommunications: safeCount(content.excommunications),
      enemyNations: safeCount(content.enemyNations),
      commits: safeCount(commits.commits),
      articles: safeCount(articles.articles),
      broadcasts: safeCount(broadcasts.broadcasts),
      governmentUsers: safeCount(government.governmentUsers),
      governmentAuditLog: safeCount(government.governmentAuditLog),
      publicApplications: safeCount(government.publicApplications),
      citizenRecords: safeCount(government.citizenRecords),
      citizenRequests: safeCount(government.citizenRequests),
      citizenAlerts: safeCount(government.citizenAlerts),
      districtProfiles: safeCount(government.districtProfiles),
      wallets: safeCount(economy.economy?.wallets),
      stockCompanies: safeCount(economy.economy?.stockCompanies),
      supremeCourtCases: safeCount(court.supremeCourtCases),
      supremeCourtPetitions: safeCount(court.supremeCourtPetitions),
      enemyOfStateEntries: safeCount(enemies.enemyOfStateEntries)
    },
    degraded: requests.some((result) => result.status === "rejected")
  };
}

export default async function PanelHomePage() {
  await requireAuth();
  const { content, counts, degraded } = await loadCommandSnapshot();
  const groups = [...new Set(commandModules.map((module) => module.group))];

  return (
    <PanelShell
      title="Admin Command Console"
      description="Terminal-styled oversight for legacy panel tools and the newer government systems now running across Wilford."
    >
      {degraded ? (
        <section className="panel-card system-banner">
          <p>
            Some protected telemetry could not be loaded. The console stays available,
            but one or more module counts may be stale.
          </p>
        </section>
      ) : null}

      <section className="cards">
        <article className="card">
          <p className="card__kicker">Citizenship Queue</p>
          <h2>{counts.publicApplications}</h2>
          <p>Applications in the government access store.</p>
        </article>
        <article className="card">
          <p className="card__kicker">Economy Wallets</p>
          <h2>{counts.wallets}</h2>
          <p>Tracked Panem Credit wallets.</p>
        </article>
        <article className="card">
          <p className="card__kicker">Court Docket</p>
          <h2>{counts.supremeCourtCases}</h2>
          <p>Cases loaded in the Supreme Court store.</p>
        </article>
        <article className="card">
          <p className="card__kicker">Broadcast Queue</p>
          <h2>{counts.broadcasts}</h2>
          <p>Discord broadcasts under administration.</p>
        </article>
      </section>

      <section className="panel-card panel-card--wide terminal-section">
        <div className="panel-card__header">
          <div>
            <p className="card__kicker">Snapshot</p>
            <h2>System Overview</h2>
          </div>
        </div>
        <div className="stat-row">
          <div className="stat-chip">
            <span>Legacy members</span>
            <strong>{counts.members}</strong>
          </div>
          <div className="stat-chip">
            <span>Published media</span>
            <strong>{counts.articles + counts.broadcasts + counts.commits}</strong>
          </div>
          <div className="stat-chip">
            <span>Security records</span>
            <strong>{counts.enemyOfStateEntries + counts.citizenAlerts}</strong>
          </div>
          <div className="stat-chip">
            <span>Chairman</span>
            <strong>{content.settings.chairmanName || "Unknown"}</strong>
          </div>
        </div>
        <div className="terminal-readout">
          <div className="terminal-readout__line">
            <span className="terminal-readout__prompt">$</span>
            <span>service/status members={counts.members} alliances={counts.alliances} excommunications={counts.excommunications}</span>
          </div>
          <div className="terminal-readout__line">
            <span className="terminal-readout__prompt">$</span>
            <span>service/government users={counts.governmentUsers} requests={counts.citizenRequests} audit={counts.governmentAuditLog}</span>
          </div>
          <div className="terminal-readout__line">
            <span className="terminal-readout__prompt">$</span>
            <span>service/economy wallets={counts.wallets} stocks={counts.stockCompanies} districts={counts.districtProfiles}</span>
          </div>
        </div>
      </section>

      <section className="panel-card panel-card--wide">
        <div className="panel-card__header">
          <div>
            <p className="card__kicker">Command Index</p>
            <h2>Operational Modules</h2>
          </div>
        </div>
        <div className="module-groups">
          {groups.map((group) => (
            <section className="module-group" key={group}>
              <div className="module-group__header">
                <span className="status-badge">{group}</span>
                <strong>
                  {commandModules.filter((module) => module.group === group).length} routes
                </strong>
              </div>
              <div className="module-grid">
                {commandModules
                  .filter((module) => module.group === group)
                  .map((module) => (
                    <a
                      className="module-card"
                      href={buildModuleHref(module.path)}
                      key={module.title}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <div className="module-card__header">
                        <span className="module-card__code">{module.code}</span>
                        <strong>{counts[module.metric] ?? 0}</strong>
                      </div>
                      <h3>{module.title}</h3>
                      <p>{module.description}</p>
                      <small>{module.path}</small>
                    </a>
                  ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </PanelShell>
  );
}
