'use strict';

const store = require('../data/users.data');
const AppError = require('../utils/AppError');
const { sendSuccess, sendNoContent } = require('../utils/response');

// GET /api/users - read only, never changes server state
function listUsers(req, res) {
  const users = store.findAll();
  return sendSuccess(res, 200, users, { count: users.length });
}

// GET /api/users/:id
function getUser(req, res, next) {
  const user = store.findById(req.userId);
  if (!user) {
    return next(new AppError(404, `User with id ${req.userId} not found`));
  }
  return sendSuccess(res, 200, user);
}

// POST /api/users - creates a new resource
function createUser(req, res, next) {
  const { name, email } = req.validatedBody;

  if (store.findByEmail(email)) {
    return next(new AppError(409, 'A user with this email already exists'));
  }

  const user = store.create({ name, email });
  res.location(`/api/users/${user.id}`);
  return sendSuccess(res, 201, user);
}

// PUT /api/users/:id - replaces an existing resource (idempotent: same request, same result)
function replaceUser(req, res, next) {
  const { name, email } = req.validatedBody;

  if (!store.findById(req.userId)) {
    return next(new AppError(404, `User with id ${req.userId} not found`));
  }

  const userWithEmail = store.findByEmail(email);
  if (userWithEmail && userWithEmail.id !== req.userId) {
    return next(new AppError(409, 'A user with this email already exists'));
  }

  const user = store.replace(req.userId, { name, email });
  return sendSuccess(res, 200, user);
}

// DELETE /api/users/:id - removes a resource, 204 means "done, nothing to send back"
function deleteUser(req, res, next) {
  if (!store.remove(req.userId)) {
    return next(new AppError(404, `User with id ${req.userId} not found`));
  }
  return sendNoContent(res);
}

module.exports = { listUsers, getUser, createUser, replaceUser, deleteUser };
