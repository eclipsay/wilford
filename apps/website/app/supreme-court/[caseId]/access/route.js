import { NextResponse } from "next/server";
import {
  authorizeCaseAccess,
  submitCourtStatement
} from "../../../../lib/supreme-court";

export async function POST(request, { params }) {
  const { caseId } = await params;
  const body = await request.json().catch(() => ({}));
  const intent = String(body.intent || "").trim();
  const accessKey = String(body.accessKey || "").trim();

  if (!accessKey) {
    return NextResponse.json({ error: "Case access key required." }, { status: 400 });
  }

  if (intent === "authorize") {
    const access = await authorizeCaseAccess(caseId, accessKey);

    if (!access) {
      return NextResponse.json({ error: "Invalid case access key." }, { status: 403 });
    }

    return NextResponse.json({ role: access.role });
  }

  if (intent === "submit") {
    const result = await submitCourtStatement(caseId, accessKey, body.statement);

    if (!result) {
      return NextResponse.json({ error: "Statement rejected." }, { status: 403 });
    }

    return NextResponse.json({ submitted: true, role: result.role, submittedAt: result.submittedAt });
  }

  return NextResponse.json({ error: "Unsupported court action." }, { status: 400 });
}
