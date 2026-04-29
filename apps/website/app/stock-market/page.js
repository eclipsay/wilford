import { formatCredits } from "@wilford/shared";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getCurrentCitizen } from "../../lib/citizen-state";
import { getEconomyStore, getStockMarketDashboard, getWallet } from "../../lib/panem-credit";

export const metadata = { title: "Panem Stock Exchange" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

function change(value) {
  const amount = Number(value || 0);
  return `${amount > 0 ? "+" : ""}${amount.toFixed(1)}%`;
}

export default async function StockMarketPage({ searchParams }) {
  const params = await searchParams;
  const [store, citizen] = await Promise.all([getEconomyStore(), getCurrentCitizen()]);
  const wallet = citizen ? getWallet(store, citizen.walletId || citizen.userId || citizen.discordId) : null;
  const dashboard = getStockMarketDashboard(store, wallet);
  const sectors = [...new Set(dashboard.companies.map((company) => company.sector))];

  return (
    <SiteLayout>
      <PageHero eyebrow="Panem Stock Exchange" title="PSE" description="Fictional district equities, state contracts, dividends, and citizen speculation." />
      <main className="content content--wide finance-page stock-market-page panem-credit-page">
        {params?.saved ? <section className="application-notice"><strong>PSE Ledger Updated</strong><p>The trade or watchlist action has been recorded.</p></section> : null}
        {params?.error ? <section className="application-notice application-notice--error"><strong>PSE Action Rejected</strong><p>Trading status, balance, shares, or portfolio restrictions prevented that action.</p></section> : null}

        <section className="market-hero-board scroll-fade">
          <article className="wallet-card panem-wallet-card">
            <p>{dashboard.exchangeName}</p>
            <h2>PSE Composite</h2>
            <div className="wallet-card__balance">{dashboard.indexValue.toLocaleString("en-GB")}</div>
            <span>Panem Credit denominated index</span>
          </article>
          <article className="finance-panel">
            <p className="eyebrow">Portfolio</p>
            <div className="metric-grid">
              <span><strong>{formatCredits(dashboard.portfolioValue)}</strong> Current value</span>
              <span><strong>{dashboard.positions.length}</strong> Positions</span>
              <span><strong>{formatCredits(wallet?.balance || 0)}</strong> Cash balance</span>
              <span><strong>{wallet?.portfolioFrozen ? "Frozen" : "Tradable"}</strong> Status</span>
            </div>
          </article>
          <article className="finance-panel">
            <p className="eyebrow">Trading Terms</p>
            <div className="metric-grid">
              <span><strong>{(dashboard.settings.transactionTax * 100).toFixed(1)}%</strong> Transaction tax</span>
              <span><strong>{formatCredits(dashboard.settings.transactionFee)}</strong> PSE fee</span>
              <span><strong>{sectors.length}</strong> Sectors</span>
              <span><strong>{dashboard.companies.length}</strong> Listed companies</span>
            </div>
          </article>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Market Movers</p>
          <h2>Gainers, Losers, Most Traded</h2>
          <div className="panem-ledger-layout">
            <article className="panel"><h3>Top Gainers</h3><ul className="government-mini-list">{dashboard.topGainers.map((company) => <li key={company.ticker}><span>{company.ticker} / {company.name}</span><strong>{change(company.dailyChangePercent)}</strong></li>)}</ul></article>
            <article className="panel"><h3>Top Losers</h3><ul className="government-mini-list">{dashboard.topLosers.map((company) => <li key={company.ticker}><span>{company.ticker} / {company.name}</span><strong>{change(company.dailyChangePercent)}</strong></li>)}</ul></article>
            <article className="panel"><h3>Most Traded</h3><ul className="government-mini-list">{dashboard.mostTraded.map((company) => <li key={company.ticker}><span>{company.ticker} / {company.sector}</span><strong>{formatCredits(company.sharePrice)}</strong></li>)}</ul></article>
          </div>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Listed Companies</p>
          <h2>District Equities</h2>
          <div className="panem-market-grid">
            {dashboard.companies.map((company) => (
              <article className="premium-card panem-market-card stock-company-card" key={company.ticker}>
                <span className="court-role-badge">{company.ticker}</span>
                <h3>{company.name}</h3>
                <p>{company.description}</p>
                <dl className="panem-ledger">
                  <div><dt>Price</dt><dd>{formatCredits(company.sharePrice)}</dd></div>
                  <div><dt>Daily change</dt><dd>{change(company.dailyChangePercent)}</dd></div>
                  <div><dt>District</dt><dd>{company.district}</dd></div>
                  <div><dt>Risk</dt><dd>{company.riskLevel}</dd></div>
                  <div><dt>Dividend</dt><dd>{(Number(company.dividendRate || 0) * 100).toFixed(1)}%</dd></div>
                  <div><dt>Status</dt><dd>{company.status}</dd></div>
                </dl>
                <div className="market-chart-row"><span>30-day proxy</span><i style={{ "--value": `${Math.max(8, Math.min(100, 50 + Number(company.dailyChangePercent || 0) * 4))}%` }} /></div>
                {wallet ? (
                  <div className="market-card-actions">
                    <form action="/stock-market/action" className="panem-inline-form" method="post">
                      <input name="intent" type="hidden" value="buy" />
                      <input name="ticker" type="hidden" value={company.ticker} />
                      <input defaultValue="1" min="1" name="shares" type="number" />
                      <button className="button button--solid-site" type="submit">Buy</button>
                    </form>
                    <form action="/stock-market/action" className="panem-inline-form" method="post">
                      <input name="intent" type="hidden" value="sell" />
                      <input name="ticker" type="hidden" value={company.ticker} />
                      <input defaultValue="1" min="1" name="shares" type="number" />
                      <button className="button" type="submit">Sell</button>
                    </form>
                    <form action="/stock-market/action" method="post">
                      <input name="intent" type="hidden" value="watch" />
                      <input name="ticker" type="hidden" value={company.ticker} />
                      <button className="button" type="submit">{wallet.stockWatchlist?.includes(company.ticker) ? "Unwatch" : "Watch"}</button>
                    </form>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Citizen Portfolio</p>
          <h2>Positions, Profit, Dividends</h2>
          <div className="panem-ledger-layout">
            <article className="panel">
              <h3>Owned Shares</h3>
              <ul className="government-mini-list">
                {dashboard.positions.length ? dashboard.positions.map((position) => (
                  <li key={position.ticker}>
                    <span>{position.ticker} / {position.shares} shares @ {formatCredits(position.averagePrice)}</span>
                    <strong>{formatCredits(position.currentValue)} / {change(position.profitLossPercent)}</strong>
                  </li>
                )) : <li><span>No stock positions.</span><strong>{formatCredits(0)}</strong></li>}
              </ul>
            </article>
            <article className="panel">
              <h3>Watchlist</h3>
              <ul className="government-mini-list">
                {(wallet?.stockWatchlist || []).length ? wallet.stockWatchlist.map((ticker) => {
                  const company = dashboard.companies.find((entry) => entry.ticker === ticker);
                  return <li key={ticker}><span>{ticker} / {company?.name || "Company"}</span><strong>{company ? formatCredits(company.sharePrice) : "Unknown"}</strong></li>;
                }) : <li><span>No watched companies.</span><strong>None</strong></li>}
              </ul>
            </article>
            <article className="panel">
              <h3>Richest Investors</h3>
              <ul className="government-mini-list">
                {dashboard.investorLeaderboard.map((entry, index) => <li key={entry.wallet.id}><span>{index + 1}. {entry.wallet.displayName}</span><strong>{formatCredits(entry.value)}</strong></li>)}
              </ul>
            </article>
          </div>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Market News</p>
          <h2>Government Contracts, Scandals, Crashes</h2>
          <div className="panem-ledger-layout">
            {dashboard.news.slice(0, 9).map((event) => (
              <article className="panel" key={event.id}>
                <h3>{event.title}</h3>
                <p>{event.tickers?.length ? event.tickers.join(", ") : "PSE-wide"} / {event.severity}</p>
                <strong>{change(Number(event.priceImpact || 0) * 100)}</strong>
              </article>
            ))}
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
