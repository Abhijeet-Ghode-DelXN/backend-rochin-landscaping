const cloudinary = require('../utils/cloudinary');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse');
const tenantContext = require('../utils/tenantContext');
const Tenant = require('../models/tenant.model');

// @desc    Get logo
// @route   GET /api/v1/logo
// @access  Public
exports.getLogo = asyncHandler(async (req, res, next) => {
  const tenantId = getTenantId(req);
  const tenant = await Tenant.findById(tenantId);
  
  if (!tenant) {
    return next(new ErrorResponse('Tenant not found', 404));
  }

  res.status(200).json({
    success: true,
    data: {
      url: tenant.settings?.logo || null
    }
  });
});

// @desc    Update logo
// @route   PUT /api/v1/logo
// @access  Private/Admin
exports.updateLogo = asyncHandler(async (req, res, next) => {
  if (!req.files || !req.files.image) {
    return next(new ErrorResponse('Please upload an image', 400));
  }

  const tenantId = getTenantId(req);
  if (!tenantId) {
    return next(new ErrorResponse('Tenant context is missing', 400));
  }

  const tenant = await Tenant.findById(tenantId);
  if (!tenant) {
    return next(new ErrorResponse('Tenant not found', 404));
  }

  // Delete old logo from Cloudinary if it exists
  if (tenant.settings?.logo) {
    try {
      // Extract public_id from the URL
      const urlParts = tenant.settings.logo.split('/');
      const publicId = urlParts[urlParts.length - 1].split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error deleting old logo from Cloudinary:', error);
    }
  }

  // Upload new image to Cloudinary
  const result = await cloudinary.uploader.upload(req.files.image.tempFilePath, {
    folder: 'tenant-logos',
    transformation: [
      { width: 200, height: 200, crop: 'fit' }
    ]
  });

  // Update tenant with new logo
  tenant.settings = {
    ...tenant.settings,
    logo: result.secure_url
  };
  await tenant.save();

  res.status(200).json({
    success: true,
    data: {
      url: result.secure_url
    }
  });
});

// @desc    Delete logo
// @route   DELETE /api/v1/logo
// @access  Private/Admin
exports.deleteLogo = asyncHandler(async (req, res, next) => {
  const tenantId = getTenantId(req);
  const tenant = await Tenant.findById(tenantId);

  if (!tenant) {
    return next(new ErrorResponse('Tenant not found', 404));
  }

  // Delete from Cloudinary if logo exists
  if (tenant.settings?.logo) {
    try {
      const urlParts = tenant.settings.logo.split('/');
      const publicId = urlParts[urlParts.length - 1].split('.')[0];
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      console.error('Error deleting logo from Cloudinary:', error);
    }
  }

  // Remove logo from tenant settings
  tenant.settings = {
    ...tenant.settings,
    logo: null
  };
  await tenant.save();

  res.status(200).json({
    success: true,
    data: {
      url: null
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