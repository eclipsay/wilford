import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const baseUrl = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://api.wilfordindustries.org"
    : "http://localhost:4000")
).replace(/\/+$/, "");

export const enemyClassifications = [
  "Person of Interest",
  "Security Concern",
  "Hostile Actor",
  "Enemy of the State",
  "Pardoned / Cleared"
];

export const enemyThreatLevels = ["Low", "Moderate", "High", "Critical"];
export const enemyStatuses = ["Under MSS Review", "Active", "Archived", "Pardoned", "Cleared"];
export const enemyVisibilityLevels = ["MSS Only", "Government Only", "Public Registry"];

const publicEntryStatuses = new Set(["Under MSS Review", "Active", "Pardoned", "Cleared"]);

function resolveContentFile() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.API_DATA_FILE,
    process.env.REPO_ROOT ? resolve(process.env.REPO_ROOT, "apps/api/data/content.json") : null,
    resolve(currentDir, "../../api/data/content.json"),
    resolve(process.cwd(), "../api/data/content.json"),
    resolve(process.cwd(), "../../apps/api/data/content.json"),
    resolve(process.cwd(), "apps/api/data/content.json")
  ].filter(Boolean);

  return candidates[0];
}

function resolveServerlessWritableFile() {
  return resolve(tmpdir(), "wilford-enemies-of-state-content.json");
}

function cleanText(value, maxLength = 2000) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanBlock(value, maxLength = 4000) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, maxLength);
}

export function isPublicEnemyEntry(entry) {
  return (
    entry?.visibility === "Public Registry" &&
    publicEntryStatuses.has(entry?.status) &&
    entry?.archived !== true
  );
}

export function normalizeEnemyEntry(entry, index = 0) {
  const now = new Date().toISOString();
  const classification = cleanText(entry?.classification || "Person of Interest", 80);
  const threatLevel = cleanText(entry?.threatLevel || "Low", 40);
  const status = cleanText(entry?.status || "Under MSS Review", 80);
  const visibility = cleanText(entry?.visibility || "MSS Only", 80);

  return {
    id: cleanText(entry?.id || `enemy-state-${Date.now().toString(36)}-${index}`, 120),
    name: cleanText(entry?.name, 180),
    alias: cleanText(entry?.alias, 180),
    discordId: cleanText(entry?.discordId, 80),
    discordIdPublic: Boolean(entry?.discordIdPublic),
    classification: enemyClassifications.includes(classification) ? classification : "Person of Interest",
    threatLevel: enemyThreatLevels.includes(threatLevel) ? threatLevel : "Low",
    reasonSummary: cleanBlock(entry?.reasonSummary || entry?.reason, 1600),
    evidenceNotes: cleanBlock(entry?.evidenceNotes, 2400),
    status: enemyStatuses.includes(status) ? status : "Under MSS Review",
    visibility: enemyVisibilityLevels.includes(visibility) ? visibility : "MSS Only",
    issuingAuthority: cleanText(entry?.issuingAuthority || "Ministry of State Security", 160),
    dateListed: cleanText(entry?.dateListed || now.slice(0, 10), 40),
    relatedCaseUrl: cleanText(entry?.relatedCaseUrl, 500),
    relatedArticleUrl: cleanText(entry?.relatedArticleUrl, 500),
    relatedBulletinUrl: cleanText(entry?.relatedBulletinUrl, 500),
    imageUrl: cleanText(entry?.imageUrl, 500),
    approvedPublic: Boolean(entry?.approvedPublic),
    archived: Boolean(entry?.archived),
    discordChannelId: cleanText(entry?.discordChannelId, 80),
    discordMessageId: cleanText(entry?.discordMessageId, 80),
    lastDiscordSyncedAt: entry?.lastDiscordSyncedAt || "",
    createdBy: cleanText(entry?.createdBy || "system", 120),
    createdAt: entry?.createdAt || now,
    updatedAt: entry?.updatedAt || now
  };
}

function normalizeEntries(entries) {
  return [...(entries || [])]
    .map(normalizeEnemyEntry)
    .filter((entry) => entry.name)
    .sort((a, b) => new Date(b.dateListed) - new Date(a.dateListed));
}

async function readContentFile() {
  try {
    const response = await fetch(`${baseUrl}/api/content`, {
      cache: "no-store",
      signal: AbortSignal.timeout(2000)
    });

    if (response.ok) {
      const parsed = await response.json();
      return {
        ...parsed,
        enemyOfStateEntries: normalizeEntries(parsed.enemyOfStateEntries || [])
      };
    }
  } catch {}

  for (const file of [resolveServerlessWritableFile(), resolveContentFile()]) {
    try {
      const raw = await readFile(file, "utf8");
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
        enemyOfStateEntries: normalizeEntries(parsed.enemyOfStateEntries || [])
      };
    } catch {}
  }

  return { enemyOfStateEntries: [] };
}

