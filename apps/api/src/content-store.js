import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  craftingQualityTiers,
  blackMarketGoodsDefaults,
  craftingRecipeDefaults,
  districtEconomyDefaults,
  gatheringActionDefaults,
  inventoryItemDefaults,
  inventoryRarityTiers,
  marketItemDefaults,
  stockCompanyDefaults,
  taxTypes
} from "@wilford/shared";
import { config } from "./config.js";

const defaultContent = {
  settings: {
    homepageHeadline: "Wilford Industries",
    homepageEyebrow: "Welcome to",
    homepageDescription:
      "A monument to order, expansion, and industrial discipline under the leadership of Chairman Lemmie.",
    chairmanName: "Lemmie",
    commitsRepository: "eclipsay/wilford",
    discordCommitsChannelId: ""
  },
  members: [
    {
      id: "chairman-lemmie",
      name: "Lemmie",
      role: "Chairman",
      division: "Executive Office",
      status: "Active",
      notes: "Supreme authority over Wilford Industries.",
      order: 0
    }
  ],
  alliances: [],
  excommunications: [],
  enemyNations: [],
  panelUsers: [],
  cryptoLogs: [],
  publicApplications: [],
  articles: [
    {
      id: "article-union-continuity",
      title: "Union Continuity Programme Announced",
      subtitle: "The Government confirms coordinated measures for order, production, and civic service.",
      body:
        "The Wilford Panem Union has opened a new continuity programme across ministries, district offices, and civic registries. The programme aligns public service, production readiness, and citizen support under one central standard of national duty.\n\nOfficials confirmed that additional directives will be published as ministries complete their operating reviews.",
      heroImage: "/hero.png",
      category: "Government",
      source: "Wilford Panem Union",
      publishDate: "2026-04-27T00:00:00.000Z",
      status: "published",
      featured: true,
      createdAt: "2026-04-27T00:00:00.000Z",
      updatedAt: "2026-04-27T00:00:00.000Z"
    }
  ],
  governmentUsers: [],
  governmentAuditLog: [],
  citizenRecords: [],
  citizenRequests: [],
  citizenAlerts: [],
  citizenActivity: [],
  districtProfiles: [],
  discordBroadcasts: [],
  enemyOfStateEntries: [],
  enemyOfStateDiscordEvents: [],
  supremeCourtCases: [],
  supremeCourtPetitions: [],
  economy: {
    wallets: [],
    transactions: [],
    marketItems: marketItemDefaults,
    listings: [],
    taxRecords: [],
    taxRates: Object.fromEntries(taxTypes.map((tax) => [tax.id, tax.defaultRate])),
    districts: districtEconomyDefaults,
    alerts: [],
    raidLogs: [],
    gamblingJackpot: 2500,
    categories: [
      "Luxury Goods",
      "Security Equipment",
      "Technology",
      "Food",
      "Energy",
      "Transport",
      "Raw Materials",
      "Textiles",
      "Agriculture",
      "Industrial Fuel",
      "Restricted Technology"
    ],
    events: [
      {
        id: "market-event-civic-stipend",
        title: "Daily civic stipend active",
        description: "Citizens may claim one Ministry stipend each day.",
        status: "active"
      }
    ]
  },
  bulletins: [
    {
      id: "bulletin-default-1",
      headline: "Chairman Lemmie announces new prosperity initiative",
      category: "Chairman",
      issuingAuthority: "Chairman",
      bulletinType: "Directive",
      priority: "standard",
      active: true,
      order: 0,
      expiresAt: "",
      createdAt: "2026-04-27T00:00:00.000Z",
      updatedAt: "2026-04-27T00:00:00.000Z"
    },
    {
      id: "bulletin-default-2",
      headline: "Supreme Court opens hearings at The Capitol Parliament",
      category: "Supreme Court",
      issuingAuthority: "Supreme Court",
      bulletinType: "Judicial Notice",
      priority: "standard",
      active: true,
      order: 1,
      expiresAt: "",
      createdAt: "2026-04-27T00:00:00.000Z",
      updatedAt: "2026-04-27T00:00:00.000Z"
    },
    {
      id: "bulletin-default-3",
      headline: "Eternal Engine departs for District 6 inspection route",
      category: "Eternal Engine",
      issuingAuthority: "Government",
      bulletinType: "Public Bulletin",
      priority: "standard",
      active: true,
      order: 2,
      expiresAt: "",
      createdAt: "2026-04-27T00:00:00.000Z",
      updatedAt: "2026-04-27T00:00:00.000Z"
    },
    {
      id: "bulletin-default-4",
      headline: "Ministry of Production reports record district output",
      category: "Districts",
      issuingAuthority: "Ministries",
      bulletinType: "Ministerial Order",
      priority: "standard",
      active: true,
      order: 3,
      expiresAt: "",
      createdAt: "2026-04-27T00:00:00.000Z",
      updatedAt: "2026-04-27T00:00:00.000Z"
    },
    {
      id: "bulletin-default-5",
      headline: "Panem Credit adoption reaches record levels",
      category: "Panem Credit",
      issuingAuthority: "Government",
      bulletinType: "Notice",
      priority: "standard",
      active: true,
      order: 4,
      expiresAt: "",
      createdAt: "2026-04-27T00:00:00.000Z",
      updatedAt: "2026-04-27T00:00:00.000Z"
    },
    {
      id: "bulletin-default-6",
      headline: "Ministry of State Security issues internal advisory",
      category: "MSS",
      issuingAuthority: "MSS",
      bulletinType: "Security Advisory",
      priority: "standard",
      active: true,
      order: 5,
      expiresAt: "",
      createdAt: "2026-04-27T00:00:00.000Z",
      updatedAt: "2026-04-27T00:00:00.000Z"
    }
  ]
};

function withNormalizedOrder(items) {
  return [...(items || [])]
    .sort((a, b) => Number(a.order ?? 0) - Number(b.order ?? 0))
    .map((item, index) => ({
      ...item,
      order: index
    }));
}

function withReindexedOrder(items) {
  return [...(items || [])].map((item, index) => ({
    ...item,
    order: index
  }));
}

function normalizeEconomyStore(economy = {}) {
  const taxRates = {
    ...Object.fromEntries(taxTypes.map((tax) => [tax.id, tax.defaultRate])),
    ...(economy.taxRates || {})
  };
  const storedDistricts =
    Array.isArray(economy.districts) && economy.districts.length
      ? economy.districts
      : districtEconomyDefaults;
  const storedDistrictKeys = new Set(storedDistricts.map((district) => district.id || district.name));
  const districts = [
    ...storedDistricts,
    ...districtEconomyDefaults.filter((district) => !storedDistrictKeys.has(district.id) && !storedDistrictKeys.has(district.name))
  ];

  return {
    wallets: Array.isArray(economy.wallets) ? economy.wallets : [],
    transactions: Array.isArray(economy.transactions) ? economy.transactions : [],
    marketItems:
      Array.isArray(economy.marketItems) && economy.marketItems.length
        ? economy.marketItems
        : marketItemDefaults,
    listings: Array.isArray(economy.listings) ? economy.listings : [],
    taxRecords: Array.isArray(economy.taxRecords) ? economy.taxRecords : [],
    taxRates,
    districts,
    alerts: Array.isArray(economy.alerts) ? economy.alerts : [],
    raidLogs: Array.isArray(economy.raidLogs) ? economy.raidLogs : [],
    gamblingJackpot: Math.max(500, Number(economy.gamblingJackpot || 2500)),
    blackMarketGoods:
      Array.isArray(economy.blackMarketGoods) && economy.blackMarketGoods.length
        ? economy.blackMarketGoods
        : blackMarketGoodsDefaults,
    categories:
      Array.isArray(economy.categories) && economy.categories.length
        ? economy.categories
        : defaultContent.economy.categories,
    events: Array.isArray(economy.events) ? economy.events : defaultContent.economy.events,
    inventoryItems:
      Array.isArray(economy.inventoryItems) && economy.inventoryItems.length
        ? economy.inventoryItems
        : inventoryItemDefaults,
    rarityTiers: Array.isArray(economy.rarityTiers) ? economy.rarityTiers : inventoryRarityTiers,
    gatheringActions:
      Array.isArray(economy.gatheringActions) && economy.gatheringActions.length
        ? economy.gatheringActions
        : gatheringActionDefaults,
  inventoryChallenges: Array.isArray(economy.inventoryChallenges) ? economy.inventoryChallenges : [],
    craftingRecipes:
      Array.isArray(economy.craftingRecipes) && economy.craftingRecipes.length
        ? economy.craftingRecipes
        : craftingRecipeDefaults,
    craftingQualityTiers:
      Array.isArray(economy.craftingQualityTiers) && economy.craftingQualityTiers.length
        ? economy.craftingQualityTiers
        : craftingQualityTiers,
    stockCompanies:
      Array.isArray(economy.stockCompanies) && economy.stockCompanies.length
        ? economy.stockCompanies
        : stockCompanyDefaults,
    stockTrades: Array.isArray(economy.stockTrades) ? economy.stockTrades : [],
    stockEvents: Array.isArray(economy.stockEvents) ? economy.stockEvents : [],
    stockSettings: { transactionTax: 0.015, transactionFee: 2, ...(economy.stockSettings || {}) },
    marketNotices: Array.isArray(economy.marketNotices) ? economy.marketNotices : [],
    bounties: Array.isArray(economy.bounties) ? economy.bounties : []
  };
}

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  const [salt, hash] = String(storedHash || "").split(":");

  if (!salt || !hash) {
    return false;
  }

  const passwordBuffer = scryptSync(password, salt, 64);
  const hashBuffer = Buffer.from(hash, "hex");

  if (passwordBuffer.length !== hashBuffer.length) {
    return false;
  }

  return timingSafeEqual(passwordBuffer, hashBuffer);
}

