const Portfolio = require('../models/portfolio.model');
const cloudinary = require('../utils/cloudinary');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Create new portfolio entry
// @route   POST /api/v1/portfolio
// @access  Private/Admin
exports.createPortfolio = asyncHandler(async (req, res, next) => {
  console.log('Request received - Files:', req.files);
  console.log('Request received - Body:', req.body);

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
      status: req.body.status || 'draft'
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

// @desc    Get all portfolio entries
// @route   GET /api/v1/portfolio
// @access  Public
exports.getPortfolios = asyncHandler(async (req, res, next) => {
  const { serviceType, status, search } = req.query;
  
  // Build query
  let query = {};
  
  if (serviceType) {
    query.serviceType = serviceType;
  }
  
  if (status) {
    query.status = status;
  }
  
  if (search) {
    query.$text = { $search: search };
  }

  const portfolios = await Portfolio.find(query)
    .sort({ createdAt: -1 });

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

  // Delete images from cloudinary
  for (const image of portfolio.images) {
    await cloudinary.uploader.destroy(image.publicId);
  }

  await Portfolio.findByIdAndDelete(req.params.id);

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

  const image = portfolio.images.id(req.params.imageId);

  if (!image) {
    return next(new ErrorResponse(`Image not found with id of ${req.params.imageId}`, 404));
  }

  // Delete from cloudinary
  await cloudinary.uploader.destroy(image.publicId);

  // Remove from portfolio
  image.remove();
  await portfolio.save();

  res.status(200).json({
    success: true,
    data: portfolio
  });
}); 