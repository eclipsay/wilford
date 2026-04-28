import { NextResponse } from "next/server";
import { assertTrustedPostOrigin } from "../../../lib/government-auth";
import {
  getCitizenState,
  getCurrentCitizen,
  recordCitizenActivity
} from "../../../lib/citizen-state";
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
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/panem-credit?error=origin");
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();
  const citizen = await getCurrentCitizen();
  if (!citizen) {
    return redirectTo(request, "/panem-credit?error=session");
  }

  const store = await getEconomyStore();
  const wallet = getWallet(store, citizen.walletId || citizen.userId || citizen.discordId);
  const walletId = wallet?.id || "";
  if (!wallet) {
    return redirectTo(request, "/panem-credit?error=wallet");
  }

  if (intent === "send") {
    const state = await getCitizenState();
    const recipientSecurityId = String(formData.get("recipientSecurityId") || "").trim().toLowerCase();
    const recipient = state.citizenRecords.find((record) =>
      String(record.unionSecurityId || "").trim().toLowerCase() === recipientSecurityId &&
      record.verificationStatus === "Verified" &&
      !record.lostOrStolen
    );
    const recipientWallet = recipient ? getWallet(store, recipient.walletId || recipient.userId || recipient.discordId) : null;
    const result = await transferCredits({
      fromWalletId: walletId,
      toWalletId: recipientWallet?.id || "",
      amount: formData.get("amount"),
      reason: formData.get("reason") || "Citizen payment",
      actor: citizen.unionSecurityId
    });
    if (result.ok) {
      await recordCitizenActivity(citizen.id, "panem credit transfer", `${recipient?.name || "Unknown recipient"} / ${formData.get("amount") || 0} PC`);
    }
    return redirectTo(request, `/panem-credit?${result.ok ? "saved=transfer" : "error=transfer"}`);
  }

  if (intent === "daily") {
    const salary = Math.max(0, Number(wallet?.salary ?? 125));
    const today = new Date().toISOString().slice(0, 10);
    const alreadyClaimed = store.transactions.some(
      (transaction) =>
        transaction.toWalletId === wallet?.id &&
        transaction.type === "daily_stipend" &&
        String(transaction.createdAt || "").startsWith(today)
    );

    if (!wallet || alreadyClaimed) {
      return redirectTo(request, "/panem-credit?error=daily-limit");
    }

    const result = await treasuryPayment({
      walletId,
      amount: salary,
      reason: "Daily civic salary",
      type: "daily_stipend",
      actor: citizen.unionSecurityId
    });
    if (result.ok) {
      await recordCitizenActivity(citizen.id, "daily stipend claimed", `${salary} PC`);
    }
    return redirectTo(request, `/panem-credit?${result.ok ? "saved=daily" : "error=daily"}`);
  }

  if (intent === "buy") {
    const result = await buyMarketItem({
      walletId,
      itemId: String(formData.get("itemId") || "").trim(),
      quantity: formData.get("quantity"),
      actor: citizen.unionSecurityId
    });
    if (result.ok) {
      await recordCitizenActivity(citizen.id, "market purchase", `${formData.get("quantity") || 1} x ${formData.get("itemId") || "item"}`);
    }
    return redirectTo(request, `/panem-credit?${result.ok ? "saved=buy" : "error=buy"}`);
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
      await recordCitizenActivity(citizen.id, "market listing", `${formData.get("quantity") || 1} x ${formData.get("itemId") || "item"}`);
    }
    return redirectTo(request, `/panem-credit?${result.ok ? "saved=sell" : "error=sell"}`);
  }

  return redirectTo(request, "/panem-credit");
}
