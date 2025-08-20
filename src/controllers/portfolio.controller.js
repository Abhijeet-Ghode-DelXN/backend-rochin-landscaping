const Portfolio = require('../models/portfolio.model');
const cloudinary = require('../utils/cloudinary');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create new portfolio entry
// @route   POST /api/v1/portfolio
// @access  Private/Admin
exports.createPortfolio = asyncHandler(async (req, res, next) => {
  // Validate required fields
  const { title, description, location, serviceType, projectDate } = req.body;
  
  if (!title || !description || !location || !serviceType || !projectDate) {
    return next(new ErrorResponse('Missing required fields', 400));
  }

  // Handle image uploads
  const images = [];
  
  if (req.files && req.files.images) {
    const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    
    try {
      for (const file of files) {
        const result = await cloudinary.uploader.upload(file.tempFilePath, {
          folder: 'portfolio',
          resource_type: 'auto'
        });
        
        images.push({
          url: result.secure_url,
          publicId: result.public_id,
          caption: req.body.captions ? req.body.captions[files.indexOf(file)] : '',
          type: req.body.imageTypes ? req.body.imageTypes[files.indexOf(file)] : 'after'
        });
      }
    } catch (uploadError) {
      console.error('Cloudinary upload error:', uploadError);
      return next(new ErrorResponse('Error uploading images to Cloudinary', 500));
    }
  }

  try {
    const portfolio = await Portfolio.create({
      title,
      description,
      location,
      serviceType,
      projectDate,
      images,
      tags: req.body.tags ? req.body.tags.split(',').map(tag => tag.trim()) : [],
      clientName: req.body.clientName || '',
      projectDuration: req.body.projectDuration || '',
      projectCost: req.body.projectCost || 0,
      projectSize: req.body.projectSize || '',
      challenges: req.body.challenges || '',
      solutions: req.body.solutions || '',
      customerFeedback: req.body.customerFeedback || '',
      status: req.body.status || 'draft',
      tenant: req.user.tenantId._id, // Set tenant from authenticated user
      createdBy: req.user.id // Track who created the portfolio
    });

    res.status(201).json({
      success: true,
      data: portfolio
    });
  } catch (dbError) {
    console.error('Database error:', dbError);
    return next(new ErrorResponse('Error creating portfolio in database', 500));
  }
});

// @desc    Get all portfolio entries for current tenant
// @route   GET /api/v1/portfolio
// @access  Private/TenantAdmin
exports.getPortfolios = asyncHandler(async (req, res, next) => {
  const { serviceType, status, search } = req.query;

  // Always filter by tenant from context
  const tenantId = req.tenant?._id;
  if (!tenantId) {
    // Main domain: return empty array instead of error
    return res.status(200).json({ success: true, count: 0, data: [] });
  }

  const filter = { tenant: tenantId };

  if (serviceType) {
    filter.serviceType = serviceType;
  }

  if (status) {
    filter.status = status;
  }

  if (search) {
    filter.$text = { $search: search };
  }

  const portfolios = await Portfolio.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    count: portfolios.length,
    data: portfolios
  });
});

// @desc    Get single portfolio entry
// @route   GET /api/v1/portfolio/:id
// @access  Public
exports.getPortfolio = asyncHandler(async (req, res, next) => {
  const portfolio = await Portfolio.findById(req.params.id);

  if (!portfolio) {
    return next(new ErrorResponse(`Portfolio not found with id of ${req.params.id}`, 404));
  }

  // Check if user has access to this portfolio
  if (req.user && req.user.tenant && !portfolio.belongsToTenant(req.user.tenant)) {
    return next(new ErrorResponse(`Not authorized to access this portfolio`, 403));
  }

  res.status(200).json({
    success: true,
    data: portfolio
  });
});

