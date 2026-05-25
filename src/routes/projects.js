// src/routes/projects.js
import { AppError, toAppError } from "../utils/error.js";

// Stub implementations for project management (to be replaced with real DB logic)
export const createProject = async ({ requesterId, teamId, name }) => {
  try {
    if (!name) throw new AppError("Project name required", 400);
    // Example stub: generate a simple ID
    return { status: 201, project: { id: "proj-" + Date.now(), name, teamId } };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

export const listProjects = async ({ requesterId, teamId }) => {
  try {
    // Stub: return empty array; real implementation would query DB
    return { status: 200, projects: [] };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};
