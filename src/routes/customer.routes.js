const express = require('express');
const {
  getCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerHistory,
  getMyProfile,
  updateMyProfile,
  getMyServiceHistory
} = require('../controllers/customer.controller');

const Customer = require('../models/customer.model');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');
const advancedResults = require('../middlewares/advancedResults');

// Routes for current customer (customer role)
router.get('/me', protect, authorize('customer'), getMyProfile);
router.put('/me', protect, authorize('customer'), updateMyProfile);
router.get('/me/history', protect, authorize('customer'), getMyServiceHistory);

// Routes requiring admin role
router.route('/')
  .get(
    protect, 
    authorize('admin'), 
    advancedResults(Customer, {
      path: 'user',
      select: 'name email phone'
    }),
    getCustomers
  )
  .post(protect, authorize('admin'), createCustomer);

router.route('/:id')
  .get(protect, authorize('admin'), getCustomer)
  .put(protect, authorize('admin'), updateCustomer)
  .delete(protect, authorize('admin'), deleteCustomer);

router.get('/:id/history', protect, authorize('admin'), getCustomerHistory);

module.exports = router; 