import { NextResponse } from "next/server";
import { safeAction } from "../../../../lib/action-routes";
import {
  addAuditEvent,
  assertTrustedPostOrigin,
  inferAssignedDistrict,
  requireGovernmentUser
} from "../../../../lib/government-auth";
import { createCitizenRequest, getCitizenState } from "../../../../lib/citizen-state";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

export const POST = safeAction("government-access/district-governor/action", "/government-access/district-governor", async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/government-access?denied=1");
  }

  const actor = await requireGovernmentUser("districtGovernorPanel");
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();
  const state = await getCitizenState();
  const assignedDistrict = actor.role === "District Governor"
    ? inferAssignedDistrict(actor, state.districtProfiles)
    : String(formData.get("district") || "").trim();
  const requestedDistrict = String(formData.get("district") || "").trim();

  if (actor.role === "District Governor" && requestedDistrict !== assignedDistrict) {
    await addAuditEvent(actor.username, "district governor access denied", `Attempted request for ${requestedDistrict || "unknown district"}`, "denied").catch(() => {});
    return redirectTo(request, "/government-access/district-governor?error=district");
  }

  if (intent === "funding-request") {
    const amount = Math.max(0, Number(formData.get("amount") || 0));
    const purpose = String(formData.get("purpose") || "District funding").replace(/[<>]/g, "").trim().slice(0, 180);
    const message = String(formData.get("message") || "").replace(/[<>]/g, "").trim().slice(0, 1600);
    await createCitizenRequest({
      citizenName: actor.displayName || actor.username,
      citizenId: `governor-${actor.username}`,
      district: assignedDistrict,
      category: "Financial Assistance Request",
      priority: formData.get("priority") || "Normal",
      message: `${purpose}: ${message} Requested amount: ${amount} PC.`,
      assignedMinistry: "Ministry of Credit & Records",
      governorName: actor.displayName || actor.username
    });
    await addAuditEvent(actor.username, "district funding request", `${assignedDistrict}: ${amount} PC for ${purpose}`, "success").catch(() => {});
    return redirectTo(request, "/government-access/district-governor?saved=funding");
  }

  return redirectTo(request, "/government-access/district-governor");
});
