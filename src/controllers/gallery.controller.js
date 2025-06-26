// const Gallery = require('../models/gallery.model');
// const cloudinary = require('../utils/cloudinary');
// const asyncHandler = require('../middlewares/async');
// const ErrorResponse = require('../utils/errorResponse');

// // @desc    Create new gallery entry
// // @route   POST /api/v1/gallery
// // @access  Private/Admin
// exports.createGallery = asyncHandler(async (req, res, next) => {
//   console.log('Request received - Files:', req.files); // Debug log
//   console.log('Request received - Body:', req.body); // Debug log

//   // Validate required fields
//   const { title, description, location, category, projectDate } = req.body;
  
//   if (!title || !description || !location || !category || !projectDate) {
//     return next(new ErrorResponse('Missing required fields', 400));
//   }

//   // Handle image uploads
//   const images = [];
  
//   if (req.files && req.files.images) {
//     // Convert single file to array for consistent processing
//     const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    
//     try {
//       for (const file of files) {
//         const result = await cloudinary.uploader.upload(file.tempFilePath, {
//           folder: 'gallery',
//           resource_type: 'auto'
//         });
        
//         images.push({
//           url: result.secure_url,
//           publicId: result.public_id,
//           caption: req.body.captions ? req.body.captions[files.indexOf(file)] : ''
//         });
//       }
//     } catch (uploadError) {
//       console.error('Cloudinary upload error:', uploadError);
//       return next(new ErrorResponse('Error uploading images to Cloudinary', 500));
//     }
//   }

//   try {
//     const gallery = await Gallery.create({
//       title,
//       description,
//       location,
//       category,
//       projectDate,
//       images,
//       thumbnailIndex: req.body.thumbnailIndex ? parseInt(req.body.thumbnailIndex) : 0, // Ensure this is included
//       tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
//       clientName: req.body.clientName || '',
//       projectDuration: req.body.projectDuration || '',
//       status: req.body.status || 'draft'
//     });

//     res.status(201).json({
//       success: true,
//       data: gallery
//     });
//   } catch (dbError) {
//     console.error('Database error:', dbError);
//     return next(new ErrorResponse('Error creating gallery in database', 500));
//   }
// });

// // // @desc    Get all gallery entries
// // // @route   GET /api/v1/gallery
// // // @access  Public
// // exports.getGalleries = asyncHandler(async (req, res, next) => {
// //   const galleries = await Gallery.find().sort('-createdAt');
  
// //   res.status(200).json({
// //     success: true,
// //     count: galleries.length,
// //     data: galleries.map(gallery => ({
// //       ...gallery.toObject(),
// //       thumbnailIndex: gallery.thumbnailIndex || 0 // Ensure it's always included
// //     }))
// //   });
// // });

// // @desc    Get all gallery entries
// // @route   GET /api/v1/gallery
// // @access  Public
// exports.getGalleries = asyncHandler(async (req, res, next) => {
//   const galleries = await Gallery.find().sort('-createdAt');
  
//   res.status(200).json({
//     success: true,
//     count: galleries.length,
//     data: galleries.map(gallery => ({
//       ...gallery.toObject(),
//       thumbnailIndex: gallery.thumbnailIndex || 0 // Ensure it's always included
//     }))
//   });
// });

// // @desc    Get single gallery entry
// // @route   GET /api/v1/gallery/:id
// // @access  Public
// exports.getGallery = asyncHandler(async (req, res, next) => {
//   const gallery = await Gallery.findById(req.params.id);

//   if (!gallery) {
//     return next(new ErrorResponse(`Gallery not found with id of ${req.params.id}`, 404));
//   }

//   res.status(200).json({
//     success: true,
//     data: gallery
//   });
// });

// // @desc    Update gallery entry
// // @route   PUT /api/v1/gallery/:id
// // @access  Private/Admin
// // exports.updateGallery = asyncHandler(async (req, res, next) => {
// //   let gallery = await Gallery.findById(req.params.id);

// //   if (!gallery) {
// //     return next(new ErrorResponse(`Gallery not found with id of ${req.params.id}`, 404));
// //   }

// //   // Handle new image uploads
// //   if (req.files && req.files.images) {
// //     const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    
// //     for (const file of files) {
// //       const result = await cloudinary.uploader.upload(file.tempFilePath, {
// //         folder: 'gallery',
// //         resource_type: 'auto'
// //       });
      
// //       gallery.images.push({
// //         url: result.secure_url,
// //         publicId: result.public_id,
// //         caption: req.body.captions ? req.body.captions[files.indexOf(file)] : ''
// //       });
// //     }
// //   }

