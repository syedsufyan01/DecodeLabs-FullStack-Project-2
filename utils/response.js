'use strict';

/**
 * Every endpoint responds through these helpers so the JSON shape is always the same:
 *   success: { "success": true, "data": ... }
 *   error:   { "success": false, "error": { "message": "...", "details": [...] } }
 */
function sendSuccess(res, statusCode, data, extra = {}) {
  return res.status(statusCode).json({ success: true, ...extra, data });
}

function sendMessage(res, statusCode, message) {
  return res.status(statusCode).json({ success: true, message });
}

function sendNoContent(res) {
  return res.status(204).send();
}

function sendError(res, statusCode, message, details) {
  const error = { message };
  if (details !== undefined) {
    error.details = details;
  }
  return res.status(statusCode).json({ success: false, error });
}

module.exports = { sendSuccess, sendMessage, sendNoContent, sendError };
