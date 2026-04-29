import cors from "cors";
import express from "express";
import { config } from "./config.js";
import {
  appendCryptoLog,
  approveCitizenApplication,
  authenticatePanelUser,
  createArticle,
  createBulletin,
  createDiscordBroadcast,
  createEnemyOfStateEntry,
  createAlliance,
  createEnemyNation,
  createExcommunication,
  createMember,
  createPanelUser,
  createPublicApplication,
  deleteAlliance,
  deleteArticle,
  deleteBulletin,
  deleteEnemyNation,
  archiveEnemyOfStateEntry,
  deleteExcommunication,
  deleteMember,
  deletePanelUser,
  getContent,
  getDiscordBroadcasts,
  getEconomyStore,
  getEconomyDebugSnapshot,
  getEnemyOfStateEntries,
  getPendingEnemyOfStateDiscordEvents,
  getPendingApplicationDiscordEvents,
  getPendingPublicApplications,
  getPublicApplications,
  getPanelUsers,
  moveAlliance,
  moveBulletin,
  moveEnemyNation,
  moveExcommunication,
  moveMember,
  markApplicationDiscordEvent,
  markCitizenCredentialDelivery,
  markEnemyOfStateDiscordEvent,
  reorderAlliances,
  reorderEnemyNations,
  reorderExcommunications,
  reorderMembers,
  replaceAlliances,
  replaceMembers,
  regenerateCitizenLoginCredentials,
  updatePublicApplication,
  updateAlliancePosition,
  updateArticle,
  updateBulletin,
  updateDiscordBroadcast,
  updateEconomyStore,
  updateEnemyOfStateEntry,
  updateGovernmentAccessStore,
  updateMemberPosition,
  updateSupremeCourtStore,
  updateSettings
} from "./content-store.js";
import {
  deployDiscordBot,
  deployPanel,
  getDeployJob,
  startDeployJob
} from "./deploy.js";
import { getCommits } from "./github.js";

const app = express();

app.use(cors());
app.use(express.json({ limit: "20mb" }));

