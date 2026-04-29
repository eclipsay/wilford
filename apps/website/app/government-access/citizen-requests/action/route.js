import { NextResponse } from "next/server";
import { safeAction } from "../../../../lib/action-routes";
import { assertTrustedPostOrigin, requireGovernmentUser } from "../../../../lib/government-auth";
import { getCitizenState, updateCitizenRequest } from "../../../../lib/citizen-state";
import { getEconomyStore, getWallet, grantWorkPermit } from "../../../../lib/panem-credit";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

export const POST = safeAction("government-access/citizen-requests/action", "/government-access/citizen-requests", async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/government-access?denied=1");
  }

  const actor = await requireGovernmentUser("citizenRequestControl");
  const formData = await request.formData();
  const id = String(formData.get("requestId") || "").trim();
  const intent = String(formData.get("intent") || "save").trim();

  if (intent === "approve-work-permit") {
    const state = await getCitizenState();
    const requestRecord = state.citizenRequests.find((item) => item.id === id);
    const citizen = state.citizenRecords.find((record) => record.id === requestRecord?.citizenId);
    const economy = await getEconomyStore();
    const wallet = citizen ? getWallet(economy, citizen.walletId || citizen.userId || citizen.discordId || citizen.id) : null;
    if (!requestRecord || requestRecord.category !== "Work Permit Request" || !citizen || !wallet) {
      return redirectTo(request, "/government-access/citizen-requests?error=permit");
    }
    const result = await grantWorkPermit({
      walletId: wallet.id,
      citizenId: citizen.id,
      citizenName: citizen.citizenName || citizen.name,
      targetDistrict: requestRecord.targetDistrict,
      jobId: requestRecord.targetJobId,
      requestId: requestRecord.id,
      approvedBy: actor.username,
      durationDays: formData.get("durationDays") || 30
    });
    await updateCitizenRequest(id, {
      status: result.ok ? "Approved" : "Under Review",
      assignedMinistry: formData.get("assignedMinistry"),
      governmentNotes: formData.get("governmentNotes"),
      citizenResponse: result.ok
        ? `Work permit approved for ${requestRecord.targetDistrict}${requestRecord.targetJobName ? ` / ${requestRecord.targetJobName}` : ""}.`
        : "Work permit approval failed.",
      permitId: result.permit?.id || "",
      permitExpiresAt: result.permit?.expiresAt || ""
    });
    return redirectTo(request, `/government-access/citizen-requests?saved=permit&actor=${encodeURIComponent(actor.username)}`);
  }

  await updateCitizenRequest(id, {
    status: formData.get("status"),
    assignedMinistry: formData.get("assignedMinistry"),
    governmentNotes: formData.get("governmentNotes"),
    citizenResponse: formData.get("citizenResponse"),
    escalation: formData.get("escalation"),
    close: intent === "close"
  });

  return redirectTo(request, `/government-access/citizen-requests?saved=1&actor=${encodeURIComponent(actor.username)}`);
});
