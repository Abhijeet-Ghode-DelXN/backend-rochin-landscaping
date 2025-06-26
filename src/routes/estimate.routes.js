const express = require('express');
const {
  getEstimates,
  getEstimate,
  createEstimate,
  updateEstimate,
  deleteEstimate,
  uploadEstimatePhotos,
  requestEstimate,
  getMyEstimates,
  approveEstimate
} = require('../controllers/estimate.controller');

const Estimate = require('../models/estimate.model');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');
const advancedResults = require('../middlewares/advancedResults');

// Customer-specific routes
router.post('/request', protect, authorize('customer'), requestEstimate);
router.get('/my-estimates', protect, authorize('customer'), getMyEstimates);
router.put('/:id', protect, authorize('tenantAdmin'), approveEstimate);

// Photo upload route
router.post('/:id/photos', uploadEstimatePhotos);

// Admin routes
router.route('/')
  .get(
    protect, 
    authorize('tenantAdmin', 'professional'), 
    advancedResults(
      Estimate, 
      [
        {
          path: 'customer',
          select: 'address',
          populate: {
            path: 'user',
            select: 'name email phone'
          }
        },
        {
          path: 'services.service',
          select: 'name'
        }
      ]
    ),
    getEstimates
  )
  .post(protect, authorize('admin'), createEstimate);

router.route('/:id')
  .get(protect, getEstimate)
  .put(protect, authorize('tenantAdmin'), updateEstimate)
  .delete(protect, authorize('tenantAdmin'), deleteEstimate);

module.exports = router; 