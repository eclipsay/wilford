import { NextResponse } from "next/server";
import {
  createBulletin,
  deleteBulletin,
  moveBulletin,
  parseBulletinForm,
  updateBulletin
} from "../../../../lib/bulletins";
import { addAuditEvent, assertTrustedPostOrigin, requireGovernmentUser } from "../../../../lib/government-auth";
import {
  createDiscordBroadcast,
  formatBroadcastMessage,
  parseBroadcastOptions,
  requiresChairmanApproval
} from "../../../../lib/discord-broadcasts";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

function canBroadcast(user, fields) {
  if (["Supreme Chairman", "Executive Director"].includes(user.role)) {
    return true;
  }

  if (String(fields.category || "").includes("MSS")) {
    return user.role === "Security Command";
  }

  return ["Minister", "Government Official"].includes(user.role);
}

function broadcastTypeForBulletin(fields) {
  if (String(fields.category || "").includes("MSS")) {
    return "mss_alert";
  }

  return fields.priority === "emergency" ? "emergency" : "news";
}

function titleForBroadcastType(type) {
  if (type === "emergency") {
    return "Emergency Directive";
  }

  if (type === "mss_alert") {
    return "Ministry of State Security Advisory";
  }

  if (type === "treason_notice") {
    return "MSS Security Directive";
  }

  return "Official WPU News Broadcast";
}

async function enqueueBulletinBroadcast(user, formData, fields, linkedId = "") {
  const options = parseBroadcastOptions(formData);

  if (!options.enabled) {
    return null;
  }

  const type = options.type || broadcastTypeForBulletin(fields);

  if (!canBroadcast(user, fields)) {
    throw new Error("Your role is not authorised to send this broadcast.");
  }

  return createDiscordBroadcast({
    type,
    title: titleForBroadcastType(type),
    body: formatBroadcastMessage(type, {
      title: fields.headline,
      body: `${fields.category} bulletin. Priority: ${fields.priority}.`,
      link: fields.linkedArticleId ? `/news/${fields.linkedArticleId}` : ""
    }),
    distribution: options.distribution,
    targetDiscordId: options.targetDiscordId,
    requiresApproval: requiresChairmanApproval({
      distribution: options.distribution,
      type
    }),
    confirmed: false,
    linkedType: "bulletin",
    linkedId,
    requestedBy: user.username,
    requestedRole: user.role
  });
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
      const bulletins = await createBulletin(fields);
      const createdBulletin = bulletins.find((bulletin) => bulletin.headline === fields.headline);
      const broadcast = await enqueueBulletinBroadcast(user, formData, fields, createdBulletin?.id || "");
      await addAuditEvent(user.username, "bulletin added", fields.headline, "success");
      if (broadcast) {
        await addAuditEvent(user.username, "discord broadcast queued", broadcast.id, "success");
      }
      return redirectTo(request, `/government-access/bulletins?saved=1${broadcast ? "&broadcast=queued" : ""}`);
    } catch (error) {
      return redirectTo(
        request,
        `/government-access/bulletins?error=storage&detail=${encodeURIComponent(error.message)}`
      );
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
      const broadcast = await enqueueBulletinBroadcast(user, formData, fields, id);
      await addAuditEvent(user.username, "bulletin edited", id, "success");
      if (broadcast) {
        await addAuditEvent(user.username, "discord broadcast queued", broadcast.id, "success");
      }
      return redirectTo(request, `/government-access/bulletins?saved=1${broadcast ? "&broadcast=queued" : ""}`);
    } catch (error) {
      return redirectTo(
        request,
        `/government-access/bulletins?error=storage&detail=${encodeURIComponent(error.message)}`
      );
    }
  }

  if (intent === "delete") {
    const id = String(formData.get("id") || "").trim();

    if (id) {
      try {
        await deleteBulletin(id);
        await addAuditEvent(user.username, "bulletin deleted", id, "success");
      } catch (error) {
        return redirectTo(
          request,
          `/government-access/bulletins?error=storage&detail=${encodeURIComponent(error.message)}`
        );
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
      } catch (error) {
        return redirectTo(
          request,
          `/government-access/bulletins?error=storage&detail=${encodeURIComponent(error.message)}`
        );
      }
    }

    return redirectTo(request, "/government-access/bulletins?saved=1");
  }

  return redirectTo(request, "/government-access/bulletins");
}
