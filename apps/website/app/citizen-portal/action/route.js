import { NextResponse } from "next/server";
import { createCitizenRequest } from "../../../lib/citizen-state";
import { assertTrustedPostOrigin } from "../../../lib/government-auth";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/citizen-portal?error=origin");
  }

  const formData = await request.formData();
  const citizenId = String(formData.get("citizenId") || "").trim();
  await createCitizenRequest({
    citizenName: formData.get("citizenName"),
    citizenId,
    district: formData.get("district"),
    category: formData.get("category"),
    priority: formData.get("priority"),
    message: formData.get("message"),
    attachments: formData.get("attachments")
  });

  return redirectTo(request, `/citizen-portal?citizen=${encodeURIComponent(citizenId)}&saved=request`);
}
