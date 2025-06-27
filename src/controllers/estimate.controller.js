const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const Estimate = require('../models/estimate.model');
const Customer = require('../models/customer.model');
const User = require('../models/user.model');
const Tenant = require('../models/tenant.model');
const cloudinary = require('../utils/cloudinary');
const sendEmail = require('../utils/sendEmail');
const Service = require('../models/service.model'); // Adjust the path as needed

// controllers/estimate.controller.js

// @desc    Get all estimates
// @route   GET /api/v1/estimates
// @access  Private/Admin
exports.getEstimates = asyncHandler(async (req, res, next) => {
  // Initialize query
  let query;

  // For super admin - get all estimates with tenant population
  if (req.user.role === 'superAdmin') {
    query = Estimate.find().populate('tenant', 'name subdomain');
  } 
  // For tenant admin/staff - get only their tenant's estimates
  else if (req.user.tenantId) {
    query = Estimate.find({ tenant: req.user.tenantId });
  }
  // For customers - get only their own estimates
  else if (req.user.role === 'customer') {
    query = Estimate.find({ customer: req.user.id });
  } else {
    return next(new ErrorResponse('Not authorized to access estimates', 403));
  }

  // Populate customer and service details
  query = query
    .populate({
      path: 'customer',
      select: 'user propertyDetails',
      populate: {
        path: 'user',
        select: 'name email phone'
      }
    })
    .populate({
      path: 'services.service',
      select: 'name description basePrice category'
    })
    .populate({
      path: 'createdBy',
      select: 'name email role'
    })
    .sort('-createdAt');

  // Execute query with advanced results middleware
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
      select: 'name category description basePrice'
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
// exports.updateEstimate = asyncHandler(async (req, res, next) => {
//   let estimate = await Estimate.findById(req.params.id);

//   if (!estimate) {
//     return next(
//       new ErrorResponse(`Estimate not found with id of ${req.params.id}`, 404)
//     );
//   }

//   // Make sure user is admin
//   if (req.user.role !== 'admin') {
//     return next(
//       new ErrorResponse(`Not authorized to update this estimate`, 403)
//     );
//   }

//  estimate = await Estimate.findByIdAndUpdate(req.params.id, req.body, {
//   new: true,
//   runValidators: true
// }).populate('services.service'); // 👈 this is key

// // estimate = await Estimate.findByIdAndUpdate(req.params.id, req.body, {
// //     new: true,
// //     runValidators: true
// //   });


//   res.status(200).json({
//     success: true,
//     data: estimate
//   });
// });


exports.updateEstimate = asyncHandler(async (req, res, next) => {
  let estimate = await Estimate.findById(req.params.id).populate('services.service');

  if (!estimate) {
    return next(new ErrorResponse(`Estimate not found with id of ${req.params.id}`, 404));
  }

  // Make sure user is admin
  if (req.user.role !== 'admin') {
    return next(new ErrorResponse(`Not authorized to update this estimate`, 403));
  }

  // Update service names if they changed
  for (const serviceItem of req.body.services) {
    if (serviceItem.service.name) {
      await Service.findByIdAndUpdate(
        serviceItem.service._id,
        { name: serviceItem.service.name },
        { new: true }
      );
    }
  }

  // Update the estimate
  estimate = await Estimate.findByIdAndUpdate(
    req.params.id, 
    req.body, 
    {
      new: true,
      runValidators: true
    }
  ).populate('services.service');

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

  // // Check if user is authorized
  // if (req.user.role !== 'admin' && req.user.role !== 'professional' &&
  //     estimate.customer.toString() !== req.user.id) {
  //   return next(
  //     new ErrorResponse(`Not authorized to upload photos to this estimate`, 403)
  //   );
  // }

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
    // if (photo.size > process.env.MAX_FILE_UPLOAD) {
    //   throw new ErrorResponse(
    //     `Please upload images less than ${process.env.MAX_FILE_UPLOAD}`,
    //     400
    //   );
    // }

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




exports.requestEstimate = asyncHandler(async (req, res, next) => {
  // Get tenantId from body or headers
  const tenantId = req.body.tenantId || req.headers['x-tenant-id'];
  
  if (!tenantId) {
    return next(new ErrorResponse('Tenant context is missing', 400));
  }

  // Get customer profile
  const customer = await Customer.findOne({ user: req.user.id });
  if (!customer) {
    return next(new ErrorResponse('No customer profile found', 404));
  }

  // Validate services
  if (!req.body.services?.length) {
    return next(new ErrorResponse('At least one service is required', 400));
  }

  // Verify tenant exists
  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    return next(new ErrorResponse('Invalid tenant ID', 404));
  }

  // Verify services belong to tenant
  const serviceIds = req.body.services.map(s => s.service);
  const services = await Service.find({
    _id: { $in: serviceIds },
    tenantId: tenantId
  });

  if (services.length !== serviceIds.length) {
    return next(new ErrorResponse('Some services don\'t belong to this tenant', 400));
  }

  // Create estimate
  const estimateData = {
    customer: customer._id,
    tenant: tenantId,
    services: req.body.services.map(s => ({
      service: s.service,
      quantity: s.quantity || 1,
      package: s.package
    })),
    property: {
      address: req.body.property?.address || customer.address,
      size: req.body.property?.size || customer.propertyDetails?.size,
      details: req.body.property?.details
    },
    status: 'Requested',
    createdBy: req.user.id
  };

  let estimate = await Estimate.create(estimateData);

  // Populate and respond
  estimate = await estimate.populate([
    { path: 'customer', populate: { path: 'user' } },
    { path: 'services.service' },
    { path: 'createdBy' },
    { path: 'tenant', populate: { path: 'owner' } }
  ]);

  // Notify tenant (fail silently if email fails)
  try {
    await sendEmail({
      email: estimate.tenant.owner.email,
      subject: 'New Estimate Request',
      message: `New estimate request from ${req.user.name} (ID: ${estimate.estimateNumber})`
    });
  } catch (err) {
    console.error('Email failed:', err);
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

// // @desc    Approve estimate package
// // @route   PUT /api/v1/estimates/:id/approve
// // @access  Private/Customer
// exports.approveEstimate = asyncHandler(async (req, res, next) => {
//   const { packageName } = req.body;

//   if (!packageName) {
//     return next(new ErrorResponse(`Please provide the package name to approve`, 400));
//   }

//   let estimate = await Estimate.findById(req.params.id);

//   if (!estimate) {
//     return next(
//       new ErrorResponse(`Estimate not found with id of ${req.params.id}`, 404)
//     );
//   }

//   // Get customer
//   const customer = await Customer.findOne({ user: req.user.id });

//   if (!customer) {
//     return next(new ErrorResponse(`No customer profile found`, 404));
//   }

//   // Verify customer owns this estimate
//   if (estimate.customer.toString() !== customer._id.toString()) {
//     return next(new ErrorResponse(`Not authorized to approve this estimate`, 403));
//   }

//   // Verify the package exists
//   const packageExists = estimate.packages.some(pkg => pkg.name === packageName);
  
//   if (!packageExists) {
//     return next(new ErrorResponse(`Package "${packageName}" not found in this estimate`, 404));
//   }

//   // Update estimate status
//   estimate.status = 'Approved';
//   estimate.approvedPackage = packageName;
//   await estimate.save();

//   // Notify admin about estimate approval
//   const admins = await User.find({ role: 'admin' });
  
//   if (admins.length > 0) {
//     try {
//       await sendEmail({
//         email: admins[0].email,
//         subject: 'Estimate Approved',
//         message: `Estimate ${estimate.estimateNumber} has been approved by ${req.user.name}. Approved package: ${packageName}`
//       });
//     } catch (err) {
//       console.log('Email notification failed:', err);
//     }
//   }

//   res.status(200).json({
//     success: true,
//     data: estimate
//   });
// }); 



// @desc    Update estimate
// @route   PUT /api/v1/estimates/:id
// @access  Private/Admin
exports.approveEstimate = asyncHandler(async (req, res, next) => {
  let estimate = await Estimate.findById(req.params.id).populate('customer', 'user phone');

  if (!estimate) {
    return next(
      new ErrorResponse(`Estimate not found with id of ${req.params.id}`, 404)
    );
  }

  // Check if status is being updated to Approved
  const isApproving = req.body.status === 'Approved' && estimate.status !== 'Approved';

  // Update estimate
  estimate = await Estimate.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  }).populate({
    path: 'customer',
    populate: {
      path: 'user',
      select: 'name email'
    }
  });

  // If status was updated to Approved, send notification
  if (isApproving && estimate.customer?.user?.email) {
    try {
      await sendEmail({
        email: estimate.customer.user.email,
        subject: 'Your Estimate Has Been Approved',
        message: `Dear ${estimate.customer.user.name},\n\nYour estimate #${estimate.estimateNumber} has been approved by our team.\n\nThank you for choosing our services!\n\nBest regards,\nThe Landscaping Team`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #2d3748;">Estimate Approved</h2>
            <p>Dear ${estimate.customer.user.name},</p>
            <p>Your estimate <strong>#${estimate.estimateNumber}</strong> has been approved by our team.</p>
            <p>Thank you for choosing our services!</p>
            <p style="margin-top: 30px;">Best regards,<br>The Landscaping Team</p>
          </div>
        `
      });
    } catch (err) {
      console.error('Failed to send approval email:', err);
      // Don't fail the request just because email failed
    }
  }

  res.status(200).json({
    success: true,
    data: estimate
  });
});