const Gallery = require('../models/gallery.model');
const cloudinary = require('../utils/cloudinary');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create new gallery entry
// @route   POST /api/v1/gallery
// @access  Private/Admin
exports.createGallery = asyncHandler(async (req, res, next) => {
  const { title, description, location, category, projectDate, tags, clientName, projectDuration } = req.body;
  
  // Handle image uploads
  const images = [];
  if (req.files && req.files.images) {
    const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    
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
  }

  const gallery = await Gallery.create({
    title,
    description,
    location,
    category,
    projectDate,
    images,
    tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
    clientName,
    projectDuration
  });

  res.status(201).json({
    success: true,
    data: gallery
  });
});

// @desc    Get all gallery entries
// @route   GET /api/v1/gallery
// @access  Public
exports.getGalleries = asyncHandler(async (req, res, next) => {
  const { category, status, search } = req.query;
  
  // Build query
  let query = {};
  
  if (category) {
    query.category = category;
  }
  
  if (status) {
    query.status = status;
  }
  
  if (search) {
    query.$text = { $search: search };
  }

  const galleries = await Gallery.find(query)
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: galleries.length,
    data: galleries
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
exports.updateGallery = asyncHandler(async (req, res, next) => {
  let gallery = await Gallery.findById(req.params.id);

  if (!gallery) {
    return next(new ErrorResponse(`Gallery not found with id of ${req.params.id}`, 404));
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
  const updateFields = ['title', 'description', 'location', 'category', 'projectDate', 'status', 'clientName', 'projectDuration'];
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
    data: gallery
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

  await gallery.remove();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Delete image from gallery
// @route   DELETE /api/v1/gallery/:id/images/:imageId
// @access  Private/Admin
exports.deleteImage = asyncHandler(async (req, res, next) => {
  const gallery = await Gallery.findById(req.params.id);

  if (!gallery) {
    return next(new ErrorResponse(`Gallery not found with id of ${req.params.id}`, 404));
  }

  const image = gallery.images.id(req.params.imageId);

  if (!image) {
    return next(new ErrorResponse(`Image not found with id of ${req.params.imageId}`, 404));
  }

  // Delete from cloudinary
  await cloudinary.uploader.destroy(image.publicId);

  // Remove from gallery
  image.remove();
  await gallery.save();

  res.status(200).json({
    success: true,
    data: gallery
  });
}); 