function requireAdmin(req, res, next) {
  if (!config.adminApiKey) {
    return res.status(500).json({
      error: "ADMIN_API_KEY is not configured on the API."
    });
  }

  if (req.headers["x-admin-key"] !== config.adminApiKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  next();
}

function requireOwner(req, res, next) {
  if (!config.adminApiKey) {
    return res.status(500).json({
      error: "ADMIN_API_KEY is not configured on the API."
    });
  }

  if (req.headers["x-admin-key"] !== config.adminApiKey) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  if (req.headers["x-admin-role"] !== "owner") {
    return res.status(403).json({ error: "Owner access required" });
  }

  next();
}

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}`;
}

function sendApiError(res, label, error) {
  console.error(`[${label}]`, error);
  return res.status(500).json({
    ok: false,
    error: label,
    message: error instanceof Error ? error.message : String(error)
  });
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "api" });
});

app.get("/api/content", async (_req, res) => {
  const content = await getContent();
  const {
    panelUsers,
    governmentUsers,
    governmentAuditLog,
    citizenRecords,
    citizenRequests,
    citizenActivity,
    discordBroadcasts,
    publicApplications,
    supremeCourtPetitions,
    ...publicContent
  } = content;

  if (Array.isArray(publicContent.supremeCourtCases)) {
    publicContent.supremeCourtCases = publicContent.supremeCourtCases.map(
      ({ accessKeys, statements, ...courtCase }) => ({
        ...courtCase,
        statementCount: Array.isArray(statements) ? statements.length : 0
      })
    );
  }

  if (Array.isArray(publicContent.articles)) {
    publicContent.articles = publicContent.articles.filter(
      (article) => article.status === "published"
    );
  }

  if (Array.isArray(publicContent.enemyOfStateEntries)) {
    publicContent.enemyOfStateEntries = publicContent.enemyOfStateEntries
      .filter(
        (entry) =>
          entry.visibility === "Public Registry" &&
          ["Under MSS Review", "Active", "Pardoned", "Cleared"].includes(entry.status) &&
          entry.archived !== true
      )
      .map(
        ({
          evidenceNotes,
          createdBy,
          discordChannelId,
          discordMessageId,
          lastDiscordSyncedAt,
          ...entry
        }) => entry
      );
  }

  delete publicContent.enemyOfStateDiscordEvents;

  res.json(publicContent);
});

app.get("/api/economy", async (_req, res) => {
  try {
    const economy = await getEconomyStore();
    res.json({
      wallets: economy.wallets.map(({ transactionHistory, ...wallet }) => wallet),
      marketItems: economy.marketItems,
      listings: economy.listings.filter((listing) => listing.status === "active"),
      taxRates: economy.taxRates,
      districts: economy.districts,
      events: economy.events,
      inventoryItems: economy.inventoryItems,
      gatheringActions: economy.gatheringActions,
      craftingRecipes: economy.craftingRecipes,
      craftingQualityTiers: economy.craftingQualityTiers,
      blackMarketGoods: economy.blackMarketGoods,
      inventoryChallenges: economy.inventoryChallenges,
      stockCompanies: economy.stockCompanies,
      stockEvents: economy.stockEvents,
      stockSettings: economy.stockSettings,
      lootboxAllocationDate: economy.lootboxAllocationDate,
      globalLootboxesOpenedToday: economy.globalLootboxesOpenedToday,
      perUserLootboxesOpenedToday: economy.perUserLootboxesOpenedToday,
      gamblingJackpot: economy.gamblingJackpot
    });
  } catch (error) {
    sendApiError(res, "economy-public-read", error);
  }
});

app.get("/api/economy-debug", async (_req, res) => {
  try {
    res.json(await getEconomyDebugSnapshot());
  } catch (error) {
    sendApiError(res, "economy-debug", error);
  }
});

app.get("/api/settings", async (_req, res) => {
  const content = await getContent();
  res.json({ settings: content.settings });
});

app.get("/api/members", async (_req, res) => {
  const content = await getContent();
  res.json({ members: content.members });
});

app.get("/api/alliances", async (_req, res) => {
  const content = await getContent();
  res.json({ alliances: content.alliances });
});

app.get("/api/excommunications", async (_req, res) => {
  const content = await getContent();
  res.json({
    excommunications: content.excommunications,
    enemyNations: content.enemyNations
  });
});

app.get("/api/enemy-nations", async (_req, res) => {
  const content = await getContent();
  res.json({ enemyNations: content.enemyNations });
});

app.get("/api/commits", async (_req, res) => {
  const commits = await getCommits();
  res.json({ commits });
});

app.post("/api/audit/crypto", async (req, res) => {
  const action = String(req.body?.action || "").trim().toLowerCase();

  if (!["encrypt", "decrypt"].includes(action)) {
    return res.status(400).json({ error: "Valid action is required." });
  }

  const cryptoLogs = await appendCryptoLog({
    action,
    source: "website",
    messagePreview: String(req.body?.messagePreview || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160),
    encryptedPreview: String(req.body?.encryptedPreview || "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 160)
  });

  res.status(201).json({ ok: true, cryptoLogs });
});

app.post("/api/panel/login", async (req, res) => {
  const username = String(req.body?.username || "");
  const password = String(req.body?.password || "");

  const user = await authenticatePanelUser(username, password);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.json({ user });
});

app.post("/api/applications", async (req, res) => {
  const applicantName = String(req.body?.applicantName || "").trim();
  const age = String(req.body?.age || "").trim();
  const timezone = String(req.body?.timezone || "").trim();
  const motivation = String(req.body?.motivation || "").trim();
  const experience = String(req.body?.experience || "").trim();
  const discordHandle = String(req.body?.discordHandle || "").trim();
  const discordUserId = String(req.body?.discordUserId || "").replace(/\s+/g, "").trim();
  const email = String(req.body?.email || "").trim();

  if (!applicantName || !age || !timezone || !motivation || !experience || !discordHandle) {
    return res.status(400).json({
      error:
        "Name, age, timezone, motivation, experience, and Discord handle are required."
    });
  }

  if (!/^\d{17,20}$/.test(discordUserId)) {
    return res.status(400).json({
      error: "Valid Discord User ID is required to apply for citizenship."
    });
  }

  const existingApplications = await getPublicApplications();
  const duplicate = existingApplications.find((application) =>
    String(application.discordUserId || "").trim() === discordUserId &&
    !application.archived &&
    !["rejected", "archived"].includes(String(application.status || "pending"))
  );

  if (duplicate) {
    return res.status(400).json({
      error: "That Discord User ID is already linked to an active citizenship application."
    });
  }

  const application = await createPublicApplication({
    id: createId("application"),
    source: "website",
    status: "pending",
    submittedAt: new Date().toISOString(),
    applicantName,
    age,
    timezone,
    motivation,
    experience,
    discordHandle,
    discordUserId,
    email
  });

  res.status(201).json({ ok: true, application });
});

app.get("/api/admin/applications/pending", requireAdmin, async (_req, res) => {
  const applications = await getPendingPublicApplications();
  res.json({ applications });
});

app.get("/api/admin/applications", requireAdmin, async (_req, res) => {
  const applications = await getPublicApplications();
  res.json({ applications });
});

app.post("/api/admin/applications/:id", requireAdmin, async (req, res) => {
  const allowedStatuses = ["pending", "under_review", "approved", "rejected", "appealed", "archived"];
  const status = String(req.body?.status || "pending").trim();
  const updateFields = {
    status: allowedStatuses.includes(status) ? status : "pending",
    internalNotes: String(req.body?.internalNotes || "").trim(),
    decisionNote: String(req.body?.decisionNote || "").trim(),
    publicResponse: String(req.body?.publicResponse || "").trim(),
    requestInfo: Boolean(req.body?.requestInfo),
    archived: Boolean(req.body?.archived),
    archivedAt: req.body?.archived ? new Date().toISOString() : req.body?.archivedAt || "",
    needsAttention: Boolean(req.body?.needsAttention),
    suppressDiscordEvents: Boolean(req.body?.suppressDiscordEvents),
    actor: String(req.body?.actor || "government-access").trim()
  };
  if (Object.prototype.hasOwnProperty.call(req.body || {}, "discordUserId")) {
    updateFields.discordUserId = String(req.body?.discordUserId || "").replace(/\s+/g, "").trim();
    if (!/^\d{17,20}$/.test(updateFields.discordUserId)) {
      return res.status(400).json({ error: "Valid Discord User ID is required to apply for citizenship." });
    }
  }
  const application = await updatePublicApplication(req.params.id, updateFields);

  if (!application) {
    return res.status(404).json({ error: "Application not found." });
  }

  res.json({ application });
});

app.post("/api/admin/applications/:id/approve-citizen", requireAdmin, async (req, res) => {
  let result = await approveCitizenApplication(
    req.params.id,
    String(req.body?.approvedBy || req.body?.actor || "government-access").trim(),
    {
      approvalMethod: String(req.body?.approvalMethod || "Website").trim(),
      decisionNote: String(req.body?.decisionNote || "").trim(),
      suppressDiscordEvents: Boolean(req.body?.suppressDiscordEvents),
      portalUrl: String(req.body?.portalUrl || "").trim()
    }
  );

  if (!result && req.body?.application && typeof req.body.application === "object") {
    const snapshot = req.body.application;
    await createPublicApplication({
      id: req.params.id,
      source: snapshot.source || "discord",
      status: snapshot.status || "pending",
      submittedAt: snapshot.submittedAt || snapshot.createdAt || new Date().toISOString(),
      applicantName: snapshot.applicantName || snapshot.applicantTag || snapshot.discordHandle || "Discord Applicant",
      age: snapshot.age || snapshot.answers?.[1] || "Unspecified",
      timezone: snapshot.timezone || snapshot.answers?.[2] || "Unspecified",
      motivation: snapshot.motivation || snapshot.answers?.[3] || snapshot.answers?.[0] || "Discord application intake.",
      experience: snapshot.experience || snapshot.answers?.[4] || snapshot.answers?.slice?.(0)?.join("\n\n") || "Discord application intake.",
      discordHandle: snapshot.discordHandle || snapshot.applicantTag || "",
      discordUserId: snapshot.discordUserId || snapshot.applicantId || "",
      discordChannelId: snapshot.discordChannelId || "",
      discordThreadId: snapshot.discordThreadId || snapshot.reviewThreadId || "",
      discordMessageId: snapshot.discordMessageId || snapshot.reviewMessageId || "",
      reviewThreadId: snapshot.reviewThreadId || "",
      reviewMessageId: snapshot.reviewMessageId || "",
      reviewGuildId: snapshot.reviewGuildId || snapshot.guildId || ""
    });
    result = await approveCitizenApplication(
      req.params.id,
      String(req.body?.approvedBy || req.body?.actor || "government-access").trim(),
      {
        approvalMethod: String(req.body?.approvalMethod || "Website").trim(),
        decisionNote: String(req.body?.decisionNote || "").trim(),
        suppressDiscordEvents: Boolean(req.body?.suppressDiscordEvents),
        portalUrl: String(req.body?.portalUrl || "").trim()
      }
    );
  }

  if (!result) {
    return res.status(404).json({ error: "Application not found." });
  }

  res.json(result);
});

app.post("/api/admin/applications/:id/resend-login", requireAdmin, async (req, res) => {
  const result = await regenerateCitizenLoginCredentials(
    req.params.id,
    String(req.body?.actor || "government-access").trim(),
    { queueEvent: req.body?.queueEvent !== false }
  );

  if (!result) {
    return res.status(404).json({ error: "Citizen account not found for this application." });
  }

  res.json(result);
});

app.post("/api/admin/applications/:id/credential-delivery", requireAdmin, async (req, res) => {
  const application = await markCitizenCredentialDelivery(req.params.id, {
    status: Object.prototype.hasOwnProperty.call(req.body || {}, "status") ? String(req.body?.status || "").trim() : "",
    error: String(req.body?.error || "").trim(),
    discordRoleStatus: String(req.body?.discordRoleStatus || "").trim(),
    actor: String(req.body?.actor || "discord-bot").trim()
  });

  if (!application) {
    return res.status(404).json({ error: "Application not found." });
  }

  res.json({ application });
});

app.post("/api/admin/applications/:id/review-thread", requireAdmin, async (req, res) => {
  const application = await updatePublicApplication(req.params.id, {
    status: req.body?.status || "under_review",
    reviewThreadId: String(req.body?.reviewThreadId || "").trim(),
    reviewMessageId: String(req.body?.reviewMessageId || "").trim(),
    reviewGuildId: String(req.body?.reviewGuildId || "").trim(),
    discordChannelId: String(req.body?.discordChannelId || "").trim(),
    discordThreadId: String(req.body?.discordThreadId || req.body?.reviewThreadId || "").trim(),
    discordMessageId: String(req.body?.discordMessageId || req.body?.reviewMessageId || "").trim(),
    adminPingSent: Boolean(req.body?.adminPingSent),
    adminPingMessageId: String(req.body?.adminPingMessageId || "").trim()
  });

  if (!application) {
    return res.status(404).json({ error: "Application not found." });
  }

  res.json({ application });
});

app.post("/api/admin/applications/:id/appeal", requireAdmin, async (req, res) => {
  const reason = String(req.body?.appealReason || "").trim();

  if (!reason) {
    return res.status(400).json({ error: "Appeal reason is required." });
  }

  const application = await updatePublicApplication(req.params.id, {
    status: "appealed",
    appealStatus: "requested",
    appealReason: reason,
    appealedAt: new Date().toISOString(),
    needsAttention: true,
    actor: String(req.body?.actor || "applicant").trim()
  });

  if (!application) {
    return res.status(404).json({ error: "Application not found." });
  }

  res.json({ application });
});

app.get("/api/admin/applications/discord-events", requireAdmin, async (_req, res) => {
  const applications = await getPendingApplicationDiscordEvents();
  res.json({ applications });
});

app.post("/api/admin/applications/:id/discord-events/:eventId", requireAdmin, async (req, res) => {
  const application = await markApplicationDiscordEvent(req.params.id, req.params.eventId, {
    deliveryStatus: String(req.body?.deliveryStatus || "delivered").trim(),
    deliveryError: String(req.body?.deliveryError || "").trim(),
    deliveredAt: req.body?.deliveredAt || new Date().toISOString()
  });

  if (!application) {
    return res.status(404).json({ error: "Application not found." });
  }

  res.json({ application });
});

app.post("/api/admin/settings", requireAdmin, async (req, res) => {
  const content = await updateSettings(req.body || {});
  res.json({ settings: content.settings });
});

app.get("/api/admin/articles", requireAdmin, async (_req, res) => {
  const content = await getContent();
  res.json({ articles: content.articles || [] });
});

app.post("/api/admin/articles", requireAdmin, async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const body = String(req.body?.body || "").trim();

  if (!title || !body) {
    return res.status(400).json({ error: "Title and article body are required." });
  }

  const articles = await createArticle({
    title,
    subtitle: req.body?.subtitle || "",
    body,
    heroImage: req.body?.heroImage || "",
    category: req.body?.category || "General",
    source: req.body?.source || "Wilford Panem Union",
    publishDate: req.body?.publishDate || new Date().toISOString(),
    status: req.body?.status || "draft",
    featured: Boolean(req.body?.featured)
  });

  res.status(201).json({ articles });
});

app.post("/api/admin/articles/:id", requireAdmin, async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const body = String(req.body?.body || "").trim();

  if (!title || !body) {
    return res.status(400).json({ error: "Title and article body are required." });
  }

  const articles = await updateArticle(req.params.id, {
    title,
    subtitle: req.body?.subtitle || "",
    body,
    heroImage: req.body?.heroImage || "",
    category: req.body?.category || "General",
    source: req.body?.source || "Wilford Panem Union",
    publishDate: req.body?.publishDate || new Date().toISOString(),
    status: req.body?.status || "draft",
    featured: Boolean(req.body?.featured)
  });

  res.json({ articles });
});

app.delete("/api/admin/articles/:id", requireAdmin, async (req, res) => {
  const articles = await deleteArticle(req.params.id);
  res.json({ articles });
});

app.get("/api/admin/government-access-store", requireAdmin, async (_req, res) => {
  const content = await getContent();
  res.json({
    governmentUsers: content.governmentUsers || [],
    governmentAuditLog: content.governmentAuditLog || [],
    publicApplications: content.publicApplications || [],
    citizenRecords: content.citizenRecords || [],
    citizenRequests: content.citizenRequests || [],
    citizenAlerts: content.citizenAlerts || [],
    citizenActivity: content.citizenActivity || [],
    districtProfiles: content.districtProfiles || []
  });
});

app.post("/api/admin/government-access-store", requireAdmin, async (req, res) => {
  const store = await updateGovernmentAccessStore(req.body || {});
  res.json(store);
});

app.get("/api/admin/economy-store", requireAdmin, async (_req, res) => {
  try {
    const economy = await getEconomyStore();
    res.json({ economy });
  } catch (error) {
    sendApiError(res, "economy-admin-read", error);
  }
});

app.post("/api/admin/economy-store", requireAdmin, async (req, res) => {
  try {
    const economy = await updateEconomyStore(req.body?.economy || req.body || {});
    if (req.query?.minimal === "1" || req.get("x-minimal-response") === "1") {
      return res.json({ ok: true });
    }
    res.json({ economy });
  } catch (error) {
    sendApiError(res, "economy-admin-write", error);
  }
});

app.post("/api/admin/economy-wallet-patch", requireAdmin, async (req, res) => {
  try {
    const patch = req.body || {};
    const economy = await getEconomyStore();

    if (Array.isArray(patch.wallets)) {
      const nextWallets = new Map((economy.wallets || []).map((wallet) => [wallet.id, wallet]));
      for (const wallet of patch.wallets) {
        if (wallet?.id) nextWallets.set(wallet.id, wallet);
      }
      economy.wallets = [...nextWallets.values()];
    }

    const prependUnique = (existing = [], incoming = [], limit = 500) => {
      const seen = new Set();
      return [...incoming, ...existing].filter((entry) => {
        const key = entry?.id || JSON.stringify(entry);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      }).slice(0, limit);
    };

    if (Array.isArray(patch.transactions)) {
      economy.transactions = prependUnique(economy.transactions, patch.transactions, 600);
    }
    if (Array.isArray(patch.taxRecords)) {
      economy.taxRecords = prependUnique(economy.taxRecords, patch.taxRecords, 600);
    }
    if (Array.isArray(patch.alerts)) {
      economy.alerts = prependUnique(economy.alerts, patch.alerts, 300);
    }
    if (Array.isArray(patch.raidLogs)) {
      economy.raidLogs = prependUnique(economy.raidLogs, patch.raidLogs, 250);
    }
    if (Array.isArray(patch.lootboxLogs)) {
      economy.lootboxLogs = prependUnique(economy.lootboxLogs, patch.lootboxLogs, 300);
    }

    for (const key of [
      "lootboxAllocationDate",
      "globalLootboxesOpenedToday",
      "perUserLootboxesOpenedToday",
      "gamblingJackpot"
    ]) {
      if (Object.hasOwn(patch, key)) economy[key] = patch[key];
    }

    await updateEconomyStore(economy);
    res.json({ ok: true });
  } catch (error) {
    sendApiError(res, "economy-wallet-patch", error);
  }
});

app.get("/api/admin/supreme-court-store", requireAdmin, async (_req, res) => {
  const content = await getContent();
  res.json({
    supremeCourtCases: content.supremeCourtCases || [],
    supremeCourtPetitions: content.supremeCourtPetitions || []
  });
});

app.post("/api/admin/supreme-court-store", requireAdmin, async (req, res) => {
  const store = await updateSupremeCourtStore(req.body || {});
  res.json(store);
});

app.post("/api/admin/bulletins", requireAdmin, async (req, res) => {
  const headline = String(req.body?.headline || "").trim();

  if (!headline) {
    return res.status(400).json({ error: "Headline is required." });
  }

  const bulletins = await createBulletin({
    headline,
    category: req.body?.category || "General",
    issuingAuthority: req.body?.issuingAuthority || req.body?.category || "Government",
    bulletinType: req.body?.bulletinType || "Public Bulletin",
    priority: req.body?.priority || "standard",
    active: Boolean(req.body?.active),
    linkedArticleId: req.body?.linkedArticleId || "",
    expiresAt: req.body?.expiresAt || ""
  });

  res.status(201).json({ bulletins });
});

app.post("/api/admin/bulletins/:id", requireAdmin, async (req, res) => {
  const headline = String(req.body?.headline || "").trim();

  if (!headline) {
    return res.status(400).json({ error: "Headline is required." });
  }

  const bulletins = await updateBulletin(req.params.id, {
    headline,
    category: req.body?.category || "General",
    issuingAuthority: req.body?.issuingAuthority || req.body?.category || "Government",
    bulletinType: req.body?.bulletinType || "Public Bulletin",
    priority: req.body?.priority || "standard",
    active: Boolean(req.body?.active),
    linkedArticleId: req.body?.linkedArticleId || "",
    expiresAt: req.body?.expiresAt || ""
  });

  res.json({ bulletins });
});

app.get("/api/admin/discord-broadcasts", requireAdmin, async (req, res) => {
  const status = String(req.query?.status || "").trim().toLowerCase();
  const broadcasts = await getDiscordBroadcasts({ status });
  res.json({ broadcasts });
});

app.post("/api/admin/discord-broadcasts", requireAdmin, async (req, res) => {
  const title = String(req.body?.title || "").trim();
  const body = String(req.body?.body || "").trim();
  const distribution = String(req.body?.distribution || "none").trim();
  const type = String(req.body?.type || "news").trim();
  const requestedPingOption = ["none", "here", "everyone"].includes(String(req.body?.pingOption || "none").trim())
    ? String(req.body?.pingOption || "none").trim()
    : "none";
  const requestedRole = String(req.body?.requestedRole || "").trim();
  const pingConfirmed = Boolean(req.body?.pingConfirmed);
  const everyoneRoles = ["Supreme Chairman", "Executive Director"];
  const isMssPing = ["mss_alert", "treason_notice"].includes(type);
  const canUseEveryone = everyoneRoles.includes(requestedRole) || (["MSS Command", "Security Command"].includes(requestedRole) && isMssPing);
  let pingOption = requestedPingOption;
  let pingDeniedReason = "";
  if (pingOption === "everyone" && !canUseEveryone) {
    pingOption = "none";
    pingDeniedReason = "role not authorised for @everyone";
  }
  if (pingOption === "everyone" && !pingConfirmed) {
    pingOption = "none";
    pingDeniedReason = "confirmation missing";
  }
  if (pingOption === "everyone") {
    const recent = (await getDiscordBroadcasts({ status: "" })).find((broadcast) =>
      broadcast.pingOption === "everyone" &&
      Date.now() - Date.parse(broadcast.createdAt || 0) < 20 * 60 * 1000
    );
    if (recent) {
      pingOption = "none";
      pingDeniedReason = "cooldown active";
    }
  }
  const dangerousBroadcast =
    ["dm_all", "announcement_and_dm_all"].includes(distribution) ||
    type === "treason_notice" ||
    pingOption === "everyone";

  if (!title || !body) {
    return res.status(400).json({ error: "Broadcast title and body are required." });
  }

  if (distribution === "none") {
    return res.status(400).json({ error: "No Discord delivery target selected." });
  }

  if (distribution === "specific_user" && !String(req.body?.targetDiscordId || "").trim()) {
    return res.status(400).json({ error: "A Discord user ID is required for specific delivery." });
  }

  const broadcast = await createDiscordBroadcast({
    type,
    title,
    body,
    distribution,
    pingOption,
    requestedPingOption,
    pingConfirmed,
    pingApplied: pingOption !== "none",
    pingDeniedReason,
    targetDiscordId: req.body?.targetDiscordId || "",
    linkedType: req.body?.linkedType || "",
    linkedId: req.body?.linkedId || "",
    headline: req.body?.headline || "",
    excerpt: req.body?.excerpt || "",
    issuer: req.body?.issuer || "",
    classification: req.body?.classification || "",
    imageUrl: req.body?.imageUrl || "",
    articleUrl: req.body?.articleUrl || "",
    metadata: req.body?.metadata && typeof req.body.metadata === "object" ? req.body.metadata : {},
    requiresApproval: dangerousBroadcast || (Boolean(req.body?.requiresApproval) && !pingDeniedReason),
    confirmed: !dangerousBroadcast && Boolean(req.body?.confirmed),
    requestedBy: req.body?.requestedBy || "system",
    requestedRole
  });

  res.status(201).json({ broadcast });
});

app.post("/api/admin/discord-broadcasts/:id", requireAdmin, async (req, res) => {
  const allowedStatuses = [
    "pending_approval",
    "approval_notified",
    "declined",
    "pending",
    "processing",
    "completed",
    "failed"
  ];
  const status = String(req.body?.status || "").trim().toLowerCase();

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Valid broadcast status is required." });
  }

  const updates = {
    status,
    processedAt: req.body?.processedAt || (["completed", "failed"].includes(status) ? new Date().toISOString() : ""),
    recipients: Array.isArray(req.body?.recipients) ? req.body.recipients : [],
    successCount: Number(req.body?.successCount || 0),
    failureCount: Number(req.body?.failureCount || 0),
    failures: Array.isArray(req.body?.failures) ? req.body.failures : [],
    error: req.body?.error || "",
    confirmed: Boolean(req.body?.confirmed),
    approvalNotifiedAt: req.body?.approvalNotifiedAt || "",
    approvedAt: req.body?.approvedAt || "",
    approvedBy: req.body?.approvedBy || "",
    declinedAt: req.body?.declinedAt || "",
    declinedBy: req.body?.declinedBy || "",
    approvalNote: req.body?.approvalNote || ""
  };
  for (const key of ["pingOption", "requestedPingOption", "pingConfirmed", "pingApplied", "pingDeniedReason"]) {
    if (Object.prototype.hasOwnProperty.call(req.body || {}, key)) {
      updates[key] = req.body[key];
    }
  }

  const broadcast = await updateDiscordBroadcast(req.params.id, updates);

  if (!broadcast) {
    return res.status(404).json({ error: "Broadcast not found." });
  }

  res.json({ broadcast });
});

app.post("/api/admin/bulletins/:id/move", requireAdmin, async (req, res) => {
  const bulletins = await moveBulletin(
    req.params.id,
    req.body?.direction === "up" ? "up" : "down"
  );
  res.json({ bulletins });
});

app.delete("/api/admin/bulletins/:id", requireAdmin, async (req, res) => {
  const bulletins = await deleteBulletin(req.params.id);
  res.json({ bulletins });
});

app.get("/api/admin/enemies-of-state", requireAdmin, async (_req, res) => {
  const enemyOfStateEntries = await getEnemyOfStateEntries();
  res.json({ enemyOfStateEntries });
});

app.post("/api/admin/enemies-of-state", requireAdmin, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const reasonSummary = String(req.body?.reasonSummary || "").trim();

  if (!name || !reasonSummary) {
    return res.status(400).json({ error: "Name and reason summary are required." });
  }

  const enemyOfStateEntries = await createEnemyOfStateEntry(req.body || {});
  res.status(201).json({ enemyOfStateEntries });
});

app.post("/api/admin/enemies-of-state/:id", requireAdmin, async (req, res) => {
  const name = String(req.body?.name || "").trim();
  const reasonSummary = String(req.body?.reasonSummary || "").trim();

  if (!name || !reasonSummary) {
    return res.status(400).json({ error: "Name and reason summary are required." });
  }

  const enemyOfStateEntries = await updateEnemyOfStateEntry(req.params.id, req.body || {});
  res.json({ enemyOfStateEntries });
});

app.delete("/api/admin/enemies-of-state/:id", requireAdmin, async (req, res) => {
  const enemyOfStateEntries = await archiveEnemyOfStateEntry(req.params.id);
  res.json({ enemyOfStateEntries });
});

app.get("/api/admin/enemies-of-state/discord-events", requireAdmin, async (_req, res) => {
  const events = await getPendingEnemyOfStateDiscordEvents();
  res.json({ events });
});

app.post("/api/admin/enemies-of-state/discord-events/:eventId", requireAdmin, async (req, res) => {
  const result = await markEnemyOfStateDiscordEvent(req.params.eventId, req.body || {});
  res.json(result);
});

app.get("/api/admin/users", requireOwner, async (_req, res) => {
  const users = await getPanelUsers();
  res.json({
    users,
    owner: {
      username: config.ownerUsername,
      role: "owner"
    }
  });
});

app.post("/api/admin/users", requireOwner, async (req, res) => {
  const username = String(req.body?.username || "").trim();
  const password = String(req.body?.password || "").trim();
  const role = String(req.body?.role || "editor").trim();

  if (!username || !password) {
    return res.status(400).json({ error: "Username and password are required." });
  }

  const users = await createPanelUser({
    id: createId("user"),
    username,
    password,
    role,
    createdAt: new Date().toISOString()
  });

  res.status(201).json({ users });
});

app.delete("/api/admin/users/:id", requireOwner, async (req, res) => {
  const users = await deletePanelUser(req.params.id);
  res.json({ users });
});

app.post("/api/admin/members", requireAdmin, async (req, res) => {
  const member = {
    id: createId("member"),
    name: req.body?.name || "",
    role: req.body?.role || "",
    division: req.body?.division || "",
    status: req.body?.status || "Active",
    notes: req.body?.notes || "",
    order: Number(req.body?.order ?? 0)
  };

  const members = await createMember(member);
  res.status(201).json({ members });
});

app.post("/api/admin/members/:id/move", requireAdmin, async (req, res) => {
  const members = await moveMember(
    req.params.id,
    req.body?.direction === "up" ? "up" : "down"
  );
  res.json({ members });
});

app.post("/api/admin/members/:id/position", requireAdmin, async (req, res) => {
  const members = await updateMemberPosition(
    req.params.id,
    Number(req.body?.targetIndex ?? 0)
  );
  res.json({ members });
});

app.post("/api/admin/members/reorder", requireAdmin, async (req, res) => {
  const members = await reorderMembers(req.body?.orderedIds || []);
  res.json({ members });
});

app.post("/api/admin/members/replace", requireAdmin, async (req, res) => {
  const members = await replaceMembers(req.body?.members || []);
  res.json({ members });
});

app.delete("/api/admin/members/:id", requireAdmin, async (req, res) => {
  const members = await deleteMember(req.params.id);
  res.json({ members });
});

app.post("/api/admin/alliances", requireAdmin, async (req, res) => {
  const alliances = await createAlliance({
    id: createId("alliance"),
    name: req.body?.name || "",
    classification: req.body?.classification || "Nation",
    notes: req.body?.notes || "",
    order: Number(req.body?.order ?? 0)
  });

  res.status(201).json({ alliances });
});

app.post("/api/admin/alliances/:id/move", requireAdmin, async (req, res) => {
  const alliances = await moveAlliance(
    req.params.id,
    req.body?.direction === "up" ? "up" : "down"
  );
  res.json({ alliances });
});

app.post(
  "/api/admin/alliances/:id/position",
  requireAdmin,
  async (req, res) => {
    const alliances = await updateAlliancePosition(
      req.params.id,
      Number(req.body?.targetIndex ?? 0)
    );
    res.json({ alliances });
  }
);

app.post("/api/admin/alliances/reorder", requireAdmin, async (req, res) => {
  const alliances = await reorderAlliances(req.body?.orderedIds || []);
  res.json({ alliances });
});

app.post("/api/admin/alliances/replace", requireAdmin, async (req, res) => {
  const alliances = await replaceAlliances(req.body?.alliances || []);
  res.json({ alliances });
});

app.delete("/api/admin/alliances/:id", requireAdmin, async (req, res) => {
  const alliances = await deleteAlliance(req.params.id);
  res.json({ alliances });
});

app.post("/api/admin/excommunications", requireAdmin, async (req, res) => {
  const entry = {
    id: createId("excommunication"),
    name: req.body?.name || "",
    reason: req.body?.reason || "",
    decree: req.body?.decree || "",
    date: req.body?.date || new Date().toISOString().slice(0, 10),
    notes: req.body?.notes || "",
    order: Number(req.body?.order ?? 0)
  };

  const excommunications = await createExcommunication(entry);
  res.status(201).json({ excommunications });
});

app.post(
  "/api/admin/excommunications/:id/move",
  requireAdmin,
  async (req, res) => {
    const excommunications = await moveExcommunication(
      req.params.id,
      req.body?.direction === "up" ? "up" : "down"
    );
    res.json({ excommunications });
  }
);

app.post(
  "/api/admin/excommunications/reorder",
  requireAdmin,
  async (req, res) => {
    const excommunications = await reorderExcommunications(
      req.body?.orderedIds || []
    );
    res.json({ excommunications });
  }
);

app.delete(
  "/api/admin/excommunications/:id",
  requireAdmin,
  async (req, res) => {
    const excommunications = await deleteExcommunication(req.params.id);
    res.json({ excommunications });
  }
);

app.post("/api/admin/enemy-nations", requireAdmin, async (req, res) => {
  const enemyNations = await createEnemyNation({
    id: createId("enemy"),
    name: req.body?.name || "",
    classification: req.body?.classification || "Nation",
    notes: req.body?.notes || "",
    order: Number(req.body?.order ?? 0)
  });

  res.status(201).json({ enemyNations });
});

app.post(
  "/api/admin/enemy-nations/:id/move",
  requireAdmin,
  async (req, res) => {
    const enemyNations = await moveEnemyNation(
      req.params.id,
      req.body?.direction === "up" ? "up" : "down"
    );
    res.json({ enemyNations });
  }
);

app.post(
  "/api/admin/enemy-nations/reorder",
  requireAdmin,
  async (req, res) => {
    const enemyNations = await reorderEnemyNations(req.body?.orderedIds || []);
    res.json({ enemyNations });
  }
);

app.delete("/api/admin/enemy-nations/:id", requireAdmin, async (req, res) => {
  const enemyNations = await deleteEnemyNation(req.params.id);
  res.json({ enemyNations });
});

app.post("/api/admin/deploy/panel", requireAdmin, async (_req, res) => {
  try {
    const result = await deployPanel();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Panel deploy failed."
    });
  }
});

app.post("/api/admin/deploy/panel/start", requireAdmin, async (_req, res) => {
  const job = startDeployJob("panel");
  res.status(202).json({ job });
});

app.post("/api/admin/deploy/bot", requireAdmin, async (_req, res) => {
  try {
    const result = await deployDiscordBot();
    res.json(result);
  } catch (error) {
    res.status(500).json({
      error:
        error instanceof Error ? error.message : "Discord bot deploy failed."
    });
  }
});

app.post("/api/admin/deploy/bot/start", requireAdmin, async (_req, res) => {
  const job = startDeployJob("bot");
  res.status(202).json({ job });
});

app.get("/api/admin/deploy/jobs/:id", requireAdmin, async (req, res) => {
  const job = getDeployJob(req.params.id);

  if (!job) {
    return res.status(404).json({ error: "Deploy job not found." });
  }

  res.json({ job });
});

app.listen(config.port, () => {
  console.log(`Wilford API listening on port ${config.port}`);
});
