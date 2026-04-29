import { NextResponse } from "next/server";
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
import { conductMssRaid } from "../../../../lib/panem-credit";

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

export async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/government-access?denied=1");
  }

  const user = await requireGovernmentUser("enemyRegistryDraft");
  const formData = await request.formData();
  const intent = clean(formData.get("intent"), 80);

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
    return redirectTo(request, `/government-access/mss-console?raidSaved=1&count=${result.logs.length}`);
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
}
