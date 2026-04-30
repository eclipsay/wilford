import Link from "next/link";
import {
  economyJobDefaults,
  formatCredits,
  getJobAccess,
  lootboxCrateDefaults,
  lootboxDailyGlobalLimit,
  lootboxDailyUserLimit,
  normalizeEconomyDistrict
} from "@wilford/shared";
import { PageHero } from "../../../components/PageHero";
import { SiteLayout } from "../../../components/SiteLayout";
import { getCurrentCitizen } from "../../../lib/citizen-state";
import {
  getBlackMarketDashboard,
  getCraftingDashboard,
  getEconomyStore,
  getInventoryDashboard,
  getMarketDashboard,
  getSecurityDashboard,
  getStockMarketDashboard,
  getWallet
} from "../../../lib/panem-credit";
import { EconomyHubClient } from "./EconomyHubClient";

export const metadata = { title: "Panem Economy Hub" };
export const dynamic = "force-dynamic";
export const revalidate = 0;

function change(value) {
  const amount = Number(value || 0);
  return `${amount > 0 ? "+" : ""}${amount.toFixed(1)}%`;
}

function itemIcon(name = "") {
  return String(name || "?").slice(0, 1).toUpperCase();
}

function progress(value) {
  return `${Math.max(0, Math.min(100, Math.round(Number(value || 0))))}%`;
}

function xpProgress(xp = 0) {
  return progress(Number(xp || 0) % 100);
}

function recentWalletTransactions(store, wallet) {
  return (store.transactions || []).filter((transaction) =>
    transaction.fromWalletId === wallet?.id || transaction.toWalletId === wallet?.id
  );
}

function lastTransaction(store, wallet, type) {
  return recentWalletTransactions(store, wallet).find((transaction) => transaction.type === type);
}

function hasRecentType(store, wallet, type, sinceMs = 24 * 60 * 60 * 1000) {
  return recentWalletTransactions(store, wallet).some((transaction) =>
    transaction.type === type && Date.now() - Date.parse(transaction.createdAt || 0) < sinceMs
  );
}

function statusFromTransaction(transaction, fallback) {
  if (!transaction) return fallback;
  return transaction.reason || fallback;
}

function cooldownStatus(store, wallet, type, key, cooldownHours = 0) {
  const transaction = (store.transactions || []).find((entry) =>
    entry.type === type &&
    entry.meta?.key === key &&
    (entry.fromWalletId === wallet?.id || entry.toWalletId === wallet?.id)
  );
  if (!transaction || !cooldownHours) return "Ready now";
  const readyAt = Date.parse(transaction.createdAt || 0) + Number(cooldownHours || 0) * 60 * 60 * 1000;
  const remaining = readyAt - Date.now();
  if (remaining <= 0) return "Ready now";
  const hours = Math.ceil(remaining / (60 * 60 * 1000));
  return `${hours}h cooldown`;
}

function resultPanel(params, store, wallet) {
  if (!params?.saved && !params?.error) return null;
  const type = {
    daily: "daily_stipend",
    job: "set_job",
    work: "work",
    gather: "gather",
    crate: "lootbox",
    craft: "crafting",
    buy: "market_buy",
    sell: "market_sell",
    listing: "listing_buy",
    stock: "stock_buy",
    "stock-buy": "stock_buy",
    "stock-sell": "stock_sell",
    black: "black-market",
    smuggle: "black-market"
  }[params.saved] || "";
  const transaction = type ? lastTransaction(store, wallet, type) : null;
  const failed = params.error || transaction?.meta?.failed || transaction?.meta?.success === false;
  const title = params.error ? "Operation Blocked" : "Operation Complete";
  const detail = params.error
    ? `Reason: ${String(params.error).replace(/-/g, " ")}.`
    : statusFromTransaction(transaction, "Your economy action has been recorded.");
  const itemFound = transaction?.meta?.itemRewardId || transaction?.meta?.itemId || transaction?.meta?.outputItemId;
  const suggested = params.saved === "crate" ? "Check Inventory Vault, then craft, sell, or list the reward." :
    params.saved === "gather" ? "Use the item in Crafting or sell it to the State." :
    params.saved === "work" ? "Spend credits at the Marketplace or build a stock position." :
      params.saved === "craft" ? "List the crafted good or check district demand." :
        "Open the Command Deck and pick the next available tile.";

  return (
    <section className={`economy-result ${failed ? "economy-result--risk" : ""}`}>
      <div className="economy-result__pulse" aria-hidden="true" />
      <div>
        <p className="eyebrow">{params.saved ? "Result Screen" : "Try Again"}</p>
        <h2>{title}</h2>
        <p>{detail}</p>
      </div>
      <div className="economy-result__stats">
        <span><strong>{transaction ? formatCredits(transaction.amount || 0) : "0 PC"}</strong> credits moved</span>
        <span><strong>{itemFound || "None"}</strong> item result</span>
        <span><strong>{transaction?.taxAmount ? formatCredits(transaction.taxAmount) : "0 PC"}</strong> tax / fee</span>
        <span><strong>{transaction?.meta?.riskId || transaction?.meta?.detected ? "Triggered" : "Clear"}</strong> risk event</span>
      </div>
      <p className="economy-result__next">{suggested}</p>
    </section>
  );
}

