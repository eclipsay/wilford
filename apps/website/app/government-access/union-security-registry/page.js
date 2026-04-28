import Link from "next/link";
import { formatCredits, taxLabel } from "@wilford/shared";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { canAccess, requireGovernmentUser } from "../../../lib/government-auth";
import {
  citizenStatuses,
  findCitizenBySelector,
  getCitizenState,
  identityStatuses,
  securityClassifications
} from "../../../lib/citizen-state";
import { getEconomyStore, getWallet } from "../../../lib/panem-credit";

export const metadata = {
  title: "Union Security Registry | Government Access"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function UnionSecurityRegistryPage({ searchParams }) {
  const params = await searchParams;
  const user = await requireGovernmentUser("identitySecurity");
  const [state, economy] = await Promise.all([getCitizenState(), getEconomyStore()]);
  const selected = findCitizenBySelector(state, params?.citizen);
  const wallet = getWallet(economy, selected.walletId || selected.userId || selected.discordId);
  const requests = state.citizenRequests.filter((request) => request.citizenId === selected.id);
  const activity = (state.citizenActivity || []).filter((entry) => entry.citizenId === selected.id).slice(0, 10);
  const taxes = wallet ? economy.taxRecords.filter((tax) => tax.walletId === wallet.id).slice(0, 8) : [];
  const transactions = wallet ? economy.transactions.filter((transaction) => transaction.fromWalletId === wallet.id || transaction.toWalletId === wallet.id).slice(0, 8) : [];
  const identityAccess = canAccess(user, "identityRegistry");

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Ministry of Credit & Records"
        title="Union Security Registry"
        description="Restricted identity, citizenship, passport, district, wallet, and MSS classification registry."
      />

      <main className="content content--wide portal-page government-command-page identity-registry-page">
        <Link className="button" href="/government-access">Back to Dashboard</Link>
        {params?.saved ? <section className="application-notice"><strong>Registry Updated</strong><p>The identity record has been saved.</p></section> : null}

        <section className="government-dashboard-grid">
          <article className="government-status-panel"><p className="eyebrow">Citizen IDs</p><h2>{state.citizenRecords.length}</h2><p>Registry identities.</p></article>
          <article className="government-status-panel"><p className="eyebrow">Watchlisted</p><h2>{state.citizenRecords.filter((item) => item.securityClassification === "Watchlisted").length}</h2><p>MSS monitoring.</p></article>
          <article className="government-status-panel"><p className="eyebrow">Restricted</p><h2>{state.citizenRecords.filter((item) => item.securityClassification === "Restricted").length}</h2><p>Limited privileges.</p></article>
          <article className="government-status-panel"><p className="eyebrow">Revoked</p><h2>{state.citizenRecords.filter((item) => item.verificationStatus === "Revoked").length}</h2><p>Invalid credentials.</p></article>
        </section>

        <section className="panel public-application-form">
          <p className="eyebrow">Citizen Lookup</p>
          <h2>Registry Record</h2>
          <form action="/government-access/union-security-registry" className="panem-inline-form" method="get">
            <label className="public-application-field">
              <span>Citizen</span>
              <select defaultValue={selected.id} name="citizen">
                {state.citizenRecords.map((record) => (
                  <option key={record.id} value={record.id}>{record.name} / {record.unionSecurityId}</option>
                ))}
              </select>
            </label>
            <button className="button" type="submit">Open</button>
          </form>
        </section>

        {identityAccess ? (
          <section className="panel government-user-panel">
            <p className="eyebrow">Create Citizen ID</p>
            <h2>Issue Union Security ID</h2>
            <form action="/government-access/union-security-registry/action" className="public-application-form" method="post">
              <input name="intent" type="hidden" value="create" />
              <div className="public-application-grid public-application-grid--three">
                <label className="public-application-field"><span>Name</span><input name="name" required /></label>
                <label className="public-application-field"><span>User ID</span><input name="userId" /></label>
                <label className="public-application-field"><span>Discord username</span><input name="discordUsername" /></label>
                <label className="public-application-field"><span>Discord ID</span><input name="discordId" /></label>
                <label className="public-application-field"><span>District</span><select name="district">{economy.districts.map((district) => <option key={district.id} value={district.name}>{district.name}</option>)}</select></label>
                <label className="public-application-field"><span>Wallet link</span><select name="walletId"><option value="">None</option>{economy.wallets.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>
              </div>
              <button className="button button--solid-site" type="submit">Create Citizen ID</button>
            </form>
          </section>
        ) : null}

        <section className="citizen-overview-grid">
          <article className="identity-card identity-card--classified">
            <div className="identity-card__header"><span>MSS</span><strong>{selected.securityClassification}</strong></div>
            <h2>{selected.name}</h2>
            <dl className="panem-ledger">
              <div><dt>Union Security ID</dt><dd>{selected.unionSecurityId}</dd></div>
              <div><dt>Verification code</dt><dd>{selected.verificationCode}</dd></div>
              <div><dt>District</dt><dd>{selected.district}</dd></div>
              <div><dt>Citizen status</dt><dd>{selected.citizenStatus}</dd></div>
              <div><dt>Wallet</dt><dd>{wallet ? `${wallet.displayName} / ${formatCredits(wallet.balance)}` : "Unlinked"}</dd></div>
              <div><dt>Tax status</dt><dd>{wallet?.taxStatus || "Unrecorded"}</dd></div>
            </dl>
          </article>

          <article className="panel public-application-form">
            <p className="eyebrow">Registry Edit</p>
            <h2>Identity Controls</h2>
            <form action="/government-access/union-security-registry/action" className="public-application-form" method="post">
              <input name="citizenId" type="hidden" value={selected.id} />
              <div className="public-application-grid public-application-grid--three">
                <label className="public-application-field"><span>Name</span><input defaultValue={selected.name} disabled={!identityAccess} name="name" /></label>
                <label className="public-application-field"><span>Discord ID</span><input defaultValue={selected.discordId} disabled={!identityAccess} name="discordId" /></label>
                <label className="public-application-field"><span>Wallet link</span><select defaultValue={selected.walletId} disabled={!identityAccess} name="walletId"><option value="">None</option>{economy.wallets.map((item) => <option key={item.id} value={item.id}>{item.displayName}</option>)}</select></label>
                <label className="public-application-field"><span>District</span><select defaultValue={selected.district} disabled={!identityAccess} name="district">{economy.districts.map((district) => <option key={district.id} value={district.name}>{district.name}</option>)}</select></label>
                <label className="public-application-field"><span>Citizen status</span><select defaultValue={selected.citizenStatus} disabled={!identityAccess} name="citizenStatus">{citizenStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <label className="public-application-field"><span>Verification</span><select defaultValue={selected.verificationStatus} disabled={!identityAccess} name="verificationStatus">{identityStatuses.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <label className="public-application-field"><span>MSS status</span><select defaultValue={selected.securityClassification} name="securityClassification">{securityClassifications.map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
                <label className="public-application-field"><span>Expiry optional</span><input defaultValue={selected.expiryDate} disabled={!identityAccess} name="expiryDate" /></label>
              </div>
              <label className="public-application-field"><span>Internal notes</span><textarea defaultValue={selected.internalNotes} name="internalNotes" rows="3" /></label>
              <div className="bulletin-editor-card__actions">
                <button className="button button--solid-site" name="intent" type="submit" value="save">Save Record</button>
                {identityAccess ? <button className="button" name="intent" type="submit" value="regenerate-code">Regenerate Code</button> : null}
                {identityAccess ? <button className="button" name="intent" type="submit" value="regenerate-id">Regenerate ID</button> : null}
                {identityAccess ? <button className="button" name="intent" type="submit" value="lost">Mark Lost/Stolen</button> : null}
                {identityAccess ? <button className="button button--danger-site" name="intent" type="submit" value="revoke">Revoke</button> : null}
                <button className="button button--danger-site" name="intent" type="submit" value="suspend">Suspend / Restrict</button>
              </div>
            </form>
          </article>
        </section>

        <section className="state-section">
          <p className="eyebrow">Linked Activity</p>
          <h2>Requests, Tax, Economy</h2>
          <div className="panem-ledger-layout">
            <article className="panel"><h3>Request History</h3><ul className="government-mini-list">{requests.slice(0, 8).map((request) => <li key={request.id}><span>{request.category} / {request.status}</span><strong>{request.priority}</strong></li>)}</ul></article>
            <article className="panel"><h3>Tax Activity</h3><ul className="government-mini-list">{taxes.map((tax) => <li key={tax.id}><span>{taxLabel(tax.taxType)} / {tax.status}</span><strong>{formatCredits(tax.amount)}</strong></li>)}</ul></article>
            <article className="panel"><h3>Economy Activity</h3><ul className="government-mini-list">{transactions.map((transaction) => <li key={transaction.id}><span>{transaction.type} / {transaction.reason}</span><strong>{formatCredits(transaction.amount)}</strong></li>)}</ul></article>
            <article className="panel"><h3>Website Activity</h3><ul className="government-mini-list">{activity.map((entry) => <li key={entry.id}><span>{entry.action} / {entry.detail}</span><strong>{entry.createdAt.slice(0, 10)}</strong></li>)}</ul></article>
          </div>
        </section>

        {identityAccess ? (
          <section className="state-section">
            <p className="eyebrow">District Governors</p>
            <h2>District Profile Controls</h2>
            <div className="government-user-list">
              {state.districtProfiles.map((district) => (
                <form action="/government-access/union-security-registry/action" className="panel public-application-form" key={district.id} method="post">
                  <input name="intent" type="hidden" value="district" />
                  <input name="districtId" type="hidden" value={district.id} />
                  <h3>{district.name}</h3>
                  <div className="public-application-grid public-application-grid--three">
                    <label className="public-application-field"><span>Governor</span><input defaultValue={district.governorName} name="governorName" /></label>
                    <label className="public-application-field"><span>Title</span><input defaultValue={district.governorTitle} name="governorTitle" /></label>
                    <label className="public-application-field"><span>Portrait path</span><input defaultValue={district.governorPortrait} name="governorPortrait" /></label>
                    <label className="public-application-field"><span>Appointment date</span><input defaultValue={district.appointmentDate} name="appointmentDate" /></label>
                  </div>
                  <label className="public-application-field"><span>Biography</span><textarea defaultValue={district.governorBiography} name="governorBiography" rows="3" /></label>
                  <label className="public-application-field"><span>Lore description</span><textarea defaultValue={district.loreDescription} name="loreDescription" rows="3" /></label>
                  <label className="public-application-field"><span>Loyalty statement</span><input defaultValue={district.loyaltyStatement} name="loyaltyStatement" /></label>
                  <label className="public-application-field"><span>Key landmarks, one per line</span><textarea defaultValue={district.keyLandmarks.join("\n")} name="keyLandmarks" rows="3" /></label>
                  <label className="public-application-field"><span>Recent bulletins, one per line</span><textarea defaultValue={district.recentBulletins.join("\n")} name="recentBulletins" rows="3" /></label>
                  <button className="button button--solid-site" type="submit">Save District Profile</button>
                </form>
              ))}
            </div>
          </section>
        ) : null}
      </main>
    </SiteLayout>
  );
}
