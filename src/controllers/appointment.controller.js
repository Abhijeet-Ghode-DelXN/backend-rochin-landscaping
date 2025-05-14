const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const Appointment = require('../models/appointment.model');
const Customer = require('../models/customer.model');
const User = require('../models/user.model');
const Service = require('../models/service.model');
const sendEmail = require('../utils/sendEmail');
const cloudinary = require('../utils/cloudinary');

// @desc    Get all appointments
// @route   GET /api/v1/appointments
// @access  Private/Admin
exports.getAppointments = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single appointment
// @route   GET /api/v1/appointments/:id
// @access  Private
exports.getAppointment = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id)
    .populate({
      path: 'customer',
      select: 'address propertyDetails notificationPreferences',
      populate: {
        path: 'user',
        select: 'name email phone'
      }
    })
    .populate('service')
    .populate({
      path: 'crew.assignedTo',
      select: 'name phone'
    })
    .populate({
      path: 'crew.leadProfessional',
      select: 'name phone'
    })
    .populate({
      path: 'createdBy',
      select: 'name'
    });

  if (!appointment) {
    return next(
      new ErrorResponse(`Appointment not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is authorized to view
  if (req.user.role === 'customer') {
    const customer = await Customer.findOne({ user: req.user.id });
    if (!customer || appointment.customer._id.toString() !== customer._id.toString()) {
      return next(
        new ErrorResponse(`Not authorized to access this appointment`, 403)
      );
    }
  }

  res.status(200).json({
    success: true,
    data: appointment
  });
});





// Add to appointment.controller.js

// @desc    Get available time slots
// @route   GET /api/v1/appointments/availability
// @access  Public
exports.getAvailableTimeSlots = asyncHandler(async (req, res, next) => {
  const { date, serviceId } = req.query;

  // Validate input
  if (!date || !serviceId) {
    return next(new ErrorResponse('Please provide date and service ID', 400));
  }

  // Validate and parse date
  const selectedDate = new Date(date);
  if (isNaN(selectedDate)) {
    return next(new ErrorResponse('Invalid date format', 400));
  }

  // Get service details
  const service = await Service.findById(serviceId);
  if (!service) {
    return next(new ErrorResponse('Service not found', 404));
  }

  // Get business hours (you might want to store these in a config/model)
  const businessHours = {
    start: 8, // 8 AM
    end: 18,  // 6 PM
    slotInterval: 30 // minutes between slots
  };

  // Calculate time slots
  const startTime = new Date(selectedDate);
  startTime.setHours(businessHours.start, 0, 0, 0);

  const endTime = new Date(selectedDate);
  endTime.setHours(businessHours.end, 0, 0, 0);

  // Generate all possible slots
  const allSlots = [];
  let current = new Date(startTime);
  
  while (current < endTime) {
    const slotEnd = new Date(current.getTime() + service.duration * 60000);
    if (slotEnd > endTime) break;
    
    allSlots.push({
      start: current.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      end: slotEnd.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
    });
    
    current = new Date(current.getTime() + businessHours.slotInterval * 60000);
  }

  // Get existing appointments
  const appointments = await Appointment.find({
    date: {
      $gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
      $lte: new Date(selectedDate.setHours(23, 59, 59, 999))
    }
  });

  // Filter out occupied slots
  const availableSlots = allSlots.filter(slot => {
    return !appointments.some(appointment => {
      const apptStart = new Date(`1970-01-01T${appointment.timeSlot.startTime}`);
      const apptEnd = new Date(`1970-01-01T${appointment.timeSlot.endTime}`);
      const slotStart = new Date(`1970-01-01T${slot.start}`);
      const slotEnd = new Date(`1970-01-01T${slot.end}`);
      
      return (slotStart < apptEnd && slotEnd > apptStart);
    });
  });

  res.status(200).json({
    success: true,
    data: availableSlots
  });
});



// @desc    Create new appointment
// @route   POST /api/v1/appointments
// @access  Private/Admin
exports.createAppointment = asyncHandler(async (req, res, next) => {
  // Get logged-in user ID from token
  const userId = req.user.id;
  // Check customer exists
  // const customer = await Customer.findById(req.body.customer);
  // Find the Customer using the user ID
  const customer = await Customer.findOne({ user: userId });
  if (!customer) {
    return next(
      new ErrorResponse(`Customer not found with user id of ${userId}`, 404)
    );
  }
  // Replace the customer ID in request body with correct one
  req.body.customer = customer._id;
  // Check service exists
  const service = await Service.findById(req.body.service);
  if (!service) {
    return next(
      new ErrorResponse(`Service not found with id of ${req.body.service}`, 404)
    );
  }

  // Add user as creator
  // req.body.createdBy = req.user.id;

 // Add user as creator
 req.body.createdBy = userId;
  const appointment = await Appointment.create(req.body);

  // Get customer's user info for notification
  const customerUser = await User.findById(customer.user);

  // Send confirmation email to customer
  if (customerUser && customerUser.email) {
    try {
      const formattedDate = new Date(appointment.date).toLocaleString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      await sendEmail({
        email: customerUser.email,
        subject: 'Appointment Confirmation',
        message: `Your landscaping appointment has been scheduled for ${formattedDate} from ${appointment.timeSlot.startTime} to ${appointment.timeSlot.endTime}. Service: ${service.name}. Please contact us if you need to reschedule.`
      });

      // Update notification status
      appointment.notificationsStatus.confirmationSent = true;
      await appointment.save();
    } catch (err) {
      console.log('Email notification failed:', err);
    }
  }

  res.status(201).json({
    success: true,
    data: appointment
  });
});

// // @desc    Update appointment
// // @route   PUT /api/v1/appointments/:id
// // @access  Private/Admin
// exports.updateAppointment = asyncHandler(async (req, res, next) => {
//   let appointment = await Appointment.findById(req.params.id);

//   if (!appointment) {
//     return next(
//       new ErrorResponse(`Appointment not found with id of ${req.params.id}`, 404)
//     );
//   }

//   // Check if user is authorized to update
//   if (req.user.role !== 'admin' && req.user.role !== 'professional') {
//     return next(
//       new ErrorResponse(`Not authorized to update this appointment`, 403)
//     );
//   }

//   appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
//     new: true,
//     runValidators: true
//   });

//   // Check if status changed to 'Completed' and update completion details
//   if (req.body.status === 'Completed' && appointment.status === 'Completed') {
//     appointment.completionDetails.completedAt = Date.now();
//     await appointment.save();
    
//     // Notify customer
//     try {
//       const customer = await Customer.findById(appointment.customer).populate('user');
//       if (customer && customer.user.email) {
//         await sendEmail({
//           email: customer.user.email,
//           subject: 'Service Completed',
//           message: `Your landscaping service has been completed. Thank you for your business!`
//         });

//         appointment.notificationsStatus.completionSent = true;
//         await appointment.save();
//       }
//     } catch (err) {
//       console.log('Completion notification failed:', err);
//     }
//   }

//   // Check if date or time changed, send reschedule notification
//   if ((req.body.date && req.body.date !== appointment.date.toISOString().split('T')[0]) || 
//       (req.body.timeSlot && (
//         req.body.timeSlot.startTime !== appointment.timeSlot.startTime ||
//         req.body.timeSlot.endTime !== appointment.timeSlot.endTime
//       ))) {
//     try {
//       const customer = await Customer.findById(appointment.customer).populate('user');
//       if (customer && customer.user.email) {
//         const formattedDate = new Date(appointment.date).toLocaleString('en-US', {
//           weekday: 'long',
//           year: 'numeric',
//           month: 'long',
//           day: 'numeric'
//         });

//         await sendEmail({
//           email: customer.user.email,
//           subject: 'Appointment Rescheduled',
//           message: `Your landscaping appointment has been rescheduled to ${formattedDate} from ${appointment.timeSlot.startTime} to ${appointment.timeSlot.endTime}. Please contact us if you have any questions.`
//         });
//       }
//     } catch (err) {
//       console.log('Reschedule notification failed:', err);
//     }
//   }

//   res.status(200).json({
//     success: true,
//     data: appointment
//   });
// });





// @desc    Update appointment
// @route   PUT /api/v1/appointments/:id
// @access  Private (admin, professional, or customer for own appointment with limited fields)
exports.updateAppointment = asyncHandler(async (req, res, next) => {
  let appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    return next(
      new ErrorResponse(`Appointment not found with id of ${req.params.id}`, 404)
    );
  }

  const userRole = req.user.role;
  const userCustomerId = req.user.customerId; // Only present if role is 'customer'

  // If user is admin or professional: allow full update
  if (userRole === 'admin' || userRole === 'professional') {
    appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
  }
  // If user is customer: restrict update to own appointment and only date/timeSlot
  else if (userRole === 'customer') {
    // Check if the appointment belongs to the customer
    if (appointment.customer.toString() !== userCustomerId) {
      return next(
        new ErrorResponse(`Not authorized to update this appointment`, 403)
      );
    }

    // Only allow date and timeSlot fields
    const allowedFields = ['date', 'timeSlot'];
    const invalidFields = Object.keys(req.body).filter(
      (key) => !allowedFields.includes(key)
    );
    if (invalidFields.length > 0) {
      return next(
        new ErrorResponse(
          `Customers are only allowed to update 'date' and 'timeSlot'. You sent: ${invalidFields.join(', ')}`,
          403
        )
      );
    }

    // Update only the allowed fields
    if (req.body.date) appointment.date = req.body.date;
    if (req.body.timeSlot) appointment.timeSlot = req.body.timeSlot;

    await appointment.save();
  } else {
    return next(
      new ErrorResponse(`Not authorized to update this appointment`, 403)
    );
  }

  // Check if status changed to 'Completed' and update completion details
  if (req.body.status === 'Completed' && appointment.status === 'Completed') {
    appointment.completionDetails.completedAt = Date.now();
    await appointment.save();

    try {
      const customer = await Customer.findById(appointment.customer).populate('user');
      if (customer && customer.user.email) {
        await sendEmail({
          email: customer.user.email,
          subject: 'Service Completed',
          message: `Your landscaping service has been completed. Thank you for your business!`
        });

        appointment.notificationsStatus.completionSent = true;
        await appointment.save();
      }
    } catch (err) {
      console.log('Completion notification failed:', err);
    }
  }

  // Check if date or time changed, send reschedule notification
  if ((req.body.date && req.body.date !== appointment.date.toISOString().split('T')[0]) ||
    (req.body.timeSlot && (
      req.body.timeSlot.startTime !== appointment.timeSlot.startTime ||
      req.body.timeSlot.endTime !== appointment.timeSlot.endTime
    ))) {
    try {
      const customer = await Customer.findById(appointment.customer).populate('user');
      if (customer && customer.user.email) {
        const formattedDate = new Date(appointment.date).toLocaleString('en-US', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        });

        await sendEmail({
          email: customer.user.email,
          subject: 'Appointment Rescheduled',
          message: `Your landscaping appointment has been rescheduled to ${formattedDate} from ${appointment.timeSlot.startTime} to ${appointment.timeSlot.endTime}. Please contact us if you have any questions.`
        });
      }
    } catch (err) {
      console.log('Reschedule notification failed:', err);
    }
  }

  res.status(200).json({
    success: true,
    data: appointment
  });
});












// @desc    Delete appointment
// @route   DELETE /api/v1/appointments/:id
// @access  Private/Admin
exports.deleteAppointment = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    return next(
      new ErrorResponse(`Appointment not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is authorized to delete
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`Not authorized to delete this appointment`, 403)
    );
  }

  await Appointment.findByIdAndDelete(req.params.id);


  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Upload service photos