function cleanRecordText(value, maxLength = 800) {
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

function createTemporaryPassword() {
  return `WPU-${randomBytes(4).toString("hex").toUpperCase()}-${randomBytes(3).toString("hex").toUpperCase()}`;
}

function portalUsernameForApplication(application, existingRecords = []) {
  const base = cleanRecordText(application.applicantName || "citizen", 80)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "") || "citizen";
  const suffix = String(application.discordUserId || application.id || "").slice(-4);
  let username = `${base}${suffix ? `.${suffix}` : ""}`.slice(0, 80);
  const taken = new Set(existingRecords.map((record) => String(record.portalUsername || record.userId || "").toLowerCase()));
  let counter = 2;
  while (taken.has(username.toLowerCase())) {
    username = `${base}.${suffix || "wpu"}${counter}`.slice(0, 80);
    counter += 1;
  }
  return username;
}

function defaultCitizenHandle(record = {}) {
  const handle = cleanRecordText(record.citizenHandle || record.portalUsername || record.userId || record.name || "citizen", 80)
    .toLowerCase()
    .replace(/^@+/, "")
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
  return handle || `citizen-${randomBytes(2).toString("hex")}`;
}

function cleanTransferCode(value = "") {
  return cleanRecordText(value, 32)
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, "")
    .slice(0, 24);
}

function normalizeCitizenForProvisioning(record = {}) {
  const district = cleanRecordText(record.district || "Capitol", 80);
  return {
    id: cleanRecordText(record.id || createId("citizen"), 120),
    name: cleanRecordText(record.name || "Registered Citizen", 160),
    userId: cleanRecordText(record.userId || "", 120),
    portalUsername: cleanRecordText(record.portalUsername || record.userId || "", 120),
    passwordHash: String(record.passwordHash || ""),
    forcePasswordChange: record.forcePasswordChange !== false,
    temporaryPasswordIssuedAt: record.temporaryPasswordIssuedAt || "",
    credentialDeliveryStatus: cleanRecordText(record.credentialDeliveryStatus || "pending", 80),
    credentialDeliveryError: cleanRecordText(record.credentialDeliveryError || "", 300),
    sourceApplicationId: cleanRecordText(record.sourceApplicationId || "", 120),
    discordUsername: cleanRecordText(record.discordUsername || "", 120),
    discordId: cleanRecordText(record.discordId || "", 80),
    citizenHandle: defaultCitizenHandle(record),
    transferCode: cleanTransferCode(record.transferCode || ""),
    district,
    citizenStatus: cleanRecordText(record.citizenStatus || "Active Citizen", 80),
    securityClassification: cleanRecordText(record.securityClassification || "Clear", 80),
    walletId: cleanRecordText(record.walletId || "", 120),
    unionSecurityId: cleanRecordText(record.unionSecurityId || createSecurityId(district), 80),
    verificationCode: cleanRecordText(record.verificationCode || createVerificationCode(), 80),
    issueDate: cleanRecordText(record.issueDate || new Date().toISOString().slice(0, 10), 40),
    expiryDate: cleanRecordText(record.expiryDate || "", 40),
    verificationStatus: cleanRecordText(record.verificationStatus || "Verified", 80),
    internalNotes: cleanRecordText(record.internalNotes || "", 1600),
    warnings: Array.isArray(record.warnings) ? record.warnings : [],
    lostOrStolen: Boolean(record.lostOrStolen),
    createdAt: record.createdAt || new Date().toISOString(),
    updatedAt: record.updatedAt || new Date().toISOString()
  };
}

function normalizeWalletForProvisioning(wallet = {}) {
  const now = new Date().toISOString();
  return {
    id: cleanRecordText(wallet.id || createId("wallet"), 120),
    userId: cleanRecordText(wallet.userId || "", 120),
    discordId: cleanRecordText(wallet.discordId || "", 80),
    displayName: cleanRecordText(wallet.displayName || "Citizen Wallet", 120),
    balance: Math.max(0, Number(wallet.balance || 0)),
    district: cleanRecordText(wallet.district || "", 80),
    title: cleanRecordText(wallet.title || "Citizen", 80),
    salary: Math.max(0, Number(wallet.salary ?? 125)),
    status: cleanRecordText(wallet.status || "active", 80),
    taxStatus: cleanRecordText(wallet.taxStatus || "compliant", 80),
    createdAt: wallet.createdAt || now,
    updatedAt: wallet.updatedAt || now,
    ...wallet
  };
}

async function readContentFile() {
  try {
    const raw = await readFile(config.dataFile, "utf8");
    const parsed = JSON.parse(raw);

    return {
      settings: {
        ...defaultContent.settings,
        ...(parsed.settings || {})
      },
      members: withNormalizedOrder(parsed.members || defaultContent.members),
      alliances: withNormalizedOrder(parsed.alliances || []),
      excommunications: withNormalizedOrder(parsed.excommunications || []),
      enemyNations: withNormalizedOrder(parsed.enemyNations || []),
      panelUsers: parsed.panelUsers || [],
      cryptoLogs: parsed.cryptoLogs || [],
      publicApplications: parsed.publicApplications || [],
      articles: parsed.articles || defaultContent.articles,
      governmentUsers: parsed.governmentUsers || [],
      governmentAuditLog: parsed.governmentAuditLog || [],
      citizenRecords: parsed.citizenRecords || [],
      citizenRequests: parsed.citizenRequests || [],
      citizenAlerts: parsed.citizenAlerts || [],
      citizenActivity: parsed.citizenActivity || [],
      districtProfiles: parsed.districtProfiles || [],
      discordBroadcasts: parsed.discordBroadcasts || [],
      enemyOfStateEntries: parsed.enemyOfStateEntries || [],
      enemyOfStateDiscordEvents: parsed.enemyOfStateDiscordEvents || [],
      supremeCourtCases: parsed.supremeCourtCases || [],
      supremeCourtPetitions: parsed.supremeCourtPetitions || [],
      economy: normalizeEconomyStore(parsed.economy || defaultContent.economy),
      bulletins: withNormalizedOrder(parsed.bulletins || defaultContent.bulletins)
    };
  } catch {
    return structuredClone(defaultContent);
  }
}

async function writeContentFile(content) {
  await mkdir(dirname(config.dataFile), { recursive: true });
  await writeFile(config.dataFile, JSON.stringify(content, null, 2));
}

function addOrderedItem(items, item) {
  return withNormalizedOrder([item, ...items]);
}

function deleteOrderedItem(items, id) {
  return withNormalizedOrder(items.filter((item) => item.id !== id));
}

