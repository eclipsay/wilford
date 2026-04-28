import cors from "cors";
import express from "express";
import { config } from "./config.js";
import {
  appendCryptoLog,
  authenticatePanelUser,
  createArticle,
  createBulletin,
  createDiscordBroadcast,
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
  deleteExcommunication,
  deleteMember,
  deletePanelUser,
  getContent,
  getDiscordBroadcasts,
  getPendingPublicApplications,
  getPublicApplications,
  getPanelUsers,
  moveAlliance,
  moveBulletin,
  moveEnemyNation,
  moveExcommunication,
  moveMember,
  reorderAlliances,
  reorderEnemyNations,
  reorderExcommunications,
  reorderMembers,
  replaceAlliances,
  replaceMembers,
  updatePublicApplication,
  updateAlliancePosition,
  updateArticle,
  updateBulletin,
  updateDiscordBroadcast,
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
app.use(express.json());

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

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "api" });
});

app.get("/api/content", async (_req, res) => {
  const content = await getContent();
  const {
    panelUsers,
    governmentUsers,
    governmentAuditLog,
    discordBroadcasts,
    publicApplications,
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

  res.json(publicContent);
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
  const discordUserId = String(req.body?.discordUserId || "").trim();
  const email = String(req.body?.email || "").trim();

  if (!applicantName || !age || !timezone || !motivation || !experience || !discordHandle) {
    return res.status(400).json({
      error:
        "Name, age, timezone, motivation, experience, and Discord handle are required."
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
  const allowedStatuses = ["pending", "under_review", "approved", "rejected"];
  const status = String(req.body?.status || "pending").trim();
  const application = await updatePublicApplication(req.params.id, {
    status: allowedStatuses.includes(status) ? status : "pending",
    internalNotes: String(req.body?.internalNotes || "").trim(),
    decisionNote: String(req.body?.decisionNote || "").trim()
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
    reviewGuildId: String(req.body?.reviewGuildId || "").trim()
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
    publicApplications: content.publicApplications || []
  });
});

app.post("/api/admin/government-access-store", requireAdmin, async (req, res) => {
  const store = await updateGovernmentAccessStore(req.body || {});
  res.json(store);
});

app.get("/api/admin/supreme-court-store", requireAdmin, async (_req, res) => {
  const content = await getContent();
  res.json({
    supremeCourtCases: content.supremeCourtCases || []
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

  if (!title || !body) {
    return res.status(400).json({ error: "Broadcast title and body are required." });
  }

  if (distribution === "none") {
    return res.status(400).json({ error: "No Discord delivery target selected." });
  }

  if (distribution === "specific_user" && !String(req.body?.targetDiscordId || "").trim()) {
    return res.status(400).json({ error: "A Discord user ID is required for specific delivery." });
  }

  if (
    (["dm_all", "announcement_and_dm_all"].includes(distribution) ||
      req.body?.type === "treason_notice") &&
    req.body?.confirmed !== true
  ) {
    return res.status(400).json({ error: "Dangerous broadcasts require explicit confirmation." });
  }

  const broadcast = await createDiscordBroadcast({
    type: req.body?.type || "news",
    title,
    body,
    distribution,
    targetDiscordId: req.body?.targetDiscordId || "",
    linkedType: req.body?.linkedType || "",
    linkedId: req.body?.linkedId || "",
    requiresApproval: Boolean(req.body?.requiresApproval),
    confirmed: Boolean(req.body?.confirmed),
    requestedBy: req.body?.requestedBy || "system",
    requestedRole: req.body?.requestedRole || ""
  });

  res.status(201).json({ broadcast });
});

app.post("/api/admin/discord-broadcasts/:id", requireAdmin, async (req, res) => {
  const allowedStatuses = ["pending", "processing", "completed", "failed"];
  const status = String(req.body?.status || "").trim().toLowerCase();

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ error: "Valid broadcast status is required." });
  }

  const broadcast = await updateDiscordBroadcast(req.params.id, {
    status,
    processedAt: req.body?.processedAt || (["completed", "failed"].includes(status) ? new Date().toISOString() : ""),
    recipients: Array.isArray(req.body?.recipients) ? req.body.recipients : [],
    successCount: Number(req.body?.successCount || 0),
    failureCount: Number(req.body?.failureCount || 0),
    failures: Array.isArray(req.body?.failures) ? req.body.failures : [],
    error: req.body?.error || ""
  });

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