// @route   POST /api/v1/appointments/:id/photos
// @access  Private/Professional
exports.uploadServicePhotos = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    return next(
      new ErrorResponse(`Appointment not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is authorized to upload photos
  if (req.user.role !== 'admin' && req.user.role !== 'professional') {
    return next(
      new ErrorResponse(`Not authorized to upload photos for this appointment`, 403)
    );
  }

  if (!req.files || !req.files.photos) {
    return next(new ErrorResponse(`Please upload at least one photo`, 400));
  }

  // Check if before or after service
  if (!req.body.photoType || !['beforeService', 'afterService'].includes(req.body.photoType)) {
    return next(new ErrorResponse(`Please specify photoType as 'beforeService' or 'afterService'`, 400));
  }

  const photos = Array.isArray(req.files.photos) 
    ? req.files.photos 
    : [req.files.photos];

  const uploadPromises = photos.map(async photo => {
    // Make sure the file is a photo
    if (!photo.mimetype.startsWith('image')) {
      throw new ErrorResponse(`Please upload only image files`, 400);
    }

    // Check filesize
    if (photo.size > process.env.MAX_FILE_UPLOAD) {
      throw new ErrorResponse(
        `Please upload images less than ${process.env.MAX_FILE_UPLOAD}`,
        400
      );
    }

    // Upload to cloudinary
    const result = await cloudinary.uploader.upload(photo.tempFilePath, {
      folder: `landscaping/appointments/${appointment._id}/${req.body.photoType}`
    });

    return {
      url: result.secure_url,
      caption: req.body.caption || '',
      uploadedAt: Date.now()
    };
  });

  try {
    const uploadedPhotos = await Promise.all(uploadPromises);

    // Add photos to appointment
    if (req.body.photoType === 'beforeService') {
      appointment.photos.beforeService.push(...uploadedPhotos);
    } else {
      appointment.photos.afterService.push(...uploadedPhotos);
    }
    
    await appointment.save();

    res.status(200).json({
      success: true,
      count: uploadedPhotos.length,
      data: uploadedPhotos
    });
  } catch (err) {
    return next(new ErrorResponse(`Problem with photo upload: ${err.message}`, 500));
  }
});

// @desc    Get my appointments (Customer)
// @route   GET /api/v1/appointments/my-appointments
// @access  Private/Customer
exports.getMyAppointments = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findOne({ user: req.user.id });

  if (!customer) {
    return next(new ErrorResponse(`No customer profile found`, 404));
  }

  const appointments = await Appointment.find({ customer: customer._id })
    .populate('service', 'name category')
    .sort({ date: -1 });

  res.status(200).json({
    success: true,
    count: appointments.length,
    data: appointments
  });
});

// @desc    Request reschedule (Customer)
// @route   PUT /api/v1/appointments/:id/reschedule-request
// @access  Private/Customer
exports.requestReschedule = asyncHandler(async (req, res, next) => {
  const { requestedDate, requestedTime, reason } = req.body;

  if (!requestedDate || !requestedTime) {
    return next(
      new ErrorResponse(`Please provide requested date and time`, 400)
    );
  }

  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    return next(
      new ErrorResponse(`Appointment not found with id of ${req.params.id}`, 404)
    );
  }

  // Verify customer owns this appointment
  const customer = await Customer.findOne({ user: req.user.id });
  if (!customer || appointment.customer.toString() !== customer._id.toString()) {
    return next(
      new ErrorResponse(`Not authorized to reschedule this appointment`, 403)
    );
  }

  // Add reschedule request to notes
  if (!appointment.notes.customer) {
    appointment.notes.customer = '';
  }
  
  appointment.notes.customer += `\n[RESCHEDULE REQUEST] Date: ${requestedDate}, Time: ${requestedTime}, Reason: ${reason || 'Not provided'}`;
  appointment.status = 'Rescheduled';
  
  await appointment.save();

  // Notify admin about reschedule request
  try {
    const admins = await User.find({ role: 'admin' });
    if (admins.length > 0) {
      await sendEmail({
        email: admins[0].email,
        subject: 'Appointment Reschedule Request',
        message: `Customer ${req.user.name} has requested to reschedule their appointment on ${new Date(appointment.date).toLocaleDateString()} to ${requestedDate} at ${requestedTime}. Reason: ${reason || 'Not provided'}`
      });
    }
  } catch (err) {
    console.log('Reschedule notification failed:', err);
  }

  res.status(200).json({
    success: true,
    data: appointment
  });
});

// @desc    Get appointments by date range
// @route   GET /api/v1/appointments/calendar
// @access  Private
exports.getCalendarAppointments = asyncHandler(async (req, res, next) => {
  const { start, end } = req.query;

  if (!start || !end) {
    return next(
      new ErrorResponse(`Please provide start and end dates`, 400)
    );
  }

  let query = {
    date: {
      $gte: new Date(start),
      $lte: new Date(end)
    }
  };

  // If customer, only show their appointments
  if (req.user.role === 'customer') {
    const customer = await Customer.findOne({ user: req.user.id });
    if (!customer) {
      return next(new ErrorResponse(`No customer profile found`, 404));
    }
    query.customer = customer._id;
  }

  // If professional, only show appointments they're assigned to
  if (req.user.role === 'professional') {
    query.$or = [
      { 'crew.assignedTo': req.user.id },
      { 'crew.leadProfessional': req.user.id }
    ];
  }

  const appointments = await Appointment.find(query)
    .populate('customer', 'address')
    .populate('service', 'name category')
    .populate('crew.leadProfessional', 'name')
    .sort({ date: 1 });

  // Format for calendar display
  const calendarAppointments = appointments.map(apt => {
    return {
      id: apt._id,
      title: apt.service.name,
      start: new Date(`${apt.date.toISOString().split('T')[0]}T${apt.timeSlot.startTime}`),
      end: new Date(`${apt.date.toISOString().split('T')[0]}T${apt.timeSlot.endTime}`),
      color: apt.calendarColor,
      status: apt.status,
      customer: apt.customer,
      packageType: apt.packageType,
      recurring: apt.recurringType !== 'One-time'
    };
  });

  res.status(200).json({
    success: true,
    count: calendarAppointments.length,
    data: calendarAppointments
  });
}); 