import {
  addAuditEvent,
  hasSpecialGovernmentPermission,
  inferAssignedDistrict,
  normalizeDistrictName
} from "./government-auth";
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

export function findCitizenForAlert(state, selector = {}) {
  const values = [
    selector.citizenId,
    selector.walletId,
    selector.discordId,
    selector.userId,
    selector.unionSecurityId
  ].map((value) => cleanText(value, 180).toLowerCase()).filter(Boolean);

  if (!values.length) return null;

  return (state.citizenRecords || []).find((citizen) =>
    [citizen.id, citizen.walletId, citizen.discordId, citizen.userId, citizen.unionSecurityId]
      .map((value) => cleanText(value, 180).toLowerCase())
      .some((value) => values.includes(value))
  ) || null;
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

export function allowedAlertAuthorityForUser(user = {}) {
  const role = user?.role || "";
  if (role === "Supreme Chairman") return "Supreme Chairman";
  if (role === "Executive Director" || role === "Executive Command") return "Executive Director";
  if (role === "Ministry of Credit & Records" || role === "Minister of Credit & Records") return "Ministry of Credit & Records";
  if (["MSS Command", "Minister of State Security", "MSS Agent", "Security Command"].includes(role)) return "MSS";
  if (role === "Judicial Officer") return "Supreme Court";
  if (role === "District Governor") return "District Governor";
  if (role === "Minister" || role === "Government Official" || role === "Citizen Clerk") return "Citizen Services";
  return "";
}

export function alertAuthorityOptionsForUser(user = {}) {
  const authority = allowedAlertAuthorityForUser(user);
  return authority ? [authority] : [];
}

function isForbiddenAuthority(user, requestedAuthority) {
  const allowed = allowedAlertAuthorityForUser(user);
  return !allowed || requestedAuthority !== allowed;
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
  let district = normalizeDistrictName(fields.district || "");
  const type = citizenAlertTypes.includes(fields.type) ? fields.type : "General Notice";
  let issuingAuthority = citizenAlertAuthorities.includes(fields.issuingAuthority)
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
  const state = await getCitizenState();
  const governorDistrict = actor?.role === "District Governor"
    ? inferAssignedDistrict(actor, state.districtProfiles)
    : "";

  if (actor?.role === "District Governor") {
    issuingAuthority = "District Governor";
    district = governorDistrict;
  }

  if (isForbiddenAuthority(actor, issuingAuthority)) {
    await addAuditEvent(
      actorName,
      "authority mismatch attempt",
      `Requested ${issuingAuthority || "unknown"} alert authority as ${actor?.role || "unknown"}.`,
      "denied"
    ).catch(() => {});
    return { ok: false, reason: "authority-denied", alerts: [] };
  }

  if (!canIssueAlertAction(actor, enforcementAction)) {
    return { ok: false, reason: "permission-denied", alerts: [] };
  }

  if (actor?.role === "District Governor") {
    const canUnionWide = hasSpecialGovernmentPermission(actor, "union-wide-alerts");
    if (!governorDistrict) {
      await addAuditEvent(actorName, "district alert denied", "District Governor has no assigned district.", "denied").catch(() => {});
      return { ok: false, reason: "district-denied", alerts: [] };
    }
    if (targetMode === "all" && !canUnionWide) {
      await addAuditEvent(actorName, "authority mismatch attempt", "District Governor attempted Union-wide alert.", "denied").catch(() => {});
      return { ok: false, reason: "authority-denied", alerts: [] };
    }
  }

  if (["emergency_taxation", "fine", "asset_seizure"].includes(enforcementAction) && amount >= 5000 && fields.confirmLargeDeduction !== "on") {
    return { ok: false, reason: "confirmation-required", alerts: [] };
  }

  let targets = [];
  if (targetMode === "all") {
    targets = state.citizenRecords;
  } else if (targetMode === "district") {
    targets = state.citizenRecords.filter((citizen) => normalizeDistrictName(citizen.district) === district);
  } else {
    targets = state.citizenRecords.filter((citizen) => citizen.id === citizenId);
  }

  if (actor?.role === "District Governor") {
    targets = targets.filter((citizen) => normalizeDistrictName(citizen.district) === governorDistrict);
  }

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

  }

  state.citizenAlerts = [...createdAlerts, ...(state.citizenAlerts || [])].slice(0, 1000);
  await saveCitizenState(state);

  for (const alert of createdAlerts.filter((entry) => entry.discordDeliveryRequested)) {
    const citizen = targets.find((target) => target.id === alert.citizenId);
    const delivered = await queueDiscordAlertDelivery(alert, citizen, actor);
    Object.assign(alert, delivered, { updatedAt: new Date().toISOString() });
  }

  if (createdAlerts.some((alert) => alert.discordDeliveryRequested)) {
    const deliveredState = await getCitizenState();
    deliveredState.citizenAlerts = (deliveredState.citizenAlerts || []).map((existing) => {
      const delivered = createdAlerts.find((alert) => alert.id === existing.id);
      return delivered ? { ...existing, ...delivered } : existing;
    });
    await saveCitizenState(deliveredState);
  }

  await addAuditEvent(
    actorName,
    actor?.role === "District Governor" ? "district alert issued" : enforcementAction === "none" ? "citizen alert issued" : `citizen enforcement: ${enforcementAction}`,
    `${issuingAuthority} / ${type} to ${targetMode}${district ? ` / ${district}` : ""} (${targets.length} target${targets.length === 1 ? "" : "s"})`,
    targets.length ? "success" : "failed"
  );

  return { ok: true, alerts: createdAlerts, targets };
}

