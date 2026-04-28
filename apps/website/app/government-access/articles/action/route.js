import { NextResponse } from "next/server";
import {
  createArticle,
  deleteArticle,
  parseArticleForm,
  updateArticle
} from "../../../../lib/articles";
import {
  addAuditEvent,
  assertTrustedPostOrigin,
  requireGovernmentUser
} from "../../../../lib/government-auth";
import {
  createDiscordBroadcast,
  formatBroadcastMessage,
  parseBroadcastOptions
} from "../../../../lib/discord-broadcasts";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

function canBroadcast(user, type) {
  if (type === "treason_notice") {
    return ["Supreme Chairman", "Executive Director"].includes(user.role);
  }

  return ["Supreme Chairman", "Executive Director", "Minister"].includes(user.role);
}

async function enqueueArticleBroadcast(user, formData, fields, linkedId = "") {
  const options = parseBroadcastOptions(formData);

  if (!options.enabled) {
    return null;
  }

  if (!canBroadcast(user, options.type)) {
    throw new Error("Your role is not authorised to send article broadcasts.");
  }

  if (options.type === "treason_notice" && !options.confirmed) {
    throw new Error("Enemy of the State notices require confirmation.");
  }

  return createDiscordBroadcast({
    type: options.type,
    title:
      options.type === "emergency"
        ? "Emergency Directive"
        : options.type === "mss_alert"
          ? "Ministry of State Security Advisory"
          : options.type === "treason_notice"
            ? "MSS Security Directive"
            : "Official WPU News Broadcast",
    body: formatBroadcastMessage(options.type, {
      title: fields.title,
      body: fields.subtitle || fields.body,
      link: linkedId ? `/news/${linkedId}` : ""
    }),
    distribution: options.distribution,
    targetDiscordId: options.targetDiscordId,
    confirmed: options.confirmed,
    linkedType: "article",
    linkedId,
    requestedBy: user.username,
    requestedRole: user.role
  });
}

export async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/government-access?denied=1");
  }

  const user = await requireGovernmentUser("articleControl");
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();

  if (intent === "add") {
    const fields = parseArticleForm(formData);

    if (!fields.title || !fields.body) {
      return redirectTo(request, "/government-access/articles?error=required");
    }

    try {
      const articles = await createArticle(fields);
      const createdArticle = articles.find((article) => article.title === fields.title);
      const broadcast = await enqueueArticleBroadcast(user, formData, fields, createdArticle?.id || "");
      await addAuditEvent(user.username, "article added", fields.title, "success");
      if (broadcast) {
        await addAuditEvent(user.username, "discord broadcast queued", broadcast.id, "success");
      }
      return redirectTo(request, `/government-access/articles?saved=1${broadcast ? "&broadcast=queued" : ""}`);
    } catch (error) {
      return redirectTo(
        request,
        `/government-access/articles?error=storage&detail=${encodeURIComponent(error.message)}`
      );
    }
  }

  if (intent === "update") {
    const id = String(formData.get("id") || "").trim();
    const fields = parseArticleForm(formData);

    if (!id || !fields.title || !fields.body) {
      return redirectTo(request, "/government-access/articles?error=required");
    }

    try {
      await updateArticle(id, fields);
      const broadcast = await enqueueArticleBroadcast(user, formData, fields, id);
      await addAuditEvent(user.username, "article edited", id, "success");
      if (broadcast) {
        await addAuditEvent(user.username, "discord broadcast queued", broadcast.id, "success");
      }
      return redirectTo(request, `/government-access/articles?saved=1${broadcast ? "&broadcast=queued" : ""}`);
    } catch (error) {
      return redirectTo(
        request,
        `/government-access/articles?error=storage&detail=${encodeURIComponent(error.message)}`
      );
    }
  }

  if (intent === "delete") {
    const id = String(formData.get("id") || "").trim();

    if (id) {
      try {
        await deleteArticle(id);
        await addAuditEvent(user.username, "article deleted", id, "success");
      } catch (error) {
        return redirectTo(
          request,
          `/government-access/articles?error=storage&detail=${encodeURIComponent(error.message)}`
        );
      }
    }

    return redirectTo(request, "/government-access/articles?saved=1");
  }

  return redirectTo(request, "/government-access/articles");
}
