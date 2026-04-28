import { NextResponse } from "next/server";
import {
  createGovernmentUser,
  assertTrustedPostOrigin,
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

function storageErrorPath(error) {
  const detail = encodeURIComponent(String(error?.message || "Unknown storage failure").slice(0, 180));
  return `/government-access/users?error=storage&detail=${detail}`;
}

export async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/government-access?denied=1");
  }

  const actor = await requireGovernmentUser("userControl");
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();
  const username = String(formData.get("username") || "").trim().toLowerCase();

  try {
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
  } catch (error) {
    return redirectTo(request, storageErrorPath(error));
  }

  return redirectTo(request, "/government-access/users");
}
