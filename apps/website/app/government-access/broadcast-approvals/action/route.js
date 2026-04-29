import { NextResponse } from "next/server";
import { safeAction } from "../../../../lib/action-routes";
import {
  addAuditEvent,
  assertTrustedPostOrigin,
  requireGovernmentUser
} from "../../../../lib/government-auth";
import {
  getDiscordBroadcasts,
  updateDiscordBroadcast
} from "../../../../lib/discord-broadcasts";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

function clean(value, maxLength = 1000) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, maxLength);
}

export const POST = safeAction("government-access/broadcast-approvals/action", "/government-access/broadcast-approvals", async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/government-access?denied=1");
  }

  const user = await requireGovernmentUser("broadcastApproval");
  const formData = await request.formData();
  const id = clean(formData.get("id"), 160);
  const intent = clean(formData.get("intent"), 40);
  const approvalNote = clean(formData.get("approvalNote"), 1000);

  if (!id || !["approve", "decline"].includes(intent)) {
    return redirectTo(request, "/government-access/broadcast-approvals?error=invalid&detail=Invalid%20approval%20request.");
  }

  const broadcasts = await getDiscordBroadcasts().catch(() => []);
  const broadcast = broadcasts.find((item) => item.id === id);

  if (!broadcast || !["pending_approval", "approval_notified"].includes(broadcast.status)) {
    return redirectTo(request, "/government-access/broadcast-approvals?error=missing&detail=Broadcast%20request%20is%20not%20pending%20approval.");
  }

  try {
    if (intent === "approve") {
      await updateDiscordBroadcast(id, {
        status: "pending",
        confirmed: true,
        approvedAt: new Date().toISOString(),
        approvedBy: user.username,
        approvalNote
      });
      await addAuditEvent(user.username, "broadcast approved", id, "success");
    } else {
      await updateDiscordBroadcast(id, {
        status: "declined",
        confirmed: false,
        declinedAt: new Date().toISOString(),
        declinedBy: user.username,
        approvalNote
      });
      await addAuditEvent(user.username, "broadcast declined", id, "denied");
    }

    return redirectTo(request, "/government-access/broadcast-approvals?saved=1");
  } catch (error) {
    await addAuditEvent(user.username, "broadcast approval failed", id, "failed").catch(() => {});
    return redirectTo(
      request,
      `/government-access/broadcast-approvals?error=storage&detail=${encodeURIComponent(error.message)}`
    );
  }
});
