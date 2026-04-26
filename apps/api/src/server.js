import cors from "cors";
import express from "express";
import { config } from "./config.js";
import {
  authenticatePanelUser,
  createAlliance,
  createEnemyNation,
  createExcommunication,
  createMember,
  createPanelUser,
  deleteAlliance,
  deleteEnemyNation,
  deleteExcommunication,
  deleteMember,
  deletePanelUser,
  getContent,
  getPanelUsers,
  moveAlliance,
  moveEnemyNation,
  moveExcommunication,
  moveMember,
  updateSettings
} from "./content-store.js";
import { deployPanel } from "./deploy.js";
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
  const { panelUsers, ...publicContent } = content;
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

app.post("/api/panel/login", async (req, res) => {
  const username = String(req.body?.username || "");
  const password = String(req.body?.password || "");

  const user = await authenticatePanelUser(username, password);

  if (!user) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.json({ user });
});

app.post("/api/admin/settings", requireAdmin, async (req, res) => {
  const content = await updateSettings(req.body || {});
  res.json({ settings: content.settings });
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

app.listen(config.port, () => {
  console.log(`Wilford API listening on port ${config.port}`);
});
