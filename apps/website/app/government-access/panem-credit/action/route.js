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
  getWallet,
  markWalletWanted,
  pardonWallet,
  triggerEconomyEvent,
  triggerRandomEconomyEvent
} from "../../../../lib/panem-credit";
import { updateCitizenRecord } from "../../../../lib/citizen-state";

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

  if (intent === "wanted" || intent === "pardon") {
    if (!securityAccess) return deny(request);
    if (intent === "wanted") {
      await markWalletWanted({
        walletId: String(formData.get("walletId") || "").trim(),
        bounty: formData.get("bounty") || 250,
        reason: formData.get("reason") || "MSS financial warrant",
        actor: actorName
      });
    } else {
      await pardonWallet({
        walletId: String(formData.get("walletId") || "").trim(),
        reason: formData.get("reason") || "MSS clearance",
        actor: actorName
      });
    }
    return redirectTo(request, "/government-access/panem-credit?saved=mss");
  }

  if (!fullAccess) {
    return deny(request);
  }

  if (intent === "create-wallet") {
    const store = await createWallet({
      userId: formData.get("userId"),
      discordId: formData.get("discordId"),
      displayName: formData.get("displayName"),
      balance: formData.get("balance"),
      salary: formData.get("salary"),
      district: formData.get("district")
    }, actorName);
    const citizenId = String(formData.get("citizenId") || "").trim();
    const wallet = getWallet(store, String(formData.get("userId") || "").trim()) || getWallet(store, String(formData.get("discordId") || "").trim());
    if (citizenId && wallet) {
      await updateCitizenRecord(citizenId, {
        walletId: wallet.id,
        discordId: wallet.discordId,
        district: wallet.district
      });
    }
  }

  if (intent === "edit-balance") {
    const store = await getEconomyStore();
    const wallet = getWallet(store, String(formData.get("walletId") || "").trim());
    if (wallet) {
      wallet.balance = Math.max(0, Number(formData.get("balance") || 0));
      wallet.salary = Math.max(0, Number(formData.get("salary") ?? wallet.salary ?? 125));
      wallet.displayName = String(formData.get("displayName") || wallet.displayName || "").replace(/[<>]/g, "").trim().slice(0, 120);
      wallet.discordId = String(formData.get("discordId") || "").replace(/[<>]/g, "").trim().slice(0, 80);
      wallet.district = String(formData.get("district") || "").replace(/[<>]/g, "").trim().slice(0, 80);
      wallet.title = String(formData.get("title") || "").replace(/[<>]/g, "").trim().slice(0, 80);
      wallet.taxStatus = String(formData.get("taxStatus") || wallet.taxStatus || "compliant").replace(/[<>]/g, "").trim().slice(0, 80);
      wallet.updatedAt = new Date().toISOString();
      await saveEconomyStore(store);
      const citizenId = String(formData.get("citizenId") || "").trim();
      if (citizenId) {
        await updateCitizenRecord(citizenId, {
          walletId: wallet.id,
          discordId: wallet.discordId,
          district: wallet.district
        });
      }
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

  if (intent === "trigger-event") {
    if (String(formData.get("eventId") || "").trim() === "random") {
      await triggerRandomEconomyEvent({ durationHours: formData.get("durationHours") || 72, actor: actorName });
    } else {
      await triggerEconomyEvent({
        eventId: String(formData.get("eventId") || "").trim(),
        durationHours: formData.get("durationHours") || 168,
        actor: actorName
      });
    }
  }

  if (intent === "reverse") {
    await reverseTransaction(String(formData.get("transactionId") || "").trim(), actorName);
  }

  return redirectTo(request, "/government-access/panem-credit?saved=1");
}
