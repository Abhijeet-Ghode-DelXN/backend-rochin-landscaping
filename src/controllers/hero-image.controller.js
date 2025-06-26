const HeroImage = require('../models/hero-image.model');
const cloudinary = require('../utils/cloudinary');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse');
const tenantContext = require('../utils/tenantContext');

// @desc    Get hero image
// @route   GET /api/v1/hero-image
// @access  Public
exports.getHeroImage = asyncHandler(async (req, res, next) => {
  const tenantId = getTenantId(req);
  const heroImage = await HeroImage.findOne(tenantId ? { tenant: tenantId } : {}).sort({ createdAt: -1 });

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

  const tenantId = getTenantId(req);
  if (!tenantId) {
    return next(new ErrorResponse('Tenant context is missing', 400));
  }
  // Delete old hero image from Cloudinary if it exists
  const oldHeroImage = await HeroImage.findOne({ tenant: tenantId }).sort({ createdAt: -1 });
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
    publicId: result.public_id,
    tenant: tenantId
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
  const tenantId = getTenantId(req);
  const heroImage = await HeroImage.findOne({ tenant: tenantId }).sort({ createdAt: -1 });

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

function getTenantId(req) {
  const store = tenantContext.getStore();
  return (
    store?.tenantId ||
    req.user?.tenantId ||
    req.user?.tenant?._id ||
    req.user?.tenant
  );
} 