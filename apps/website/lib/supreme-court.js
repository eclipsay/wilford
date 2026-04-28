import { createHash, randomBytes } from "node:crypto";
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

export const courtStatuses = [
  "Filed",
  "Under Review",
  "Hearing Scheduled",
  "Hearing in Progress",
  "Deliberation",
  "Judgment Issued",
  "Closed",
  "Sealed"
];

export const courtKeyRoles = ["Defendant", "Witness", "Counsel", "Court Official"];

const defaultCases = [
  {
    id: "wpu-v-district-six-rail-authority",
    title: "Union v. District Six Rail Authority",
    caseNumber: "WPU-SC-2026-001",
    status: "Hearing Scheduled",
    dateOpened: "2026-04-27",
    courtroom: "Capitol Parliament, High Chamber I",
    summary:
      "Petition concerning rail supply obligations, district compliance, and emergency production authority.",
    parties: ["Wilford Panem Union", "District Six Rail Authority"],
    presidingOfficial: "Chief Justice of the Union",
    timeline: [
      {
        date: "2026-04-27 09:00",
        title: "Petition filed",
        text: "The Ministry of Transport filed an emergency petition for declaratory relief."
      },
      {
        date: "2026-04-27 14:30",
        title: "Hearing scheduled",
        text: "The High Chamber set the matter for public hearing under expedited procedure."
      }
    ],
    evidence: [
      "Emergency rail allocation ledger",
      "District Six production correspondence",
      "Ministry route continuity report"
    ],
    rulings: ["Temporary preservation order entered pending hearing."],
    publicNotes:
      "Public observers may review filings and live updates. Formal responses require a valid case access key.",
    accessKeys: [
      {
        id: "default-counsel",
        role: "Counsel",
        keyHash: hashAccessKey("WPU-SC-001-COUNSEL"),
        active: true,
        createdAt: "2026-04-27T00:00:00.000Z"
      }
    ],
    statements: []
  },
  {
    id: "petition-of-citizen-registry",
    title: "Petition of the Citizen Registry",
    caseNumber: "WPU-SC-2026-002",
    status: "Under Review",
    dateOpened: "2026-04-26",
    courtroom: "Archive Review Chamber",
    summary:
      "Review of citizenship record correction procedure and official registry notice requirements.",
    parties: ["Office of Citizenship", "Petitioning Citizens"],
    presidingOfficial: "Associate Justice for Civic Order",
    timeline: [
      {
        date: "2026-04-26 18:00",
        title: "Administrative petition accepted",
        text: "The Court accepted limited review of registry correction standards."
      }
    ],
    evidence: ["Citizenship petition intake register", "Registry amendment memorandum"],
    rulings: ["Briefing requested from the Office of Citizenship."],
    publicNotes:
      "The Court is accepting public observation only while jurisdictional review remains pending.",
    accessKeys: [],
    statements: []
  },
  {
    id: "in-re-panem-credit-charter",
    title: "In re Panem Credit Charter",
    caseNumber: "WPU-SC-2026-003",
    status: "Judgment Issued",
    dateOpened: "2026-04-21",
    courtroom: "Treasury Review Bench",
    summary:
      "Judicial confirmation of Panem Credit continuity provisions and state-backed exchange duties.",
    parties: ["Treasury of the Union", "Ministry of Production"],
    presidingOfficial: "Chief Justice of the Union",
    timeline: [
      {
        date: "2026-04-21 11:15",
        title: "Charter question referred",
        text: "The Treasury referred a charter interpretation question to the Court."
      },
      {
        date: "2026-04-24 16:40",
        title: "Judgment published",
        text: "The Court issued judgment confirming continuity authority."
      }
    ],
    evidence: ["Panem Credit charter", "Treasury exchange memorandum"],
    rulings: ["Judgment issued in favor of continuity authority."],
    publicNotes: "Judgment is final subject to executive publication.",
    accessKeys: [],
    statements: []
  }
];

