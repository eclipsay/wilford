import Link from "next/link";
import { stockMarketEventDefaults, formatCredits } from "@wilford/shared";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { canAccess, requireGovernmentUser } from "../../../lib/government-auth";
import { getEconomyStore, getStockMarketDashboard } from "../../../lib/panem-credit";

export const metadata = { title: "Stock Market Control | Government Access" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function StockMarketControlPage({ searchParams }) {
  const params = await searchParams;
  const user = await requireGovernmentUser("economyView");
  const store = await getEconomyStore();
  const dashboard = getStockMarketDashboard(store, null);
  const fullAccess = canAccess(user, "economyControl");
  const securityAccess = canAccess(user, "economySecurity");

  return (
    <SiteLayout>
      <PageHero eyebrow="Panem Stock Exchange" title="Stock Market Control" description="Restricted PSE console for listings, events, dividends, and suspicious trade review." />
      <main className="content content--wide portal-page government-command-page panem-control-page">
        <Link className="button" href="/government-access">Back to Dashboard</Link>
        {params?.saved ? <section className="application-notice"><strong>PSE Updated</strong><p>The stock market ledger has been saved.</p></section> : null}

        <section className="government-dashboard-grid">
          <article className="government-status-panel"><p className="eyebrow">PSE Index</p><h2>{dashboard.indexValue.toLocaleString("en-GB")}</h2><p>{store.stockCompanies.length} companies listed.</p></article>
          <article className="government-status-panel"><p className="eyebrow">Trades</p><h2>{store.stockTrades.length}</h2><p>Citizen stock transactions.</p></article>
          <article className="government-status-panel"><p className="eyebrow">Transaction Tax</p><h2>{(store.stockSettings.transactionTax * 100).toFixed(1)}%</h2><p>PSE trading tax.</p></article>
          <article className="government-status-panel"><p className="eyebrow">Frozen Portfolios</p><h2>{store.wallets.filter((wallet) => wallet.portfolioFrozen).length}</h2><p>MSS portfolio restrictions.</p></article>
        </section>

        {fullAccess ? (
          <section className="panel government-user-panel">
            <p className="eyebrow">Market Event</p>
            <h2>Trigger PSE Event / Set Tax</h2>
            <div className="panem-ledger-layout">
              <form action="/government-access/stock-market/action" className="public-application-form" method="post">
                <input name="intent" type="hidden" value="event" />
                <label className="public-application-field"><span>Event</span><select name="eventId">{stockMarketEventDefaults.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label>
                <button className="button button--solid-site" type="submit">Trigger Event</button>
              </form>
              <form action="/government-access/stock-market/action" className="public-application-form" method="post">
                <input name="intent" type="hidden" value="tax" />
                <label className="public-application-field"><span>Transaction tax decimal</span><input defaultValue={store.stockSettings.transactionTax} min="0" max="1" step="0.001" name="transactionTax" type="number" /></label>
                <button className="button button--solid-site" type="submit">Set PSE Tax</button>
              </form>
              <form action="/government-access/stock-market/action" className="public-application-form" method="post">
                <input name="intent" type="hidden" value="dividend" />
                <label className="public-application-field"><span>Ticker optional</span><input name="ticker" placeholder="PCB" /></label>
                <button className="button button--solid-site" type="submit">Issue Dividends</button>
              </form>
            </div>
          </section>
        ) : null}

        <section className="state-section">
          <p className="eyebrow">Company Listings</p>
          <h2>Create / Edit / Suspend</h2>
          <div className="panem-market-grid">
            {store.stockCompanies.map((company) => (
              <form action="/government-access/stock-market/action" className="panel public-application-form panem-market-card" key={company.ticker} method="post">
                <input name="intent" type="hidden" value="company" />
                <input name="ticker" type="hidden" value={company.ticker} />
                <h3>{company.ticker} / {company.name}</h3>
                <p>{company.district} / {company.sector}</p>
                <label className="public-application-field"><span>Share price</span><input defaultValue={company.sharePrice} disabled={!fullAccess} min="1" name="sharePrice" type="number" /></label>
                <label className="public-application-field"><span>Status</span><select defaultValue={company.status} disabled={!fullAccess && !securityAccess} name="status"><option value="active">Active</option><option value="suspended">Suspended</option><option value="frozen">Frozen</option></select></label>
                <label className="public-application-field"><span>Risk</span><select defaultValue={company.riskLevel} disabled={!fullAccess} name="riskLevel"><option>Stable</option><option>Moderate</option><option>Volatile</option><option>Speculative</option><option>Restricted</option></select></label>
                <label className="public-application-field"><span>Dividend rate</span><input defaultValue={company.dividendRate} disabled={!fullAccess} min="0" max="1" step="0.001" name="dividendRate" type="number" /></label>
                {(fullAccess || securityAccess) ? <button className="button button--solid-site" type="submit">Save Company</button> : null}
              </form>
            ))}
          </div>
        </section>

        <section className="state-section">
          <p className="eyebrow">Citizen Portfolios</p>
          <h2>Investor Review</h2>
          <div className="government-user-list">
            {store.wallets.filter((wallet) => (wallet.stockPortfolio || []).length).map((wallet) => (
              <article className="panel government-user-card" key={wallet.id}>
                <div className="panel__header"><div><p className="eyebrow">{wallet.userId}</p><h2>{wallet.displayName}</h2></div><span className="court-role-badge">{wallet.portfolioFrozen ? "frozen" : "active"}</span></div>
                <ul className="government-mini-list">
                  {wallet.stockPortfolio.map((position) => <li key={position.ticker}><span>{position.ticker} / {position.shares} shares</span><strong>{formatCredits(position.averagePrice)}</strong></li>)}
                </ul>
                {securityAccess ? (
                  <form action="/government-access/stock-market/action" method="post">
                    <input name="intent" type="hidden" value={wallet.portfolioFrozen ? "unfreeze-portfolio" : "freeze-portfolio"} />
                    <input name="walletId" type="hidden" value={wallet.id} />
                    <button className="button" type="submit">{wallet.portfolioFrozen ? "Unfreeze Portfolio" : "Freeze Portfolio"}</button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
