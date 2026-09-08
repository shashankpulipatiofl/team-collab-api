// src/permissions/check.js
import { AppError } from "../utils/error.js";
import { getTeamById } from "../db.js";

// Role hierarchy: higher number = higher privilege
const ROLE_RANK = {
  owner: 4,
  admin: 3,
  member: 2,
  viewer: 1,
};

/**
 * Determines the role of a user within a team.
 * Returns one of 'owner', 'admin', 'member', or null if not a member.
 */
import { getMemberRole } from "../db.js";

export const getUserRole = async (teamId, userId) => {
  // Delegates to DB helper that checks owner and member tables
  const role = await getMemberRole(teamId, userId);
  return role; // may be 'owner', 'admin', 'member', or null
};

/**
 * Checks whether requester has sufficient privilege for an action.
 * @param {number} requesterId - ID of the user performing the action.
 * @param {number} teamId - Team context.
 * @param {string} requiredRole - Minimum role required ('owner', 'admin', 'member').
 * @throws {AppError} 403 if permission is insufficient.
 */
export const checkPermission = async (
  requesterId,
  teamId,
  requiredRole,
  customMessage,
) => {
  const requesterRole = await getUserRole(teamId, requesterId);
  const requesterRank = ROLE_RANK[requesterRole] ?? 0; // non-members get rank 0
  const requiredRank = ROLE_RANK[requiredRole] ?? 0;
  if (requesterRank < requiredRank) {
    const msg =
      customMessage || `Insufficient permission: requires ${requiredRole}`;
    throw new AppError(msg, 403);
  }
};
