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