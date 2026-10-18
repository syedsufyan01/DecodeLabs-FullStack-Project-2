'use strict';

/**
 * Reads configuration from environment variables.
 * Called at runtime (not at import time) so tests can change process.env first.
 */
const toPositiveInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

function loadConfig() {
  return {
    port: toPositiveInt(process.env.PORT, 5000),
    nodeEnv: process.env.NODE_ENV || 'development',
    adminApiKey: process.env.ADMIN_API_KEY || '',
    userApiKey: process.env.USER_API_KEY || '',
    jsonLimit: process.env.JSON_LIMIT || '10kb',
    rateLimitWindowMs: toPositiveInt(process.env.RATE_LIMIT_WINDOW_MS, 60000),
    rateLimitMax: toPositiveInt(process.env.RATE_LIMIT_MAX, 100),
  };
}

module.exports = { loadConfig };
