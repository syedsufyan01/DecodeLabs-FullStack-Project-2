'use strict';

require('dotenv').config();

const { createApp } = require('./app');
const { loadConfig } = require('./config');

const config = loadConfig();

if (!config.adminApiKey || !config.userApiKey) {
  console.warn('Warning: ADMIN_API_KEY / USER_API_KEY are not set. Protected endpoints will reject every request (see .env.example).');
}

const app = createApp({ config });

const server = app.listen(config.port, () => {
  console.log(`Users API running on http://localhost:${config.port} (${config.nodeEnv})`);
});

server.on('error', (error) => {
  console.error(`Could not start the server: ${error.message}`);
  process.exit(1);
});

// Stop accepting new connections and exit cleanly on Ctrl+C / termination.
const shutdown = (signal) => {
  console.log(`${signal} received, shutting down...`);
  server.close(() => process.exit(0));
};
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// Last-resort safety nets: log, then exit so a process manager can restart a clean instance.
process.on('unhandledRejection', (reason) => {
  console.error('Unhandled promise rejection:', reason);
  process.exit(1);
});
process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});
