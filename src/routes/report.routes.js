const express = require('express');
const {
  generateRevenueReport,
  generateAppointmentReport,
  generateCustomerReport
} = require('../controllers/report.controller');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');

// Apply protection and authorization to all routes
router.use(protect);
router.use(authorize('admin'));

router.get('/revenue', generateRevenueReport);
router.get('/appointments', generateAppointmentReport);
router.get('/customers', generateCustomerReport);

module.exports = router; 