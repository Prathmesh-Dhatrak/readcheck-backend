import { Status } from "../../deps.ts";

// Base application error class
export class AppError extends Error {
  status: number;
  
  constructor(message: string, status: number = Status.InternalServerError) {
    super(message);
    this.name = this.constructor.name;
    this.status = status;
    // Capture stack trace (Node.js/V8 specific)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// 400 Bad Request
export class BadRequestError extends AppError {
  constructor(message: string = "Bad Request") {
    super(message, Status.BadRequest);
  }
}

// 401 Unauthorized
export class UnauthorizedError extends AppError {
  constructor(message: string = "Unauthorized") {
    super(message, Status.Unauthorized);
  }
}

// 403 Forbidden
export class ForbiddenError extends AppError {
  constructor(message: string = "Forbidden") {
    super(message, Status.Forbidden);
  }
}

// 404 Not Found
export class NotFoundError extends AppError {
  constructor(message: string = "Not Found") {
    super(message, Status.NotFound);
  }
}

// 409 Conflict
export class ConflictError extends AppError {
  constructor(message: string = "Resource Conflict") {
    super(message, Status.Conflict);
  }
}

// 422 Unprocessable Entity
export class ValidationError extends AppError {
  constructor(message: string = "Validation Error") {
    super(message, Status.UnprocessableEntity);
  }
}

// Database error wrapper
export class DatabaseError extends AppError {
  constructor(message: string = "Database Error") {
    super(message, Status.InternalServerError);
  }
}

// External service error
export class ExternalServiceError extends AppError {
  constructor(message: string = "External Service Error") {
    super(message, Status.InternalServerError);
  }
}