function Mission({ done, title, reward }) {
  return (
    <li className={done ? "economy-mission economy-mission--done" : "economy-mission"}>
      <span>{done ? "Done" : "Open"}</span>
      <strong>{title}</strong>
      <small>{reward}</small>
    </li>
  );
}

export default async function EconomyHubPage({ searchParams }) {
  const params = await searchParams;
  const [store, citizen] = await Promise.all([getEconomyStore(), getCurrentCitizen()]);
  const wallet = citizen ? getWallet(store, citizen.walletId || citizen.userId || citizen.discordId || citizen.id) : null;

  if (!citizen || !wallet) {
    return (
      <SiteLayout>
        <PageHero eyebrow="Citizen Portal" title="Panem Economy Hub" description="A playable WPU command deck for Panem Credit, labour, gathering, crafting, and trade." />
        <main className="content content--wide economy-game-page">
          <section className="application-notice application-notice--error">
            <strong>Citizen Wallet Required</strong>
            <p>Sign in through the Citizen Portal before playing the economy hub.</p>
          </section>
          <Link className="button button--solid-site" href="/citizen-portal">Enter Citizen Portal</Link>
        </main>
      </SiteLayout>
    );
  }

  const currentDistrict = normalizeEconomyDistrict(citizen.district || wallet.district || "The Capitol");
  const jobWallet = { ...wallet, district: currentDistrict };
  const selectedJob = economyJobDefaults.find((job) => job.id === wallet.selectedJobId && getJobAccess(jobWallet, job, { district: currentDistrict }).allowed) ||
    economyJobDefaults.find((job) => getJobAccess(jobWallet, job, { district: currentDistrict }).allowed) ||
    economyJobDefaults[0];
  const availableJobs = economyJobDefaults
    .map((job) => ({ ...job, access: getJobAccess(jobWallet, job, { district: currentDistrict }) }))
    .filter((job) => job.access.allowed)
    .sort((a, b) => Number(b.access.native) - Number(a.access.native) || a.district.localeCompare(b.district))
    .slice(0, 8);
  const inventory = getInventoryDashboard(store, wallet);
  const crafting = getCraftingDashboard(store, wallet);
  const market = getMarketDashboard(store);
  const stocks = getStockMarketDashboard(store, wallet);
  const blackMarket = getBlackMarketDashboard(store, wallet);
  const security = getSecurityDashboard(store, wallet);
  const listings = (store.listings || []).filter((listing) => listing.status === "active");
  const ownListings = listings.filter((listing) => listing.sellerWalletId === wallet.id);
  const activeEvent = store.events.find((event) => event.status === "active") || store.events[0];
  const topDistricts = market.districtRows.slice(0, 8);
  const today = new Date().toISOString().slice(0, 10);
  const dailyClaimed = Array.isArray(wallet.loginDays) && wallet.loginDays.includes(today);
  const globalCratesOpened = store.lootboxAllocationDate === today ? Number(store.globalLootboxesOpenedToday || 0) : 0;
  const userCratesOpened = store.lootboxAllocationDate === today ? Number(store.perUserLootboxesOpenedToday?.[wallet.id] || 0) : 0;
  const remainingGlobalCrates = Math.max(0, lootboxDailyGlobalLimit - globalCratesOpened);
  const remainingUserCrates = Math.max(0, lootboxDailyUserLimit - userCratesOpened);
  const suspicionScore = Number(security.current?.score || wallet.suspicionLevel || 0);
  const energy = Math.max(28, 100 - Math.min(72, recentWalletTransactions(store, wallet).filter((entry) => Date.now() - Date.parse(entry.createdAt || 0) < 6 * 60 * 60 * 1000).length * 9));
  const taxPaid = (store.taxRecords || []).some((record) => record.walletId === wallet.id && Date.now() - Date.parse(record.createdAt || 0) < 24 * 60 * 60 * 1000);
  const missions = [
    ["Work one shift", hasRecentType(store, wallet, "work"), "+75 XP / 80 PC"],
    ["Gather one item", hasRecentType(store, wallet, "gather"), "+40 XP / loot roll"],
    ["Sell one item", hasRecentType(store, wallet, "market_sell") || hasRecentType(store, wallet, "inventory_sell"), "+35 XP / PC"],
    ["Pay tax", taxPaid || wallet.taxStatus === "compliant", "Compliance badge"],
    ["Open market", Boolean(params.saved === "buy" || params.saved === "listing" || ownListings.length), "+25 XP / prices"]
  ];
  const completedMissions = missions.filter((mission) => mission[1]).length;
  const hubCards = [
    ["WK", "Work District", "Run a shift, gain credits, build job XP, and risk assignment events.", selectedJob?.name || "Choose a job", "#work-game", "Start Work", "work"],
    ["RF", "Resource Fields", "Fish, mine, farm, or scavenge for rarity-based item drops.", cooldownStatus(store, wallet, "gather", inventory.actions[0]?.id, inventory.actions[0]?.cooldownHours), "#gather-game", "Gather", "gather"],
    ["IV", "Inventory Vault", "Manage item cards, rarity, quantities, state sales, and listings.", `${inventory.holdings.length} item types`, "#inventory-game", "Open Vault", "inventory"],
    ["CW", "Crafting Workshop", "Spend materials against success chances for higher-value outputs.", `Level ${crafting.craftingLevel}`, "#craft-game", "Craft", "craft"],
    ["ME", "Marketplace Exchange", "Buy official goods and monitor district supply and demand.", `${listings.length} live listings`, "#market-game", "Trade", "market"],
    ["SE", "Stock Exchange", "Buy shares, sell positions, and react to PSE movement.", `${stocks.positions.length} positions`, "#stock-game", "Invest", "stock"],
    ["BM", "Black Market", "High reward contraband with MSS detection danger.", `${blackMarket.suspicion.status} risk`, "#black-market-game", "Enter", "black"],
    ["DC", "District Command", "Inspect shortages, output, rankings, and market impact.", `${topDistricts[0]?.name || "Panem"} active`, "#district-game", "Inspect", "district"]
  ];

  return (
    <SiteLayout>
      <EconomyHubClient />
      <PageHero
        eyebrow="Citizen Portal"
        title="Panem Economy Hub"
        description="A WPU command deck for work, resources, inventory, crafting, markets, stocks, and district control."
      />
      <main className="content content--wide economy-game-page">
        {resultPanel(params, store, wallet)}

        <section className="economy-command-deck scroll-fade">
          <article className="economy-profile-card">
            <p className="eyebrow">Citizen Profile</p>
            <h2>{wallet.displayName}</h2>
            <div className="economy-balance">{formatCredits(wallet.balance)}</div>
            <dl className="economy-stat-list">
              <div><dt>District</dt><dd>{currentDistrict}</dd></div>
              <div><dt>Current job</dt><dd>{selectedJob.name}</dd></div>
              <div><dt>Daily streak</dt><dd>{wallet.streak || 0} days</dd></div>
              <div><dt>Event</dt><dd>{activeEvent?.title || "Standard Cycle"}</dd></div>
            </dl>
          </article>

          <article className="economy-command-panel">
            <div className="economy-panel-heading">
              <p className="eyebrow">Vitals</p>
              <strong>Level {wallet.jobLevel || 1}</strong>
            </div>
            <div className="economy-meter"><span>Job XP</span><i style={{ "--value": xpProgress(wallet.jobXp) }} /></div>
            <div className="economy-meter"><span>Craft XP</span><i style={{ "--value": xpProgress(wallet.craftingXp) }} /></div>
            <div className="economy-meter"><span>Energy</span><i style={{ "--value": progress(energy) }} /></div>
            <div className="economy-meter economy-meter--risk"><span>Suspicion</span><i style={{ "--value": progress(suspicionScore) }} /></div>
            <div className="economy-badge-row">
              <span>{dailyClaimed ? "Daily claimed" : "Daily ready"}</span>
              <span>{security.current?.status || "Clear"}</span>
              <span>{inventory.usedSlots}/{inventory.maxSlots || 40} slots</span>
            </div>
          </article>

          <article className="economy-next-panel">
            <p className="eyebrow">What should I do next?</p>
            <h2>{inventory.holdings.length ? "Craft, sell, or list your best item." : "Start with Resource Fields, then Work District."}</h2>
            <p>Simple loop: gather materials, work for Panem Credit, craft better goods, sell or invest the profit, then watch district events.</p>
            <form action="/panem-credit/action" className="economy-command-form economy-daily-form" method="post">
              <input name="source" type="hidden" value="economy-hub" />
              <input name="intent" type="hidden" value="daily" />
              <button className="button button--solid-site economy-run-button" disabled={dailyClaimed} type="submit">{dailyClaimed ? "Daily Claimed" : "Claim Daily"}</button>
            </form>
          </article>
        </section>

        <section className="economy-mission-board scroll-fade" id="missions-game">
          <div>
            <p className="eyebrow">Daily Missions</p>
            <h2>{completedMissions}/{missions.length} complete</h2>
          </div>
          <ul>
            {missions.map(([title, done, reward]) => <Mission done={done} key={title} reward={reward} title={title} />)}
          </ul>
        </section>

        <section className="economy-card-grid economy-map-grid scroll-fade" aria-label="Panem Economy Hub command map">
          {hubCards.map(([icon, title, text, status, href, action, tone]) => (
            <a className={`economy-hub-card economy-hub-card--${tone}`} href={href} key={title}>
              <span className="economy-hub-card__icon" aria-hidden="true">{icon}</span>
              <h3>{title}</h3>
              <p>{text}</p>
              <small>{status}</small>
              <strong>{action}</strong>
            </a>
          ))}
        </section>

        <section className="economy-game-section scroll-fade" id="work-game">
          <div className="economy-section-heading">
            <p className="eyebrow">Work Mini-Game</p>
            <h2>Choose a job card, start a shift, then collect credits, XP, item finds, or a risk event.</h2>
          </div>
          <div className="economy-play-layout">
            <article className="economy-action-card economy-action-card--featured">
              <span className="court-role-badge">{selectedJob.district}</span>
              <h3>{selectedJob.name}</h3>
              <p>{selectedJob.description}</p>
              <div className="economy-meter"><span>Shift readiness</span><i style={{ "--value": cooldownStatus(store, wallet, "work", selectedJob.id, selectedJob.cooldownHours) === "Ready now" ? "100%" : "34%" }} /></div>
              <dl className="panem-ledger">
                <div><dt>Payout</dt><dd>{formatCredits(selectedJob.minReward)} - {formatCredits(selectedJob.maxReward)}</dd></div>
                <div><dt>Risk</dt><dd>{selectedJob.riskLevel}</dd></div>
                <div><dt>Cooldown</dt><dd>{cooldownStatus(store, wallet, "work", selectedJob.id, selectedJob.cooldownHours)}</dd></div>
                <div><dt>XP</dt><dd>Job XP on success</dd></div>
              </dl>
              <form action="/panem-credit/action" className="economy-command-form economy-action-form" method="post">
                <input name="source" type="hidden" value="economy-hub" />
                <input name="intent" type="hidden" value="work" />
                <input name="jobId" type="hidden" value={selectedJob.id} />
                <button className="button button--solid-site economy-run-button" type="submit">Start Shift</button>
              </form>
              <p className="economy-action-hint">Result screen shows credits, items, XP, risk, cooldown, and the next suggested move.</p>
            </article>
            <div className="economy-mini-grid">
              {availableJobs.map((job) => (
                <article className="economy-action-card economy-job-card" key={job.id}>
                  <span className="court-role-badge">{job.access.label}</span>
                  <h3>{job.name}</h3>
                  <p>{job.description}</p>
                  <dl className="panem-ledger">
                    <div><dt>Payout</dt><dd>{formatCredits(job.minReward)} - {formatCredits(job.maxReward)}</dd></div>
                    <div><dt>Risk</dt><dd>{job.riskLevel}</dd></div>
                  </dl>
                  <form action="/panem-credit/action" className="economy-command-form" method="post">
                    <input name="source" type="hidden" value="economy-hub" />
                    <input name="intent" type="hidden" value="set-job" />
                    <input name="jobId" type="hidden" value={job.id} />
                    <button className="button" type="submit">{wallet.selectedJobId === job.id ? "Current Job" : "Choose Job"}</button>
                  </form>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="economy-game-section scroll-fade" id="gather-game">
          <div className="economy-section-heading">
            <p className="eyebrow">Gathering Mini-Game</p>
            <h2>Pick a field action and roll for common drops, rare finds, failure, or danger.</h2>
          </div>
          <div className="economy-card-grid economy-card-grid--compact">
            {inventory.actions.map((action) => (
              <article className="economy-location-card" key={action.id}>
                <div className="economy-location-card__art"><span>{itemIcon(action.name)}</span></div>
                <span className="court-role-badge">{action.district}</span>
                <h3>{action.name}</h3>
                <p>{action.failureText}</p>
                <div className="economy-rarity-strip">
                  <span className="rarity-common">Common</span>
                  <span className="rarity-uncommon">Uncommon</span>
                  <span className="rarity-rare">Rare</span>
                  <span className="rarity-epic">Epic</span>
                </div>
                <dl className="panem-ledger">
                  <div><dt>Success</dt><dd>{Math.round(action.successChance * 100)}%</dd></div>
                  <div><dt>Cooldown</dt><dd>{cooldownStatus(store, wallet, "gather", action.id, action.cooldownHours)}</dd></div>
                  <div><dt>Danger</dt><dd>{action.riskEvents.length} events</dd></div>
                </dl>
                <form action="/inventory/action" className="economy-command-form" method="post">
                  <input name="source" type="hidden" value="economy-hub" />
                  <input name="intent" type="hidden" value="gather" />
                  <input name="actionId" type="hidden" value={action.id} />
                  <button className="button button--solid-site economy-run-button" type="submit">Roll Gather</button>
                </form>
              </article>
            ))}
          </div>
        </section>

        <section className="economy-game-section scroll-fade" id="inventory-game">
          <div className="economy-section-heading">
            <p className="eyebrow">Inventory Vault</p>
            <h2>Open Union crates, then manage rarity cards, quantities, value, and the next useful action.</h2>
          </div>
          <div className="economy-card-grid economy-card-grid--compact economy-crate-grid">
            {lootboxCrateDefaults.map((crate) => (
              <article className="economy-action-card economy-crate-card" key={crate.id}>
                <span className="court-role-badge">Union Crate</span>
                <h3>{crate.label}</h3>
                <p>Paid reward crate with rarity rolls, daily allocation limits, and possible tax penalties on low rolls.</p>
                <div className="economy-rarity-strip">
                  <span className="rarity-common">Common</span>
                  <span className="rarity-rare">Rare {Math.round(Number(crate.rareChance || 0) * 100)}%</span>
                  <span className="rarity-epic">Epic {Math.round(Number(crate.epicChance || 0) * 100)}%</span>
                  <span className="rarity-legendary">Legendary {Math.round(Number(crate.legendaryChance || 0) * 100)}%</span>
                </div>
                <dl className="panem-ledger">
                  <div><dt>Cost</dt><dd>{formatCredits(crate.price)}</dd></div>
                  <div><dt>Global left</dt><dd>{remainingGlobalCrates}</dd></div>
                  <div><dt>Your left</dt><dd>{remainingUserCrates}</dd></div>
                </dl>
                <form action="/inventory/action" className="economy-command-form" method="post">
                  <input name="source" type="hidden" value="economy-hub" />
                  <input name="intent" type="hidden" value="crate" />
                  <input name="crateId" type="hidden" value={crate.id} />
                  <button className="button button--solid-site economy-run-button" disabled={remainingGlobalCrates <= 0 || remainingUserCrates <= 0 || Number(wallet.balance || 0) < Number(crate.price || 0)} type="submit">
                    {remainingGlobalCrates <= 0 || remainingUserCrates <= 0 ? "Allocation Used" : Number(wallet.balance || 0) < Number(crate.price || 0) ? "Need Credits" : "Open Crate"}
                  </button>
                </form>
              </article>
            ))}
          </div>
          <div className="inventory-grid economy-inventory-grid">
            {inventory.holdings.length ? inventory.holdings.slice(0, 12).map((holding) => (
              <article className={`inventory-card inventory-card--${holding.rarity}`} key={holding.item.id}>
                <div className="inventory-card__icon" aria-hidden="true">{itemIcon(holding.item.name)}</div>
                <span className="court-role-badge">{holding.rarity}</span>
                <h3>{holding.item.name}</h3>
                <p>{holding.item.description}</p>
                <dl className="panem-ledger">
                  <div><dt>Quantity</dt><dd>{holding.quantity}</dd></div>
                  <div><dt>Value</dt><dd>{formatCredits(holding.value)}</dd></div>
                  <div><dt>Total</dt><dd>{formatCredits(holding.totalValue)}</dd></div>
                </dl>
                <div className="market-card-actions">
                  <form action="/inventory/action" className="panem-inline-form economy-command-form" method="post">
                    <input name="source" type="hidden" value="economy-hub" />
                    <input name="intent" type="hidden" value="sell-state" />
                    <input name="itemId" type="hidden" value={holding.item.id} />
                    <input defaultValue="1" min="1" max={holding.quantity} name="quantity" type="number" />
                    <button className="button button--solid-site" type="submit">Sell to State</button>
                  </form>
                  <form action="/inventory/action" className="panem-inline-form economy-command-form" method="post">
                    <input name="source" type="hidden" value="economy-hub" />
                    <input name="intent" type="hidden" value="list" />
                    <input name="itemId" type="hidden" value={holding.item.id} />
                    <input defaultValue="1" min="1" max={holding.quantity} name="quantity" type="number" />
                    <input defaultValue={holding.value} min="1" name="price" type="number" />
                    <button className="button" type="submit">List on Market</button>
                  </form>
                  <Link className="button" href="#craft-game">Use in Crafting</Link>
                </div>
              </article>
            )) : <article className="economy-action-card"><h3>No items yet</h3><p>Roll a gathering action to add your first item.</p><Link className="button button--solid-site" href="#gather-game">Gather Now</Link></article>}
          </div>
        </section>

        <section className="economy-game-section scroll-fade" id="craft-game">
          <div className="economy-section-heading">
            <p className="eyebrow">Crafting Workshop</p>
            <h2>Recipe cards show required materials, success chance, output, and one craft command.</h2>
          </div>
          <div className="economy-card-grid economy-card-grid--compact">
            {crafting.recipes.slice(0, 9).map((recipe) => (
              <article className="economy-action-card" key={recipe.id}>
                <span className="court-role-badge">{recipe.district}</span>
                <h3>{recipe.name}</h3>
                <p>{recipe.description}</p>
                <dl className="panem-ledger">
                  <div><dt>Output</dt><dd>{recipe.outputItem?.name || recipe.outputItemId}</dd></div>
                  <div><dt>Success</dt><dd>{Math.round(recipe.successChance * 100)}%</dd></div>
                  <div><dt>Unlock</dt><dd>Level {recipe.unlockLevel}</dd></div>
                </dl>
                <ul className="government-mini-list economy-material-list">
                  {recipe.materials.map((material) => <li className={material.held >= material.quantity ? "material-ready" : ""} key={material.itemId}><span>{material.item?.name || material.itemId}</span><strong>{material.held}/{material.quantity}</strong></li>)}
                </ul>
                <form action="/crafting/action" className="economy-command-form" method="post">
                  <input name="source" type="hidden" value="economy-hub" />
                  <input name="recipeId" type="hidden" value={recipe.id} />
                  <button className="button button--solid-site economy-run-button" disabled={!recipe.canCraft} type="submit">{recipe.canCraft ? "Craft" : recipe.unlocked ? "Need Materials" : "Locked"}</button>
                </form>
              </article>
            ))}
          </div>
        </section>

        <section className="economy-game-section scroll-fade" id="market-game">
          <div className="economy-section-heading">
            <p className="eyebrow">Marketplace Exchange</p>
            <h2>Browse goods like an exchange board, watch district tags, buy items, and manage listings.</h2>
          </div>
          <div className="economy-play-layout">
            <div className="economy-mini-grid">
              {market.items.slice(0, 8).map((item) => (
                <article className="economy-action-card economy-market-ticket" key={item.id}>
                  <span className="court-role-badge">{item.district}</span>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                  <dl className="panem-ledger">
                    <div><dt>Price</dt><dd>{formatCredits(item.currentPrice)}</dd></div>
                    <div><dt>Trend</dt><dd className={Number(item.changePercent || 0) >= 0 ? "economy-positive" : "economy-negative"}>{change(item.changePercent)}</dd></div>
                    <div><dt>Stock</dt><dd>{item.stock}</dd></div>
                  </dl>
                  <form action="/marketplace/action" className="panem-inline-form economy-command-form" method="post">
                    <input name="source" type="hidden" value="economy-hub" />
                    <input name="intent" type="hidden" value="buy" />
                    <input name="itemId" type="hidden" value={item.id} />
                    <input defaultValue="1" min="1" max={item.stock} name="quantity" type="number" />
                    <button className="button button--solid-site" type="submit">Buy</button>
                  </form>
                </article>
              ))}
            </div>
            <article className="economy-action-card economy-action-card--featured">
              <span className="court-role-badge">Your listings</span>
              <h3>{ownListings.length} active listings</h3>
              <p>Create listings from Inventory, then return here to track active citizen sales.</p>
              <ul className="government-mini-list">
                {(ownListings.length ? ownListings.slice(0, 6) : listings.slice(0, 6)).map((listing) => {
                  const item = store.marketItems.find((entry) => entry.id === listing.itemId) || store.inventoryItems.find((entry) => entry.id === listing.itemId);
                  return <li key={listing.id}><span>{item?.name || listing.itemId}</span><strong>{formatCredits(listing.price)}</strong></li>;
                })}
              </ul>
              <Link className="button" href="/marketplace">Open Full Exchange</Link>
            </article>
          </div>
        </section>

        <section className="economy-game-section scroll-fade" id="stock-game">
          <div className="economy-section-heading">
            <p className="eyebrow">Stock Exchange</p>
            <h2>Company cards keep trading simple: price, movement, buy, sell, and portfolio scan.</h2>
          </div>
          <div className="economy-card-grid economy-card-grid--compact">
            {stocks.companies.slice(0, 8).map((company) => (
              <article className="economy-action-card stock-company-card" key={company.ticker}>
                <span className="court-role-badge">{company.ticker}</span>
                <h3>{company.name}</h3>
                <p>{company.description}</p>
                <dl className="panem-ledger">
                  <div><dt>Price</dt><dd>{formatCredits(company.sharePrice)}</dd></div>
                  <div><dt>Gain / loss</dt><dd className={Number(company.dailyChangePercent || 0) >= 0 ? "economy-positive" : "economy-negative"}>{change(company.dailyChangePercent)}</dd></div>
                  <div><dt>District</dt><dd>{company.district}</dd></div>
                </dl>
                <div className="market-card-actions">
                  <form action="/stock-market/action" className="panem-inline-form economy-command-form" method="post">
                    <input name="source" type="hidden" value="economy-hub" />
                    <input name="intent" type="hidden" value="buy" />
                    <input name="ticker" type="hidden" value={company.ticker} />
                    <input defaultValue="1" min="1" name="shares" type="number" />
                    <button className="button button--solid-site" type="submit">Buy</button>
                  </form>
                  <form action="/stock-market/action" className="panem-inline-form economy-command-form" method="post">
                    <input name="source" type="hidden" value="economy-hub" />
                    <input name="intent" type="hidden" value="sell" />
                    <input name="ticker" type="hidden" value={company.ticker} />
                    <input defaultValue="1" min="1" name="shares" type="number" />
                    <button className="button" type="submit">Sell</button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="economy-game-section economy-game-section--black scroll-fade" id="black-market-game">
          <div className="economy-section-heading">
            <p className="eyebrow">Black Market</p>
            <h2>Darker deals pay more, but every click can increase MSS detection.</h2>
          </div>
          <div className="economy-meter economy-meter--risk economy-black-risk"><span>MSS detection meter</span><i style={{ "--value": progress(suspicionScore) }} /></div>
          <div className="economy-card-grid economy-card-grid--compact">
            {blackMarket.goods.map((good) => (
              <article className="economy-action-card economy-action-card--black" key={good.id}>
                <span className="court-role-badge">{good.rarity}</span>
                <h3>{good.name}</h3>
                <p>{good.description}</p>
                <dl className="panem-ledger">
                  <div><dt>Price</dt><dd>{formatCredits(good.price)}</dd></div>
                  <div><dt>Detection</dt><dd>{Math.round(good.detectionChance * 100)}%</dd></div>
                  <div><dt>Stock</dt><dd>{good.stock}</dd></div>
                </dl>
                <form action="/black-market/action" className="panem-inline-form economy-command-form" method="post">
                  <input name="source" type="hidden" value="economy-hub" />
                  <input name="intent" type="hidden" value="buy" />
                  <input name="goodId" type="hidden" value={good.id} />
                  <input defaultValue="1" min="1" max={good.stock} name="quantity" type="number" />
                  <button className="button button--solid-site" type="submit">Risk Trade</button>
                </form>
              </article>
            ))}
          </div>
          <p className="economy-action-hint">MSS status: {security.current?.status || blackMarket.suspicion.status}. High-value contraband can trigger inspection, fines, or wanted status.</p>
        </section>

        <section className="economy-game-section scroll-fade" id="district-game">
          <div className="economy-section-heading">
            <p className="eyebrow">District Command</p>
            <h2>Production output, shortages, events, and market impact in one tactical scan.</h2>
          </div>
          <div className="economy-card-grid economy-card-grid--compact">
            {topDistricts.map((district) => (
              <article className="economy-action-card economy-district-card" key={district.id}>
                <span className="court-role-badge">Rank #{district.tradeRank}</span>
                <h3>{district.name}</h3>
                <p>{district.goodsProduced}</p>
                <div className="finance-bar"><span>Production</span><i style={{ "--value": `${Math.min(100, district.output)}%` }} /></div>
                <div className="finance-bar"><span>Demand</span><i style={{ "--value": `${Math.min(100, Number(district.demandLevel || 0))}%` }} /></div>
                <dl className="panem-ledger">
                  <div><dt>Shortage</dt><dd>{Number(district.supplyLevel || 0) < Number(district.demandLevel || 0) ? "Active" : "Stable"}</dd></div>
                  <div><dt>Market impact</dt><dd>{change(district.changePercent)}</dd></div>
                  <div><dt>Price multiplier</dt><dd>x{district.multiplier.toFixed(2)}</dd></div>
                </dl>
              </article>
            ))}
          </div>
        </section>
      </main>
    </SiteLayout>
  );
}
