import "dotenv/config";
import express from "express";
import swaggerUi from "swagger-ui-express";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  createTeam,
  inviteMember,
  respondInvitation,
  listUserTeams,
  addRole,
  removeMember,
  getAuditLog,
  updatePermissions,
  listRoutes,
  createProject,
  listProjects,
  listMembers,
} from "./routes/index.js";
import { dbReady } from "./db.js";

console.log("NODE_ENV:", process.env.NODE_ENV);
console.log("DATABASE_URL set:", !!process.env.DATABASE_URL);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ── Health check ─────────────────────────────────────────────────────────────
app.get("/health", (req, res) => res.json({ status: "ok" }));

// ── Teams ─────────────────────────────────────────────────────────────────────
app.post("/teams", async (req, res) => {
  try {
    const result = await createTeam(req.body);
    res.status(result.status).json(result.team);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/teams/:teamId/invite", async (req, res) => {
  try {
    const result = await inviteMember({
      teamId: req.params.teamId,
      ...req.body,
    });
    res.status(result.status).json({ invitationId: result.invitationId });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/invitations/:token/respond", async (req, res) => {
  try {
    const result = await respondInvitation({
      token: req.params.token,
      ...req.body,
    });
    res.status(result.status).json(result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/users/:userId/teams", async (req, res) => {
  try {
    const result = await listUserTeams({ userId: req.params.userId });
    res.status(result.status).json(result.teams);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/teams/:teamId/role", async (req, res) => {
  try {
    const result = await addRole({ teamId: req.params.teamId, ...req.body });
    res.status(result.status).json(result.member);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete("/teams/:teamId/member/:memberId", async (req, res) => {
  try {
    const result = await removeMember({ ...req.params, ...req.body });
    res.status(result.status).json(result.removed);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/teams/:teamId/audit", async (req, res) => {
  try {
    const { startDate, endDate, limit } = req.query;
    const result = await getAuditLog({
      teamId: req.params.teamId,
      startDate,
      endDate,
      limit: Number(limit),
    });
    res.status(result.status).json(result.logs);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch("/teams/:teamId/permissions", async (req, res) => {
  try {
    const result = await updatePermissions({
      teamId: req.params.teamId,
      ...req.body,
    });
    res.status(result.status).json(result.permissions);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/teams/:teamId/projects", async (req, res) => {
  try {
    const result = await createProject({
      teamId: req.params.teamId,
      ...req.body,
    });
    res.status(result.status).json(result.project);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/teams/:teamId/projects", async (req, res) => {
  try {
    const result = await listProjects({ teamId: req.params.teamId });
    res.status(result.status).json(result.projects);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/teams/:teamId/members", async (req, res) => {
  try {
    const result = await listMembers({ teamId: req.params.teamId });
    res.status(result.status).json(result.members);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── Swagger UI ────────────────────────────────────────────────────────────────
try {
  const swaggerPath = path.resolve(__dirname, "..", "openapi.yaml");
  const swaggerDocument = yaml.load(fs.readFileSync(swaggerPath, "utf8"));
  // serve handles static assets, setup renders the HTML UI
  app.use("/docs", swaggerUi.serve);
  app.get("/docs", swaggerUi.setup(swaggerDocument));
  app.get("/docs/", swaggerUi.setup(swaggerDocument));
  console.log("✅ Swagger UI registered at /docs");
} catch (e) {
  console.error("❌ Failed to load Swagger spec:", e.message);
}

// ── Start ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;

dbReady
  .then(() => {
    if (process.env.NODE_ENV !== "test") {
      const server = app.listen(PORT, () => {
        console.log(`Team Collaboration API listening on port ${PORT}`);
      });
      // Graceful shutdown
      const shutdown = () => {
        console.log("Shutting down...");
        server.close(() => process.exit(0));
        setTimeout(() => process.exit(1), 10000).unref();
      };
      process.on("SIGTERM", shutdown);
      process.on("SIGINT", shutdown);
    }
  })
  .catch((err) => {
    console.error("❌ DB init failed:", err.message);
    if (process.env.NODE_ENV !== "test") {
      process.exit(1);
    }
  });

export default app;
