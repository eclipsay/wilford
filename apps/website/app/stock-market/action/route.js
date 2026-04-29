import { NextResponse } from "next/server";
import { assertTrustedPostOrigin } from "../../../lib/government-auth";
import { getCurrentCitizen, recordCitizenActivity } from "../../../lib/citizen-state";
import { buyStock, getEconomyStore, getWallet, sellStock, updateStockWatchlist } from "../../../lib/panem-credit";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function POST(request) {
  if (!(await assertTrustedPostOrigin())) return redirectTo(request, "/stock-market?error=origin");
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();
  const citizen = await getCurrentCitizen();
  if (!citizen) return redirectTo(request, "/stock-market?error=session");
  const store = await getEconomyStore();
  const wallet = getWallet(store, citizen.walletId || citizen.userId || citizen.discordId);
  if (!wallet) return redirectTo(request, "/stock-market?error=wallet");

  if (intent === "buy") {
    const result = await buyStock({ walletId: wallet.id, ticker: formData.get("ticker"), shares: formData.get("shares"), actor: citizen.unionSecurityId });
    if (result.ok) await recordCitizenActivity(citizen.id, "stock purchase", `${result.shares} ${result.company.ticker}`);
    return redirectTo(request, `/stock-market?${result.ok ? "saved=buy" : "error=buy"}`);
  }
  if (intent === "sell") {
    const result = await sellStock({ walletId: wallet.id, ticker: formData.get("ticker"), shares: formData.get("shares"), actor: citizen.unionSecurityId });
    if (result.ok) await recordCitizenActivity(citizen.id, "stock sale", `${result.shares} ${result.company.ticker}`);
    return redirectTo(request, `/stock-market?${result.ok ? "saved=sell" : "error=sell"}`);
  }
  if (intent === "watch") {
    const result = await updateStockWatchlist({ walletId: wallet.id, ticker: formData.get("ticker"), actor: citizen.unionSecurityId });
    return redirectTo(request, `/stock-market?${result.ok ? "saved=watch" : "error=watch"}`);
  }
  return redirectTo(request, "/stock-market");
}
