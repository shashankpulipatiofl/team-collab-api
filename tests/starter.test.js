import test from "node:test";
import assert from "node:assert/strict";
import { listRoutes } from "../src/routes/index.js";

test("starter routes are visible", () => {
  const expected = [
    "GET /health",
    "POST /teams (createTeam)",
    "POST /teams/:teamId/invite (inviteMember)",
    "POST /invitations/:token/respond (respondInvitation)",
    "GET /users/:userId/teams (listUserTeams)",
    "POST /teams/:teamId/role (addRole)",
    "DELETE /teams/:teamId/member/:memberId (removeMember)",
    "GET /teams/:teamId/audit (getAuditLog)",
    "PATCH /teams/:teamId/permissions (updatePermissions)"
  ];
  assert.deepStrictEqual(listRoutes(), expected);
});

