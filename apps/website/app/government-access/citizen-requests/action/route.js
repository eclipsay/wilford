import { NextResponse } from "next/server";
import { assertTrustedPostOrigin, requireGovernmentUser } from "../../../../lib/government-auth";
import { updateCitizenRequest } from "../../../../lib/citizen-state";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/government-access?denied=1");
  }

  const actor = await requireGovernmentUser("citizenRequestControl");
  const formData = await request.formData();
  const id = String(formData.get("requestId") || "").trim();
  await updateCitizenRequest(id, {
    status: formData.get("status"),
    assignedMinistry: formData.get("assignedMinistry"),
    governmentNotes: formData.get("governmentNotes"),
    citizenResponse: formData.get("citizenResponse"),
    escalation: formData.get("escalation"),
    close: formData.get("intent") === "close"
  });

  return redirectTo(request, `/government-access/citizen-requests?saved=1&actor=${encodeURIComponent(actor.username)}`);
}
