// tests/teamCollab.test.js – updated permission test with user creation
import test from "node:test";
import assert from "node:assert/strict";
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
  clearAll,
  createUser,
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

  const membersRes = await listMembers({ requesterId: "u1", teamId });
  assert.equal(membersRes.status, 200);
  const u2Member = membersRes.members.find((m) => m.user_id === "u2");
  assert.ok(u2Member);
  assert.equal(u2Member.role, "member");
});

await test("happy path: invite with custom role admin", async (t) => {
  await resetStore();
  const teamRes = await createTeam({
    requesterId: "u1",
    name: "Beta Team",
  });
  const teamId = teamRes.team.id;

  const inviteRes = await inviteMember({
    requesterId: "u1",
    teamId,
    email: "admin@example.com",
    role: "admin",
  });
  assert.equal(inviteRes.status, 202);
  const token = inviteRes.invitationId;

  const acceptRes = await respondInvitation({
    token,
    responderId: "u3",
    decision: "accept",
  });
  assert.equal(acceptRes.status, 200);

  const membersRes = await listMembers({ requesterId: "u1", teamId });
  const u3Member = membersRes.members.find((m) => m.user_id === "u3");
  assert.ok(u3Member);
  assert.equal(u3Member.role, "admin");
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

await test("happy path: update team and delete team", async (t) => {
  await resetStore();
  const team = (
    await createTeam({
      requesterId: "u1",
      name: "Original Team",
      description: "Old Desc",
    })
  ).team;
  const teamId = team.id;

  const updateRes = await updateTeamRoute({
    requesterId: "u1",
    teamId,
    name: "New Name",
    description: "New Desc",
  });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.team.name, "New Name");
  assert.equal(updateRes.team.description, "New Desc");

  const deleteRes = await deleteTeamRoute({ requesterId: "u1", teamId });
  assert.equal(deleteRes.status, 200);
  assert.equal(deleteRes.message, "Team deleted");
});

await test("happy path: update project and delete project", async (t) => {
  await resetStore();
  const teamId = (await createTeam({ requesterId: "u1", name: "Team A" })).team
    .id;
  const project = (
    await createProject({
      requesterId: "u1",
      teamId,
      name: "Proj A",
      description: "Desc A",
    })
  ).project;
  const projectId = project.id;

  const updateRes = await updateProjectRoute({
    requesterId: "u1",
    teamId,
    projectId,
    name: "Proj B",
    description: "Desc B",
  });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.project.name, "Proj B");

  const deleteRes = await deleteProjectRoute({
    requesterId: "u1",
    teamId,
    projectId,
  });
  assert.equal(deleteRes.status, 200);
  assert.equal(deleteRes.message, "Project deleted");
});

await test("happy path: tasks and comments CRUD", async (t) => {
  await resetStore();
  const teamId = (await createTeam({ requesterId: "u1", name: "Team Tasks" }))
    .team.id;
  const project = (
    await createProject({ requesterId: "u1", teamId, name: "Project Tasks" })
  ).project;
  const projectId = project.id;

  // Create Task
  const taskRes = await createTaskRoute({
    requesterId: "u1",
    teamId,
    projectId,
    title: "Task 1",
    description: "Do it",
    status: "todo",
  });
  assert.equal(taskRes.status, 201);
  const taskId = taskRes.task.id;

  // List Tasks
  const listRes = await listTasksRoute({
    requesterId: "u1",
    teamId,
    projectId,
  });
  assert.equal(listRes.status, 200);
  assert.equal(listRes.tasks.length, 1);
  assert.equal(listRes.tasks[0].title, "Task 1");

  // Update Task
  const updateRes = await updateTaskRoute({
    requesterId: "u1",
    teamId,
    projectId,
    taskId,
    status: "in_progress",
    title: "Task 1 Updated",
  });
  assert.equal(updateRes.status, 200);
  assert.equal(updateRes.task.status, "in_progress");
  assert.equal(updateRes.task.title, "Task 1 Updated");

  // Create Comment
  const commentRes = await createCommentRoute({
    requesterId: "u1",
    teamId,
    taskId,
    content: "My first comment",
  });
  assert.equal(commentRes.status, 201);
  const commentId = commentRes.comment.id;

  // List Comments
  const listCommentsRes = await listCommentsRoute({
    requesterId: "u1",
    teamId,
    taskId,
  });
  assert.equal(listCommentsRes.status, 200);
  assert.equal(listCommentsRes.comments.length, 1);
  assert.equal(listCommentsRes.comments[0].content, "My first comment");

  // Delete Comment
  const deleteCommentRes = await deleteCommentRoute({
    requesterId: "u1",
    teamId,
    commentId,
  });
  assert.equal(deleteCommentRes.status, 200);

  // Delete Task
  const deleteTaskRes = await deleteTaskRoute({
    requesterId: "u1",
    teamId,
    projectId,
    taskId,
  });
  assert.equal(deleteTaskRes.status, 200);
});

