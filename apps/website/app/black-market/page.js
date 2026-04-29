import { formatCredits } from "@wilford/shared";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getCurrentCitizen } from "../../lib/citizen-state";
import { getBlackMarketDashboard, getEconomyStore, getWallet } from "../../lib/panem-credit";

export const metadata = {
  title: "Black Market"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function BlackMarketPage({ searchParams }) {
  const params = await searchParams;
  const [store, citizen] = await Promise.all([getEconomyStore(), getCurrentCitizen()]);
  const wallet = citizen ? getWallet(store, citizen.walletId || citizen.userId || citizen.discordId) : null;
  const dashboard = getBlackMarketDashboard(store, wallet);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Underground Exchange"
        title="Black Market"
        description="High-profit contraband, smuggling routes, and MSS risk across Capitol and district enforcement zones."
      />

      <main className="content content--wide finance-page inventory-page panem-credit-page">
        {!wallet ? (
          <section className="application-notice application-notice--error">
            <strong>Citizen Wallet Required</strong>
            <p>Sign in through the Citizen Portal before entering the underground exchange.</p>
          </section>
        ) : null}
        {params?.saved ? (
          <section className="application-notice"><strong>Underground Ledger Updated</strong><p>The deal has been recorded. MSS may also have noticed.</p></section>
        ) : null}
        {params?.error ? (
          <section className="application-notice application-notice--error"><strong>Deal Failed</strong><p>Wallet status, balance, inventory, route, or supply prevented that action.</p></section>
        ) : null}

        <section className="market-hero-board scroll-fade">
          <article className="wallet-card panem-wallet-card">
            <p>Security Heat</p>
            <h2>{dashboard.suspicion.status}</h2>
            <div className="wallet-card__balance">{dashboard.suspicion.score}/100</div>
            <span>{dashboard.profile.label}</span>
          </article>
          <article className="finance-panel">
            <p className="eyebrow">Capitol vs Districts</p>
            <h2>{wallet?.district || "Unassigned"}</h2>
            <p>Capitol routes are safer for official commerce but face higher taxes and stronger MSS detection. District routes have lower taxes, more production, and more underground activity.</p>
          </article>
          <article className="finance-panel">
            <p className="eyebrow">Risk Rules</p>
            <div className="metric-grid">
              <span><strong>{dashboard.profile.detectionModifier >= 0 ? "+" : ""}{Math.round(dashboard.profile.detectionModifier * 100)}%</strong> MSS detection</span>
              <span><strong>{dashboard.profile.taxModifier >= 0 ? "+" : ""}{Math.round(dashboard.profile.taxModifier * 100)}%</strong> tax pressure</span>
              <span><strong>{dashboard.profile.activityModifier >= 0 ? "+" : ""}{Math.round(dashboard.profile.activityModifier * 100)}%</strong> underground activity</span>
              <span><strong>{wallet?.holdings?.length || 0}</strong> held item types</span>
            </div>
          </article>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Illegal Goods</p>
          <h2>Contraband Exchange</h2>
          <div className="panem-market-grid">
            {dashboard.goods.map((good) => (
              <article className="premium-card panem-market-card" key={good.id}>
                <span className="court-role-badge">{good.district} / {good.rarity}</span>
                <h3>{good.name}</h3>
                <p>{good.description}</p>
                <dl className="panem-ledger">
                  <div><dt>Price</dt><dd>{formatCredits(good.price)}</dd></div>
                  <div><dt>Supply</dt><dd>{good.stock}</dd></div>
                  <div><dt>MSS detection</dt><dd>{Math.round(good.detectionChance * 100)}%</dd></div>
                  <div><dt>Category</dt><dd>{good.category}</dd></div>
                </dl>
                {wallet ? (
                  <form action="/black-market/action" className="panem-inline-form" method="post">
                    <input name="intent" type="hidden" value="buy" />
                    <input name="goodId" type="hidden" value={good.id} />
                    <input defaultValue="1" min="1" max={good.stock} name="quantity" type="number" />
                    <button className="button button--danger-site" type="submit">Buy Illegally</button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        {wallet ? (
          <section className="state-section scroll-fade">
            <p className="eyebrow">Smuggling</p>
            <h2>Move Goods Between Districts</h2>
            <form action="/black-market/action" className="panel public-application-form" method="post">
              <input name="intent" type="hidden" value="smuggle" />
              <div className="public-application-grid public-application-grid--three">
                <label className="public-application-field">
                  <span>Goods</span>
                  <select name="itemId">
                    {(wallet.holdings || []).map((holding) => {
                      const item = store.inventoryItems.find((entry) => entry.id === holding.itemId) || store.marketItems.find((entry) => entry.id === holding.itemId);
                      return <option key={holding.itemId} value={holding.itemId}>{item?.name || holding.itemId} / held {holding.quantity}</option>;
                    })}
                  </select>
                </label>
                <label className="public-application-field"><span>Quantity</span><input defaultValue="1" min="1" name="quantity" type="number" /></label>
                <label className="public-application-field">
                  <span>Destination district</span>
                  <select name="destinationDistrict">
                    {dashboard.smugglingRoutes.map((district) => <option key={district.id} value={district.name}>{district.name}</option>)}
                  </select>
                </label>
              </div>
              <button className="button button--danger-site" type="submit">Run Smuggling Route</button>
            </form>
          </section>
        ) : null}
      </main>
    </SiteLayout>
  );
}
