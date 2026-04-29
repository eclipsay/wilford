import { NextResponse } from "next/server";
import { safeAction } from "../../../../lib/action-routes";
import {
  addCourtEntry,
  addOrReplaceAccessKey,
  archiveCourtCase,
  courtKeyRoles,
  createCourtPetition,
  deleteCourtCase,
  parseCourtCaseForm,
  parseCourtPetitionForm,
  revokeAccessKey,
  saveCourtCase,
  updateCourtCaseDiscordReceipt,
  updateCourtPetition
} from "../../../../lib/supreme-court";
import { createDiscordBroadcast } from "../../../../lib/discord-broadcasts";
import { addAuditEvent, assertTrustedPostOrigin, requireGovernmentUser } from "../../../../lib/government-auth";

function redirectTo(request, path) {
  return NextResponse.redirect(new URL(path, request.url));
}

function storageErrorPath(error) {
  const detail = encodeURIComponent(String(error?.message || "Unknown storage failure").slice(0, 180));
  return `/government-access/supreme-court?error=storage&detail=${detail}`;
}

function publicCaseUrl(courtCase) {
  const path = courtCase.publicCaseUrl || `/supreme-court/${courtCase.id}`;
  const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.WEBSITE_URL || "https://wilfordindustries.org").replace(/\/+$/, "");
  return /^https?:\/\//i.test(path) ? path : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

function courtBroadcastPayload(courtCase, action, user, formData) {
  const statement = String(formData.get("courtStatement") || courtCase.publicNotes || courtCase.summary || "").trim();
  const hearingAction = String(formData.get("hearingAction") || "").trim();
  const clemency = {
    person: String(formData.get("clemencyPerson") || courtCase.defendant || "").trim(),
    type: String(formData.get("clemencyType") || "pardon").trim(),
    issuedBy: String(formData.get("clemencyIssuedBy") || user.displayName || user.username).trim(),
    statement: String(formData.get("clemencyStatement") || statement).trim()
  };
  const typeByAction = {
    court_announcement: "court_notice",
    active_hearing: "court_hearing",
    sentencing_record: "court_sentencing",
    legal_archive: "court_archive",
    clemency_notice: "court_clemency"
  };

  return {
    type: typeByAction[action] || "court_notice",
    title: action === "sentencing_record" ? `Judgment entered: ${courtCase.title}` : `Supreme Court Notice: ${courtCase.title}`,
    body: statement || `Official Supreme Court update for ${courtCase.caseNumber}.`,
    headline: "Supreme Court Notice",
    excerpt: statement || courtCase.summary,
    issuer: "Supreme Court of the Wilford Panem Union",
    classification: courtCase.classification || "Judicial Notice",
    imageUrl: "/wpu-grand-seal.png",
    articleUrl: publicCaseUrl(courtCase),
    distribution: action,
    linkedType: "court_case",
    linkedId: courtCase.id,
    confirmed: true,
    requestedBy: user.username,
    requestedRole: user.role,
    metadata: {
      courtCase: {
        id: courtCase.id,
        caseId: courtCase.caseNumber,
        title: courtCase.title,
        status: courtCase.status,
        defendant: courtCase.defendant,
        charges: courtCase.charges,
        judge: courtCase.judge || courtCase.presidingOfficial,
        hearingDate: courtCase.hearingDate,
        classification: courtCase.classification,
        publicCaseUrl: publicCaseUrl(courtCase),
        verdict: courtCase.verdict,
        sentence: courtCase.sentence
      },
      hearingAction,
      clemency
    }
  };
}

async function enqueueCourtBroadcast(courtCase, action, user, formData) {
  if (!action || action === "none") {
    return null;
  }

  const duplicateFields = {
    court_announcement: courtCase.courtAnnouncementMessageId,
    active_hearing: courtCase.activeHearingMessageId,
    sentencing_record: courtCase.verdictMessageId,
    legal_archive: courtCase.archiveMessageId,
    clemency_notice: courtCase.clemencyMessageId
  };

  if (duplicateFields[action] && formData.get("forceDiscordBroadcast") !== "on") {
    throw new Error("This court notice was already queued. Enable force repost to send it again.");
  }

  const broadcast = await createDiscordBroadcast(courtBroadcastPayload(courtCase, action, user, formData));
  const receiptField = {
    court_announcement: "courtAnnouncementMessageId",
    active_hearing: "activeHearingMessageId",
    sentencing_record: "verdictMessageId",
    legal_archive: "archiveMessageId",
    clemency_notice: "clemencyMessageId"
  }[action];
  const postedFlag = {
    court_announcement: "courtAnnouncement",
    active_hearing: "activeHearing",
    sentencing_record: "verdict",
    legal_archive: "archive",
    clemency_notice: "clemency"
  }[action];

  if (broadcast && receiptField) {
    await updateCourtCaseDiscordReceipt(courtCase.id, {
      [receiptField]: broadcast.id,
      discordPosted: { [postedFlag]: true }
    });
  }

  return broadcast;
}

