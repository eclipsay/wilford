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

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
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
      await createArticle(fields);
      await addAuditEvent(user.username, "article added", fields.title, "success");
      return redirectTo(request, "/government-access/articles?saved=1");
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
      await addAuditEvent(user.username, "article edited", id, "success");
      return redirectTo(request, "/government-access/articles?saved=1");
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
