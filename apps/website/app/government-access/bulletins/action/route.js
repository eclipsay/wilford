import { NextResponse } from "next/server";
import {
  createBulletin,
  deleteBulletin,
  moveBulletin,
  parseBulletinForm,
  updateBulletin
} from "../../../../lib/bulletins";
import { addAuditEvent, requireGovernmentUser } from "../../../../lib/government-auth";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function POST(request) {
  const user = await requireGovernmentUser("bulletinControl");
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();

  if (intent === "add") {
    const fields = parseBulletinForm(formData);

    if (!fields.headline) {
      return redirectTo(request, "/government-access/bulletins?error=headline");
    }

    await createBulletin(fields);
    await addAuditEvent(user.username, "bulletin added", fields.headline, "success");
    return redirectTo(request, "/government-access/bulletins?saved=1");
  }

  if (intent === "update") {
    const id = String(formData.get("id") || "").trim();
    const fields = parseBulletinForm(formData);

    if (!id || !fields.headline) {
      return redirectTo(request, "/government-access/bulletins?error=headline");
    }

    await updateBulletin(id, fields);
    await addAuditEvent(user.username, "bulletin edited", id, "success");
    return redirectTo(request, "/government-access/bulletins?saved=1");
  }

  if (intent === "delete") {
    const id = String(formData.get("id") || "").trim();

    if (id) {
      await deleteBulletin(id);
      await addAuditEvent(user.username, "bulletin deleted", id, "success");
    }

    return redirectTo(request, "/government-access/bulletins?saved=1");
  }

  if (intent === "move") {
    const id = String(formData.get("id") || "").trim();
    const direction = String(formData.get("direction") || "down") === "up" ? "up" : "down";

    if (id) {
      await moveBulletin(id, direction);
    }

    return redirectTo(request, "/government-access/bulletins?saved=1");
  }

  return redirectTo(request, "/government-access/bulletins");
}
