import { NextResponse } from "next/server";
import { safeAction } from "../../../../lib/action-routes";
import {
  addAuditEvent,
  assertTrustedPostOrigin,
  canAccess,
  requireGovernmentUser
} from "../../../../lib/government-auth";
import {
  createDiscordBroadcast,
  formatMssSecurityAlert,
  mssClassifications,
  mssThreatLevels,
  requiresChairmanApproval
} from "../../../../lib/discord-broadcasts";
import { createCitizenAlert } from "../../../../lib/citizen-alerts";
import {
  createEnemyEntry,
  deleteEnemyEntry,
  enemyClassifications,
  enemyStatuses,
  enemyThreatLevels,
  enemyVisibilityLevels,
  parseEnemyEntryForm,
  updateEnemyEntry
} from "../../../../lib/enemies-of-state";
import { conductMssRaid, getEconomyStore, getWallet, mssExemptionStatuses, updateMssFlag } from "../../../../lib/panem-credit";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

function clean(value, maxLength = 2000) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, maxLength);
}

function mapDistribution(value) {
  const distribution = clean(value, 80);

  if (distribution === "mss_only" || distribution === "government_officials") {
    return distribution;
  }

  if (["announcement", "dm_all", "specific_user"].includes(distribution)) {
    return distribution;
  }

  return "mss_only";
}