function moveOrderedItem(items, id, direction) {
  const normalized = withNormalizedOrder(items);
  const index = normalized.findIndex((item) => item.id === id);

  if (index === -1) {
    return normalized;
  }

  const targetIndex =
    direction === "up" ? Math.max(0, index - 1) : Math.min(normalized.length - 1, index + 1);

  if (targetIndex === index) {
    return normalized;
  }

  const next = [...normalized];
  const [item] = next.splice(index, 1);
  next.splice(targetIndex, 0, item);
  return withReindexedOrder(next);
}

function setOrderedItemPosition(items, id, targetIndex) {
  const normalized = withNormalizedOrder(items);
  const index = normalized.findIndex((item) => item.id === id);

  if (index === -1) {
    return normalized;
  }

  const boundedTargetIndex = Math.max(
    0,
    Math.min(normalized.length - 1, Number(targetIndex) || 0)
  );

  if (boundedTargetIndex === index) {
    return normalized;
  }

  const next = [...normalized];
  const [item] = next.splice(index, 1);
  next.splice(boundedTargetIndex, 0, item);
  return withReindexedOrder(next);
}

function reorderOrderedItems(items, orderedIds) {
  const normalized = withNormalizedOrder(items);
  const byId = new Map(normalized.map((item) => [item.id, item]));
  const reordered = [];

  for (const id of orderedIds || []) {
    const item = byId.get(id);

    if (item) {
      reordered.push(item);
      byId.delete(id);
    }
  }

  for (const item of normalized) {
    if (byId.has(item.id)) {
      reordered.push(item);
    }
  }

  return withReindexedOrder(reordered);
}

export async function getContent() {
  return readContentFile();
}

export async function updateGovernmentAccessStore(fields) {
  const content = await readContentFile();

  if (Array.isArray(fields.governmentUsers)) {
    content.governmentUsers = fields.governmentUsers;
  }

  if (Array.isArray(fields.governmentAuditLog)) {
    content.governmentAuditLog = fields.governmentAuditLog;
  }

  if (Array.isArray(fields.publicApplications)) {
    content.publicApplications = fields.publicApplications;
  }

  if (Array.isArray(fields.citizenRecords)) {
    content.citizenRecords = fields.citizenRecords;
  }

  if (Array.isArray(fields.citizenRequests)) {
    content.citizenRequests = fields.citizenRequests;
  }

  if (Array.isArray(fields.citizenAlerts)) {
    content.citizenAlerts = fields.citizenAlerts;
  }

  if (Array.isArray(fields.citizenActivity)) {
    content.citizenActivity = fields.citizenActivity;
  }

  if (Array.isArray(fields.districtProfiles)) {
    content.districtProfiles = fields.districtProfiles;
  }

  await writeContentFile(content);
  return {
    governmentUsers: content.governmentUsers,
    governmentAuditLog: content.governmentAuditLog,
    publicApplications: content.publicApplications || [],
    citizenRecords: content.citizenRecords || [],
    citizenRequests: content.citizenRequests || [],
    citizenAlerts: content.citizenAlerts || [],
    citizenActivity: content.citizenActivity || [],
    districtProfiles: content.districtProfiles || []
  };
}

export async function getEconomyStore() {
  const content = await readContentFile();
  return normalizeEconomyStore(content.economy || defaultContent.economy);
}

export async function updateEconomyStore(fields) {
  const content = await readContentFile();
  content.economy = normalizeEconomyStore({
    ...(content.economy || defaultContent.economy),
    ...(fields || {})
  });
  await writeContentFile(content);
  return content.economy;
}

function cleanBroadcastText(value, maxLength = 4000) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, maxLength);
}

function normalizeBroadcast(entry, index = 0) {
  const now = new Date().toISOString();
  const status = String(entry?.status || "pending").trim().toLowerCase();
  const allowedStatuses = [
    "pending_approval",
    "approval_notified",
    "declined",
    "pending",
    "processing",
    "completed",
    "failed"
  ];

  return {
    id: String(entry?.id || `broadcast-${Date.now().toString(36)}-${index}`),
    status: allowedStatuses.includes(status) ? status : "pending",
    type: cleanBroadcastText(entry?.type || "news", 80),
    title: cleanBroadcastText(entry?.title || "Official WPU Broadcast", 160),
    body: cleanBroadcastText(entry?.body || "", 4000),
    headline: cleanBroadcastText(entry?.headline || entry?.title || "", 220),
    excerpt: cleanBroadcastText(entry?.excerpt || entry?.summary || "", 1000),
    issuer: cleanBroadcastText(entry?.issuer || entry?.source || entry?.requestedRole || "", 120),
    classification: cleanBroadcastText(entry?.classification || "", 120),
    imageUrl: cleanBroadcastText(entry?.imageUrl || entry?.heroImage || "", 500),
    articleUrl: cleanBroadcastText(entry?.articleUrl || entry?.link || "", 500),
    distribution: cleanBroadcastText(entry?.distribution || "none", 80),
    pingOption: ["none", "here", "everyone"].includes(String(entry?.pingOption || "none")) ? String(entry?.pingOption || "none") : "none",
    requestedPingOption: ["none", "here", "everyone"].includes(String(entry?.requestedPingOption || entry?.pingOption || "none")) ? String(entry?.requestedPingOption || entry?.pingOption || "none") : "none",
    pingConfirmed: Boolean(entry?.pingConfirmed),
    pingApplied: Boolean(entry?.pingApplied),
    pingDeniedReason: cleanBroadcastText(entry?.pingDeniedReason || "", 240),
    targetDiscordId: cleanBroadcastText(entry?.targetDiscordId || "", 80),
    linkedType: cleanBroadcastText(entry?.linkedType || "", 80),
    linkedId: cleanBroadcastText(entry?.linkedId || "", 160),
    metadata: entry?.metadata && typeof entry.metadata === "object" ? entry.metadata : {},
    requiresApproval: Boolean(entry?.requiresApproval),
    confirmed: Boolean(entry?.confirmed),
    approvalRequestedAt: entry?.approvalRequestedAt || "",
    approvalNotifiedAt: entry?.approvalNotifiedAt || "",
    approvedAt: entry?.approvedAt || "",
    approvedBy: cleanBroadcastText(entry?.approvedBy || "", 120),
    declinedAt: entry?.declinedAt || "",
    declinedBy: cleanBroadcastText(entry?.declinedBy || "", 120),
    approvalNote: cleanBroadcastText(entry?.approvalNote || "", 1000),
    requestedBy: cleanBroadcastText(entry?.requestedBy || "system", 120),
    requestedRole: cleanBroadcastText(entry?.requestedRole || "", 120),
    createdAt: entry?.createdAt || now,
    updatedAt: entry?.updatedAt || now,
    processedAt: entry?.processedAt || "",
    recipients: Array.isArray(entry?.recipients) ? entry.recipients : [],
    successCount: Number(entry?.successCount || 0),
    failureCount: Number(entry?.failureCount || 0),
    failures: Array.isArray(entry?.failures) ? entry.failures.slice(0, 100) : [],
    error: cleanBroadcastText(entry?.error || "", 1000)
  };
}

