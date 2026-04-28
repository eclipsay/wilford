import { NextResponse } from "next/server";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const baseUrl = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://127.0.0.1:4000"
).replace(/\/+$/, "");

function resolveContentFile() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.API_DATA_FILE,
    process.env.REPO_ROOT
      ? resolve(process.env.REPO_ROOT, "apps/api/data/content.json")
      : null,
    resolve(currentDir, "../../../../../apps/api/data/content.json")
  ].filter(Boolean);

  return candidates[0];
}

function normalizeEntry(body) {
  return {
    id: `crypto-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    action: String(body?.action || "").trim().toLowerCase(),
    createdAt: new Date().toISOString(),
    source: "website",
    messagePreview: String(body?.messagePreview || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160),
    encryptedPreview: String(body?.encryptedPreview || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160)
  };
}

async function appendFallbackAuditLog(body) {
  const contentFile = resolveContentFile();
  const nextEntry = normalizeEntry(body);

  try {
    let parsed = {};

    try {
      const raw = await readFile(contentFile, "utf8");
      parsed = JSON.parse(raw);
    } catch {
      parsed = {};
    }

    parsed.cryptoLogs = [nextEntry, ...(parsed.cryptoLogs || [])].slice(0, 250);
    await mkdir(dirname(contentFile), { recursive: true });
    await writeFile(contentFile, JSON.stringify(parsed, null, 2));
    return true;
  } catch {
    return false;
  }
}

export async function POST(request) {
  let body = null;

  try {
    body = await request.json();
    const response = await fetch(`${baseUrl}/api/audit/crypto`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      cache: "no-store"
    });

    if (!response.ok) {
      const wroteFallback = await appendFallbackAuditLog(body);

      if (!wroteFallback) {
        const payload = await response.json().catch(() => null);
        return NextResponse.json(
          { error: payload?.error || "Unable to write audit log." },
          { status: response.status }
        );
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    const wroteFallback = body ? await appendFallbackAuditLog(body) : false;

    if (wroteFallback) {
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json(
      { error: "Unable to write audit log." },
      { status: 500 }
    );
  }
}
