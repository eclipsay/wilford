import Link from "next/link";
import { formatCredits, taxLabel, titleForBalance } from "@wilford/shared";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import {
  getCurrentCitizen,
  hydrateCitizenProfile,
  requestCategories,
  requestPriorities
} from "../../lib/citizen-state";
import { getEconomyStore } from "../../lib/panem-credit";

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
  const record = await getCurrentCitizen();

  if (!record) {
    return (
      <SiteLayout>
        <PageHero
          eyebrow="Citizen Services"
          title="Citizen Portal"
          description="Secure access to identity, Panem Credit, tax status, district affiliation, requests, and official notices."
        />

        <main className="content content--wide portal-page portal-page--citizen citizen-dashboard-page">
          {params?.error ? (
            <section className="application-notice application-notice--error">
              <strong>Access Denied</strong>
              <p>
                {params.error === "session"
                  ? "Your citizen session has expired. Please identify yourself again."
                  : "The name and Union Security ID could not be verified."}
              </p>
            </section>
          ) : null}

          {params?.loggedOut ? (
            <section className="application-notice">
              <strong>Signed Out</strong>
              <p>Your citizen portal session has ended.</p>
            </section>
          ) : null}

          <section className="portal-intro scroll-fade">
            <div>
              <p className="eyebrow">Secure Civic Access</p>
              <h2>Identify before service.</h2>
              <p>
                Enter your legal citizen name and Union Security ID. The portal
                will only open the matching citizen record and will record civic
                activity against that identity for future marketplace and Panem
                Credit services.
              </p>
            </div>
            <form action="/citizen-portal/action" className="portal-status public-application-form citizen-login-form" method="post">
              <input name="intent" type="hidden" value="login" />
              <label className="public-application-field">
                <span>Citizen name</span>
                <input autoComplete="name" name="citizenName" required />
              </label>
              <label className="public-application-field">
                <span>Union Security ID</span>
                <input autoComplete="off" name="unionSecurityId" placeholder="WPU-CR-2026-ABCD" required />
              </label>
              <button className="button button--solid-site" type="submit">Enter Citizen Portal</button>
            </form>
          </section>
        </main>
      </SiteLayout>
    );
  }

  const profile = await hydrateCitizenProfile(record);
  const economy = await getEconomyStore();
  const wallet = profile.wallet;
  const activeRequests = profile.requests.filter((request) => !["Completed", "Rejected"].includes(request.status));
  const paidTax = sum(profile.taxes, (tax) => tax.status === "paid");
  const outstandingTax = sum(profile.taxes, (tax) => tax.status !== "paid");
  const inventoryValue = (wallet?.holdings || []).reduce((total, holding) => {
    const item = economy.inventoryItems.find((entry) => entry.id === holding.itemId) || economy.marketItems.find((entry) => entry.id === holding.itemId);
    return total + Number(holding.quantity || 0) * Number(item?.baseValue || item?.currentPrice || holding.averageCost || 0);
  }, 0);
  const stockValue = (wallet?.stockPortfolio || []).reduce((total, position) => {
    const company = economy.stockCompanies.find((entry) => entry.ticker === position.ticker);
    return total + Number(position.shares || 0) * Number(company?.sharePrice || 0);
  }, 0);
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
            <form action="/citizen-portal/action" method="post">
              <input name="intent" type="hidden" value="logout" />
              <button className="button" type="submit">Sign Out</button>
            </form>
          </div>
          <div className="portal-status identity-status-panel">
            <span>Union Security ID</span>
            <strong>{record.unionSecurityId}</strong>
            <p>{record.verificationStatus} / {record.securityClassification}</p>
          </div>
        </section>

        <section className="citizen-quick-grid scroll-fade" aria-label="Citizen quick dashboard">
          {[
            ["💳", "Wallet", wallet ? formatCredits(wallet.balance) : "No wallet", "/panem-credit", "Open Wallet"],
            ["🏪", "Marketplace", "Trade goods", "/marketplace", "Browse Market"],
            ["🎒", "Inventory", inventoryValue ? formatCredits(inventoryValue) : "Empty", "/inventory", "View Items"],
            ["📈", "Stock Market", stockValue ? formatCredits(stockValue) : "No shares", "/stock-market", "Open PSE"],
            ["🏛", "Requests", `${activeRequests.length} active`, "#citizen-request-form", "Submit Request"],
            ["🛂", "Union ID", record.unionSecurityId, `/verify-citizen?code=${encodeURIComponent(record.verificationCode)}`, "Verify"],
            ["📜", "Taxes", wallet?.taxStatus || "Unrecorded", "/panem-credit", "Review Taxes"]
          ].map(([icon, title, value, href, action]) => (
            <Link className="citizen-quick-card" href={href} key={title}>
              <span aria-hidden="true">{icon}</span>
              <strong>{title}</strong>
              <small>{value}</small>
              <em>{action}</em>
            </Link>
          ))}
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">What can I do?</p>
          <h2>Start here</h2>
          <div className="portal-grid">
            {[
              ["Earn credits", "Claim your daily payment, work shifts, or complete district labour in Panem Credit."],
              ["Buy goods", "Use Marketplace to buy district goods. District Production affects marketplace prices."],
              ["Sell inventory", wallet?.holdings?.length ? "List held goods or sell items directly to the state." : "Your inventory is empty. Try fishing, mining, or farming to collect goods."],
              ["Invest in stocks", wallet?.stockPortfolio?.length ? "Track your PSE portfolio and dividends." : "You do not own shares yet. Visit the Panem Stock Exchange."],
              ["Submit requests", "Ask the government for support, records, transfers, or official review."],
              ["Check Union ID", "Verify your identity, district, and security classification from the portal."]
            ].map(([title, text]) => (
              <article className="panel citizen-helper-card" key={title}>
                <h3>{title}</h3>
                <p>{text}</p>
              </article>
            ))}
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

        <section className="state-section scroll-fade" id="citizen-request-form">
          <p className="eyebrow">Citizen Services</p>
          <h2>Submit Government Request</h2>
          <form action="/citizen-portal/action" className="panel public-application-form citizen-request-form" method="post">
            <input name="intent" type="hidden" value="request" />
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
