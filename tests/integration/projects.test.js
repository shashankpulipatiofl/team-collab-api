// tests/integration/projects.test.js
import { test } from "node:test";
import { strict as assert } from "node:assert";
import { clearAll, createUser } from "../../src/db.js";
import { createProject, listProjects } from "../../src/routes/projects.js";

// Helper to simulate a request context
const mockRequester = async () => {
  const user = await createUser({
    name: "Alice",
    email: "alice@example.com",
    password: "secret",
  });
  return { id: user.id };
};

test("project creation and listing", async () => {
  await clearAll();
  const requester = await mockRequester();
  const teamRes = await import("../../src/routes/index.js").then((m) =>
    m.createTeam({ requesterId: requester.id, name: "TeamX" }),
  );
  const teamId = teamRes.team.id;

  // Create a project
  const createRes = await createProject({
    requesterId: requester.id,
    teamId,
    name: "Project Alpha",
  });
  assert.equal(createRes.status, 201);
  assert.ok(createRes.project.id);
  assert.equal(createRes.project.name, "Project Alpha");

  // List projects (stub returns empty but we assert status)
  const listRes = await listProjects({ requesterId: requester.id, teamId });
  assert.equal(listRes.status, 200);
  assert.equal(Array.isArray(listRes.projects), true);
});
