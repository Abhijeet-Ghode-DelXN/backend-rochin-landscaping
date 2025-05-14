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
  getAvailableTimeSlots
} = require('../controllers/appointment.controller');

const Appointment = require('../models/appointment.model');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');
const advancedResults = require('../middlewares/advancedResults');

// Debug middleware
router.use((req, res, next) => {
  console.log('Appointments Route - Headers:', req.headers);
  console.log('Appointments Route - Method:', req.method);
  console.log('Appointments Route - Path:', req.path);
  next();
});

// Public routes
router.get('/', advancedResults(
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

// Specific routes must come before parameterized routes
router.get('/availability', getAvailableTimeSlots);
router.get('/my-appointments', protect, authorize('customer'), getMyAppointments);
router.get('/calendar', getCalendarAppointments);

// Parameterized routes
router.get('/:id', protect, getAppointment);
router.put('/:id/reschedule-request', protect, authorize('customer'), requestReschedule);
router.post('/:id/photos', protect, authorize('admin', 'professional'), uploadServicePhotos);

// Admin and Professional routes
router.post('/', protect, authorize('customer'), createAppointment);
router.put('/:id', protect, authorize('admin', 'professional'), updateAppointment);
router.delete('/:id', protect, authorize('admin'), deleteAppointment);

module.exports = router; 