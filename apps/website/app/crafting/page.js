import { formatCredits } from "@wilford/shared";
import { PageHero } from "../../components/PageHero";
import { SiteLayout } from "../../components/SiteLayout";
import { getCurrentCitizen } from "../../lib/citizen-state";
import { getCraftingDashboard, getEconomyStore, getWallet } from "../../lib/panem-credit";

export const metadata = {
  title: "Crafting"
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

function materialLabel(material) {
  return `${material.item?.name || material.itemId} x${material.quantity}`;
}

export default async function CraftingPage({ searchParams }) {
  const params = await searchParams;
  const [store, citizen] = await Promise.all([getEconomyStore(), getCurrentCitizen()]);
  const wallet = citizen ? getWallet(store, citizen.walletId || citizen.userId || citizen.discordId) : null;
  const dashboard = getCraftingDashboard(store, wallet);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="District Production Office"
        title="Crafting"
        description="Convert raw district resources into valuable goods, progress your skills, and choose between specialisation or risky foreign production."
      />

      <main className="content content--wide finance-page inventory-page panem-credit-page">
        {!wallet ? (
          <section className="application-notice application-notice--error">
            <strong>Citizen Wallet Required</strong>
            <p>Open the Citizen Portal and link a Panem Credit wallet before using crafting benches.</p>
          </section>
        ) : null}
        {params?.saved ? (
          <section className="application-notice">
            <strong>Crafting Recorded</strong>
            <p>The District Production Office has updated your inventory and experience record.</p>
          </section>
        ) : null}
        {params?.error ? (
          <section className="application-notice application-notice--error">
            <strong>Crafting Rejected</strong>
            <p>Missing materials, account status, skill level, or session validation prevented that craft.</p>
          </section>
        ) : null}

        <section className="market-hero-board scroll-fade">
          <article className="wallet-card panem-wallet-card">
            <p>Crafting Level</p>
            <h2>{wallet?.displayName || "Citizen Crafter"}</h2>
            <div className="wallet-card__balance">Level {dashboard.craftingLevel}</div>
            <span>{dashboard.craftingXp.toLocaleString("en-GB")} crafting XP</span>
          </article>
          <article className="finance-panel">
            <p className="eyebrow">Labour Specialisation</p>
            <h2>Job Level {dashboard.jobLevel}</h2>
            <p>{dashboard.jobXp.toLocaleString("en-GB")} job XP recorded. Native district jobs pay full rewards; foreign work pays 40-60% and carries extra failure risk.</p>
          </article>
          <article className="finance-panel">
            <p className="eyebrow">Quality Tiers</p>
            <div className="metric-grid">
              {dashboard.qualityTiers.map((tier) => (
                <span key={tier.id}><strong>{tier.label}</strong>{tier.valueMultiplier}x value</span>
              ))}
            </div>
          </article>
        </section>

        <section className="state-section scroll-fade">
          <p className="eyebrow">Recipe Registry</p>
          <h2>District Crafting Recipes</h2>
          <div className="panem-market-grid">
            {dashboard.recipes.map((recipe) => (
              <article className="premium-card panem-market-card" key={recipe.id}>
                <span className="court-role-badge">{recipe.district}{recipe.secondaryDistricts?.length ? ` / ${recipe.secondaryDistricts.join(" / ")}` : ""}</span>
                <h3>{recipe.name}</h3>
                <p>{recipe.description}</p>
                <dl className="panem-ledger">
                  <div><dt>Output</dt><dd>{recipe.outputItem?.name || recipe.outputItemId}</dd></div>
                  <div><dt>Base value</dt><dd>{formatCredits(recipe.outputItem?.baseValue || 0)}</dd></div>
                  <div><dt>Success</dt><dd>{Math.round(recipe.successChance * 100)}%</dd></div>
                  <div><dt>Unlock</dt><dd>Level {recipe.unlockLevel}</dd></div>
                  <div><dt>District bonus</dt><dd>{recipe.specialist ? "Active" : "Inactive"}</dd></div>
                  <div><dt>MSS status</dt><dd>{recipe.restricted ? "Restricted" : "Clear"}</dd></div>
                </dl>
                <ul className="government-mini-list">
                  {recipe.materials.map((material) => (
                    <li key={material.itemId}>
                      <span>{materialLabel(material)}</span>
                      <strong>{material.held} held</strong>
                    </li>
                  ))}
                </ul>
                {wallet ? (
                  <form action="/crafting/action" method="post">
                    <input name="recipeId" type="hidden" value={recipe.id} />
                    <button className="button button--solid-site" disabled={!recipe.canCraft} type="submit">
                      {recipe.canCraft ? "Craft" : recipe.unlocked ? "Materials Needed" : "Locked"}
                    </button>
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
