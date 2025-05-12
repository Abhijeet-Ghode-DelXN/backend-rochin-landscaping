const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const Estimate = require('../models/estimate.model');
const Customer = require('../models/customer.model');
const User = require('../models/user.model');
const cloudinary = require('../utils/cloudinary');
const sendEmail = require('../utils/sendEmail');

// @desc    Get all estimates
// @route   GET /api/v1/estimates
// @access  Private/Admin
exports.getEstimates = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single estimate
// @route   GET /api/v1/estimates/:id
// @access  Private
exports.getEstimate = asyncHandler(async (req, res, next) => {
  const estimate = await Estimate.findById(req.params.id)
    .populate({
      path: 'customer',
      select: 'address propertyDetails',
      populate: {
        path: 'user',
        select: 'name email phone'
      }
    })
    .populate({
      path: 'services.service',
      select: 'name description basePrice'
    })
    .populate({
      path: 'assignedTo',
      select: 'name'
    })
    .populate({
      path: 'createdBy',
      select: 'name'
    });

  if (!estimate) {
    return next(
      new ErrorResponse(`Estimate not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is authorized to view
  if (req.user.role !== 'admin' && 
      req.user.role !== 'professional' &&
      estimate.customer.user._id.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`Not authorized to access this estimate`, 403)
    );
  }

  res.status(200).json({
    success: true,
    data: estimate
  });
});

// @desc    Create new estimate
// @route   POST /api/v1/estimates
// @access  Private/Admin
exports.createEstimate = asyncHandler(async (req, res, next) => {
  // Add user as creator
  req.body.createdBy = req.user.id;

  // Check customer exists
  const customer = await Customer.findById(req.body.customer);
  if (!customer) {
    return next(
      new ErrorResponse(`Customer not found with id of ${req.body.customer}`, 404)
    );
  }

  // Set default expiry date (30 days from now)
  if (!req.body.expiryDate) {
    req.body.expiryDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }

  const estimate = await Estimate.create(req.body);

  res.status(201).json({
    success: true,
    data: estimate
  });
});

// @desc    Update estimate
// @route   PUT /api/v1/estimates/:id
// @access  Private/Admin
exports.updateEstimate = asyncHandler(async (req, res, next) => {
  let estimate = await Estimate.findById(req.params.id);

  if (!estimate) {
    return next(
      new ErrorResponse(`Estimate not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is admin
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`Not authorized to update this estimate`, 403)
    );
  }

  estimate = await Estimate.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: estimate
  });
});