export function hashAccessKey(key) {
  return createHash("sha256").update(String(key || "").trim()).digest("hex");
}

export function generateAccessKey() {
  return `WPU-SC-${randomBytes(6).toString("hex").toUpperCase()}`;
}

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
  return resolve(tmpdir(), "wilford-supreme-court-content.json");
}

function adminApiKey() {
  return process.env.SUPREME_COURT_API_KEY || process.env.BULLETIN_API_KEY || process.env.ADMIN_API_KEY;
}

async function readRemoteStore(includeRestricted = true) {
  const key = adminApiKey();
  const adminUrl = `${baseUrl}/api/admin/supreme-court-store`;

  if (includeRestricted && key) {
    const response = await fetch(adminUrl, {
      headers: {
        "x-admin-key": key
      },
      cache: "no-store",
      signal: AbortSignal.timeout(4000)
    });

    if (response.ok) {
      return response.json();
    }

    throw new Error(`Supreme Court store read failed: ${adminUrl} returned ${response.status}.`);
  }

  const publicUrl = `${baseUrl}/api/content`;
  const response = await fetch(publicUrl, {
    cache: "no-store",
    signal: AbortSignal.timeout(4000)
  });

  if (!response.ok) {
    throw new Error(`Supreme Court store read failed: ${publicUrl} returned ${response.status}.`);
  }

  return response.json();
}

async function writeRemoteStore(content) {
  const key = adminApiKey();
  const requestUrl = `${baseUrl}/api/admin/supreme-court-store`;

  if (!key) {
    throw new Error("Missing Supreme Court API key.");
  }

  const response = await fetch(requestUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-admin-key": key
    },
    body: JSON.stringify({
      supremeCourtCases: content.supremeCourtCases || []
    }),
    cache: "no-store",
    signal: AbortSignal.timeout(5000)
  });

  if (!response.ok) {
    throw new Error(`Supreme Court store write failed: ${requestUrl} returned ${response.status}.`);
  }

  return response.json();
}

function isProductionRuntime() {
  return process.env.NODE_ENV === "production";
}

function normalizeList(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item || "").trim()).filter(Boolean);
  }

  return String(value || "")
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function normalizeTimeline(items) {
  return (items || []).map((item, index) => ({
    id: String(item?.id || `timeline-${index + 1}`),
    date: String(item?.date || "").trim(),
    title: String(item?.title || "Court update").trim(),
    text: String(item?.text || "").trim()
  })).filter((item) => item.text || item.title);
}

function normalizeKeys(items) {
  const seen = new Set();

  return (items || [])
    .map((item, index) => ({
      id: String(item?.id || `key-${index + 1}`),
      role: courtKeyRoles.includes(item?.role) ? item.role : "Defendant",
      keyHash: String(item?.keyHash || "").trim(),
      active: item?.active !== false,
      createdAt: item?.createdAt || new Date().toISOString()
    }))
    .filter((item) => {
      if (!item.keyHash || seen.has(item.keyHash)) {
        return false;
      }
      seen.add(item.keyHash);
      return true;
    });
}

function normalizeStatements(items) {
  return (items || []).map((item, index) => ({
    id: String(item?.id || `statement-${index + 1}`),
    role: courtKeyRoles.includes(item?.role) ? item.role : "Defendant",
    text: String(item?.text || "").trim(),
    submittedAt: item?.submittedAt || new Date().toISOString()
  })).filter((item) => item.text);
}