// @desc    Update portfolio entry
// @route   PUT /api/v1/portfolio/:id
// @access  Private/Admin
exports.updatePortfolio = asyncHandler(async (req, res, next) => {
  let portfolio = await Portfolio.findById(req.params.id);

  if (!portfolio) {
    return next(new ErrorResponse(`Portfolio not found with id of ${req.params.id}`, 404));
  }

  // Check if user has access to this portfolio
  if (req.user.tenant && !portfolio.belongsToTenant(req.user.tenant)) {
    return next(new ErrorResponse(`Not authorized to update this portfolio`, 403));
  }

  // Handle new image uploads
  if (req.files && req.files.images) {
    const files = Array.isArray(req.files.images) ? req.files.images : [req.files.images];
    
    for (const file of files) {
      const result = await cloudinary.uploader.upload(file.tempFilePath, {
        folder: 'portfolio',
        resource_type: 'auto'
      });
      
      portfolio.images.push({
        url: result.secure_url,
        publicId: result.public_id,
        caption: req.body.captions ? req.body.captions[files.indexOf(file)] : '',
        type: req.body.imageTypes ? req.body.imageTypes[files.indexOf(file)] : 'after'
      });
    }
  }

  // Update other fields
  const updateFields = [
    'title', 'description', 'location', 'serviceType', 'projectDate',
    'status', 'clientName', 'projectDuration', 'projectCost',
    'projectSize', 'challenges', 'solutions', 'customerFeedback'
  ];
  
  updateFields.forEach(field => {
    if (req.body[field] !== undefined) {
      portfolio[field] = req.body[field];
    }
  });

  if (req.body.tags) {
    portfolio.tags = req.body.tags.split(',').map(tag => tag.trim());
  }

  await portfolio.save();

  res.status(200).json({
    success: true,
    data: portfolio
  });
});

// @desc    Delete portfolio entry
// @route   DELETE /api/v1/portfolio/:id
// @access  Private/Admin
exports.deletePortfolio = asyncHandler(async (req, res, next) => {
  const portfolio = await Portfolio.findById(req.params.id);

  if (!portfolio) {
    return next(new ErrorResponse(`Portfolio not found with id of ${req.params.id}`, 404));
  }

  // Check if user has access to this portfolio
  if (req.user.tenant && !portfolio.belongsToTenant(req.user.tenant)) {
    return next(new ErrorResponse(`Not authorized to delete this portfolio`, 403));
  }

  // Delete images from cloudinary
  for (const image of portfolio.images) {
    await cloudinary.uploader.destroy(image.publicId);
  }

  await portfolio.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Delete image from portfolio
// @route   DELETE /api/v1/portfolio/:id/images/:imageId
// @access  Private/Admin
exports.deleteImage = asyncHandler(async (req, res, next) => {
  const portfolio = await Portfolio.findById(req.params.id);

  if (!portfolio) {
    return next(new ErrorResponse(`Portfolio not found with id of ${req.params.id}`, 404));
  }

  // Check if user has access to this portfolio
  if (req.user.tenant && !portfolio.belongsToTenant(req.user.tenant)) {
    return next(new ErrorResponse(`Not authorized to modify this portfolio`, 403));
  }

  // Find the image index
  const imageIndex = portfolio.images.findIndex(img => img._id.toString() === req.params.imageId);

  if (imageIndex === -1) {
    return next(new ErrorResponse(`Image not found with id of ${req.params.imageId}`, 404));
  }

  const image = portfolio.images[imageIndex];

  try {
    // Delete from Cloudinary if publicId exists
    if (image.publicId) {
      await cloudinary.uploader.destroy(image.publicId);
    }

    // Remove from portfolio's images array
    portfolio.images.splice(imageIndex, 1);
    await portfolio.save();

    res.status(200).json({
      success: true,
      message: 'Image deleted successfully',
      data: portfolio
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    return next(new ErrorResponse('Error deleting image', 500));
  }
});


// @desc    Get all portfolio entries from all tenants (for main domain)
// @route   GET /api/v1/portfolio/all
// @access  Public
exports.getAllPortfolios = asyncHandler(async (req, res, next) => {
  const { serviceType, status, search } = req.query;

  const filter = { status: 'published' }; // Only show published portfolios

  if (serviceType) {
    filter.serviceType = serviceType;
  }

  if (search) {
    filter.$text = { $search: search };
  }

  const portfolios = await Portfolio.find(filter)
    .populate('tenant', 'name subdomain') // Populate tenant info
    .sort({ createdAt: -1 })
    .lean();

  res.status(200).json({
    success: true,
    count: portfolios.length,
    data: portfolios
  });
});