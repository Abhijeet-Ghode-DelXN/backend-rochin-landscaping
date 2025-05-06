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
  getCalendarAppointments
} = require('../controllers/appointment.controller');

const Appointment = require('../models/appointment.model');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');
const advancedResults = require('../middlewares/advancedResults');

// Customer specific routes
router.get('/my-appointments', protect, authorize('customer'), getMyAppointments);
router.put('/:id/reschedule-request', protect, authorize('customer'), requestReschedule);

// Calendar route - accessible to all authenticated users
router.get('/calendar', protect, getCalendarAppointments);

// Photo upload route - for professionals/admins
router.post('/:id/photos', protect, authorize('admin', 'professional'), uploadServicePhotos);

// Admin and Professional routes
router.route('/')
  .get(
    protect, 
    authorize('admin', 'professional'), 
    advancedResults(
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
    ),
    getAppointments
  )
  .post(protect, authorize('customer'), createAppointment);

router.route('/:id')
  .get(protect, getAppointment)
  .put(protect, authorize('admin', 'professional'), updateAppointment)
  .delete(protect, authorize('admin'), deleteAppointment);

module.exports = router; 