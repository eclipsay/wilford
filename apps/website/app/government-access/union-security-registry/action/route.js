import { NextResponse } from "next/server";
import { assertTrustedPostOrigin, canAccess, requireGovernmentUser } from "../../../../lib/government-auth";
import { createCitizenRecord, updateCitizenRecord, updateDistrictProfile } from "../../../../lib/citizen-state";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/government-access?denied=1");
  }

  const actor = await requireGovernmentUser("identitySecurity");
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();
  const identityAccess = canAccess(actor, "identityRegistry");

  if (intent === "district") {
    if (!identityAccess) return redirectTo(request, "/government-access?denied=1");
    await updateDistrictProfile(String(formData.get("districtId") || "").trim(), Object.fromEntries(formData.entries()));
    return redirectTo(request, "/government-access/union-security-registry?saved=district");
  }

  if (intent === "create") {
    if (!identityAccess) return redirectTo(request, "/government-access?denied=1");
    await createCitizenRecord(Object.fromEntries(formData.entries()));
    return redirectTo(request, "/government-access/union-security-registry?saved=create");
  }

  const id = String(formData.get("citizenId") || "").trim();
  const fields = Object.fromEntries(formData.entries());
  if (["suspend", "revoke", "lost"].includes(intent)) {
    fields.verificationStatus = intent === "suspend" ? "Suspended" : intent === "revoke" ? "Revoked" : "Lost/Stolen";
    fields.lostOrStolen = intent === "lost";
  }
  fields.regenerateVerificationCode = intent === "regenerate-code";
  fields.regenerateSecurityId = intent === "regenerate-id";
  await updateCitizenRecord(id, fields);
  return redirectTo(request, `/government-access/union-security-registry?saved=record&citizen=${encodeURIComponent(id)}`);
}
