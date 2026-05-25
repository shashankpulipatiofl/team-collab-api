// tests/unit/team.test.js
import { strict as assert } from 'assert';
import app from '../../src/server.js';
import { createServer } from 'http';

let server;
let port;

beforeAll(async () => {
  // start server on an ephemeral port
  server = createServer(app);
  await new Promise((resolve) => {
    server.listen(0, () => {
      port = server.address().port;
      resolve();
    });
  });
});

afterAll(() => {
  server.close();
});

describe('Team API', () => {
  it('should create a team and list it for user', async () => {
    const base = `http://localhost:${port}`;
    // Create team
    const createRes = await fetch(`${base}/teams`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requesterId: 'user-1', name: 'Alpha' })
    });
    assert.equal(createRes.status, 201, 'Create team status');
    const created = await createRes.json();
    assert.ok(created.id, 'Team ID returned');

    // List user teams
    const listRes = await fetch(`${base}/users/user-1/teams`);
    assert.equal(listRes.status, 200, 'List teams status');
    const list = await listRes.json();
    const found = list.find((t) => t.id === created.id);
    assert.ok(found, 'Created team appears in list');
  });
});
