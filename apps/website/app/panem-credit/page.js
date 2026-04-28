import { formatCredits, taxLabel, titleForBalance } from "@wilford/shared";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getEconomyStore, getWallet } from "../../lib/panem-credit";
import { getCurrentCitizen } from "../../lib/citizen-state";

export const metadata = {
  title: "Panem Credit"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function sumTaxes(records) {
  return records.reduce((total, record) => total + Number(record.amount || 0), 0);
}

export default async function PanemCreditPage({ searchParams }) {
  const params = await searchParams;
  const citizen = await getCurrentCitizen();

  if (!citizen) {
    return (
      <SiteLayout>
        <PageHero
          eyebrow="Ministry of Credit & Records"
          title="Panem Credit"
          description="Secure citizen banking requires Union Security identification."
        />

        <main className="content content--wide finance-page panem-credit-page">
          {params?.error ? (
            <section className="application-notice application-notice--error">
              <strong>Account Access Required</strong>
              <p>Enter your citizen name and Union Security ID before opening Panem Credit.</p>
            </section>
          ) : null}

          <section className="portal-intro scroll-fade">
            <div>
              <p className="eyebrow">Secure Banking Access</p>
              <h2>Union Security ID required.</h2>
              <p>
                Panem Credit accounts are tied to citizen identity records. Your
                Union Security ID identifies the wallet, district affiliation,
                tax status, marketplace actions, and transaction history attached
                to your account.
              </p>
            </div>
            <form action="/citizen-portal/action" className="portal-status public-application-form citizen-login-form" method="post">
              <input name="intent" type="hidden" value="login" />
              <input name="returnTo" type="hidden" value="/panem-credit" />
              <label className="public-application-field">
                <span>Citizen name</span>
                <input autoComplete="name" name="citizenName" required />
              </label>
              <label className="public-application-field">
                <span>Union Security ID</span>
                <input autoComplete="off" name="unionSecurityId" placeholder="WPU-08-2026-0004" required />
              </label>
              <button className="button button--solid-site" type="submit">Open Panem Credit</button>
            </form>
          </section>
        </main>
      </SiteLayout>
    );
  }

  const store = await getEconomyStore();
  const selectedWallet = getWallet(store, citizen.walletId || citizen.userId || citizen.discordId);

  if (!selectedWallet) {
    return (
      <SiteLayout>
        <PageHero
          eyebrow="Ministry of Credit & Records"
          title="Panem Credit"
          description="Secure citizen banking, taxation, and marketplace exchange."
        />

        <main className="content content--wide finance-page panem-credit-page">
          <section className="application-notice application-notice--error">
            <strong>No Wallet Linked</strong>
            <p>Your citizen identity is verified, but no Panem Credit wallet is linked to this record.</p>
          </section>
        </main>
      </SiteLayout>
    );
  }

  const walletTransactions = store.transactions
    .filter((transaction) => transaction.fromWalletId === selectedWallet.id || transaction.toWalletId === selectedWallet.id)
    .slice(0, 12);
  const walletTaxes = store.taxRecords.filter((record) => record.walletId === selectedWallet.id);
  const paidTax = sumTaxes(walletTaxes.filter((record) => record.status === "paid"));
  const outstandingTax = sumTaxes(walletTaxes.filter((record) => record.status !== "paid"));

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Ministry of Credit & Records"
        title="Panem Credit"
        description="Official civic banking, marketplace exchange, taxation, and district production ledger."
      />

      <main className="content content--wide finance-page panem-credit-page">
        {params?.saved ? (
          <section className="application-notice">
            <strong>Ledger Updated</strong>
            <p>The Ministry of Credit & Records has recorded the transaction.</p>
          </section>
        ) : null}
        {params?.error ? (
          <section className="application-notice application-notice--error">
            <strong>{params.error === "daily-limit" ? "Daily Salary Already Claimed" : "Transaction Rejected"}</strong>
            <p>
              {params.error === "daily-limit"
                ? "This wallet has already received its daily civic salary today."
                : params.error === "session"
                  ? "Your citizen banking session has expired. Please identify yourself again."
                : "The wallet, balance, stock, or account status could not support that request."}
            </p>
          </section>
        ) : null}

        <section className="finance-portal scroll-fade">
          <article className="wallet-card panem-wallet-card">
            <div>
              <p>Citizen Wallet</p>
              <h2>{selectedWallet.displayName}</h2>
            </div>
            <div className="wallet-card__balance">{formatCredits(selectedWallet.balance)}</div>
            <span>{selectedWallet.title || titleForBalance(selectedWallet.balance)} / {selectedWallet.status.toUpperCase()}</span>
            <p>{citizen.name} / {citizen.unionSecurityId}</p>
          </article>

          <article className="finance-panel">
            <p className="eyebrow">Tax Status</p>
            <h2>Taxation sustains the Union.</h2>
            <div className="metric-grid">
              <span><strong>{formatCredits(paidTax)}</strong> Taxes paid</span>
              <span><strong>{formatCredits(outstandingTax)}</strong> Outstanding tax</span>
              <span><strong>{formatCredits(selectedWallet.salary ?? 125)}</strong> Daily salary</span>
              <span><strong>{selectedWallet.taxStatus}</strong> Current status</span>
              <span><strong>{selectedWallet.district || "Unassigned"}</strong> District affiliation</span>
            </div>
          </article>

          <article className="finance-panel finance-panel--metrics">
            <p className="eyebrow">Citizen Actions</p>
            <div className="panem-action-grid">
              <form action="/panem-credit/action" className="public-application-form" method="post">
                <input name="intent" type="hidden" value="send" />
                <label className="public-application-field">
                  <span>Recipient Union Security ID</span>
                  <input autoComplete="off" name="recipientSecurityId" placeholder="WPU-03-2026-0002" required />
                </label>
                <label className="public-application-field">
                  <span>Amount</span>
                  <input min="1" name="amount" required type="number" />
                </label>
                <label className="public-application-field">
                  <span>Reason</span>
                  <input name="reason" placeholder="Civic payment" type="text" />
                </label>
                <button className="button button--solid-site" type="submit">Send Credits</button>
              </form>
              <form action="/panem-credit/action" method="post">
                <input name="intent" type="hidden" value="daily" />
                <button className="button" type="submit">Claim Daily Civic Stipend</button>
              </form>
            </div>
          </article>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Marketplace</p>
          <h2>District Goods Exchange</h2>
          <div className="panem-market-grid">
            {store.marketItems.map((item) => (
              <article className="premium-card panem-market-card" key={item.id}>
                <span className="court-role-badge">{item.district}</span>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <dl className="panem-ledger">
                  <div><dt>Price</dt><dd>{formatCredits(item.currentPrice)}</dd></div>
                  <div><dt>Stock</dt><dd>{item.stock}</dd></div>
                  <div><dt>Category</dt><dd>{item.category}</dd></div>
                </dl>
                <form action="/panem-credit/action" className="panem-inline-form" method="post">
                  <input name="intent" type="hidden" value="buy" />
                  <input name="itemId" type="hidden" value={item.id} />
                  <input defaultValue="1" min="1" name="quantity" type="number" />
                  <button className="button button--solid-site" type="submit">Buy</button>
                </form>
              </article>
            ))}
          </div>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Sell Goods</p>
          <h2>Citizen Listing Desk</h2>
          <form action="/panem-credit/action" className="panel public-application-form" method="post">
            <input name="intent" type="hidden" value="sell" />
            <div className="public-application-grid public-application-grid--three">
              <label className="public-application-field">
                <span>Good</span>
                <select name="itemId">
                  {store.marketItems.map((item) => (
                    <option key={item.id} value={item.id}>{item.name}</option>
                  ))}
                </select>
              </label>
              <label className="public-application-field">
                <span>Quantity</span>
                <input defaultValue="1" min="1" name="quantity" type="number" />
              </label>
              <label className="public-application-field">
                <span>Unit price</span>
                <input min="1" name="price" required type="number" />
              </label>
            </div>
            <button className="button button--solid-site" type="submit">List Goods</button>
          </form>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">District Economy</p>
          <h2>Production Map</h2>
          <div className="panem-district-grid">
            {store.districts.map((district) => (
              <article className="finance-panel panem-district-card" key={district.id}>
                <p className="eyebrow">{district.developmentStatus}</p>
                <h3>{district.name}</h3>
                <p>{district.goodsProduced}</p>
                <div className="finance-bars">
                  {[
                    ["Supply", district.supplyLevel],
                    ["Demand", district.demandLevel],
                    ["Prosperity", district.prosperityRating],
                    ["Loyalty", district.loyaltyScore]
                  ].map(([label, value]) => (
                    <div className="finance-bar" key={label}>
                      <span>{label}</span>
                      <i style={{ "--value": `${Math.min(100, Number(value || 0))}%` }} />
                    </div>
                  ))}
                </div>
                <dl className="panem-ledger">
                  <div><dt>Trade volume</dt><dd>{formatCredits(district.tradeVolume)}</dd></div>
                  <div><dt>Tax contribution</dt><dd>{formatCredits(district.taxContribution)}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Ledger</p>
          <h2>Transactions, Taxes, and Rankings</h2>
          <div className="panem-ledger-layout">
            <article className="panel">
              <h3>Recent Transactions</h3>
              <ul className="government-mini-list">
                {walletTransactions.map((transaction) => (
                  <li key={transaction.id}>
                    <span>{transaction.type} / {transaction.reason}</span>
                    <strong>{formatCredits(transaction.amount)} {transaction.taxAmount ? `+ ${formatCredits(transaction.taxAmount)} tax` : ""}</strong>
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel">
              <h3>Tax History</h3>
              <ul className="government-mini-list">
                {walletTaxes.slice(0, 8).map((tax) => (
                  <li key={tax.id}>
                    <span>{taxLabel(tax.taxType)} / {tax.status}</span>
                    <strong>{formatCredits(tax.amount)}</strong>
                  </li>
                ))}
              </ul>
            </article>
            <article className="panel">
              <h3>Account Security</h3>
              <ul className="government-mini-list">
                <li><span>Union Security ID</span><strong>{citizen.unionSecurityId}</strong></li>
                <li><span>District</span><strong>{citizen.district}</strong></li>
                <li><span>Verification</span><strong>{citizen.verificationStatus}</strong></li>
                <li><span>Security classification</span><strong>{citizen.securityClassification}</strong></li>
              </ul>
            </article>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
