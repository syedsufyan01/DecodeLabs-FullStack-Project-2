'use strict';

const AppError = require('../utils/AppError');

const ALLOWED_FIELDS = ['name', 'email'];
const NAME_MIN_LENGTH = 2;
const NAME_MAX_LENGTH = 100;
const EMAIL_MAX_LENGTH = 254;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Validates the :id URL parameter. Never trust the client - even the URL. */
function validateUserId(req, res, next) {
  const { id } = req.params;
  const numericId = Number(id);

  if (!/^\d+$/.test(id) || !Number.isSafeInteger(numericId) || numericId < 1) {
    return next(new AppError(400, 'User id must be a positive integer'));
  }

  req.userId = numericId;
  return next();
}

/**
 * Validates the JSON body for POST and PUT.
 * Syntactic checks (is it the right type/format?) and semantic checks (is the value acceptable?).
 * On success, a cleaned copy is stored in req.validatedBody.
 */
function validateUserBody(req, res, next) {
  const body = req.body;

  if (body === null || typeof body !== 'object' || Array.isArray(body)) {
    return next(new AppError(400, 'Request body must be a JSON object'));
  }

  const errors = [];

  const unexpectedFields = Object.keys(body).filter((key) => !ALLOWED_FIELDS.includes(key));
  if (unexpectedFields.length > 0) {
    errors.push(`Unexpected field(s): ${unexpectedFields.join(', ')}`);
  }

  // name
  if (body.name === undefined) {
    errors.push('name is required');
  } else if (typeof body.name !== 'string') {
    errors.push('name must be a string');
  } else {
    const name = body.name.trim();
    if (name.length === 0) {
      errors.push('name must not be empty');
    } else if (name.length < NAME_MIN_LENGTH || name.length > NAME_MAX_LENGTH) {
      errors.push(`name must be between ${NAME_MIN_LENGTH} and ${NAME_MAX_LENGTH} characters`);
    }
  }

  // email
  if (body.email === undefined) {
    errors.push('email is required');
  } else if (typeof body.email !== 'string') {
    errors.push('email must be a string');
  } else {
    const email = body.email.trim();
    if (email.length === 0) {
      errors.push('email must not be empty');
    } else if (email.length > EMAIL_MAX_LENGTH || !EMAIL_PATTERN.test(email)) {
      errors.push('Invalid email address');
    }
  }

  if (errors.length > 0) {
    return next(new AppError(400, 'Validation failed', errors));
  }

  req.validatedBody = {
    name: body.name.trim(),
    email: body.email.trim().toLowerCase(),
  };
  return next();
}

module.exports = { validateUserId, validateUserBody };
