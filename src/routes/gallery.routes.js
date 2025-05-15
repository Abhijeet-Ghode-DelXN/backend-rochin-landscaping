const express = require('express');
const router = express.Router();
const {
  createGallery,
  getGalleries,
  getGallery,
  updateGallery,
  deleteGallery,
  deleteImage
} = require('../controllers/gallery.controller');
const { protect, authorize } = require('../middlewares/auth');
const { createGalleryValidation, updateGalleryValidation } = require('../middlewares/validators/gallery.validator');
const validate = require('../middlewares/validators/validate');

// Public routes
router.get('/', getGalleries);
router.get('/:id', getGallery);

// Protected routes (Admin only)
router.post(
  '/',
  [protect, authorize('admin'), createGalleryValidation, validate],
  createGallery
);

router.put(
  '/:id',
  [protect, authorize('admin'), updateGalleryValidation, validate],
  updateGallery
);

router.delete(
  '/:id',
  [protect, authorize('admin')],
  deleteGallery
);

router.delete(
  '/:id/images/:imageId',
  [protect, authorize('admin')],
  deleteImage
);

module.exports = router; 