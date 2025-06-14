const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const Appointment = require('../models/appointment.model');
const Customer = require('../models/customer.model');
const User = require('../models/user.model');
const Service = require('../models/service.model');
const sendEmail = require('../utils/sendEmail');
const cloudinary = require('../utils/cloudinary');
const moment = require('moment'); // For backend/Node.js files




// @desc    Get all appointments
// @route   GET /api/v1/appointments
// @access  Public/Private
exports.getAppointments = asyncHandler(async (req, res, next) => {
  if (req.query.status === 'Completed') {
    try {
      // Clear any existing population from advancedResults
      req.query.populate = '';
      
      let appointments = await Appointment.find({ status: 'Completed' })
        .populate({
          path: 'customer',
          select: '-__v', // exclude version key
          populate: {
            path: 'user',
            model: 'User',
            select: 'name email phone role'
          }
        })
        .populate('createdBy', 'name email role')
        .populate('service', 'name category')
        .lean();

      // Debug: Check what was actually populated
      console.log('Populated data sample:', appointments[0]?.customer?.user);

      return res.status(200).json({
        success: true,
        count: appointments.length,
        data: appointments
      });
    } catch (error) {
      console.error('Error:', error);
      return next(new ErrorResponse('Error fetching appointments', 500));
    }
  }

  // For other queries
  if (!req.user || !['admin', 'professional'].includes(req.user.role)) {
    return next(new ErrorResponse('Not authorized', 403));
  }

  // Use advancedResults with consistent population
  req.query.populate = [
    {
      path: 'customer',
      populate: { path: 'user', select: 'name email phone' }
    },
    'service',
    'createdBy'
  ];

  return res.status(200).json(res.advancedResults);
});




// exports.getAppointments = asyncHandler(async (req, res, next) => {
//   if (!req.user || !['admin', 'professional'].includes(req.user.role)) {
//     return next(new ErrorResponse('Not authorized to access appointments', 403));
//   }

//   const appointments = await Appointment.find()
//     .populate({
//       path: 'customer',
//       select: 'address user',
//       populate: {
//         path: 'user',
//         select: 'name email phone'
//       }
//     })
//     .populate('service', 'name category');

//   res.status(200).json({
//     success: true,
//     count: appointments.length,
//     data: appointments
//   });
// });


