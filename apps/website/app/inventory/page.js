import { formatCredits, lootboxCrateDefaults, lootboxDailyGlobalLimit, lootboxDailyUserLimit } from "@wilford/shared";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getCurrentCitizen } from "../../lib/citizen-state";
import { getEconomyStore, getInventoryDashboard, getWallet } from "../../lib/panem-credit";

export const metadata = {
  title: "Inventory"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function rarityLabel(value) {
  return String(value || "common").replace(/^\w/, (letter) => letter.toUpperCase());
}

export default async function InventoryPage({ searchParams }) {
  const params = await searchParams;
  const [store, citizen] = await Promise.all([getEconomyStore(), getCurrentCitizen()]);
  const wallet = citizen ? getWallet(store, citizen.walletId || citizen.userId || citizen.discordId) : null;
  const dashboard = getInventoryDashboard(store, wallet);
  const today = new Date().toISOString().slice(0, 10);
  const globalOpenedToday = store.lootboxAllocationDate === today ? Number(store.globalLootboxesOpenedToday || 0) : 0;

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Panem Resource Registry"
        title="Inventory"
        description="Gather resources, preserve rare finds, list goods, and track collection value."
      />

      <main className="content content--wide finance-page inventory-page panem-credit-page">
        {!wallet ? (
          <section className="application-notice application-notice--error">
            <strong>Citizen Wallet Required</strong>
            <p>Open the Citizen Portal and link a Panem Credit wallet before using inventory actions.</p>
          </section>
        ) : null}
        {params?.saved ? (
          <section className="application-notice">
            <strong>Inventory Updated</strong>
            <p>The Resource Registry has recorded the action.</p>
          </section>
        ) : null}
        {params?.error ? (
          <section className="application-notice application-notice--error">
            <strong>Action Rejected</strong>
            <p>{params.error === "crate-allocation" ? "Daily Union crate allocation has been exhausted. Return tomorrow." : "Cooldown, slot limits, wallet status, balance, or item quantity prevented that action."}</p>
          </section>
        ) : null}

        <section className="market-hero-board scroll-fade">
          <article className="wallet-card panem-wallet-card">
            <p>Inventory Worth</p>
            <h2>{wallet?.displayName || "Citizen Inventory"}</h2>
            <div className="wallet-card__balance">{formatCredits(dashboard.totalWorth)}</div>
            <span>{dashboard.usedSlots} / {dashboard.maxSlots} slots used</span>
          </article>
          <article className="finance-panel">
            <p className="eyebrow">Collection Status</p>
            <div className="metric-grid">
              <span><strong>{dashboard.holdings.length}</strong> Item types</span>
              <span><strong>{wallet?.collectionScore || 0}</strong> Collection score</span>
              <span><strong>{wallet?.inventoryFlags?.length || 0}</strong> MSS flags</span>
              <span><strong>{formatCredits(wallet?.debt || 0)}</strong> Resource debt</span>
            </div>
            <p>Holding items can increase value, but rare stockpiles and contraband raise MSS raid risk. Selling to the state uses 5% inventory tax; marketplace sales are safer for storage but taxed at 15-25%.</p>
          </article>
          <article className="finance-panel">
            <p className="eyebrow">Lucky Crate</p>
            <h2>State Reward Crate</h2>
            <p>Daily Union crate allocation: {Math.max(0, lootboxDailyGlobalLimit - globalOpenedToday)} global / {lootboxDailyUserLimit} per citizen.</p>
            {wallet ? (
              <form action="/inventory/action" method="post">
                <input name="intent" type="hidden" value="crate" />
                <label className="public-application-field">
                  <span>Crate type</span>
                  <select name="crateId">
                    {lootboxCrateDefaults.map((crate) => (
                      <option key={crate.id} value={crate.id}>{crate.label} / {formatCredits(crate.price)}</option>
                    ))}
                  </select>
                </label>
                <button className="button button--solid-site" type="submit">Open Crate</button>
              </form>
            ) : null}
          </article>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Gathering Desk</p>
          <h2>District Resource Actions</h2>
          <div className="panem-market-grid">
            {dashboard.actions.map((action) => (
              <article className="premium-card panem-market-card" key={action.id}>
                <span className="court-role-badge">{action.district}</span>
                <h3>{action.name}</h3>
                <p>{action.failureText}</p>
                <dl className="panem-ledger">
                  <div><dt>Success chance</dt><dd>{Math.round(action.successChance * 100)}%</dd></div>
                  <div><dt>Cooldown</dt><dd>{action.cooldownHours}h</dd></div>
                  <div><dt>Risk events</dt><dd>{action.riskEvents.length}</dd></div>
                </dl>
                {wallet ? (
                  <form action="/inventory/action" method="post">
                    <input name="intent" type="hidden" value="gather" />
                    <input name="actionId" type="hidden" value={action.id} />
                    <button className="button button--solid-site" type="submit">Begin {action.name}</button>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Inventory Grid</p>
          <h2>Items, Value, and Actions</h2>
          <div className="inventory-grid">
            {dashboard.holdings.length ? dashboard.holdings.map((holding) => (
              <article className={`inventory-card inventory-card--${holding.rarity}`} key={holding.item.id}>
                <div className="inventory-card__icon" aria-hidden="true">{holding.item.name.slice(0, 1)}</div>
                <span className="court-role-badge">{rarityLabel(holding.rarity)}</span>
                <h3>{holding.item.name}</h3>
                <p>{holding.item.description}</p>
                <dl className="panem-ledger">
                  <div><dt>Quantity</dt><dd>{holding.quantity}</dd></div>
                  <div><dt>Unit value</dt><dd>{formatCredits(holding.value)}</dd></div>
                  <div><dt>Total</dt><dd>{formatCredits(holding.totalValue)}</dd></div>
                  <div><dt>Durability</dt><dd>{holding.durability ?? holding.item.durability ?? 100}%</dd></div>
                  <div><dt>Type</dt><dd>{holding.item.type}</dd></div>
                </dl>
                <div className="market-card-actions">
                  <form action="/inventory/action" className="panem-inline-form" method="post">
                    <input name="intent" type="hidden" value="sell-state" />
                    <input name="itemId" type="hidden" value={holding.item.id} />
                    <input defaultValue="1" min="1" max={holding.quantity} name="quantity" type="number" />
                    <button className="button button--solid-site" type="submit">Sell to State</button>
                  </form>
                  <form action="/inventory/action" className="panem-inline-form" method="post">
                    <input name="intent" type="hidden" value="list" />
                    <input name="itemId" type="hidden" value={holding.item.id} />
                    <input defaultValue="1" min="1" max={holding.quantity} name="quantity" type="number" />
                    <input defaultValue={holding.value} min="1" name="price" type="number" />
                    <button className="button" type="submit">List</button>
                  </form>
                </div>
              </article>
            )) : (
              <article className="panel">
                <h3>No Items Held</h3>
                <p>Gather, buy from the Marketplace, or open a crate to begin your collection.</p>
              </article>
            )}
          </div>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Competition</p>
          <h2>Collectors and Challenges</h2>
          <div className="panem-ledger-layout">
            <article className="panel">
              <h3>Rare Item Leaderboard</h3>
              <ul className="government-mini-list">
                {dashboard.rareLeaderboard.map((entry, index) => (
                  <li key={entry.wallet.id}><span>{index + 1}. {entry.wallet.displayName}</span><strong>{entry.score.toFixed(1)}</strong></li>
                ))}
              </ul>
            </article>
            <article className="panel">
              <h3>Achievements</h3>
              <ul className="government-mini-list">
                {(wallet?.achievements || []).length ? wallet.achievements.slice(0, 8).map((achievement) => (
                  <li key={achievement}><span>{achievement}</span><strong>Unlocked</strong></li>
                )) : <li><span>No achievements yet.</span><strong>Pending</strong></li>}
              </ul>
            </article>
            <article className="panel">
              <h3>Weekly Challenges</h3>
              <ul className="government-mini-list">
                {store.inventoryChallenges.map((challenge) => (
                  <li key={challenge.id}><span>{challenge.title}</span><strong>{formatCredits(challenge.reward)}</strong></li>
                ))}
              </ul>
            </article>
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
