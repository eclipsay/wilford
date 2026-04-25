import cors from "cors";
import express from "express";
import { config } from "./config.js";
import { getCommits } from "./github.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "api" });
});

app.get("/api/commits", async (_req, res) => {
  const commits = await getCommits();
  res.json({ commits });
});

app.listen(config.port, () => {
  console.log(`Wilford API listening on port ${config.port}`);
});
