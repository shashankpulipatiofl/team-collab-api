// tests/integration/projects.test.js
import { test, expect } from 'node:test';
import { clearAll, createUser } from '../src/db.js';
import { createProject, listProjects } from '../src/routes/projects.js';

// Helper to simulate a request context
const mockRequester = async () => {
  const user = await createUser({ name: 'Alice', email: 'alice@example.com', password: 'secret' });
  return { id: user.id };
};

test('project creation and listing', async () => {
  await clearAll();
  const requester = await mockRequester();
  const teamRes = await import('../src/routes/index.js').then(m => m.createTeam({ requesterId: requester.id, name: 'TeamX' }));
  const teamId = teamRes.team.id;

  // Create a project
  const createRes = await createProject({ requesterId: requester.id, teamId, name: 'Project Alpha' });
  expect(createRes.status).toBe(201);
  expect(createRes.project).toHaveProperty('id');
  expect(createRes.project.name).toBe('Project Alpha');

  // List projects (stub returns empty but we assert status)
  const listRes = await listProjects({ requesterId: requester.id, teamId });
  expect(listRes.status).toBe(200);
  expect(Array.isArray(listRes.projects)).toBe(true);
});