async function writeLocalContentFile(content) {
  const contentFile = resolveContentFile();
  const payload = JSON.stringify(content, null, 2);

  try {
    await mkdir(dirname(contentFile), { recursive: true });
    await writeFile(contentFile, payload);
    return;
  } catch {}

  const fallbackFile = resolveServerlessWritableFile();
  await mkdir(dirname(fallbackFile), { recursive: true });
  await writeFile(fallbackFile, payload);
}

async function requestAdminRegistry(path, options = {}) {
  const key = process.env.ENEMIES_OF_STATE_API_KEY || process.env.ADMIN_API_KEY;
  const requestUrl = `${baseUrl}${path}`;

  if (!key) {
    throw new Error("Missing ENEMIES_OF_STATE_API_KEY or ADMIN_API_KEY.");
  }

  const response = await fetch(requestUrl, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": key,
      ...(options.headers || {})
    },
    cache: "no-store",
    signal: AbortSignal.timeout(6000)
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Enemy registry API returned ${response.status}.`);
  }

  return normalizeEntries(data.enemyOfStateEntries || []);
}

export async function getAllEnemyEntries() {
  try {
    return await requestAdminRegistry("/api/admin/enemies-of-state");
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }

  const content = await readContentFile();
  return normalizeEntries(content.enemyOfStateEntries);
}

export async function getPublicEnemyEntries() {
  const content = await readContentFile();
  return normalizeEntries(content.enemyOfStateEntries).filter(isPublicEnemyEntry);
}

export async function createEnemyEntry(fields) {
  try {
    return await requestAdminRegistry("/api/admin/enemies-of-state", {
      method: "POST",
      body: JSON.stringify(fields)
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }

  const content = await readContentFile();
  const now = new Date().toISOString();
  const entry = normalizeEnemyEntry(
    {
      id: `enemy-state-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      ...fields,
      createdAt: now,
      updatedAt: now
    },
    0
  );
  content.enemyOfStateEntries = normalizeEntries([entry, ...(content.enemyOfStateEntries || [])]);
  await writeLocalContentFile(content);
  return content.enemyOfStateEntries;
}

export async function updateEnemyEntry(id, fields) {
  try {
    return await requestAdminRegistry(`/api/admin/enemies-of-state/${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify(fields)
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }

  const content = await readContentFile();
  content.enemyOfStateEntries = normalizeEntries(
    (content.enemyOfStateEntries || []).map((entry) =>
      entry.id === id
        ? normalizeEnemyEntry({ ...entry, ...fields, id: entry.id, updatedAt: new Date().toISOString() }, 0)
        : entry
    )
  );
  await writeLocalContentFile(content);
  return content.enemyOfStateEntries;
}

export async function deleteEnemyEntry(id) {
  try {
    return await requestAdminRegistry(`/api/admin/enemies-of-state/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }

  const content = await readContentFile();
  content.enemyOfStateEntries = normalizeEntries(
    (content.enemyOfStateEntries || []).map((entry) =>
      entry.id === id ? { ...entry, archived: true, status: "Archived", visibility: "MSS Only" } : entry
    )
  );
  await writeLocalContentFile(content);
  return content.enemyOfStateEntries;
}

export function parseEnemyEntryForm(formData, { canApprovePublic = false } = {}) {
  const visibility = cleanText(formData.get("visibility") || "MSS Only", 80);
  const requestedPublic = visibility === "Public Registry" && canApprovePublic;

  return {
    name: cleanText(formData.get("name"), 180),
    alias: cleanText(formData.get("alias"), 180),
    discordId: cleanText(formData.get("discordId"), 80),
    discordIdPublic: formData.get("discordIdPublic") === "on",
    classification: cleanText(formData.get("classification") || "Person of Interest", 80),
    threatLevel: cleanText(formData.get("threatLevel") || "Low", 40),
    reasonSummary: cleanBlock(formData.get("reasonSummary"), 1600),
    evidenceNotes: cleanBlock(formData.get("evidenceNotes"), 2400),
    status: cleanText(formData.get("status") || "Under MSS Review", 80),
    visibility: requestedPublic ? "Public Registry" : visibility === "Government Only" ? "Government Only" : "MSS Only",
    issuingAuthority: cleanText(formData.get("issuingAuthority") || "Ministry of State Security", 160),
    dateListed: cleanText(formData.get("dateListed") || new Date().toISOString().slice(0, 10), 40),
    relatedCaseUrl: cleanText(formData.get("relatedCaseUrl"), 500),
    relatedArticleUrl: cleanText(formData.get("relatedArticleUrl"), 500),
    relatedBulletinUrl: cleanText(formData.get("relatedBulletinUrl"), 500),
    imageUrl: cleanText(formData.get("imageUrl"), 500),
    approvedPublic: requestedPublic
  };
}
