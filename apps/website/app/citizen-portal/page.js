import Link from "next/link";
import { formatCredits, taxLabel, titleForBalance } from "@wilford/shared";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import {
  findCitizenBySelector,
  getCitizenState,
  hydrateCitizenProfile,
  requestCategories,
  requestPriorities
} from "../../lib/citizen-state";

export const metadata = {
  title: "Citizen Portal"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function sum(records, predicate) {
  return records.filter(predicate).reduce((total, record) => total + Number(record.amount || 0), 0);
}

export default async function CitizenPortalPage({ searchParams }) {
  const params = await searchParams;
  const state = await getCitizenState();
  const record = findCitizenBySelector(state, params?.citizen);
  const profile = await hydrateCitizenProfile(record);
  const wallet = profile.wallet;
  const activeRequests = profile.requests.filter((request) => !["Completed", "Rejected"].includes(request.status));
  const paidTax = sum(profile.taxes, (tax) => tax.status === "paid");
  const outstandingTax = sum(profile.taxes, (tax) => tax.status !== "paid");
  const notices = [
    wallet?.taxStatus && wallet.taxStatus !== "compliant" ? `Tax status requires attention: ${wallet.taxStatus}.` : "",
    record.securityClassification !== "Clear" ? `Security classification: ${record.securityClassification}.` : "",
    activeRequests.length ? `${activeRequests.length} active citizen request${activeRequests.length === 1 ? "" : "s"} in review.` : "",
    record.verificationStatus !== "Verified" ? `Identity verification status: ${record.verificationStatus}.` : ""
  ].filter(Boolean);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Citizen Services"
        title="Citizen Portal"
        description="Identity, Panem Credit, tax status, district affiliation, petitions, support requests, and official notices."
      />

      <main className="content content--wide portal-page portal-page--citizen citizen-dashboard-page">
        {params?.saved ? (
          <section className="application-notice">
            <strong>Request Submitted</strong>
            <p>Your request has entered the government review queue.</p>
          </section>
        ) : null}

        <section className="portal-intro scroll-fade">
          <div>
            <p className="eyebrow">Public Civic Access</p>
            <h2>{record.name}</h2>
            <p>
              Citizen services are linked to Union Security ID, district assignment,
              Panem Credit wallet, requests, taxes, and official notices.
            </p>
            <form action="/citizen-portal" className="panem-inline-form" method="get">
              <label className="public-application-field">
                <span>Citizen record</span>
                <select defaultValue={record.id} name="citizen">
                  {state.citizenRecords.map((citizen) => (
                    <option key={citizen.id} value={citizen.id}>{citizen.name} / {citizen.district}</option>
                  ))}
                </select>
              </label>
              <button className="button" type="submit">View</button>
            </form>
          </div>
          <div className="portal-status identity-status-panel">
            <span>Union Security ID</span>
            <strong>{record.unionSecurityId}</strong>
            <p>{record.verificationStatus} / {record.securityClassification}</p>
          </div>
        </section>

        <section className="citizen-overview-grid scroll-fade">
          <article className="identity-card identity-card--passport">
            <div className="identity-card__header">
              <span>WPU</span>
              <strong>Citizen Passport</strong>
            </div>
            <h2>{record.name}</h2>
            <dl className="panem-ledger">
              <div><dt>Security ID</dt><dd>{record.unionSecurityId}</dd></div>
              <div><dt>Verification Code</dt><dd>{record.verificationCode}</dd></div>
              <div><dt>District</dt><dd>{record.district}</dd></div>
              <div><dt>Status</dt><dd>{record.citizenStatus}</dd></div>
              <div><dt>Issued</dt><dd>{record.issueDate}</dd></div>
              <div><dt>Expiry</dt><dd>{record.expiryDate || "Open-ended"}</dd></div>
            </dl>
            <Link className="button button--solid-site" href={`/verify-citizen?code=${encodeURIComponent(record.verificationCode)}`}>
              Verify Identity
            </Link>
          </article>

          <article className="finance-panel">
            <p className="eyebrow">Panem Credit Wallet</p>
            <h2>{wallet ? formatCredits(wallet.balance) : "No wallet linked"}</h2>
            <div className="metric-grid">
              <span><strong>{wallet?.displayName || "Unlinked"}</strong> Wallet</span>
              <span><strong>{wallet?.status || "Unavailable"}</strong> Wallet status</span>
              <span><strong>{wallet ? titleForBalance(wallet.balance) : "Unranked"}</strong> Credit rank</span>
              <span><strong>{wallet?.district || record.district}</strong> District affiliation</span>
            </div>
            {wallet ? <Link className="button" href={`/panem-credit?wallet=${encodeURIComponent(wallet.id)}`}>Open Wallet</Link> : null}
          </article>

          <article className="finance-panel">
            <p className="eyebrow">Tax Status</p>
            <h2>{wallet?.taxStatus || "Unrecorded"}</h2>
            <dl className="panem-ledger">
              <div><dt>Paid</dt><dd>{formatCredits(paidTax)}</dd></div>
              <div><dt>Outstanding</dt><dd>{formatCredits(outstandingTax)}</dd></div>
              {profile.taxes.slice(0, 3).map((tax) => (
                <div key={tax.id}><dt>{taxLabel(tax.taxType)}</dt><dd>{formatCredits(tax.amount)} / {tax.status}</dd></div>
              ))}
            </dl>
          </article>

          <article className="finance-panel">
            <p className="eyebrow">Official Notices</p>
            <h2>{notices.length ? "Attention Required" : "No Active Notices"}</h2>
            <ul className="government-mini-list">
              {(notices.length ? notices : ["Citizen record is current."]).map((notice) => (
                <li key={notice}><span>{notice}</span><strong>Official</strong></li>
              ))}
            </ul>
          </article>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Citizen Services</p>
          <h2>Submit Government Request</h2>
          <form action="/citizen-portal/action" className="panel public-application-form citizen-request-form" method="post">
            <input name="citizenId" type="hidden" value={record.id} />
            <input name="citizenName" type="hidden" value={record.name} />
            <input name="district" type="hidden" value={record.district} />
            <div className="public-application-grid public-application-grid--three">
              <label className="public-application-field">
                <span>Category</span>
                <select name="category">{requestCategories.map((category) => <option key={category} value={category}>{category}</option>)}</select>
              </label>
              <label className="public-application-field">
                <span>Priority</span>
                <select defaultValue="Normal" name="priority">{requestPriorities.map((priority) => <option key={priority} value={priority}>{priority}</option>)}</select>
              </label>
              <label className="public-application-field">
                <span>Attachments optional</span>
                <input name="attachments" placeholder="Links or reference numbers" />
              </label>
            </div>
            <label className="public-application-field">
              <span>Message</span>
              <textarea name="message" required rows="5" />
            </label>
            <button className="button button--solid-site" type="submit">Submit Request</button>
          </form>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Request History</p>
          <h2>Citizen Case Files</h2>
          <div className="government-user-list">
            {profile.requests.length ? profile.requests.map((request) => (
              <article className="panel government-user-card" key={request.id}>
                <div className="panel__header">
                  <div>
                    <p className="eyebrow">{request.id}</p>
                    <h3>{request.category}</h3>
                  </div>
                  <span className="court-role-badge">{request.status}</span>
                </div>
                <p>{request.message}</p>
                <div className="metric-grid">
                  <span><strong>{request.priority}</strong> Priority</span>
                  <span><strong>{request.assignedMinistry}</strong> Assigned ministry</span>
                  <span><strong>{request.createdAt.slice(0, 10)}</strong> Created</span>
                  <span><strong>{request.updatedAt.slice(0, 10)}</strong> Updated</span>
                </div>
                {request.citizenResponse ? <p><strong>Government response:</strong> {request.citizenResponse}</p> : null}
              </article>
            )) : (
              <article className="panel">
                <h3>No requests recorded</h3>
                <p>Submitted requests will appear here after intake.</p>
              </article>
            )}
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
