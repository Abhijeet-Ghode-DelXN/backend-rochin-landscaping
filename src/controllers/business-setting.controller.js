const path = require('path');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const BusinessSetting = require('../models/business-setting.model');

// @desc    Get business settings
// @route   GET /api/v1/business-settings
// @access  Private/Admin
exports.getBusinessSettings = asyncHandler(async (req, res, next) => {
  const settings = await BusinessSetting.getSettings();
  
  res.status(200).json({
    success: true,
    data: settings
  });
});

// @desc    Update business settings
// @route   PUT /api/v1/business-settings
// @access  Private/Admin
exports.updateBusinessSettings = asyncHandler(async (req, res, next) => {
  // Get settings - will create default if none exist
  const settings = await BusinessSetting.getSettings();
  
  // Add the current user as updater
  req.body.updatedBy = req.user.id;
  
  // Update settings
  const updatedSettings = await BusinessSetting.findByIdAndUpdate(
    settings._id,
    req.body,
    {
      new: true,
      runValidators: true
    }
  );
  
  res.status(200).json({
    success: true,
    data: updatedSettings
  });
});

// @desc    Upload business logo
// @route   PUT /api/v1/business-settings/logo
// @access  Private/Admin
exports.uploadLogo = asyncHandler(async (req, res, next) => {
  const settings = await BusinessSetting.getSettings();
  
  if (!req.files) {
    return next(new ErrorResponse(`Please upload a file`, 400));
  }
  
  const file = req.files.file;
  
  // Make sure the image is a photo
  if (!file.mimetype.startsWith('image')) {
    return next(new ErrorResponse(`Please upload an image file`, 400));
  }
  
  // Check filesize
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(
      new ErrorResponse(
        `Please upload an image less than ${process.env.MAX_FILE_UPLOAD}`,
        400
      )
    );
  }
  
  // Create custom filename
  file.name = `logo_${settings._id}${path.parse(file.name).ext}`;
  
  // Upload file
  file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async err => {
    if (err) {
      console.error(err);
      return next(new ErrorResponse(`Problem with file upload`, 500));
    }
    
    await BusinessSetting.findByIdAndUpdate(settings._id, { logo: file.name });
    
    res.status(200).json({
      success: true,
      data: file.name
    });
  });
});

// @desc    Update business hours
// @route   PUT /api/v1/business-settings/hours
// @access  Private/Admin
exports.updateBusinessHours = asyncHandler(async (req, res, next) => {
  const settings = await BusinessSetting.getSettings();
  
  // Validate business hours
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const { businessHours } = req.body;
  
  if (!businessHours) {
    return next(new ErrorResponse('Please provide business hours', 400));
  }
  
  // Simple validation of business hours format
  for (const day of days) {
    if (businessHours[day]) {
      const { isOpen, openTime, closeTime } = businessHours[day];
      
      if (typeof isOpen !== 'boolean') {
        return next(new ErrorResponse(`Invalid isOpen value for ${day}`, 400));
      }
      
      if (isOpen) {
        if (!openTime || !closeTime) {
          return next(new ErrorResponse(`Please provide open and close times for ${day}`, 400));
        }
        
        // Simple time format validation (HH:MM)
        const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
        if (!timeRegex.test(openTime) || !timeRegex.test(closeTime)) {
          return next(new ErrorResponse(`Invalid time format for ${day}. Use HH:MM format`, 400));
        }
      }
    }
  }
  
  // Update just the business hours
  const updatedSettings = await BusinessSetting.findByIdAndUpdate(
    settings._id,
    { 
      businessHours,
      updatedBy: req.user.id
    },
    {
      new: true,
      runValidators: true
    }
  );
  
  res.status(200).json({
    success: true,
    data: updatedSettings.businessHours
  });
});

// @desc    Update notification settings
// @route   PUT /api/v1/business-settings/notifications
// @access  Private/Admin
exports.updateNotificationSettings = asyncHandler(async (req, res, next) => {
  const settings = await BusinessSetting.getSettings();
  
  const { notificationSettings } = req.body;
  
  if (!notificationSettings) {
    return next(new ErrorResponse('Please provide notification settings', 400));
  }
  
  // Update notification settings
  const updatedSettings = await BusinessSetting.findByIdAndUpdate(
    settings._id,
    { 
      notificationSettings,
      updatedBy: req.user.id
    },
    {
      new: true,
      runValidators: true
    }
  );
  
  res.status(200).json({
    success: true,
    data: updatedSettings.notificationSettings
  });
});

// @desc    Update business terms
// @route   PUT /api/v1/business-settings/terms
// @access  Private/Admin
exports.updateBusinessTerms = asyncHandler(async (req, res, next) => {
  const settings = await BusinessSetting.getSettings();
  
  const { terms } = req.body;
  
  if (!terms) {
    return next(new ErrorResponse('Please provide business terms', 400));
  }
  
  // Update terms
  const updatedSettings = await BusinessSetting.findByIdAndUpdate(
    settings._id,
    { 
      terms,
      updatedBy: req.user.id
    },
    {
      new: true,
      runValidators: true
    }
  );
  
  res.status(200).json({
    success: true,
    data: updatedSettings.terms
  });
}); 