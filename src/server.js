import "dotenv/config";
import express from "express";
import swaggerUi from "swagger-ui-express";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

import {
  createTeam,
  updateTeamRoute,
  deleteTeamRoute,
  inviteMember,
  respondInvitation,
  listUserTeams,
  addRole,
  removeMember,
  getAuditLog,
  updatePermissions,
  getTeamPermissionsRoute,
  listRoutes,
  createProject,
  listProjects,
  listMembers,
  updateProjectRoute,
  deleteProjectRoute,
  listTeamInvitations,
  listAllInvitations,
  deleteInvitationRoute,
  createTaskRoute,
  listTasksRoute,
  updateTaskRoute,
  deleteTaskRoute,
  createCommentRoute,
  listCommentsRoute,
  deleteCommentRoute,
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

// Helper to standardise responses and handle errors
const sendResponse = (res, result, key) => {
  if (!result) {
    return res.status(500).json({ error: "Internal Server Error" });
  }
  if (result.error) {
    return res.status(result.status || 500).json({ error: result.error });
  }
  if (key) {
    return res.status(result.status || 200).json(result[key]);
  }
  return res.status(result.status || 200).json(result);
};

// ── Teams ─────────────────────────────────────────────────────────────────────
app.post("/teams", async (req, res) => {
  try {
    const result = await createTeam({
      requesterId: req.query.requesterId || req.body.requesterId,
      ...req.body,
    });
    sendResponse(res, result, "team");
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/teams/:teamId/invite", async (req, res) => {
  try {
    const result = await inviteMember({
      teamId: req.params.teamId,
      requesterId: req.query.requesterId || req.body.requesterId,
      ...req.body,
    });
    sendResponse(res, result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/invitations/:token/respond", async (req, res) => {
  try {
    const result = await respondInvitation({
      token: req.params.token,
      responderId: req.query.requesterId || req.body.requesterId || req.body.responderId,
      ...req.body,
    });
    sendResponse(res, result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/users/:userId/teams", async (req, res) => {
  try {
    const result = await listUserTeams({ userId: req.params.userId });
    sendResponse(res, result, "teams");
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/teams/:teamId/role", async (req, res) => {
  try {
    const result = await addRole({
      teamId: req.params.teamId,
      requesterId: req.query.requesterId || req.body.requesterId,
      ...req.body,
    });
    sendResponse(res, result, "member");
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete("/teams/:teamId/member/:memberId", async (req, res) => {
  try {
    const result = await removeMember({
      teamId: req.params.teamId,
      memberId: req.params.memberId,
      requesterId: req.query.requesterId || req.body.requesterId,
    });
    sendResponse(res, result, "removed");
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/teams/:teamId/audit", async (req, res) => {
  try {
    const { startDate, endDate, limit, requesterId } = req.query;
    const result = await getAuditLog({
      requesterId,
      teamId: req.params.teamId,
      startDate,
      endDate,
      limit: Number(limit),
    });
    sendResponse(res, result, "logs");
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch("/teams/:teamId/permissions", async (req, res) => {
  try {
    const result = await updatePermissions({
      teamId: req.params.teamId,
      requesterId: req.query.requesterId || req.body.requesterId,
      ...req.body,
    });
    sendResponse(res, result, "permissions");
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/teams/:teamId/permissions", async (req, res) => {
  try {
    const result = await getTeamPermissionsRoute({
      teamId: req.params.teamId,
      requesterId: req.query.requesterId || req.body.requesterId,
    });
    sendResponse(res, result, "permissions");
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/teams/:teamId/projects", async (req, res) => {
  try {
    const result = await createProject({
      teamId: req.params.teamId,
      requesterId: req.query.requesterId || req.body.requesterId,
      ...req.body,
    });
    sendResponse(res, result, "project");
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/teams/:teamId/projects", async (req, res) => {
  try {
    const result = await listProjects({
      teamId: req.params.teamId,
      requesterId: req.query.requesterId || req.body.requesterId,
    });
    sendResponse(res, result, "projects");
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/teams/:teamId/members", async (req, res) => {
  try {
    const result = await listMembers({
      teamId: req.params.teamId,
      requesterId: req.query.requesterId || req.body.requesterId,
    });
    sendResponse(res, result, "members");
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── Team Update & Delete ──────────────────────────────────────────────────────
app.patch("/teams/:teamId", async (req, res) => {
  try {
    const result = await updateTeamRoute({
      teamId: req.params.teamId,
      requesterId: req.query.requesterId || req.body.requesterId,
      ...req.body,
    });
    sendResponse(res, result, "team");
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete("/teams/:teamId", async (req, res) => {
  try {
    const result = await deleteTeamRoute({
      teamId: req.params.teamId,
      requesterId: req.query.requesterId || req.body.requesterId,
    });
    sendResponse(res, result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── Project Update & Delete ───────────────────────────────────────────────────
app.patch("/teams/:teamId/projects/:projectId", async (req, res) => {
  try {
    const result = await updateProjectRoute({
      teamId: req.params.teamId,
      projectId: req.params.projectId,
      requesterId: req.query.requesterId || req.body.requesterId,
      ...req.body,
    });
    sendResponse(res, result, "project");
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete("/teams/:teamId/projects/:projectId", async (req, res) => {
  try {
    const result = await deleteProjectRoute({
      teamId: req.params.teamId,
      projectId: req.params.projectId,
      requesterId: req.query.requesterId || req.body.requesterId,
    });
    sendResponse(res, result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── Team Invitations Extras ───────────────────────────────────────────────────
app.get("/teams/:teamId/invitations", async (req, res) => {
  try {
    const result = await listTeamInvitations({
      teamId: req.params.teamId,
      requesterId: req.query.requesterId || req.body.requesterId,
    });
    sendResponse(res, result, "invitations");
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/invitations", async (req, res) => {
  try {
    const result = await listAllInvitations({
      requesterId: req.query.requesterId || req.body.requesterId,
    });
    sendResponse(res, result, "invitations");
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete("/teams/:teamId/invitations/:token", async (req, res) => {
  try {
    const result = await deleteInvitationRoute({
      teamId: req.params.teamId,
      token: req.params.token,
      requesterId: req.query.requesterId || req.body.requesterId,
    });
    sendResponse(res, result);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── Tasks ─────────────────────────────────────────────────────────────────────
app.get("/teams/:teamId/projects/:projectId/tasks", async (req, res) => {
  try {
    const result = await listTasksRoute({
      teamId: req.params.teamId,
      projectId: req.params.projectId,
      requesterId: req.query.requesterId || req.body.requesterId,
    });
    sendResponse(res, result, "tasks");
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/teams/:teamId/projects/:projectId/tasks", async (req, res) => {
  try {
    const result = await createTaskRoute({
      teamId: req.params.teamId,
      projectId: req.params.projectId,
      requesterId: req.query.requesterId || req.body.requesterId,
      ...req.body,
    });
    sendResponse(res, result, "task");
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.patch(
  "/teams/:teamId/projects/:projectId/tasks/:taskId",
  async (req, res) => {
    try {
      const result = await updateTaskRoute({
        teamId: req.params.teamId,
        projectId: req.params.projectId,
        taskId: req.params.taskId,
        requesterId: req.query.requesterId || req.body.requesterId,
        ...req.body,
      });
      sendResponse(res, result, "task");
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  },
);

app.delete(
  "/teams/:teamId/projects/:projectId/tasks/:taskId",
  async (req, res) => {
    try {
      const result = await deleteTaskRoute({
        teamId: req.params.teamId,
        projectId: req.params.projectId,
        taskId: req.params.taskId,
        requesterId: req.query.requesterId || req.body.requesterId,
      });
      sendResponse(res, result);
    } catch (e) {
      res.status(400).json({ error: e.message });
    }
  },
);

// ── Comments ──────────────────────────────────────────────────────────────────
app.get("/tasks/:taskId/comments", async (req, res) => {
  try {
    const result = await listCommentsRoute({
      taskId: req.params.taskId,
      requesterId: req.query.requesterId || req.body.requesterId,
      teamId: req.query.teamId,
    });
    sendResponse(res, result, "comments");
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/tasks/:taskId/comments", async (req, res) => {
  try {
    const result = await createCommentRoute({
      taskId: req.params.taskId,
      requesterId: req.query.requesterId || req.body.requesterId,
      ...req.body,
    });
    sendResponse(res, result, "comment");
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.delete("/comments/:commentId", async (req, res) => {
  try {
    const result = await deleteCommentRoute({
      commentId: req.params.commentId,
      requesterId: req.query.requesterId || req.body.requesterId,
      ...req.body,
    });
    sendResponse(res, result);
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
