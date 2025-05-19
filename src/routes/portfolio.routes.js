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
router.get('/', getPortfolios);
router.get('/:id', getPortfolio);

// Protected routes (Admin only)
router.post(
  '/',
  [protect, authorize('admin'), createPortfolioValidation, validate],
  createPortfolio
);

router.put(
  '/:id',
  [protect, authorize('admin'), updatePortfolioValidation, validate],
  updatePortfolio
);

router.delete(
  '/:id',
  [protect, authorize('admin')],
  deletePortfolio
);

router.delete(
  '/:id/images/:imageId',
  [protect, authorize('admin')],
  deleteImage
);

module.exports = router; 