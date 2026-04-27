import { NextResponse } from "next/server";
import {
  addCourtEntry,
  addOrReplaceAccessKey,
  archiveCourtCase,
  courtKeyRoles,
  deleteCourtCase,
  parseCourtCaseForm,
  revokeAccessKey,
  saveCourtCase
} from "../../../../lib/supreme-court";
import { addAuditEvent, requireGovernmentUser } from "../../../../lib/government-auth";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

export async function POST(request) {
  const user = await requireGovernmentUser("supremeCourtControl");
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();

  const id = String(formData.get("id") || "").trim();

  if (intent === "save-case") {
    const fields = parseCourtCaseForm(formData);

    if (!fields.title || !fields.caseNumber) {
      return redirectTo(request, "/government-access/supreme-court?error=case");
    }

    await saveCourtCase(fields);
    await addAuditEvent(user.username, "court case edited", fields.caseNumber || fields.title, "success");
    return redirectTo(request, "/government-access/supreme-court?saved=1");
  }

  if (intent === "archive-case") {
    if (id) {
      await archiveCourtCase(id);
      await addAuditEvent(user.username, "court case archived", id, "success");
    }
    return redirectTo(request, "/government-access/supreme-court?saved=1");
  }

  if (intent === "delete-case") {
    if (id) {
      await deleteCourtCase(id);
      await addAuditEvent(user.username, "court case deleted", id, "success");
    }
    return redirectTo(request, "/government-access/supreme-court?saved=1");
  }

  if (["add-timeline", "add-ruling", "add-party", "add-evidence"].includes(intent)) {
    const text = String(formData.get("text") || "").trim();

    if (id && text) {
      const kind =
        intent === "add-timeline"
          ? "timeline"
          : intent === "add-ruling"
            ? "ruling"
            : intent === "add-party"
              ? "party"
              : "evidence";
      await addCourtEntry(id, kind, {
        date: String(formData.get("date") || "").trim(),
        title: String(formData.get("title") || "").trim(),
        text
      });
      await addAuditEvent(user.username, "court case edited", `${id} ${kind}`, "success");
    }

    return redirectTo(request, "/government-access/supreme-court?saved=1");
  }

  if (intent === "set-key") {
    const role = String(formData.get("role") || "Defendant").trim();
    const safeRole = courtKeyRoles.includes(role) ? role : "Defendant";
    const generatedKey = id
      ? await addOrReplaceAccessKey(id, safeRole, String(formData.get("accessKey") || ""))
      : "";
    await addAuditEvent(user.username, "court access key changed", `${id} ${safeRole}`, "success");

    return redirectTo(
      request,
      `/government-access/supreme-court?saved=1&generated=${encodeURIComponent(generatedKey)}`
    );
  }

  if (intent === "revoke-key") {
    const keyId = String(formData.get("keyId") || "").trim();

    if (id && keyId) {
      await revokeAccessKey(id, keyId);
      await addAuditEvent(user.username, "court access key revoked", `${id} ${keyId}`, "success");
    }

    return redirectTo(request, "/government-access/supreme-court?saved=1");
  }

  return redirectTo(request, "/government-access/supreme-court");
}