function normalizeCase(entry, index) {
  const slug = String(entry?.id || entry?.caseNumber || `case-${index + 1}`)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

  const status = courtStatuses.includes(entry?.status) ? entry.status : "Filed";

  return {
    id: slug,
    title: String(entry?.title || "Untitled Supreme Court Matter").trim(),
    caseNumber: String(entry?.caseNumber || `WPU-SC-${String(index + 1).padStart(3, "0")}`).trim(),
    status,
    dateOpened: String(entry?.dateOpened || new Date().toISOString().slice(0, 10)).trim(),
    courtroom: String(entry?.courtroom || "Supreme Court Chamber").trim(),
    summary: String(entry?.summary || "").trim(),
    parties: normalizeList(entry?.parties),
    presidingOfficial: String(entry?.presidingOfficial || "Presiding Official").trim(),
    timeline: normalizeTimeline(entry?.timeline),
    evidence: normalizeList(entry?.evidence),
    rulings: normalizeList(entry?.rulings),
    publicNotes: String(entry?.publicNotes || "").trim(),
    accessKeys: normalizeKeys(entry?.accessKeys),
    statements: normalizeStatements(entry?.statements)
  };
}

function normalizeCases(items) {
  return (items || defaultCases).map(normalizeCase);
}

function toPublicCase(courtCase) {
  const { accessKeys, statements, ...publicFields } = courtCase;
  return {
    ...publicFields,
    statementCount: statements.length
  };
}

async function readContentFile({ includeRestricted = true } = {}) {
  try {
    const parsed = await readRemoteStore(includeRestricted);
    return {
      ...parsed,
      supremeCourtCases: normalizeCases(parsed.supremeCourtCases?.length ? parsed.supremeCourtCases : defaultCases)
    };
  } catch {}

  const contentFile = resolveContentFile();
  const fallbackFile = resolveServerlessWritableFile();

  try {
    const raw = await readFile(fallbackFile, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      supremeCourtCases: normalizeCases(parsed.supremeCourtCases || defaultCases)
    };
  } catch {}

  try {
    const raw = await readFile(contentFile, "utf8");
    const parsed = JSON.parse(raw);
    return {
      ...parsed,
      supremeCourtCases: normalizeCases(parsed.supremeCourtCases || defaultCases)
    };
  } catch {
    return {
      supremeCourtCases: normalizeCases(defaultCases)
    };
  }
}

