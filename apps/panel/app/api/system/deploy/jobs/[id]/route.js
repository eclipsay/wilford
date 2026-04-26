import { NextResponse } from "next/server";
import { getSession } from "../../../../../../lib/auth";
import { getLocalDeployJob } from "../../../../../../lib/deploy-jobs";

const baseUrl = process.env.API_URL || "http://127.0.0.1:4000";

export async function GET(_request, { params }) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["owner", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;
  const localJob = getLocalDeployJob(id);

  if (localJob) {
    return NextResponse.json({ job: localJob });
  }

  const response = await fetch(`${baseUrl}/api/admin/deploy/jobs/${id}`, {
    headers: {
      "x-admin-key": process.env.ADMIN_API_KEY || ""
    },
    cache: "no-store"
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { error: payload?.error || "Unable to load deploy job." },
      { status: response.status }
    );
  }

  return NextResponse.json(payload, { status: response.status });
}
