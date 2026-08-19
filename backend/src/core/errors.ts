/** Typed application errors mapped to HTTP status codes by the error middleware. */
export class AppError extends Error {
  constructor(
    message: string,
    public status = 500,
    public code = 'INTERNAL',
    public details?: unknown,
  ) {
    super(message);
    this.name = new.target.name;
  }
}
export class ValidationError extends AppError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(message, 400, 'VALIDATION', details);
  }
}
export class AuthError extends AppError {
  constructor(message = 'Unauthorized') { super(message, 401, 'AUTH'); }
}
export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') { super(message, 403, 'FORBIDDEN'); }
}
export class NotFoundError extends AppError {
  constructor(message = 'Not found') { super(message, 404, 'NOT_FOUND'); }
}
export class ConflictError extends AppError {
  constructor(message = 'Conflict') { super(message, 409, 'CONFLICT'); }
}
