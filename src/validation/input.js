// src/validation/input.js
import { AppError } from "../utils/error.js";

// Simple email regex (does not cover all cases but sufficient for validation)
const emailRegex = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export const validateEmail = (email) => {
  if (typeof email !== "string" || !emailRegex.test(email)) {
    throw new AppError("Invalid email format", 400);
  }
};

export const validateName = (name) => {
  if (typeof name !== "string" || name.trim().length === 0) {
    throw new AppError("Name must be a non‑empty string", 400);
  }
};

export const validatePassword = (password) => {
  if (typeof password !== "string" || password.length < 6) {
    throw new AppError("Password must be at least 6 characters long", 400);
  }
};

export const validateTeamName = (teamName) => {
  if (typeof teamName !== "string" || teamName.trim().length === 0) {
    throw new AppError("Team name must be a non‑empty string", 400);
  }
};
