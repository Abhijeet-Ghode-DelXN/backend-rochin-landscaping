const express = require('express');
const router = express.Router();
const announcementController = require('../controllers/announcementController');
const { protect, authorize } = require('../middlewares/auth');

// Public route to get active announcement
router.get('/active', announcementController.getActiveAnnouncement);

// Protected routes - require authentication
router.use(protect);
router.use(authorize('admin')); // Only admin can manage announcements

router.post('/', announcementController.createAnnouncement);
router.get('/', announcementController.getAnnouncements);
router.put('/:id', announcementController.updateAnnouncement);
router.delete('/:id', announcementController.deleteAnnouncement);

module.exports = router; 