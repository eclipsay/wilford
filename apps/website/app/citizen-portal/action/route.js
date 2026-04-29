import { NextResponse } from "next/server";
import { economyJobDefaults, normalizeEconomyDistrict } from "@wilford/shared";
import { safeAction } from "../../../lib/action-routes";
import {
  changeCitizenPassword,
  createCitizenRequest,
  getCitizenState,
  getCurrentCitizen,
  loginCitizen,
  logoutCitizen,
  recordCitizenActivity
} from "../../../lib/citizen-state";
import { markCitizenAlertRead } from "../../../lib/citizen-alerts";
import { assertTrustedPostOrigin } from "../../../lib/government-auth";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

export const POST = safeAction("citizen-portal/action", "/citizen-portal", async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/citizen-portal?error=origin");
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();

  if (intent === "login") {
    const result = await loginCitizen(
      formData.get("citizenIdentifier"),
      formData.get("portalPassword")
    );
    const returnTo = String(formData.get("returnTo") || "/citizen-portal").trim();
    const safeReturnTo = returnTo.startsWith("/") && !returnTo.startsWith("//") ? returnTo : "/citizen-portal";
    return redirectTo(request, result.ok ? `${safeReturnTo}${safeReturnTo.includes("?") ? "&" : "?"}login=success` : "/citizen-portal?error=login");
  }

  if (intent === "logout") {
    await logoutCitizen();
    return redirectTo(request, "/citizen-portal?loggedOut=1");
  }

  const citizen = await getCurrentCitizen();
  if (!citizen) {
    return redirectTo(request, "/citizen-portal?error=session");
  }

  if (intent === "change_password") {
    const result = await changeCitizenPassword(
      citizen.id,
      formData.get("currentPassword"),
      formData.get("newPassword")
    );
    return redirectTo(request, result.ok ? "/citizen-portal?saved=password" : "/citizen-portal?error=password");
  }

  if (intent === "mark_alert_read" || intent === "mark_all_alerts_read") {
    await markCitizenAlertRead({
      citizenId: citizen.id,
      alertId: String(formData.get("alertId") || "").trim(),
      all: intent === "mark_all_alerts_read"
    });
    return redirectTo(request, "/citizen-portal?saved=alert-read#citizen-alert-center");
  }

  if (intent === "work_permit") {
    const rawTargetDistrict = String(formData.get("targetDistrict") || "").trim();
    const targetDistrict = rawTargetDistrict ? normalizeEconomyDistrict(rawTargetDistrict) : "";
    const targetJobId = String(formData.get("targetJobId") || "").trim();
    const job = economyJobDefaults.find((entry) => entry.id === targetJobId);
    const state = await getCitizenState();
    const districtProfile = state.districtProfiles.find((district) => district.canonicalName === targetDistrict || district.name === targetDistrict);
    if (
      !targetDistrict ||
      targetDistrict === normalizeEconomyDistrict(citizen.district) ||
      (targetJobId && (!job || normalizeEconomyDistrict(job.district) !== targetDistrict))
    ) {
      return redirectTo(request, "/panem-credit?error=work-permit-invalid#jobs-work");
    }
    const submitted = await createCitizenRequest({
      citizenName: citizen.name,
      citizenId: citizen.id,
      district: citizen.district,
      category: "Work Permit Request",
      priority: "Normal",
      assignedMinistry: "District Administration",
      targetDistrict,
      targetJobId,
      targetJobName: job?.name || "All district jobs",
      governorName: districtProfile?.governorName || "District Governor",
      message: `Work permit requested for ${targetDistrict}${job ? ` / ${job.name}` : ""}. Reason: ${formData.get("reason") || "No reason supplied."}`,
      attachments: ""
    });
    await recordCitizenActivity(citizen.id, "work permit requested", `${targetDistrict} / ${job?.name || "All jobs"} / ${submitted.id}`);
    return redirectTo(request, "/panem-credit?saved=permit-request#jobs-work");
  }

  const submitted = await createCitizenRequest({
    citizenName: citizen.name,
    citizenId: citizen.id,
    district: citizen.district,
    category: formData.get("category"),
    priority: formData.get("priority"),
    message: formData.get("message"),
    attachments: formData.get("attachments")
  });
  await recordCitizenActivity(citizen.id, "request submitted", `${submitted.category} / ${submitted.id}`);

  return redirectTo(request, "/citizen-portal?saved=request");
});
