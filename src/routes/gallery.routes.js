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
router.get('/',protect,authorize('tenantAdmin',), getGalleries);
router.get('/:id', getGallery);

// Protected routes
router.use(protect);
router.use(authorize('tenantAdmin'));

router.post('/', createGallery);
router.put('/:id', updateGallery);
router.delete('/:id', deleteGallery);
router.delete('/:galleryId/images/:imageId', deleteImage);

module.exports = router; 