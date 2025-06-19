const express = require('express');
const { getTenantInfo } = require('../controllers/tenant.controller');
const { optional } = require('../middlewares/auth');

const router = express.Router();

// Public route to get tenant information
router.get('/info', optional, getTenantInfo);

module.exports = router; 