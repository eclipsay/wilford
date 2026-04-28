import { NextResponse } from "next/server";
import {
  parseApplicationReviewForm,
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

export async function POST(request) {
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
    const fields = parseApplicationReviewForm(formData);
    await updateCitizenApplication(id, fields);
    await addAuditEvent(user.username, "citizenship application reviewed", id, "success");
    return redirectTo(request, "/government-access/citizenship?saved=1");
  } catch (error) {
    return redirectTo(
      request,
      `/government-access/citizenship?error=storage&detail=${encodeURIComponent(error.message)}`
    );
  }
}
