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

export const applicationStatuses = ["pending", "under_review", "approved", "rejected"];

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
  return resolve(tmpdir(), "wilford-applications-content.json");
}

function normalizeStatus(value) {
  const status = String(value || "pending").trim().toLowerCase();
  return applicationStatuses.includes(status) ? status : "pending";
}

function normalizeApplication(entry, index) {
  const now = new Date().toISOString();

  return {
    id: String(entry?.id || `application-${index}`),
    source: String(entry?.source || "website").trim(),
    status: normalizeStatus(entry?.status),
    submittedAt: entry?.submittedAt || now,
    updatedAt: entry?.updatedAt || entry?.submittedAt || now,
    applicantName: String(entry?.applicantName || "").trim(),
    age: String(entry?.age || "").trim(),
    timezone: String(entry?.timezone || "").trim(),
    motivation: String(entry?.motivation || "").trim(),
    experience: String(entry?.experience || "").trim(),
    discordHandle: String(entry?.discordHandle || "").trim(),
    discordUserId: String(entry?.discordUserId || "").trim(),
    email: String(entry?.email || "").trim(),
    reviewThreadId: String(entry?.reviewThreadId || "").trim(),
    reviewMessageId: String(entry?.reviewMessageId || "").trim(),
    reviewGuildId: String(entry?.reviewGuildId || "").trim(),
    decisionNote: String(entry?.decisionNote || "").trim(),
    internalNotes: String(entry?.internalNotes || "").trim()
  };
}

function normalizeApplications(items) {
  return [...(items || [])]
    .map(normalizeApplication)
    .filter((item) => item.applicantName)
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
}

async function readContentFile() {
  const contentFile = resolveContentFile();
  const fallbackFile = resolveServerlessWritableFile();

  try {
    const raw = await readFile(fallbackFile, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      publicApplications: normalizeApplications(parsed.publicApplications || [])
    };
  } catch {}

  try {
    const raw = await readFile(contentFile, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      publicApplications: normalizeApplications(parsed.publicApplications || [])
    };
  } catch {
    return {
      publicApplications: []
    };
  }
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

async function requestAdminApplications(path, options = {}) {
  const adminKey =
    process.env.APPLICATION_API_KEY ||
    process.env.GOVERNMENT_STORE_API_KEY ||
    process.env.BULLETIN_API_KEY ||
    process.env.ADMIN_API_KEY;
  const requestUrl = `${baseUrl}${path}`;

  if (!adminKey) {
    throw new Error("Missing APPLICATION_API_KEY or ADMIN_API_KEY in the website environment.");
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
    throw new Error(data?.error || `Application API request failed: ${requestUrl} returned ${response.status}.`);
  }

  return response.json();
}

export async function getCitizenApplications() {
  try {
    const data = await requestAdminApplications("/api/admin/applications");
    return normalizeApplications(data.applications || []);
  } catch {}

  try {
    const data = await requestAdminApplications("/api/admin/government-access-store");
    return normalizeApplications(data.publicApplications || []);
  } catch {}

  const content = await readContentFile();
  return normalizeApplications(content.publicApplications);
}

export async function updateCitizenApplication(id, fields) {
  try {
    await requestAdminApplications(`/api/admin/applications/${encodeURIComponent(id)}`, {
      method: "POST",
      body: JSON.stringify(fields)
    });
    return true;
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      throw error;
    }
  }

  const content = await readContentFile();
  content.publicApplications = normalizeApplications(
    (content.publicApplications || []).map((application) =>
      application.id === id
        ? normalizeApplication(
            {
              ...application,
              ...fields,
              updatedAt: new Date().toISOString()
            },
            0
          )
        : application
    )
  );
  await writeLocalContentFile(content);
  return true;
}

export function parseApplicationReviewForm(formData) {
  return {
    status: normalizeStatus(formData.get("status")),
    internalNotes: String(formData.get("internalNotes") || "").trim(),
    decisionNote: String(formData.get("decisionNote") || "").trim()
  };
}

export function formatApplicationStatus(status) {
  const labels = {
    pending: "Pending",
    under_review: "Under Review",
    approved: "Approved",
    rejected: "Rejected"
  };

  return labels[normalizeStatus(status)];
}
