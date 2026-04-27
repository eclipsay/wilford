import { redirect } from "next/navigation";
import { addAuditEvent, getCurrentGovernmentUser, logoutGovernmentUser } from "../../../lib/government-auth";

export async function POST() {
  const user = await getCurrentGovernmentUser();

  if (user) {
    await addAuditEvent(user.username, "logout", "Government Access logout", "success");
  }

  await logoutGovernmentUser();
  redirect("/government-access/login");
}
