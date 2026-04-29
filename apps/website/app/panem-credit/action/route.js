import { NextResponse } from "next/server";
import { assertTrustedPostOrigin } from "../../../lib/government-auth";
import {
  getCitizenState,
  getCurrentCitizen,
  recordCitizenActivity
} from "../../../lib/citizen-state";
import {
  buyMarketItem,
  buyPrestigeItem,
  createListing,
  getEconomyStore,
  getWallet,
  claimDailyReward,
  investInFund,
  performCrimeAction,
  performEconomyJob,
  playGambleGame,
  setCitizenJob,
  transferCredits,
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
    const result = await claimDailyReward({
      walletId,
      actor: citizen.unionSecurityId
    });
    if (result.ok) {
      await recordCitizenActivity(citizen.id, "daily stipend claimed", `${result.amount || 0} PC / streak ${result.streak || 1}`);
    }
    return redirectTo(request, `/panem-credit?${result.ok ? "saved=daily" : `error=${result.reason || "daily"}`}`);
  }

  if (intent === "work") {
    const result = await performEconomyJob({
      walletId,
      jobId: String(formData.get("jobId") || "work-shift").trim(),
      actor: citizen.unionSecurityId
    });
    if (result.ok) {
      await recordCitizenActivity(citizen.id, "economy work completed", `${result.job?.name || "Work"} / ${result.amount || 0} PC`);
    }
    return redirectTo(request, `/panem-credit?${result.ok ? "saved=work" : `error=${result.reason || "work"}`}`);
  }

  if (intent === "set-job") {
    const result = await setCitizenJob({
      walletId,
      jobId: String(formData.get("jobId") || "").trim(),
      actor: citizen.unionSecurityId
    });
    if (result.ok) {
      await recordCitizenActivity(citizen.id, "job selected", result.job?.name || "Citizen job");
    }
    return redirectTo(request, `/panem-credit?${result.ok ? "saved=job" : `error=${result.reason || "job"}`}`);
  }

  if (intent === "crime") {
    const state = await getCitizenState();
    const targetSecurityId = String(formData.get("targetSecurityId") || "").trim().toLowerCase();
    const targetCitizen = state.citizenRecords.find((record) =>
      String(record.unionSecurityId || "").trim().toLowerCase() === targetSecurityId &&
      record.verificationStatus === "Verified"
    );
    const targetWallet = targetCitizen ? getWallet(store, targetCitizen.walletId || targetCitizen.userId || targetCitizen.discordId) : null;
    const result = await performCrimeAction({
      walletId,
      targetWalletId: targetWallet?.id || "",
      crimeId: String(formData.get("crimeId") || "pickpocket").trim(),
      actor: citizen.unionSecurityId
    });
    if (result.ok) {
      await recordCitizenActivity(citizen.id, "fictional economy risk action", `${result.crime?.name || "Risk"} / ${result.success ? "success" : "failed"}`);
    }
    return redirectTo(request, `/panem-credit?${result.ok ? "saved=crime" : `error=${result.reason || "crime"}`}`);
  }

  if (intent === "gamble") {
    const result = await playGambleGame({
      walletId,
      gameId: String(formData.get("gameId") || "coin-toss").trim(),
      amount: formData.get("amount"),
      actor: citizen.unionSecurityId
    });
    if (result.ok) {
      await recordCitizenActivity(citizen.id, "state games wager", `${result.game?.name || "Game"} / ${result.won ? "won" : "lost"} ${result.bet || 0} PC`);
    }
    return redirectTo(request, `/panem-credit?${result.ok ? "saved=gamble" : `error=${result.reason || "gamble"}`}`);
  }

  if (intent === "invest") {
    const result = await investInFund({
      walletId,
      fundId: String(formData.get("fundId") || "district-bonds").trim(),
      amount: formData.get("amount"),
      actor: citizen.unionSecurityId
    });
    if (result.ok) {
      await recordCitizenActivity(citizen.id, "investment placed", `${result.fund?.name || "Fund"} / return ${result.returnAmount || 0} PC`);
    }
    return redirectTo(request, `/panem-credit?${result.ok ? "saved=invest" : "error=invest"}`);
  }

  if (intent === "prestige") {
    const result = await buyPrestigeItem({
      walletId,
      itemId: String(formData.get("itemId") || "district-apartment").trim(),
      actor: citizen.unionSecurityId
    });
    if (result.ok) {
      await recordCitizenActivity(citizen.id, "prestige purchase", result.item?.name || "Prestige item");
    }
    return redirectTo(request, `/panem-credit?${result.ok ? "saved=prestige" : `error=${result.reason || "prestige"}`}`);
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
