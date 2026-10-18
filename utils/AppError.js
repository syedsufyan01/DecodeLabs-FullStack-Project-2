'use strict';

/**
 * An error we expect and understand (bad input, missing resource, ...).
 * The central error handler turns it into a clean JSON response.
 */
class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = AppError;
