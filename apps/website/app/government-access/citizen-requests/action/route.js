import { NextResponse } from "next/server";
import { safeAction } from "../../../../lib/action-routes";
import { assertTrustedPostOrigin, requireGovernmentUser } from "../../../../lib/government-auth";
import { getCitizenState, updateCitizenRequest } from "../../../../lib/citizen-state";
import { createCitizenAlert } from "../../../../lib/citizen-alerts";
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
    await createCitizenAlert({
      citizenId: citizen.id,
      type: "Citizenship Notice",
      issuingAuthority: "Citizen Services",
      message: result.ok
        ? `Your request ${requestRecord.id} was approved. Work permit approved for ${requestRecord.targetDistrict}${requestRecord.targetJobName ? ` / ${requestRecord.targetJobName}` : ""}.`
        : `Your request ${requestRecord.id} was reviewed. Work permit approval failed.`,
      actionTaken: result.ok ? "Request approved" : "Request reviewed",
      linkedRecordType: "citizen_request",
      linkedRecordId: requestRecord.id,
      discordDeliveryRequested: true
    }, actor).catch(() => null);
    return redirectTo(request, `/government-access/citizen-requests?saved=permit&actor=${encodeURIComponent(actor.username)}`);
  }

  const updatedState = await updateCitizenRequest(id, {
    status: formData.get("status"),
    assignedMinistry: formData.get("assignedMinistry"),
    governmentNotes: formData.get("governmentNotes"),
    citizenResponse: formData.get("citizenResponse"),
    escalation: formData.get("escalation"),
    close: intent === "close"
  });
  const updatedRequest = updatedState.citizenRequests.find((item) => item.id === id);
  if (updatedRequest?.citizenId && (formData.get("citizenResponse") || intent === "close")) {
    await createCitizenAlert({
      citizenId: updatedRequest.citizenId,
      type: "Citizenship Notice",
      issuingAuthority: updatedRequest.assignedMinistry || "Citizen Services",
      message: updatedRequest.citizenResponse || `Your request ${updatedRequest.id} was updated.`,
      actionTaken: intent === "close" ? "Request closed" : `Request ${updatedRequest.status}`,
      linkedRecordType: "citizen_request",
      linkedRecordId: updatedRequest.id,
      discordDeliveryRequested: true
    }, actor).catch(() => null);
  }

  return redirectTo(request, `/government-access/citizen-requests?saved=1&actor=${encodeURIComponent(actor.username)}`);
});
