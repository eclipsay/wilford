import Link from "next/link";
import { formatCredits, taxLabel, taxTypes, titleForBalance } from "@wilford/shared";
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
  const taxesPaid = store.taxRecords
    .filter((record) => record.status === "paid")
    .reduce((sum, record) => sum + Number(record.amount || 0), 0);
  const tradeVolume = store.transactions.reduce((sum, transaction) => sum + Number(transaction.amount || 0), 0);

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

        <section className="government-dashboard-grid">
          <article className="government-status-panel">
            <p className="eyebrow">Wallet Supply</p>
            <h2>{formatCredits(totalCredits)}</h2>
            <p>{store.wallets.length} wallets registered.</p>
          </article>
          <article className="government-status-panel">
            <p className="eyebrow">Tax Reports</p>
            <h2>{formatCredits(taxesPaid)}</h2>
            <p>Taxation sustains the Union.</p>
          </article>
          <article className="government-status-panel">
            <p className="eyebrow">Trade Volume</p>
            <h2>{formatCredits(tradeVolume)}</h2>
            <p>{store.transactions.length} ledger transactions.</p>
          </article>
          <article className="government-status-panel">
            <p className="eyebrow">MSS Alerts</p>
            <h2>{store.alerts.length}</h2>
            <p>Suspicious activity, unpaid penalties, and restricted-market warnings.</p>
          </article>
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
              const linkedCitizen = citizenState.citizenRecords.find((citizen) => citizen.walletId === wallet.id || citizen.discordId === wallet.discordId || citizen.userId === wallet.userId);
              return (
              <article className="panel government-user-card panem-admin-wallet" key={wallet.id}>
                <div className="panel__header">
                  <div>
                    <p className="eyebrow">{wallet.userId} {wallet.discordId ? `/ ${wallet.discordId}` : ""}</p>
                    <h2>{wallet.displayName}</h2>
                  </div>
                  <span className="court-role-badge">{wallet.status}</span>
                </div>
                <div className="metric-grid">
                  <span><strong>{formatCredits(wallet.balance)}</strong> Balance</span>
                  <span><strong>{formatCredits(wallet.salary ?? 125)}</strong> Daily salary</span>
                  <span><strong>{wallet.district || "Unassigned"}</strong> District</span>
                  <span><strong>{wallet.taxStatus}</strong> Tax status</span>
                  <span><strong>{wallet.title || titleForBalance(wallet.balance)}</strong> Title</span>
                  <span><strong>{linkedCitizen?.name || "Unlinked"}</strong> Citizen record</span>
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
                      <label className="public-application-field">
                        <span>Linked citizen</span>
                        <select defaultValue={linkedCitizen?.id || ""} name="citizenId">
                          <option value="">None</option>
                          {citizenState.citizenRecords.map((citizen) => (
                            <option key={citizen.id} value={citizen.id}>{citizen.name} / {citizen.unionSecurityId}</option>
                          ))}
                        </select>
                      </label>
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

        {fullAccess ? (
          <section className="panel government-user-panel">
            <p className="eyebrow">Tax Policy</p>
            <h2>Set Rates / Run Automatic Taxation</h2>
            <div className="panem-ledger-layout">
              <form action="/government-access/panem-credit/action" className="public-application-form" method="post">
                <input name="intent" type="hidden" value="set-tax" />
                <label className="public-application-field"><span>Tax type</span><select name="taxType">{taxTypes.map((tax) => <option key={tax.id} value={tax.id}>{tax.label}</option>)}</select></label>
                <label className="public-application-field"><span>Rate decimal</span><input defaultValue="0.05" max="1" min="0" name="taxRate" step="0.01" type="number" /></label>
                <button className="button button--solid-site" type="submit">Set Tax Rate</button>
              </form>
              <form action="/government-access/panem-credit/action" className="public-application-form" method="post">
                <input name="intent" type="hidden" value="run-tax" />
                <p>Automatic taxation applies income tax to all non-exempt, non-frozen wallets.</p>
                <button className="button button--danger-site" type="submit">Run Automatic Taxation</button>
              </form>
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
                    <span>{taxLabel(tax.taxType)} / {tax.status}</span>
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
