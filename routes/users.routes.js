'use strict';

const express = require('express');
const controller = require('../controllers/users.controller');
const { authorize } = require('../middleware/auth.middleware');
const { validateUserId, validateUserBody } = require('../middleware/validation.middleware');
const { methodNotAllowed } = require('../middleware/error.middleware');

/**
 * Access rules
 *   GET    -> public
 *   POST   -> authenticated (admin or user)
 *   PUT    -> authenticated (admin or user)
 *   DELETE -> admin only
 */
function createUsersRouter({ authenticate }) {
  const router = express.Router();

  router
    .route('/')
    .get(controller.listUsers)
    .post(authenticate, authorize('admin', 'user'), validateUserBody, controller.createUser)
    .all(methodNotAllowed(['GET', 'POST']));

  router
    .route('/:id')
    .get(validateUserId, controller.getUser)
    .put(authenticate, authorize('admin', 'user'), validateUserId, validateUserBody, controller.replaceUser)
    .delete(authenticate, authorize('admin'), validateUserId, controller.deleteUser)
    .all(methodNotAllowed(['GET', 'PUT', 'DELETE']));

  return router;
}

module.exports = { createUsersRouter };
