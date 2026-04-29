import { createHmac, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { cookies } from "next/headers";
import { dirname, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { districtEconomyDefaults } from "@wilford/shared";
import { getEconomyStore, getWallet } from "./panem-credit";

export const citizenSessionCookie = "wpu_citizen_session";

const baseUrl = (
  process.env.API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  (process.env.NODE_ENV === "production"
    ? "https://api.wilfordindustries.org"
    : "http://localhost:4000")
).replace(/\/+$/, "");

export const requestCategories = [
  "General Help Request",
  "Ministry Support Request",
  "Housing Request",
  "District Transfer Request",
  "Work Permit Request",
  "Financial Assistance Request",
  "Citizenship Issue",
  "Legal Petition",
  "MSS Security Concern",
  "Technical Website Issue",
  "Other"
];

export const requestStatuses = ["Submitted", "Under Review", "Approved", "Rejected", "Completed"];
export const requestPriorities = ["Low", "Normal", "High", "Urgent"];
export const citizenAlertTypes = [
  "General Notice",
  "Tax Notice",
  "Emergency Taxation",
  "Fine",
  "Wallet Freeze",
  "MSS Warning",
  "Court Notice",
  "Citizenship Notice",
  "Marketplace Notice",
  "Stock Market Notice"
];
export const citizenAlertAuthorities = [
  "Supreme Chairman",
  "Executive Director",
  "Ministry of Credit & Records",
  "MSS",
  "Ministry of State Security",
  "Supreme Court",
  "District Governor",
  "Citizen Services",
  "Marketplace Authority",
  "Panem Stock Exchange"
];
export const citizenEnforcementActions = [
  "none",
  "emergency_taxation",
  "fine",
  "asset_seizure",
  "wallet_freeze",
  "wallet_unfreeze",
  "tax_rebate",
  "grant_payment"
];
export const assignedMinistries = [
  "Citizen Services",
  "Ministry of Credit & Records",
  "Ministry of Public Works",
  "Ministry of State Security",
  "Supreme Court",
  "District Administration",
  "Technical Office"
];
export const citizenStatuses = ["Active Citizen", "Provisional Citizen", "Resident", "Suspended", "Revoked"];
export const securityClassifications = ["Clear", "Under Review", "Watchlisted", "Restricted", "Revoked", "Enemy of the State"];
export const identityStatuses = ["Verified", "Pending Verification", "Suspended", "Revoked", "Lost/Stolen"];

function cleanText(value, maxLength = 800) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${randomBytes(3).toString("hex")}`;
}

function createVerificationCode() {
  return `WPU-${randomBytes(2).toString("hex").toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function createSecurityId(districtName = "Capitol") {
  const districtCode = districtName === "The Capitol" || districtName === "Capitol"
    ? "CR"
    : String(districtName).replace(/\D/g, "").padStart(2, "0").slice(-2) || "00";
  return `WPU-${districtCode}-${new Date().getFullYear()}-${randomBytes(2).toString("hex").toUpperCase()}`;
}

function createCitizenHandle(record = {}) {
  const base = cleanText(record.citizenHandle || record.portalUsername || record.userId || record.name || "citizen", 80)
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return base || `citizen-${randomBytes(2).toString("hex")}`;
}

function cleanTransferCode(value = "") {
  return cleanText(value, 32)
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 24);
}

function contentFile() {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  return [
    process.env.API_DATA_FILE,
    process.env.REPO_ROOT ? resolve(process.env.REPO_ROOT, "apps/api/data/content.json") : null,
    resolve(currentDir, "../../api/data/content.json"),
    resolve(process.cwd(), "../api/data/content.json"),
    resolve(process.cwd(), "../../apps/api/data/content.json"),
    resolve(process.cwd(), "apps/api/data/content.json")
  ].filter(Boolean)[0];
}

function fallbackFile() {
  return resolve(tmpdir(), "wilford-citizen-state.json");
}

function adminApiKey() {
  return process.env.GOVERNMENT_STORE_API_KEY || process.env.BULLETIN_API_KEY || process.env.ADMIN_API_KEY;
}

function authSecret() {
  return (
    process.env.CITIZEN_PORTAL_SECRET ||
    process.env.GOVERNMENT_AUTH_SECRET ||
    process.env.PANEL_SESSION_SECRET ||
    process.env.ADMIN_API_KEY ||
    "WPU-DEVELOPMENT-CITIZEN-PORTAL-SECRET"
  );
}

function normalizeLookup(value) {
  return cleanText(value, 180).toLowerCase().replace(/\s+/g, " ");
}

function sign(payload) {
  return createHmac("sha256", authSecret()).update(payload).digest("hex");
}

function createSessionValue(record) {
  const payload = Buffer.from(
    JSON.stringify({
      citizenId: record.id,
      unionSecurityId: record.unionSecurityId,
      expiresAt: Date.now() + 1000 * 60 * 60 * 8
    })
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function readSessionValue(value) {
  const [payload, signature] = String(value || "").split(".");
  if (!payload || !signature) return null;

  const expected = Buffer.from(sign(payload));
  const actual = Buffer.from(signature);
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    return null;
  }

  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return session.expiresAt > Date.now() ? session : null;
  } catch {
    return null;
  }
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");
  if (!salt || !hash) return false;
  const passwordBuffer = scryptSync(String(password || ""), salt, 64);
  const hashBuffer = Buffer.from(hash, "hex");
  if (passwordBuffer.length !== hashBuffer.length) return false;
  return timingSafeEqual(passwordBuffer, hashBuffer);
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(String(password || ""), salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function generateTemporaryPassword() {
  return `WPU-CIT-${randomBytes(5).toString("hex").toUpperCase()}`;
}

function districtNumber(name) {
  if (name === "The Capitol" || name === "Capitol") return 0;
  return Number(String(name).replace(/\D/g, "")) || 0;
}

const governorNames = {
  "The Capitol": "Clyde Barrow",
  "District 1": "Lady Aedra",
  "District 2": "Governor Marcellus Stone",
  "District 3": "Hubert Skeletrix",
  "District 4": "Governor Nerida Quay",
  "District 5": "Governor Solen Grid",
  "District 6": "Governor Thaddeus Rail",
  "District 7": "Governor Rowan Timber",
  "District 8": "Governor Selene Loom",
  "District 9": "Governor Ceres Mill",
  "District 10": "Governor Darius Stock",
  "District 11": "Governor Amara Orchard",
  "District 12": "Governor Cole Ashford",
  "District 13": "Governor Severin Locke"
};

const officialGovernorProfiles = {
  "The Capitol": {
    governorName: "Clyde Barrow",
    governorTitle: "Governor of the Capitol",
    governorPortrait: "/ClydeBarrowPortrait.png",
    governorBiography:
      "Clyde Barrow governs the Capitol, seat of WPU government, ceremony, law, finance, culture, and national command.",
    loreDescription:
      "The Capitol is the seat of WPU government, ceremony, law, finance, culture, and national command."
  },
  "District 1": {
    governorName: "Lady Aedra",
    governorTitle: "Governor of District 1",
    governorPortrait: "/AedraPortrait.png",
    governorBiography:
      "Lady Aedra governs District 1, directing luxury goods, elite manufacturing, ceremonial fashion, and prestige exports.",
    loreDescription:
      "District 1 produces luxury goods, elite manufacturing, ceremonial fashion, and prestige exports for the Union.",
    economicOutput: "Luxury goods, elite manufacturing, ceremonial fashion, prestige exports",
    productionGoods: "Luxury goods, elite manufacturing, ceremonial fashion, prestige exports",
    tradeRelevance:
      "Luxury goods, elite manufacturing, ceremonial fashion, and prestige exports anchor District 1's Panem Credit trade position."
  },
  "District 3": {
    governorName: "Hubert Skeletrix",
    governorTitle: "Governor of District 3",
    governorPortrait: "/HubertSkeletrixPortrait.png",
    governorBiography:
      "Hubert Skeletrix governs District 3 and leads the Chipkittle Clan, the dominant people and industrial identity of the district.",
    loreDescription:
      "District 3 is home to the Chipkittle Clan, led by Governor Hubert Skeletrix. The Chipkittle Clan forms the core population and industrial identity of District 3.",
    economicOutput: "Technology, electronics, machinery, communications, engineering",
    productionGoods: "Technology, electronics, machinery, communications, engineering",
    tradeRelevance:
      "Technology, electronics, machinery, communications, and engineering keep District 3 central to Union production and Panem Credit trade.",
    loreNote: "Leader of the Chipkittle Clan"
  }
};

export function slugify(value = "") {
  return String(value)
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function districtSlug(district = {}) {
  if (district.canonicalName === "The Capitol" || district.name === "Capitol") return "capitol";
  return slugify(district.canonicalName || district.name);
}

export function personSlug(name = "") {
  return slugify(String(name).replace(/^Governor\s+/i, ""));
}

export function defaultDistrictProfiles(economyDistricts = districtEconomyDefaults) {
  return economyDistricts.map((district) => {
    const number = districtNumber(district.name);
    const governorName = governorNames[district.name] || `Governor of ${district.name}`;
    const officialGovernor = officialGovernorProfiles[district.name] || {};
    return {
      id: district.id,
      name: district.name === "The Capitol" ? "Capitol" : district.name,
      canonicalName: district.name,
      industry: district.productionType,
      governorName,
      governorTitle: number === 0 ? "Capitol Governor" : `${district.name} Governor`,
      governorPortrait: "/wpu-grand-seal.png",
      governorBiography: `${governorName} administers ${district.name === "The Capitol" ? "central command, civic culture, and finance" : `${district.name} production, census order, and civic welfare`} under the Grand Seal.`,
      loyaltyStatement: number === 13 ? "Restricted service remains loyal through silence and precision." : "The district serves the Union through ordered production.",
      appointmentDate: "2026-04-28",
      loreDescription: number === 0
        ? "The Capitol is the command center of government, culture, finance, and executive continuity."
        : `${district.name} is bound to the Union as a production district with protected wages, census records, and state-directed development.`,
      economicOutput: district.goodsProduced,
      loyaltyRating: district.loyaltyScore,
      productionGoods: district.goodsProduced,
      tradeRelevance: `${district.name === "The Capitol" ? "Treasury command" : district.productionType} anchors Panem Credit pricing, district levy policy, and marketplace supply.`,
      developmentStatus: district.developmentStatus,
      keyLandmarks: number === 0
        ? ["Grand Seal Plaza", "Ministry Row", "Credit & Records Hall"]
        : [`${district.name} Civic Registry`, "Union Rail Station", "Production Exchange"],
      recentBulletins: [],
      ...officialGovernor
    };
  });
}

function seedCitizenRecords(store) {
  return [
    ["citizen-chairman", "Chairman Lemmie", "chairman", "The Capitol", "Supreme Chairman", "Clear", "wallet-chairman", "WPU-CR-2026-0001", "WPU-VERIFY-CHAIRMAN"],
    ["citizen-eclip", "Executive Director Eclip", "eclip", "District 3", "Executive Command", "Clear", "wallet-eclip", "WPU-03-2026-0002", "WPU-VERIFY-ECLIP"],
    ["citizen-flukkston", "Sir Flukkston", "flukkston", "District 2", "Executive Command", "Clear", "wallet-flukkston", "WPU-02-2026-0003", "WPU-VERIFY-FLUK"],
    ["citizen-public", "Registered Citizen", "citizen", "District 8", "Active Citizen", "Clear", "wallet-citizen", "WPU-08-2026-0004", "WPU-VERIFY-CITIZEN"]
  ].map(([id, name, userId, district, status, securityClassification, walletId, unionSecurityId, verificationCode], index) => {
    const wallet = getWallet(store, walletId);
    return normalizeCitizenRecord({
      id,
      name,
      userId,
      discordUsername: "",
      discordId: wallet?.discordId || "",
      citizenHandle: userId,
      transferCode: "",
      district,
      citizenStatus: status,
      securityClassification,
      walletId,
      unionSecurityId,
      verificationCode,
      issueDate: "2026-04-28",
      expiryDate: "",
      verificationStatus: "Verified",
      internalNotes: index === 0 ? "Executive record." : "",
      warnings: [],
      createdAt: "2026-04-28T00:00:00.000Z",
      updatedAt: "2026-04-28T00:00:00.000Z"
    });
  });
}

function normalizeCitizenRecord(record = {}) {
  const district = cleanText(record.district || "Capitol", 80);
  const citizenHandle = createCitizenHandle(record);
  return {
    id: cleanText(record.id || createId("citizen"), 120),
    name: cleanText(record.name || "Registered Citizen", 160),
    userId: cleanText(record.userId || "", 120),
    portalUsername: cleanText(record.portalUsername || record.userId || "", 120),
    passwordHash: String(record.passwordHash || ""),
    forcePasswordChange: Boolean(record.forcePasswordChange),
    temporaryPasswordIssuedAt: record.temporaryPasswordIssuedAt || "",
    credentialDeliveryStatus: cleanText(record.credentialDeliveryStatus || "", 80),
    credentialDeliveryError: cleanText(record.credentialDeliveryError || "", 300),
    sourceApplicationId: cleanText(record.sourceApplicationId || "", 120),
    discordUsername: cleanText(record.discordUsername || "", 120),
    discordId: cleanText(record.discordId || "", 80),
    citizenHandle,
    transferCode: cleanTransferCode(record.transferCode || ""),
    district,
    citizenStatus: citizenStatuses.includes(record.citizenStatus) || ["Supreme Chairman", "Executive Command"].includes(record.citizenStatus)
      ? record.citizenStatus
      : "Active Citizen",
    securityClassification: securityClassifications.includes(record.securityClassification) ? record.securityClassification : "Clear",
    walletId: cleanText(record.walletId || "", 120),
    unionSecurityId: cleanText(record.unionSecurityId || createSecurityId(district), 80),
    verificationCode: cleanText(record.verificationCode || createVerificationCode(), 80),
    issueDate: cleanText(record.issueDate || new Date().toISOString().slice(0, 10), 40),
    expiryDate: cleanText(record.expiryDate || "", 40),
    verificationStatus: identityStatuses.includes(record.verificationStatus) ? record.verificationStatus : "Verified",
    internalNotes: cleanText(record.internalNotes || "", 1600),
    warnings: Array.isArray(record.warnings) ? record.warnings.map((item) => cleanText(item, 220)).filter(Boolean).slice(0, 10) : [],
    lostOrStolen: Boolean(record.lostOrStolen),
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: record.updatedAt || new Date().toISOString()
  };
}

function ensureUniqueCitizenHandles(records = []) {
  const seen = new Map();
  return records.map((record) => {
    const base = createCitizenHandle(record);
    const count = seen.get(base) || 0;
    seen.set(base, count + 1);
    return {
      ...record,
      citizenHandle: count ? `${base}-${count + 1}`.slice(0, 36) : base
    };
  });
}

function normalizeCitizenRequest(entry = {}) {
  const now = new Date().toISOString();
  return {
    id: cleanText(entry.id || createId("request"), 120),
    citizenName: cleanText(entry.citizenName || "Registered Citizen", 160),
    citizenId: cleanText(entry.citizenId || "", 120),
    district: cleanText(entry.district || "Unassigned", 80),
    category: requestCategories.includes(entry.category) ? entry.category : "Other",
    priority: requestPriorities.includes(entry.priority) ? entry.priority : "Normal",
    message: cleanText(entry.message || "", 2400),
    attachments: cleanText(entry.attachments || "", 1000),
    targetDistrict: cleanText(entry.targetDistrict || "", 80),
    targetJobId: cleanText(entry.targetJobId || "", 120),
    targetJobName: cleanText(entry.targetJobName || "", 160),
    governorName: cleanText(entry.governorName || "", 160),
    permitId: cleanText(entry.permitId || "", 120),
    permitExpiresAt: cleanText(entry.permitExpiresAt || "", 80),
    status: requestStatuses.includes(entry.status) ? entry.status : "Submitted",
    assignedMinistry: cleanText(entry.assignedMinistry || "Citizen Services", 120),
    governmentNotes: cleanText(entry.governmentNotes || "", 2400),
    citizenResponse: cleanText(entry.citizenResponse || "", 1600),
    escalation: cleanText(entry.escalation || "", 120),
    closedAt: entry.closedAt || "",
    createdAt: entry.createdAt || now,
    updatedAt: entry.updatedAt || now
  };
}

function normalizeCitizenAlert(entry = {}) {
  const now = new Date().toISOString();
  const type = citizenAlertTypes.includes(entry.type) ? entry.type : "General Notice";
  const action = citizenEnforcementActions.includes(entry.enforcementAction) ? entry.enforcementAction : "none";
  return {
    id: cleanText(entry.id || createId("alert"), 120),
    citizenId: cleanText(entry.citizenId || "", 120),
    citizenName: cleanText(entry.citizenName || "", 180),
    district: cleanText(entry.district || "", 80),
    title: cleanText(entry.title || "", 180),
    type,
    issuingAuthority: cleanText(entry.issuingAuthority || "Government", 160),
    severity: cleanText(entry.severity || "standard", 40),
    category: cleanText(entry.category || type, 80),
    message: cleanText(entry.message || "", 1600),
    enforcementAction: action,
    actionTaken: cleanText(entry.actionTaken || (action === "none" ? "Notice issued" : action.replace(/_/g, " ")), 500),
    amount: Math.max(0, Number(entry.amount || 0)),
    linkedRecordType: cleanText(entry.linkedRecordType || "", 80),
    linkedRecordId: cleanText(entry.linkedRecordId || "", 160),
    transactionId: cleanText(entry.transactionId || "", 160),
    caseId: cleanText(entry.caseId || "", 160),
    appealEnabled: entry.appealEnabled !== false,
    websiteOnly: Boolean(entry.websiteOnly),
    discordDeliveryRequested: Boolean(entry.discordDeliveryRequested),
    discordDeliveryStatus: cleanText(entry.discordDeliveryStatus || (entry.discordDeliveryRequested ? "pending" : "not_requested"), 80),
    discordDeliveryError: cleanText(entry.discordDeliveryError || "", 500),
    readByCitizen: Boolean(entry.readByCitizen),
    readAt: cleanText(entry.readAt || "", 80),
    status: cleanText(entry.status || "open", 80),
    resolvedAt: cleanText(entry.resolvedAt || "", 80),
    resolvedBy: cleanText(entry.resolvedBy || "", 160),
    createdBy: cleanText(entry.createdBy || "system", 160),
    createdAt: entry.createdAt || now,
    updatedAt: entry.updatedAt || entry.createdAt || now
  };
}

function normalizeDistrictProfile(profile = {}, economyDistricts = districtEconomyDefaults) {
  const defaults = defaultDistrictProfiles(economyDistricts);
  const fallback = defaults.find((district) => district.id === profile.id || district.canonicalName === profile.canonicalName) || defaults[0];
  const officialGovernor = officialGovernorProfiles[profile.canonicalName || fallback.canonicalName] || {};
  const source = { ...fallback, ...profile, ...officialGovernor };
  return {
    ...source,
    name: cleanText(source.name, 80),
    canonicalName: cleanText(source.canonicalName, 80),
    industry: cleanText(source.industry, 180),
    governorName: cleanText(source.governorName, 160),
    governorTitle: cleanText(source.governorTitle, 160),
    governorPortrait: cleanText(source.governorPortrait, 500),
    governorBiography: cleanText(source.governorBiography, 1200),
    loyaltyStatement: cleanText(source.loyaltyStatement, 500),
    appointmentDate: cleanText(source.appointmentDate, 40),
    loreDescription: cleanText(source.loreDescription, 1200),
    economicOutput: cleanText(source.economicOutput, 500),
    productionGoods: cleanText(source.productionGoods, 500),
    tradeRelevance: cleanText(source.tradeRelevance, 800),
    developmentStatus: cleanText(source.developmentStatus, 160),
    loreNote: cleanText(source.loreNote, 240),
    keyLandmarks: Array.isArray(source.keyLandmarks) ? source.keyLandmarks.map((item) => cleanText(item, 120)).filter(Boolean).slice(0, 6) : fallback.keyLandmarks,
    recentBulletins: Array.isArray(source.recentBulletins) ? source.recentBulletins.map((item) => cleanText(item, 180)).filter(Boolean).slice(0, 5) : []
  };
}

function normalizeCitizenState(content = {}, economyStore) {
  const economyDistricts = economyStore?.districts?.length ? economyStore.districts : districtEconomyDefaults;
  const storedDistricts = Array.isArray(content.districtProfiles) && content.districtProfiles.length ? content.districtProfiles : defaultDistrictProfiles(economyDistricts);
  const districtIds = new Set(storedDistricts.map((district) => district.id || district.canonicalName));
  const districtProfiles = [
    ...storedDistricts,
    ...defaultDistrictProfiles(economyDistricts).filter((district) => !districtIds.has(district.id) && !districtIds.has(district.canonicalName))
  ].map((district) => normalizeDistrictProfile(district, economyDistricts));

  return {
    citizenRecords: ensureUniqueCitizenHandles((Array.isArray(content.citizenRecords) && content.citizenRecords.length
      ? content.citizenRecords
      : seedCitizenRecords(economyStore)
    ).map(normalizeCitizenRecord)),
    citizenRequests: (Array.isArray(content.citizenRequests) ? content.citizenRequests : []).map(normalizeCitizenRequest),
    citizenAlerts: (Array.isArray(content.citizenAlerts) ? content.citizenAlerts : []).map(normalizeCitizenAlert),
    districtProfiles,
    citizenActivity: Array.isArray(content.citizenActivity) ? content.citizenActivity : []
  };
}

async function readRemoteStore() {
  const key = adminApiKey();
  if (!key) throw new Error("Missing admin API key.");
  const response = await fetch(`${baseUrl}/api/admin/government-access-store`, {
    headers: { "x-admin-key": key },
    cache: "no-store",
    signal: AbortSignal.timeout(4000)
  });
  if (!response.ok) throw new Error(`Citizen state read failed with ${response.status}.`);
  return response.json();
}

async function writeRemoteStore(content) {
  const key = adminApiKey();
  if (!key) throw new Error("Missing admin API key.");
  const response = await fetch(`${baseUrl}/api/admin/government-access-store`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-admin-key": key },
    body: JSON.stringify(content),
    cache: "no-store",
    signal: AbortSignal.timeout(5000)
  });
  if (!response.ok) throw new Error(`Citizen state write failed with ${response.status}.`);
  return response.json();
}

async function readLocalContent() {
  try {
    return JSON.parse(await readFile(contentFile(), "utf8"));
  } catch {}
  try {
    return JSON.parse(await readFile(fallbackFile(), "utf8"));
  } catch {
    return {};
  }
}

async function writeLocalContent(nextFields) {
  const file = contentFile();
  try {
    const current = await readLocalContent();
    await mkdir(dirname(file), { recursive: true });
    await writeFile(file, JSON.stringify({ ...current, ...nextFields }, null, 2));
    return true;
  } catch {}

  const fallback = fallbackFile();
  const current = await readLocalContent();
  await mkdir(dirname(fallback), { recursive: true });
  await writeFile(fallback, JSON.stringify({ ...current, ...nextFields }, null, 2));
  return true;
}

export async function getCitizenState() {
  const economyStore = await getEconomyStore();
  try {
    return normalizeCitizenState(await readRemoteStore(), economyStore);
  } catch {}
  return normalizeCitizenState(await readLocalContent(), economyStore);
}

export async function saveCitizenState(nextState) {
  const currentLocal = await readLocalContent();
  const payload = {
    ...currentLocal,
    citizenRecords: nextState.citizenRecords || [],
    citizenRequests: nextState.citizenRequests || [],
    citizenAlerts: nextState.citizenAlerts || [],
    districtProfiles: nextState.districtProfiles || [],
    citizenActivity: nextState.citizenActivity || []
  };

  try {
    await writeRemoteStore(payload);
  } catch (error) {
    if (process.env.NODE_ENV === "production") throw error;
  }

  await writeLocalContent(payload);
  return getCitizenState();
}

export async function createCitizenRequest(fields) {
  const state = await getCitizenState();
  const request = normalizeCitizenRequest({
    citizenName: fields.citizenName,
    citizenId: fields.citizenId,
    district: fields.district,
    category: fields.category,
    priority: fields.priority,
    message: fields.message,
    attachments: fields.attachments,
    targetDistrict: fields.targetDistrict,
    targetJobId: fields.targetJobId,
    targetJobName: fields.targetJobName,
    governorName: fields.governorName,
    assignedMinistry: fields.assignedMinistry || ministryForCategory(fields.category)
  });
  state.citizenRequests = [request, ...state.citizenRequests].slice(0, 500);
  await saveCitizenState(state);
  return request;
}

export async function recordCitizenActivity(citizenId, action, detail = "") {
  const state = await getCitizenState();
  const record = state.citizenRecords.find((citizen) => citizen.id === citizenId);
  if (!record) return state;

  state.citizenActivity = [
    {
      id: createId("citizen-activity"),
      citizenId: record.id,
      citizenName: record.name,
      unionSecurityId: record.unionSecurityId,
      action: cleanText(action, 120),
      detail: cleanText(detail, 600),
      createdAt: new Date().toISOString()
    },
    ...(state.citizenActivity || [])
  ].slice(0, 1000);
  return saveCitizenState(state);
}

export async function updateCitizenRequest(id, fields) {
  const state = await getCitizenState();
  state.citizenRequests = state.citizenRequests.map((request) =>
    request.id === id
      ? normalizeCitizenRequest({
          ...request,
          status: fields.status || request.status,
          assignedMinistry: fields.assignedMinistry || request.assignedMinistry,
          governmentNotes: fields.governmentNotes ?? request.governmentNotes,
          citizenResponse: fields.citizenResponse ?? request.citizenResponse,
          escalation: fields.escalation ?? request.escalation,
          permitId: fields.permitId ?? request.permitId,
          permitExpiresAt: fields.permitExpiresAt ?? request.permitExpiresAt,
          closedAt: fields.close ? new Date().toISOString() : request.closedAt,
          updatedAt: new Date().toISOString()
        })
      : request
  );
  return saveCitizenState(state);
}

export async function createCitizenRecord(fields) {
  const state = await getCitizenState();
  const record = normalizeCitizenRecord({
    name: fields.name,
    userId: fields.userId,
    citizenHandle: fields.citizenHandle,
    transferCode: fields.transferCode,
    discordUsername: fields.discordUsername,
    discordId: fields.discordId,
    district: fields.district,
    citizenStatus: fields.citizenStatus,
    securityClassification: fields.securityClassification,
    walletId: fields.walletId,
    issueDate: fields.issueDate,
    expiryDate: fields.expiryDate,
    verificationStatus: fields.verificationStatus
  });
  state.citizenRecords = [record, ...state.citizenRecords].slice(0, 500);
  await saveCitizenState(state);
  return record;
}

export async function updateCitizenRecord(id, fields) {
  const state = await getCitizenState();
  state.citizenRecords = state.citizenRecords.map((record) => {
    if (record.id !== id) return record;
    const regenerate = fields.regenerateVerificationCode;
    const district = fields.district || record.district;
    return normalizeCitizenRecord({
      ...record,
      name: fields.name ?? record.name,
      userId: fields.userId ?? record.userId,
      citizenHandle: fields.citizenHandle ?? record.citizenHandle,
      transferCode: fields.transferCode ?? record.transferCode,
      discordUsername: fields.discordUsername ?? record.discordUsername,
      discordId: fields.discordId ?? record.discordId,
      district,
      citizenStatus: fields.citizenStatus ?? record.citizenStatus,
      securityClassification: fields.securityClassification ?? record.securityClassification,
      walletId: fields.walletId ?? record.walletId,
      expiryDate: fields.expiryDate ?? record.expiryDate,
      verificationStatus: fields.verificationStatus ?? record.verificationStatus,
      lostOrStolen: Boolean(fields.lostOrStolen),
      internalNotes: fields.internalNotes ?? record.internalNotes,
      verificationCode: regenerate ? createVerificationCode() : record.verificationCode,
      unionSecurityId: fields.regenerateSecurityId ? createSecurityId(district) : record.unionSecurityId,
      updatedAt: new Date().toISOString()
    });
  });
  return saveCitizenState(state);
}

export async function resetCitizenPassword(id) {
  const state = await getCitizenState();
  const temporaryPassword = generateTemporaryPassword();
  let updated = null;
  state.citizenRecords = state.citizenRecords.map((record) => {
    if (record.id !== id) return record;
    updated = normalizeCitizenRecord({
      ...record,
      passwordHash: hashPassword(temporaryPassword),
      forcePasswordChange: true,
      temporaryPasswordIssuedAt: new Date().toISOString(),
      credentialDeliveryStatus: "manual delivery required",
      credentialDeliveryError: "",
      updatedAt: new Date().toISOString()
    });
    return updated;
  });
  if (!updated) return { ok: false, temporaryPassword: "" };
  await saveCitizenState(state);
  await recordCitizenActivity(id, "password reset", "Citizen Portal temporary password issued by government registry.");
  return { ok: true, temporaryPassword };
}

export async function updateDistrictProfile(id, fields) {
  const state = await getCitizenState();
  state.districtProfiles = state.districtProfiles.map((district) =>
    district.id === id
      ? normalizeDistrictProfile({
          ...district,
          governorName: fields.governorName,
          governorTitle: fields.governorTitle,
          governorPortrait: fields.governorPortrait,
          governorBiography: fields.governorBiography,
          loyaltyStatement: fields.loyaltyStatement,
          appointmentDate: fields.appointmentDate,
          loreDescription: fields.loreDescription,
          keyLandmarks: String(fields.keyLandmarks || "")
            .split("\n")
            .map((item) => cleanText(item, 120))
            .filter(Boolean),
          recentBulletins: String(fields.recentBulletins || "")
            .split("\n")
            .map((item) => cleanText(item, 180))
            .filter(Boolean)
        })
      : district
  );
  return saveCitizenState(state);
}

export function ministryForCategory(category) {
  return {
    "Ministry Support Request": "Citizen Services",
    "Housing Request": "Ministry of Public Works",
    "District Transfer Request": "District Administration",
    "Work Permit Request": "District Administration",
    "Financial Assistance Request": "Ministry of Credit & Records",
    "Citizenship Issue": "Ministry of Credit & Records",
    "Legal Petition": "Supreme Court",
    "MSS Security Concern": "Ministry of State Security",
    "Technical Website Issue": "Technical Office"
  }[category] || "Citizen Services";
}

export function findCitizenBySelector(state, selector) {
  const value = cleanText(selector, 160).toLowerCase();
  if (!value) return state.citizenRecords[0];
  return state.citizenRecords.find((record) =>
    [record.id, record.userId, record.discordId, record.unionSecurityId, record.verificationCode]
      .filter(Boolean)
      .some((item) => String(item).toLowerCase() === value)
  ) || state.citizenRecords[0];
}

export function findCitizenForTransfer(state, economy, selector) {
  const raw = cleanText(selector, 160);
  const normalizeTransferLookup = (input) => String(input || "")
    .replace(/[<@!>]/g, "")
    .replace(/^@+/, "")
    .replace(/^discord-/, "")
    .trim()
    .toLowerCase();
  const slugTransferLookup = (input) => normalizeTransferLookup(input)
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  const value = normalizeTransferLookup(raw);
  const slugValue = slugTransferLookup(raw);
  if (!value) return null;
  const matches = (state.citizenRecords || []).filter((record) => {
    const wallet = getWallet(economy, record.walletId || record.userId || record.discordId || record.id);
    if (!wallet || record.verificationStatus !== "Verified" || record.lostOrStolen) return false;
    const values = [
      record.citizenHandle,
      record.portalUsername,
      record.userId,
      record.transferCode,
      record.discordId,
      record.discordUsername,
      record.name,
      record.citizenName,
      wallet.id,
      wallet.userId,
      wallet.discordId,
      wallet.discordUsername,
      wallet.displayName
    ].filter(Boolean);
    return values.some((item) => normalizeTransferLookup(item) === value || slugTransferLookup(item) === slugValue);
  });
  if (matches.length === 1) {
    const citizen = matches[0];
    const wallet = getWallet(economy, citizen.walletId || citizen.userId || citizen.discordId || citizen.id);
    return wallet ? { citizen, wallet } : null;
  }
  if (matches.length > 1) return null;

  const walletMatches = (economy.wallets || []).filter((wallet) => {
    const values = [
      wallet.citizenHandle,
      wallet.transferCode,
      wallet.id,
      wallet.userId,
      wallet.discordId,
      wallet.discordUsername,
      wallet.displayName
    ].filter(Boolean);
    return values.some((item) => normalizeTransferLookup(item) === value || slugTransferLookup(item) === slugValue);
  });
  if (walletMatches.length !== 1) return null;
  return { citizen: null, wallet: walletMatches[0] };
}

export function findCitizenForLogin(state, identifier, password = "") {
  const requestedIdentifier = normalizeLookup(identifier);
  const requestedDiscordId = cleanText(identifier, 120).replace(/[<@!>]/g, "").trim().toLowerCase();
  if (!requestedIdentifier || !password) return null;

  return state.citizenRecords.find((record) =>
    [
      record.portalUsername,
      record.userId,
      record.citizenHandle,
      record.discordId,
      record.discordUsername,
      record.name
    ]
      .filter(Boolean)
      .some((item) => normalizeLookup(item) === requestedIdentifier || normalizeLookup(item).replace(/^@+/, "") === requestedIdentifier.replace(/^@+/, "") || normalizeLookup(item) === requestedDiscordId) &&
    (!record.passwordHash || verifyPassword(password, record.passwordHash)) &&
    record.verificationStatus === "Verified" &&
    !record.lostOrStolen &&
    !["Revoked", "Suspended", "Lost/Stolen"].includes(record.verificationStatus) &&
    !["Revoked", "Enemy of the State"].includes(record.securityClassification)
  ) || null;
}

export async function loginCitizen(identifier, password = "") {
  const state = await getCitizenState();
  const record = findCitizenForLogin(state, identifier, password);
  if (!record) return { ok: false };

  const store = await cookies();
  store.set(citizenSessionCookie, createSessionValue(record), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8
  });
  await recordCitizenActivity(record.id, "login", "Citizen Portal access granted.");
  return { ok: true, record };
}

export async function logoutCitizen() {
  const record = await getCurrentCitizen();
  const store = await cookies();
  store.set(citizenSessionCookie, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0
  });
  if (record) {
    await recordCitizenActivity(record.id, "logout", "Citizen Portal session ended.");
  }
}

export async function changeCitizenPassword(citizenId, currentPassword, nextPassword) {
  const state = await getCitizenState();
  const record = state.citizenRecords.find((citizen) => citizen.id === citizenId);
  const password = String(nextPassword || "");

  if (!record || password.length < 8) {
    return { ok: false };
  }

  if (record.passwordHash && !verifyPassword(currentPassword, record.passwordHash)) {
    return { ok: false };
  }

  state.citizenRecords = state.citizenRecords.map((citizen) =>
    citizen.id === citizenId
      ? normalizeCitizenRecord({
          ...citizen,
          passwordHash: hashPassword(password),
          forcePasswordChange: false,
          updatedAt: new Date().toISOString()
        })
      : citizen
  );
  await saveCitizenState(state);
  await recordCitizenActivity(citizenId, "password changed", "Citizen Portal password changed.");
  return { ok: true };
}

export async function getCurrentCitizen() {
  const store = await cookies();
  const session = readSessionValue(store.get(citizenSessionCookie)?.value);
  if (!session?.citizenId) return null;

  const state = await getCitizenState();
  const record = state.citizenRecords.find((citizen) =>
    citizen.id === session.citizenId &&
    citizen.unionSecurityId === session.unionSecurityId &&
    citizen.verificationStatus === "Verified" &&
    !citizen.lostOrStolen &&
    !["Revoked", "Suspended", "Lost/Stolen"].includes(citizen.verificationStatus)
  );
  return record || null;
}

export async function hydrateCitizenProfile(record) {
  const economy = await getEconomyStore();
  const wallet = getWallet(economy, record.walletId || record.userId || record.discordId);
  const state = await getCitizenState();
  const requests = state.citizenRequests.filter((request) => request.citizenId === record.id);
  const alerts = state.citizenAlerts.filter((alert) => alert.citizenId === record.id);
  const taxes = wallet ? economy.taxRecords.filter((tax) => tax.walletId === wallet.id) : [];
  const district = economy.districts.find((item) => item.name === record.district || item.name === `The ${record.district}`);
  return { record, wallet, requests, alerts, taxes, district };
}
