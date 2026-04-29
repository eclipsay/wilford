import { NextResponse } from "next/server";
import { safeAction } from "../../../lib/action-routes";
import {
  changeCitizenPassword,
  createCitizenRequest,
  getCurrentCitizen,
  loginCitizen,
  logoutCitizen,
  recordCitizenActivity
} from "../../../lib/citizen-state";
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
      formData.get("citizenName"),
      formData.get("unionSecurityId"),
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
