import { NextResponse } from "next/server";
import {
  createGovernmentUser,
  deleteGovernmentUser,
  disableGovernmentUser,
  parseUserForm,
  requireGovernmentUser,
  resetGovernmentPassword,
  updateGovernmentUser
} from "../../../../lib/government-auth";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function POST(request) {
  const actor = await requireGovernmentUser("userControl");
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();
  const username = String(formData.get("username") || "").trim().toLowerCase();

  if (intent === "create") {
    const result = await createGovernmentUser(actor, parseUserForm(formData));
    const suffix = result.ok
      ? `?saved=1&temporaryPassword=${encodeURIComponent(result.temporaryPassword)}`
      : "?error=exists";
    return redirectTo(request, `/government-access/users${suffix}`);
  }

  if (intent === "update" && username) {
    await updateGovernmentUser(actor, username, parseUserForm(formData));
    return redirectTo(request, "/government-access/users?saved=1");
  }

  if (intent === "disable" && username) {
    await disableGovernmentUser(actor, username);
    return redirectTo(request, "/government-access/users?saved=1");
  }

  if (intent === "delete" && username) {
    await deleteGovernmentUser(actor, username);
    return redirectTo(request, "/government-access/users?saved=1");
  }

  if (intent === "reset-password" && username) {
    const temporaryPassword = await resetGovernmentPassword(actor, username);
    return redirectTo(
      request,
      `/government-access/users?saved=1&temporaryPassword=${encodeURIComponent(temporaryPassword)}`
    );
  }

  return redirectTo(request, "/government-access/users");
}
