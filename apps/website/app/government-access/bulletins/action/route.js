import { NextResponse } from "next/server";
import {
  createBulletin,
  deleteBulletin,
  moveBulletin,
  parseBulletinForm,
  updateBulletin
} from "../../../../lib/bulletins";
import { addAuditEvent, assertTrustedPostOrigin, requireGovernmentUser } from "../../../../lib/government-auth";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/government-access?denied=1");
  }

  const user = await requireGovernmentUser("bulletinControl");
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();

  if (intent === "add") {
    const fields = parseBulletinForm(formData);

    if (!fields.headline) {
      return redirectTo(request, "/government-access/bulletins?error=headline");
    }

    try {
      await createBulletin(fields);
      await addAuditEvent(user.username, "bulletin added", fields.headline, "success");
      return redirectTo(request, "/government-access/bulletins?saved=1");
    } catch {
      return redirectTo(request, "/government-access/bulletins?error=storage");
    }
  }

  if (intent === "update") {
    const id = String(formData.get("id") || "").trim();
    const fields = parseBulletinForm(formData);

    if (!id || !fields.headline) {
      return redirectTo(request, "/government-access/bulletins?error=headline");
    }

    try {
      await updateBulletin(id, fields);
      await addAuditEvent(user.username, "bulletin edited", id, "success");
      return redirectTo(request, "/government-access/bulletins?saved=1");
    } catch {
      return redirectTo(request, "/government-access/bulletins?error=storage");
    }
  }

  if (intent === "delete") {
    const id = String(formData.get("id") || "").trim();

    if (id) {
      try {
        await deleteBulletin(id);
        await addAuditEvent(user.username, "bulletin deleted", id, "success");
      } catch {
        return redirectTo(request, "/government-access/bulletins?error=storage");
      }
    }

    return redirectTo(request, "/government-access/bulletins?saved=1");
  }

  if (intent === "move") {
    const id = String(formData.get("id") || "").trim();
    const direction = String(formData.get("direction") || "down") === "up" ? "up" : "down";

    if (id) {
      try {
        await moveBulletin(id, direction);
      } catch {
        return redirectTo(request, "/government-access/bulletins?error=storage");
      }
    }

    return redirectTo(request, "/government-access/bulletins?saved=1");
  }

  return redirectTo(request, "/government-access/bulletins");
}
