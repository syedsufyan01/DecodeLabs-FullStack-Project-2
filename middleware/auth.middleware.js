'use strict';

const crypto = require('crypto');
const AppError = require('../utils/AppError');

/**
 * Authentication (AuthN) = "Who are you?"  -> authenticate()  -> 401 when missing/invalid
 * Authorization  (AuthZ) = "What can you do?" -> authorize()   -> 403 when role is not allowed
 *
 * Demonstration only: two API keys from environment variables map to two roles.
 * A production system would use real user accounts, hashed passwords and tokens (e.g. JWT).
 */
const digest = (value) => crypto.createHash('sha256').update(String(value)).digest();

// Constant-time comparison (hashing first makes both buffers the same length).
const safeEqual = (a, b) => crypto.timingSafeEqual(digest(a), digest(b));

function createAuthenticate(config) {
  const knownKeys = [
    { key: config.adminApiKey, role: 'admin' },
    { key: config.userApiKey, role: 'user' },
  ].filter((entry) => entry.key);

  return function authenticate(req, res, next) {
    const providedKey = req.get('x-api-key');

    if (!providedKey) {
      return next(new AppError(401, 'Authentication required: send your API key in the x-api-key header'));
    }

    const match = knownKeys.find((entry) => safeEqual(providedKey, entry.key));
    if (!match) {
      return next(new AppError(401, 'Invalid API key'));
    }

    req.auth = { role: match.role };
    return next();
  };
}

function authorize(...allowedRoles) {
  return function authorizeRole(req, res, next) {
    if (!req.auth) {
      return next(new AppError(401, 'Authentication required'));
    }
    if (!allowedRoles.includes(req.auth.role)) {
      return next(new AppError(403, `Role "${req.auth.role}" is not allowed to perform this action`));
    }
    return next();
  };
}

module.exports = { createAuthenticate, authorize };
