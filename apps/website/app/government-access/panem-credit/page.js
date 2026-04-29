import Link from "next/link";
import { economyEventDefaults, formatCredits, taxLabel, taxTypes, titleForBalance } from "@wilford/shared";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { canAccess, requireGovernmentUser } from "../../../lib/government-auth";
import { getEconomyStore } from "../../../lib/panem-credit";
import { getCitizenState } from "../../../lib/citizen-state";

export const metadata = {
  title: "Panem Credit Control | Government Access"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function PanemCreditControlPage({ searchParams }) {
  const params = await searchParams;
  const user = await requireGovernmentUser("economyView");
  const [store, citizenState] = await Promise.all([getEconomyStore(), getCitizenState()]);
  const fullAccess = canAccess(user, "economyControl");
  const securityAccess = canAccess(user, "economySecurity");
  const totalCredits = store.wallets.reduce((sum, wallet) => sum + Number(wallet.balance || 0), 0);
  const treasuryWallet = store.wallets.find((wallet) => wallet.id === "treasury");
  const treasuryTransactions = store.transactions.filter((transaction) => transaction.fromWalletId === "treasury" || transaction.toWalletId === "treasury");
  const treasuryIncome = treasuryTransactions.filter((transaction) => transaction.toWalletId === "treasury").reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const treasurySpending = treasuryTransactions.filter((transaction) => transaction.fromWalletId === "treasury").reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);
  const treasuryTaxReceipts = store.taxRecords.filter((record) => record.paidIntoWalletId === "treasury" || record.paidInto === "WPU State Treasury" || record.status === "paid");
  const treasuryGrants = treasuryTransactions.filter((transaction) => ["grant", "grant_payment", "rebate"].includes(transaction.type));
  const autoTax = store.autoTax || { enabled: false, frequency: "daily", executionTime: "09:00", lastRunAt: "", nextRunAt: "" };
  const taxDistribution = store.taxDistribution || { stateShare: 80, districtShare: 20, lastUpdatedAt: "", updatedBy: "system" };
  const autoTaxEnabled = Boolean(autoTax.enabled);
  const formatDateTime = (value) => value ? new Date(value).toLocaleString("en-GB") : "Not recorded";
  const now = Date.now();
  const taxCollectedSince = (ms) => store.taxRecords
    .filter((record) => record.status === "paid" && Date.parse(record.createdAt || 0) >= now - ms)
    .reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const taxDescriptions = {
    income_tax: "Applied to eligible citizen wallet balances during automatic taxation.",
    trade_tax: "Applied to citizen payments and marketplace purchases.",
    inventory_tax: "Applied to inventory holdings and item-related civic assessments.",
    market_sale_tax: "Applied to citizen marketplace listing sales before seller payout.",
    stock_trade_tax: "Applied to Panem Stock Exchange buy and sell orders.",
    gambling_winnings_tax: "Applied to gambling winnings before payout.",
    emergency_state_levy: "Applied during emergency taxation directives.",
    district_levy: "District-level levy for local production and civic services.",
    luxury_goods_tax: "Applied to luxury goods and Capitol prestige commerce.",
    black_market_penalty_tax: "Penalty tax used for detected black market activity.",
    raid_recovery_fine_rate: "Recovery rate used for MSS raid fines and seizures."
  };
  const treasuryTaxNames = {
    income_tax: "Income Tax",
    trade_tax: "Marketplace Trade Tax",
    inventory_tax: "Inventory Tax",
    market_sale_tax: "Market Sale Tax",
    stock_trade_tax: "Stock Trade Tax",
    gambling_winnings_tax: "Gambling Winnings Tax",
    emergency_state_levy: "Emergency Taxation Rate",
    district_levy: "District Levy",
    luxury_goods_tax: "Luxury Goods Tax",
    black_market_penalty_tax: "Black Market Penalty Tax",
    raid_recovery_fine_rate: "Raid Recovery Fine Rate"
  };
  const treasuryTaxIds = [
    "income_tax",
    "trade_tax",
    "inventory_tax",
    "market_sale_tax",
    "stock_trade_tax",
    "gambling_winnings_tax",
    "emergency_state_levy",
    "district_levy",
    "luxury_goods_tax",
    "black_market_penalty_tax",
    "raid_recovery_fine_rate"
  ];
  const taxRows = treasuryTaxIds.map((id) => {
    const tax = taxTypes.find((entry) => entry.id === id) || { id, label: id.replaceAll("_", " ") };
    const settings = store.taxRateSettings?.[id] || {};
    return {
      ...tax,
      rate: Number(store.taxRates?.[id] || 0),
      label: treasuryTaxNames[id] || tax.label,
      enabled: settings.enabled !== false,
      lastUpdatedAt: settings.lastUpdatedAt || "",
      updatedBy: settings.updatedBy || "system",
      description: taxDescriptions[id] || "Treasury-controlled tax rate."
    };
  });
  const taxesPaid = store.taxRecords
    .filter((record) => record.status === "paid")
    .reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const grossDomesticProduct = store.districts.reduce((sum, district) => sum + Number(district.tradeVolume || 0), 0);
  const activeEvent = store.events.find((event) => event.status === "active") || store.events[0];
  const wantedWallets = store.wallets.filter((wallet) => wallet.wanted || wallet.underReview || Number(wallet.bounty || 0) > 0);
  const frozenAssets = store.wallets
    .filter((wallet) => wallet.status === "frozen")
    .reduce((sum, wallet) => sum + Number(wallet.balance || 0), 0);
  const selectedWalletId = String(params?.wallet || "").trim();
  const selectedWallet = store.wallets.find((wallet) => wallet.id === selectedWalletId) || null;
  const selectedCitizen = selectedWallet
    ? citizenState.citizenRecords.find((citizen) =>
      citizen.walletId === selectedWallet.id ||
      citizen.discordId === selectedWallet.discordId ||
      citizen.userId === selectedWallet.userId
    )
    : null;
  const selectedTransactions = selectedWallet
    ? store.transactions.filter((transaction) =>
      transaction.fromWalletId === selectedWallet.id ||
      transaction.toWalletId === selectedWallet.id
    )
    : [];
  const selectedTaxes = selectedWallet
    ? store.taxRecords.filter((tax) => tax.walletId === selectedWallet.id)
    : [];
  const walletLabel = (walletId) => {
    if (!walletId) return "Treasury";
    const wallet = store.wallets.find((entry) => entry.id === walletId);
    return wallet?.displayName || walletId;
  };

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Ministry of Credit & Records"
        title="Panem Credit Control"
        description="Restricted treasury console for wallets, taxes, marketplace stock, district production, and financial security."
      />

      <main className="content content--wide portal-page government-command-page panem-control-page">
        <Link className="button" href="/government-access">Back to Dashboard</Link>

        {params?.saved ? (
          <section className="application-notice">
            <strong>Economy Ledger Updated</strong>
            <p>The Panem Credit record has been saved.</p>
          </section>
        ) : null}
        {params?.error ? (
          <section className="application-notice application-notice--error">
            <strong>Update Rejected</strong>
            <p>{params.error === "tax-rate" ? "Confirm the tax change and enter a percentage from 0 to 100." : params.error === "tax-distribution" ? "Tax Distribution must total 100%." : "The requested treasury update could not be saved."}</p>
          </section>
        ) : null}

        <section className="government-dashboard-grid">
          <article className="government-status-panel">
            <p className="eyebrow">Wallet Supply</p>
            <h2>{formatCredits(totalCredits)}</h2>
            <p>{store.wallets.length} wallets registered.</p>
          </article>
          <article className="government-status-panel">
            <p className="eyebrow">Tax Reports</p>
            <h2>{formatCredits(taxesPaid)}</h2>
            <p>All collected taxes are deposited into the WPU State Treasury.</p>
          </article>
          <article className="government-status-panel">
            <p className="eyebrow">Gross Domestic Product</p>
            <h2>{formatCredits(grossDomesticProduct)}</h2>
            <p>Estimated district production and trade output.</p>
          </article>
          <article className="government-status-panel">
            <p className="eyebrow">MSS Alerts</p>
            <h2>{store.alerts.length}</h2>
            <p>Suspicious activity, unpaid penalties, and restricted-market warnings.</p>
          </article>
          <article className="government-status-panel">
            <p className="eyebrow">Wanted Financiers</p>
            <h2>{wantedWallets.length}</h2>
            <p>{formatCredits(frozenAssets)} in frozen assets.</p>
          </article>
        </section>

        <section className="panel government-user-panel">
          <p className="eyebrow">State Treasury</p>
          <h2>{treasuryWallet?.displayName || "WPU State Treasury"}: {formatCredits(treasuryWallet?.balance || 0)}</h2>
          <p>Collected taxes are split between the WPU State Treasury and citizen district funds.</p>
          <div className="metric-grid">
            <span><strong>{formatCredits(treasuryIncome)}</strong> Income history</span>
            <span><strong>{formatCredits(treasurySpending)}</strong> Spending history</span>
            <span><strong>{formatCredits(treasuryTaxReceipts.reduce((sum, tax) => sum + Number(tax.amount || 0), 0))}</strong> Tax receipts</span>
            <span><strong>{formatCredits(treasuryGrants.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0))}</strong> Grants paid</span>
            <span><strong>{treasuryTransactions.filter((transaction) => transaction.fromWalletId === "treasury").length}</strong> Transfers made</span>
            <span><strong>{formatCredits(taxCollectedSince(24 * 60 * 60 * 1000))}</strong> Tax today</span>
            <span><strong>{formatCredits(taxCollectedSince(7 * 24 * 60 * 60 * 1000))}</strong> Tax this week</span>
            <span><strong>{formatCredits(taxCollectedSince(30 * 24 * 60 * 60 * 1000))}</strong> Tax this month</span>
          </div>
          {fullAccess ? (
            <>
              <div className="treasury-tax-overview">
                <div className="panel__header">
                  <div>
                    <p className="eyebrow">Tax Rates</p>
                    <h3>Ministry of Credit & Records Tax Control</h3>
                  </div>
                  <strong className={`auto-tax-status ${autoTaxEnabled ? "auto-tax-status--enabled" : "auto-tax-status--disabled"}`}>{autoTaxEnabled ? "🟢 ENABLED" : "🔴 DISABLED"}</strong>
                </div>
                <p>Auto Tax automatically deducts applicable taxes from citizens at scheduled intervals.</p>
                <div className="metric-grid">
                  <span><strong>{formatDateTime(autoTax.lastRunAt)}</strong> Last Auto Tax Run</span>
                  <span><strong>{autoTaxEnabled ? formatDateTime(autoTax.nextRunAt) : "Auto Tax is currently inactive."}</strong> Next Auto Tax Run</span>
                </div>
                <div className="treasury-table-wrap">
                  <table className="treasury-tax-table">
                    <thead>
                      <tr>
                        <th>Tax name</th>
                        <th>Current rate</th>
                        <th>Status</th>
                        <th>Last updated</th>
                        <th>Updated by</th>
                        <th>Description</th>
                        <th>Edit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {taxRows.map((tax) => (
                        <tr key={tax.id}>
                          <td>{tax.label}</td>
                          <td>{(tax.rate * 100).toFixed(2)}%</td>
                          <td><span className={`auto-tax-status ${tax.enabled ? "auto-tax-status--enabled" : "auto-tax-status--disabled"}`}>{tax.enabled ? "ENABLED" : "DISABLED"}</span></td>
                          <td>{formatDateTime(tax.lastUpdatedAt)}</td>
                          <td>{tax.updatedBy}</td>
                          <td>{tax.description}</td>
                          <td>
                            <form action="/government-access/panem-credit/action" className="treasury-tax-edit-form" method="post">
                              <input name="intent" type="hidden" value="set-tax" />
                              <input name="taxType" type="hidden" value={tax.id} />
                              <label className="public-application-field"><span>Percent</span><input defaultValue={(tax.rate * 100).toFixed(2)} max="100" min="0" name="taxRatePercent" step="0.01" type="number" /></label>
                              <input name="taxRate" type="hidden" value={tax.rate} />
                              <label className="public-application-toggle"><input defaultChecked={tax.enabled} name="taxEnabled" type="checkbox" /><span>Enabled</span></label>
                              <label className="public-application-toggle"><input name="confirmTaxRate" required type="checkbox" /><span>Confirm save</span></label>
                              <button className="button button--solid-site" type="submit">Edit</button>
                            </form>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="treasury-tax-overview">
                <div className="panel__header">
                  <div>
                    <p className="eyebrow">Tax Distribution</p>
                    <h3>State Treasury and District Fund Split</h3>
                  </div>
                  <strong>{taxDistribution.stateShare}% / {taxDistribution.districtShare}%</strong>
                </div>
                <div className="metric-grid">
                  <span><strong>{taxDistribution.stateShare}%</strong> State Treasury Share</span>
                  <span><strong>{taxDistribution.districtShare}%</strong> District Fund Share</span>
                  <span><strong>{formatDateTime(taxDistribution.lastUpdatedAt)}</strong> Last updated</span>
                  <span><strong>{taxDistribution.updatedBy || "system"}</strong> Updated by</span>
                </div>
                <form action="/government-access/panem-credit/action" className="public-application-form" method="post">
                  <input name="intent" type="hidden" value="set-tax-distribution" />
                  <div className="public-application-grid public-application-grid--three">
                    <label className="public-application-field"><span>State Treasury Share</span><input defaultValue={taxDistribution.stateShare} max="100" min="0" name="stateSharePercent" required step="0.01" type="number" /></label>
                    <label className="public-application-field"><span>District Share</span><input defaultValue={taxDistribution.districtShare} max="100" min="0" name="districtSharePercent" required step="0.01" type="number" /></label>
                    <label className="public-application-toggle"><input name="confirmTaxDistribution" required type="checkbox" /><span>Confirm total equals 100%</span></label>
                  </div>
                  <button className="button button--solid-site" type="submit">Save Distribution</button>
                </form>
              </div>
              <div className="panem-ledger-layout">
                <form action="/government-access/panem-credit/action" className="public-application-form auto-tax-control" method="post">
                  <input name="intent" type="hidden" value={autoTaxEnabled ? "auto-tax-disable" : "auto-tax-enable"} />
                  <h3>Auto Tax Control</h3>
                  <div className="public-application-grid public-application-grid--three">
                    <label className="public-application-field"><span>Frequency</span><select defaultValue={autoTax.frequency || "daily"} name="frequency"><option value="daily">Daily</option><option value="weekly">Weekly</option></select></label>
                    <label className="public-application-field"><span>Execution time</span><input defaultValue={autoTax.executionTime || "09:00"} name="executionTime" type="time" /></label>
                  </div>
                  <label className="public-application-toggle"><input name="confirmAutoTax" required type="checkbox" /><span>{autoTaxEnabled ? "Are you sure you want to disable automatic taxation?" : "Are you sure you want to enable automatic taxation?"}</span></label>
                  <button className={autoTaxEnabled ? "button button--danger-site" : "button button--solid-site"} type="submit">{autoTaxEnabled ? "Disable Auto Tax" : "Enable Auto Tax"}</button>
                </form>
                <form action="/government-access/panem-credit/action" className="public-application-form" method="post">
                  <input name="intent" type="hidden" value="run-tax" />
                  <h3>Manual Run Tax</h3>
                  <p>Manual run immediately applies income tax to all eligible, non-exempt, non-frozen wallets.</p>
                  <button className="button button--danger-site" type="submit">Manual Run Tax</button>
                </form>
              </div>
              <form action="/government-access/panem-credit/action" className="public-application-form" method="post">
                <input name="intent" type="hidden" value="treasury-transfer" />
                <h3>Treasury Personal Transfer</h3>
                <div className="public-application-grid public-application-grid--three">
                  <label className="public-application-field"><span>Recipient</span><select name="toWalletId">{store.wallets.filter((wallet) => wallet.id !== "treasury").map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.displayName}</option>)}</select></label>
                  <label className="public-application-field"><span>Amount</span><input min="1" name="amount" required type="number" /></label>
                  <label className="public-application-field"><span>Reason required</span><input name="reason" required /></label>
                </div>
                <label className="public-application-toggle"><input name="confirmTreasuryTransfer" required type="checkbox" /><span>Confirm State Treasury funds are being moved to a personal account</span></label>
                <button className="button button--danger-site" type="submit">Transfer Treasury Funds</button>
              </form>
            </>
          ) : null}
        </section>

        <section className="panel government-user-panel">
          <p className="eyebrow">Current Event</p>
          <h2>{activeEvent?.title || "Standard Treasury Cycle"}</h2>
          <p>{activeEvent?.summary || "No active emergency modifier."}</p>
          {fullAccess ? (
            <form action="/government-access/panem-credit/action" className="public-application-form" method="post">
              <input name="intent" type="hidden" value="trigger-event" />
              <div className="public-application-grid public-application-grid--three">
                <label className="public-application-field">
                  <span>Event</span>
                  <select name="eventId">
                    <option value="random">Random Dynamic Event</option>
                    {economyEventDefaults.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
                  </select>
                </label>
                <label className="public-application-field"><span>Duration hours</span><input defaultValue="168" min="1" name="durationHours" type="number" /></label>
                <label className="public-application-field"><span>Authority note</span><input name="reason" placeholder="Treasury cycle order" /></label>
              </div>
              <button className="button button--solid-site" type="submit">Trigger Event</button>
            </form>
          ) : null}
        </section>

        <section className="panel government-user-panel">
          <p className="eyebrow">Event Timeline</p>
          <h2>Active Market Conditions</h2>
          <div className="panem-ledger-layout">
            {store.events.filter((event) => event.status === "active").slice(0, 6).map((event) => (
              <article className="finance-panel" key={`${event.id}-${event.startsAt}`}>
                <p className="eyebrow">{event.eventType || "state event"}</p>
                <h3>{event.title}</h3>
                <p>{event.summary}</p>
                <dl className="panem-ledger">
                  <div><dt>Districts</dt><dd>{(event.affectedDistricts || event.boostedDistricts || []).join(", ") || "Union-wide"}</dd></div>
                  <div><dt>Companies</dt><dd>{(event.affectedCompanies || event.tickers || []).join(", ") || "All/None"}</dd></div>
                  <div><dt>Ends</dt><dd>{event.endsAt ? new Date(event.endsAt).toLocaleString("en-GB") : "Standing order"}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        {fullAccess ? (
          <section className="panel government-user-panel">
            <p className="eyebrow">Wallet Creation</p>
            <h2>Create Wallet</h2>
            <form action="/government-access/panem-credit/action" className="public-application-form" method="post">
              <input name="intent" type="hidden" value="create-wallet" />
              <div className="public-application-grid public-application-grid--three">
                <label className="public-application-field"><span>User ID</span><input name="userId" required /></label>
                <label className="public-application-field"><span>Display name</span><input name="displayName" required /></label>
                <label className="public-application-field"><span>Discord ID optional</span><input name="discordId" /></label>
              </div>
              <div className="public-application-grid public-application-grid--three">
                <label className="public-application-field"><span>Opening balance</span><input defaultValue="500" min="0" name="balance" type="number" /></label>
                <label className="public-application-field"><span>Daily salary</span><input defaultValue="125" min="0" name="salary" type="number" /></label>
                <label className="public-application-field">
                  <span>District</span>
                  <select name="district">
                    <option value="">Unassigned</option>
                    {store.districts.map((district) => <option key={district.id} value={district.name}>{district.name}</option>)}
                  </select>
                </label>
                <label className="public-application-field">
                  <span>Link citizen record</span>
                  <select name="citizenId">
                    <option value="">None</option>
                    {citizenState.citizenRecords.map((citizen) => (
                      <option key={citizen.id} value={citizen.id}>{citizen.name} / {citizen.unionSecurityId}</option>
                    ))}
                  </select>
                </label>
              </div>
              <button className="button button--solid-site" type="submit">Create Wallet</button>
            </form>
          </section>
        ) : null}

        <section className="state-section">
          <p className="eyebrow">Wallet Registry</p>
          <h2>Citizen Accounts</h2>
          <div className="government-user-list">
            {store.wallets.map((wallet) => {
              const isStateTreasury = wallet.id === "treasury";
              const linkedCitizen = isStateTreasury ? null : citizenState.citizenRecords.find((citizen) =>
                (citizen.walletId && citizen.walletId === wallet.id) ||
                (citizen.discordId && wallet.discordId && citizen.discordId === wallet.discordId) ||
                (citizen.userId && wallet.userId && citizen.userId === wallet.userId)
              );
              return (
              <article className="panel government-user-card panem-admin-wallet" key={wallet.id}>
                <div className="panel__header">
                  <div>
                    <p className="eyebrow">{wallet.userId} {wallet.discordId ? `/ ${wallet.discordId}` : ""}</p>
                    <h2>{wallet.displayName}</h2>
                  </div>
                  <span className="court-role-badge">{wallet.status}</span>
                </div>
                <div className="bulletin-editor-card__actions">
                  <Link className="button" href={`/government-access/panem-credit?wallet=${encodeURIComponent(wallet.id)}#wallet-records`}>View Records</Link>
                </div>
                <div className="metric-grid">
                  <span><strong>{formatCredits(wallet.balance)}</strong> Balance</span>
                  <span><strong>{formatCredits(wallet.salary ?? 125)}</strong> Daily salary</span>
                  <span><strong>{wallet.district || "Unassigned"}</strong> District</span>
                  <span><strong>{wallet.taxStatus}</strong> Tax status</span>
                  <span><strong>{wallet.title || titleForBalance(wallet.balance)}</strong> Title</span>
                  <span><strong>{isStateTreasury ? "State account / no citizen link" : linkedCitizen?.name || "Unlinked"}</strong> Citizen record</span>
                  <span><strong>{wallet.wanted ? "Wanted" : wallet.underReview ? "Under Review" : "Clear"}</strong> MSS status</span>
                  <span><strong>{formatCredits(wallet.bounty || 0)}</strong> Bounty</span>
                </div>
                {fullAccess ? (
                  <form action="/government-access/panem-credit/action" className="public-application-form" method="post">
                    <input name="intent" type="hidden" value="edit-balance" />
                    <input name="walletId" type="hidden" value={wallet.id} />
                    <div className="public-application-grid public-application-grid--three">
                      <label className="public-application-field"><span>Display name</span><input defaultValue={wallet.displayName} name="displayName" /></label>
                      <label className="public-application-field"><span>Balance</span><input defaultValue={wallet.balance} min="0" name="balance" type="number" /></label>
                      <label className="public-application-field"><span>Daily salary</span><input defaultValue={wallet.salary ?? 125} min="0" name="salary" type="number" /></label>
                    </div>
                    <div className="public-application-grid public-application-grid--three">
                      <label className="public-application-field"><span>Discord ID</span><input defaultValue={wallet.discordId} name="discordId" /></label>
                      <label className="public-application-field">
                        <span>District</span>
                        <select defaultValue={wallet.district || ""} name="district">
                          <option value="">Unassigned</option>
                          {store.districts.map((district) => (
                            <option key={district.id} value={district.name}>{district.name}</option>
                          ))}
                        </select>
                      </label>
                      <label className="public-application-field"><span>Custom title</span><input defaultValue={wallet.title || ""} name="title" placeholder={titleForBalance(wallet.balance)} /></label>
                      <label className="public-application-field"><span>Tax status</span><input defaultValue={wallet.taxStatus} name="taxStatus" /></label>
                      {isStateTreasury ? (
                        <label className="public-application-field"><span>Linked citizen</span><input disabled value="State account / no citizen link" /></label>
                      ) : (
                        <label className="public-application-field">
                          <span>Linked citizen</span>
                          <select defaultValue={linkedCitizen?.id || ""} name="citizenId">
                            <option value="">None</option>
                            {citizenState.citizenRecords.map((citizen) => (
                              <option key={citizen.id} value={citizen.id}>{citizen.name} / {citizen.unionSecurityId}</option>
                            ))}
                          </select>
                        </label>
                      )}
                    </div>
                    <button className="button button--solid-site" type="submit">Save Wallet Profile</button>
                  </form>
                ) : null}
                <div className="bulletin-editor-card__actions">
                  {securityAccess ? (
                    <>
                      <form action="/government-access/panem-credit/action" method="post"><input name="intent" type="hidden" value="freeze" /><input name="walletId" type="hidden" value={wallet.id} /><button className="button" type="submit">Freeze</button></form>
                      <form action="/government-access/panem-credit/action" method="post"><input name="intent" type="hidden" value="unfreeze" /><input name="walletId" type="hidden" value={wallet.id} /><button className="button" type="submit">Unfreeze</button></form>
                      <form action="/government-access/panem-credit/action" method="post"><input name="intent" type="hidden" value="restrict" /><input name="walletId" type="hidden" value={wallet.id} /><button className="button" type="submit">Restrict</button></form>
                      <form action="/government-access/panem-credit/action" method="post"><input name="intent" type="hidden" value="wanted" /><input name="walletId" type="hidden" value={wallet.id} /><input name="bounty" type="hidden" value="500" /><button className="button button--danger-site" type="submit">Wanted</button></form>
                      <form action="/government-access/panem-credit/action" method="post"><input name="intent" type="hidden" value="pardon" /><input name="walletId" type="hidden" value={wallet.id} /><button className="button" type="submit">Pardon</button></form>
                    </>
                  ) : null}
                </div>
              </article>
              );
            })}
          </div>
        </section>

        {fullAccess ? (
          <section className="state-section">
            <p className="eyebrow">Treasury Actions</p>
            <h2>Payments, Tax, Fines, Rebates</h2>
            <div className="panem-ledger-layout">
              {[
                ["grant", "Issue Grant / Payment"],
                ["fine", "Issue Fine / Penalty"],
                ["tax", "Apply Tax Manually"],
                ["rebate", "Issue Rebate"]
              ].map(([intent, title]) => (
                <form action="/government-access/panem-credit/action" className="panel public-application-form" key={intent} method="post">
                  <input name="intent" type="hidden" value={intent} />
                  <h3>{title}</h3>
                  <label className="public-application-field"><span>Wallet</span><select name="walletId">{store.wallets.map((wallet) => <option key={wallet.id} value={wallet.id}>{wallet.displayName}</option>)}</select></label>
                  {intent === "tax" ? (
                    <>
                      <label className="public-application-field"><span>Tax type</span><select name="taxType">{taxTypes.map((tax) => <option key={tax.id} value={tax.id}>{tax.label}</option>)}</select></label>
                      <label className="public-application-field"><span>Status</span><select name="status"><option value="paid">Paid</option><option value="outstanding">Outstanding</option></select></label>
                    </>
                  ) : null}
                  <label className="public-application-field"><span>Amount</span><input min="1" name="amount" required type="number" /></label>
                  <label className="public-application-field"><span>Reason</span><input name="reason" /></label>
                  <button className="button button--solid-site" type="submit">{title}</button>
                </form>
              ))}
            </div>
          </section>
        ) : null}

        {selectedWallet ? (
          <section className="state-section" id="wallet-records">
            <p className="eyebrow">Citizen Ledger</p>
            <h2>{selectedWallet.displayName} Records</h2>
            <div className="government-dashboard-grid">
              <article className="government-status-panel">
                <p className="eyebrow">Wallet</p>
                <h2>{formatCredits(selectedWallet.balance)}</h2>
                <p>{selectedWallet.district || "Unassigned"} / {selectedWallet.status}</p>
              </article>
              <article className="government-status-panel">
                <p className="eyebrow">Citizen</p>
                <h2>{selectedCitizen?.name || selectedCitizen?.citizenName || "Unlinked"}</h2>
                <p>{selectedCitizen?.unionSecurityId || selectedWallet.userId || selectedWallet.discordId || selectedWallet.id}</p>
              </article>
              <article className="government-status-panel">
                <p className="eyebrow">Transactions</p>
                <h2>{selectedTransactions.length}</h2>
                <p>{formatCredits(selectedTransactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0))} recorded movement.</p>
              </article>
              <article className="government-status-panel">
                <p className="eyebrow">Tax Records</p>
                <h2>{selectedTaxes.length}</h2>
                <p>{formatCredits(selectedTaxes.reduce((sum, tax) => sum + Number(tax.amount || 0), 0))} assessed.</p>
              </article>
            </div>
            <div className="panem-ledger-layout">
              <article className="panel">
                <h3>Transaction Record</h3>
                <ul className="government-mini-list">
                  {selectedTransactions.slice(0, 50).map((transaction) => (
                    <li key={transaction.id}>
                      <span>
                        {transaction.type} / {transaction.reason}
                        <br />
                        {walletLabel(transaction.fromWalletId)} → {walletLabel(transaction.toWalletId)}
                        {transaction.createdAt ? ` / ${new Date(transaction.createdAt).toLocaleString("en-GB")}` : ""}
                      </span>
                      <strong>{formatCredits(transaction.amount)}{transaction.taxAmount ? ` / tax ${formatCredits(transaction.taxAmount)}` : ""} {transaction.reversedAt ? "/ reversed" : ""}</strong>
                      {fullAccess && !transaction.reversedAt ? (
                        <form action="/government-access/panem-credit/action" method="post">
                          <input name="intent" type="hidden" value="reverse" />
                          <input name="transactionId" type="hidden" value={transaction.id} />
                          <input name="returnWalletId" type="hidden" value={selectedWallet.id} />
                          <button className="button" type="submit">Reverse</button>
                        </form>
                      ) : null}
                    </li>
                  ))}
                  {!selectedTransactions.length ? <li><span>No transaction records for this wallet.</span><strong>0</strong></li> : null}
                </ul>
              </article>
              <article className="panel">
                <h3>Tax Record</h3>
                <ul className="government-mini-list">
                  {selectedTaxes.slice(0, 50).map((tax) => (
                    <li key={tax.id}>
                      <span>
                        {taxLabel(tax.taxType)} / {tax.status}
                        <br />
                        {tax.reason || tax.createdBy || "Treasury record"} / state: {formatCredits(tax.stateAmount ?? tax.amount)} / district: {formatCredits(tax.districtAmount || 0)} {tax.districtFund ? `(${tax.districtFund})` : ""}
                        {tax.createdAt ? ` / ${new Date(tax.createdAt).toLocaleString("en-GB")}` : ""}
                      </span>
                      <strong>{formatCredits(tax.amount)}</strong>
                    </li>
                  ))}
                  {!selectedTaxes.length ? <li><span>No tax records for this wallet.</span><strong>0</strong></li> : null}
                </ul>
              </article>
            </div>
          </section>
        ) : null}

        <section className="state-section">
          <p className="eyebrow">Marketplace Control</p>
          <h2>Goods and District Production</h2>
          <div className="panem-market-grid">
            {store.marketItems.map((item) => (
              <form action="/government-access/panem-credit/action" className="panel public-application-form panem-market-card" key={item.id} method="post">
                <input name="intent" type="hidden" value="item" />
                <input name="itemId" type="hidden" value={item.id} />
                <h3>{item.name}</h3>
                <p>{item.district} / {item.category}</p>
                <label className="public-application-field"><span>Price</span><input defaultValue={item.currentPrice} disabled={!fullAccess} min="1" name="currentPrice" type="number" /></label>
                <label className="public-application-field"><span>Stock</span><input defaultValue={item.stock} disabled={!fullAccess} min="0" name="stock" type="number" /></label>
                <label className="public-application-toggle"><input defaultChecked={item.restricted} disabled={!fullAccess} name="restricted" type="checkbox" /><span>Restricted good</span></label>
                <label className="public-application-field"><span>Description</span><textarea defaultValue={item.description} disabled={!fullAccess} name="description" rows="3" /></label>
                {fullAccess ? <button className="button button--solid-site" type="submit">Save Good</button> : null}
              </form>
            ))}
          </div>
        </section>

        <section className="state-section">
          <p className="eyebrow">District Values</p>
          <h2>Production Settings</h2>
          <div className="panem-district-grid">
            {store.districts.map((district) => (
              <form action="/government-access/panem-credit/action" className="finance-panel public-application-form" key={district.id} method="post">
                <input name="intent" type="hidden" value="district" />
                <input name="districtId" type="hidden" value={district.id} />
                <h3>{district.name}</h3>
                <p>{district.productionType}</p>
                {(() => {
                  const fund = store.districtFunds?.find((entry) => entry.district === district.name);
                  return (
                    <div className="metric-grid">
                      <span><strong>{formatCredits(fund?.balance || 0)}</strong> District fund balance</span>
                      <span><strong>{formatCredits(fund?.taxReceivedWeek || 0)}</strong> Tax this week</span>
                      <span><strong>{formatCredits(fund?.taxReceivedMonth || 0)}</strong> Tax this month</span>
                    </div>
                  );
                })()}
                <div className="public-application-grid public-application-grid--three">
                  <label className="public-application-field"><span>Supply</span><input defaultValue={district.supplyLevel} disabled={!fullAccess} name="supplyLevel" type="number" /></label>
                  <label className="public-application-field"><span>Demand</span><input defaultValue={district.demandLevel} disabled={!fullAccess} name="demandLevel" type="number" /></label>
                  <label className="public-application-field"><span>Prosperity</span><input defaultValue={district.prosperityRating} disabled={!fullAccess} name="prosperityRating" type="number" /></label>
                </div>
                <label className="public-application-field"><span>Development status</span><input defaultValue={district.developmentStatus} disabled={!fullAccess} name="developmentStatus" /></label>
                {fullAccess ? <button className="button button--solid-site" type="submit">Save District</button> : null}
              </form>
            ))}
          </div>
        </section>

        <section className="state-section">
          <p className="eyebrow">Audit</p>
          <h2>Transactions and MSS Alerts</h2>
          <div className="panem-ledger-layout">
            <article className="panel">
              <h3>Transaction Logs</h3>
              <ul className="government-mini-list">
                {store.transactions.slice(0, 20).map((transaction) => (
                  <li key={transaction.id}>
                    <span>{transaction.type} / {transaction.reason}</span>
                    <strong>{formatCredits(transaction.amount)} {transaction.reversedAt ? "/ reversed" : ""}</strong>
                    {fullAccess && !transaction.reversedAt ? (
                      <form action="/government-access/panem-credit/action" method="post">
                        <input name="intent" type="hidden" value="reverse" />
                        <input name="transactionId" type="hidden" value={transaction.id} />
                        <button className="button" type="submit">Reverse</button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel">
              <h3>Security Alerts</h3>
              <ul className="government-mini-list">
                {store.alerts.slice(0, 20).map((alert) => (
                  <li key={alert.id}>
                    <span>{alert.type} / {alert.summary}</span>
                    <strong>{alert.severity}</strong>
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel">
              <h3>Tax Records</h3>
              <ul className="government-mini-list">
                {store.taxRecords.slice(0, 20).map((tax) => (
                  <li key={tax.id}>
                    <span>{taxLabel(tax.taxType)} / {tax.status} / state {formatCredits(tax.stateAmount ?? tax.amount)} / district {formatCredits(tax.districtAmount || 0)} {tax.districtFund ? `(${tax.districtFund})` : ""}</span>
                    <strong>{formatCredits(tax.amount)}</strong>
                  </li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
