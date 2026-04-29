import {
  formatCredits,
  taxLabel
} from "@wilford/shared";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getCurrentCitizen } from "../../lib/citizen-state";
import { getEconomyStore, getMarketDashboard, getWallet } from "../../lib/panem-credit";

export const metadata = {
  title: "Marketplace"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function signedPercent(value) {
  const amount = Number(value || 0);
  return `${amount > 0 ? "+" : ""}${amount.toFixed(1)}%`;
}

function categoryClass(category) {
  return String(category || "standard").toLowerCase().replace(/[^a-z0-9]+/g, "-");
}

export default async function MarketplacePage({ searchParams }) {
  const params = await searchParams;
  const [store, citizen] = await Promise.all([getEconomyStore(), getCurrentCitizen()]);
  const wallet = citizen ? getWallet(store, citizen.walletId || citizen.userId || citizen.discordId) : null;
  const dashboard = getMarketDashboard(store);
  const activeListings = store.listings.filter((listing) => listing.status === "active").slice(0, 16);
  const activeEvent = store.events.find((event) => event.status === "active") || store.events[0];

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Panem Credit Exchange"
        title="Marketplace"
        description="District production, citizen listings, state notices, and live Panem Credit pricing."
      />

      <main className="content content--wide finance-page panem-credit-page marketplace-page">
        {params?.saved ? (
          <section className="application-notice">
            <strong>Market Ledger Updated</strong>
            <p>The exchange has recorded the action.</p>
          </section>
        ) : null}
        {params?.error ? (
          <section className="application-notice application-notice--error">
            <strong>Market Action Rejected</strong>
            <p>Balance, holdings, stock, listing status, or account restrictions prevented that trade.</p>
          </section>
        ) : null}

        <section className="market-hero-board scroll-fade">
          <article className="wallet-card panem-wallet-card">
            <p>Market Overview</p>
            <h2>{activeEvent?.title || "Standard Treasury Cycle"}</h2>
            <div className="wallet-card__balance">{formatCredits(dashboard.totalTradeVolumeToday)}</div>
            <span>Trade volume today</span>
            <p>{activeEvent?.summary || "Normal market conditions remain in effect."}</p>
          </article>
          <article className="finance-panel">
            <p className="eyebrow">Exchange Signals</p>
            <div className="metric-grid">
              <span><strong>{dashboard.mostActiveDistrict?.name || "Unassigned"}</strong> Most active district</span>
              <span><strong>{dashboard.richestTraderToday?.displayName || "No trades"}</strong> Richest trader today</span>
              <span><strong>{dashboard.activeShortages.length}</strong> Active shortages</span>
              <span><strong>{store.listings.filter((listing) => listing.status === "active").length}</strong> Citizen listings</span>
            </div>
          </article>
          <article className="finance-panel">
            <p className="eyebrow">Market Notices</p>
            <ul className="government-mini-list">
              {dashboard.notices.map((notice) => (
                <li key={notice.id}>
                  <span>{notice.title}</span>
                  <strong>{notice.severity}</strong>
                </li>
              ))}
            </ul>
          </article>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Price Movement</p>
          <h2>Top Gainers and Biggest Drops</h2>
          <div className="panem-ledger-layout">
            <article className="panel">
              <h3>Top Gaining Goods</h3>
              <ul className="government-mini-list">
                {dashboard.topGainers.map((item) => (
                  <li key={item.id}><span>{item.name} / {item.district}</span><strong>{signedPercent(item.changePercent)}</strong></li>
                ))}
              </ul>
            </article>
            <article className="panel">
              <h3>Biggest Price Drops</h3>
              <ul className="government-mini-list">
                {dashboard.priceDrops.map((item) => (
                  <li key={item.id}><span>{item.name} / {item.district}</span><strong>{signedPercent(item.changePercent)}</strong></li>
                ))}
              </ul>
            </article>
            <article className="panel">
              <h3>Active Shortages</h3>
              <ul className="government-mini-list">
                {dashboard.activeShortages.length ? dashboard.activeShortages.map((item) => (
                  <li key={item.id}><span>{item.name}</span><strong>Stock {item.stock}</strong></li>
                )) : <li><span>No shortage notices.</span><strong>Stable</strong></li>}
              </ul>
            </article>
          </div>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">District Production Board</p>
          <h2>Output, Demand, Rank</h2>
          <div className="panem-district-grid">
            {dashboard.districtRows.map((district) => (
              <article className="finance-panel panem-district-card" key={district.id}>
                <p className="eyebrow">Trade Rank #{district.tradeRank}</p>
                <h3>{district.name}</h3>
                <p>{district.goodsProduced}</p>
                <div className="finance-bars">
                  <div className="finance-bar"><span>Production</span><i style={{ "--value": `${Math.min(100, district.output)}%` }} /></div>
                  <div className="finance-bar"><span>Demand</span><i style={{ "--value": `${Math.min(100, Number(district.demandLevel || 0))}%` }} /></div>
                  <div className="finance-bar"><span>Prosperity</span><i style={{ "--value": `${Math.min(100, Number(district.prosperityRating || 0))}%` }} /></div>
                </div>
                <dl className="panem-ledger">
                  <div><dt>Price multiplier</dt><dd>x{district.multiplier.toFixed(2)}</dd></div>
                  <div><dt>Recent change</dt><dd>{signedPercent(district.changePercent)}</dd></div>
                </dl>
                {wallet ? (
                  <form action="/marketplace/action" method="post">
                    <input name="intent" type="hidden" value="favourite-district" />
                    <input name="district" type="hidden" value={district.name} />
                    <button className="button" type="submit">
                      {wallet.favouriteDistricts?.includes(district.name) ? "Unfavourite" : "Favourite"}
                    </button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Goods Exchange</p>
          <h2>State Stock and Speculation Desk</h2>
          <div className="panem-market-grid">
            {dashboard.items.map((item) => (
              <article className={`premium-card panem-market-card market-category-${categoryClass(item.category)}`} key={item.id}>
                <span className="court-role-badge">{item.district}</span>
                <h3>{item.name}</h3>
                <p>{item.description}</p>
                <dl className="panem-ledger">
                  <div><dt>Price</dt><dd>{formatCredits(item.currentPrice)}</dd></div>
                  <div><dt>24h change</dt><dd>{signedPercent(item.changePercent)}</dd></div>
                  <div><dt>Stock</dt><dd>{item.stock}</dd></div>
                  <div><dt>Rarity</dt><dd>{item.rarity}</dd></div>
                  <div><dt>Tax</dt><dd>{taxLabel(item.category === "Luxury Goods" ? "luxury_goods_tax" : "trade_tax")} {(item.taxRate * 100).toFixed(1)}%</dd></div>
                </dl>
                {wallet ? (
                  <div className="market-card-actions">
                    <form action="/marketplace/action" className="panem-inline-form" method="post">
                      <input name="intent" type="hidden" value="buy" />
                      <input name="itemId" type="hidden" value={item.id} />
                      <input defaultValue="1" min="1" name="quantity" type="number" />
                      <button className="button button--solid-site" type="submit">Buy</button>
                    </form>
                    <form action="/marketplace/action" method="post">
                      <input name="intent" type="hidden" value="watch-item" />
                      <input name="itemId" type="hidden" value={item.id} />
                      <button className="button" type="submit">{wallet.watchlist?.includes(item.id) ? "Unwatch" : "Watch"}</button>
                    </form>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Citizen Listings</p>
          <h2>Peer Exchange</h2>
          {wallet ? (
            <form action="/marketplace/action" className="panel public-application-form" method="post">
              <input name="intent" type="hidden" value="sell" />
              <div className="public-application-grid public-application-grid--three">
                <label className="public-application-field">
                  <span>Good</span>
                  <select name="itemId">
                    {store.marketItems.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                  </select>
                </label>
                <label className="public-application-field"><span>Quantity</span><input defaultValue="1" min="1" name="quantity" type="number" /></label>
                <label className="public-application-field"><span>Asking price</span><input min="1" name="price" required type="number" /></label>
              </div>
              <button className="button button--solid-site" type="submit">Place Listing</button>
            </form>
          ) : null}
          <div className="panem-ledger-layout marketplace-listings">
            {activeListings.map((listing) => {
              const item = store.marketItems.find((entry) => entry.id === listing.itemId) || store.inventoryItems.find((entry) => entry.id === listing.itemId);
              const seller = store.wallets.find((entry) => entry.id === listing.sellerWalletId);
              return (
                <article className="panel" key={listing.id}>
                  <h3>{item?.name || "Market Item"}</h3>
                  <ul className="government-mini-list">
                    <li><span>Seller</span><strong>{seller?.displayName || "Citizen"}</strong></li>
                    <li><span>Quantity</span><strong>{listing.quantity}</strong></li>
                    <li><span>Asking price</span><strong>{formatCredits(listing.price)}</strong></li>
                    <li><span>District</span><strong>{item?.district || seller?.district || "Unassigned"}</strong></li>
                  </ul>
                  {wallet && seller?.id !== wallet.id ? (
                    <form action="/marketplace/action" className="panem-inline-form" method="post">
                      <input name="intent" type="hidden" value="buy-listing" />
                      <input name="listingId" type="hidden" value={listing.id} />
                      <input defaultValue="1" min="1" max={listing.quantity} name="quantity" type="number" />
                      <button className="button button--solid-site" type="submit">Buy Now</button>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Trade Charts</p>
          <h2>Market Motion</h2>
          <div className="panem-ledger-layout market-chart-grid">
            <article className="panel">
              <h3>Price History Proxy</h3>
              {dashboard.topGainers.map((item) => <div className="market-chart-row" key={item.id}><span>{item.name}</span><i style={{ "--value": `${Math.min(100, 50 + item.changePercent)}%` }} /></div>)}
            </article>
            <article className="panel">
              <h3>District Output Trends</h3>
              {dashboard.districtRows.slice(0, 6).map((district) => <div className="market-chart-row" key={district.id}><span>{district.name}</span><i style={{ "--value": `${Math.min(100, district.output)}%` }} /></div>)}
            </article>
            <article className="panel">
              <h3>Tax and Inflation Pressure</h3>
              {Object.entries(store.taxRates).slice(0, 6).map(([key, rate]) => <div className="market-chart-row" key={key}><span>{taxLabel(key)}</span><i style={{ "--value": `${Math.min(100, Number(rate) * 500)}%` }} /></div>)}
            </article>
          </div>
        </section>

        {wallet ? (
          <section className="state-section scroll-fade">
            <p className="eyebrow">Citizen Portfolio</p>
            <h2>Holdings and Alerts</h2>
            <div className="panem-ledger-layout">
              <article className="panel">
                <h3>Your Holdings</h3>
                <ul className="government-mini-list">
                  {(wallet.holdings || []).length ? wallet.holdings.map((holding) => {
                    const item = store.marketItems.find((entry) => entry.id === holding.itemId);
                    return <li key={holding.itemId}><span>{item?.name || holding.itemId}</span><strong>{holding.quantity} @ {formatCredits(holding.averageCost)}</strong></li>;
                  }) : <li><span>No goods held.</span><strong>Empty</strong></li>}
                </ul>
              </article>
              <article className="panel">
                <h3>Watchlist</h3>
                <ul className="government-mini-list">
                  {(wallet.watchlist || []).length ? wallet.watchlist.map((itemId) => {
                    const item = store.marketItems.find((entry) => entry.id === itemId);
                    return <li key={itemId}><span>{item?.name || itemId}</span><strong>{item ? formatCredits(item.currentPrice) : "Unknown"}</strong></li>;
                  }) : <li><span>No watched goods.</span><strong>None</strong></li>}
                </ul>
              </article>
              <form action="/marketplace/action" className="panel public-application-form" method="post">
                <input name="intent" type="hidden" value="market-alerts" />
                <h3>Market Alerts</h3>
                <label className="public-application-field">
                  <span>Alert status</span>
                  <select defaultValue={wallet.marketAlerts === false ? "off" : "on"} name="alerts">
                    <option value="on">On</option>
                    <option value="off">Off</option>
                  </select>
                </label>
                <button className="button button--solid-site" type="submit">Save Alerts</button>
              </form>
            </div>
          </section>
        ) : null}
      </main>
    </SiteLayout>
  );
}