async function writeContentFile(content) {
  try {
    await writeRemoteStore(content);
    return;
  } catch (error) {
    if (isProductionRuntime()) {
      throw error;
    }
  }

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

export async function getSupremeCourtCases({ includeRestricted = false } = {}) {
  const content = await readContentFile({ includeRestricted });
  return includeRestricted
    ? normalizeCases(content.supremeCourtCases)
    : normalizeCases(content.supremeCourtCases).map(toPublicCase);
}

export async function getSupremeCourtCase(id, { includeRestricted = false } = {}) {
  const cases = await getSupremeCourtCases({ includeRestricted });
  return cases.find((courtCase) => courtCase.id === id) || null;
}

export async function saveCourtCase(fields) {
  const content = await readContentFile();
  const cases = normalizeCases(content.supremeCourtCases);
  const existing = fields.id ? cases.find((item) => item.id === fields.id) : null;
  const nextCase = normalizeCase(
    {
      ...existing,
      ...fields,
      accessKeys: existing?.accessKeys || [],
      statements: existing?.statements || []
    },
    cases.length
  );

  content.supremeCourtCases = existing
    ? cases.map((item) => (item.id === existing.id ? nextCase : item))
    : [...cases, nextCase];

  await writeContentFile(content);
  return nextCase;
}

export async function archiveCourtCase(id) {
  const content = await readContentFile();
  const cases = normalizeCases(content.supremeCourtCases);
  content.supremeCourtCases = cases.map((item) =>
    item.id === id ? { ...item, status: "Closed" } : item
  );
  await writeContentFile(content);
}

export async function deleteCourtCase(id) {
  const content = await readContentFile();
  content.supremeCourtCases = normalizeCases(content.supremeCourtCases).filter(
    (item) => item.id !== id
  );
  await writeContentFile(content);
}

export async function addCourtEntry(id, kind, fields) {
  const content = await readContentFile();
  const cases = normalizeCases(content.supremeCourtCases);
  content.supremeCourtCases = cases.map((item) => {
    if (item.id !== id) {
      return item;
    }

    if (kind === "timeline") {
      return {
        ...item,
        timeline: normalizeTimeline([
          ...item.timeline,
          {
            id: `timeline-${Date.now().toString(36)}`,
            date: fields.date,
            title: fields.title,
            text: fields.text
          }
        ])
      };
    }

    if (kind === "ruling") {
      return { ...item, rulings: normalizeList([...item.rulings, fields.text]) };
    }

    if (kind === "evidence") {
      return { ...item, evidence: normalizeList([...item.evidence, fields.text]) };
    }

    if (kind === "party") {
      return { ...item, parties: normalizeList([...item.parties, fields.text]) };
    }

    return item;
  });
  await writeContentFile(content);
}

export async function addOrReplaceAccessKey(caseId, role, rawKey) {
  const content = await readContentFile();
  const cases = normalizeCases(content.supremeCourtCases);
  const key = rawKey?.trim() || generateAccessKey();
  const nextHash = hashAccessKey(key);

  content.supremeCourtCases = cases.map((item) => {
    if (item.id !== caseId) {
      return item;
    }

    const keysWithoutRole = item.accessKeys.filter((accessKey) => accessKey.role !== role);
    return {
      ...item,
      accessKeys: normalizeKeys([
        ...keysWithoutRole,
        {
          id: `key-${Date.now().toString(36)}`,
          role,
          keyHash: nextHash,
          active: true,
          createdAt: new Date().toISOString()
        }
      ])
    };
  });

  await writeContentFile(content);
  return key;
}

export async function revokeAccessKey(caseId, keyId) {
  const content = await readContentFile();
  const cases = normalizeCases(content.supremeCourtCases);
  content.supremeCourtCases = cases.map((item) =>
    item.id === caseId
      ? {
          ...item,
          accessKeys: item.accessKeys.map((accessKey) =>
            accessKey.id === keyId ? { ...accessKey, active: false } : accessKey
          )
        }
      : item
  );
  await writeContentFile(content);
}

export async function authorizeCaseAccess(caseId, key) {
  const courtCase = await getSupremeCourtCase(caseId, { includeRestricted: true });
  const keyHash = hashAccessKey(key);
  const accessKey = courtCase?.accessKeys.find(
    (item) => item.active && item.keyHash === keyHash
  );

  return accessKey ? { role: accessKey.role } : null;
}

export async function submitCourtStatement(caseId, key, statement) {
  const access = await authorizeCaseAccess(caseId, key);
  const text = String(statement || "").trim();

  if (!access || !text) {
    return null;
  }

  const content = await readContentFile();
  const cases = normalizeCases(content.supremeCourtCases);
  const submittedAt = new Date().toISOString();

  content.supremeCourtCases = cases.map((item) =>
    item.id === caseId
      ? {
          ...item,
          statements: normalizeStatements([
            ...item.statements,
            {
              id: `statement-${Date.now().toString(36)}`,
              role: access.role,
              text,
              submittedAt
            }
          ])
        }
      : item
  );

  await writeContentFile(content);
  return { role: access.role, submittedAt };
}

export function parseCourtCaseForm(formData) {
  return {
    id: String(formData.get("id") || "").trim(),
    title: String(formData.get("title") || "").trim(),
    caseNumber: String(formData.get("caseNumber") || "").trim(),
    status: String(formData.get("status") || "Filed").trim(),
    dateOpened: String(formData.get("dateOpened") || "").trim(),
    courtroom: String(formData.get("courtroom") || "").trim(),
    summary: String(formData.get("summary") || "").trim(),
    parties: String(formData.get("parties") || "").trim(),
    presidingOfficial: String(formData.get("presidingOfficial") || "").trim(),
    publicNotes: String(formData.get("publicNotes") || "").trim()
  };
}
