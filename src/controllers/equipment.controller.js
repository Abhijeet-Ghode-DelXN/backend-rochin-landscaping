const ErrorResponse = require('../utils/errorResponse');
const asyncHandler = require('../middlewares/async');
const Equipment = require('../models/equipment.model');
const tenantContext = require('../utils/tenantContext');

// @desc    Get all equipment for tenant
// @route   GET /api/v1/equipment
// @access  Private/TenantAdmin/Staff
exports.getEquipment = asyncHandler(async (req, res, next) => {
  const store = tenantContext.getStore();
  
  if (!store?.tenantId) {
    return next(new ErrorResponse('Tenant context required', 400));
  }

  const { status, type, search } = req.query;
  
  let query = { tenantId: store.tenantId };
  
  if (status && status !== 'all') {
    query.status = status;
  }
  
  if (type && type !== 'all') {
    query.type = type;
  }
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { serialNumber: { $regex: search, $options: 'i' } },
      { type: { $regex: search, $options: 'i' } }
    ];
  }

  const equipment = await Equipment.find(query)
    .populate('createdBy', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    success: true,
    count: equipment.length,
    data: equipment
  });
});

// @desc    Get single equipment
// @route   GET /api/v1/equipment/:id
// @access  Private/TenantAdmin/Staff
exports.getSingleEquipment = asyncHandler(async (req, res, next) => {
  const store = tenantContext.getStore();
  
  if (!store?.tenantId) {
    return next(new ErrorResponse('Tenant context required', 400));
  }

  const equipment = await Equipment.findOne({
    _id: req.params.id,
    tenantId: store.tenantId
  }).populate('createdBy', 'name email');

  if (!equipment) {
    return next(new ErrorResponse('Equipment not found', 404));
  }

  res.status(200).json({
    success: true,
    data: equipment
  });
});

// @desc    Create equipment
// @route   POST /api/v1/equipment
// @access  Private/TenantAdmin
exports.createEquipment = asyncHandler(async (req, res, next) => {
  const store = tenantContext.getStore();
  
  if (!store?.tenantId) {
    return next(new ErrorResponse('Tenant context required', 400));
  }

  // Add tenant and user info
  req.body.tenantId = store.tenantId;
  req.body.createdBy = req.user.id;

  // Generate serial number if not provided
  if (!req.body.serialNumber) {
    const count = await Equipment.countDocuments({ tenantId: store.tenantId });
    req.body.serialNumber = `${req.body.type.substring(0, 2).toUpperCase()}-${(count + 1).toString().padStart(3, '0')}`;
  }

  const equipment = await Equipment.create(req.body);

  res.status(201).json({
    success: true,
    data: equipment
  });
});

// @desc    Update equipment
// @route   PUT /api/v1/equipment/:id
// @access  Private/TenantAdmin
exports.updateEquipment = asyncHandler(async (req, res, next) => {
  const store = tenantContext.getStore();
  
  if (!store?.tenantId) {
    return next(new ErrorResponse('Tenant context required', 400));
  }

  let equipment = await Equipment.findOne({
    _id: req.params.id,
    tenantId: store.tenantId
  });

  if (!equipment) {
    return next(new ErrorResponse('Equipment not found', 404));
  }

  equipment = await Equipment.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: equipment
  });
});

// @desc    Delete equipment
// @route   DELETE /api/v1/equipment/:id
// @access  Private/TenantAdmin
exports.deleteEquipment = asyncHandler(async (req, res, next) => {
  const store = tenantContext.getStore();
  
  if (!store?.tenantId) {
    return next(new ErrorResponse('Tenant context required', 400));
  }

  const equipment = await Equipment.findOne({
    _id: req.params.id,
    tenantId: store.tenantId
  });

  if (!equipment) {
    return next(new ErrorResponse('Equipment not found', 404));
  }

  await Equipment.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Update equipment status (check in/out)
// @route   PUT /api/v1/equipment/:id/status
// @access  Private/TenantAdmin/Staff
exports.updateEquipmentStatus = asyncHandler(async (req, res, next) => {
  const store = tenantContext.getStore();
  
  if (!store?.tenantId) {
    return next(new ErrorResponse('Tenant context required', 400));
  }

  const { status, assignedTo, notes } = req.body;

  let equipment = await Equipment.findOne({
    _id: req.params.id,
    tenantId: store.tenantId
  });

  if (!equipment) {
    return next(new ErrorResponse('Equipment not found', 404));
  }

  equipment.status = status;
  equipment.assignedTo = assignedTo || null;
  
  await equipment.save();

  res.status(200).json({
    success: true,
    data: equipment
  });
});

// @desc    Get equipment by serial number or ID
// @route   GET /api/v1/equipment/scan/:identifier
// @access  Private/TenantAdmin/Staff
exports.scanEquipment = asyncHandler(async (req, res, next) => {
  const store = tenantContext.getStore();
  
  if (!store?.tenantId) {
    return next(new ErrorResponse('Tenant context required', 400));
  }

  const { identifier } = req.params;

  const equipment = await Equipment.findOne({
    tenantId: store.tenantId,
    $or: [
      { _id: identifier },
      { serialNumber: { $regex: new RegExp(`^${identifier}$`, 'i') } }
    ]
  });

  if (!equipment) {
    return next(new ErrorResponse('Equipment not found', 404));
  }

  res.status(200).json({
    success: true,
    data: equipment
  });
});