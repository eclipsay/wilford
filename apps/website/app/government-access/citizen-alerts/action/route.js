import { NextResponse } from "next/server";
import {
  assertTrustedPostOrigin,
  requireGovernmentUser
} from "../../../../lib/government-auth";
import { issueCitizenAlerts } from "../../../../lib/citizen-alerts";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/government-access?denied=1");
  }

  const actor = await requireGovernmentUser("citizenAlerts");
  const formData = await request.formData();
  const result = await issueCitizenAlerts(Object.fromEntries(formData.entries()), actor);

  if (!result.ok) {
    const error = result.reason === "confirmation-required" ? "confirmation" : "permission";
    return redirectTo(request, `/government-access/citizen-alerts?error=${error}`);
  }

  return redirectTo(request, `/government-access/citizen-alerts?saved=1&count=${result.alerts.length}`);
}

