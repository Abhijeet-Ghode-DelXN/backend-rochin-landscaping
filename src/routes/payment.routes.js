const express = require('express');
const {
  getPayments,
  getPayment,
  processPayment,
  createManualPayment,
  getReceipt,
  processRefund,
  getMyPayments
} = require('../controllers/payment.controller');

const Payment = require('../models/payment.model');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');
const advancedResults = require('../middlewares/advancedResults');

// Customer specific routes
router.get('/my-payments', protect, authorize('customer'), getMyPayments);

// Payment processing routes
router.post('/process', protect, processPayment);
router.post('/manual', protect, authorize('admin'), createManualPayment);

// Receipt route
router.get('/:id/receipt', protect, getReceipt);

// Refund route
router.post('/:id/refund', protect, authorize('admin'), processRefund);

// Standard CRUD routes
router.route('/')
  .get(
    protect, 
    authorize('admin'), 
    advancedResults(
      Payment,
      [
        {
          path: 'customer',
          select: 'address',
          populate: {
            path: 'user',
            select: 'name email'
          }
        },
        {
          path: 'appointment',
          select: 'date service status'
        },
        {
          path: 'estimate',
          select: 'estimateNumber status'
        },
        {
          path: 'processedBy',
          select: 'name'
        }
      ]
    ),
    getPayments
  );

router.route('/:id')
  .get(protect, getPayment);

module.exports = router; 