import Link from "next/link";
import { formatCredits } from "@wilford/shared";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import {
  inferAssignedDistrict,
  requireGovernmentUser
} from "../../../lib/government-auth";
import { getCitizenState } from "../../../lib/citizen-state";
import { getEconomyStore, getWallet } from "../../../lib/panem-credit";

export const metadata = {
  title: "District Governor Panel | Government Access"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function sameDistrict(a = "", b = "") {
  return String(a || "").toLowerCase() === String(b || "").toLowerCase();
}

export default async function DistrictGovernorPanel({ searchParams }) {
  const user = await requireGovernmentUser("districtGovernorPanel");
  const params = await searchParams;
  const [state, economy] = await Promise.all([getCitizenState(), getEconomyStore()]);
  const assignedDistrict = user.role === "District Governor"
    ? inferAssignedDistrict(user, state.districtProfiles)
    : String(params?.district || "").trim() || "The Capitol";
  const district = state.districtProfiles.find((item) =>
    sameDistrict(item.canonicalName, assignedDistrict) || sameDistrict(item.name, assignedDistrict)
  ) || state.districtProfiles[0];
  const districtName = district?.canonicalName || assignedDistrict || "The Capitol";
  const economyDistrict = economy.districts.find((item) => sameDistrict(item.name, districtName));
  const districtFund = economy.districtFunds?.find((fund) => sameDistrict(fund.district, districtName));
  const citizens = state.citizenRecords.filter((citizen) => sameDistrict(citizen.district, districtName));
  const citizenRows = citizens.map((citizen) => {
    const wallet = getWallet(economy, citizen.walletId || citizen.userId || citizen.discordId || citizen.id);
    const alerts = state.citizenAlerts.filter((alert) => alert.citizenId === citizen.id);
    const requests = state.citizenRequests.filter((request) => request.citizenId === citizen.id);
    return { citizen, wallet, alerts, requests };
  });
  const districtAlerts = state.citizenAlerts.filter((alert) => sameDistrict(alert.district, districtName));
  const districtRequests = state.citizenRequests.filter((request) => sameDistrict(request.district, districtName));
  const marketItems = economy.marketItems.filter((item) => sameDistrict(item.district, districtName));
  const marketContribution = marketItems.reduce((sum, item) => sum + Number(item.currentPrice || item.basePrice || 0) * Number(item.stock || 0), 0);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="District Administration"
        title="District Governor Panel"
        description="Restricted district operations, citizen records, local alerts, funding requests, and district fund visibility."
      />

      <main className="content content--wide portal-page government-command-page">
        <Link className="button" href="/government-access">Back to Dashboard</Link>

        {params?.saved ? (
          <section className="application-notice">
            <strong>District Request Submitted</strong>
            <p>Central government can now review the funding request.</p>
          </section>
        ) : null}

        <section className="government-dashboard-grid">
          <article className="government-status-panel"><p className="eyebrow">District</p><h2>{districtName}</h2><p>{district?.industry || economyDistrict?.productionType}</p></article>
          <article className="government-status-panel"><p className="eyebrow">Governor</p><h2>{district?.governorName || user.displayName}</h2><p>{district?.governorTitle || "District Governor"}</p></article>
          <article className="government-status-panel"><p className="eyebrow">Citizens</p><h2>{citizens.length}</h2><p>Registered to this district.</p></article>
          <article className="government-status-panel"><p className="eyebrow">District Fund</p><h2>{formatCredits(districtFund?.balance || 0)}</h2><p>{districtFund?.name || `${districtName} Fund`}</p></article>
        </section>

        <section className="panel government-user-panel">
          <div className="panel__header">
            <div>
              <p className="eyebrow">District Economy</p>
              <h2>{districtName} Production and Fund</h2>
            </div>
            <Link className="button" href={`/government-access/citizen-alerts?district=${encodeURIComponent(districtName)}`}>Send District Alert</Link>
          </div>
          <div className="metric-grid">
            <span><strong>{formatCredits(districtFund?.balance || 0)}</strong> Fund balance</span>
            <span><strong>{formatCredits(districtFund?.taxReceivedWeek || 0)}</strong> Tax received this week</span>
            <span><strong>{formatCredits(districtFund?.taxReceivedMonth || 0)}</strong> Tax received this month</span>
            <span><strong>{formatCredits(economyDistrict?.tradeVolume || 0)}</strong> Trade volume</span>
            <span><strong>{formatCredits(marketContribution)}</strong> Marketplace contribution</span>
            <span><strong>{economyDistrict?.prosperityRating ?? 0}</strong> Prosperity</span>
            <span><strong>{economyDistrict?.supplyLevel ?? 0}</strong> Supply</span>
            <span><strong>{economyDistrict?.demandLevel ?? 0}</strong> Demand</span>
          </div>
          <form action="/government-access/district-governor/action" className="public-application-form" method="post">
            <input name="intent" type="hidden" value="funding-request" />
            <input name="district" type="hidden" value={districtName} />
            <h3>Submit Funding Request</h3>
            <div className="public-application-grid public-application-grid--three">
              <label className="public-application-field"><span>Amount Requested</span><input min="1" name="amount" required type="number" /></label>
              <label className="public-application-field"><span>Priority</span><select name="priority"><option>Normal</option><option>High</option><option>Urgent</option><option>Low</option></select></label>
              <label className="public-application-field"><span>Purpose</span><input name="purpose" required /></label>
            </div>
            <label className="public-application-field"><span>Justification</span><textarea name="message" required rows="4" /></label>
            <button className="button button--solid-site" type="submit">Submit to Central Government</button>
          </form>
        </section>

        <section className="state-section">
          <p className="eyebrow">Citizen List</p>
          <h2>{districtName} Citizens</h2>
          <div className="government-user-list">
            {citizenRows.map(({ citizen, wallet, alerts, requests }) => (
              <article className="panel government-user-card" key={citizen.id}>
                <div className="panel__header">
                  <div><p className="eyebrow">{citizen.discordUsername || citizen.discordId || citizen.userId || "No Discord linked"}</p><h2>{citizen.name}</h2></div>
                  <span className="court-role-badge">{citizen.verificationStatus}</span>
                </div>
                <div className="metric-grid">
                  <span><strong>{wallet ? formatCredits(wallet.balance) : "No wallet"}</strong> Wallet balance</span>
                  <span><strong>{wallet?.taxStatus || "Unrecorded"}</strong> Tax status</span>
                  <span><strong>{alerts.length}</strong> Alert count</span>
                  <span><strong>{requests.length}</strong> Request count</span>
                  <span><strong>{citizen.unionSecurityId || "Not issued"}</strong> Union ID status</span>
                  <span><strong>{citizen.discordId || "Unlinked"}</strong> Discord ID</span>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="state-section">
          <p className="eyebrow">District Records</p>
          <h2>Alerts and Requests</h2>
          <div className="panem-ledger-layout">
            <article className="panel"><h3>District Alerts</h3><ul className="government-mini-list">{districtAlerts.slice(0, 12).map((alert) => <li key={alert.id}><span>{alert.type} / {alert.issuingAuthority}</span><strong>{alert.status || "open"}</strong></li>)}</ul></article>
            <article className="panel"><h3>District Requests</h3><ul className="government-mini-list">{districtRequests.slice(0, 12).map((request) => <li key={request.id}><span>{request.category} / {request.citizenName}</span><strong>{request.status}</strong></li>)}</ul></article>
            <article className="panel"><h3>Spending History</h3><ul className="government-mini-list">{(districtFund?.spendingHistory || []).slice(0, 12).map((entry) => <li key={entry.id || entry.createdAt}><span>{entry.reason || entry.type}</span><strong>{formatCredits(entry.amount || 0)}</strong></li>)}{districtFund?.spendingHistory?.length ? null : <li><span>Central approval required before spending.</span><strong>View only</strong></li>}</ul></article>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
