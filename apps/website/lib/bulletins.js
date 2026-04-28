import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";

const baseUrl =
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://api.wilfordindustries.org"
    : "http://localhost:4000");

const categories = [
  "Chairman",
  "Government",
  "Supreme Court",
  "MSS",
  "Panem Credit",
  "Districts",
  "Eternal Engine",
  "General"
];

const priorities = ["standard", "priority", "emergency"];

export const bulletinCategories = categories;
export const bulletinPriorities = priorities;

const defaultBulletins = [
  "Chairman Lemmie announces new prosperity initiative",
  "Supreme Court opens hearings at The Capitol Parliament",
  "Eternal Engine departs for District 6 inspection route",
  "Ministry of Production reports record district output",
  "Panem Credit adoption reaches record levels",
  "Ministry of State Security issues internal advisory"
].map((headline, order) => ({
  id: `bulletin-default-${order + 1}`,
  headline,
  category: order === 0 ? "Chairman" : order === 1 ? "Supreme Court" : "General",
  priority: "standard",
  active: true,
  order,
  expiresAt: "",
  createdAt: "2026-04-27T00:00:00.000Z",
  updatedAt: "2026-04-27T00:00:00.000Z"
}));

function resolveContentFile() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const candidates = [
    process.env.API_DATA_FILE,
    process.env.REPO_ROOT
      ? resolve(process.env.REPO_ROOT, "apps/api/data/content.json")
      : null,
    resolve(currentDir, "../../api/data/content.json"),
    resolve(process.cwd(), "../api/data/content.json"),
    resolve(process.cwd(), "../../apps/api/data/content.json"),
    resolve(process.cwd(), "apps/api/data/content.json")
  ].filter(Boolean);

  return candidates[0];
}

function resolveServerlessWritableFile() {
  return resolve(tmpdir(), "wilford-bulletins-content.json");
}

function normalizeBulletin(entry, index) {
  const now = new Date().toISOString();
  const priority = String(entry?.priority || "standard").toLowerCase();
  const category = String(entry?.category || "General").trim();

  return {
    id: String(entry?.id || `bulletin-${Date.now().toString(36)}-${index}`),
    headline: String(entry?.headline || "").replace(/\s+/g, " ").trim(),
    category: categories.includes(category) ? category : "General",
    priority: priorities.includes(priority) ? priority : "standard",
    active: Boolean(entry?.active),
    order: Number(entry?.order ?? index),
    expiresAt: String(entry?.expiresAt || "").trim(),
    createdAt: entry?.createdAt || now,
    updatedAt: entry?.updatedAt || now
  };
}

function normalizeBulletins(items) {
  return [...(items || [])]
    .map(normalizeBulletin)
    .filter((item) => item.headline)
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
    .map((item, order) => ({ ...item, order }));
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
        bulletins: normalizeBulletins(parsed.bulletins || defaultBulletins)
      };
    }
  } catch {}

  const contentFile = resolveContentFile();
  const fallbackFile = resolveServerlessWritableFile();

  try {
    const raw = await readFile(fallbackFile, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      bulletins: normalizeBulletins(parsed.bulletins || defaultBulletins)
    };
  } catch {}

  try {
    const raw = await readFile(contentFile, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      bulletins: normalizeBulletins(parsed.bulletins || defaultBulletins)
    };
  } catch {
    return {
      bulletins: normalizeBulletins(defaultBulletins)
    };
  }
}

async function writeContentFile(content) {
  return content;
}

async function requestAdminBulletins(path, options = {}) {
  const adminKey = process.env.BULLETIN_API_KEY || process.env.ADMIN_API_KEY;

  if (!adminKey) {
    throw new Error("Missing BULLETIN_API_KEY or ADMIN_API_KEY in the website environment.");
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": adminKey,
      ...(options.headers || {})
    },
    cache: "no-store",
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    throw new Error(
      data?.error ||
        `Bulletin API request failed with status ${response.status}.`
    );
  }

  const data = await response.json();
  return normalizeBulletins(data.bulletins || []);
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

function isExpired(bulletin, now = new Date()) {
  if (!bulletin.expiresAt) {
    return false;
  }

  const expiresAt = new Date(bulletin.expiresAt);
  return Number.isFinite(expiresAt.getTime()) && expiresAt <= now;
}

export async function getAllBulletins() {
  const content = await readContentFile();
  return normalizeBulletins(content.bulletins);
}

export async function getActiveBulletins() {
  const bulletins = await getAllBulletins();
  return bulletins.filter((bulletin) => bulletin.active && !isExpired(bulletin));
}

export function hasEmergencyBulletin(bulletins) {
  return (bulletins || []).some((bulletin) => bulletin.priority === "emergency");
}

export async function createBulletin(fields) {
  try {
    return await requestAdminBulletins("/api/admin/bulletins", {
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
  const bulletins = normalizeBulletins(content.bulletins);
  const nextBulletin = normalizeBulletin(
    {
      id: `bulletin-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
      ...fields,
      active: fields.active,
      order: bulletins.length,
      createdAt: now,
      updatedAt: now
    },
    bulletins.length
  );

  content.bulletins = normalizeBulletins([...bulletins, nextBulletin]);
  await writeLocalContentFile(content);
  return content.bulletins;
}

export async function updateBulletin(id, fields) {
  try {
    return await requestAdminBulletins(`/api/admin/bulletins/${encodeURIComponent(id)}`, {
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
  const bulletins = normalizeBulletins(content.bulletins);

  content.bulletins = normalizeBulletins(
    bulletins.map((bulletin) =>
      bulletin.id === id
        ? normalizeBulletin(
            {
              ...bulletin,
              ...fields,
              id: bulletin.id,
              order: bulletin.order,
              createdAt: bulletin.createdAt,
              updatedAt: now
            },
            bulletin.order
          )
        : bulletin
    )
  );

  await writeLocalContentFile(content);
  return content.bulletins;
}

export async function deleteBulletin(id) {
  try {
    return await requestAdminBulletins(`/api/admin/bulletins/${encodeURIComponent(id)}`, {
      method: "DELETE"
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }

  const content = await readContentFile();
  content.bulletins = normalizeBulletins(
    normalizeBulletins(content.bulletins).filter((bulletin) => bulletin.id !== id)
  );
  await writeLocalContentFile(content);
  return content.bulletins;
}

export async function moveBulletin(id, direction) {
  try {
    return await requestAdminBulletins(`/api/admin/bulletins/${encodeURIComponent(id)}/move`, {
      method: "POST",
      body: JSON.stringify({ direction })
    });
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }

  const content = await readContentFile();
  const bulletins = normalizeBulletins(content.bulletins);
  const index = bulletins.findIndex((bulletin) => bulletin.id === id);

  if (index === -1) {
    return bulletins;
  }

  const targetIndex =
    direction === "up" ? Math.max(0, index - 1) : Math.min(bulletins.length - 1, index + 1);
  const next = [...bulletins];
  const [item] = next.splice(index, 1);
  next.splice(targetIndex, 0, item);

  content.bulletins = normalizeBulletins(next);
  await writeLocalContentFile(content);
  return content.bulletins;
}

export function parseBulletinForm(formData) {
  return {
    headline: String(formData.get("headline") || "").trim(),
    category: String(formData.get("category") || "General").trim(),
    priority: String(formData.get("priority") || "standard").trim(),
    active: formData.get("active") === "on",
    expiresAt: String(formData.get("expiresAt") || "").trim()
  };
}
