import { NextResponse } from "next/server";
import { assertTrustedPostOrigin } from "../../../lib/government-auth";
import { safeAction } from "../../../lib/action-routes";
import { getCurrentCitizen, recordCitizenActivity } from "../../../lib/citizen-state";
import { createCitizenAlert } from "../../../lib/citizen-alerts";
import { buyStock, getEconomyStore, getWallet, sellStock, updateStockWatchlist } from "../../../lib/panem-credit";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

export const POST = safeAction("stock-market/action", "/stock-market", async function POST(request) {
  if (!(await assertTrustedPostOrigin())) return redirectTo(request, "/stock-market?error=origin");
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();
  const fromEconomyHub = String(formData.get("source") || "") === "economy-hub";
  const citizen = await getCurrentCitizen();
  if (!citizen) return redirectTo(request, "/stock-market?error=session");
  const store = await getEconomyStore();
  const wallet = getWallet(store, citizen.walletId || citizen.userId || citizen.discordId);
  if (!wallet) return redirectTo(request, "/stock-market?error=wallet");

  if (intent === "buy") {
    const result = await buyStock({ walletId: wallet.id, ticker: formData.get("ticker"), shares: formData.get("shares"), actor: citizen.unionSecurityId });
    if (result.ok) {
      await recordCitizenActivity(citizen.id, "stock purchase", `${result.shares} ${result.company.ticker}`);
      await createCitizenAlert({
        citizenId: citizen.id,
        type: "Stock Market Notice",
        issuingAuthority: "Panem Stock Exchange",
        message: `Stock purchase recorded: ${result.shares} ${result.company.ticker}.`,
        actionTaken: "Stock purchase recorded",
        amount: result.total || 0,
        linkedRecordType: "stock_transaction",
        transactionId: result.store?.transactions?.[0]?.id || ""
      }).catch(() => null);
    }
    return redirectTo(request, fromEconomyHub
      ? `/citizen-portal/economy-hub?${result.ok ? "saved=stock-buy" : "error=buy"}#stock-game`
      : `/stock-market?${result.ok ? "saved=buy" : "error=buy"}`);
  }
  if (intent === "sell") {
    const result = await sellStock({ walletId: wallet.id, ticker: formData.get("ticker"), shares: formData.get("shares"), actor: citizen.unionSecurityId });
    if (result.ok) {
      await recordCitizenActivity(citizen.id, "stock sale", `${result.shares} ${result.company.ticker}`);
      await createCitizenAlert({
        citizenId: citizen.id,
        type: "Stock Market Notice",
        issuingAuthority: "Panem Stock Exchange",
        message: `Stock sale recorded: ${result.shares} ${result.company.ticker}.`,
        actionTaken: "Stock sale recorded",
        amount: result.proceeds || 0,
        linkedRecordType: "stock_transaction",
        transactionId: result.store?.transactions?.[0]?.id || ""
      }).catch(() => null);
    }
    return redirectTo(request, fromEconomyHub
      ? `/citizen-portal/economy-hub?${result.ok ? "saved=stock-sell" : "error=sell"}#stock-game`
      : `/stock-market?${result.ok ? "saved=sell" : "error=sell"}`);
  }
  if (intent === "watch") {
    const result = await updateStockWatchlist({ walletId: wallet.id, ticker: formData.get("ticker"), actor: citizen.unionSecurityId });
    return redirectTo(request, `/stock-market?${result.ok ? "saved=watch" : "error=watch"}`);
  }
  return redirectTo(request, "/stock-market");
});