export const POST = safeAction("government-access/mss-console/action", "/government-access/mss-console", async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/government-access?denied=1");
  }

  const user = await requireGovernmentUser("enemyRegistryDraft");
  const formData = await request.formData();
  const intent = clean(formData.get("intent"), 80);
  const canManageMssFlags = ["Supreme Chairman", "Executive Director", "Minister of State Security", "MSS Command", "Security Command"].includes(user.role);
  const flagIntents = new Set([
    "mss-clear-flags",
    "mss-reduce-suspicion",
    "mss-mark-exempt",
    "mss-remove-exemption",
    "mss-add-note",
    "mss-manual-flag",
    "mss-start-investigation",
    "mss-issue-warning"
  ]);

  if (flagIntents.has(intent)) {
    const walletId = clean(formData.get("walletId"), 120);
    const reason = clean(formData.get("reason"), 1000);
    if (!walletId || !reason) {
      return redirectTo(request, "/government-access/mss-console?error=required&detail=Wallet%20and%20reason%20are%20required.");
    }
    if (["mss-clear-flags", "mss-reduce-suspicion", "mss-mark-exempt", "mss-remove-exemption", "mss-manual-flag"].includes(intent) && !canManageMssFlags) {
      await addAuditEvent(user.username, "mss flag change denied", `${walletId} / ${intent}`, "denied").catch(() => {});
      return redirectTo(request, "/government-access?denied=1");
    }

    const action = {
      "mss-clear-flags": "clear-flags",
      "mss-reduce-suspicion": "reduce-suspicion",
      "mss-mark-exempt": "mark-exempt",
      "mss-remove-exemption": "remove-exemption",
      "mss-add-note": "add-note",
      "mss-manual-flag": "manual-flag",
      "mss-start-investigation": "start-investigation"
    }[intent];

    if (intent === "mss-issue-warning") {
      const economy = await getEconomyStore();
      const wallet = getWallet(economy, walletId);
      if (!wallet) return redirectTo(request, "/government-access/mss-console?error=required&detail=Wallet%20not%20found.");
      await createCitizenAlert({
        walletId: wallet.id,
        discordId: wallet.discordId,
        userId: wallet.userId,
        type: "MSS Warning",
        issuingAuthority: "MSS",
        message: reason,
        actionTaken: "MSS warning issued",
        linkedRecordType: "mss-flag",
        linkedRecordId: wallet.id,
        discordDeliveryRequested: true
      }, user).catch(() => null);
      await updateMssFlag({ walletId, action: "add-note", note: `Warning issued: ${reason}`, reason, actor: user.username });
      await addAuditEvent(user.username, "mss warning issued", `${wallet.displayName} / ${reason}`, "success").catch(() => {});
      return redirectTo(request, `/government-access/mss-console?mssFlagSaved=1#flag-${encodeURIComponent(walletId)}`);
    }

    const exemptionStatus = clean(formData.get("exemptionStatus"), 120);
    if (intent === "mss-mark-exempt" && !mssExemptionStatuses.includes(exemptionStatus)) {
      return redirectTo(request, "/government-access/mss-console?error=invalid&detail=Invalid%20MSS%20exemption%20status.");
    }
    const result = await updateMssFlag({
      walletId,
      action,
      reason,
      note: reason,
      newScore: formData.get("newScore"),
      exemptionStatus,
      actor: user.username
    });
    await addAuditEvent(user.username, `mss ${action}`, `${walletId} / ${reason}`, result.ok ? "success" : "failed").catch(() => {});
    if (!result.ok) {
      return redirectTo(request, `/government-access/mss-console?error=flag&detail=${encodeURIComponent(result.reason || "Flag update failed")}`);
    }
    return redirectTo(request, `/government-access/mss-console?mssFlagSaved=1#flag-${encodeURIComponent(walletId)}`);
  }

  if (intent === "create-enemy-entry" || intent === "update-enemy-entry") {
    const canApprovePublic = canAccess(user, "enemyRegistryPublic");
    const fields = parseEnemyEntryForm(formData, { canApprovePublic });
    const entryId = clean(formData.get("entryId"), 120);

    if (!fields.name || !fields.reasonSummary) {
      return redirectTo(request, "/government-access/mss-console?error=required&detail=Name%20and%20reason%20summary%20are%20required.");
    }

    if (
      !enemyClassifications.includes(fields.classification) ||
      !enemyThreatLevels.includes(fields.threatLevel) ||
      !enemyStatuses.includes(fields.status) ||
      !enemyVisibilityLevels.includes(fields.visibility)
    ) {
      return redirectTo(request, "/government-access/mss-console?error=invalid&detail=Invalid%20registry%20classification%20or%20visibility.");
    }

    try {
      if (intent === "update-enemy-entry" && entryId) {
        await updateEnemyEntry(entryId, fields);
        await addAuditEvent(user.username, "enemy registry edited", `${entryId} / ${fields.name}`, "success");
      } else {
        await createEnemyEntry({ ...fields, createdBy: user.username });
        await addAuditEvent(user.username, "enemy registry drafted", fields.name, "success");
      }

      return redirectTo(request, "/government-access/mss-console?registrySaved=1");
    } catch (error) {
      await addAuditEvent(user.username, "enemy registry save failed", fields.name, "failed").catch(() => {});
      return redirectTo(
        request,
        `/government-access/mss-console?error=storage&detail=${encodeURIComponent(error.message)}`
      );
    }
  }

  if (intent === "archive-enemy-entry") {
    const entryId = clean(formData.get("entryId"), 120);

    if (!entryId) {
      return redirectTo(request, "/government-access/mss-console?error=required&detail=Registry%20entry%20ID%20is%20required.");
    }

    try {
      await deleteEnemyEntry(entryId);
      await addAuditEvent(user.username, "enemy registry archived", entryId, "success");
      return redirectTo(request, "/government-access/mss-console?registrySaved=1");
    } catch (error) {
      await addAuditEvent(user.username, "enemy registry archive failed", entryId, "failed").catch(() => {});
      return redirectTo(
        request,
        `/government-access/mss-console?error=storage&detail=${encodeURIComponent(error.message)}`
      );
    }
  }

  if (intent === "mss-raid") {
    if (!canAccess(user, "mssTools")) {
      return redirectTo(request, "/government-access?denied=1");
    }
    const result = await conductMssRaid({
      mode: clean(formData.get("mode"), 40),
      walletId: clean(formData.get("walletId"), 120),
      district: clean(formData.get("district"), 80),
      raidType: clean(formData.get("raidType"), 80),
      reason: clean(formData.get("reason"), 500),
      itemSeizurePercent: formData.get("itemSeizurePercent"),
      fineAmount: formData.get("fineAmount"),
      restrictHours: formData.get("restrictHours"),
      actor: user.username
    });
    await addAuditEvent(user.username, "mss raid executed", `${result.raidId} / ${result.logs.length} target(s)`, result.ok ? "success" : "failed").catch(() => {});
    if (!result.ok) {
      return redirectTo(request, `/government-access/mss-console?error=raid&detail=${encodeURIComponent(result.reason || "Raid failed: citizen record not found")}`);
    }
    await Promise.all(result.logs.map((log) => createCitizenAlert({
      walletId: log.walletId,
      type: "MSS Warning",
      issuingAuthority: "Ministry of State Security",
      message: `MSS raid completed. ${log.seizedItems?.length || 0} item type(s) seized. Fine: ${log.fineAmount || 0} PC. Reason: ${log.reason}`,
      enforcementAction: Number(log.fineAmount || 0) ? "asset_seizure" : "none",
      actionTaken: `${log.seizedItems?.length || 0} item type(s) seized`,
      amount: log.fineAmount || 0,
      linkedRecordType: "mss_raid",
      linkedRecordId: log.raidId,
      discordDeliveryRequested: true
    }, user).catch(() => null)));
    const emptyRaid = result.logs.every((log) => !log.seizedItems?.length && !Number(log.fineAmount || 0));
    return redirectTo(request, `/government-access/mss-console?raidSaved=1&count=${result.logs.length}&detail=${encodeURIComponent(emptyRaid ? "Raid completed: no contraband found" : "Raid completed")}`);
  }

  if (intent !== "create-security-alert") {
    return redirectTo(request, "/government-access/mss-console");
  }

  if (!canAccess(user, "mssTools")) {
    return redirectTo(request, "/government-access?denied=1");
  }

  const subjectName = clean(formData.get("subjectName"), 180);
  const classification = clean(formData.get("classification"), 80);
  const threatLevel = clean(formData.get("threatLevel"), 80);
  const reason = clean(formData.get("reason"), 1400);
  const evidenceNotes = clean(formData.get("evidenceNotes"), 1400);
  const distribution = mapDistribution(formData.get("distribution"));
  const requestedPing = clean(formData.get("pingOption") || "none", 40);
  const pingOption = ["none", "here", "everyone"].includes(requestedPing) ? requestedPing : "none";
  const pingConfirmed = formData.get("confirmPingBroadcast") === "on";
  const targetDiscordId = clean(formData.get("targetDiscordId"), 80);
  const requiresApproval = formData.get("requiresApproval") === "on";

  if (!subjectName || !reason) {
    return redirectTo(request, "/government-access/mss-console?error=required&detail=Subject%20and%20summary%20are%20required.");
  }

  if (!mssClassifications.includes(classification) || !mssThreatLevels.includes(threatLevel)) {
    return redirectTo(request, "/government-access/mss-console?error=invalid&detail=Invalid%20classification%20or%20threat%20level.");
  }

  if (distribution === "specific_user" && !targetDiscordId) {
    return redirectTo(request, "/government-access/mss-console?error=discord&detail=Specific%20Discord%20ID%20is%20required.");
  }

  try {
    const type = classification === "Enemy of the State" ? "treason_notice" : "mss_alert";
    const broadcast = await createDiscordBroadcast({
      type,
      title:
        classification === "Enemy of the State"
          ? "MSS Security Directive"
          : "Ministry of State Security Advisory",
      body: formatMssSecurityAlert({
        subjectName,
        classification,
        threatLevel,
        reason,
        evidenceNotes
      }),
      distribution,
      pingOption,
      pingConfirmed,
      targetDiscordId,
      requiresApproval:
        requiresApproval ||
        requiresChairmanApproval({
          distribution,
          type,
          pingOption
        }),
      confirmed: false,
      linkedType: "mss-security-alert",
      linkedId: subjectName,
      requestedBy: user.username,
      requestedRole: user.role
    });

    if (distribution === "specific_user" && targetDiscordId) {
      await createCitizenAlert({
        discordId: targetDiscordId,
        type: "MSS Warning",
        issuingAuthority: "Ministry of State Security",
        message: formatMssSecurityAlert({ subjectName, classification, threatLevel, reason, evidenceNotes }),
        actionTaken: `${classification} security advisory`,
        linkedRecordType: "mss-security-alert",
        linkedRecordId: subjectName,
        discordDeliveryRequested: true
      }, user).catch(() => null);
    }

    await addAuditEvent(
      user.username,
      "mss security alert queued",
      `${broadcast.id} / ${subjectName} / ${classification} / ping ${broadcast.pingOption || "none"}`,
      "success"
    );
    return redirectTo(request, "/government-access/mss-console?saved=1");
  } catch (error) {
    await addAuditEvent(user.username, "mss security alert failed", subjectName, "failed").catch(() => {});
    return redirectTo(
      request,
      `/government-access/mss-console?error=storage&detail=${encodeURIComponent(error.message)}`
    );
  }
});
