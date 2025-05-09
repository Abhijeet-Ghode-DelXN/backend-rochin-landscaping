const path = require('path');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const Service = require('../models/service.model');
const cloudinary = require('../utils/cloudinary');
const { Readable } = require('stream');

// @desc    Get all services
// @route   GET /api/v1/services
// @access  Public
exports.getServices = asyncHandler(async (req, res, next) => {
  res.status(200).json(res.advancedResults);
});

// @desc    Get single service
// @route   GET /api/v1/services/:id
// @access  Public
exports.getService = asyncHandler(async (req, res, next) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(
      new ErrorResponse(`Service not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    data: service
  });
});

// @desc    Create new service
// @route   POST /api/v1/services
// @access  Private/Admin
// exports.createService = asyncHandler(async (req, res, next) => {
//   const service = await Service.create(req.body);

//   res.status(201).json({
//     success: true,
//     data: service
//   });
// });


exports.createService = async (req, res, next) => {
  try {
    // Add user to req.body
    req.body.user = req.user.id;
    
    const service = await Service.create(req.body);

    res.status(201).json({
      success: true,
      data: service // Ensure response includes full service data with _id
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update service
// @route   PUT /api/v1/services/:id
// @access  Private/Admin
exports.updateService = asyncHandler(async (req, res, next) => {
  let service = await Service.findById(req.params.id);

  if (!service) {
    return next(
      new ErrorResponse(`Service not found with id of ${req.params.id}`, 404)
    );
  }

  service = await Service.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: service
  });
});

// @desc    Delete service
// @route   DELETE /api/v1/services/:id
// @access  Private/Admin
exports.deleteService = asyncHandler(async (req, res, next) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(
      new ErrorResponse(`Service not found with id of ${req.params.id}`, 404)
    );
  }

  await service.deleteOne(); // if you already have the document


  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Upload service image
// @route   PUT /api/v1/services/:id/photo
// @access  Private/Admin
exports.servicePhotoUpload = asyncHandler(async (req, res, next) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(new ErrorResponse(`Service not found`, 404));
  }

  if (!req.files?.file) {
    return next(new ErrorResponse(`Please upload a file`, 400));
  }

  const file = req.files.file;

  // Validate file
  if (!file.mimetype.startsWith('image')) {
    return next(new ErrorResponse(`Please upload an image file`, 400));
  }

  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(new ErrorResponse(`File too large`, 400));
  }

  try {
    // Convert buffer to stream if needed
    const uploadStream = () => {
      if (file.tempFilePath) {
        // File from temp file path
        return cloudinary.uploader.upload(file.tempFilePath, {
          folder: 'service-photos',
          public_id: `service_${service._id}`,
          overwrite: true,
          resource_type: 'auto'
        });
      } else {
        // File from buffer
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({
            folder: 'service-photos',
            public_id: `service_${service._id}`,
            overwrite: true,
            resource_type: 'auto'
          }, (error, result) => {
            if (error) return reject(error);
            resolve(result); // ✅ FIX: resolve with result
          });
    
          const bufferStream = new Readable();
          bufferStream.push(file.data);
          bufferStream.push(null);
          bufferStream.pipe(stream);
        });
      }
    };
    

    const result = await uploadStream();

    // Update service
    // service.image = {
    //   url: result.secure_url,
    //   publicId: result.public_id
    // };
    service.image = result.secure_url; // ✅ now a string

    await service.save();

    res.status(200).json({
      success: true,
      data: result.secure_url
    });

  } catch (err) {
    console.error('Cloudinary upload error:', {
      message: err.message,
      stack: err.stack
    });
    return next(new ErrorResponse(`Image upload failed: ${err.message}`, 500));
  }
});


// @desc    Get services by category
// @route   GET /api/v1/services/category/:category
// @access  Public
exports.getServicesByCategory = asyncHandler(async (req, res, next) => {
  const services = await Service.find({ 
    category: req.params.category,
    isActive: true 
  });

  res.status(200).json({
    success: true,
    count: services.length,
    data: services
  });
});

// @desc    Get service packages
// @route   GET /api/v1/services/:id/packages
// @access  Public
exports.getServicePackages = asyncHandler(async (req, res, next) => {
  const service = await Service.findById(req.params.id);

  if (!service) {
    return next(
      new ErrorResponse(`Service not found with id of ${req.params.id}`, 404)
    );
  }

  res.status(200).json({
    success: true,
    count: service.packages.length,
    data: service.packages
  });
}); 