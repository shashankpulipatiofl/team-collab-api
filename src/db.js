import * as dotenv from "dotenv";
dotenv.config();
import { Pool } from "pg";
import bcrypt from "bcrypt";
import { AppError } from "./utils/error.js";
import { newDb } from "pg-mem";

let pool;
if (process.env.NODE_ENV === "test" || !process.env.DATABASE_URL) {
  const db = newDb();
  const { Pool: TestPool } = db.adapters.createPg();
  pool = new TestPool();
} else {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });
}

// Initialize tables (run once on import)
const init = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name_hash TEXT NOT NULL,
      email_hash TEXT NOT NULL,
      password_hash TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      owner_id TEXT
    );
    CREATE TABLE IF NOT EXISTS team_members (
      team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      user_id TEXT,
      role TEXT NOT NULL,
      PRIMARY KEY (team_id, user_id)
    );
    CREATE TABLE IF NOT EXISTS team_roles (
      id SERIAL PRIMARY KEY,
      team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      role_name TEXT NOT NULL,
      UNIQUE(team_id, role_name)
    );
    CREATE TABLE IF NOT EXISTS invitations (
      token TEXT PRIMARY KEY,
      team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      email_hash TEXT NOT NULL,
      status TEXT NOT NULL,
      created_by TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      action TEXT NOT NULL,
      performed_by TEXT,
      details JSONB,
      at TIMESTAMP NOT NULL DEFAULT now()
    );
    CREATE TABLE IF NOT EXISTS permissions (
      team_id INTEGER PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
      permission_matrix JSONB
    );
  `);
};
export const dbReady = init();

// Helper to hash a value securely
export const hashValue = async (value) => {
  const saltRounds = 12; // stronger security
  return await bcrypt.hash(value, saltRounds);
};

// Verify a hashed value (used for passwords if needed)
export const verifyHash = async (plain, hash) => {
  return await bcrypt.compare(plain, hash);
};

// ---------- Users ----------
export const createUser = async ({ name, email, password }) => {
  const nameHash = await hashValue(name);
  const emailHash = await hashValue(email);
  const passwordHash = await hashValue(password);
  const res = await pool.query(
    "INSERT INTO users (name_hash, email_hash, password_hash) VALUES ($1, $2, $3) RETURNING id",
    [nameHash, emailHash, passwordHash],
  );
  return { id: res.rows[0].id };
};

export const getUserById = async (id) => {
  const res = await pool.query("SELECT * FROM users WHERE id = $1", [id]);
  return res.rows[0];
};

export const updateUser = async ({ id, name, email, password }) => {
  // Build dynamic query based on provided fields
  const fields = [];
  const values = [];
  let idx = 1;
  if (name) {
    fields.push(`name_hash = $${idx++}`);
    values.push(await hashValue(name));
  }
  if (email) {
    fields.push(`email_hash = $${idx++}`);
    values.push(await hashValue(email));
  }
  if (password) {
    fields.push(`password_hash = $${idx++}`);
    values.push(await hashValue(password));
  }
  if (fields.length === 0) return; // nothing to update
  values.push(id);
  const query = `UPDATE users SET ${fields.join(", ")} WHERE id = $${idx}`;
  await pool.query(query, values);
  return getUserById(id);
};

// ---------- Teams ----------
export const createTeam = async ({ ownerId, name, description = "" }) => {
  const res = await pool.query(
    "INSERT INTO teams (name, description, owner_id) VALUES ($1, $2, $3) RETURNING id",
    [name, description, ownerId],
  );
  const teamId = res.rows[0].id;
  // Owner becomes a member with role "owner"
  await pool.query(
    "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3)",
    [teamId, ownerId, "owner"],
  );
  await logAudit({
    teamId,
    action: "create",
    performedBy: ownerId,
    details: { name, description },
  });
  return { id: teamId };
};

export const getTeamById = async (id) => {
  const res = await pool.query("SELECT * FROM teams WHERE id = $1", [id]);
  return res.rows[0];
};

// Get role of a user within a team (owner, admin, member)
export const getMemberRole = async (teamId, userId) => {
  // First check if user is owner
  const team = await getTeamById(teamId);
  if (team && String(team.owner_id) === String(userId)) return "owner";
  // Look up membership
  const res = await pool.query(
    "SELECT role FROM team_members WHERE team_id = $1 AND user_id = $2",
    [teamId, userId],
  );
  if (res.rowCount === 0) return null; // not a member
  const role = res.rows[0].role;
  // Empty role string means a regular member
  return role && role.trim() !== "" ? role : "member";
};

// ---------- Invitations ----------
export const createInvitation = async ({ requesterId, teamId, email }) => {
  const token = (await import("crypto")).randomUUID();
  const emailHash = await hashValue(email);
  await pool.query(
    `INSERT INTO invitations (token, team_id, email_hash, status, created_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [token, teamId, emailHash, "pending", requesterId],
  );
  await logAudit({
    teamId,
    action: "invite",
    performedBy: requesterId,
    details: { emailHash, token },
  });
  return token;
};

export const getInvitation = async (token) => {
  const res = await pool.query("SELECT * FROM invitations WHERE token = $1", [
    token,
  ]);
  return res.rows[0];
};

