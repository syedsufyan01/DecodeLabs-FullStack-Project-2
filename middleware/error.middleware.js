'use strict';

const AppError = require('../utils/AppError');
const { sendError } = require('../utils/response');

const isTestEnv = () => process.env.NODE_ENV === 'test';

/** Logs every request once the response has been sent. */
function requestLogger(req, res, next) {
  const startedAt = Date.now();
  res.on('finish', () => {
    if (!isTestEnv()) {
      console.log(`${req.method} ${req.originalUrl} -> ${res.statusCode} (${Date.now() - startedAt}ms)`);
    }
  });
  next();
}

/** Used on a route that exists but does not support the requested HTTP method. */
function methodNotAllowed(allowedMethods) {
  return function handleMethodNotAllowed(req, res, next) {
    res.set('Allow', allowedMethods.join(', '));
    next(new AppError(405, `Method ${req.method} is not allowed on this route. Allowed: ${allowedMethods.join(', ')}`));
  };
}

/** Runs when no route matched. */
function notFoundHandler(req, res, next) {
  next(new AppError(404, `Route ${req.method} ${req.originalUrl} not found`));
}

/**
 * The single place where errors become HTTP responses.
 * Known errors keep their status code; anything unexpected becomes a generic 500.
 * Stack traces are logged on the server and never sent to the client.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  // Errors raised by express.json()
  if (err.type === 'entity.parse.failed') {
    return sendError(res, 400, 'Invalid JSON in request body');
  }
  if (err.type === 'entity.too.large') {
    return sendError(res, 413, 'Request body is too large');
  }

  if (err instanceof AppError) {
    return sendError(res, err.statusCode, err.message, err.details);
  }

  if (!isTestEnv()) {
    console.error(`[${new Date().toISOString()}] Unexpected error on ${req.method} ${req.originalUrl}`);
    console.error(err.stack || err);
  }
  return sendError(res, 500, 'Internal server error');
}

module.exports = { requestLogger, methodNotAllowed, notFoundHandler, errorHandler };
