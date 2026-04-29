import { NextResponse } from "next/server";
import { safeAction } from "../../../../lib/action-routes";
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
  triggerRandomEconomyEvent,
  updateAutoTaxSettings
} from "../../../../lib/panem-credit";
import { updateCitizenRecord } from "../../../../lib/citizen-state";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

function deny(request) {
  return redirectTo(request, "/government-access?denied=1");
}

export const POST = safeAction("government-access/panem-credit/action", "/government-access/panem-credit", async function POST(request) {
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
      const isStateTreasury = wallet.id === "treasury";
      wallet.balance = Math.max(0, Number(formData.get("balance") || 0));
      wallet.salary = isStateTreasury ? 0 : Math.max(0, Number(formData.get("salary") ?? wallet.salary ?? 125));
      wallet.displayName = isStateTreasury ? "WPU State Treasury" : String(formData.get("displayName") || wallet.displayName || "").replace(/[<>]/g, "").trim().slice(0, 120);
      wallet.userId = isStateTreasury ? "state-treasury" : wallet.userId;
      wallet.discordId = isStateTreasury ? "" : String(formData.get("discordId") || "").replace(/[<>]/g, "").trim().slice(0, 80);
      wallet.district = isStateTreasury ? "The Capitol" : String(formData.get("district") || "").replace(/[<>]/g, "").trim().slice(0, 80);
      wallet.title = isStateTreasury ? "State Treasury" : String(formData.get("title") || "").replace(/[<>]/g, "").trim().slice(0, 80);
      wallet.taxStatus = isStateTreasury ? "state account" : String(formData.get("taxStatus") || wallet.taxStatus || "compliant").replace(/[<>]/g, "").trim().slice(0, 80);
      wallet.exempt = isStateTreasury ? true : wallet.exempt;
      wallet.updatedAt = new Date().toISOString();
      await saveEconomyStore(store);
      const citizenId = String(formData.get("citizenId") || "").trim();
      if (citizenId && !isStateTreasury) {
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

  if (intent === "treasury-transfer") {
    const reason = String(formData.get("reason") || "").trim();
    if (!reason || formData.get("confirmTreasuryTransfer") !== "on") {
      return redirectTo(request, "/government-access/panem-credit?error=treasury-confirm");
    }
    await transferCredits({
      fromWalletId: "treasury",
      toWalletId: String(formData.get("toWalletId") || "").trim(),
      amount: formData.get("amount"),
      reason,
      type: "treasury_personal_transfer",
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

  if (intent === "auto-tax-enable" || intent === "auto-tax-disable") {
    if (formData.get("confirmAutoTax") !== "on") {
      return redirectTo(request, "/government-access/panem-credit?error=auto-tax-confirm");
    }
    await updateAutoTaxSettings(Object.fromEntries(formData.entries()), actorName);
  }

  if (intent === "set-tax") {
    const percent = formData.get("taxRatePercent");
    const rate = percent !== null && percent !== "" ? Number(percent) / 100 : Number(formData.get("taxRate") || 0);
    if (!Number.isFinite(rate) || rate < 0 || rate > 1 || formData.get("confirmTaxRate") !== "on") {
      return redirectTo(request, "/government-access/panem-credit?error=tax-rate");
    }
    await updateEconomyAdmin({ ...Object.fromEntries(formData.entries()), taxRate: rate }, actorName);
  }

  if (intent === "district" || intent === "item") {
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
    const returnWalletId = String(formData.get("returnWalletId") || "").trim();
    if (returnWalletId) {
      return redirectTo(request, `/government-access/panem-credit?saved=1&wallet=${encodeURIComponent(returnWalletId)}#wallet-records`);
    }
  }

  return redirectTo(request, "/government-access/panem-credit?saved=1");
});
