import { NextResponse } from "next/server";
import { assertTrustedPostOrigin, canAccess, requireGovernmentUser } from "../../../../lib/government-auth";
import { getEconomyStore, getWallet, issueStockDividends, saveEconomyStore, triggerStockMarketEvent, updateStockAdmin } from "../../../../lib/panem-credit";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

function deny(request) {
  return redirectTo(request, "/government-access?denied=1");
}

export async function POST(request) {
  if (!(await assertTrustedPostOrigin())) return deny(request);
  const actor = await requireGovernmentUser("economyView");
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();
  const fullAccess = canAccess(actor, "economyControl");
  const securityAccess = canAccess(actor, "economySecurity");

  if (intent === "freeze-portfolio" || intent === "unfreeze-portfolio") {
    if (!securityAccess) return deny(request);
    const store = await getEconomyStore();
    const wallet = getWallet(store, String(formData.get("walletId") || "").trim());
    if (wallet) {
      wallet.portfolioFrozen = intent === "freeze-portfolio";
      await saveEconomyStore(store);
    }
    return redirectTo(request, "/government-access/stock-market?saved=portfolio");
  }

  if (!fullAccess) return deny(request);

  if (intent === "event") {
    await triggerStockMarketEvent({ eventId: String(formData.get("eventId") || "").trim(), actor: actor.username });
  }
  if (intent === "tax" || intent === "company") {
    await updateStockAdmin(Object.fromEntries(formData.entries()), actor.username);
  }
  if (intent === "dividend") {
    await issueStockDividends({ ticker: String(formData.get("ticker") || "").trim(), actor: actor.username });
  }
  return redirectTo(request, "/government-access/stock-market?saved=1");
}