export async function createDiscordBroadcast(entry) {
  const content = await readContentFile();
  const requiresApproval = Boolean(entry.requiresApproval);
  const now = new Date().toISOString();
  const broadcast = normalizeBroadcast(
    {
      ...entry,
      id:
        entry.id ||
        `broadcast-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
      status: requiresApproval ? "pending_approval" : "pending",
      requiresApproval,
      approvalRequestedAt: requiresApproval ? now : "",
      createdAt: now,
      updatedAt: now
    },
    0
  );

  content.discordBroadcasts = [broadcast, ...(content.discordBroadcasts || [])].slice(0, 500);
  await writeContentFile(content);
  return broadcast;
}

export async function getDiscordBroadcasts({ status = "" } = {}) {
  const content = await readContentFile();
  const broadcasts = (content.discordBroadcasts || []).map(normalizeBroadcast);
  return status ? broadcasts.filter((item) => item.status === status) : broadcasts;
}

export async function updateDiscordBroadcast(id, fields) {
  const content = await readContentFile();
  let updatedBroadcast = null;

  content.discordBroadcasts = (content.discordBroadcasts || []).map((entry, index) => {
    if (entry.id !== id) {
      return normalizeBroadcast(entry, index);
    }

    updatedBroadcast = normalizeBroadcast(
      {
        ...entry,
        ...fields,
        id: entry.id,
        updatedAt: new Date().toISOString()
      },
      index
    );
    return updatedBroadcast;
  });

  await writeContentFile(content);
  return updatedBroadcast;
}

const enemyClassifications = [
  "Person of Interest",
  "Security Concern",
  "Hostile Actor",
  "Enemy of the State",
  "Pardoned / Cleared"
];
const enemyThreatLevels = ["Low", "Moderate", "High", "Critical"];
const enemyStatuses = ["Under MSS Review", "Active", "Archived", "Pardoned", "Cleared"];
const enemyVisibilityLevels = ["MSS Only", "Government Only", "Public Registry"];

function cleanEnemyText(value, maxLength = 2000) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function cleanEnemyBlock(value, maxLength = 4000) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, maxLength);
}

function normalizeEnemyEntry(entry, index = 0) {
  const now = new Date().toISOString();
  const classification = cleanEnemyText(entry?.classification || "Person of Interest", 80);
  const threatLevel = cleanEnemyText(entry?.threatLevel || "Low", 40);
  const status = cleanEnemyText(entry?.status || "Under MSS Review", 80);
  const visibility = cleanEnemyText(entry?.visibility || "MSS Only", 80);

  return {
    id: cleanEnemyText(entry?.id || `enemy-state-${Date.now().toString(36)}-${index}`, 120),
    name: cleanEnemyText(entry?.name, 180),
    alias: cleanEnemyText(entry?.alias, 180),
    discordId: cleanEnemyText(entry?.discordId, 80),
    discordIdPublic: Boolean(entry?.discordIdPublic),
    classification: enemyClassifications.includes(classification) ? classification : "Person of Interest",
    threatLevel: enemyThreatLevels.includes(threatLevel) ? threatLevel : "Low",
    reasonSummary: cleanEnemyBlock(entry?.reasonSummary || entry?.reason, 1600),
    evidenceNotes: cleanEnemyBlock(entry?.evidenceNotes, 2400),
    status: enemyStatuses.includes(status) ? status : "Under MSS Review",
    visibility: enemyVisibilityLevels.includes(visibility) ? visibility : "MSS Only",
    issuingAuthority: cleanEnemyText(entry?.issuingAuthority || "Ministry of State Security", 160),
    dateListed: cleanEnemyText(entry?.dateListed || now.slice(0, 10), 40),
    relatedCaseUrl: cleanEnemyText(entry?.relatedCaseUrl, 500),
    relatedArticleUrl: cleanEnemyText(entry?.relatedArticleUrl, 500),
    relatedBulletinUrl: cleanEnemyText(entry?.relatedBulletinUrl, 500),
    imageUrl: cleanEnemyText(entry?.imageUrl, 500),
    approvedPublic: Boolean(entry?.approvedPublic),
    archived: Boolean(entry?.archived),
    discordChannelId: cleanEnemyText(entry?.discordChannelId, 80),
    discordMessageId: cleanEnemyText(entry?.discordMessageId, 80),
    lastDiscordSyncedAt: entry?.lastDiscordSyncedAt || "",
    createdBy: cleanEnemyText(entry?.createdBy || "system", 120),
    createdAt: entry?.createdAt || now,
    updatedAt: entry?.updatedAt || now
  };
}

function isPublicEnemyEntry(entry) {
  return (
    entry.visibility === "Public Registry" &&
    ["Under MSS Review", "Active", "Pardoned", "Cleared"].includes(entry.status) &&
    entry.archived !== true
  );
}

function normalizeEnemyEntries(entries) {
  return [...(entries || [])]
    .map(normalizeEnemyEntry)
    .filter((entry) => entry.name)
    .sort((a, b) => new Date(b.dateListed) - new Date(a.dateListed));
}

function createEnemyDiscordEvent(entry, action) {
  return {
    id: `enemy-event-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    entryId: entry.id,
    action,
    status: "pending",
    createdAt: new Date().toISOString(),
    deliveredAt: "",
    error: ""
  };
}

function shouldMirrorEnemyEntry(entry) {
  return entry.visibility === "Public Registry" && entry.approvedPublic && entry.archived !== true;
}

export async function getEnemyOfStateEntries({ publicOnly = false } = {}) {
  const content = await readContentFile();
  const entries = normalizeEnemyEntries(content.enemyOfStateEntries || []);
  return publicOnly ? entries.filter(isPublicEnemyEntry) : entries;
}

export async function createEnemyOfStateEntry(entry) {
  const content = await readContentFile();
  const now = new Date().toISOString();
  const normalized = normalizeEnemyEntry(
    {
      ...entry,
      id:
        entry.id ||
        `enemy-state-${Date.now().toString(36)}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,
      createdAt: now,
      updatedAt: now
    },
    0
  );

  content.enemyOfStateEntries = normalizeEnemyEntries([normalized, ...(content.enemyOfStateEntries || [])]);
  if (shouldMirrorEnemyEntry(normalized)) {
    content.enemyOfStateDiscordEvents = [
      createEnemyDiscordEvent(normalized, "upsert"),
      ...(content.enemyOfStateDiscordEvents || [])
    ].slice(0, 500);
  }
  await writeContentFile(content);
  return content.enemyOfStateEntries;
}

export async function updateEnemyOfStateEntry(id, fields) {
  const content = await readContentFile();
  let updated = null;
  let previous = null;

  content.enemyOfStateEntries = normalizeEnemyEntries(
    (content.enemyOfStateEntries || []).map((entry, index) => {
      if (entry.id !== id) {
        return normalizeEnemyEntry(entry, index);
      }

      previous = normalizeEnemyEntry(entry, index);
      updated = normalizeEnemyEntry(
        {
          ...entry,
          ...fields,
          id: entry.id,
          discordMessageId: fields.discordMessageId ?? entry.discordMessageId,
          discordChannelId: fields.discordChannelId ?? entry.discordChannelId,
          createdAt: entry.createdAt,
          updatedAt: new Date().toISOString()
        },
        index
      );
      return updated;
    })
  );

  if (updated) {
    const becamePrivate = shouldMirrorEnemyEntry(previous || {}) && !shouldMirrorEnemyEntry(updated);
    const action = becamePrivate || updated.status === "Cleared" || updated.status === "Pardoned" ? "archive" : "upsert";
    if (shouldMirrorEnemyEntry(updated) || becamePrivate) {
      content.enemyOfStateDiscordEvents = [
        createEnemyDiscordEvent(updated, action),
        ...(content.enemyOfStateDiscordEvents || [])
      ].slice(0, 500);
    }
  }

  await writeContentFile(content);
  return content.enemyOfStateEntries;
}

export async function archiveEnemyOfStateEntry(id) {
  return updateEnemyOfStateEntry(id, {
    archived: true,
    status: "Archived",
    visibility: "MSS Only",
    approvedPublic: false
  });
}

export async function getPendingEnemyOfStateDiscordEvents() {
  const content = await readContentFile();
  const entries = normalizeEnemyEntries(content.enemyOfStateEntries || []);
  return (content.enemyOfStateDiscordEvents || [])
    .filter((event) => event.status === "pending")
    .map((event) => ({
      ...event,
      entry: entries.find((entry) => entry.id === event.entryId) || null
    }))
    .filter((event) => event.entry);
}

export async function markEnemyOfStateDiscordEvent(eventId, fields) {
  const content = await readContentFile();
  const now = new Date().toISOString();
  const event = (content.enemyOfStateDiscordEvents || []).find((item) => item.id === eventId);
  let updatedEntry = null;

  content.enemyOfStateDiscordEvents = (content.enemyOfStateDiscordEvents || []).map((item) =>
    item.id === eventId
      ? {
          ...item,
          status: fields.status || "delivered",
          deliveredAt: fields.deliveredAt || now,
          error: cleanEnemyText(fields.error || "", 1000)
        }
      : item
  );

  if (event?.entryId && fields.status !== "failed") {
    content.enemyOfStateEntries = normalizeEnemyEntries(
      (content.enemyOfStateEntries || []).map((entry) => {
        if (entry.id !== event.entryId) {
          return entry;
        }

        updatedEntry = normalizeEnemyEntry({
          ...entry,
          discordChannelId: Object.hasOwn(fields, "discordChannelId") ? fields.discordChannelId : entry.discordChannelId || "",
          discordMessageId: Object.hasOwn(fields, "discordMessageId") ? fields.discordMessageId : entry.discordMessageId || "",
          lastDiscordSyncedAt: now
        });
        return updatedEntry;
      })
    );
  }

  await writeContentFile(content);
  return { eventId, entry: updatedEntry };
}

export async function updateSupremeCourtStore(fields) {
  const content = await readContentFile();

  if (Array.isArray(fields.supremeCourtCases)) {
    content.supremeCourtCases = fields.supremeCourtCases;
  }

  if (Array.isArray(fields.supremeCourtPetitions)) {
    content.supremeCourtPetitions = fields.supremeCourtPetitions;
  }

  await writeContentFile(content);
  return {
    supremeCourtCases: content.supremeCourtCases,
    supremeCourtPetitions: content.supremeCourtPetitions || []
  };
}

export function sanitizePanelUser(user) {
  return {
    id: user.id,
    username: user.username,
    role: user.role,
    createdAt: user.createdAt
  };
}

export async function updateSettings(nextSettings) {
  const content = await readContentFile();
  content.settings = {
    ...content.settings,
    ...nextSettings
  };
  await writeContentFile(content);
  return content;
}

export async function createArticle(entry) {
  const content = await readContentFile();
  const now = new Date().toISOString();
  const article = {
    id:
      entry.id ||
      `article-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    title: String(entry.title || "").replace(/\s+/g, " ").trim(),
    subtitle: String(entry.subtitle || "").replace(/\s+/g, " ").trim(),
    body: String(entry.body || "").trim(),
    heroImage: String(entry.heroImage || "").trim(),
    category: String(entry.category || "General").trim(),
    source: String(entry.source || "Wilford Panem Union").trim(),
    publishDate: String(entry.publishDate || now).trim(),
    status: entry.status === "published" ? "published" : "draft",
    featured: Boolean(entry.featured),
    createdAt: now,
    updatedAt: now
  };

  content.articles = [article, ...(content.articles || [])];
  await writeContentFile(content);
  return content.articles;
}

export async function updateArticle(id, fields) {
  const content = await readContentFile();
  const now = new Date().toISOString();

  content.articles = (content.articles || []).map((article) =>
    article.id === id
      ? {
          ...article,
          title: String(fields.title || "").replace(/\s+/g, " ").trim(),
          subtitle: String(fields.subtitle || "").replace(/\s+/g, " ").trim(),
          body: String(fields.body || "").trim(),
          heroImage: String(fields.heroImage || "").trim(),
          category: String(fields.category || "General").trim(),
          source: String(fields.source || "Wilford Panem Union").trim(),
          publishDate: String(fields.publishDate || article.publishDate || now).trim(),
          status: fields.status === "published" ? "published" : "draft",
          featured: Boolean(fields.featured),
          updatedAt: now
        }
      : article
  );

  await writeContentFile(content);
  return content.articles;
}

export async function deleteArticle(id) {
  const content = await readContentFile();
  content.articles = (content.articles || []).filter((article) => article.id !== id);
  await writeContentFile(content);
  return content.articles;
}

export async function createBulletin(entry) {
  const content = await readContentFile();
  const now = new Date().toISOString();
  const bulletin = {
    id: entry.id || `bulletin-${Date.now().toString(36)}`,
    headline: String(entry.headline || "").replace(/\s+/g, " ").trim(),
    category: String(entry.category || "General").trim(),
    issuingAuthority: String(entry.issuingAuthority || entry.category || "Government").trim(),
    bulletinType: String(entry.bulletinType || "Public Bulletin").trim(),
    priority: String(entry.priority || "standard").trim().toLowerCase(),
    active: Boolean(entry.active),
    linkedArticleId: String(entry.linkedArticleId || "").trim(),
    order: Number(entry.order ?? content.bulletins.length),
    expiresAt: String(entry.expiresAt || "").trim(),
    createdAt: now,
    updatedAt: now
  };

  content.bulletins = withNormalizedOrder([...(content.bulletins || []), bulletin]);
  await writeContentFile(content);
  return content.bulletins;
}

export async function updateBulletin(id, fields) {
  const content = await readContentFile();
  const now = new Date().toISOString();
  content.bulletins = withNormalizedOrder(
    (content.bulletins || []).map((bulletin) =>
      bulletin.id === id
        ? {
            ...bulletin,
            headline: String(fields.headline || bulletin.headline || "").replace(/\s+/g, " ").trim(),
            category: String(fields.category || bulletin.category || "General").trim(),
            issuingAuthority: String(fields.issuingAuthority || fields.category || bulletin.issuingAuthority || "Government").trim(),
            bulletinType: String(fields.bulletinType || bulletin.bulletinType || "Public Bulletin").trim(),
            priority: String(fields.priority || bulletin.priority || "standard").trim().toLowerCase(),
            active: Boolean(fields.active),
            linkedArticleId: String(fields.linkedArticleId || "").trim(),
            expiresAt: String(fields.expiresAt || "").trim(),
            updatedAt: now
          }
        : bulletin
    )
  );
  await writeContentFile(content);
  return content.bulletins;
}

export async function deleteBulletin(id) {
  const content = await readContentFile();
  content.bulletins = withNormalizedOrder((content.bulletins || []).filter((item) => item.id !== id));
  await writeContentFile(content);
  return content.bulletins;
}

export async function moveBulletin(id, direction) {
  const content = await readContentFile();
  content.bulletins = moveOrderedItem(content.bulletins || [], id, direction);
  await writeContentFile(content);
  return content.bulletins;
}

export async function createMember(member) {
  const content = await readContentFile();
  content.members = addOrderedItem(content.members, member);
  await writeContentFile(content);
  return content.members;
}

export async function deleteMember(id) {
  const content = await readContentFile();
  content.members = deleteOrderedItem(content.members, id);
  await writeContentFile(content);
  return content.members;
}

export async function moveMember(id, direction) {
  const content = await readContentFile();
  content.members = moveOrderedItem(content.members, id, direction);
  await writeContentFile(content);
  return content.members;
}

export async function updateMemberPosition(id, targetIndex) {
  const content = await readContentFile();
  content.members = setOrderedItemPosition(content.members, id, targetIndex);
  await writeContentFile(content);
  return content.members;
}

export async function reorderMembers(orderedIds) {
  const content = await readContentFile();
  content.members = reorderOrderedItems(content.members, orderedIds);
  await writeContentFile(content);
  return content.members;
}

export async function replaceMembers(nextMembers) {
  const content = await readContentFile();
  content.members = withReindexedOrder(nextMembers || []);
  await writeContentFile(content);
  return content.members;
}

export async function createAlliance(entry) {
  const content = await readContentFile();
  content.alliances = addOrderedItem(content.alliances, entry);
  await writeContentFile(content);
  return content.alliances;
}

export async function deleteAlliance(id) {
  const content = await readContentFile();
  content.alliances = deleteOrderedItem(content.alliances, id);
  await writeContentFile(content);
  return content.alliances;
}

export async function moveAlliance(id, direction) {
  const content = await readContentFile();
  content.alliances = moveOrderedItem(content.alliances, id, direction);
  await writeContentFile(content);
  return content.alliances;
}

export async function updateAlliancePosition(id, targetIndex) {
  const content = await readContentFile();
  content.alliances = setOrderedItemPosition(
    content.alliances,
    id,
    targetIndex
  );
  await writeContentFile(content);
  return content.alliances;
}

export async function reorderAlliances(orderedIds) {
  const content = await readContentFile();
  content.alliances = reorderOrderedItems(content.alliances, orderedIds);
  await writeContentFile(content);
  return content.alliances;
}

export async function replaceAlliances(nextAlliances) {
  const content = await readContentFile();
  content.alliances = withReindexedOrder(nextAlliances || []);
  await writeContentFile(content);
  return content.alliances;
}

export async function createExcommunication(entry) {
  const content = await readContentFile();
  content.excommunications = addOrderedItem(content.excommunications, entry);
  await writeContentFile(content);
  return content.excommunications;
}

export async function deleteExcommunication(id) {
  const content = await readContentFile();
  content.excommunications = deleteOrderedItem(content.excommunications, id);
  await writeContentFile(content);
  return content.excommunications;
}

export async function moveExcommunication(id, direction) {
  const content = await readContentFile();
  content.excommunications = moveOrderedItem(
    content.excommunications,
    id,
    direction
  );
  await writeContentFile(content);
  return content.excommunications;
}

export async function reorderExcommunications(orderedIds) {
  const content = await readContentFile();
  content.excommunications = reorderOrderedItems(
    content.excommunications,
    orderedIds
  );
  await writeContentFile(content);
  return content.excommunications;
}

export async function createEnemyNation(entry) {
  const content = await readContentFile();
  content.enemyNations = addOrderedItem(content.enemyNations, entry);
  await writeContentFile(content);
  return content.enemyNations;
}

export async function deleteEnemyNation(id) {
  const content = await readContentFile();
  content.enemyNations = deleteOrderedItem(content.enemyNations, id);
  await writeContentFile(content);
  return content.enemyNations;
}

export async function moveEnemyNation(id, direction) {
  const content = await readContentFile();
  content.enemyNations = moveOrderedItem(content.enemyNations, id, direction);
  await writeContentFile(content);
  return content.enemyNations;
}

export async function reorderEnemyNations(orderedIds) {
  const content = await readContentFile();
  content.enemyNations = reorderOrderedItems(content.enemyNations, orderedIds);
  await writeContentFile(content);
  return content.enemyNations;
}

export async function getPanelUsers() {
  const content = await readContentFile();
  return content.panelUsers.map(sanitizePanelUser);
}

export async function appendCryptoLog(entry) {
  const content = await readContentFile();
  const nextEntry = {
    id:
      entry.id ||
      `crypto-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    action: String(entry.action || "").trim().toLowerCase(),
    createdAt: entry.createdAt || new Date().toISOString(),
    source: entry.source || "website",
    messagePreview: String(entry.messagePreview || "").trim(),
    encryptedPreview: String(entry.encryptedPreview || "").trim()
  };

  content.cryptoLogs = [nextEntry, ...(content.cryptoLogs || [])].slice(0, 250);
  await writeContentFile(content);
  return content.cryptoLogs;
}

export async function createPublicApplication(entry) {
  const content = await readContentFile();
  const now = new Date().toISOString();
  const application = {
    id:
      entry.id ||
      `application-${Date.now().toString(36)}-${Math.random()
        .toString(36)
        .slice(2, 8)}`,
    source: entry.source || "website",
    status: entry.status || "pending",
    submittedAt: entry.submittedAt || now,
    updatedAt: entry.updatedAt || now,
    applicantName: String(entry.applicantName || "").trim(),
    age: String(entry.age || "").trim(),
    timezone: String(entry.timezone || "").trim(),
    motivation: String(entry.motivation || "").trim(),
    experience: String(entry.experience || "").trim(),
    discordHandle: String(entry.discordHandle || "").trim(),
    discordUserId: String(entry.discordUserId || "").trim(),
    discordChannelId: String(entry.discordChannelId || entry.reviewChannelId || "").trim(),
    discordThreadId: String(entry.discordThreadId || entry.reviewThreadId || "").trim(),
    discordMessageId: String(entry.discordMessageId || entry.reviewMessageId || "").trim(),
    email: String(entry.email || "").trim(),
    reviewThreadId: String(entry.reviewThreadId || "").trim(),
    reviewMessageId: String(entry.reviewMessageId || "").trim(),
    adminPingSent: Boolean(entry.adminPingSent),
    adminPingMessageId: String(entry.adminPingMessageId || "").trim(),
    reviewGuildId: String(entry.reviewGuildId || "").trim(),
    appealThreadId: String(entry.appealThreadId || "").trim(),
    appealReason: String(entry.appealReason || "").trim(),
    appealStatus: String(entry.appealStatus || "").trim(),
    appealedAt: entry.appealedAt || "",
    archived: Boolean(entry.archived),
    archivedAt: entry.archivedAt || "",
    needsAttention: Boolean(entry.needsAttention),
    publicReplies: Array.isArray(entry.publicReplies) ? entry.publicReplies : [],
    applicationAuditLog: Array.isArray(entry.applicationAuditLog) ? entry.applicationAuditLog : [],
    pendingDiscordEvents: Array.isArray(entry.pendingDiscordEvents) ? entry.pendingDiscordEvents : [],
    decisionNote: String(entry.decisionNote || "").trim(),
    internalNotes: String(entry.internalNotes || "").trim()
  };

  content.publicApplications = [application, ...(content.publicApplications || [])].slice(0, 500);
  await writeContentFile(content);
  return application;
}

export async function getPendingPublicApplications() {
  const content = await readContentFile();
  return (content.publicApplications || []).filter(
    (application) =>
      application.status === "pending" &&
      !String(application.reviewThreadId || "").trim()
  );
}

export async function getPublicApplications() {
  const content = await readContentFile();
  return content.publicApplications || [];
}

function createApplicationEvent(type, message, fields = {}) {
  return {
    id: `app-event-${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .slice(2, 8)}`,
    type,
    message: String(message || "").trim(),
    createdAt: new Date().toISOString(),
    deliveredAt: "",
    deliveryStatus: "pending",
    deliveryError: "",
    ...fields
  };
}

function normalizeApplicationForUpdate(application) {
  return {
    ...application,
    discordUserId: String(application.discordUserId || "").replace(/\s+/g, "").trim(),
    discordChannelId: String(application.discordChannelId || application.reviewChannelId || "").trim(),
    discordThreadId: String(application.discordThreadId || application.reviewThreadId || "").trim(),
    discordMessageId: String(application.discordMessageId || application.reviewMessageId || "").trim(),
    appealThreadId: String(application.appealThreadId || "").trim(),
    appealReason: String(application.appealReason || "").trim(),
    appealStatus: String(application.appealStatus || "").trim(),
    appealedAt: application.appealedAt || "",
    archived: Boolean(application.archived),
    archivedAt: application.archivedAt || "",
    needsAttention: Boolean(application.needsAttention),
    publicReplies: Array.isArray(application.publicReplies) ? application.publicReplies : [],
    applicationAuditLog: Array.isArray(application.applicationAuditLog) ? application.applicationAuditLog : [],
    pendingDiscordEvents: Array.isArray(application.pendingDiscordEvents)
      ? application.pendingDiscordEvents
      : []
  };
}

export async function updatePublicApplication(id, nextFields) {
  const content = await readContentFile();
  let updatedApplication = null;

  content.publicApplications = (content.publicApplications || []).map((application) => {
    if (application.id !== id) {
      return application;
    }

    const normalized = normalizeApplicationForUpdate(application);
    const now = new Date().toISOString();
    const previousStatus = normalized.status || "pending";
    const requestedStatus = nextFields.status || previousStatus;
    const events = [];
    const auditEntries = [];

    if (requestedStatus !== previousStatus) {
      const statusMessages = {
        approved: "Ministry of Credit and Records: Your citizenship application has been approved.",
        rejected: "Ministry of Credit and Records: Your citizenship application has been rejected.",
        under_review: "Ministry of Credit and Records: Your application status has changed to Under Review.",
        appealed: "Ministry of Credit and Records: Your appeal has been received and forwarded for review.",
        archived: "Ministry of Credit and Records: Your application case has been archived.",
        pending: "Ministry of Credit and Records: Your application status has changed to Pending."
      };
      events.push(
        createApplicationEvent(
          "status_changed",
          statusMessages[requestedStatus] ||
            `Ministry of Credit and Records: Your application status has changed to ${requestedStatus.replace(/_/g, " ")}.`,
          {
            oldStatus: previousStatus,
            newStatus: requestedStatus
          }
        )
      );
      auditEntries.push({
        id: `app-audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        at: now,
        actor: String(nextFields.actor || "system").trim(),
        action: "status changed",
        detail: `${previousStatus} -> ${requestedStatus}`,
        status: "success"
      });
    }

    if (String(nextFields.publicResponse || "").trim()) {
      const publicReply = {
        id: `reply-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        at: now,
        actor: String(nextFields.actor || "system").trim(),
        message: String(nextFields.publicResponse || "").trim(),
        deliveryStatus: "pending",
        deliveryError: ""
      };
      nextFields.publicReplies = [publicReply, ...(normalized.publicReplies || [])].slice(0, 100);
      events.push(
        createApplicationEvent("public_reply", `Ministry of Credit and Records: ${publicReply.message}`, {
          replyId: publicReply.id
        })
      );
      auditEntries.push({
        id: `app-audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        at: now,
        actor: publicReply.actor,
        action: "public reply added",
        detail: publicReply.message.slice(0, 200),
        status: "success"
      });
    }

    if (nextFields.requestInfo) {
      events.push(
        createApplicationEvent(
          "request_info",
          "Ministry of Credit and Records: Additional information is required."
        )
      );
      nextFields.needsAttention = true;
    }

    if (nextFields.appealReason) {
      events.push(
        createApplicationEvent(
          "appealed",
          "Ministry of Credit and Records: Your appeal has been received and forwarded for review."
        )
      );
      auditEntries.push({
        id: `app-audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        at: now,
        actor: String(nextFields.actor || "applicant").trim(),
        action: "appeal submitted",
        detail: String(nextFields.appealReason).slice(0, 200),
        status: "success"
      });
    }

    if (nextFields.suppressDiscordEvents) {
      events.length = 0;
    }

    updatedApplication = {
      ...normalized,
      ...nextFields,
      updatedAt: now,
      pendingDiscordEvents: [
        ...(normalized.pendingDiscordEvents || []),
        ...events,
        ...(Array.isArray(nextFields.pendingDiscordEvents) ? nextFields.pendingDiscordEvents : [])
      ].slice(-100),
      applicationAuditLog: [
        ...auditEntries,
        ...(normalized.applicationAuditLog || [])
      ].slice(0, 200)
    };
    return updatedApplication;
  });

  await writeContentFile(content);
  return updatedApplication;
}

export async function getPendingApplicationDiscordEvents() {
  const content = await readContentFile();
  const applications = (content.publicApplications || [])
    .map(normalizeApplicationForUpdate)
    .map((application) => ({
      ...application,
      pendingDiscordEvents: (application.pendingDiscordEvents || []).filter(
        (event) => event.deliveryStatus === "pending"
      )
    }))
    .filter((application) => application.pendingDiscordEvents.length);

  return applications;
}

export async function markApplicationDiscordEvent(applicationId, eventId, fields) {
  const content = await readContentFile();
  let updatedApplication = null;

  content.publicApplications = (content.publicApplications || []).map((application) => {
    if (application.id !== applicationId) {
      return application;
    }

    const normalized = normalizeApplicationForUpdate(application);
    const eventForReply = (normalized.pendingDiscordEvents || []).find((event) => event.id === eventId);
    updatedApplication = {
      ...normalized,
      pendingDiscordEvents: (normalized.pendingDiscordEvents || []).map((event) =>
        event.id === eventId
          ? {
              ...event,
              deliveryStatus: fields.deliveryStatus || "delivered",
              deliveryError: String(fields.deliveryError || "").trim(),
              deliveredAt: fields.deliveredAt || new Date().toISOString()
            }
          : event
      ),
      publicReplies: (normalized.publicReplies || []).map((reply) =>
        eventForReply?.replyId && eventForReply.replyId === reply.id
          ? {
              ...reply,
              deliveryStatus: fields.deliveryStatus || "delivered",
              deliveryError: String(fields.deliveryError || "").trim()
            }
          : reply
      ),
      applicationAuditLog: [
        {
          id: `app-audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
          at: new Date().toISOString(),
          actor: "discord-bot",
          action: "discord update sent",
          detail: `${eventId}: ${fields.deliveryStatus || "delivered"}`,
          status: fields.deliveryStatus === "failed" ? "failed" : "success"
        },
        ...(normalized.applicationAuditLog || [])
      ].slice(0, 200),
      updatedAt: new Date().toISOString()
    };
    return updatedApplication;
  });

  await writeContentFile(content);
  return updatedApplication;
}

