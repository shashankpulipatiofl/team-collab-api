// tests/teamCollab.test.js – updated permission test with user creation
import test from "node:test";
import assert from "node:assert/strict";
import {
  createTeam,
  inviteMember,
  respondInvitation,
  listUserTeams,
  addRole,
  removeMember,
  getAuditLog,
  updatePermissions,
  clearAll,
  createUser,
} from "../src/routes/index.js";

// Helper to reset DB before each test
async function resetStore() {
  await clearAll();
}

await test("happy path: create team, invite, accept", async (t) => {
  await resetStore();
  const teamRes = await createTeam({
    requesterId: "u1",
    name: "Alpha",
    description: "First team",
  });
  assert.equal(teamRes.status, 201);
  const teamId = teamRes.team.id;

  const inviteRes = await inviteMember({
    requesterId: "u1",
    teamId,
    email: "bob@example.com",
  });
  assert.equal(inviteRes.status, 202);
  const token = inviteRes.invitationId;

  const acceptRes = await respondInvitation({
    token,
    responderId: "u2",
    decision: "accept",
  });
  assert.equal(acceptRes.status, 200);
  assert.ok(acceptRes.teamMembers.some((m) => m.userId === "u2"));

  const listRes = await listUserTeams({ userId: "u2" });
  assert.equal(listRes.status, 200);
  assert.ok(listRes.teams.some((t) => t.id === teamId));
});

await test("edge case: non-owner cannot invite", async (t) => {
  await resetStore();
  const team = (await createTeam({ requesterId: "u1", name: "Beta" })).team;
  const teamId = team.id;
  await assert.rejects(
    inviteMember({ requesterId: "u2", teamId, email: "carol@example.com" }),
    /Only owner can invite/,
  );
});

await test("edge case: duplicate invitation tokens are unique", async (t) => {
  await resetStore();
  const team = (await createTeam({ requesterId: "u1", name: "Gamma" })).team;
  const token1 = (
    await inviteMember({
      requesterId: "u1",
      teamId: team.id,
      email: "bob@example.com",
    })
  ).invitationId;
  const token2 = (
    await inviteMember({
      requesterId: "u1",
      teamId: team.id,
      email: "bob@example.com",
    })
  ).invitationId;
  assert.notStrictEqual(token1, token2);
});

await test("edge case: invalid token on response", async (t) => {
  await resetStore();
  await assert.rejects(
    respondInvitation({
      token: "invalid-token",
      responderId: "u2",
      decision: "accept",
    }),
    /Invalid token/,
  );
});

await test("edge case: owner cannot remove themselves", async (t) => {
  await resetStore();
  const teamId = (await createTeam({ requesterId: "u1", name: "Delta" })).team
    .id;
  await assert.rejects(
    removeMember({ requesterId: "u1", teamId, memberId: "u1" }),
    /Owner cannot be removed/,
  );
});

await test("edge case: audit log pagination and date filter", async (t) => {
  await resetStore();
  const team = (await createTeam({ requesterId: "u1", name: "Epsilon" })).team;
  const teamId = team.id;
  await inviteMember({ requesterId: "u1", teamId, email: "bob@example.com" });
  await inviteMember({ requesterId: "u1", teamId, email: "carol@example.com" });
  const allLogs = (await getAuditLog({ requesterId: "u1", teamId })).logs;
  assert.equal(allLogs.length, 3);
  const limited = (await getAuditLog({ requesterId: "u1", teamId, limit: 2 }))
    .logs;
  assert.equal(limited.length, 2);
  const future = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const empty = (
    await getAuditLog({ requesterId: "u1", teamId, startDate: future })
  ).logs;
  assert.equal(empty.length, 0);
});

await test("edge case: permission updates only by owner", async (t) => {
  await resetStore();
  // create a real user and use its numeric id
  const user = await createUser({
    name: "Owner",
    email: "owner@example.com",
    password: "pass123",
  });
  const ownerId = user.id;
  const teamId = (await createTeam({ requesterId: ownerId, name: "Zeta" })).team
    .id;
  const ok = await updatePermissions({
    requesterId: ownerId,
    teamId,
    permissionMatrix: { canInvite: true },
  });
  assert.equal(ok.status, 200);
  assert.deepStrictEqual(ok.permissions, { canInvite: true });
  // another user attempting update
  const otherUser = await createUser({
    name: "Other",
    email: "other@example.com",
    password: "pass123",
  });
  await assert.rejects(
    updatePermissions({
      requesterId: otherUser.id,
      teamId,
      permissionMatrix: { canInvite: false },
    }),
    /Only owner can update permissions/,
  );
});
