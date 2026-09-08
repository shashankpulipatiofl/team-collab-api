export class AppError extends Error {
  constructor(message, status = 400) {
    super(message);
    this.name = "AppError";
    this.status = status; // HTTP‑style status code
  }
}

export const toAppError = (err) => {
  if (err instanceof AppError) return err;
  return new AppError(err.message, 500);
};
