// src/routes/members.js
import { AppError, toAppError } from "../utils/error.js";
import { removeMemberFromTeam, listTeamMembers } from "../db.js";

export const listMembers = async ({ requesterId, teamId }) => {
  try {
    const members = await listTeamMembers({ teamId });
    return { status: 200, members };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

export const removeMember = async ({ requesterId, teamId, memberId }) => {
  try {
    await removeMemberFromTeam({ teamId, memberId });
    return { status: 200, removed: true };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};
