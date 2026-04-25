import cors from "cors";
import express from "express";
import { config } from "./config.js";
import {
  createExcommunication,
  createMember,
  deleteExcommunication,
  deleteMember,
  getContent,
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

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}`;
}

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "api" });
});

app.get("/api/content", async (_req, res) => {
  const content = await getContent();
  res.json(content);
});

app.get("/api/settings", async (_req, res) => {
  const content = await getContent();
  res.json({ settings: content.settings });
});

app.get("/api/members", async (_req, res) => {
  const content = await getContent();
  res.json({ members: content.members });
});

app.get("/api/excommunications", async (_req, res) => {
  const content = await getContent();
  res.json({ excommunications: content.excommunications });
});

app.get("/api/commits", async (_req, res) => {
  const commits = await getCommits();
  res.json({ commits });
});

app.post("/api/admin/settings", requireAdmin, async (req, res) => {
  const content = await updateSettings(req.body || {});
  res.json({ settings: content.settings });
});

app.post("/api/admin/members", requireAdmin, async (req, res) => {
  const member = {
    id: createId("member"),
    name: req.body?.name || "",
    role: req.body?.role || "",
    division: req.body?.division || "",
    status: req.body?.status || "Active",
    notes: req.body?.notes || ""
  };

  const members = await createMember(member);
  res.status(201).json({ members });
});

app.delete("/api/admin/members/:id", requireAdmin, async (req, res) => {
  const members = await deleteMember(req.params.id);
  res.json({ members });
});

app.post("/api/admin/excommunications", requireAdmin, async (req, res) => {
  const entry = {
    id: createId("excommunication"),
    name: req.body?.name || "",
    reason: req.body?.reason || "",
    decree: req.body?.decree || "",
    date: req.body?.date || new Date().toISOString().slice(0, 10),
    notes: req.body?.notes || ""
  };

  const excommunications = await createExcommunication(entry);
  res.status(201).json({ excommunications });
});

app.delete(
  "/api/admin/excommunications/:id",
  requireAdmin,
  async (req, res) => {
    const excommunications = await deleteExcommunication(req.params.id);
    res.json({ excommunications });
  }
);

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
