import { addAuditEvent } from "./government-auth";
import {
  citizenAlertAuthorities,
  citizenAlertTypes,
  citizenEnforcementActions,
  getCitizenState,
  saveCitizenState
} from "./citizen-state";
import { createDiscordBroadcast } from "./discord-broadcasts";
import { executeWalletEnforcement, getEconomyStore, getWallet } from "./panem-credit";

function cleanText(value, maxLength = 1000) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function alertSeverity(type, action = "none") {
  if (["Emergency Taxation", "Wallet Freeze", "MSS Warning"].includes(type) || ["emergency_taxation", "wallet_freeze", "asset_seizure"].includes(action)) return "critical";
  if (["Fine", "Tax Notice", "Court Notice"].includes(type) || action === "fine") return "high";
  return "standard";
}

export function alertTitle(alert) {
  const prefix = {
    "Emergency Taxation": "Emergency taxation",
    "Tax Notice": "Tax notice",
    Fine: "Fine",
    "Wallet Freeze": "Wallet action",
    "MSS Warning": "MSS warning",
    "Court Notice": "Court notice",
    "Citizenship Notice": "Citizenship notice",
    "Marketplace Notice": "Marketplace notice",
    "Stock Market Notice": "Stock market notice"
  }[alert.type] || "Official notice";
  return `${prefix} issued by ${alert.issuingAuthority}`;
}

export function filterAlertsForCitizen(alerts = [], citizen) {
  return alerts
    .filter((alert) => alert.citizenId === citizen.id)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export function canIssueAlertAction(user, action = "none") {
  const role = user?.role || "";
  if (["Supreme Chairman", "Executive Director", "Executive Command"].includes(role)) return true;
  if (action === "fine" && role === "Judicial Officer") return true;
  if (["emergency_taxation", "fine", "tax_rebate", "grant_payment"].includes(action)) {
    return role === "Ministry of Credit & Records";
  }
  if (["asset_seizure", "wallet_freeze", "wallet_unfreeze"].includes(action)) {
    return ["MSS Command", "Minister of State Security", "MSS Agent", "Security Command"].includes(role);
  }
  if (action === "fine") return role === "Judicial Officer";
  return ["Government Official", "Minister", "District Governor", "Citizen Clerk", "Judicial Officer"].includes(role);
}

export async function resolveAlertTargets({ targetMode, citizenId, district }) {
  const state = await getCitizenState();
  if (targetMode === "all") return { state, targets: state.citizenRecords };
  if (targetMode === "district") {
    return {
      state,
      targets: state.citizenRecords.filter((citizen) => citizen.district === district)
    };
  }
  return {
    state,
    targets: state.citizenRecords.filter((citizen) => citizen.id === citizenId)
  };
}

export async function issueCitizenAlerts(fields, actor) {
  const targetMode = cleanText(fields.targetMode || "citizen", 40);
  const citizenId = cleanText(fields.citizenId || "", 120);
  const district = cleanText(fields.district || "", 80);
  const type = citizenAlertTypes.includes(fields.type) ? fields.type : "General Notice";
  const issuingAuthority = citizenAlertAuthorities.includes(fields.issuingAuthority)
    ? fields.issuingAuthority
    : cleanText(fields.issuingAuthority || "Government", 160);
  const enforcementAction = citizenEnforcementActions.includes(fields.enforcementAction)
    ? fields.enforcementAction
    : "none";
  const amount = Math.max(0, Number(fields.amount || 0));
  const message = cleanText(fields.message || fields.reason || "", 1600);
  const discordDeliveryRequested = fields.discordDelivery === "dm";
  const websiteOnly = !discordDeliveryRequested;
  const actorName = actor?.displayName || actor?.username || "system";

  if (!canIssueAlertAction(actor, enforcementAction)) {
    return { ok: false, reason: "permission-denied", alerts: [] };
  }

  if (["emergency_taxation", "fine", "asset_seizure"].includes(enforcementAction) && amount >= 5000 && fields.confirmLargeDeduction !== "on") {
    return { ok: false, reason: "confirmation-required", alerts: [] };
  }

  const { state, targets } = await resolveAlertTargets({ targetMode, citizenId, district });
  if (!targets.length) {
    return { ok: false, reason: "no-targets", alerts: [] };
  }
  const economy = await getEconomyStore();
  const createdAlerts = [];

  for (const citizen of targets) {
    const wallet = getWallet(economy, citizen.walletId || citizen.userId || citizen.discordId);
    let transactionId = cleanText(fields.linkedRecordId || "", 160);
    let actionTaken = enforcementAction === "none" ? "Notice issued" : "Enforcement recorded";

    if (enforcementAction !== "none" && wallet) {
      const enforcement = await executeWalletEnforcement({
        walletId: wallet.id,
        action: enforcementAction,
        amount,
        reason: message || cleanText(fields.reason || "State enforcement action", 500),
        actor: actorName,
        authority: issuingAuthority
      });
      transactionId = enforcement.transaction?.id || transactionId;
      actionTaken = enforcement.transaction?.reason || actionTaken;
    }

    const alert = {
      id: createId("alert"),
      citizenId: citizen.id,
      citizenName: citizen.name,
      district: citizen.district,
      type,
      issuingAuthority,
      message,
      enforcementAction,
      actionTaken,
      amount,
      linkedRecordType: cleanText(fields.linkedRecordType || "", 80),
      linkedRecordId: cleanText(fields.linkedRecordId || "", 160),
      transactionId,
      caseId: cleanText(fields.caseId || "", 160),
      appealEnabled: fields.appealEnabled === "on",
      websiteOnly,
      discordDeliveryRequested,
      discordDeliveryStatus: discordDeliveryRequested ? "pending" : "not_requested",
      createdBy: actorName,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    createdAlerts.push(alert);

    if (discordDeliveryRequested && citizen.discordId) {
      try {
        await createDiscordBroadcast({
          type: alertSeverity(type, enforcementAction) === "critical" ? "emergency" : "news",
          distribution: "specific_user",
          targetDiscordId: citizen.discordId,
          title: alertTitle(alert),
          body: `${message}\n\nAction: ${actionTaken}${amount ? `\nAmount: ${amount} PC` : ""}`,
          requestedBy: actorName,
          requestedRole: actor?.role || "Government",
          linkedType: alert.linkedRecordType || "citizen_alert",
          linkedId: alert.id,
          articleUrl: "/citizen-portal"
        });
        alert.discordDeliveryStatus = "queued";
      } catch (error) {
        alert.discordDeliveryStatus = "failed";
        alert.discordDeliveryError = error instanceof Error ? error.message : "Discord delivery failed.";
      }
    }
  }

  state.citizenAlerts = [...createdAlerts, ...(state.citizenAlerts || [])].slice(0, 1000);
  await saveCitizenState(state);
  await addAuditEvent(
    actorName,
    enforcementAction === "none" ? "citizen alert issued" : `citizen enforcement: ${enforcementAction}`,
    `${type} to ${targetMode} (${targets.length} target${targets.length === 1 ? "" : "s"})`,
    targets.length ? "success" : "failed"
  );

  return { ok: true, alerts: createdAlerts, targets };
}
