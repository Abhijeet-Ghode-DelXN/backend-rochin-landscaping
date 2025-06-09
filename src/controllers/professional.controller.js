const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const User = require('../models/user.model');
const Appointment = require('../models/appointment.model');

// @desc    Get all professionals
// @route   GET /api/v1/professionals
// @access  Private/Admin
exports.getProfessionals = asyncHandler(async (req, res, next) => {
  const professionals = await User.find({ role: 'professional' });
  
  res.status(200).json({
    success: true,
    count: professionals.length,
    data: professionals
  });
});

// @desc    Get single professional
// @route   GET /api/v1/professionals/:id
// @access  Private/Admin
exports.getProfessional = asyncHandler(async (req, res, next) => {
  const professional = await User.findOne({
    _id: req.params.id,
    role: 'professional'
  });

  if (!professional) {
    return next(
      new ErrorResponse(`Professional not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: professional
  });
});

// @desc    Create new professional
// @route   POST /api/v1/professionals
// @access  Private/Admin
exports.createProfessional = asyncHandler(async (req, res, next) => {
  // Force role to be professional
  req.body.role = 'professional';
  
  const professional = await User.create(req.body);

  res.status(201).json({
    success: true,
    data: professional
  });
});

// @desc    Update professional
// @route   PUT /api/v1/professionals/:id
// @access  Private/Admin
exports.updateProfessional = asyncHandler(async (req, res, next) => {
  let professional = await User.findOne({
    _id: req.params.id,
    role: 'professional'
  });

  if (!professional) {
    return next(
      new ErrorResponse(`Professional not found with id of ${req.params.id}`, 404)
    );
  }

  // Ensure role remains as professional
  req.body.role = 'professional';

  professional = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: professional
  });
});

// @desc    Delete professional
// @route   DELETE /api/v1/professionals/:id
// @access  Private/Admin
exports.deleteProfessional = asyncHandler(async (req, res, next) => {
  const professional = await User.findOne({
    _id: req.params.id,
    role: 'professional'
  });

  if (!professional) {
    return next(
      new ErrorResponse(`Professional not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if professional has assigned appointments
  const assignedAppointments = await Appointment.countDocuments({
    $or: [
      { 'crew.assignedTo': req.params.id },
      { 'crew.leadProfessional': req.params.id }
    ]
  });

  if (assignedAppointments > 0) {
    return next(
      new ErrorResponse(
        `Cannot delete professional with ${assignedAppointments} assigned appointments`,
        400
      )
    );
  }

  await professional.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Get professional workload
// @route   GET /api/v1/professionals/:id/workload
// @access  Private/Admin
exports.getProfessionalWorkload = asyncHandler(async (req, res, next) => {
  const professional = await User.findOne({
    _id: req.params.id,
    role: 'professional'
  });

  if (!professional) {
    return next(
      new ErrorResponse(`Professional not found with id of ${req.params.id}`, 404)
    );
  }

  // Get current date
  const today = new Date();
  
  // Get start and end dates for current week
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Saturday
  endOfWeek.setHours(23, 59, 59, 999);

  // Get all appointments for this professional in the current week
  const appointments = await Appointment.find({
    $or: [
      { 'crew.assignedTo': req.params.id },
      { 'crew.leadProfessional': req.params.id }
    ],
    date: { $gte: startOfWeek, $lte: endOfWeek }
  }).populate('service', 'name duration');

  // Calculate total work hours
  let totalMinutes = 0;
  appointments.forEach(appointment => {
    // If service has duration, use it
    if (appointment.service && appointment.service.duration) {
      totalMinutes += appointment.service.duration;
    } else {
      // Otherwise estimate 2 hours per appointment
      totalMinutes += 120;
    }
  });

  const totalHours = Math.round(totalMinutes / 60 * 10) / 10; // Round to 1 decimal place

  // Organize appointments by day
  const workloadByDay = {
    Sunday: { count: 0, hours: 0 },
    Monday: { count: 0, hours: 0 },
    Tuesday: { count: 0, hours: 0 },
    Wednesday: { count: 0, hours: 0 },
    Thursday: { count: 0, hours: 0 },
    Friday: { count: 0, hours: 0 },
    Saturday: { count: 0, hours: 0 }
  };

  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  
  appointments.forEach(appointment => {
    const day = days[new Date(appointment.date).getDay()];
    workloadByDay[day].count += 1;
    
    let appointmentHours = 0;
    if (appointment.service && appointment.service.duration) {
      appointmentHours = appointment.service.duration / 60;
    } else {
      appointmentHours = 2; // Default 2 hours
    }
    
    workloadByDay[day].hours += appointmentHours;
  });

  res.status(200).json({
    success: true,
    data: {
      professional: {
        id: professional._id,
        name: professional.name,
        email: professional.email,
        phone: professional.phone
      },
      currentWeek: {
        startDate: startOfWeek,
        endDate: endOfWeek,
        totalAppointments: appointments.length,
        totalHours
      },
      workloadByDay
    }
  });
});

// @desc    Assign professional to appointment
// @route   PUT /api/v1/professionals/:id/assign/:appointmentId
// @access  Private/Admin
exports.assignToAppointment = asyncHandler(async (req, res, next) => {
  const professional = await User.findOne({
    _id: req.params.id,
    role: 'professional'
  });

  if (!professional) {
    return next(
      new ErrorResponse(`Professional not found with id of ${req.params.id}`, 404)
    );
  }

  const appointment = await Appointment.findById(req.params.appointmentId);

  if (!appointment) {
    return next(
      new ErrorResponse(`Appointment not found with id of ${req.params.appointmentId}`, 404)
    );
  }

  // Check if appointment date conflicts with professional's existing schedule
  const appointmentDate = new Date(appointment.date);
  const startOfDay = new Date(appointmentDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(appointmentDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Find professional's appointments for the same day
  const existingAppointments = await Appointment.find({
    $or: [
      { 'crew.assignedTo': req.params.id },
      { 'crew.leadProfessional': req.params.id }
    ],
    date: { $gte: startOfDay, $lte: endOfDay },
    _id: { $ne: req.params.appointmentId } // Exclude current appointment
  });

  // Check for time conflicts
  let hasConflict = false;
  const appointmentStart = appointment.timeSlot.startTime;
  const appointmentEnd = appointment.timeSlot.endTime;

  existingAppointments.forEach(existingAppointment => {
    const existingStart = existingAppointment.timeSlot.startTime;
    const existingEnd = existingAppointment.timeSlot.endTime;

    // Simple string comparison for time overlaps
    if ((appointmentStart >= existingStart && appointmentStart < existingEnd) ||
        (appointmentEnd > existingStart && appointmentEnd <= existingEnd) ||
        (appointmentStart <= existingStart && appointmentEnd >= existingEnd)) {
      hasConflict = true;
    }
  });

  if (hasConflict) {
    return next(
      new ErrorResponse(
        `Professional has scheduling conflict on ${appointmentDate.toDateString()}`,
        400
      )
    );
  }

  // Determine if this is for lead professional or crew member
  const { isLead } = req.body;

  if (isLead) {
    appointment.crew.leadProfessional = req.params.id;
  } else {
    // Check if professional is already assigned
    const isAssigned = appointment.crew.assignedTo.some(
      id => id.toString() === req.params.id
    );

    if (!isAssigned) {
      appointment.crew.assignedTo.push(req.params.id);
    }
  }

  await appointment.save();

  res.status(200).json({
    success: true,
    data: appointment
  });
});



// // @desc    Update crew assignment for appointment
// // @route   PUT /api/v1/professionals/:id/crew
// // @access  Private/Admin
// exports.updateAppointmentCrew = asyncHandler(async (req, res, next) => {
//   try {
//     const appointment = await Appointment.findById(req.params.id);

//     if (!appointment) {
//       return res.status(404).json({
//         success: false,
//         error: `Appointment not found with id of ${req.params.id}`
//       });
//     }

//     // Validate the request body
//     const { leadProfessional, assignedTo } = req.body;

//     if (!leadProfessional && (!assignedTo || assignedTo.length === 0)) {
//       return res.status(400).json({
//         success: false,
//         error: 'Please provide at least leadProfessional or assignedTo'
//       });
//     }

//     // Initialize crew if it doesn't exist
//     if (!appointment.crew) {
//       appointment.crew = {
//         leadProfessional: null,
//         assignedTo: []
//       };
//     }

//     // Update lead professional if provided
//     if (leadProfessional) {
//       // Verify the professional exists
//       const professional = await User.findOne({
//         _id: leadProfessional,
//         role: 'professional'
//       });

//       if (!professional) {
//         return res.status(404).json({
//           success: false,
//           error: `Professional not found with id of ${leadProfessional}`
//         });
//       }

//       appointment.crew.leadProfessional = leadProfessional;
//     }

//     // Update assigned team members if provided
//     if (assignedTo && assignedTo.length > 0) {
//       // Verify all professionals exist
//       const professionals = await User.find({
//         _id: { $in: assignedTo },
//         role: 'professional'
//       });

//       if (professionals.length !== assignedTo.length) {
//         return res.status(404).json({
//           success: false,
//           error: 'One or more professionals not found'
//         });
//       }

//       appointment.crew.assignedTo = assignedTo;
//     }

//     const updatedAppointment = await appointment.save();

//     res.status(200).json({
//       success: true,
//       data: updatedAppointment
//     });
//   } catch (error) {
//     console.error('Error updating crew assignment:', error);
//     res.status(500).json({
//       success: false,
//       error: 'Server error'
//     });
//   }
// });




// @desc    Update crew assignment for appointment
// @route   PUT /api/v1/professionals/:id/crew
// @access  Private/Admin
exports.updateAppointmentCrew = asyncHandler(async (req, res, next) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        error: `Appointment not found with id of ${req.params.id}`
      });
    }

    // Validate the request body
    const { leadProfessional, assignedTo } = req.body;

    if (!leadProfessional) {
      return res.status(400).json({
        success: false,
        error: 'Please provide a lead professional'
      });
    }

    // Verify the lead professional exists
    const leadProf = await User.findOne({
      _id: leadProfessional,
      role: 'professional'
    });

    if (!leadProf) {
      return res.status(404).json({
        success: false,
        error: `Lead professional not found with id of ${leadProfessional}`
      });
    }

    // Verify all team members exist
    const teamMembers = await User.find({
      _id: { $in: assignedTo || [] },
      role: 'professional'
    });

    if (assignedTo && teamMembers.length !== assignedTo.length) {
      return res.status(404).json({
        success: false,
        error: 'One or more team members not found'
      });
    }

    // Check for scheduling conflicts
    const dateStr = new Date(appointment.date).toISOString().split('T')[0];
    
    // Check lead professional availability
    const isLeadAvailable = await checkProfessionalAvailability(
      leadProfessional,
      dateStr,
      appointment.timeSlot.startTime,
      appointment.timeSlot.endTime,
      appointment._id // exclude current appointment
    );

    if (!isLeadAvailable) {
      return res.status(400).json({
        success: false,
        error: 'Lead professional is not available during this time slot'
      });
    }

    // Check team members availability
    for (const memberId of assignedTo || []) {
      const isAvailable = await checkProfessionalAvailability(
        memberId,
        dateStr,
        appointment.timeSlot.startTime,
        appointment.timeSlot.endTime,
        appointment._id // exclude current appointment
      );

      if (!isAvailable) {
        return res.status(400).json({
          success: false,
          error: `Professional ${memberId} is not available during this time slot`
        });
      }
    }

    // Update the crew assignment
    appointment.crew = {
      leadProfessional: leadProfessional,
      assignedTo: assignedTo || []
    };

    const updatedAppointment = await appointment.save();

    res.status(200).json({
      success: true,
      data: updatedAppointment
    });
  } catch (error) {
    console.error('Error updating crew assignment:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Helper function to check professional availability
async function checkProfessionalAvailability(professionalId, date, startTime, endTime, excludeAppointmentId) {
  // Check if the professional has any conflicting appointments
  const conflictingAppointments = await Appointment.find({
    'crew.leadProfessional': professionalId,
    date: new Date(date),
    'timeSlot.startTime': { $lt: endTime },
    'timeSlot.endTime': { $gt: startTime },
    _id: { $ne: excludeAppointmentId }
  });

  if (conflictingAppointments.length > 0) {
    return false;
  }

  // Also check if they're assigned as team members in other appointments
  const conflictingTeamAssignments = await Appointment.find({
    'crew.assignedTo': professionalId,
    date: new Date(date),
    'timeSlot.startTime': { $lt: endTime },
    'timeSlot.endTime': { $gt: startTime },
    _id: { $ne: excludeAppointmentId }
  });

  return conflictingTeamAssignments.length === 0;
}



// @desc    Get all available professionals for a time slot
// @route   GET /api/v1/professionals/available
// @access  Private/Admin
exports.getAvailableProfessionals = asyncHandler(async (req, res, next) => {
  const { date, startTime, endTime } = req.query;

  if (!date || !startTime || !endTime) {
    return next(
      new ErrorResponse('Please provide date, startTime and endTime', 400)
    );
  }

  // Get all professionals
  const professionals = await User.find({ role: 'professional' });

  const appointmentDate = new Date(date);
  const startOfDay = new Date(appointmentDate);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(appointmentDate);
  endOfDay.setHours(23, 59, 59, 999);

  // Find all appointments for that day
  const appointments = await Appointment.find({
    date: { $gte: startOfDay, $lte: endOfDay }
  });

  // Filter available professionals
  const availableProfessionals = professionals.filter(professional => {
    const professionalId = professional._id.toString();
    
    // Check if professional has any conflicting appointments
    const hasConflict = appointments.some(appointment => {
      const isAssigned = 
        appointment.crew.leadProfessional?.toString() === professionalId ||
        appointment.crew.assignedTo.some(id => id.toString() === professionalId);
      
      if (!isAssigned) return false;
      
      const appointmentStart = appointment.timeSlot.startTime;
      const appointmentEnd = appointment.timeSlot.endTime;
      
      // Check for time overlap
      return (
        (startTime >= appointmentStart && startTime < appointmentEnd) ||
        (endTime > appointmentStart && endTime <= appointmentEnd) ||
        (startTime <= appointmentStart && endTime >= appointmentEnd)
      );
    });
    
    return !hasConflict;
  });

  res.status(200).json({
    success: true,
    count: availableProfessionals.length,
    data: availableProfessionals
  });
}); 