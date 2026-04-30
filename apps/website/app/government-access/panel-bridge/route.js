import { createHmac } from "node:crypto";
import { NextResponse } from "next/server";
import {
  addAuditEvent,
  governmentBridgeSecret,
  setGovernmentSessionForBridgeSession
} from "../../../lib/government-auth";

function sign(value) {
  return createHmac("sha256", governmentBridgeSecret()).update(value).digest("hex");
}

function readBridgeToken(token) {
  const [payload, signature] = String(token || "").split(".");

  if (!payload || !signature || sign(payload) !== signature) {
    return null;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.expiresAt > Date.now() ? data : null;
  } catch {
    return null;
  }
}

function safeNextPath(value) {
  const path = String(value || "/government-access").trim();
  return path.startsWith("/government-access") ? path : "/government-access";
}

export async function GET(request) {
  const url = new URL(request.url);
  const token = readBridgeToken(url.searchParams.get("token"));
  const nextPath = safeNextPath(url.searchParams.get("next"));

  if (!token?.username || !token?.role) {
    return NextResponse.redirect(new URL("/government-access/login?error=1", request.url));
  }

  await setGovernmentSessionForBridgeSession(token);
  await addAuditEvent(
    token.username,
    "panel bridge login",
    `Panel bridge granted access to ${nextPath}`,
    "success"
  ).catch(() => {});

  return NextResponse.redirect(new URL(nextPath, request.url));
}