await test("happy path: team invitations and cancellation", async (t) => {
  await resetStore();
  const teamId = (await createTeam({ requesterId: "u1", name: "Team Invites" }))
    .team.id;

  const token = (
    await inviteMember({
      requesterId: "u1",
      teamId,
      email: "test@example.com",
    })
  ).invitationId;

  // List team invites
  const invitesRes = await listTeamInvitations({ requesterId: "u1", teamId });
  assert.equal(invitesRes.status, 200);
  assert.equal(invitesRes.invitations.length, 1);
  assert.equal(invitesRes.invitations[0].email, "test@example.com");

  // List all invites (global simulator)
  const allInvitesRes = await listAllInvitations({ requesterId: "u1" });
  assert.equal(allInvitesRes.status, 200);
  assert.ok(allInvitesRes.invitations.some((i) => i.token === token));

  // Cancel invitation
  const cancelRes = await deleteInvitationRoute({
    requesterId: "u1",
    teamId,
    token,
  });
  assert.equal(cancelRes.status, 200);
  assert.equal(cancelRes.message, "Invitation cancelled");
});

await test("edge case: viewer permissions restriction", async (t) => {
  await resetStore();
  const teamRes = await createTeam({
    requesterId: "u1",
    name: "Viewer Test Team",
  });
  const teamId = teamRes.team.id;

  // Invite as viewer
  const inviteRes = await inviteMember({
    requesterId: "u1",
    teamId,
    email: "viewer@example.com",
    role: "viewer",
  });
  const token = inviteRes.invitationId;

  // Accept invite
  await respondInvitation({
    token,
    responderId: "u2",
    decision: "accept",
  });

  // Viewer should be able to list team invitations
  const invitesRes = await listTeamInvitations({ requesterId: "u2", teamId });
  assert.equal(invitesRes.status, 200);

  // Create a project
  const projectRes = await createProject({
    requesterId: "u1",
    teamId,
    name: "Proj1",
  });
  const projectId = projectRes.project.id;

  // Create a task as u1 (owner)
  const taskRes = await createTaskRoute({
    requesterId: "u1",
    teamId,
    projectId,
    title: "Task1",
  });
  const taskId = taskRes.task.id;

  // Viewer should be able to list tasks
  const listTasksRes = await listTasksRoute({ requesterId: "u2", teamId, projectId });
  assert.equal(listTasksRes.status, 200);

  // Viewer should NOT be able to create tasks
  const createByViewerRes = await createTaskRoute({
    requesterId: "u2",
    teamId,
    projectId,
    title: "Task by viewer",
  });
  assert.equal(createByViewerRes.status, 403);
  assert.match(createByViewerRes.error, /member role is required/);

  // Viewer should NOT be able to delete tasks
  const deleteByViewerRes = await deleteTaskRoute({
    requesterId: "u2",
    teamId,
    projectId,
    taskId,
  });
  assert.equal(deleteByViewerRes.status, 403);
  assert.match(deleteByViewerRes.error, /member role is required/);
});
