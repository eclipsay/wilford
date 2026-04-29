import { NextResponse } from "next/server";
import { safeAction } from "../../../../lib/action-routes";
import {
  assertTrustedPostOrigin,
  requireGovernmentUser
} from "../../../../lib/government-auth";
import { issueCitizenAlerts, resendCitizenAlertDiscord, updateCitizenAlert } from "../../../../lib/citizen-alerts";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

export const POST = safeAction("government-access/citizen-alerts/action", "/government-access/citizen-alerts", async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/government-access?denied=1");
  }

  const actor = await requireGovernmentUser("citizenAlerts");
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "issue").trim();

  if (intent === "resolve") {
    const alertId = String(formData.get("alertId") || "").trim();
    const result = await updateCitizenAlert(alertId, {
      status: "resolved",
      resolvedAt: new Date().toISOString(),
      resolvedBy: actor.username || actor.displayName || "Government"
    });
    return redirectTo(request, `/government-access/citizen-alerts?${result.ok ? "saved=resolved" : "error=permission"}`);
  }

  if (intent === "resend-discord") {
    const alertId = String(formData.get("alertId") || "").trim();
    const result = await resendCitizenAlertDiscord(alertId, actor);
    return redirectTo(request, `/government-access/citizen-alerts?${result.ok ? "saved=resend" : "error=permission"}`);
  }

  const result = await issueCitizenAlerts(Object.fromEntries(formData.entries()), actor);

  if (!result.ok) {
    const error = result.reason === "confirmation-required"
      ? "confirmation"
      : result.reason === "authority-denied"
        ? "authority"
        : "permission";
    return redirectTo(request, `/government-access/citizen-alerts?error=${error}`);
  }

  return redirectTo(request, `/government-access/citizen-alerts?saved=1&count=${result.alerts.length}`);
});
