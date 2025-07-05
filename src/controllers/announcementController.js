const Announcement = require('../models/announcement');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse');
const tenantContext = require('../utils/tenantContext');

// Create a new announcement
exports.createAnnouncement = asyncHandler(async (req, res, next) => {
  const announcement = await Announcement.create({
    ...req.body,
    tenant: req.user.tenant || req.user.tenantId
  });
  res.status(201).json(announcement);
});

// @desc    Get all announcements (tenant-specific)
// @route   GET /api/v1/announcements
// @access  Private
exports.getAnnouncements = asyncHandler(async (req, res, next) => {
  let query = {};
  
  // For non-superAdmin users, filter by tenant
  if (req.user.role !== 'superAdmin' && req.user.tenantId) {
    query.tenant = req.user.tenantId;
  }

  const announcements = await Announcement.find(query)
    .sort({ createdAt: -1 })
    .populate('tenant', 'name subdomain');
    
  res.status(200).json({
    success: true,
    data: announcements
  });
});

// Get active announcement
exports.getActiveAnnouncement = asyncHandler(async (req, res, next) => {
  let query = { status: 'active' };
  
  // Get tenant from request headers or tenant context
  const tenantSubdomain = req.headers['x-tenant-subdomain'];
  
  if (tenantSubdomain) {
    // Find tenant by subdomain
    const Tenant = require('../models/tenant.model');
    const tenant = await Tenant.findOne({ subdomain: tenantSubdomain });
    
    if (tenant) {
      query.tenant = tenant._id;
    }
  } else {
    // Fallback to tenant context if available
    const store = tenantContext.getStore();
    if (store?.tenantId) {
      query.tenant = store.tenantId;
    }
  }

  const announcement = await Announcement.findOne(query).sort({ createdAt: -1 });
  
  if (!announcement) {
    return res.status(200).json({
      success: true,
      data: null
    });
  }
  
  res.status(200).json({
    success: true,
    data: announcement
  });
});

// Update an announcement
exports.updateAnnouncement = asyncHandler(async (req, res, next) => {
  const announcement = await Announcement.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  if (!announcement) {
    return next(new ErrorResponse(`Announcement not found with id of ${req.params.id}`, 404));
  }

  res.json(announcement);
});

// Delete an announcement
exports.deleteAnnouncement = asyncHandler(async (req, res, next) => {
  const announcement = await Announcement.findByIdAndDelete(req.params.id);

  if (!announcement) {
    return next(new ErrorResponse(`Announcement not found with id of ${req.params.id}`, 404));
  }

  res.json({ message: 'Announcement deleted' });
}); 