export const updateInvitationStatus = async (token, status) => {
  await pool.query("UPDATE invitations SET status = $1 WHERE token = $2", [
    status,
    token,
  ]);
};

// ---------- Team Members ----------
export const addMemberToTeam = async ({ teamId, userId, role = "" }) => {
  await pool.query(
    "INSERT INTO team_members (team_id, user_id, role) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
    [teamId, userId, role],
  );
  await logAudit({
    teamId,
    action: "join",
    performedBy: userId,
    details: { role },
  });
};

export const removeMemberFromTeam = async ({ teamId, memberId }) => {
  await pool.query(
    "DELETE FROM team_members WHERE team_id = $1 AND user_id = $2",
    [teamId, memberId],
  );
  await logAudit({
    teamId,
    action: "remove_member",
    performedBy: memberId,
  });
};

export const listUserTeams = async (userId) => {
  const res = await pool.query(
    `SELECT t.* FROM teams t
     JOIN team_members m ON t.id = m.team_id
     WHERE m.user_id = $1`,
    [userId],
  );
  return res.rows;
};

// ---------- Roles ----------
export const ensureRoleExists = async ({ teamId, roleName }) => {
  const res = await pool.query(
    "SELECT id FROM team_roles WHERE team_id = $1 AND role_name = $2",
    [teamId, roleName],
  );
  if (res.rowCount === 0) {
    await pool.query(
      "INSERT INTO team_roles (team_id, role_name) VALUES ($1, $2)",
      [teamId, roleName],
    );
  }
};

export const assignRoleToMember = async ({
  requesterId,
  teamId,
  memberId,
  role,
}) => {
  const team = await getTeamById(teamId);
  if (team.owner_id !== requesterId)
    throw new AppError("Only owner can modify roles", 403);
  await ensureRoleExists({ teamId, roleName: role });
  await pool.query(
    "UPDATE team_members SET role = $1 WHERE team_id = $2 AND user_id = $3",
    [role, teamId, memberId],
  );
  await logAudit({
    teamId,
    action: "add_role",
    performedBy: requesterId,
    details: { memberId, role },
  });
  const mem = await pool.query(
    "SELECT * FROM team_members WHERE team_id = $1 AND user_id = $2",
    [teamId, memberId],
  );
  return mem.rows[0];
};

// ---------- Audit Log ----------
export const getAuditLog = async ({
  requesterId,
  teamId,
  startDate,
  endDate,
  limit = 50,
}) => {
  const membership = await pool.query(
    "SELECT 1 FROM team_members WHERE team_id = $1 AND user_id = $2",
    [teamId, requesterId],
  );
  if (membership.rowCount === 0) throw new AppError("Access denied", 403);

  let query = `SELECT * FROM audit_log WHERE team_id = $1`;
  const params = [teamId];
  if (startDate) {
    params.push(startDate);
    query += ` AND at >= $${params.length}`;
  }
  if (endDate) {
    params.push(endDate);
    query += ` AND at <= $${params.length}`;
  }
  query += ` ORDER BY at DESC LIMIT $${params.length + 1}`;
  params.push(limit);
  const res = await pool.query(query, params);
  return res.rows;
};

// ---------- Permissions ----------
export const updatePermissions = async ({
  requesterId,
  teamId,
  permissionMatrix,
}) => {
  const team = await getTeamById(teamId);
  if (String(team.owner_id) !== String(requesterId))
    throw new AppError("Only owner can update permissions", 403);
  await pool.query(
    `INSERT INTO permissions (team_id, permission_matrix) VALUES ($1, $2)
     ON CONFLICT (team_id) DO UPDATE SET permission_matrix = EXCLUDED.permission_matrix`,
    [teamId, permissionMatrix],
  );
  await logAudit({
    teamId,
    action: "update_permissions",
    performedBy: requesterId,
    details: permissionMatrix,
  });
  const perm = await pool.query(
    "SELECT permission_matrix FROM permissions WHERE team_id = $1",
    [teamId],
  );
  return { permissions: perm.rows[0].permission_matrix };
};

// ---------- Test Utilities ----------
export const clearAll = async () => {
  const tables = [
    "permissions",
    "audit_log",
    "team_members",
    "team_roles",
    "invitations",
    "teams",
    "users",
  ];
  for (const tbl of tables) {
    await pool.query(`TRUNCATE TABLE ${tbl} RESTART IDENTITY CASCADE`);
  }
};

export const logAudit = async ({ teamId, action, performedBy, details }) => {
  await pool.query(
    "INSERT INTO audit_log (team_id, action, performed_by, details) VALUES ($1, $2, $3, $4)",
    [teamId, action, performedBy, JSON.stringify(details)],
  );
};

export default {
  createUser,
  getUserById,
  updateUser,
  createTeam,
  getTeamById,
  createInvitation,
  getInvitation,
  updateInvitationStatus,
  addMemberToTeam,
  removeMemberFromTeam,
  listUserTeams,
  assignRoleToMember,
  getAuditLog,
  updatePermissions,
  clearAll,
  hashValue,
  verifyHash,
};
