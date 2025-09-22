const path = require('path');
const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const Service = require('../models/service.model');
const cloudinary = require('../utils/cloudinary');
const { Readable } = require('stream');
const tenantContext = require('../utils/tenantContext');

// // @desc    Get all services
// // @route   GET /api/v1/services
// // @access  Public
// exports.getServices = asyncHandler(async (req, res, next) => {
//   res.status(200).json(res.advancedResults);
// });



// controllers/services.js



// @desc    Get ALL services (public access)
// @route   GET /api/v1/services/public
// @access  Public
exports.getPublicServices = asyncHandler(async (req, res, next) => {
  const { category, search, sort, limit } = req.query;
  
  // Build base query
  let query = { isActive: true }; // Only show active services
  
  // Apply filters
  if (category && category !== 'all') {
    query.category = category;
  }
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
  }
  
  // Sorting
  let sortBy = '-createdAt';
  if (sort) {
    sortBy = sort.split(',').join(' ');
  }
  
  // Pagination
  let queryLimit = 20;
  if (limit) {
    queryLimit = Number(limit) > 50 ? 50 : Number(limit); // Max 50 items
  }
  
  // Execute query with tenant population
  const services = await Service.find(query)
    .sort(sortBy)
    .limit(queryLimit)
    .populate('tenantId', 'name subdomain logo');
  
  res.status(200).json({
    success: true,
    count: services.length,
    data: services
  });
});



// // @desc    Get all services for tenant admin
// // @route   GET /api/v1/services
// // @access  Private
// exports.getServices = asyncHandler(async (req, res, next) => {
//   const { category, search, sort } = req.query;
  
//   // Get tenantId from async context, then req.user, then req.tenant, then query param
//   const store = tenantContext.getStore();
//   let tenantId = store?.tenantId || req.user?.tenantId || req.tenant?._id || req.query.tenantId;
//   if (!tenantId) {
//     // Main domain: return empty array instead of error
//     return res.status(200).json({ success: true, count: 0, data: [] });
//   }

//   // Build base query - ALWAYS filter by tenantId
//   let query = { tenantId };

//   // Apply additional filters
//   if (category && category !== 'all') {
//     query.category = category;
//   }
  
//   if (search) {
//     query.$or = [
//       { name: { $regex: search, $options: 'i' } },
//       { description: { $regex: search, $options: 'i' } }
//     ];
//   }
  
//   // Sorting
//   let sortBy = '-createdAt';
//   if (sort) {
//     sortBy = sort.split(',').join(' ');
//   }
  
//   // Execute query
//   const services = await Service.find(query).sort(sortBy);
  
//   res.status(200).json({
//     success: true,
//     count: services.length,
//     data: services
//   });
// });


// @desc    Get services - returns tenant-specific or all services based on context
// @route   GET /api/v1/services
// @access  Private
exports.getServices = asyncHandler(async (req, res, next) => {
  const { category, search, sort } = req.query;
  
  // Get tenantId from async context, then req.user, then req.tenant, then query param
  const store = tenantContext.getStore();
  let tenantId = store?.tenantId || req.user?.tenantId || req.tenant?._id || req.query.tenantId;
  
  // Build query - different behavior for main domain vs subdomain
  let query = {};
  
  // If we have a specific tenant ID, filter by that tenant
  if (tenantId) {
    query.tenantId = tenantId;
    console.log(`🔍 Filtering services for tenant: ${tenantId}`);
  }
  // If no tenantId, check if this is a superadmin domain request
  else {
    const host = req.get('host');
    const domain = host ? host.split(':')[0] : null;
    const isSuperAdminDomain = domain === 'localhost' || domain === '127.0.0.1' || domain === 'www.landscape360.com' || domain === 'landscape360.com';
    
    if (isSuperAdminDomain && req.headers['x-all-tenants'] === 'true') {
      console.log('🌐 Returning ALL services from ALL tenants (superadmin domain request)');
      // No tenant filter - will return all services
      query = {};
    } else {
      console.log('⚠️ No tenant context found, returning empty services array');
      return res.status(200).json({ success: true, count: 0, data: [] });
    }
  }

  // Apply additional filters
  if (category && category !== 'all') {
    query.category = category;
    console.log(`📂 Filtering by category: ${category}`);
  }
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { description: { $regex: search, $options: 'i' } }
    ];
    console.log(`🔎 Searching for: ${search}`);
  }
  
  // Sorting
  let sortBy = '-createdAt';
  if (sort) {
    sortBy = sort.split(',').join(' ');
  }
  console.log(`📊 Sorting by: ${sortBy}`);
  
  // Execute query with population of tenant info
  const services = await Service.find(query)
    .sort(sortBy)
    .populate('tenantId', 'name subdomain');
  
  console.log(`✅ Found ${services.length} services`);
  
  res.status(200).json({
    success: true,
    count: services.length,
    data: services
  });
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


// exports.createService = async (req, res, next) => {
//   try {
//     // Add user to req.bodyv
//     req.body.user = req.user.id;
    
//     const service = await Service.create(req.body);

