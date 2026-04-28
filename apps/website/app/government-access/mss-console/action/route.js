import { NextResponse } from "next/server";
import {
  addAuditEvent,
  assertTrustedPostOrigin,
  requireGovernmentUser
} from "../../../../lib/government-auth";
import {
  createDiscordBroadcast,
  formatMssSecurityAlert,
  mssClassifications,
  mssThreatLevels
} from "../../../../lib/discord-broadcasts";

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

  const user = await requireGovernmentUser("mssTools");
  const formData = await request.formData();
  const intent = clean(formData.get("intent"), 80);

  if (intent !== "create-security-alert") {
    return redirectTo(request, "/government-access/mss-console");
  }

  const subjectName = clean(formData.get("subjectName"), 180);
  const classification = clean(formData.get("classification"), 80);
  const threatLevel = clean(formData.get("threatLevel"), 80);
  const reason = clean(formData.get("reason"), 1400);
  const evidenceNotes = clean(formData.get("evidenceNotes"), 1400);
  const distribution = mapDistribution(formData.get("distribution"));
  const targetDiscordId = clean(formData.get("targetDiscordId"), 80);
  const confirmed = formData.get("confirmDiscordBroadcast") === "on";
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

  if (
    (distribution === "dm_all" || classification === "Enemy of the State") &&
    !confirmed
  ) {
    return redirectTo(request, "/government-access/mss-console?error=confirm&detail=Dangerous%20security%20broadcasts%20require%20confirmation.");
  }

  try {
    const broadcast = await createDiscordBroadcast({
      type: classification === "Enemy of the State" ? "treason_notice" : "mss_alert",
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
      targetDiscordId,
      requiresApproval,
      confirmed,
      linkedType: "mss-security-alert",
      linkedId: subjectName,
      requestedBy: user.username,
      requestedRole: user.role
    });

    await addAuditEvent(
      user.username,
      "mss security alert queued",
      `${broadcast.id} / ${subjectName} / ${classification}`,
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
