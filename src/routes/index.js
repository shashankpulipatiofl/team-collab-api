// src/routes/index.js – wrappers around DB layer to match original API
import { AppError, toAppError } from "../utils/error.js";
import {
  createUser,
  getUserById,
  updateUser,
  createTeam as dbCreateTeam,
  getTeamById,
  updateTeam as dbUpdateTeam,
  deleteTeam as dbDeleteTeam,
  createInvitation as dbCreateInvitation,
  getInvitation,
  updateInvitationStatus,
  listInvitationsByTeam as dbListInvitationsByTeam,
  listAllInvitations as dbListAllInvitations,
  deleteInvitation as dbDeleteInvitation,
  addMemberToTeam,
  removeMemberFromTeam,
  listUserTeams as dbListUserTeams,
  assignRoleToMember,
  getAuditLog as dbGetAuditLog,
  updatePermissions as dbUpdatePermissions,
  getTeamPermissions as dbGetTeamPermissions,
  updateProject as dbUpdateProject,
  deleteProject as dbDeleteProject,
  createTask as dbCreateTask,
  listTasks as dbListTasks,
  updateTask as dbUpdateTask,
  deleteTask as dbDeleteTask,
  createComment as dbCreateComment,
  listComments as dbListComments,
  deleteComment as dbDeleteComment,
  getCommentById as dbGetCommentById,
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

export const inviteMember = async ({ requesterId, teamId, email, role }) => {
  // Ensure requester has owner permission with specific error message
  await checkPermission(requesterId, teamId, "owner", "Only owner can invite");
  // Validate email format
  validateEmail(email);
  const token = await dbCreateInvitation({ requesterId, teamId, email, role });
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
      role: invitation.role || "member",
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

export const getTeamPermissionsRoute = async ({ requesterId, teamId }) => {
  try {
    await checkPermission(requesterId, teamId, "viewer", "Access denied");
    const permissions = await dbGetTeamPermissions(teamId);
    return { status: 200, permissions };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

// ---------- Team Updates & Deletion Routes ----------
export const updateTeamRoute = async ({
  requesterId,
  teamId,
  name,
  description,
}) => {
  try {
    await checkPermission(
      requesterId,
      teamId,
      "owner",
      "Only owner can update team details",
    );
    if (name) validateTeamName(name);
    const team = await dbUpdateTeam(teamId, { name, description });
    return { status: 200, team };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

export const deleteTeamRoute = async ({ requesterId, teamId }) => {
  try {
    await checkPermission(
      requesterId,
      teamId,
      "owner",
      "Only owner can delete team",
    );
    await dbDeleteTeam(teamId);
    return { status: 200, message: "Team deleted" };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

// ---------- Project Updates & Deletion Routes ----------
export const updateProjectRoute = async ({
  requesterId,
  teamId,
  projectId,
  name,
  description,
}) => {
  try {
    await checkPermission(
      requesterId,
      teamId,
      "admin",
      "At least admin role is required to update projects",
    );
    if (!name) throw new AppError("Project name required", 400);
    const project = await dbUpdateProject(projectId, { name, description });
    return { status: 200, project };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

export const deleteProjectRoute = async ({
  requesterId,
  teamId,
  projectId,
}) => {
  try {
    await checkPermission(
      requesterId,
      teamId,
      "admin",
      "At least admin role is required to delete projects",
    );
    await dbDeleteProject(projectId);
    return { status: 200, message: "Project deleted" };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

// ---------- Team Invitations Routes ----------
export const listTeamInvitations = async ({ requesterId, teamId }) => {
  try {
    await checkPermission(requesterId, teamId, "viewer", "Access denied");
    const invitations = await dbListInvitationsByTeam(teamId);
    return { status: 200, invitations };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

export const listAllInvitations = async ({ requesterId }) => {
  try {
    const invitations = await dbListAllInvitations();
    return { status: 200, invitations };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

export const deleteInvitationRoute = async ({ requesterId, teamId, token }) => {
  try {
    await checkPermission(
      requesterId,
      teamId,
      "owner",
      "Only owner can cancel invitations",
    );
    await dbDeleteInvitation(token);
    return { status: 200, message: "Invitation cancelled" };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

// ---------- Tasks Routes ----------
export const createTaskRoute = async ({
  requesterId,
  teamId,
  projectId,
  title,
  description,
  status,
  assignedTo,
}) => {
  try {
    await checkPermission(
      requesterId,
      teamId,
      "member",
      "At least member role is required to manage tasks",
    );
    if (!title) throw new AppError("Task title required", 400);
    const task = await dbCreateTask({
      projectId,
      title,
      description,
      status,
      assignedTo,
      requesterId,
    });
    return { status: 201, task };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

export const listTasksRoute = async ({ requesterId, teamId, projectId }) => {
  try {
    await checkPermission(requesterId, teamId, "viewer", "Access denied");
    const tasks = await dbListTasks(projectId);
    return { status: 200, tasks };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

export const updateTaskRoute = async ({
  requesterId,
  teamId,
  projectId,
  taskId,
  title,
  description,
  status,
  assignedTo,
}) => {
  try {
    await checkPermission(
      requesterId,
      teamId,
      "member",
      "At least member role is required to manage tasks",
    );
    const task = await dbUpdateTask(taskId, {
      title,
      description,
      status,
      assignedTo,
    });
    return { status: 200, task };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

export const deleteTaskRoute = async ({
  requesterId,
  teamId,
  projectId,
  taskId,
}) => {
  try {
    await checkPermission(
      requesterId,
      teamId,
      "member",
      "At least member role is required to manage tasks",
    );
    await dbDeleteTask(taskId);
    return { status: 200, message: "Task deleted" };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

// ---------- Comments Routes ----------
export const createCommentRoute = async ({
  requesterId,
  teamId,
  taskId,
  content,
}) => {
  try {
    await checkPermission(
      requesterId,
      teamId,
      "member",
      "At least member role is required to comment",
    );
    if (!content) throw new AppError("Comment content required", 400);
    const comment = await dbCreateComment({ taskId, content, requesterId });
    return { status: 201, comment };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

export const listCommentsRoute = async ({ requesterId, teamId, taskId }) => {
  try {
    await checkPermission(requesterId, teamId, "viewer", "Access denied");
    const comments = await dbListComments(taskId);
    return { status: 200, comments };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

export const deleteCommentRoute = async ({
  requesterId,
  teamId,
  commentId,
}) => {
  try {
    const comment = await dbGetCommentById(commentId);
    if (!comment) throw new AppError("Comment not found", 404);
    if (String(comment.created_by) !== String(requesterId)) {
      await checkPermission(
        requesterId,
        teamId,
        "admin",
        "Only author or admin can delete comments",
      );
    }
    await dbDeleteComment(commentId);
    return { status: 200, message: "Comment deleted" };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

// expose clearAll for tests
export { clearAll, createUser, createProject, listProjects, listMembers };

// Export route list for health checks /debugging
export function listRoutes() {
  return [
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
}
