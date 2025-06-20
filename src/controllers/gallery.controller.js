const Gallery = require('../models/gallery.model');
const cloudinary = require('../utils/cloudinary');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create new gallery entry
// @route   POST /api/v1/gallery
// @access  Private/Admin
exports.createGallery = asyncHandler(async (req, res, next) => {
  console.log('Request received - Files:', req.files); // Debug log
  console.log('Request received - Body:', req.body); // Debug log

  // Validate required fields
  const { title, description, location, category, projectDate } = req.body;
  
  if (!title || !description || !location || !category || !projectDate) {
    return next(new ErrorResponse('Missing required fields', 400));
  }

  // Handle image uploads
  const images = [];
  
  if (req.files && req.files.images) {
    // Convert single file to array for consistent processing
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
    const gallery = await Gallery.create({
      title,
      description,
      location,
      category,
      projectDate,
      images,
      thumbnailIndex: req.body.thumbnailIndex ? parseInt(req.body.thumbnailIndex) : 0, // Ensure this is included
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
      clientName: req.body.clientName || '',
      projectDuration: req.body.projectDuration || '',
      status: req.body.status || 'draft'
    });

    res.status(201).json({
      success: true,
      data: gallery
    });
  } catch (dbError) {
    console.error('Database error:', dbError);
    return next(new ErrorResponse('Error creating gallery in database', 500));
  }
});

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

// @desc    Get all gallery entries
// @route   GET /api/v1/gallery
// @access  Public
exports.getGalleries = asyncHandler(async (req, res, next) => {
  const galleries = await Gallery.find().sort('-createdAt');
  
  res.status(200).json({
    success: true,
    count: galleries.length,
    data: galleries.map(gallery => ({
      ...gallery.toObject(),
      thumbnailIndex: gallery.thumbnailIndex || 0 // Ensure it's always included
    }))
  });
});

// @desc    Get single gallery entry
// @route   GET /api/v1/gallery/:id
// @access  Public
exports.getGallery = asyncHandler(async (req, res, next) => {
  const gallery = await Gallery.findById(req.params.id);

  if (!gallery) {
    return next(new ErrorResponse(`Gallery not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: gallery
  });
});

// @desc    Update gallery entry
// @route   PUT /api/v1/gallery/:id
// @access  Private/Admin
// exports.updateGallery = asyncHandler(async (req, res, next) => {
//   let gallery = await Gallery.findById(req.params.id);

//   if (!gallery) {
//     return next(new ErrorResponse(`Gallery not found with id of ${req.params.id}`, 404));
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

//   // Update other fields
//   const updateFields = ['title', 'description', 'location', 'category', 'projectDate', 'status', 'clientName', 'projectDuration'];
//   updateFields.forEach(field => {
//     if (req.body[field]) {
//       gallery[field] = req.body[field];
//     }
//   });

//   if (req.body.tags) {
//     gallery.tags = req.body.tags.split(',').map(tag => tag.trim());
//   }

//   await gallery.save();

//   res.status(200).json({
//     success: true,
//     data: gallery
//   });
// });


// @desc    Update gallery entry
// @route   PUT /api/v1/gallery/:id
// @access  Private/Admin
exports.updateGallery = asyncHandler(async (req, res, next) => {
  let gallery = await Gallery.findById(req.params.id);

  if (!gallery) {
    return next(new ErrorResponse(`Gallery not found with id of ${req.params.id}`, 404));
  }

  // Handle thumbnail index update - this should come first
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

  // Update other fields including thumbnailIndex
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
      thumbnailIndex: gallery.thumbnailIndex // Ensure it's included in response
    }
  });
});





// @desc    Delete gallery entry
// @route   DELETE /api/v1/gallery/:id
// @access  Private/Admin
exports.deleteGallery = asyncHandler(async (req, res, next) => {
  const gallery = await Gallery.findById(req.params.id);

  if (!gallery) {
    return next(new ErrorResponse(`Gallery not found with id of ${req.params.id}`, 404));
  }

  // Delete images from cloudinary
  for (const image of gallery.images) {
    await cloudinary.uploader.destroy(image.publicId);
  }

  await Gallery.findByIdAndDelete(req.params.id);


  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Delete image from gallery
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