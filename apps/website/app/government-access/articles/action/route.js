import { NextResponse } from "next/server";
import { safeAction } from "../../../../lib/action-routes";
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
  getDiscordBroadcasts,
  parseBroadcastOptions,
  requiresChairmanApproval
} from "../../../../lib/discord-broadcasts";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

function canBroadcast(user) {
  return ["Supreme Chairman", "Executive Director", "Minister"].includes(user.role);
}

function isPublishedArticle(fields) {
  return fields.status === "published" || fields.published === true;
}

function publicUrl(value) {
  const clean = String(value || "").trim();

  if (!clean) {
    return "";
  }

  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }

  if (clean.startsWith("/")) {
    return `https://wilfordindustries.org${clean}`;
  }

  return `https://wilfordindustries.org/${clean.replace(/^public\//, "")}`;
}

async function enqueueArticleBroadcast(user, formData, fields, linkedId = "") {
  const options = parseBroadcastOptions(formData);

  if (!options.enabled) {
    return { status: "none" };
  }

  if (!isPublishedArticle(fields)) {
    return { status: "skipped-draft" };
  }

  if (!canBroadcast(user)) {
    throw new Error("Your role is not authorised to send article broadcasts.");
  }

  if (linkedId && !options.forceResend) {
    const broadcasts = await getDiscordBroadcasts().catch(() => []);
    const alreadyBroadcast = broadcasts.some(
      (broadcast) =>
        broadcast.linkedType === "article" &&
        broadcast.linkedId === linkedId &&
        ["pending", "pending_approval", "approval_notified", "processing", "completed"].includes(broadcast.status)
    );

    if (alreadyBroadcast) {
      return { status: "skipped-duplicate" };
    }
  }

  const broadcast = await createDiscordBroadcast({
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
    headline: fields.title,
    excerpt: fields.subtitle || fields.body,
    issuer: fields.source || fields.category || user.role,
    classification: fields.category || "Official News",
    imageUrl: publicUrl(fields.imageUrl || fields.heroImage || fields.thumbnail),
    articleUrl: linkedId ? publicUrl(`/news/${linkedId}`) : "",
    distribution: options.distribution,
    pingOption: options.pingOption,
    pingConfirmed: options.pingConfirmed,
    targetDiscordId: options.targetDiscordId,
    requiresApproval: requiresChairmanApproval({
      distribution: options.distribution,
      type: options.type,
      pingOption: options.pingOption
    }),
    confirmed: false,
    linkedType: "article",
    linkedId,
    requestedBy: user.username,
    requestedRole: user.role
  });

  return broadcast ? { status: "queued", broadcast } : { status: "none" };
}

function broadcastRedirectSuffix(result) {
  if (result?.status === "queued") {
    return "&broadcast=queued";
  }

  if (result?.status === "skipped-draft") {
    return "&broadcast=skipped-draft";
  }

  if (result?.status === "skipped-duplicate") {
    return "&broadcast=skipped-duplicate";
  }

  return "";
}

export const POST = safeAction("government-access/articles/action", "/government-access/articles", async function POST(request) {
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
      const broadcastResult = await enqueueArticleBroadcast(user, formData, fields, createdArticle?.id || "");
      await addAuditEvent(user.username, "article added", fields.title, "success");
      if (broadcastResult?.broadcast) {
        await addAuditEvent(user.username, "discord broadcast queued", `${broadcastResult.broadcast.id} / ping ${broadcastResult.broadcast.pingOption || "none"}`, "success");
      } else if (broadcastResult?.status === "skipped-draft") {
        await addAuditEvent(user.username, "discord broadcast skipped", "article not published", "info");
      } else if (broadcastResult?.status === "skipped-duplicate") {
        await addAuditEvent(user.username, "discord broadcast skipped", "duplicate article broadcast", "info");
      }
      return redirectTo(request, `/government-access/articles?saved=1${broadcastRedirectSuffix(broadcastResult)}`);
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
      const broadcastResult = await enqueueArticleBroadcast(user, formData, fields, id);
      await addAuditEvent(user.username, "article edited", id, "success");
      if (broadcastResult?.broadcast) {
        await addAuditEvent(user.username, "discord broadcast queued", `${broadcastResult.broadcast.id} / ping ${broadcastResult.broadcast.pingOption || "none"}`, "success");
      } else if (broadcastResult?.status === "skipped-draft") {
        await addAuditEvent(user.username, "discord broadcast skipped", "article not published", "info");
      } else if (broadcastResult?.status === "skipped-duplicate") {
        await addAuditEvent(user.username, "discord broadcast skipped", "duplicate article broadcast", "info");
      }
      return redirectTo(request, `/government-access/articles?saved=1${broadcastRedirectSuffix(broadcastResult)}`);
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
});