export async function approveCitizenApplication(applicationId, approvedBy = "system", options = {}) {
  const content = await readContentFile();
  const now = new Date().toISOString();
  const applicationIndex = (content.publicApplications || []).findIndex((application) => application.id === applicationId);

  if (applicationIndex === -1) {
    return null;
  }

  const application = normalizeApplicationForUpdate(content.publicApplications[applicationIndex]);
  const discordUserId = String(application.discordUserId || application.applicantId || "").replace(/\s+/g, "").trim();
  const district = cleanRecordText(application.district || application.requestedDistrict || application.affiliation || "Capitol", 80);
  const existingRecords = Array.isArray(content.citizenRecords) ? content.citizenRecords : [];
  const existingRecordIndex = existingRecords.findIndex((record) =>
    (discordUserId && String(record.discordId || "") === discordUserId) ||
    String(record.sourceApplicationId || "") === application.id
  );
  const temporaryPassword = createTemporaryPassword();
  const existingRecord = existingRecordIndex >= 0 ? existingRecords[existingRecordIndex] : null;
  const portalUsername = existingRecord?.portalUsername || portalUsernameForApplication(application, existingRecords);
  const citizenRecord = normalizeCitizenForProvisioning({
    ...(existingRecord || {}),
    name: application.applicantName || existingRecord?.name || "Registered Citizen",
    userId: existingRecord?.userId || portalUsername,
    portalUsername,
    passwordHash: hashPassword(temporaryPassword),
    forcePasswordChange: true,
    temporaryPasswordIssuedAt: now,
    credentialDeliveryStatus: "pending",
    credentialDeliveryError: "",
    discordUsername: application.discordHandle || existingRecord?.discordUsername || "",
    discordId: discordUserId || existingRecord?.discordId || "",
    district: existingRecord?.district || district,
    citizenStatus: "Active Citizen",
    securityClassification: existingRecord?.securityClassification || "Clear",
    verificationStatus: "Verified",
    sourceApplicationId: application.id,
    updatedAt: now
  });

  if (existingRecordIndex >= 0) {
    content.citizenRecords[existingRecordIndex] = citizenRecord;
  } else {
    content.citizenRecords = [citizenRecord, ...existingRecords].slice(0, 500);
  }

  content.economy = normalizeEconomyStore(content.economy || defaultContent.economy);
  const walletIndex = (content.economy.wallets || []).findIndex((wallet) =>
    (citizenRecord.walletId && wallet.id === citizenRecord.walletId) ||
    (discordUserId && String(wallet.discordId || "") === discordUserId) ||
    String(wallet.userId || "") === citizenRecord.userId
  );
  const openingBalance = Math.max(0, Number(options.openingBalance ?? 500));
  const wallet = normalizeWalletForProvisioning({
    ...(walletIndex >= 0 ? content.economy.wallets[walletIndex] : {}),
    id: walletIndex >= 0 ? content.economy.wallets[walletIndex].id : createId("wallet"),
    userId: citizenRecord.userId || citizenRecord.id,
    discordId: citizenRecord.discordId,
    displayName: citizenRecord.name,
    balance: walletIndex >= 0 ? content.economy.wallets[walletIndex].balance : openingBalance,
    district: citizenRecord.district,
    title: "Citizen",
    salary: options.salary ?? 125,
    status: "active",
    taxStatus: "compliant",
    updatedAt: now
  });

  if (walletIndex >= 0) {
    content.economy.wallets[walletIndex] = wallet;
  } else {
    content.economy.wallets = [wallet, ...(content.economy.wallets || [])].slice(0, 1000);
    content.economy.transactions = [
      {
        id: createId("txn"),
        fromWalletId: "treasury",
        toWalletId: wallet.id,
        amount: wallet.balance,
        taxAmount: 0,
        type: "wallet_created",
        reason: "Citizen application approved; wallet created by Ministry of Credit & Records",
        createdBy: approvedBy,
        createdAt: now
      },
      ...(content.economy.transactions || [])
    ].slice(0, 1000);
  }

  const linkedCitizenRecord = { ...citizenRecord, walletId: wallet.id, updatedAt: now };
  const linkedIndex = content.citizenRecords.findIndex((record) => record.id === linkedCitizenRecord.id);
  if (linkedIndex >= 0) {
    content.citizenRecords[linkedIndex] = linkedCitizenRecord;
  }

  const previousStatus = application.status || "pending";
  const shouldQueueEvents = !options.suppressDiscordEvents;
  const statusEvent = previousStatus === "approved" || !shouldQueueEvents
    ? []
    : [
        createApplicationEvent(
          "status_changed",
          "Ministry of Credit and Records: Your citizenship application has been approved.",
          { oldStatus: previousStatus, newStatus: "approved" }
        )
      ];
  const credentialEvents = shouldQueueEvents
    ? [
        createApplicationEvent(
          "citizen_login_credentials",
          "Citizen Portal credentials are ready for secure delivery.",
          { citizenAccountId: linkedCitizenRecord.id, walletId: wallet.id }
        )
      ]
    : [];

  const auditEntries = [
    {
      id: createId("app-audit"),
      at: now,
      actor: approvedBy,
      action: "citizen application approved",
      detail: `method=${options.approvalMethod || "Website"} citizen=${linkedCitizenRecord.id} wallet=${wallet.id}`,
      status: "success"
    }
  ];

  content.publicApplications[applicationIndex] = {
    ...application,
    status: "approved",
    decisionNote: cleanRecordText(options.decisionNote || application.decisionNote || "", 1000),
    approvedAt: application.approvedAt || now,
    approvedBy,
    updatedAt: now,
    archived: false,
    needsAttention: false,
    approvalProvisioning: {
      citizenAccountId: linkedCitizenRecord.id,
      walletId: wallet.id,
      unionSecurityId: linkedCitizenRecord.unionSecurityId,
      portalUsername: linkedCitizenRecord.portalUsername,
      approvalMethod: options.approvalMethod || "Website",
      discordRoleStatus: cleanRecordText(options.discordRoleStatus || "pending", 80),
      credentialDeliveryStatus: "pending",
      credentialDeliveryError: "",
      provisionedAt: now
    },
    pendingDiscordEvents: [
      ...(application.pendingDiscordEvents || []),
      ...statusEvent,
      ...credentialEvents
    ].slice(-100),
    applicationAuditLog: [
      ...auditEntries,
      ...(application.applicationAuditLog || [])
    ].slice(0, 200)
  };

  await writeContentFile(content);

  return {
    application: content.publicApplications[applicationIndex],
    citizenRecord: linkedCitizenRecord,
    wallet,
    credentials: {
      portalUrl: cleanRecordText(options.portalUrl || "https://wilfordindustries.org/citizen-portal", 300),
      username: linkedCitizenRecord.portalUsername,
      temporaryPassword,
      unionSecurityId: linkedCitizenRecord.unionSecurityId,
      forcePasswordChange: true
    }
  };
}

