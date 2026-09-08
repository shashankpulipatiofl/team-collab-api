// src/routes/projects.js
import { AppError, toAppError } from "../utils/error.js";
import {
  createProject as dbCreateProject,
  listProjects as dbListProjects,
} from "../db.js";

export const createProject = async ({
  requesterId,
  teamId,
  name,
  description,
}) => {
  try {
    if (!name) throw new AppError("Project name required", 400);
    const project = await dbCreateProject({
      requesterId,
      teamId,
      name,
      description,
    });
    return { status: 201, project };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};

export const listProjects = async ({ requesterId, teamId }) => {
  try {
    const projects = await dbListProjects({ teamId });
    return { status: 200, projects };
  } catch (err) {
    const appErr = toAppError(err);
    return { status: appErr.status, error: appErr.message };
  }
};
