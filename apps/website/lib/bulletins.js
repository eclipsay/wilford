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

const categories = [
  "Chairman",
  "Government",
  "Supreme Court",
  "MSS",
  "Ministries",
  "Industry",
  "Order",
  "Ministry of Production",
  "Ministry of Order",
  "Panem Credit",
  "Districts",
  "Eternal Engine",
  "General"
];

const priorities = ["standard", "priority", "emergency"];

export const bulletinCategories = categories;
export const bulletinPriorities = priorities;

const sourceStyles = {
  chairman: {
    className: "chairman",
    icon: "CL",
    seal: "Chairman's Seal",
    title: "Chairman's Directive",
    subtitle: "Issued from the Supreme Chairman's office",
    priorityLabel: "Imperial Priority"
  },
  "supreme-court": {
    className: "court",
    icon: "SC",
    seal: "Supreme Court Seal",
    title: "Supreme Court Notice",
    subtitle: "Formal publication of the Union judiciary",
    priorityLabel: "Court Priority"
  },
  mss: {
    className: "mss",
    icon: "MSS",
    seal: "Security Seal",
    title: "MSS Security Bulletin",
    subtitle: "Restricted advisory from State Security Command",
    priorityLabel: "Security Priority"
  },
  ministries: {
    className: "ministry",
    icon: "MIN",
    seal: "Ministerial Seal",
    title: "Ministerial Notice",
    subtitle: "Operational update from Union ministries",
    priorityLabel: "Ministry Priority"
  },
  industry: {
    className: "industry",
    icon: "IND",
    seal: "Industrial Seal",
    title: "Industry Directorate",
    subtitle: "Production and infrastructure bulletin",
    priorityLabel: "Industrial Priority"
  },
  order: {
    className: "order",
    icon: "ORD",
    seal: "Order Seal",
    title: "Ministry of Order",
    subtitle: "Authority notice for civic stability",
    priorityLabel: "Authority Priority"
  },
  government: {
    className: "government",
    icon: "WPU",
    seal: "Grand State Seal",
    title: "Government Bulletin",
    subtitle: "Central administrative communication",
    priorityLabel: "State Priority"
  },
  "panem-credit": {
    className: "credit",
    icon: "CR",
    seal: "Treasury Seal",
    title: "Panem Credit Notice",
    subtitle: "Treasury and civic credit communication",
    priorityLabel: "Treasury Priority"
  },
  districts: {
    className: "industry",
    icon: "DST",
    seal: "District Seal",
    title: "District Production Notice",
    subtitle: "District output and civic logistics bulletin",
    priorityLabel: "District Priority"
  },
  "eternal-engine": {
    className: "engine",
    icon: "EE",
    seal: "Engine Seal",
    title: "Eternal Engine Dispatch",
    subtitle: "Rail command and continuity update",
    priorityLabel: "Engine Priority"
  },
  general: {
    className: "general",
    icon: "WPU",
    seal: "Public Seal",
    title: "Public Bulletin",
    subtitle: "General notice from the Wilford Panem Union",
    priorityLabel: "Public Priority"
  }
};

function toSourceKey(category) {
  const value = String(category || "General").trim().toLowerCase();

  if (value.includes("chairman")) {
    return "chairman";
  }

  if (value.includes("court")) {
    return "supreme-court";
  }

  if (value.includes("mss") || value.includes("security")) {
    return "mss";
  }

  if (value.includes("order")) {
    return "order";
  }

  if (
    value.includes("industry") ||
    value.includes("production") ||
    value.includes("works") ||
    value.includes("district")
  ) {
    return "industry";
  }

  if (value.includes("ministry") || value.includes("ministries")) {
    return "ministries";
  }

  if (value.includes("credit") || value.includes("treasury")) {
    return "panem-credit";
  }

  if (value.includes("engine") || value.includes("transport")) {
    return "eternal-engine";
  }

  if (value.includes("government")) {
    return "government";
  }

  return "general";
}

export function getBulletinSourceMeta(category) {
  const key = toSourceKey(category);
  return sourceStyles[key] || sourceStyles.general;
}

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
  linkedArticleId: "",
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
    linkedArticleId: String(entry?.linkedArticleId || "").trim(),
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
  const requestUrl = `${baseUrl}${path}`;

  if (!adminKey) {
    throw new Error("Missing BULLETIN_API_KEY or ADMIN_API_KEY in the website environment.");
  }

  const response = await fetch(requestUrl, {
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
        `Bulletin API request failed: ${requestUrl} returned ${response.status}.`
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
      linkedArticleId: fields.linkedArticleId,
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
    linkedArticleId: String(formData.get("linkedArticleId") || "").trim(),
    expiresAt: String(formData.get("expiresAt") || "").trim()
  };
}
