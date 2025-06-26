const Announcement = require('../models/announcement');
const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse');

// Create a new announcement
exports.createAnnouncement = asyncHandler(async (req, res, next) => {
  const announcement = await Announcement.create({
    ...req.body,
    tenant: req.user.tenant || req.user.tenantId
  });
  res.status(201).json(announcement);
});

// Get all announcements
exports.getAnnouncements = asyncHandler(async (req, res, next) => {
  const announcements = await Announcement.find().sort({ createdAt: -1 });
  res.json(announcements);
});

// Get active announcement
exports.getActiveAnnouncement = asyncHandler(async (req, res, next) => {
  const announcement = await Announcement.findOne({ status: 'active' }).sort({ createdAt: -1 });
  res.json(announcement);
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