const express = require('express');
const router = express.Router();
const { getHeroImage, updateHeroImage, deleteHeroImage } = require('../controllers/hero-image.controller');
const { protect, authorize } = require('../middlewares/auth');

// Public routes
router.get('/', getHeroImage);

// Protected routes
router.use(protect);
router.use(authorize('admin', 'tenantAdmin'));

router.put('/', updateHeroImage);
router.delete('/', deleteHeroImage);

module.exports = router; 