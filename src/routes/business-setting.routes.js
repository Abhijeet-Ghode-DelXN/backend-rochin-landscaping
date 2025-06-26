const express = require('express');
const {
  getBusinessSettings,
  updateBusinessSettings,
  uploadLogo,
  updateBusinessHours,
  updateNotificationSettings,
  updateBusinessTerms
} = require('../controllers/business-setting.controller');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');

// Apply protection and authorization to all routes
router.use(protect);
router.use(authorize('admin'));

router.route('/')
  .get(getBusinessSettings)
  .put(updateBusinessSettings);

router.put('/logo', uploadLogo);
router.put('/hours', updateBusinessHours);
router.put('/notifications', updateNotificationSettings);
router.put('/terms', updateBusinessTerms);

module.exports = router; 