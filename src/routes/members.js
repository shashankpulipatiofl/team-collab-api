// src/routes/members.js
import { toAppError } from "../utils/error.js";
import { checkPermission } from "../permissions/check.js";
import { listTeamMembers } from "../db.js";

export const listMembers = async ({ requesterId, teamId }) => {
  try {
    await checkPermission(requesterId, teamId, "viewer", "Access denied");
    const members = await listTeamMembers({ teamId });
    return { status: 200, members };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};
