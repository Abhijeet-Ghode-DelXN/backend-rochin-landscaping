const express = require('express');
const {
  getTenants,
  getTenant,
  createTenant,
  updateTenant,
  deleteTenant,
  updateTenantStatus,
  getTenantMetrics,
} = require('../controllers/tenant.controller');

const Tenant = require('../models/tenant.model');

const router = express.Router();

const { protect, authorize } = require('../middlewares/auth');
const advancedResults = require('../middlewares/advancedResults');

// Protect all routes in this file and authorize only for superadmins
router.use(protect);
router.use(authorize('superAdmin'));

router.route('/tenants')
  .get(advancedResults(Tenant), getTenants)
  .post(createTenant);

router.route('/tenants/:id')
  .get(getTenant)
  .put(updateTenant)
  .delete(deleteTenant);

router.route('/tenants/:id/status')
  .put(updateTenantStatus);

router.route('/tenants/:id/metrics')
  .get(getTenantMetrics);

module.exports = router;
