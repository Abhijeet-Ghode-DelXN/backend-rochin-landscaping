const express = require('express');
const {
  getAppointments,
  getAppointment,
  createAppointment,
  updateAppointment,
  deleteAppointment,
  uploadServicePhotos,
  getMyAppointments,
  requestReschedule,
  getCalendarAppointments,
  // getAvailableTimeSlots
  // getTimeSlotsWithAvailability
  getAvailability
} = require('../controllers/appointment.controller');

const Appointment = require('../models/appointment.model');

const router = express.Router();

const { protect, authorize, optional } = require('../middlewares/auth');
const advancedResults = require('../middlewares/advancedResults');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse');

// Debug middleware
router.use((req, res, next) => {
  console.log('Appointments Route - Headers:', req.headers);
  console.log('Appointments Route - Method:', req.method);
  console.log('Appointments Route - Path:', req.path);
  next();
});

// Routes for admin and professional
router.get('/admin', advancedResults(
  Appointment,
  [
    {
      path: 'customer',
      select: 'address',
      populate: {
        path: 'user',
        select: 'name phone'
      }
    },
    {
      path: 'service',
      select: 'name category'
    },
    {
      path: 'crew.leadProfessional',
      select: 'name'
    }
  ]
), protect, authorize('admin', 'professional'), getAppointments);

// Public route for listing appointments (limited data)
// router.get('/', optional, advancedResults(
//   Appointment,
//   [
//     {
//       path: 'service',
//       select: 'name category'
//     }
//   ]
// ), getAppointments);

// Use consistent population approach
router.get('/', optional, advancedResults(
  Appointment,
  [
    {
      path: 'customer',
      populate: { path: 'user', select: 'name email phone' }
    },
    'service',
    'createdBy'
  ]
), getAppointments);

// Specific routes must come before parameterized routes
// router.get('/availability', getAvailableTimeSlots);
// router.get('/availability', getTimeSlotsWithAvailability);
router.get('/availability', getAvailability);

router.get('/my-appointments', protect, authorize('customer'), getMyAppointments);
router.get('/calendar', 
  protect, // Ensure user is authenticated
  authorize('tenantAdmin', 'professional'), // Ensure user has proper role
  asyncHandler(async (req, res, next) => {
    // Verify user object exists
    if (!req.user) {
      return next(new ErrorResponse('Not authenticated', 401));
    }
    // Verify user has proper role
    if (!['tenantAdmin', 'professional'].includes(req.user.role)) {
      return next(new ErrorResponse('Not authorized to access calendar', 403));
    }
    next();
  }),
  getCalendarAppointments
);

// Parameterized routes
// router.get('/:id',getAppointment);
router.get('/:id', protect, authorize('tenantAdmin'),getAppointment);
router.put('/:id/reschedule-request', protect, authorize('customer'), requestReschedule);
router.post('/:id/photos', protect, authorize('admin', 'professional'), uploadServicePhotos);

// Admin and Professional routes
router.post('/', protect, authorize('customer'), createAppointment);
router.put('/:id', protect, authorize('admin', 'professional'), updateAppointment);
router.delete('/:id', protect, deleteAppointment);




module.exports = router; 