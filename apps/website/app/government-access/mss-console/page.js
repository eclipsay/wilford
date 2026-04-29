import Link from "next/link";
import { formatCredits } from "@wilford/shared";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { canAccess, requireGovernmentUser } from "../../../lib/government-auth";
import {
  mssClassifications,
  mssDistributions,
  mssThreatLevels,
  pingOptions
} from "../../../lib/discord-broadcasts";
import {
  enemyClassifications,
  enemyStatuses,
  enemyThreatLevels,
  enemyVisibilityLevels,
  getAllEnemyEntries
} from "../../../lib/enemies-of-state";
import { getCitizenState } from "../../../lib/citizen-state";
import { getEconomyStore, getSecurityDashboard, mssExemptionStatuses } from "../../../lib/panem-credit";

export const metadata = {
  title: "MSS Console | Government Access"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function MssConsolePage({ searchParams }) {
  const params = await searchParams;
  const user = await requireGovernmentUser("enemyRegistryDraft");
  const [entries, state, economy] = await Promise.all([getAllEnemyEntries(), getCitizenState(), getEconomyStore()]);
  const security = getSecurityDashboard(economy);
  const selectedSeverity = String(params?.severity || "").trim();
  const selectedDistrict = String(params?.district || "").trim();
  const selectedWallet = String(params?.wallet || "").trim();
  const canManageFlags = ["Supreme Chairman", "Executive Director", "Minister of State Security", "MSS Command", "Security Command"].includes(user.role);
  const districtOptions = [...new Set(economy.wallets.map((wallet) => wallet.district).filter(Boolean))];
  const visibleFlagged = security.flagged.filter((entry) => {
    const severityMatch = !selectedSeverity ||
      (selectedSeverity === "Critical" && entry.score >= 80) ||
      (selectedSeverity === "High" && entry.score >= 60 && entry.score < 80) ||
      (selectedSeverity === "Medium" && entry.score >= 35 && entry.score < 60) ||
      (selectedSeverity === "Exempt" && entry.wallet.mssExemptionStatus !== "none") ||
      (selectedSeverity === "Under Investigation" && (entry.wallet.mssInvestigationStatus === "Under Investigation" || entry.wallet.mssManualFlag));
    return severityMatch &&
      (!selectedDistrict || entry.wallet.district === selectedDistrict) &&
      (!selectedWallet || entry.wallet.id === selectedWallet);
  });
  const mssCitizenAlerts = (state.citizenAlerts || [])
    .filter((alert) => alert.type === "MSS Warning" || alert.issuingAuthority === "Ministry of State Security")
    .slice(0, 20);
  const canIssuePublic = canAccess(user, "enemyRegistryPublic");
  const canCreateAlerts = canAccess(user, "mssTools");
  const visiblePingOptions = ["Supreme Chairman", "Executive Director", "MSS Command", "Security Command"].includes(user.role)
    ? pingOptions
    : pingOptions.filter((option) => option.value !== "everyone");

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Ministry of State Security"
        title="MSS Console"
        description="Restricted security command console for authorised MSS leadership."
      />

      <main className="content content--wide portal-page government-command-page">
        <Link className="button" href="/government-access">
          Back to Dashboard
        </Link>
        {params?.saved ? (
          <section className="application-notice">
            <strong>Security Alert Queued</strong>
            <p>The MSS directive has been recorded for Discord delivery.</p>
          </section>
        ) : null}
        {params?.registrySaved ? (
          <section className="application-notice">
            <strong>Registry Updated</strong>
            <p>The Enemy of the State Registry has been recorded for authorised review.</p>
          </section>
        ) : null}
        {params?.raidSaved ? (
          <section className="application-notice">
            <strong>MSS Raid Complete</strong>
            <p>{params.detail || `${params.count || "0"} citizen inventory record${params.count === "1" ? "" : "s"} inspected.`}</p>
          </section>
        ) : null}
        {params?.mssFlagSaved ? (
          <section className="application-notice">
            <strong>MSS Flag Updated</strong>
            <p>The flagged citizen record and audit log have been saved.</p>
          </section>
        ) : null}
        {params?.error ? (
          <section className="application-notice application-notice--error">
            <strong>Security Alert Not Sent</strong>
            <p>{params.detail || "The directive could not be queued."}</p>
          </section>
        ) : null}
        <section className="panel government-user-panel">
          <p className="eyebrow">MSS Raid System</p>
          <h2>Inventory Enforcement Raid</h2>
          <form action="/government-access/mss-console/action" className="public-application-form" method="post">
            <input name="intent" type="hidden" value="mss-raid" />
            <div className="public-application-grid public-application-grid--three">
              <label className="public-application-field">
                <span>Raid mode</span>
                <select name="mode">
                  <option value="target">Targeted Raid</option>
                  <option value="district">District Sweep</option>
                  <option value="random">Random Enforcement Action</option>
                </select>
              </label>
              <label className="public-application-field">
                <span>Citizen target</span>
                <select name="walletId">
                  {economy.wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.displayName} / {wallet.district}</option>)}
                </select>
              </label>
              <label className="public-application-field">
                <span>District</span>
                <select name="district">
                  {[...new Set(economy.wallets.map((wallet) => wallet.district).filter(Boolean))].map((district) => <option key={district} value={district}>{district}</option>)}
                </select>
              </label>
            </div>
            <div className="public-application-grid public-application-grid--three">
              <label className="public-application-field">
                <span>Raid type</span>
                <select name="raidType">
                  <option>Inventory Inspection</option>
                  <option>Contraband Seizure</option>
                  <option>Full Asset Raid</option>
                  <option>Financial Investigation</option>
                </select>
              </label>
              <label className="public-application-field">
                <span>Item seizure %</span>
                <input defaultValue="25" min="0" max="100" name="itemSeizurePercent" type="number" />
              </label>
              <label className="public-application-field">
                <span>Emergency fine</span>
                <input defaultValue="0" min="0" name="fineAmount" type="number" />
              </label>
            </div>
            <div className="public-application-grid public-application-grid--two">
              <label className="public-application-field">
                <span>Trading restriction hours</span>
                <input defaultValue="0" min="0" max="168" name="restrictHours" type="number" />
              </label>
              <label className="public-application-field">
                <span>Reason</span>
                <input defaultValue="Suspicious activity" name="reason" />
              </label>
            </div>
            <button className="button button--danger-site" disabled={!canAccess(user, "mssTools")} type="submit">Execute Raid</button>
          </form>
        </section>

        <section className="state-section">
          <p className="eyebrow">Suspicion Ledger</p>
          <h2>Flagged Citizens</h2>
          <form action="/government-access/mss-console" className="public-application-form" method="get">
            <div className="public-application-grid public-application-grid--three">
              <label className="public-application-field">
                <span>Severity</span>
                <select defaultValue={selectedSeverity} name="severity">
                  <option value="">All</option>
                  <option value="Critical">Critical</option>
                  <option value="High">High</option>
                  <option value="Medium">Medium</option>
                  <option value="Exempt">Exempt</option>
                  <option value="Under Investigation">Under Investigation</option>
                </select>
              </label>
              <label className="public-application-field">
                <span>District</span>
                <select defaultValue={selectedDistrict} name="district">
                  <option value="">All districts</option>
                  {districtOptions.map((district) => <option key={district} value={district}>{district}</option>)}
                </select>
              </label>
              <label className="public-application-field">
                <span>Citizen</span>
                <select defaultValue={selectedWallet} name="wallet">
                  <option value="">All flagged citizens</option>
                  {security.flagged.map((entry) => <option key={entry.wallet.id} value={entry.wallet.id}>{entry.wallet.displayName}</option>)}
                </select>
              </label>
            </div>
            <button className="button" type="submit">Apply Filters</button>
          </form>
          <div className="government-user-list">
            {visibleFlagged.map((entry) => {
              const citizen = state.citizenRecords.find((record) =>
                record.walletId === entry.wallet.id ||
                (record.discordId && record.discordId === entry.wallet.discordId) ||
                (record.userId && record.userId === entry.wallet.userId)
              );
              const citizenWarnings = citizen
                ? state.citizenAlerts.filter((alert) => alert.citizenId === citizen.id && (alert.type === "MSS Warning" || alert.issuingAuthority === "MSS" || alert.issuingAuthority === "Ministry of State Security")).slice(0, 8)
                : [];
              return (
              <article className="panel government-user-card" id={`flag-${entry.wallet.id}`} key={entry.wallet.id}>
                <div className="panel__header">
                  <div>
                    <p className="eyebrow">{entry.status}</p>
                    <h3>{entry.wallet.displayName}</h3>
                  </div>
                  <span className="court-role-badge">{entry.wallet.mssExemptionStatus !== "none" ? "MSS EXEMPT" : entry.score}</span>
                </div>
                <p>{entry.reasons.join(", ") || "MSS monitoring"}</p>
                <dl className="panem-ledger">
                  <div><dt>District</dt><dd>{entry.wallet.district}</dd></div>
                  <div><dt>Inventory</dt><dd>{entry.wallet.holdings?.length || 0} item types</dd></div>
                  <div><dt>Balance</dt><dd>{formatCredits(entry.wallet.balance || 0)}</dd></div>
                  <div><dt>Exemption</dt><dd>{entry.wallet.mssExemptionStatus}</dd></div>
                  <div><dt>Investigation</dt><dd>{entry.wallet.mssInvestigationStatus || (entry.wallet.underReview ? "Under Review" : "None")}</dd></div>
                  <div><dt>Last reviewed</dt><dd>{entry.wallet.mssLastReviewedAt || "Not reviewed"}</dd></div>
                </dl>
                <details className="public-application-form">
                  <summary className="button">View Details</summary>
                  <div className="metric-grid">
                    <span><strong>{formatCredits(entry.details?.largeBalance || entry.wallet.balance || 0)}</strong> Large balance check</span>
                    <span><strong>{formatCredits(entry.details?.inventoryValue || 0)}</strong> Inventory value</span>
                    <span><strong>{entry.details?.contrabandCount || 0}</strong> Restricted inventory count</span>
                    <span><strong>{entry.details?.riskyActions || 0}</strong> Risky actions</span>
                    <span><strong>{formatCredits(entry.details?.rapidGain || 0)}</strong> Rapid gain</span>
                    <span><strong>{entry.raids.length}</strong> Previous raids</span>
                  </div>
                  <h4>Triggering Events</h4>
                  <ul className="government-mini-list">
                    {entry.recentTransactions.map((transaction) => <li key={transaction.id}><span>{transaction.type} / {transaction.reason}</span><strong>{formatCredits(transaction.amount || 0)}</strong></li>)}
                    {!entry.recentTransactions.length ? <li><span>No recent transactions.</span><strong>0</strong></li> : null}
                  </ul>
                  <h4>Raids and Warnings</h4>
                  <ul className="government-mini-list">
                    {entry.raids.map((raid) => <li key={raid.id}><span>{raid.raidType} / {raid.reason}</span><strong>{raid.securityStatus}</strong></li>)}
                    {[...entry.previousWarnings, ...citizenWarnings].map((warning) => <li key={warning.id}><span>{warning.type} / {warning.summary || warning.message}</span><strong>{warning.status || "open"}</strong></li>)}
                    {!entry.raids.length && !entry.previousWarnings.length && !citizenWarnings.length ? <li><span>No previous raids or warnings.</span><strong>Clear</strong></li> : null}
                  </ul>
                  {entry.wallet.mssNotes?.length ? (
                    <>
                      <h4>MSS Notes</h4>
                      <ul className="government-mini-list">
                        {entry.wallet.mssNotes.slice(0, 5).map((note) => <li key={note.id}><span>{note.note}</span><strong>{note.by}</strong></li>)}
                      </ul>
                    </>
                  ) : null}
                </details>
                <div className="bulletin-editor-card__actions">
                  {citizen ? <Link className="button" href={`/government-access/union-security-registry?citizen=${encodeURIComponent(citizen.id)}`}>Open Citizen Profile</Link> : null}
                  <form action="/government-access/mss-console/action" method="post">
                    <input name="intent" type="hidden" value="mss-issue-warning" />
                    <input name="walletId" type="hidden" value={entry.wallet.id} />
                    <input name="reason" type="hidden" value="MSS warning issued from flagged citizen ledger." />
                    <button className="button" type="submit">Issue Warning</button>
                  </form>
                  <form action="/government-access/mss-console/action" method="post">
                    <input name="intent" type="hidden" value="mss-start-investigation" />
                    <input name="walletId" type="hidden" value={entry.wallet.id} />
                    <input name="reason" type="hidden" value="Investigation opened from flagged citizen ledger." />
                    <button className="button" type="submit">Start Investigation</button>
                  </form>
                </div>
                <form action="/government-access/mss-console/action" className="public-application-form" method="post">
                  <input name="walletId" type="hidden" value={entry.wallet.id} />
                  <label className="public-application-field"><span>MSS note / reason</span><input name="reason" required placeholder="Required for flag changes and notes" /></label>
                  <div className="public-application-grid public-application-grid--three">
                    <label className="public-application-field"><span>New score</span><input defaultValue={Math.max(0, entry.score - 15)} min="0" max="100" name="newScore" type="number" /></label>
                    <label className="public-application-field"><span>Exemption status</span><select defaultValue={entry.wallet.mssExemptionStatus || "none"} name="exemptionStatus">{mssExemptionStatuses.map((status) => <option key={status} value={status}>{status}</option>)}</select></label>
                    <button className="button" name="intent" type="submit" value="mss-add-note">Add MSS Note</button>
                  </div>
                  <div className="bulletin-editor-card__actions">
                    <button className="button" disabled={!canManageFlags} name="intent" type="submit" value="mss-clear-flags">Clear Flags</button>
                    <button className="button" disabled={!canManageFlags} name="intent" type="submit" value="mss-reduce-suspicion">Reduce Suspicion</button>
                    <button className="button" disabled={!canManageFlags} name="intent" type="submit" value="mss-mark-exempt">Mark Exempt</button>
                    <button className="button" disabled={!canManageFlags} name="intent" type="submit" value="mss-remove-exemption">Remove Exemption</button>
                    <button className="button button--danger-site" disabled={!canManageFlags} name="intent" type="submit" value="mss-manual-flag">Manual Flag Override</button>
                  </div>
                </form>
              </article>
              );
            })}
            {visibleFlagged.length ? null : <article className="panel"><h3>No citizens match the current MSS filters.</h3></article>}
          </div>
        </section>

        <section className="state-section">
          <p className="eyebrow">Flag Audit</p>
          <h2>MSS Flag Change Log</h2>
          <div className="government-audit-list">
            {security.auditLog.length ? security.auditLog.map((entry) => (
              <article className="government-audit-row government-audit-row--warning" key={entry.id}>
                <span>{entry.at}</span>
                <strong>{entry.action} / {entry.displayName}</strong>
                <p>{entry.actor} / {entry.oldScore} to {entry.newScore} / {entry.oldStatus} to {entry.newStatus} / {entry.reason}</p>
              </article>
            )) : <p className="court-empty">No MSS flag changes recorded.</p>}
          </div>
        </section>

        <section className="state-section">
          <p className="eyebrow">Raid Logs</p>
          <h2>Recent MSS Raids</h2>
          <div className="government-audit-list">
            {security.raidLogs.length ? security.raidLogs.map((raid) => (
              <article className="government-audit-row government-audit-row--warning" key={raid.id}>
                <span>{raid.createdAt}</span>
                <strong>{raid.raidType} / {raid.displayName}</strong>
                <p>{raid.reason} / seized {raid.seizedItems.length} item type(s) / fine {raid.fineAmount || 0} PC</p>
              </article>
            )) : <p className="court-empty">No raid logs recorded.</p>}
          </div>
        </section>

        <section className="state-section">
          <p className="eyebrow">Citizen Alert Logs</p>
          <h2>MSS Citizen Alerts</h2>
          <div className="government-audit-list">
            {mssCitizenAlerts.length ? mssCitizenAlerts.map((alert) => (
              <article className="government-audit-row government-audit-row--warning" key={alert.id}>
                <span>{alert.createdAt}</span>
                <strong>{alert.citizenName} / {alert.type}</strong>
                <p>{alert.actionTaken} / {alert.status || "open"} / Discord: {alert.discordDeliveryStatus || "not_requested"}</p>
              </article>
            )) : <p className="court-empty">No MSS citizen alerts recorded.</p>}
          </div>
        </section>

        <section className="panel government-user-panel">
          <p className="eyebrow">Enemy of the State Registry</p>
          <h2>Create Registry Entry</h2>
          <p>
            Authenticated as {user.username} / {user.role}. MSS Agents may draft records;
            public registry approval is restricted to Supreme Chairman, Executive Director,
            MSS Command, and the Minister of State Security.
          </p>
          <form action="/government-access/mss-console/action" className="public-application-form" method="post">
            <input name="intent" type="hidden" value="create-enemy-entry" />
            <div className="public-application-grid public-application-grid--two">
              <label className="public-application-field">
                <span>Name</span>
                <input name="name" required type="text" />
              </label>
              <label className="public-application-field">
                <span>Alias</span>
                <input name="alias" type="text" />
              </label>
            </div>
            <div className="public-application-grid public-application-grid--three">
              <label className="public-application-field">
                <span>Classification</span>
                <select defaultValue="Person of Interest" name="classification">
                  {enemyClassifications.map((classification) => (
                    <option key={classification} value={classification}>{classification}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field">
                <span>Threat level</span>
                <select defaultValue="Low" name="threatLevel">
                  {enemyThreatLevels.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field">
                <span>Status</span>
                <select defaultValue="Under MSS Review" name="status">
                  {enemyStatuses.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </label>
            </div>
            <div className="public-application-grid public-application-grid--three">
              <label className="public-application-field">
                <span>Visibility</span>
                <select defaultValue="MSS Only" name="visibility">
                  {enemyVisibilityLevels.map((visibility) => (
                    <option disabled={visibility === "Public Registry" && !canIssuePublic} key={visibility} value={visibility}>{visibility}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field">
                <span>Date listed</span>
                <input defaultValue={new Date().toISOString().slice(0, 10)} name="dateListed" type="date" />
              </label>
              <label className="public-application-field">
                <span>Issuing authority</span>
                <input defaultValue="Ministry of State Security" name="issuingAuthority" type="text" />
              </label>
            </div>
            <div className="public-application-grid public-application-grid--two">
              <label className="public-application-field">
                <span>Discord ID</span>
                <input name="discordId" type="text" />
              </label>
              <label className="public-application-toggle">
                <input name="discordIdPublic" type="checkbox" />
                <span>Show Discord ID publicly</span>
              </label>
            </div>
            <label className="public-application-field">
              <span>Reason summary</span>
              <textarea name="reasonSummary" required rows="4" />
            </label>
            <label className="public-application-field">
              <span>Evidence notes</span>
              <textarea name="evidenceNotes" rows="4" />
            </label>
            <div className="public-application-grid public-application-grid--two">
              <label className="public-application-field">
                <span>Supreme Court case link</span>
                <input name="relatedCaseUrl" type="text" />
              </label>
              <label className="public-application-field">
                <span>News article link</span>
                <input name="relatedArticleUrl" type="text" />
              </label>
            </div>
            <div className="public-application-grid public-application-grid--two">
              <label className="public-application-field">
                <span>Bulletin link</span>
                <input name="relatedBulletinUrl" type="text" />
              </label>
              <label className="public-application-field">
                <span>Image / portrait URL</span>
                <input name="imageUrl" type="text" />
              </label>
            </div>
            <button className="button button--solid-site" type="submit">
              Create Registry Entry
            </button>
          </form>
        </section>

        <section className="state-section">
          <p className="eyebrow">Registry Management</p>
          <h2>Enemy of the State Records</h2>
          <div className="enemy-admin-list">
            {entries.map((entry) => (
              <article className="panel government-user-card enemy-admin-card" key={entry.id}>
                <div className="enemy-admin-card__heading">
                  <div>
                    <p className="eyebrow">{entry.visibility}</p>
                    <h3>{entry.name}{entry.alias ? ` / ${entry.alias}` : ""}</h3>
                  </div>
                  <strong>{entry.classification} / {entry.threatLevel}</strong>
                </div>
                <form action="/government-access/mss-console/action" className="public-application-form" method="post">
                  <input name="intent" type="hidden" value="update-enemy-entry" />
                  <input name="entryId" type="hidden" value={entry.id} />
                  <div className="public-application-grid public-application-grid--three">
                    <label className="public-application-field">
                      <span>Name</span>
                      <input defaultValue={entry.name} name="name" required type="text" />
                    </label>
                    <label className="public-application-field">
                      <span>Alias</span>
                      <input defaultValue={entry.alias} name="alias" type="text" />
                    </label>
                    <label className="public-application-field">
                      <span>Discord ID</span>
                      <input defaultValue={entry.discordId} name="discordId" type="text" />
                    </label>
                  </div>
                  <div className="public-application-grid public-application-grid--three">
                    <label className="public-application-field">
                      <span>Classification</span>
                      <select defaultValue={entry.classification} name="classification">
                        {enemyClassifications.map((classification) => (
                          <option key={classification} value={classification}>{classification}</option>
                        ))}
                      </select>
                    </label>
                    <label className="public-application-field">
                      <span>Threat level</span>
                      <select defaultValue={entry.threatLevel} name="threatLevel">
                        {enemyThreatLevels.map((level) => (
                          <option key={level} value={level}>{level}</option>
                        ))}
                      </select>
                    </label>
                    <label className="public-application-field">
                      <span>Status</span>
                      <select defaultValue={entry.status} name="status">
                        {enemyStatuses.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </label>
                  </div>
                  <div className="public-application-grid public-application-grid--three">
                    <label className="public-application-field">
                      <span>Visibility</span>
                      <select defaultValue={entry.visibility} name="visibility">
                        {enemyVisibilityLevels.map((visibility) => (
                          <option disabled={visibility === "Public Registry" && !canIssuePublic} key={visibility} value={visibility}>{visibility}</option>
                        ))}
                      </select>
                    </label>
                    <label className="public-application-field">
                      <span>Date listed</span>
                      <input defaultValue={entry.dateListed} name="dateListed" type="date" />
                    </label>
                    <label className="public-application-field">
                      <span>Issuing authority</span>
                      <input defaultValue={entry.issuingAuthority} name="issuingAuthority" type="text" />
                    </label>
                  </div>
                  <label className="public-application-field">
                    <span>Reason summary</span>
                    <textarea defaultValue={entry.reasonSummary} name="reasonSummary" required rows="3" />
                  </label>
                  <label className="public-application-field">
                    <span>Evidence notes</span>
                    <textarea defaultValue={entry.evidenceNotes} name="evidenceNotes" rows="3" />
                  </label>
                  <div className="public-application-grid public-application-grid--two">
                    <label className="public-application-field">
                      <span>Supreme Court case link</span>
                      <input defaultValue={entry.relatedCaseUrl} name="relatedCaseUrl" type="text" />
                    </label>
                    <label className="public-application-field">
                      <span>News article link</span>
                      <input defaultValue={entry.relatedArticleUrl} name="relatedArticleUrl" type="text" />
                    </label>
                  </div>
                  <div className="public-application-grid public-application-grid--two">
                    <label className="public-application-field">
                      <span>Bulletin link</span>
                      <input defaultValue={entry.relatedBulletinUrl} name="relatedBulletinUrl" type="text" />
                    </label>
                    <label className="public-application-field">
                      <span>Image / portrait URL</span>
                      <input defaultValue={entry.imageUrl} name="imageUrl" type="text" />
                    </label>
                  </div>
                  <label className="public-application-toggle">
                    <input defaultChecked={entry.discordIdPublic} name="discordIdPublic" type="checkbox" />
                    <span>Show Discord ID publicly</span>
                  </label>
                  <button className="button button--solid-site" type="submit">
                    Save Registry Entry
                  </button>
                </form>
                <form action="/government-access/mss-console/action" method="post">
                  <input name="intent" type="hidden" value="archive-enemy-entry" />
                  <input name="entryId" type="hidden" value={entry.id} />
                  <button className="button button--danger-site" type="submit">
                    Remove / Archive Entry
                  </button>
                </form>
              </article>
            ))}
          </div>
        </section>

        {canCreateAlerts ? (
        <section className="panel government-user-panel">
          <p className="eyebrow">MSS Command</p>
          <h2>Create Security Alert</h2>
          <p>
            Authenticated as {user.username} / {user.role}. Professional wording is required;
            alerts do not assert guilt unless the classification is explicitly Enemy of the State.
          </p>
          <form action="/government-access/mss-console/action" className="public-application-form" method="post">
            <input name="intent" type="hidden" value="create-security-alert" />
            <div className="public-application-grid public-application-grid--two">
              <label className="public-application-field">
                <span>Subject name / username</span>
                <input name="subjectName" required type="text" />
              </label>
              <label className="public-application-field">
                <span>Discord ID optional</span>
                <input name="targetDiscordId" type="text" />
              </label>
            </div>
            <div className="public-application-grid public-application-grid--three">
              <label className="public-application-field">
                <span>Classification</span>
                <select defaultValue="Person of Interest" name="classification">
                  {mssClassifications.map((classification) => (
                    <option key={classification} value={classification}>{classification}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field">
                <span>Threat level</span>
                <select defaultValue="Low" name="threatLevel">
                  {mssThreatLevels.map((level) => (
                    <option key={level} value={level}>{level}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field">
                <span>Distribution</span>
                <select defaultValue="mss_only" name="distribution">
                  {mssDistributions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field">
                <span>Ping Options</span>
                <select defaultValue="none" name="pingOption">
                  {visiblePingOptions.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
            </div>
            <label className="public-application-field">
              <span>Reason / summary</span>
              <textarea name="reason" required rows="5" />
            </label>
            <label className="public-application-field">
              <span>Evidence notes</span>
              <textarea name="evidenceNotes" rows="5" />
            </label>
            <div className="public-application-grid public-application-grid--two">
              <label className="public-application-toggle">
                <input name="requiresApproval" type="checkbox" />
                <span>Requires approval</span>
              </label>
              <label className="public-application-toggle">
                <input name="confirmDiscordBroadcast" type="checkbox" />
                <span>Submit dangerous broadcast for Chairman approval</span>
              </label>
              <label className="public-application-toggle">
                <input name="confirmPingBroadcast" type="checkbox" />
                <span>Confirm Broadcast: You are about to send a message to all members.</span>
              </label>
            </div>
            <button className="button button--solid-site" type="submit">
              Create Security Alert
            </button>
          </form>
        </section>
        ) : null}
      </main>
    </SiteLayout>
  );
}
