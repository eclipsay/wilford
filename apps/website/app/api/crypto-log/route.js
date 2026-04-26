import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { NextResponse } from "next/server";

function resolveContentFile() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.API_DATA_FILE,
    process.env.REPO_ROOT
      ? resolve(process.env.REPO_ROOT, "apps/api/data/content.json")
      : null,
    resolve(currentDir, "../../../../../api/data/content.json"),
    resolve(process.cwd(), "../api/data/content.json"),
    resolve(process.cwd(), "../../apps/api/data/content.json"),
    resolve(process.cwd(), "apps/api/data/content.json")
  ].filter(Boolean);

  return candidates[0];
}

async function readContentFile() {
  const contentFile = resolveContentFile();

  try {
    const raw = await readFile(contentFile, "utf8");
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function writeContentFile(content) {
  const contentFile = resolveContentFile();
  await mkdir(dirname(contentFile), { recursive: true });
  await writeFile(contentFile, JSON.stringify(content, null, 2));
}

function trimPreview(value, maxLength) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export async function POST(request) {
  try {
    const body = await request.json();
    const action = String(body?.action || "").trim();

    if (!action) {
      return NextResponse.json({ error: "Action is required." }, { status: 400 });
    }

    const content = await readContentFile();
    const existingLogs = Array.isArray(content.cryptoLogs) ? content.cryptoLogs : [];

    const logEntry = {
      id: `crypto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      action,
      createdAt: new Date().toISOString(),
      source: "website",
      messagePreview: trimPreview(body?.messagePreview, 160),
      encryptedPreview: trimPreview(body?.encryptedPreview, 160)
    };

    content.cryptoLogs = [logEntry, ...existingLogs].slice(0, 100);
    await writeContentFile(content);

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unable to write crypto log." }, { status: 500 });
  }
}
