'use strict';

const express = require('express');
const { sendMessage } = require('../utils/response');

const router = express.Router();

// GET /api/health - lets clients and monitors check that the API is alive
router.get('/', (req, res) => sendMessage(res, 200, 'API is running'));

module.exports = router;
