import { NextResponse } from "next/server";
import {
  buyMarketItem,
  createListing,
  getEconomyStore,
  getWallet,
  transferCredits,
  treasuryPayment
} from "../../../lib/panem-credit";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function POST(request) {
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();
  const walletId = String(formData.get("walletId") || "").trim();

  if (intent === "send") {
    const result = await transferCredits({
      fromWalletId: walletId,
      toWalletId: String(formData.get("toWalletId") || "").trim(),
      amount: formData.get("amount"),
      reason: formData.get("reason") || "Citizen payment",
      actor: walletId
    });
    return redirectTo(request, `/panem-credit?wallet=${encodeURIComponent(walletId)}&${result.ok ? "saved=transfer" : "error=transfer"}`);
  }

  if (intent === "daily") {
    const store = await getEconomyStore();
    const wallet = getWallet(store, walletId);
    const salary = Math.max(0, Number(wallet?.salary ?? 125));
    const result = await treasuryPayment({
      walletId,
      amount: salary,
      reason: "Daily civic salary",
      type: "daily_stipend",
      actor: walletId
    });
    return redirectTo(request, `/panem-credit?wallet=${encodeURIComponent(walletId)}&${result.ok ? "saved=daily" : "error=daily"}`);
  }

  if (intent === "buy") {
    const result = await buyMarketItem({
      walletId,
      itemId: String(formData.get("itemId") || "").trim(),
      quantity: formData.get("quantity"),
      actor: walletId
    });
    return redirectTo(request, `/panem-credit?wallet=${encodeURIComponent(walletId)}&${result.ok ? "saved=buy" : "error=buy"}`);
  }

  if (intent === "sell") {
    const result = await createListing({
      sellerWalletId: walletId,
      itemId: String(formData.get("itemId") || "").trim(),
      quantity: formData.get("quantity"),
      price: formData.get("price"),
      actor: walletId
    });
    return redirectTo(request, `/panem-credit?wallet=${encodeURIComponent(walletId)}&${result.ok ? "saved=sell" : "error=sell"}`);
  }

  return redirectTo(request, `/panem-credit?wallet=${encodeURIComponent(walletId)}`);
}
