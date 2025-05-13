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
), getAppointments);

router.get('/:id', getAppointment);

// Customer specific routes
// 🔒 Customer specific routes
router.get('/availability', getAvailableTimeSlots); // Must come first
router.get('/my-appointments', protect, authorize('customer'), getMyAppointments);
router.put('/:id/reschedule-request', protect, authorize('customer'), requestReschedule);


// Calendar route - accessible to all authenticated users
router.get('/calendar',  getCalendarAppointments);

// Photo upload route - for professionals/admins
router.post('/:id/photos', protect, authorize('admin', 'professional'), uploadServicePhotos);

// Example route definition
// router.get('/appointments/availability', getAvailableTimeSlots); // ✅ No protect middleware


// Admin and Professional routes
router.post('/', protect, authorize('customer'), createAppointment);
router.put('/:id', protect, authorize('admin', 'professional'), updateAppointment);
router.delete('/:id', protect, authorize('admin'), deleteAppointment);

module.exports = router; 