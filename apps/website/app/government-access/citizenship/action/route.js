import { NextResponse } from "next/server";
import { safeAction } from "../../../../lib/action-routes";
import {
  archiveResolvedCitizenApplications,
  approveCitizenApplication,
  isValidDiscordUserId,
  parseApplicationReviewForm,
  resendCitizenLogin,
  updateCitizenApplication
} from "../../../../lib/citizen-applications";
import {
  addAuditEvent,
  assertTrustedPostOrigin,
  requireGovernmentUser
} from "../../../../lib/government-auth";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

export const POST = safeAction("government-access/citizenship/action", "/government-access/citizenship", async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/government-access?denied=1");
  }

  const user = await requireGovernmentUser("citizenshipReview");
  const formData = await request.formData();
  const id = String(formData.get("id") || "").trim();

  if (!id) {
    return redirectTo(request, "/government-access/citizenship?error=missing");
  }

  try {
    const intent = String(formData.get("intent") || "save").trim();

    if (intent === "bulk_archive") {
      const count = await archiveResolvedCitizenApplications(user.username);
      await addAuditEvent(user.username, "citizenship applications bulk archived", `${count} records`, "success");
      return redirectTo(request, "/government-access/citizenship?filter=archived&saved=1");
    }

    const fields = {
      ...parseApplicationReviewForm(formData),
      actor: user.username
    };

    if (!isValidDiscordUserId(fields.discordUserId)) {
      return redirectTo(request, "/government-access/citizenship?error=invalid-discord-id&detail=Valid%20Discord%20User%20ID%20is%20required.");
    }

    if (intent === "approve") {
      const result = await approveCitizenApplication(id, {
        approvedBy: user.username,
        actor: user.username,
        approvalMethod: "Website",
        decisionNote: fields.decisionNote,
        portalUrl: `${new URL(request.url).origin}/citizen-portal`
      });
      await addAuditEvent(
        user.username,
        "citizenship application approved",
        `${id} / citizen=${result?.citizenRecord?.id || "provisioned"}`,
        "success"
      );
      return redirectTo(request, "/government-access/citizenship?saved=approved");
    }

    if (intent === "resend_login") {
      await resendCitizenLogin(id, user.username);
      await addAuditEvent(user.username, "citizen login resent", id, "success");
      return redirectTo(request, "/government-access/citizenship?saved=resend-login");
    }

    if (intent === "reject") {
      fields.status = "rejected";
    }

    if (fields.status === "approved") {
      const result = await approveCitizenApplication(id, {
        approvedBy: user.username,
        actor: user.username,
        approvalMethod: "Website",
        decisionNote: fields.decisionNote,
        portalUrl: `${new URL(request.url).origin}/citizen-portal`
      });
      await addAuditEvent(
        user.username,
        "citizenship application approved",
        `${id} / citizen=${result?.citizenRecord?.id || "provisioned"}`,
        "success"
      );
      return redirectTo(request, "/government-access/citizenship?saved=approved");
    }

    if (intent === "under_review") {
      fields.status = "under_review";
    }

    if (intent === "accept_appeal") {
      fields.status = "under_review";
      fields.needsAttention = true;
      fields.publicResponse =
        fields.publicResponse || "Your appeal has been accepted for further review.";
    }

    if (intent === "reject_appeal") {
      fields.status = "rejected";
      fields.needsAttention = false;
      fields.publicResponse = fields.publicResponse || "Your appeal has been rejected.";
    }

    await updateCitizenApplication(id, fields);
    await addAuditEvent(
      user.username,
      "citizenship application reviewed",
      `${id} / ${fields.status}`,
      "success"
    );
    return redirectTo(request, "/government-access/citizenship?saved=1");
  } catch (error) {
    return redirectTo(
      request,
      `/government-access/citizenship?error=storage&detail=${encodeURIComponent(error.message)}`
    );
  }
});
