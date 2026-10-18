'use strict';

const AppError = require('../utils/AppError');

/**
 * Small fixed-window, in-memory rate limiter (per client IP).
 * Returns 429 Too Many Requests with a Retry-After header once the limit is exceeded.
 * Note: behind a reverse proxy you would also configure app.set('trust proxy', ...).
 */
function createRateLimiter({ windowMs, max }) {
  const clients = new Map();

  // Remove expired entries so the map cannot grow forever.
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of clients) {
      if (entry.resetAt <= now) {
        clients.delete(key);
      }
    }
  }, windowMs);
  cleanup.unref();

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    const key = req.ip;

    let entry = clients.get(key);
    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      clients.set(key, entry);
    }
    entry.count += 1;

    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));

    if (entry.count > max) {
      res.set('Retry-After', String(Math.ceil((entry.resetAt - now) / 1000)));
      return next(new AppError(429, 'Too many requests, please try again later'));
    }
    return next();
  };
}

module.exports = { createRateLimiter };
