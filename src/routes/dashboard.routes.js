const express = require('express');
const {
  getDashboardStats,
  getAppointmentAnalytics,
  getRevenueAnalytics,
  getCustomerAnalytics,
  getMonthlyAppointments
} = require('../controllers/dashboard.controller');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');

// Apply protection and authorization to all routes
router.use(protect);
router.use(authorize('admin'));

router.get('/', getDashboardStats);
router.get('/appointments', getAppointmentAnalytics);
router.get('/revenue', getRevenueAnalytics);
router.get('/customers', getCustomerAnalytics);


// router.get('/monthly-appointments', getMonthlyAppointments);

module.exports = router; 