// @desc    Get single appointment
// @route   GET /api/v1/appointments/:id
// @access  Public/Private
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

  // Allow public access for completed appointments
  if (appointment.status === 'Completed') {
    return res.status(200).json({
      success: true,
      data: appointment
    });
  }

  // For non-completed appointments, check authorization
  if (!req.user) {
    return next(
      new ErrorResponse(`Not authorized to access this appointment`, 403)
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

// // @desc    Get available time slots
// // @route   GET /api/v1/appointments/availability
// // @access  Public
// exports.getAvailableTimeSlots = asyncHandler(async (req, res, next) => {
//   const { date, serviceId } = req.query;

//   // Validate input
//   if (!date || !serviceId) {
//     return next(new ErrorResponse('Please provide date and service ID', 400));
//   }

//   // Validate and parse date
//   const selectedDate = new Date(date);
//   if (isNaN(selectedDate)) {
//     return next(new ErrorResponse('Invalid date format', 400));
//   }

//   // Get service details
//   const service = await Service.findById(serviceId);
//   if (!service) {
//     return next(new ErrorResponse('Service not found', 404));
//   }

//   // Get business hours (you might want to store these in a config/model)
//   const businessHours = {
//     start: 8, // 8 AM
//     end: 18,  // 6 PM
//     slotInterval: 30 // minutes between slots
//   };

//   // Calculate time slots
//   const startTime = new Date(selectedDate);
//   startTime.setHours(businessHours.start, 0, 0, 0);

//   const endTime = new Date(selectedDate);
//   endTime.setHours(businessHours.end, 0, 0, 0);

//   // Generate all possible slots
//   const allSlots = [];
//   let current = new Date(startTime);
  
//   while (current < endTime) {
//     const slotEnd = new Date(current.getTime() + service.duration * 60000);
//     if (slotEnd > endTime) break;
    
//     allSlots.push({
//       start: current.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
//       end: slotEnd.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' })
//     });
    
//     current = new Date(current.getTime() + businessHours.slotInterval * 60000);
//   }

//   // Get existing appointments
//   const appointments = await Appointment.find({
//     date: {
//       $gte: new Date(selectedDate.setHours(0, 0, 0, 0)),
//       $lte: new Date(selectedDate.setHours(23, 59, 59, 999))
//     }
//   });

//   // Filter out occupied slots
//   const availableSlots = allSlots.filter(slot => {
//     return !appointments.some(appointment => {
//       const apptStart = new Date(`1970-01-01T${appointment.timeSlot.startTime}`);
//       const apptEnd = new Date(`1970-01-01T${appointment.timeSlot.endTime}`);
//       const slotStart = new Date(`1970-01-01T${slot.start}`);
//       const slotEnd = new Date(`1970-01-01T${slot.end}`);
      
//       return (slotStart < apptEnd && slotEnd > apptStart);
//     });
//   });

//   res.status(200).json({
//     success: true,
//     data: availableSlots
//   });
// });


// @desc    Get all time slots with availability status
// @route   GET /api/v1/appointments/availability
// @access  Public
exports.getTimeSlotsWithAvailability = asyncHandler(async (req, res, next) => {
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

  // Get business hours
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
      end: slotEnd.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }),
      available: true // initially mark all as available
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

  // Mark booked slots
  const slotsWithAvailability = allSlots.map(slot => {
    const isBooked = appointments.some(appointment => {
      const apptStart = new Date(`1970-01-01T${appointment.timeSlot.startTime}`);
      const apptEnd = new Date(`1970-01-01T${appointment.timeSlot.endTime}`);
      const slotStart = new Date(`1970-01-01T${slot.start}`);
      const slotEnd = new Date(`1970-01-01T${slot.end}`);
      
      return (slotStart < apptEnd && slotEnd > apptStart);
    });
    
    return {
      ...slot,
      available: !isBooked
    };
  });

  res.status(200).json({
    success: true,
    data: slotsWithAvailability
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

// @desc    Update appointment
// @route   PUT /api/v1/appointments/:id
// @access  Private (admin, professional, or customer for own appointment with limited fields)
exports.updateAppointment = asyncHandler(async (req, res, next) => {
  let appointment = await Appointment.findById(req.params.id)
    .populate({
      path: 'customer',
      populate: {
        path: 'user',
        select: 'email'
      }
    });

  if (!appointment) {
    return next(
      new ErrorResponse(`Appointment not found with id of ${req.params.id}`, 404)
    );
  }

  // Store original values before update
  const originalValues = {
    date: appointment.date,
    timeSlot: { ...appointment.timeSlot },
    status: appointment.status
  };

  // Update logic based on user role
  if (req.user.role === 'admin' || req.user.role === 'professional') {
    appointment = await Appointment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate({
      path: 'customer',
      populate: {
        path: 'user',
        select: 'email'
      }
    });
  } else if (req.user.role === 'customer') {
    // ... existing customer update logic ...
  }

  // Email notification for completion
  if (req.body.status === 'Completed' && originalValues.status !== 'Completed') {
    try {
      // Update completion details
      appointment.completionDetails = {
        ...appointment.completionDetails,
        completedAt: new Date(),
        ...(req.body.completionDetails || {})
      };
      await appointment.save();

      // Only send email if customer has email
      if (appointment.customer?.user?.email) {
        await sendCompletionEmail(appointment);
        appointment.notificationsStatus.completionSent = true;
        await appointment.save();
      }
    } catch (err) {
      console.error('Completion notification failed:', err);
      // Implement retry mechanism here if needed
    }
  }

  // Email notification for rescheduling
  const isDateChanged = req.body.date && 
    !moment(req.body.date).isSame(originalValues.date, 'day');
  
  const isTimeChanged = req.body.timeSlot && (
    req.body.timeSlot.startTime !== originalValues.timeSlot.startTime ||
    req.body.timeSlot.endTime !== originalValues.timeSlot.endTime
  );

  if ((isDateChanged || isTimeChanged) && appointment.status !== 'Completed') {
    try {
      if (appointment.customer?.user?.email) {
        await sendRescheduleEmail(appointment, originalValues);
        appointment.notificationsStatus.rescheduleSent = true;
        await appointment.save();
      }
    } catch (err) {
      console.error('Reschedule notification failed:', err);
    }
  }

  res.status(200).json({
    success: true,
    data: appointment
  });
});

// Helper functions for email sending
async function sendCompletionEmail(appointment) {
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #4CAF50;">Service Completed</h2>
      <p>Dear valued customer,</p>
      <p>Your landscaping service has been successfully completed.</p>
      <p><strong>Service Details:</strong></p>
      <ul>
        <li>Date: ${moment(appointment.date).format('MMMM D, YYYY')}</li>
        <li>Service: ${appointment.serviceType || 'Landscaping Service'}</li>
      </ul>
      <p>Thank you for choosing our services!</p>
      <p>Best regards,<br>Your Landscaping Team</p>
    </div>
  `;

  await sendEmail({
    email: appointment.customer.user.email,
    subject: 'Service Completed',
    html: emailContent
  });
}

async function sendRescheduleEmail(appointment, originalValues) {
  const formattedDate = moment(appointment.date).format('dddd, MMMM D, YYYY');
  const originalDate = moment(originalValues.date).format('dddd, MMMM D, YYYY');
  
  const emailContent = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2196F3;">Appointment Rescheduled</h2>
      <p>Dear valued customer,</p>
      <p>Your landscaping appointment has been rescheduled.</p>
      
      ${originalDate !== formattedDate ? `
      <p><strong>Original Date:</strong> ${originalDate}</p>
      ` : ''}
      
      ${originalValues.timeSlot.startTime !== appointment.timeSlot.startTime || 
        originalValues.timeSlot.endTime !== appointment.timeSlot.endTime ? `
      <p><strong>Original Time:</strong> ${originalValues.timeSlot.startTime} - ${originalValues.timeSlot.endTime}</p>
      ` : ''}
      
      <p><strong>New Appointment Details:</strong></p>
      <ul>
        <li>Date: ${formattedDate}</li>
        <li>Time: ${appointment.timeSlot.startTime} - ${appointment.timeSlot.endTime}</li>
      </ul>
      <p>Please contact us if you have any questions or need to make further changes.</p>
      <p>Best regards,<br>Your Landscaping Team</p>
    </div>
  `;

  await sendEmail({
    email: appointment.customer.user.email,
    subject: 'Appointment Rescheduled',
    html: emailContent
  });
}





// // @desc    Delete appointment
// // @route   DELETE /api/v1/appointments/:id
// // @access  Private/Admin
// exports.deleteAppointment = asyncHandler(async (req, res, next) => {
//   const appointment = await Appointment.findById(req.params.id);

//   if (!appointment) {
//     return next(
//       new ErrorResponse(`Appointment not found with id of ${req.params.id}`, 404)
//     );
//   }

//   // Check if user is authorized to delete
//   if (req.user.role !== 'admin') {
//     return next(
//       new ErrorResponse(`Not authorized to delete this appointment`, 403)
//     );
//   }

//   await Appointment.findByIdAndDelete(req.params.id);


//   res.status(200).json({
//     success: true,
//     data: {}
//   });
// });



// @desc    Delete appointment
// @route   DELETE /api/v1/appointments/:id
// @access  Private
exports.deleteAppointment = asyncHandler(async (req, res, next) => {
  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    return next(new ErrorResponse('Appointment not found', 404));
  }

  // Admin can always delete
  if (req.user.role === 'admin') {
    await Appointment.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, data: {} });
  }

  // For customers - since they only see their own appointments via my-appointments,
  // we just need to enforce the 24-hour rule
  if (req.user.role === 'customer') {
    const now = new Date();
    const appointmentDate = new Date(appointment.date);
    const hoursBeforeAppointment = (appointmentDate - now) / (1000 * 60 * 60);
    
    if (hoursBeforeAppointment < 24) {
      return next(new ErrorResponse(
        'Appointments can only be canceled at least 24 hours before', 
        400
      ));
    }

    await Appointment.findByIdAndDelete(req.params.id);
    return res.status(200).json({ success: true, data: {} });
  }

  return next(new ErrorResponse('Not authorized', 403));
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

  // Check if appointment is completed
  if (appointment.status !== 'Completed') {
    return next(
      new ErrorResponse(`Photos can only be uploaded for completed appointments`, 400)
    );
  }

  // Check if user is authorized to upload photos
  if (req.user.role !== 'admin' && req.user.role !== 'professional') {
    return next(
      new ErrorResponse(`Not authorized to upload photos for this appointment`, 403)
    );
  }

  if (!req.body.photos || !Array.isArray(req.body.photos) || req.body.photos.length === 0) {
    return next(new ErrorResponse(`Please upload at least one photo`, 400));
  }

  // Check if before or after service
  if (!req.body.photoType || !['beforeService', 'afterService'].includes(req.body.photoType)) {
    return next(new ErrorResponse(`Please specify photoType as 'beforeService' or 'afterService'`, 400));
  }

  const uploadPromises = req.body.photos.map(photo => {
    return new Promise((resolve, reject) => {
      try {
        // Upload to cloudinary
        cloudinary.uploader.upload(
          `data:${photo.contentType};base64,${photo.data}`,
          {
            folder: `landscaping/appointments/${appointment._id}/${req.body.photoType}`,
            resource_type: 'auto',
            public_id: photo.name.split('.')[0] // Use filename without extension as public_id
          },
          (error, result) => {
            if (error) {
              reject(error);
            } else {
              resolve({
                url: result.secure_url,
                publicId: result.public_id,
                caption: '',
                uploadedAt: Date.now()
              });
            }
          }
        );
      } catch (err) {
        reject(err);
      }
    });
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
    return next(new ErrorResponse(`Please provide requested date and time`, 400));
  }

  const appointment = await Appointment.findById(req.params.id);

  if (!appointment) {
    return next(new ErrorResponse(`Appointment not found with id of ${req.params.id}`, 404));
  }

  // Verify customer owns this appointment
  const customer = await Customer.findOne({ user: req.user.id });
  if (!customer || appointment.customer.toString() !== customer._id.toString()) {
    return next(new ErrorResponse(`Not authorized to reschedule this appointment`, 403));
  }

  // Parse the time slot (assuming format "HH:MM - HH:MM")
  const [startTime, endTime] = requestedTime.split(' - ');

  // Update the appointment with new date/time
  appointment.date = requestedDate;
  appointment.timeSlot = {
    startTime: startTime.trim(),
    endTime: endTime.trim()
  };
  
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

  // Format for calendar display with null checks
  const calendarAppointments = appointments.map(apt => {
    // Get service name with fallback
    const serviceName = apt.service?.name || 'Unassigned Service';
    
    // Get customer address with fallback
    const customerAddress = apt.customer?.address || 'No Address';
    
    // Get start and end times with validation
    const startTime = apt.timeSlot?.startTime || '00:00';
    const endTime = apt.timeSlot?.endTime || '00:00';
    
    // Create date objects with validation
    const startDate = new Date(`${apt.date.toISOString().split('T')[0]}T${startTime}`);
    const endDate = new Date(`${apt.date.toISOString().split('T')[0]}T${endTime}`);
    
    // Validate dates
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      console.error(`Invalid date for appointment ${apt._id}:`, {
        date: apt.date,
        startTime,
        endTime
      });
      return null;
    }

    return {
      id: apt._id,
      title: `${serviceName} - ${customerAddress}`,
      start: startDate,
      end: endDate,
      color: apt.calendarColor || '#3174ad', // Default color if calendarColor is not set
      status: apt.status || 'Scheduled',
      customer: apt.customer || null,
      packageType: apt.packageType || 'Standard',
      recurring: apt.recurringType !== 'One-time'
    };
  }).filter(Boolean); // Remove any null entries from invalid dates

  res.status(200).json({
    success: true,
    count: calendarAppointments.length,
    data: calendarAppointments
  });
}); 







