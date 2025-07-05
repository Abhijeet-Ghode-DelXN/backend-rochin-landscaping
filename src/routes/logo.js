const express = require('express');
const router = express.Router();
const { getLogo, updateLogo, deleteLogo } = require('../controllers/logo.controller');
const { protect, authorize } = require('../middlewares/auth');

// Public routes
router.get('/', getLogo);

// Protected routes - require admin authentication
router.use(protect);
router.use(authorize('admin', 'tenantAdmin'));

router.put('/', updateLogo);
router.delete('/', deleteLogo);

module.exports = router; 