// //   // Update other fields
// //   const updateFields = ['title', 'description', 'location', 'category', 'projectDate', 'status', 'clientName', 'projectDuration'];
// //   updateFields.forEach(field => {
// //     if (req.body[field]) {
// //       gallery[field] = req.body[field];
// //     }
// //   });

// //   if (req.body.tags) {
// //     gallery.tags = req.body.tags.split(',').map(tag => tag.trim());
// //   }

// //   await gallery.save();

// //   res.status(200).json({
// //     success: true,
// //     data: gallery
// //   });
// // });


// // @desc    Update gallery entry
// // @route   PUT /api/v1/gallery/:id
// // @access  Private/Admin
// exports.updateGallery = asyncHandler(async (req, res, next) => {
//   let gallery = await Gallery.findById(req.params.id);

//   if (!gallery) {
//     return next(new ErrorResponse(`Gallery not found with id of ${req.params.id}`, 404));
//   }

//   // Handle thumbnail index update - this should come first
//   if (req.body.thumbnailIndex !== undefined) {
//     gallery.thumbnailIndex = parseInt(req.body.thumbnailIndex);
//   }

//   // Handle new image uploads
//   if (req.files && req.files.images) {
//     const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    
//     for (const file of files) {
//       const result = await cloudinary.uploader.upload(file.tempFilePath, {
//         folder: 'gallery',
//         resource_type: 'auto'
//       });
      
//       gallery.images.push({
//         url: result.secure_url,
//         publicId: result.public_id,
//         caption: req.body.captions ? req.body.captions[files.indexOf(file)] : ''
//       });
//     }
//   }

//   // Update other fields including thumbnailIndex
//   const updateFields = ['title', 'description', 'location', 'category', 'projectDate', 'status', 'clientName', 'projectDuration', 'thumbnailIndex'];
//   updateFields.forEach(field => {
//     if (req.body[field]) {
//       gallery[field] = req.body[field];
//     }
//   });

//   if (req.body.tags) {
//     gallery.tags = req.body.tags.split(',').map(tag => tag.trim());
//   }

//   await gallery.save();

//  res.status(200).json({
//     success: true,
//     data: {
//       ...gallery.toObject(),
//       thumbnailIndex: gallery.thumbnailIndex // Ensure it's included in response
//     }
//   });
// });





// // @desc    Delete gallery entry
// // @route   DELETE /api/v1/gallery/:id
// // @access  Private/Admin
// exports.deleteGallery = asyncHandler(async (req, res, next) => {
//   const gallery = await Gallery.findById(req.params.id);

//   if (!gallery) {
//     return next(new ErrorResponse(`Gallery not found with id of ${req.params.id}`, 404));
//   }

//   // Delete images from cloudinary
//   for (const image of gallery.images) {
//     await cloudinary.uploader.destroy(image.publicId);
//   }

//   await Gallery.findByIdAndDelete(req.params.id);


//   res.status(200).json({
//     success: true,
//     data: {}
//   });
// });

// // @desc    Delete image from gallery
// // @route   DELETE /api/v1/gallery/:galleryId/images/:imageId
// // @access  Private/Admin
// exports.deleteImage = asyncHandler(async (req, res, next) => {
//   const { galleryId, imageId } = req.params;

//   if (!galleryId || !imageId) {
//     return next(new ErrorResponse('Gallery ID and Image ID are required', 400));
//   }

//   // Find the gallery
//   const gallery = await Gallery.findById(galleryId);
//   if (!gallery) {
//     return next(new ErrorResponse(`Gallery not found with id of ${galleryId}`, 404));
//   }

//   // Find the image in the gallery
//   const imageIndex = gallery.images.findIndex(img => img._id && img._id.toString() === imageId);
//   if (imageIndex === -1) {
//     return next(new ErrorResponse(`Image not found with id of ${imageId}`, 404));
//   }

//   const image = gallery.images[imageIndex];

//   try {
//     // Delete from Cloudinary if publicId exists
//     if (image.publicId) {
//       await cloudinary.uploader.destroy(image.publicId);
//     }

//     // Remove image from gallery's images array
//     gallery.images.splice(imageIndex, 1);
//     await gallery.save();

//     res.status(200).json({
//       success: true,
//       message: 'Image deleted successfully',
//       data: gallery
//     });
//   } catch (error) {
//     console.error('Error deleting image:', error);
//     return next(new ErrorResponse('Error deleting image', 500));
//   }
// }); 















