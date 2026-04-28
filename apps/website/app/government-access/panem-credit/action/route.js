import { NextResponse } from "next/server";
import {
  assertTrustedPostOrigin,
  canAccess,
  requireGovernmentUser
} from "../../../../lib/government-auth";
import {
  applyTax,
  createWallet,
  debitWallet,
  reverseTransaction,
  runAutomaticTaxation,
  saveEconomyStore,
  treasuryPayment,
  transferCredits,
  updateEconomyAdmin,
  updateWalletStatus,
  getEconomyStore,
  getWallet
} from "../../../../lib/panem-credit";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

function deny(request) {
  return redirectTo(request, "/government-access?denied=1");
}

export async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return deny(request);
  }

  const actor = await requireGovernmentUser("economyView");
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();
  const actorName = actor.username;
  const fullAccess = canAccess(actor, "economyControl");
  const securityAccess = canAccess(actor, "economySecurity");

  if (intent === "freeze" || intent === "unfreeze" || intent === "restrict") {
    if (!securityAccess) return deny(request);
    const status = intent === "unfreeze" ? "active" : intent === "restrict" ? "restricted" : "frozen";
    await updateWalletStatus({
      walletId: String(formData.get("walletId") || "").trim(),
      status,
      actor: actorName
    });
    return redirectTo(request, "/government-access/panem-credit?saved=wallet");
  }

  if (!fullAccess) {
    return deny(request);
  }

  if (intent === "create-wallet") {
    await createWallet({
      userId: formData.get("userId"),
      discordId: formData.get("discordId"),
      displayName: formData.get("displayName"),
      balance: formData.get("balance"),
      district: formData.get("district")
    }, actorName);
  }

  if (intent === "edit-balance") {
    const store = await getEconomyStore();
    const wallet = getWallet(store, String(formData.get("walletId") || "").trim());
    if (wallet) {
      wallet.balance = Math.max(0, Number(formData.get("balance") || 0));
      wallet.updatedAt = new Date().toISOString();
      await saveEconomyStore(store);
    }
  }

  if (intent === "transfer") {
    await transferCredits({
      fromWalletId: String(formData.get("fromWalletId") || "").trim(),
      toWalletId: String(formData.get("toWalletId") || "").trim(),
      amount: formData.get("amount"),
      reason: formData.get("reason") || "Government transfer",
      type: "government_transfer",
      actor: actorName
    });
  }

  if (intent === "grant") {
    await treasuryPayment({
      walletId: String(formData.get("walletId") || "").trim(),
      amount: formData.get("amount"),
      reason: formData.get("reason") || "State grant",
      type: "grant",
      actor: actorName
    });
  }

  if (intent === "fine") {
    await debitWallet({
      walletId: String(formData.get("walletId") || "").trim(),
      amount: formData.get("amount"),
      reason: formData.get("reason") || "State fine",
      type: "fine",
      actor: actorName
    });
  }

  if (intent === "tax") {
    await applyTax({
      walletId: String(formData.get("walletId") || "").trim(),
      taxType: String(formData.get("taxType") || "income_tax").trim(),
      amount: formData.get("amount"),
      actor: actorName,
      status: String(formData.get("status") || "paid").trim()
    });
  }

  if (intent === "rebate") {
    await treasuryPayment({
      walletId: String(formData.get("walletId") || "").trim(),
      amount: formData.get("amount"),
      reason: formData.get("reason") || "Tax rebate",
      type: "rebate",
      actor: actorName
    });
  }

  if (intent === "run-tax") {
    await runAutomaticTaxation(actorName);
  }

  if (intent === "set-tax" || intent === "district" || intent === "item") {
    await updateEconomyAdmin(Object.fromEntries(formData.entries()), actorName);
  }

  if (intent === "reverse") {
    await reverseTransaction(String(formData.get("transactionId") || "").trim(), actorName);
  }

  return redirectTo(request, "/government-access/panem-credit?saved=1");
}
