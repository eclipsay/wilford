import { NextResponse } from "next/server";
import { getSession } from "../../../../../lib/auth";

const baseUrl = process.env.API_URL || "http://127.0.0.1:4000";

function resolveTarget(target) {
  return target === "bot" ? "bot" : "panel";
}

export async function POST(_request, { params }) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!["owner", "admin"].includes(session.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const target = resolveTarget((await params).target);
  const response = await fetch(`${baseUrl}/api/admin/deploy/${target}/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": process.env.ADMIN_API_KEY || ""
    },
    cache: "no-store"
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      { error: payload?.error || "Unable to start deploy." },
      { status: response.status }
    );
  }

  return NextResponse.json(payload, { status: response.status });
}