const Gallery = require('../models/gallery.model');
const cloudinary = require('../utils/cloudinary');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create new gallery entry
// @route   POST /api/v1/gallery
// @access  Private/Admin
exports.createGallery = asyncHandler(async (req, res, next) => {
  // Validate required fields
  const { title, description, location, category, projectDate } = req.body;
  
  if (!title || !description || !location || !category || !projectDate) {
    return next(new ErrorResponse('Missing required fields', 400));
  }

  // Handle image uploads
  const images = [];
  
  if (req.files && req.files.images) {
    const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    
    try {
      for (const file of files) {
        const result = await cloudinary.uploader.upload(file.tempFilePath, {
          folder: 'gallery',
          resource_type: 'auto'
        });
        
        images.push({
          url: result.secure_url,
          publicId: result.public_id,
          caption: req.body.captions ? req.body.captions[files.indexOf(file)] : ''
        });
      }
    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      return next(new ErrorResponse('Error uploading images to Cloudinary', 500));
    }
  }

  try {
    const galleryData = {
      title,
      description,
      location,
      category,
      projectDate,
      images,
      thumbnailIndex: req.body.thumbnailIndex ? parseInt(req.body.thumbnailIndex) : 0,
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
      clientName: req.body.clientName || '',
      projectDuration: req.body.projectDuration || '',
      status: req.body.status || 'draft',
      createdBy: req.user.id // Track who created the gallery
    };

    // Set tenant ID correctly from the token
    if (req.user.tenantId) {
      galleryData.tenant = req.user.tenantId._id; // Use the _id from tenantId object
    } else if (req.user.tenant) {
      galleryData.tenant = req.user.tenant; // Fallback to tenant if exists
    } else {
      return next(new ErrorResponse('Tenant information is missing', 400));
    }

    const gallery = await Gallery.create(galleryData);

    res.status(201).json({
      success: true,
      data: gallery
    });
  } catch (dbError) {
    console.error('Database error:', dbError);
    return next(new ErrorResponse('Error creating gallery in database', 500));
  }
});

// @desc    Get all gallery entries for current tenant admin
// @route   GET /api/v1/gallery
// @access  Private/TenantAdmin
exports.getGalleries = asyncHandler(async (req, res, next) => {
  // Initialize filter object
  const filter = {};
  
  // For tenant admins, enforce strict filtering
  if (req.user && req.user.role === 'tenantAdmin') {
    // Get tenant ID - handle different possible structures
    const tenantId = req.user.tenantId?._id || req.user.tenantId || req.user.tenant;
    
    if (!tenantId) {
      return next(new ErrorResponse('Tenant information missing', 400));
    }

    // Only show galleries that:
    // 1. Belong to the tenant AND were created by this user
    // OR
    // 2. Were created before tenant system was implemented (no tenant field) AND created by this user
    filter.$or = [
      { 
        $and: [
          { tenant: tenantId },
          { createdBy: req.user.id }
        ]
      },
      {
        $and: [
          { tenant: { $exists: false } }, // No tenant field
          { createdBy: req.user.id }
        ]
      }
    ];
  } 
  // For super admins or other roles
  else if (req.user && req.user.tenant) {
    filter.tenant = req.user.tenant;
  }
  // For unauthorized cases
  else {
    return next(new ErrorResponse('Not authorized', 401));
  }

  console.log('Final gallery filter:', JSON.stringify(filter, null, 2));

  const galleries = await Gallery.find(filter).sort('-createdAt');
  
  res.status(200).json({
    success: true,
    count: galleries.length,
    data: galleries.map(gallery => ({
      ...gallery.toObject(),
      thumbnailIndex: gallery.thumbnailIndex || 0
    }))
  });
});

// @desc    Get single gallery entry (with tenant check)
// @route   GET /api/v1/gallery/:id
// @access  Public
exports.getGallery = asyncHandler(async (req, res, next) => {
  const gallery = await Gallery.findById(req.params.id);

  if (!gallery) {
    return next(new ErrorResponse(`Gallery not found with id of ${req.params.id}`, 404));
  }

  // Check if user has access to this gallery (if they're authenticated)
  if (req.user && req.user.tenant && !gallery.belongsToTenant(req.user.tenant)) {
    return next(new ErrorResponse(`Not authorized to access this gallery`, 403));
  }

  res.status(200).json({
    success: true,
    data: gallery
  });
});

