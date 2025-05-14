const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { protect, authorize } = require('../middlewares/auth');

// Public routes - no authentication needed
router.get('/active', announcementController.getActiveAnnouncement);
router.get('/', announcementController.getAnnouncements);

// Protected routes - require admin authentication
router.post('/', protect, authorize('admin'), announcementController.createAnnouncement);
router.put('/:id', protect, authorize('admin'), announcementController.updateAnnouncement);
router.delete('/:id', protect, authorize('admin'), announcementController.deleteAnnouncement);

module.exports = router; 