//     res.status(201).json({
//       success: true,
//       data: service // Ensure response includes full service data with _id
//     });
//   } catch (err) {
//     next(err);
//   }
// };





// @desc    Create service
// @route   POST /api/v1/services
// @access  Private (Tenant Admin)
// In your backend controller
exports.createService = asyncHandler(async (req, res, next) => {
  // Check user role (case insensitive)
  if (!req.user || !['tenantadmin', 'admin'].includes(req.user.role.toLowerCase())) {
    return next(new ErrorResponse(`User not authorized to create services`, 403));
  }

  // Get tenant ID from multiple possible sources
  const tenantId = req.body.tenantId || 
                  req.user.tenantId || 
                  (req.user.tenants && req.user.tenants[0]?.tenant);

  if (!tenantId) {
    return next(new ErrorResponse('Tenant ID is required', 400));
  }

  // Add tenant and creator info to request body
  req.body.tenant = tenantId;
  req.body.tenantId = tenantId;
  req.body.createdBy = req.user.id;

  const service = await Service.create(req.body);
  
  res.status(201).json({
    success: true,
    data: service
  });
});



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

  // Check tenant ownership
  if (req.user.role.toLowerCase() === 'tenantadmin' && 
      service.tenantId.toString() !== req.user.tenantId.toString()) {
    return next(
      new ErrorResponse(`Not authorized to update this service`, 403)
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

  // Check tenant ownership for tenant admins
  if (req.user.role.toLowerCase() === 'tenantadmin' && 
      service.tenantId.toString() !== req.user.tenantId.toString()) {
    return next(
      new ErrorResponse(`Not authorized to delete this service`, 403)
    );
  }

  await service.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Upload service image
// @route   PUT /api/v1/services/:id/photo
// @access  Private/Admin
// exports.servicePhotoUpload = asyncHandler(async (req, res, next) => {
//   const service = await Service.findById(req.params.id);

//   if (!service) {
//     return next(new ErrorResponse(`Service not found`, 404));
//   }

//   if (!req.files?.file) {
//     return next(new ErrorResponse(`Please upload a file`, 400));
//   }

//   const file = req.files.file;

//   // Validate file
//   if (!file.mimetype.startsWith('image')) {
//     return next(new ErrorResponse(`Please upload an image file`, 400));
//   }

//   if (file.size > process.env.MAX_FILE_UPLOAD) {
//     return next(new ErrorResponse(`File too large`, 400));
//   }

//   try {
//     // Convert buffer to stream if needed
//     const uploadStream = () => {
//       if (file.tempFilePath) {
//         // File from temp file path
//         return cloudinary.uploader.upload(file.tempFilePath, {
//           folder: 'service-photos',
//           public_id: `service_${service._id}`,
//           overwrite: true,
//           resource_type: 'auto'
//         });
//       } else {
//         // File from buffer
//         return new Promise((resolve, reject) => {
//           const stream = cloudinary.uploader.upload_stream({
//             folder: 'service-photos',
//             public_id: `service_${service._id}`,
//             overwrite: true,
//             resource_type: 'auto'
//           }, (error, result) => {
//             if (error) return reject(error);
//             resolve(result); // ✅ FIX: resolve with result
//           });
    
//           const bufferStream = new Readable();
//           bufferStream.push(file.data);
//           bufferStream.push(null);
//           bufferStream.pipe(stream);
//         });
//       }
//     };
    

//     const result = await uploadStream();

//     // Update service
//     // service.image = {
//     //   url: result.secure_url,
//     //   publicId: result.public_id
//     // };
//     // service.image = result.secure_url; // ✅ now a string
//     service.image = {
//       url: result.secure_url,
//       publicId: result.public_id
//     };
    

//     await service.save();

//     res.status(200).json({
//       success: true,
//       data: result.secure_url
//     });

//   } catch (err) {
//     console.error('Cloudinary upload error:', {
//       message: err.message,
//       stack: err.stack
//     });
//     return next(new ErrorResponse(`Image upload failed: ${err.message}`, 500));
//   }
// });

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
    // Delete old image if it exists
    if (service.image && service.image.publicId) {
      await cloudinary.uploader.destroy(service.image.publicId);
    }

    // Upload new image
    const uploadStream = () => {
      if (file.tempFilePath) {
        return cloudinary.uploader.upload(file.tempFilePath, {
          folder: 'service-photos',
          public_id: `service_${service._id}_${Date.now()}`,
          overwrite: true,
          resource_type: 'image'
        });
      } else {
        return new Promise((resolve, reject) => {
          const stream = cloudinary.uploader.upload_stream({
            folder: 'service-photos',
            public_id: `service_${service._id}_${Date.now()}`,
            overwrite: true,
            resource_type: 'image'
          }, (error, result) => {
            if (error) return reject(error);
            resolve(result);
          });

          const bufferStream = new Readable();
          bufferStream.push(file.data);
          bufferStream.push(null);
          bufferStream.pipe(stream);
        });
      }
    };

    const result = await uploadStream();

    service.image = {
      url: result.secure_url,
      publicId: result.public_id
    };

    await service.save();

    res.status(200).json({
      success: true,
      data: service.image
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