// @desc    Update gallery entry (with tenant check)
// @route   PUT /api/v1/gallery/:id
// @access  Private/Admin
exports.updateGallery = asyncHandler(async (req, res, next) => {
  let gallery = await Gallery.findById(req.params.id);

  if (!gallery) {
    return next(new ErrorResponse(`Gallery not found with id of ${req.params.id}`, 404));
  }

  // Check if user has access to this gallery
  if (req.user.tenant && !gallery.belongsToTenant(req.user.tenant)) {
    return next(new ErrorResponse(`Not authorized to update this gallery`, 403));
  }

  // Handle thumbnail index update
  if (req.body.thumbnailIndex !== undefined) {
    gallery.thumbnailIndex = parseInt(req.body.thumbnailIndex);
  }

  // Handle new image uploads
  if (req.files && req.files.images) {
    const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    
    for (const file of files) {
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: 'gallery',
        resource_type: 'auto'
      });
      
      gallery.images.push({
        url: result.secure_url,
        publicId: result.public_id,
        caption: req.body.captions ? req.body.captions[files.indexOf(file)] : ''
      });
    }
  }

  // Update other fields
  const updateFields = ['title', 'description', 'location', 'category', 'projectDate', 'status', 'clientName', 'projectDuration', 'thumbnailIndex'];
  updateFields.forEach(field => {
    if (req.body[field]) {
      gallery[field] = req.body[field];
    }
  });

  if (req.body.tags) {
    gallery.tags = req.body.tags.split(',').map(tag => tag.trim());
  }

  await gallery.save();

  res.status(200).json({
    success: true,
    data: {
      ...gallery.toObject(),
      thumbnailIndex: gallery.thumbnailIndex
    }
  });
});

// // @desc    Delete gallery entry (with tenant check)
// // @route   DELETE /api/v1/gallery/:id
// // @access  Private/Admin
// exports.deleteGallery = asyncHandler(async (req, res, next) => {
//   const gallery = await Gallery.findById(req.params.id);

//   if (!gallery) {
//     return next(new ErrorResponse(`Gallery not found with id of ${req.params.id}`, 404));
//   }

//   // Check if user has access to this gallery
//   if (req.user.tenant && !gallery.belongsToTenant(req.user.tenant)) {
//     return next(new ErrorResponse(`Not authorized to delete this gallery`, 403));
//   }

//   // Delete images from cloudinary
//   for (const image of gallery.images) {
//     await cloudinary.uploader.destroy(image.publicId);
//   }

//   await gallery.remove();

//   res.status(200).json({
//     success: true,
//     data: {}
//   });
// });


//   @desc    Delete gallery entry (with tenant check)
// @route   DELETE /api/v1/gallery/:id
// @access  Private/Admin
exports.deleteGallery = asyncHandler(async (req, res, next) => {
  try {
    const gallery = await Gallery.findById(req.params.id);

    if (!gallery) {
      return next(new ErrorResponse(`Gallery not found with id of ${req.params.id}`, 404));
    }

    // Tenant check
    if (req.user.tenant && !gallery.belongsToTenant(req.user.tenant)) {
      return next(new ErrorResponse(`Not authorized to delete this gallery`, 403));
    }

    // Delete images from cloudinary
    const deletePromises = gallery.images.map(image => 
      cloudinary.uploader.destroy(image.publicId)
    );
    await Promise.all(deletePromises);

    // Delete gallery document
    await Gallery.deleteOne({ _id: gallery._id });

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (err) {
    // Handle Cloudinary errors or DB errors
    console.error('Error deleting gallery:', err);
    return next(new ErrorResponse('Failed to delete gallery', 500));
  }
});

// @desc    Delete image from gallery (with tenant check)
// @route   DELETE /api/v1/gallery/:galleryId/images/:imageId
// @access  Private/Admin
exports.deleteImage = asyncHandler(async (req, res, next) => {
  const { galleryId, imageId } = req.params;

  if (!galleryId || !imageId) {
    return next(new ErrorResponse('Gallery ID and Image ID are required', 400));
  }

  // Find the gallery
  const gallery = await Gallery.findById(galleryId);
  if (!gallery) {
    return next(new ErrorResponse(`Gallery not found with id of ${galleryId}`, 404));
  }

  // Check if user has access to this gallery
  if (req.user.tenant && !gallery.belongsToTenant(req.user.tenant)) {
    return next(new ErrorResponse(`Not authorized to modify this gallery`, 403));
  }

  // Find the image in the gallery
  const imageIndex = gallery.images.findIndex(img => img._id && img._id.toString() === imageId);
  if (imageIndex === -1) {
    return next(new ErrorResponse(`Image not found with id of ${imageId}`, 404));
  }

  const image = gallery.images[imageIndex];

  try {
    // Delete from Cloudinary if publicId exists
    if (image.publicId) {
      await cloudinary.uploader.destroy(image.publicId);
    }

    // Remove image from gallery's images array
    gallery.images.splice(imageIndex, 1);
    await gallery.save();

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: gallery
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    return next(new ErrorResponse('Error deleting image', 500));
  }
});