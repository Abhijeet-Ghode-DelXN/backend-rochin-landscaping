const express = require('express');
const router = express.Router();
const {
  createPortfolio,
  getPortfolios,
  getPortfolio,
  updatePortfolio,
  deletePortfolio,
  deleteImage
} = require('../controllers/portfolio.controller');
const { protect, authorize } = require('../middlewares/auth');
const { createPortfolioValidation, updatePortfolioValidation } = require('../middlewares/validators/portfolio.validator');
const validate = require('../middlewares/validators/validate');

// Public routes
router.get('/', protect, authorize('tenantAdmin'), getPortfolios);
router.get('/:id', getPortfolio);

// Protected routes (Admin only)
router.post(
  '/',
  [protect, authorize('tenantAdmin'), createPortfolioValidation, validate],
  createPortfolio
);

router.put(
  '/:id',
  [protect, authorize('admin', 'tenantAdmin'), updatePortfolioValidation, validate],
  updatePortfolio
);

router.delete(
  '/:id',
  [protect, authorize('tenantAdmin')],
  deletePortfolio
);

router.delete(
  '/:id/images/:imageId',
  [protect, authorize('admin', 'tenantAdmin')],
  deleteImage
);

module.exports = router; 