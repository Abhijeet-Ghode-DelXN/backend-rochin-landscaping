const express = require('express');
const {
  getServices,
  getService,
  createService,
  updateService,
  deleteService,
  servicePhotoUpload,
  getServicesByCategory,
  getServicePackages,
 getPublicServices
} = require('../controllers/service.controller');

const Service = require('../models/service.model');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');
const advancedResults = require('../middlewares/advancedResults');

// Special routes
router.route('/:id/photo')
  .put(protect, authorize('tenantAdmin'), servicePhotoUpload);

router.route('/category/:category')
  .get(getServicesByCategory);

router.route('/:id/packages')
  .get(getServicePackages);

// Standard CRUD routes
router.route('/')

  .get(protect,advancedResults(Service), getServices)
  .post(protect, authorize('tenantAdmin'), createService); // Proper controller reference


router.route('/public')
  .get(getPublicServices);

router.route('/:id')
  .get(getService)
  .put(protect, authorize('admin'), updateService)
  .delete(protect, authorize('admin'), deleteService);

module.exports = router;