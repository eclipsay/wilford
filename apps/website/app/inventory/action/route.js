import { NextResponse } from "next/server";
import { assertTrustedPostOrigin } from "../../../lib/government-auth";
import { safeAction } from "../../../lib/action-routes";
import { getCurrentCitizen, recordCitizenActivity } from "../../../lib/citizen-state";
import {
  createListing,
  gatherInventoryItem,
  getEconomyStore,
  getWallet,
  openInventoryCrate,
  sellInventoryToState
} from "../../../lib/panem-credit";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

export const POST = safeAction("inventory/action", "/inventory", async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/inventory?error=origin");
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();
  const fromEconomyHub = String(formData.get("source") || "") === "economy-hub";
  const citizen = await getCurrentCitizen();
  if (!citizen) return redirectTo(request, "/inventory?error=session");

  const store = await getEconomyStore();
  const wallet = getWallet(store, citizen.walletId || citizen.userId || citizen.discordId);
  const walletId = wallet?.id || "";
  if (!wallet) return redirectTo(request, "/inventory?error=wallet");

  if (intent === "gather") {
    const result = await gatherInventoryItem({
      walletId,
      actionId: String(formData.get("actionId") || "fish").trim(),
      actor: citizen.unionSecurityId
    });
    if (result.ok) {
      await recordCitizenActivity(citizen.id, "inventory gather", result.item ? `${result.quantity} x ${result.item.name}` : result.action?.name || "gather");
    }
    return redirectTo(request, fromEconomyHub
      ? `/citizen-portal/economy-hub?${result.ok ? "saved=gather" : `error=${result.reason || "gather"}`}#gather-game`
      : `/inventory?${result.ok ? "saved=gather" : `error=${result.reason || "gather"}`}`);
  }

  if (intent === "sell-state") {
    const result = await sellInventoryToState({
      walletId,
      itemId: String(formData.get("itemId") || "").trim(),
      quantity: formData.get("quantity"),
      actor: citizen.unionSecurityId
    });
    if (result.ok) {
      await recordCitizenActivity(citizen.id, "inventory state sale", `${result.quantity} x ${result.item.name}`);
    }
    return redirectTo(request, fromEconomyHub
      ? `/citizen-portal/economy-hub?${result.ok ? "saved=sell" : "error=sell"}#inventory-game`
      : `/inventory?${result.ok ? "saved=sell" : "error=sell"}`);
  }

  if (intent === "list") {
    const result = await createListing({
      sellerWalletId: walletId,
      itemId: String(formData.get("itemId") || "").trim(),
      quantity: formData.get("quantity"),
      price: formData.get("price"),
      actor: citizen.unionSecurityId
    });
    return redirectTo(request, fromEconomyHub
      ? `/citizen-portal/economy-hub?${result.ok ? "saved=sell" : "error=list"}#inventory-game`
      : `/inventory?${result.ok ? "saved=list" : "error=list"}`);
  }

  if (intent === "crate") {
    const result = await openInventoryCrate({
      walletId,
      crateId: String(formData.get("crateId") || "standard").trim(),
      actor: citizen.unionSecurityId
    });
    if (result.ok) {
      await recordCitizenActivity(citizen.id, "inventory crate opened", `${result.quantity} x ${result.item.name}`);
    }
    return redirectTo(request, fromEconomyHub
      ? `/citizen-portal/economy-hub?${result.ok ? "saved=crate" : `error=${result.reason || "crate"}`}#inventory-game`
      : `/inventory?${result.ok ? "saved=crate" : `error=${result.reason || "crate"}`}`);
  }

  return redirectTo(request, "/inventory");
});
