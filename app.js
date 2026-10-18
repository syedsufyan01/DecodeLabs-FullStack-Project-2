'use strict';

const express = require('express');
const { loadConfig } = require('./config');
const { createRateLimiter } = require('./middleware/rateLimit.middleware');
const { createAuthenticate } = require('./middleware/auth.middleware');
const { requestLogger, notFoundHandler, errorHandler } = require('./middleware/error.middleware');
const healthRoutes = require('./routes/health.routes');
const { createUsersRouter } = require('./routes/users.routes');

/**
 * Builds the Express app without starting it, so tests can run it on any port.
 * `extraRoutes` is an optional hook used only by tests (e.g. to trigger a 500 error).
 */
function createApp({ config = loadConfig(), extraRoutes } = {}) {
  const app = express();

  app.disable('x-powered-by'); // do not advertise the framework
  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    next();
  });
  app.use(requestLogger);

  // Centralized control: every /api request passes through the same gate.
  app.use('/api', createRateLimiter({ windowMs: config.rateLimitWindowMs, max: config.rateLimitMax }));
  app.use(express.json({ limit: config.jsonLimit }));

  app.use('/api/health', healthRoutes);
  app.use('/api/users', createUsersRouter({ authenticate: createAuthenticate(config) }));

  if (extraRoutes) {
    extraRoutes(app);
  }

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

module.exports = { createApp };
