// src/routes/index.js – wrappers around DB layer to match original API
import { AppError, toAppError } from "../utils/error.js";
import {
  createUser,
  getUserById,
  updateUser,
  createTeam as dbCreateTeam,
  getTeamById,
  createInvitation as dbCreateInvitation,
  getInvitation,
  updateInvitationStatus,
  addMemberToTeam,
  removeMemberFromTeam,
  listUserTeams as dbListUserTeams,
  assignRoleToMember,
  getAuditLog as dbGetAuditLog,
  updatePermissions as dbUpdatePermissions,
  clearAll,
} from "../db.js";
import {
  validateEmail,
  validateName,
  validatePassword,
  validateTeamName,
} from "../validation/input.js";
import { checkPermission } from "../permissions/check.js";
import { createProject, listProjects } from "./projects.js";
import { listMembers } from "./members.js";

// Helper to format responses consistent with original in‑memory API
export const createTeam = async ({ requesterId, name, description = "" }) => {
  try {
    // Validate inputs
    validateName(name);
    validateTeamName(name);
    // description is optional, no validation needed
    const result = await dbCreateTeam({
      ownerId: requesterId,
      name,
      description,
    });
    return { status: 201, team: { id: result.id } };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

export const inviteMember = async ({ requesterId, teamId, email }) => {
  // Ensure requester has owner permission with specific error message
  await checkPermission(requesterId, teamId, "owner", "Only owner can invite");
  // Validate email format
  validateEmail(email);
  const token = await dbCreateInvitation({ requesterId, teamId, email });
  return { status: 202, invitationId: token };
};

export const respondInvitation = async ({ token, responderId, decision }) => {
  const invitation = await getInvitation(token);
  if (!invitation) throw new AppError("Invalid token", 400);
  if (invitation.status !== "pending")
    throw new AppError("Invitation already processed", 400);
  if (decision === "accept") {
    await addMemberToTeam({
      teamId: invitation.team_id,
      userId: responderId,
      role: "",
    });
    await updateInvitationStatus(token, "accepted");
    // fetch team members for response (placeholder)
    const members = await dbGetAuditLog({
      requesterId: responderId,
      teamId: invitation.team_id,
      limit: 0,
    });
    return { status: 200, teamMembers: [{ userId: responderId }] };
  } else if (decision === "decline") {
    await updateInvitationStatus(token, "declined");
    return { status: 200, message: "Invitation declined" };
  }
  throw new AppError('Decision must be "accept" or "decline"', 400);
};

export const listUserTeams = async ({ userId }) => {
  try {
    const teams = await dbListUserTeams(userId);
    return { status: 200, teams };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

export const addRole = async ({ requesterId, teamId, memberId, role }) => {
  try {
    // Only owner can assign roles
    await checkPermission(requesterId, teamId, "owner");
    // Validate role name (non‑empty string)
    if (typeof role !== "string" || role.trim() === "") {
      throw new AppError("Invalid role", 400);
    }
    const member = await assignRoleToMember({
      requesterId,
      teamId,
      memberId,
      role,
    });
    return { status: 200, member };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

export const removeMember = async ({ requesterId, teamId, memberId }) => {
  // Ensure requester has owner permission (cannot remove others unless owner)
  await checkPermission(requesterId, teamId, "owner");
  const team = await getTeamById(teamId);
  // Prevent owner from removing themselves
  if (team.owner_id === memberId) {
    throw new AppError("Owner cannot be removed", 403);
  }
  const removed = await removeMemberFromTeam({ teamId, memberId });
  return { status: 200, removed };
};

export const getAuditLog = async ({
  requesterId,
  teamId,
  startDate,
  endDate,
  limit = 50,
}) => {
  try {
    const logs = await dbGetAuditLog({
      requesterId,
      teamId,
      startDate,
      endDate,
      limit,
    });
    return { status: 200, logs };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

export const updatePermissions = async ({
  requesterId,
  teamId,
  permissionMatrix,
}) => {
  // Only owner can update permissions with custom error message
  await checkPermission(
    requesterId,
    teamId,
    "owner",
    "Only owner can update permissions",
  );
  const result = await dbUpdatePermissions({
    requesterId,
    teamId,
    permissionMatrix,
  });
  return { status: 200, permissions: result.permissions };
};

// expose clearAll for tests
export { clearAll, createUser, createProject, listProjects, listMembers };

// Export route list for health checks /debugging
export function listRoutes() {
  return [
    "GET /health",
    "POST /teams (createTeam)",
    "POST /teams/:teamId/invite (inviteMember)",
    "POST /invitations/:token/respond (respondInvitation)",
    "GET /users/:userId/teams (listUserTeams)",
    "POST /teams/:teamId/role (addRole)",
    "DELETE /teams/:teamId/member/:memberId (removeMember)",
    "GET /teams/:teamId/audit (getAuditLog)",
    "PATCH /teams/:teamId/permissions (updatePermissions)",
  ];
}
