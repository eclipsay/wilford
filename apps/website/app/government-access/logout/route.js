import { NextResponse } from "next/server";
import { addAuditEvent, getCurrentGovernmentUser, logoutGovernmentUser } from "../../../lib/government-auth";

export async function POST(request) {
  const user = await getCurrentGovernmentUser().catch(() => null);

  if (user) {
    await addAuditEvent(user.username, "logout", "Government Access logout", "success").catch(() => {});
  }

  await logoutGovernmentUser();
  return NextResponse.redirect(new URL("/government-access/login", request.url));
}
