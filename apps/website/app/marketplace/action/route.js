import { NextResponse } from "next/server";
import { assertTrustedPostOrigin } from "../../../lib/government-auth";
import { safeAction } from "../../../lib/action-routes";
import { getCurrentCitizen, recordCitizenActivity } from "../../../lib/citizen-state";
import { createCitizenAlert } from "../../../lib/citizen-alerts";
import {
  buyCitizenListing,
  buyMarketItem,
  createListing,
  getEconomyStore,
  getWallet,
  updateMarketPreferences
} from "../../../lib/panem-credit";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

export const POST = safeAction("marketplace/action", "/marketplace", async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/marketplace?error=origin");
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();
  const citizen = await getCurrentCitizen();
  if (!citizen) {
    return redirectTo(request, "/marketplace?error=session");
  }

  const store = await getEconomyStore();
  const wallet = getWallet(store, citizen.walletId || citizen.userId || citizen.discordId);
  const walletId = wallet?.id || "";
  if (!wallet) {
    return redirectTo(request, "/marketplace?error=wallet");
  }

  if (intent === "buy") {
    const result = await buyMarketItem({
      walletId,
      itemId: String(formData.get("itemId") || "").trim(),
      quantity: formData.get("quantity"),
      actor: citizen.unionSecurityId
    });
    if (result.ok) {
      await recordCitizenActivity(citizen.id, "marketplace state purchase", `${formData.get("quantity") || 1} x ${formData.get("itemId") || "item"}`);
      await createCitizenAlert({
        citizenId: citizen.id,
        type: "Marketplace Notice",
        issuingAuthority: "Marketplace Authority",
        message: `Marketplace purchase recorded: ${formData.get("quantity") || 1} x ${formData.get("itemId") || "item"}.`,
        actionTaken: "Purchase recorded",
        linkedRecordType: "marketplace",
        transactionId: result.store?.transactions?.[0]?.id || ""
      }).catch(() => null);
    }
    return redirectTo(request, `/marketplace?${result.ok ? "saved=buy" : "error=buy"}`);
  }

  if (intent === "sell") {
    const result = await createListing({
      sellerWalletId: walletId,
      itemId: String(formData.get("itemId") || "").trim(),
      quantity: formData.get("quantity"),
      price: formData.get("price"),
      actor: citizen.unionSecurityId
    });
    if (result.ok) {
      await recordCitizenActivity(citizen.id, "marketplace listing", `${formData.get("quantity") || 1} x ${formData.get("itemId") || "item"}`);
      await createCitizenAlert({
        citizenId: citizen.id,
        type: "Marketplace Notice",
        issuingAuthority: "Marketplace Authority",
        message: `Marketplace listing created: ${formData.get("quantity") || 1} x ${formData.get("itemId") || "item"}.`,
        actionTaken: "Listing created",
        linkedRecordType: "marketplace",
        transactionId: result.store?.transactions?.[0]?.id || ""
      }).catch(() => null);
    }
    return redirectTo(request, `/marketplace?${result.ok ? "saved=sell" : "error=sell"}`);
  }

  if (intent === "buy-listing") {
    const result = await buyCitizenListing({
      buyerWalletId: walletId,
      listingId: String(formData.get("listingId") || "").trim(),
      quantity: formData.get("quantity"),
      actor: citizen.unionSecurityId
    });
    if (result.ok) {
      await recordCitizenActivity(citizen.id, "marketplace listing purchase", String(formData.get("listingId") || ""));
      await createCitizenAlert({
        citizenId: citizen.id,
        type: "Marketplace Notice",
        issuingAuthority: "Marketplace Authority",
        message: `Citizen listing purchase recorded: ${String(formData.get("listingId") || "")}.`,
        actionTaken: "Listing purchase recorded",
        linkedRecordType: "marketplace_listing",
        linkedRecordId: String(formData.get("listingId") || ""),
        transactionId: result.store?.transactions?.[0]?.id || ""
      }).catch(() => null);
    }
    return redirectTo(request, `/marketplace?${result.ok ? "saved=listing" : `error=${result.reason || "listing"}`}`);
  }

  if (intent === "watch-item" || intent === "favourite-district" || intent === "market-alerts") {
    const result = await updateMarketPreferences({
      walletId,
      itemId: String(formData.get("itemId") || "").trim(),
      district: String(formData.get("district") || "").trim(),
      alerts: formData.get("alerts") || undefined,
      actor: citizen.unionSecurityId
    });
    return redirectTo(request, `/marketplace?${result.ok ? "saved=watch" : "error=watch"}`);
  }

  return redirectTo(request, "/marketplace");
});
