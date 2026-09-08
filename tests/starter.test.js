import test from "node:test";
import assert from "node:assert/strict";
import { listRoutes } from "../src/routes/index.js";

test("starter routes are visible", () => {
  const expected = [
    "GET /health",
    "POST /teams (createTeam)",
    "PATCH /teams/:teamId (updateTeamRoute)",
    "DELETE /teams/:teamId (deleteTeamRoute)",
    "POST /teams/:teamId/invite (inviteMember)",
    "POST /invitations/:token/respond (respondInvitation)",
    "GET /users/:userId/teams (listUserTeams)",
    "POST /teams/:teamId/role (addRole)",
    "DELETE /teams/:teamId/member/:memberId (removeMember)",
    "GET /teams/:teamId/audit (getAuditLog)",
    "PATCH /teams/:teamId/permissions (updatePermissions)",
    "GET /teams/:teamId/invitations (listTeamInvitations)",
    "GET /invitations (listAllInvitations)",
    "DELETE /teams/:teamId/invitations/:token (deleteInvitationRoute)",
    "GET/POST /teams/:teamId/projects/:projectId/tasks (listTasksRoute / createTaskRoute)",
    "PATCH/DELETE /teams/:teamId/projects/:projectId/tasks/:taskId (updateTaskRoute / deleteTaskRoute)",
    "GET/POST /tasks/:taskId/comments (listCommentsRoute / createCommentRoute)",
    "DELETE /comments/:commentId (deleteCommentRoute)",
  ];
  assert.deepStrictEqual(listRoutes(), expected);
});
