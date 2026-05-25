// src/routes/members.js
import { AppError, toAppError } from "../utils/error.js";
import {
  addMemberToTeam,
  removeMemberFromTeam,
  listUserTeams,
  createInvitation,
} from "../db.js"; // added createInvitation

export const inviteMember = async ({ requesterId, teamId, email }) => {
  // This route already exists in index.js; this file can be left empty or provide helper.
  return { status: 501, error: "Not implemented" };
};

export const listMembers = async ({ requesterId, teamId }) => {
  try {
    // In a real implementation, query team_members table
    return { status: 200, members: [] };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

export const removeMember = async ({ requesterId, teamId, memberId }) => {
  try {
    // Placeholder: simply call DB function
    await removeMemberFromTeam({ teamId, memberId });
    return { status: 200, removed: true };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};