export async function regenerateCitizenLoginCredentials(applicationId, actor = "system", options = {}) {
  const content = await readContentFile();
  const now = new Date().toISOString();
  const applicationIndex = (content.publicApplications || []).findIndex((application) => application.id === applicationId);
  if (applicationIndex === -1) return null;

  const application = normalizeApplicationForUpdate(content.publicApplications[applicationIndex]);
  const provisioning = application.approvalProvisioning || {};
  const discordUserId = String(application.discordUserId || application.applicantId || "").replace(/\s+/g, "").trim();
  const citizenIndex = (content.citizenRecords || []).findIndex((record) =>
    record.id === provisioning.citizenAccountId ||
    (discordUserId && String(record.discordId || "") === discordUserId) ||
    String(record.sourceApplicationId || "") === application.id
  );
  if (citizenIndex === -1) return null;

  const temporaryPassword = createTemporaryPassword();
  const citizenRecord = normalizeCitizenForProvisioning({
    ...content.citizenRecords[citizenIndex],
    passwordHash: hashPassword(temporaryPassword),
    forcePasswordChange: true,
    temporaryPasswordIssuedAt: now,
    credentialDeliveryStatus: "pending",
    credentialDeliveryError: "",
    updatedAt: now
  });
  content.citizenRecords[citizenIndex] = citizenRecord;
  content.publicApplications[applicationIndex] = {
    ...application,
    approvalProvisioning: {
      ...provisioning,
      citizenAccountId: citizenRecord.id,
      portalUsername: citizenRecord.portalUsername,
      unionSecurityId: citizenRecord.unionSecurityId,
      credentialDeliveryStatus: "pending",
      credentialDeliveryError: "",
      resentAt: now
    },
    pendingDiscordEvents: [
      ...(application.pendingDiscordEvents || []),
      ...(options.queueEvent === false
        ? []
        : [
            createApplicationEvent(
              "citizen_login_credentials",
              "Citizen Portal credentials are ready for secure delivery.",
              { citizenAccountId: citizenRecord.id, walletId: citizenRecord.walletId || provisioning.walletId || "" }
            )
          ])
    ].slice(-100),
    applicationAuditLog: [
      {
        id: createId("app-audit"),
        at: now,
        actor,
        action: "citizen login regenerated",
        detail: `citizen=${citizenRecord.id}`,
        status: "success"
      },
      ...(application.applicationAuditLog || [])
    ].slice(0, 200),
    updatedAt: now
  };

  await writeContentFile(content);
  return {
    application: content.publicApplications[applicationIndex],
    citizenRecord,
    credentials: {
      portalUrl: "https://wilfordindustries.org/citizen-portal",
      username: citizenRecord.portalUsername,
      temporaryPassword,
      unionSecurityId: citizenRecord.unionSecurityId,
      forcePasswordChange: true
    }
  };
}