export const POST = safeAction("government-access/supreme-court/action", "/government-access/supreme-court", async function POST(request) {
  if (!(await assertTrustedPostOrigin())) {
    return redirectTo(request, "/government-access?denied=1");
  }

  const user = await requireGovernmentUser("supremeCourtControl");
  const formData = await request.formData();
  const intent = String(formData.get("intent") || "").trim();

  const id = String(formData.get("id") || "").trim();

  try {
    if (intent === "save-case") {
      const fields = parseCourtCaseForm(formData);

      if (!fields.title || !fields.caseNumber) {
        return redirectTo(request, "/government-access/supreme-court?error=case");
      }

      const savedCase = await saveCourtCase(fields);
      const action = String(formData.get("discordAction") || "none").trim();
      const broadcast = await enqueueCourtBroadcast(savedCase, action, user, formData);
      await addAuditEvent(user.username, "court case edited", fields.caseNumber || fields.title, "success");
      if (broadcast) {
        await addAuditEvent(user.username, "court discord broadcast queued", broadcast.id, "success");
      }
      return redirectTo(request, `/government-access/supreme-court?saved=1${broadcast ? "&broadcast=queued" : ""}`);
    }

    if (intent === "archive-case") {
      if (id) {
        await archiveCourtCase(id);
        const archived = await updateCourtCaseDiscordReceipt(id, {});
        if (formData.get("discordAction") === "legal_archive" && archived) {
          await enqueueCourtBroadcast(archived, "legal_archive", user, formData);
        }
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
        if (String(formData.get("discordAction") || "none") !== "none") {
          const updatedCase = await updateCourtCaseDiscordReceipt(id, {});
          if (updatedCase) {
            await enqueueCourtBroadcast(updatedCase, String(formData.get("discordAction")), user, formData);
          }
        }
        await addAuditEvent(user.username, "court case edited", `${id} ${kind}`, "success");
      }

      return redirectTo(request, "/government-access/supreme-court?saved=1");
    }

    if (intent === "update-petition") {
      const fields = parseCourtPetitionForm(formData);
      if (fields.id) {
        await updateCourtPetition(fields.id, {
          status: fields.status,
          internalNotes: fields.internalNotes
        });
        await addAuditEvent(user.username, "court petition reviewed", fields.id, "success");
      }

      return redirectTo(request, "/government-access/supreme-court?saved=1#court-petitions");
    }

    if (intent === "create-petition") {
      const petition = await createCourtPetition({
        petitionerName: String(formData.get("petitionerName") || user.displayName || user.username).trim(),
        petitionerDiscordId: String(formData.get("petitionerDiscordId") || "").trim(),
        subject: String(formData.get("subject") || "").trim(),
        requestType: String(formData.get("requestType") || "legal question").trim(),
        statement: String(formData.get("statement") || "").trim()
      });
      const broadcast = await createDiscordBroadcast({
        type: "court_petition",
        title: `Court Petition: ${petition.subject}`,
        body: petition.statement,
        headline: "Supreme Court Petition",
        excerpt: petition.statement,
        issuer: "Supreme Court of the Wilford Panem Union",
        classification: petition.requestType,
        imageUrl: "/wpu-grand-seal.png",
        distribution: "court_petition",
        linkedType: "court_petition",
        linkedId: petition.id,
        confirmed: true,
        requestedBy: user.username,
        requestedRole: user.role,
        metadata: { petition }
      });
      await addAuditEvent(user.username, "court petition created", petition.id, "success");
      if (broadcast) {
        await addAuditEvent(user.username, "court petition discord queued", broadcast.id, "success");
      }
      return redirectTo(request, "/government-access/supreme-court?saved=1#court-petitions");
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
  } catch (error) {
    return redirectTo(request, storageErrorPath(error));
  }

  return redirectTo(request, "/government-access/supreme-court");
});