// @desc    Delete estimate
// @route   DELETE /api/v1/estimates/:id
// @access  Private/Admin
exports.deleteEstimate = asyncHandler(async (req, res, next) => {
  const estimate = await Estimate.findById(req.params.id);

  if (!estimate) {
    return next(
      new ErrorResponse(`Estimate not found with id of ${req.params.id}`, 404)
    );
  }

  // Make sure user is admin
  if (req.user.role !== 'admin') {
    return next(
      new ErrorResponse(`Not authorized to delete this estimate`, 403)
    );
  }

  await estimate.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Upload photos for estimate
// @route   POST /api/v1/estimates/:id/photos
// @access  Private
exports.uploadEstimatePhotos = asyncHandler(async (req, res, next) => {
  const estimate = await Estimate.findById(req.params.id);

  if (!estimate) {
    return next(
      new ErrorResponse(`Estimate not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if user is authorized
  if (req.user.role !== 'admin' && req.user.role !== 'professional' &&
      estimate.customer.toString() !== req.user.id) {
    return next(
      new ErrorResponse(`Not authorized to upload photos to this estimate`, 403)
    );
  }

  if (!req.files || !req.files.photos) {
    return next(new ErrorResponse(`Please upload at least one photo`, 400));
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
      folder: `landscaping/estimates/${estimate._id}`
    });

    return {
      url: result.secure_url,
      caption: req.body.caption || '',
      category: req.body.category || 'Other'
    };
  });

  try {
    const uploadedPhotos = await Promise.all(uploadPromises);

    // Add photos to estimate
    estimate.photos.push(...uploadedPhotos);
    await estimate.save();

    res.status(200).json({
      success: true,
      count: uploadedPhotos.length,
      data: uploadedPhotos
    });
  } catch (err) {
    return next(new ErrorResponse(`Problem with photo upload: ${err.message}`, 500));
  }
});

// // @desc    Request estimate (Customer)
// // @route   POST /api/v1/estimates/request
// // @access  Private/Customer
// exports.requestEstimate = asyncHandler(async (req, res, next) => {
//   // Get customer profile
//   const customer = await Customer.findOne({ user: req.user.id });

//   if (!customer) {
//     return next(new ErrorResponse(`No customer profile found`, 404));
//   }

//   // Create estimate request
//   const estimateData = {
//     customer: customer._id,
//     services: req.body.services,
//     property: {
//       address: req.body.property.address || customer.address,
//       size: req.body.property.size || customer.propertyDetails.size,
//       details: req.body.property.details
//     },
//     customerNotes: req.body.notes,
//     budget: req.body.budget,
//     accessInfo: req.body.accessInfo,
//     status: 'Requested',
//     createdBy: req.user.id
//   };

//   const estimate = await Estimate.create(estimateData);

//   // Notify admin about new estimate request
//   const admins = await User.find({ role: 'admin' });
  
//   if (admins.length > 0) {
//     try {
//       await sendEmail({
//         email: admins[0].email,
//         subject: 'New Estimate Request',
//         message: `A new estimate request has been submitted by ${req.user.name}. Estimate ID: ${estimate.estimateNumber}`
//       });
//     } catch (err) {
//       console.log('Email notification failed:', err);
//     }
//   }

//   res.status(201).json({
//     success: true,
//     data: estimate
//   });
// });




// @desc    Request estimate (Customer)
// @route   POST /api/v1/estimates/request
// @access  Private/Customer
exports.requestEstimate = asyncHandler(async (req, res, next) => {
  // Get customer profile
  const customer = await Customer.findOne({ user: req.user.id });

  if (!customer) {
    return next(new ErrorResponse(`No customer profile found`, 404));
  }

  // Create estimate request
  const estimateData = {
    customer: customer._id,
    services: req.body.services,
    property: {
      address: req.body.property.address || customer.address,
      size: req.body.property.size || customer.propertyDetails.size,
      details: req.body.property.details
    },
    customerNotes: req.body.notes,
    budget: req.body.budget,
    accessInfo: req.body.accessInfo,
    status: 'Requested',
    createdBy: req.user.id
  };

  let estimate = await Estimate.create(estimateData);

  // 💡 Populate customer details, their linked user, and service details
  estimate = await estimate.populate([
    {
      path: 'customer',
      populate: { path: 'user' } // gets name, email from User model
    },
    {
      path: 'services.service' // gets full service info
    },
    {
      path: 'createdBy' // gets user info for who created
    }
  ]);

  // Notify admin about new estimate request
  const admins = await User.find({ role: 'admin' });
  
  if (admins.length > 0) {
    try {
      await sendEmail({
        email: admins[0].email,
        subject: 'New Estimate Request',
        message: `A new estimate request has been submitted by ${req.user.name}. Estimate ID: ${estimate.estimateNumber}`
      });
    } catch (err) {
      console.log('Email notification failed:', err);
    }
  }

  res.status(201).json({
    success: true,
    data: estimate
  });
});




// @desc    Get my estimates (Customer)
// @route   GET /api/v1/estimates/my-estimates
// @access  Private/Customer
exports.getMyEstimates = asyncHandler(async (req, res, next) => {
  // Get customer profile
  const customer = await Customer.findOne({ user: req.user.id });

  if (!customer) {
    return next(new ErrorResponse(`No customer profile found`, 404));
  }

  const estimates = await Estimate.find({ customer: customer._id })
    .populate({
      path: 'services.service',
      select: 'name description'
    })
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: estimates.length,
    data: estimates
  });
});

// @desc    Approve estimate package
// @route   PUT /api/v1/estimates/:id/approve
// @access  Private/Customer
exports.approveEstimate = asyncHandler(async (req, res, next) => {
  const { packageName } = req.body;

  if (!packageName) {
    return next(new ErrorResponse(`Please provide the package name to approve`, 400));
  }

  let estimate = await Estimate.findById(req.params.id);

  if (!estimate) {
    return next(
      new ErrorResponse(`Estimate not found with id of ${req.params.id}`, 404)
    );
  }

  // Get customer
  const customer = await Customer.findOne({ user: req.user.id });

  if (!customer) {
    return next(new ErrorResponse(`No customer profile found`, 404));
  }

  // Verify customer owns this estimate
  if (estimate.customer.toString() !== customer._id.toString()) {
    return next(new ErrorResponse(`Not authorized to approve this estimate`, 403));
  }

  // Verify the package exists
  const packageExists = estimate.packages.some(pkg => pkg.name === packageName);
  
  if (!packageExists) {
    return next(new ErrorResponse(`Package "${packageName}" not found in this estimate`, 404));
  }

  // Update estimate status
  estimate.status = 'Approved';
  estimate.approvedPackage = packageName;
  await estimate.save();

  // Notify admin about estimate approval
  const admins = await User.find({ role: 'admin' });
  
  if (admins.length > 0) {
    try {
      await sendEmail({
        email: admins[0].email,
        subject: 'Estimate Approved',
        message: `Estimate ${estimate.estimateNumber} has been approved by ${req.user.name}. Approved package: ${packageName}`
      });
    } catch (err) {
      console.log('Email notification failed:', err);
    }
  }

  res.status(200).json({
    success: true,
    data: estimate
  });
}); 