export async function queueDiscordAlertDelivery(alert, citizen, actor = {}) {
  if (!citizen?.discordId) {
    return { ...alert, discordDeliveryStatus: "no_discord_id", discordDeliveryError: "" };
  }

  try {
    await createDiscordBroadcast({
      type: alertSeverity(alert.type, alert.enforcementAction) === "critical" ? "emergency" : "news",
      distribution: "specific_user",
      targetDiscordId: citizen.discordId,
      title: alertTitle(alert),
      body: `${alert.message || "Official notice issued."}\n\nAction: ${alert.actionTaken || "Notice issued"}${alert.amount ? `\nAmount: ${alert.amount} PC` : ""}`,
      requestedBy: actor?.displayName || actor?.username || alert.createdBy || "system",
      requestedRole: actor?.role || alert.issuingAuthority || "Government",
      linkedType: alert.linkedRecordType || "citizen_alert",
      linkedId: alert.id,
      articleUrl: "/citizen-portal"
    });
    return { ...alert, discordDeliveryStatus: "queued", discordDeliveryError: "" };
  } catch (error) {
    return {
      ...alert,
      discordDeliveryStatus: "failed",
      discordDeliveryError: error instanceof Error ? error.message : "Discord delivery failed."
    };
  }
}

export async function createCitizenAlert(fields = {}, actor = {}) {
  const state = await getCitizenState();
  const citizen = findCitizenForAlert(state, fields);
  if (!citizen) return { ok: false, reason: "citizen-not-found", alert: null };

  const type = citizenAlertTypes.includes(fields.type) ? fields.type : "General Notice";
  const enforcementAction = citizenEnforcementActions.includes(fields.enforcementAction)
    ? fields.enforcementAction
    : "none";
  const now = new Date().toISOString();
  const actorName = actor?.displayName || actor?.username || fields.createdBy || "system";
  let alert = {
    id: cleanText(fields.id || createId("alert"), 120),
    citizenId: citizen.id,
    citizenName: citizen.name,
    district: citizen.district,
    type,
    issuingAuthority: citizenAlertAuthorities.includes(fields.issuingAuthority)
      ? fields.issuingAuthority
      : cleanText(fields.issuingAuthority || "Government", 160),
    severity: cleanText(fields.severity || alertSeverity(type, enforcementAction), 40),
    category: cleanText(fields.category || type, 80),
    message: cleanText(fields.message || fields.reason || "Official notice issued.", 1600),
    enforcementAction,
    actionTaken: cleanText(fields.actionTaken || (enforcementAction === "none" ? "Notice issued" : enforcementAction.replace(/_/g, " ")), 500),
    amount: Math.max(0, Number(fields.amount || 0)),
    linkedRecordType: cleanText(fields.linkedRecordType || "", 80),
    linkedRecordId: cleanText(fields.linkedRecordId || "", 160),
    transactionId: cleanText(fields.transactionId || "", 160),
    caseId: cleanText(fields.caseId || "", 160),
    appealEnabled: fields.appealEnabled !== false,
    status: cleanText(fields.status || "open", 80),
    websiteOnly: !fields.discordDeliveryRequested,
    discordDeliveryRequested: Boolean(fields.discordDeliveryRequested),
    discordDeliveryStatus: fields.discordDeliveryRequested ? "pending" : "not_requested",
    discordDeliveryError: "",
    readByCitizen: false,
    createdBy: actorName,
    createdAt: fields.createdAt || now,
    updatedAt: now
  };

  state.citizenAlerts = [alert, ...(state.citizenAlerts || []).filter((entry) => entry.id !== alert.id)].slice(0, 1000);
  await saveCitizenState(state);

  if (alert.discordDeliveryRequested) {
    alert = await queueDiscordAlertDelivery(alert, citizen, actor);
    const latestState = await getCitizenState();
    latestState.citizenAlerts = (latestState.citizenAlerts || []).map((entry) =>
      entry.id === alert.id ? { ...entry, ...alert, updatedAt: new Date().toISOString() } : entry
    );
    await saveCitizenState(latestState);
  }

  return { ok: true, alert, citizen };
}

export async function updateCitizenAlert(id, fields = {}) {
  const state = await getCitizenState();
  let updated = null;
  state.citizenAlerts = (state.citizenAlerts || []).map((alert) => {
    if (alert.id !== id) return alert;
    updated = { ...alert, ...fields, updatedAt: new Date().toISOString() };
    return updated;
  });
  if (!updated) return { ok: false, reason: "alert-not-found" };
  await saveCitizenState(state);
  return { ok: true, alert: updated };
}

export async function markCitizenAlertRead({ citizenId, alertId = "", all = false }) {
  const state = await getCitizenState();
  let changed = 0;
  state.citizenAlerts = (state.citizenAlerts || []).map((alert) => {
    if (alert.citizenId !== citizenId || (!all && alert.id !== alertId)) return alert;
    if (alert.readByCitizen) return alert;
    changed += 1;
    return { ...alert, readByCitizen: true, readAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  });
  if (changed) await saveCitizenState(state);
  return { ok: true, changed };
}

export async function resendCitizenAlertDiscord(alertId, actor = {}) {
  const state = await getCitizenState();
  const alert = (state.citizenAlerts || []).find((entry) => entry.id === alertId);
  const citizen = alert ? state.citizenRecords.find((record) => record.id === alert.citizenId) : null;
  if (!alert || !citizen) return { ok: false, reason: "alert-not-found" };
  const updated = await queueDiscordAlertDelivery({ ...alert, discordDeliveryRequested: true }, citizen, actor);
  return updateCitizenAlert(alert.id, updated);
}
