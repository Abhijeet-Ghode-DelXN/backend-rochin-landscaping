const HeroImage = require('../models/hero-image.model');
const cloudinary = require('../utils/cloudinary');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get hero image
// @route   GET /api/v1/hero-image
// @access  Public
exports.getHeroImage = asyncHandler(async (req, res, next) => {
  const heroImage = await HeroImage.findOne().sort({ createdAt: -1 });

  if (!heroImage) {
    return res.status(200).json({
      success: true,
      data: {
        url: '/images/landscaping-image.png',
        publicId: null
      }
    });
  }

  res.status(200).json({
    success: true,
    data: heroImage
  });
});

// @desc    Update hero image
// @route   PUT /api/v1/hero-image
// @access  Private/Admin
exports.updateHeroImage = asyncHandler(async (req, res, next) => {
  if (!req.files || !req.files.image) {
    return next(new ErrorResponse('Please upload an image', 400));
  }

  // Delete old hero image from Cloudinary if it exists
  const oldHeroImage = await HeroImage.findOne().sort({ createdAt: -1 });
  if (oldHeroImage && oldHeroImage.publicId) {
    try {
      await cloudinary.uploader.destroy(oldHeroImage.publicId);
    } catch (error) {
      console.error('Error deleting old hero image from Cloudinary:', error);
    }
  }

  // Upload new image to Cloudinary
  const result = await cloudinary.uploader.upload(req.files.image.tempFilePath, {
    folder: 'hero',
    resource_type: 'auto'
  });

  // Create new hero image
  const heroImage = await HeroImage.create({
    url: result.secure_url,
    publicId: result.public_id
  });

  res.status(200).json({
    success: true,
    data: heroImage
  });
});

// @desc    Delete hero image
// @route   DELETE /api/v1/hero-image
// @access  Private/Admin
exports.deleteHeroImage = asyncHandler(async (req, res, next) => {
  const heroImage = await HeroImage.findOne().sort({ createdAt: -1 });

  if (!heroImage) {
    return next(new ErrorResponse('No hero image found', 404));
  }

  // Delete from Cloudinary if publicId exists
  if (heroImage.publicId) {
    try {
      await cloudinary.uploader.destroy(heroImage.publicId);
    } catch (error) {
      console.error('Error deleting hero image from Cloudinary:', error);
    }
  }

  await HeroImage.findByIdAndDelete(heroImage._id);

  res.status(200).json({
    success: true,
    data: {
      url: '/images/landscaping-image.png',
      publicId: null
    }
  });
}); 