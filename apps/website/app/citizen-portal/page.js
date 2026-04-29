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
import { getEconomyStore, getSecurityDashboard } from "../../lib/panem-credit";

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
                  : params.error === "password"
                    ? "The password change failed. Check the temporary password and use at least 8 characters."
                    : "The username, Discord ID, citizen handle, or password could not be verified."}
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
                Enter your citizen username, Discord ID, or citizen handle and password.
                Union ID and private verification codes are used for identity checks, not daily login.
              </p>
            </div>
            <form action="/citizen-portal/action" className="portal-status public-application-form citizen-login-form" method="post">
              <input name="intent" type="hidden" value="login" />
              <label className="public-application-field">
                <span>Username / Discord ID / Citizen handle</span>
                <input autoComplete="username" name="citizenIdentifier" required />
              </label>
              <label className="public-application-field">
                <span>Portal password</span>
                <input autoComplete="current-password" name="portalPassword" required type="password" />
                <small className="public-application-help">New citizens should use the temporary password sent by Discord DM.</small>
              </label>
              <button className="button button--solid-site" type="submit">Enter Citizen Portal</button>
            </form>
          </section>
        </main>
      </SiteLayout>
    );
  }

  let profile;
  let economy;
  let alertLoadFailed = false;
  try {
    profile = await hydrateCitizenProfile(record);
    economy = await getEconomyStore();
  } catch {
    alertLoadFailed = true;
    profile = { record, wallet: null, requests: [], alerts: [], taxes: [], district: null };
    economy = { raidLogs: [], inventoryItems: [], marketItems: [], stockCompanies: [] };
  }
  const wallet = profile.wallet;
  const security = getSecurityDashboard(economy, wallet);
  const recentRaids = wallet ? economy.raidLogs.filter((raid) => raid.walletId === wallet.id).slice(0, 5) : [];
  const alerts = profile.alerts || [];
  const unreadAlerts = alerts.filter((alert) => !alert.readByCitizen);
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
            <strong>{params.saved === "password" ? "Password Changed" : "Request Submitted"}</strong>
            <p>{params.saved === "password" ? "Your Citizen Portal password has been updated." : "Your request has entered the government review queue."}</p>
          </section>
        ) : null}

        {record.forcePasswordChange ? (
          <section className="application-notice application-notice--error">
            <strong>Temporary Password Active</strong>
            <p>Change your Citizen Portal password before continuing regular civic services.</p>
            <form action="/citizen-portal/action" className="public-application-form" method="post">
              <input name="intent" type="hidden" value="change_password" />
              <label className="public-application-field">
                <span>Current temporary password</span>
                <input autoComplete="current-password" name="currentPassword" required type="password" />
              </label>
              <label className="public-application-field">
                <span>New password</span>
                <input autoComplete="new-password" minLength={8} name="newPassword" required type="password" />
              </label>
              <button className="button button--solid-site" type="submit">Change Password</button>
            </form>
          </section>
        ) : null}

        <section className="portal-intro scroll-fade">
          <div>
            <p className="eyebrow">Public Civic Access</p>
            <h2>{record.name}</h2>
            <p>
              Citizen services are linked to your public handle, district assignment,
              Panem Credit wallet, requests, taxes, and official notices.
            </p>
            <form action="/citizen-portal/action" method="post">
              <input name="intent" type="hidden" value="logout" />
              <button className="button" type="submit">Sign Out</button>
            </form>
          </div>
          <div className="portal-status identity-status-panel">
            <span>Public handle</span>
            <strong>@{record.citizenHandle || record.portalUsername || record.userId}</strong>
            <p>{record.verificationStatus} / {record.securityClassification}</p>
          </div>
        </section>

        <section className="citizen-hub-grid scroll-fade" aria-label="Citizen dashboard">
          {[
            ["PC", "Wallet", "Send money, claim daily pay, and review your Panem Credit balance.", "/panem-credit", "Open Wallet", [["Send Money", "/panem-credit"], ["Transactions", "/panem-credit#ledger"]]],
            ["WK", "Work", "Earn credits through your district job, overtime, and local production.", "/panem-credit#jobs-work", "Work Now", [["Choose Job", "/panem-credit#jobs-work"], ["Crafting", "/crafting"]]],
            ["IN", "Inventory", "View resources, rare items, crates, and goods you can sell or craft.", "/inventory", "View Inventory", [["Craft", "/crafting"], ["Sell Items", "/inventory"]]],
            ["MK", "Marketplace", "Buy official goods, list items, and watch district prices.", "/marketplace", "Open Market", [["Listings", "/marketplace"], ["Black Market", "/black-market"]]],
            ["ST", "Stocks", "Check your PSE portfolio, buy shares, and follow market news.", "/stock-market", "Check Stocks", [["Portfolio", "/stock-market"], ["Market News", "/stock-market"]]],
            ["RA", "Requests & Alerts", "Read official notices and submit help, appeal, or support requests.", "#citizen-alert-center", "View Alerts", [["Submit Request", "#citizen-request-form"], ["Court", "/supreme-court"]]]
          ].map(([icon, title, text, href, action, links]) => (
            <article className="citizen-hub-card" key={title}>
              <span aria-hidden="true">{icon}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <Link className="button button--solid-site" href={href}>{action}</Link>
              <div className="citizen-hub-card__links">
                {links.map(([label, link]) => <Link href={link} key={label}>{label}</Link>)}
              </div>
            </article>
          ))}
        </section>

        <section className="application-notice citizen-next-step">
          <strong>What should I do next?</strong>
          <p>Start with Work to earn credits, open Inventory to see what you own, then use Marketplace when you are ready to buy or sell.</p>
        </section>

        <section className="citizen-quick-grid scroll-fade" aria-label="Citizen quick dashboard">
          {[
            ["💳", "Wallet", wallet ? formatCredits(wallet.balance) : "No wallet", "/panem-credit", "Open Wallet"],
            ["🏪", "Marketplace", "Trade goods", "/marketplace", "Browse Market"],
            ["🎒", "Inventory", inventoryValue ? formatCredits(inventoryValue) : "Empty", "/inventory", "View Items"],
            ["📈", "Stock Market", stockValue ? formatCredits(stockValue) : "No shares", "/stock-market", "Open PSE"],
            ["🏛", "Requests", `${activeRequests.length} active`, "#citizen-request-form", "Submit Request"],
            ["ID", "Union ID", `@${record.citizenHandle || record.portalUsername || record.userId}`, `/verify-citizen?code=${encodeURIComponent(record.verificationCode)}`, "Verify"],
            ["📜", "Taxes", wallet?.taxStatus || "Unrecorded", "/panem-credit", "Review Taxes"]
            ,["AL", "Alerts", `${unreadAlerts.length} unread`, "#citizen-alert-center", "View Alerts"]
          ].map(([icon, title, value, href, action]) => (
            <Link className="citizen-quick-card" href={href} key={title}>
              <span aria-hidden="true">{icon}</span>
              <strong>{title}</strong>
              <small>{value}</small>
              <em>{action}</em>
            </Link>
          ))}
        </section>

        <section className="citizen-quick-grid scroll-fade" aria-label="System dashboard">
          {[
            ["DB", "Dashboard", record.district, "/citizen-portal", "Overview"],
            ["JW", "Jobs & Work", wallet?.selectedJobId || "Choose job", "/panem-credit#jobs-work", "Work"],
            ["CR", "Crafting", `Level ${wallet?.craftingLevel || 1}`, "/crafting", "Craft Goods"],
            ["BM", "Black Market", security.current?.status || "Unknown", "/black-market", "Underground"],
            ["AL", "Alerts", `${unreadAlerts.length} unread`, "#citizen-alert-center", "View Alerts"]
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
          <p className="eyebrow">Quick Actions</p>
          <h2>Most Used Services</h2>
          <div className="market-card-actions">
            <Link className="button button--solid-site" href="/panem-credit#jobs-work">Work</Link>
            <Link className="button" href="/inventory">View Inventory</Link>
            <Link className="button" href="/marketplace">Open Market</Link>
            <Link className="button" href="/stock-market">Check Stocks</Link>
            <Link className="button button--solid-site" href="/panem-credit">Send Money</Link>
          </div>
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
              <div><dt>Public handle</dt><dd>@{record.citizenHandle || record.portalUsername || record.userId}</dd></div>
              <div><dt>Union Security ID</dt><dd>{record.unionSecurityId}</dd></div>
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

        <section className="state-section scroll-fade citizen-security-center">
          <p className="eyebrow">MSS Security Status</p>
          <h2>{security.current?.status || "Clear"} / Suspicion {security.current?.score || 0}</h2>
          <div className="metric-grid">
            <span><strong>{wallet?.securityStatus || security.current?.status || "Clear"}</strong> Security status</span>
            <span><strong>{wallet?.suspicionLevel || security.current?.score || 0}</strong> Suspicion level</span>
            <span><strong>{recentRaids.length}</strong> Recent raids</span>
            <span><strong>{security.current?.reasons?.join(", ") || "normal activity"}</strong> Risk drivers</span>
          </div>
          <p>
            Holding rare or restricted items raises raid risk. Selling goods converts them to safer Panem Credits,
            but marketplace sales carry heavier taxation than state inventory sale.
          </p>
          <div className="government-user-list">
            {recentRaids.length ? recentRaids.map((raid) => (
              <article className="panel citizen-alert-card" key={raid.id}>
                <div className="panel__header">
                  <div>
                    <p className="eyebrow">{raid.raidType}</p>
                    <h3>{raid.reason}</h3>
                  </div>
                  <span className="court-role-badge">{raid.securityStatus}</span>
                </div>
                <dl className="panem-ledger">
                  <div><dt>Items seized</dt><dd>{raid.seizedItems.map((item) => `${item.quantity} x ${item.name}`).join(", ") || "None"}</dd></div>
                  <div><dt>Value seized</dt><dd>{formatCredits(raid.seizedValue || 0)}</dd></div>
                  <div><dt>Fine</dt><dd>{formatCredits(raid.fineAmount || 0)}</dd></div>
                  <div><dt>Date</dt><dd>{raid.createdAt}</dd></div>
                </dl>
              </article>
            )) : (
              <article className="panel">
                <h3>No raids recorded</h3>
                <p>MSS raid reports will appear here if your inventory is inspected.</p>
              </article>
            )}
          </div>
        </section>

        <section className="state-section scroll-fade citizen-alert-center" id="citizen-alert-center">
          <p className="eyebrow">Citizen Alert Center</p>
          <h2>{unreadAlerts.length ? `${unreadAlerts.length} Unread Alert${unreadAlerts.length === 1 ? "" : "s"}` : "Alert History"}</h2>
          {alertLoadFailed ? (
            <section className="application-notice application-notice--error">
              <strong>Alert records could not be loaded.</strong>
              <p>Try again shortly or contact Citizen Services if the issue continues.</p>
            </section>
          ) : null}
          {unreadAlerts.length ? (
            <form action="/citizen-portal/action" method="post">
              <input name="intent" type="hidden" value="mark_all_alerts_read" />
              <button className="button" type="submit">Mark All Read</button>
            </form>
          ) : null}
          <div className="government-user-list">
            {alerts.length ? alerts.map((alert) => (
              <article
                className={`panel citizen-alert-card citizen-alert-card--${alert.readByCitizen ? "read" : "unread"}${params?.alert === alert.id ? " citizen-alert-card--selected" : ""}`}
                id={`citizen-alert-${alert.id}`}
                key={alert.id}
              >
                <div className="panel__header">
                  <div>
                    <p className="eyebrow">{alert.type}</p>
                    <h3>{alert.title || alert.issuingAuthority}</h3>
                  </div>
                  <span className="court-role-badge">{alert.readByCitizen ? "History" : "Unread"}</span>
                </div>
                <p>{alert.message}</p>
                <dl className="panem-ledger">
                  <div><dt>Status</dt><dd>{alert.status || "open"}</dd></div>
                  <div><dt>Severity</dt><dd>{alert.severity || "standard"}</dd></div>
                  <div><dt>Date / time</dt><dd>{alert.createdAt}</dd></div>
                  <div><dt>Action taken</dt><dd>{alert.actionTaken}</dd></div>
                  <div><dt>Amount</dt><dd>{alert.amount ? formatCredits(alert.amount) : "None"}</dd></div>
                  <div><dt>Linked record</dt><dd>{alert.transactionId || alert.linkedRecordId || alert.caseId || "None"}</dd></div>
                </dl>
                {alert.appealEnabled || !alert.readByCitizen ? (
                  <div className="citizen-alert-card__actions">
                    {!alert.readByCitizen ? (
                      <form action="/citizen-portal/action" method="post">
                        <input name="intent" type="hidden" value="mark_alert_read" />
                        <input name="alertId" type="hidden" value={alert.id} />
                        <button className="button" type="submit">Mark Read</button>
                      </form>
                    ) : null}
                    {alert.appealEnabled ? (
                      <>
                    <Link className="button" href="#citizen-request-form">Submit Appeal</Link>
                    <Link className="button" href="/supreme-court">Court Petition</Link>
                      </>
                    ) : null}
                  </div>
                ) : null}
              </article>
            )) : (
              <article className="panel">
                <h3>No citizen alerts recorded</h3>
                <p>Official notices and enforcement actions will appear here.</p>
              </article>
            )}
          </div>
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