export async function markCitizenCredentialDelivery(applicationId, fields = {}) {
  const content = await readContentFile();
  const now = new Date().toISOString();
  let updatedApplication = null;

  content.publicApplications = (content.publicApplications || []).map((application) => {
    if (application.id !== applicationId) return application;
    const normalized = normalizeApplicationForUpdate(application);
    const hasCredentialStatus = Boolean(cleanRecordText(fields.status || "", 80));
    const status = cleanRecordText(fields.status || normalized.approvalProvisioning?.credentialDeliveryStatus || "pending", 80);
    const error = cleanRecordText(fields.error || "", 300);
    const provisioning = {
      ...(normalized.approvalProvisioning || {}),
      discordRoleStatus: cleanRecordText(fields.discordRoleStatus || normalized.approvalProvisioning?.discordRoleStatus || "pending", 80),
      credentialDeliveryStatus: status,
      credentialDeliveryError: error,
      credentialDeliveredAt: status === "delivered" ? now : normalized.approvalProvisioning?.credentialDeliveredAt || "",
      credentialDeliveryAttemptedAt: now
    };
    const citizenId = provisioning.citizenAccountId;
    content.citizenRecords = (content.citizenRecords || []).map((record) =>
      record.id === citizenId
        ? {
            ...record,
            credentialDeliveryStatus: status,
            credentialDeliveryError: error,
            updatedAt: now
          }
        : record
    );
    updatedApplication = {
      ...normalized,
      approvalProvisioning: provisioning,
      applicationAuditLog: [
        {
          id: createId("app-audit"),
          at: now,
          actor: cleanRecordText(fields.actor || "discord-bot", 120),
          action: hasCredentialStatus ? "citizen login delivery" : "discord role assignment",
          detail: hasCredentialStatus
            ? status === "delivered" ? "Secure login DM delivered." : error || "Secure login DM failed."
            : `Citizen role status: ${provisioning.discordRoleStatus}`,
          status: hasCredentialStatus ? status === "delivered" ? "success" : "failed" : provisioning.discordRoleStatus === "granted" ? "success" : "failed"
        },
        ...(normalized.applicationAuditLog || [])
      ].slice(0, 200),
      updatedAt: now
    };
    return updatedApplication;
  });

  await writeContentFile(content);
  return updatedApplication;
}

export async function createPanelUser(user) {
  const content = await readContentFile();
  const nextUser = {
    id: user.id,
    username: user.username,
    role: user.role,
    passwordHash: hashPassword(user.password),
    createdAt: user.createdAt
  };

  content.panelUsers.unshift(nextUser);
  await writeContentFile(content);
  return content.panelUsers.map(sanitizePanelUser);
}

export async function deletePanelUser(id) {
  const content = await readContentFile();
  content.panelUsers = content.panelUsers.filter((user) => user.id !== id);
  await writeContentFile(content);
  return content.panelUsers.map(sanitizePanelUser);
}

export async function authenticatePanelUser(username, password) {
  if (
    username === config.ownerUsername &&
    config.ownerPassword &&
    password === config.ownerPassword
  ) {
    return {
      username,
      role: "owner"
    };
  }

  const content = await readContentFile();
  const user = content.panelUsers.find(
    (entry) => entry.username.toLowerCase() === String(username).toLowerCase()
  );

  if (!user) {
    return null;
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return null;
  }

  return {
    username: user.username,
    role: user.role
  };
}
