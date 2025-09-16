const express = require('express');
const {
  getEquipment,
  getSingleEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  updateEquipmentStatus,
  scanEquipment
} = require('../controllers/equipment.controller');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');

// All routes require authentication
router.use(protect);

// Routes accessible by both tenantAdmin and staff
router.get('/', authorize('tenantAdmin', 'staff'), getEquipment);
router.get('/scan/:identifier', authorize('tenantAdmin', 'staff'), scanEquipment);
router.get('/:id', authorize('tenantAdmin', 'staff'), getSingleEquipment);
router.put('/:id/status', authorize('tenantAdmin', 'staff'), updateEquipmentStatus);

// Routes accessible only by tenantAdmin
router.post('/', authorize('tenantAdmin'), createEquipment);
router.put('/:id', authorize('tenantAdmin'), updateEquipment);
router.delete('/:id', authorize('tenantAdmin'), deleteEquipment);

module.exports = router;