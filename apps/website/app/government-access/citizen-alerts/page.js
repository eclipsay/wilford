import Link from "next/link";
import { formatCredits } from "@wilford/shared";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import {
  citizenAlertAuthorities,
  citizenAlertTypes,
  citizenEnforcementActions,
  getCitizenState
} from "../../../lib/citizen-state";
import { canAccess, requireGovernmentUser } from "../../../lib/government-auth";
import { alertAuthorityOptionsForUser } from "../../../lib/citizen-alerts";
import { inferAssignedDistrict } from "../../../lib/government-auth";

export const metadata = {
  title: "Citizen Alerts | Government Access"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

const actionLabels = {
  none: "Notice only",
  emergency_taxation: "Emergency taxation",
  fine: "Fine",
  asset_seizure: "Asset seizure",
  wallet_freeze: "Wallet freeze",
  wallet_unfreeze: "Wallet unfreeze",
  tax_rebate: "Tax rebate",
  grant_payment: "Grant payment"
};

export default async function CitizenAlertsPage({ searchParams }) {
  const user = await requireGovernmentUser("citizenAlerts");
  const params = await searchParams;
  const state = await getCitizenState();
  const districts = [...new Set(state.citizenRecords.map((citizen) => citizen.district).filter(Boolean))];
  const citizenFilter = String(params?.citizen || "").trim();
  const typeFilter = String(params?.type || "").trim();
  const statusFilter = String(params?.status || "").trim();
  const recentAlerts = [...(state.citizenAlerts || [])]
    .filter((alert) => !citizenFilter || alert.citizenId === citizenFilter)
    .filter((alert) => !typeFilter || alert.type === typeFilter)
    .filter((alert) => !statusFilter || (alert.status || "open") === statusFilter || (statusFilter === "unread" && !alert.readByCitizen))
    .slice(0, 80);
  const authorityOptions = alertAuthorityOptionsForUser(user);
  const isGovernor = user.role === "District Governor";
  const governorDistrict = isGovernor ? inferAssignedDistrict(user, state.districtProfiles) : "";
  const visibleCitizens = isGovernor
    ? state.citizenRecords.filter((citizen) => citizen.district === governorDistrict)
    : state.citizenRecords;
  const visibleDistricts = isGovernor && governorDistrict ? [governorDistrict] : districts;

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Restricted Government System"
        title="Citizen Alerts"
        description="Issue official notices and compulsory state enforcement actions to citizens, districts, or the full Union."
      />

      <main className="content content--wide portal-page government-command-page citizen-alert-admin-page">
        <Link className="button" href="/government-access">Back to Dashboard</Link>

        {params?.saved ? (
          <section className="application-notice">
            <strong>Alert Issued</strong>
            <p>{params.count || "0"} citizen alert{params.count === "1" ? "" : "s"} created.</p>
          </section>
        ) : null}
        {params?.error ? (
          <section className="application-notice application-notice--error">
            <strong>Alert Failed</strong>
            <p>
              {params.error === "confirmation"
                ? "Large deductions require confirmation before execution."
                : params.error === "authority"
                  ? "You are not authorised to issue alerts under this authority."
                  : "Your role cannot issue that alert or no target was found."}
            </p>
          </section>
        ) : null}

        <section className="panel government-user-panel scroll-fade">
          <div className="panel__header">
            <div>
              <p className="eyebrow">Alert Control</p>
              <h2>Issue Citizen Alert</h2>
            </div>
            <span className="court-role-badge">{user.role}</span>
          </div>

          <form action="/government-access/citizen-alerts/action" className="public-application-form" method="post">
            <input name="intent" type="hidden" value="issue" />
            <div className="public-application-grid public-application-grid--three">
              <label className="public-application-field">
                <span>Target mode</span>
                <select defaultValue={isGovernor ? "district" : "citizen"} name="targetMode">
                  <option value="citizen">One citizen</option>
                  <option value="district">District</option>
                  {!isGovernor ? <option value="all">All citizens</option> : null}
                </select>
              </label>
              <label className="public-application-field">
                <span>Citizen</span>
                <select name="citizenId">
                  {visibleCitizens.map((citizen) => (
                    <option key={citizen.id} value={citizen.id}>{citizen.name} / {citizen.district}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field">
                <span>District</span>
                <select name="district">
                  {visibleDistricts.map((district) => <option key={district} value={district}>{district}</option>)}
                </select>
              </label>
            </div>

            <div className="public-application-grid public-application-grid--three">
              <label className="public-application-field">
                <span>Issuing authority</span>
                <select name="issuingAuthority">
                  {(authorityOptions.length ? authorityOptions : citizenAlertAuthorities).map((authority) => <option key={authority} value={authority}>{authority}</option>)}
                </select>
              </label>
              <label className="public-application-field">
                <span>Alert type</span>
                <select name="type">
                  {citizenAlertTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="public-application-field">
                <span>Enforcement action</span>
                <select name="enforcementAction">
                  {citizenEnforcementActions.map((action) => <option key={action} value={action}>{actionLabels[action]}</option>)}
                </select>
              </label>
            </div>

            <div className="public-application-grid public-application-grid--three">
              <label className="public-application-field">
                <span>Amount / PC</span>
                <input min="0" name="amount" step="0.01" type="number" />
              </label>
              <label className="public-application-field">
                <span>Linked record type</span>
                <input name="linkedRecordType" placeholder="transaction / case / bulletin / article" />
              </label>
              <label className="public-application-field">
                <span>Linked record ID</span>
                <input name="linkedRecordId" placeholder="Optional reference" />
              </label>
            </div>

            <label className="public-application-field">
              <span>Message / reason</span>
              <textarea name="message" required rows="5" />
            </label>

            <div className="public-application-grid public-application-grid--three">
              <label className="checkbox-row"><input defaultChecked name="appealEnabled" type="checkbox" /> Enable appeal link</label>
              <label className="checkbox-row"><input name="discordDelivery" type="checkbox" value="dm" /> Queue Discord DM delivery</label>
              <label className="checkbox-row"><input name="confirmLargeDeduction" type="checkbox" /> Confirm deduction over 5,000 PC</label>
            </div>

            <section className="application-notice application-notice--error">
              <strong>Compulsory State Action</strong>
              <p>Taxation, fines, asset seizure, and wallet freezes execute immediately for authorised roles. Citizens do not approve these actions.</p>
            </section>

            <button className="button button--solid-site" disabled={!canAccess(user, "citizenAlerts")} type="submit">
              Issue Alert
            </button>
          </form>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Alert Ledger</p>
          <h2>Recent Citizen Alerts</h2>
          <form action="/government-access/citizen-alerts" className="public-application-form" method="get">
            <div className="public-application-grid public-application-grid--three">
              <label className="public-application-field">
                <span>Citizen</span>
                <select defaultValue={citizenFilter} name="citizen">
                  <option value="">All citizens</option>
                  {state.citizenRecords.map((citizen) => (
                    <option key={citizen.id} value={citizen.id}>{citizen.name}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field">
                <span>Type</span>
                <select defaultValue={typeFilter} name="type">
                  <option value="">All types</option>
                  {citizenAlertTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="public-application-field">
                <span>Status</span>
                <select defaultValue={statusFilter} name="status">
                  <option value="">All statuses</option>
                  <option value="open">Open</option>
                  <option value="resolved">Resolved</option>
                  <option value="unread">Unread</option>
                </select>
              </label>
            </div>
            <button className="button" type="submit">Filter</button>
          </form>
          <div className="government-audit-list">
            {recentAlerts.length ? recentAlerts.map((alert) => (
              <article className={`government-audit-row government-audit-row--${alertSeverityClass(alert.type)}`} key={alert.id}>
                <span>{alert.createdAt}</span>
                <strong>{alert.type} / {alert.citizenName}</strong>
                <p>
                  {alert.issuingAuthority} / {alert.actionTaken} / {alert.status || "open"} / {alert.readByCitizen ? "read" : "unread"}
                  {alert.amount ? ` / ${formatCredits(alert.amount)}` : ""}
                  {alert.discordDeliveryRequested ? ` / Discord: ${alert.discordDeliveryStatus}` : " / Website only"}
                </p>
                <p>
                  <Link href={`/government-access/users?query=${encodeURIComponent(alert.citizenId)}`}>Citizen profile</Link>
                  {alert.transactionId || alert.linkedRecordId || alert.caseId ? ` / Linked: ${alert.transactionId || alert.linkedRecordId || alert.caseId}` : ""}
                </p>
                <div className="citizen-alert-card__actions">
                  <form action="/government-access/citizen-alerts/action" method="post">
                    <input name="intent" type="hidden" value="resend-discord" />
                    <input name="alertId" type="hidden" value={alert.id} />
                    <button className="button" type="submit">Resend DM</button>
                  </form>
                  <form action="/government-access/citizen-alerts/action" method="post">
                    <input name="intent" type="hidden" value="resolve" />
                    <input name="alertId" type="hidden" value={alert.id} />
                    <button className="button" type="submit">Mark Resolved</button>
                  </form>
                </div>
              </article>
            )) : <p className="court-empty">No citizen alerts recorded.</p>}
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}

function alertSeverityClass(type) {
  if (["Emergency Taxation", "Wallet Freeze", "MSS Warning"].includes(type)) return "failed";
  if (["Fine", "Tax Notice", "Court Notice"].includes(type)) return "warning";
  return "info";
}
