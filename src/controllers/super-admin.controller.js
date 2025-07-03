const asyncHandler = require('../middlewares/async');
const ErrorResponse = require('../utils/errorResponse');
const Tenant = require('../models/tenant.model');
const User = require('../models/user.model');
const Appointment = require('../models/appointment.model');
const Service = require('../models/service.model');
const Customer = require('../models/customer.model');

// @desc    Get dashboard statistics
// @route   GET /api/v1/super-admin/dashboard-stats
// @access  Super Admin
exports.getDashboardStats = asyncHandler(async (req, res, next) => {
  // Get total counts
  const totalTenants = await Tenant.countDocuments();
  const activeTenants = await Tenant.countDocuments({ status: 'active' });
  const totalUsers = await User.countDocuments({ role: { $ne: 'superAdmin' } });
  
  // Get recent activity (last 7 days)
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const recentTenants = await Tenant.find({ createdAt: { $gte: sevenDaysAgo } }).limit(5);
  const recentUsers = await User.find({ 
    createdAt: { $gte: sevenDaysAgo },
    role: { $ne: 'superAdmin' }
  }).limit(5);

  // Calculate revenue (mock data for now)
  const monthlyRevenue = 8500;
  const totalRevenue = 45000;

  // System health
  const systemUptime = 99.9;

  // Recent activity
  const recentActivity = [
    ...recentTenants.map(tenant => ({
      id: tenant._id,
      type: 'tenant_created',
      message: `New tenant "${tenant.name}" registered`,
      time: new Date(tenant.createdAt).toLocaleString()
    })),
    ...recentUsers.map(user => ({
      id: user._id,
      type: 'user_registered',
      message: `New user registered in "${user.tenantId?.name || 'Unknown'}"`,
      time: new Date(user.createdAt).toLocaleString()
    }))
  ].sort((a, b) => new Date(b.time) - new Date(a.time)).slice(0, 10);

  res.status(200).json({
    success: true,
    data: {
      totalTenants,
      activeTenants,
      totalUsers,
      totalRevenue,
      monthlyRevenue,
      systemUptime,
      recentActivity
    }
  });
});

// @desc    Get all tenants
// @route   GET /api/v1/super-admin/tenants
// @access  Super Admin
exports.getTenants = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, search, status, plan } = req.query;

  // Build query
  let query = {};
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { subdomain: { $regex: search, $options: 'i' } }
    ];
  }

  if (status && status !== 'all') {
    query.status = status;
  }

  if (plan && plan !== 'all') {
    query.plan = plan;
  }

  // Execute query with pagination
  const tenants = await Tenant.find(query)
    .populate('owner', 'name email')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  // Get total count
  const total = await Tenant.countDocuments(query);

  res.status(200).json({
    success: true,
    data: tenants,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total
    }
  });
});

// @desc    Get single tenant
// @route   GET /api/v1/super-admin/tenants/:id
// @access  Super Admin
exports.getTenant = asyncHandler(async (req, res, next) => {
  const tenant = await Tenant.findById(req.params.id)
    .populate('owner', 'name email');

  if (!tenant) {
    return next(new ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404));
  }

  // Get tenant statistics
  const userCount = await User.countDocuments({ tenantId: tenant._id });
  const appointmentCount = await Appointment.countDocuments({ tenantId: tenant._id });
  const serviceCount = await Service.countDocuments({ tenantId: tenant._id });
  const customerCount = await Customer.countDocuments({ tenantId: tenant._id });

  const tenantData = tenant.toObject();
  tenantData.stats = {
    users: userCount,
    appointments: appointmentCount,
    services: serviceCount,
    customers: customerCount
  };

  res.status(200).json({
    success: true,
    data: tenantData
  });
});

// @desc    Create new tenant
// @route   POST /api/v1/super-admin/tenants
// @access  Super Admin
exports.createTenant = asyncHandler(async (req, res, next) => {
  const { name, email, subdomain, plan, adminPassword } = req.body;

  // Validate presence of admin password
  if (!adminPassword) {
    return next(new ErrorResponse('Admin password is required', 400));
  }
  
  // Check for existing subdomain or user email
  const existingSubdomain = await Tenant.findOne({ subdomain });
  if (existingSubdomain) {
    return next(new ErrorResponse('Subdomain already exists', 400));
  }
  
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    return next(new ErrorResponse('A user with this email already exists', 400));
  }
  
  // 1. Create tenant with super admin as temporary owner
  const tenant = await Tenant.create({
    name,
    subdomain,
    owner: req.user.id, // Temporary owner
    settings: {
      themeColor: '#10B981', // Default green theme
      timezone: 'UTC'
    },
    subscription: {
      plan: plan || 'none',
      status: 'trialing',
      startDate: new Date()
    }
  });

  // 2. Create the admin user for the tenant
  const adminUser = await User.create({
    name: `${name} Admin`,
    email,
    password: adminPassword,
    role: 'tenantAdmin',
    tenantId: tenant._id,
    isEmailVerified: true
  });

  // 3. Update tenant with the actual admin user as owner
  tenant.owner = adminUser._id;
  await tenant.save();

  res.status(201).json({
    success: true,
    data: tenant
  });
});

// @desc    Update tenant
// @route   PUT /api/v1/super-admin/tenants/:id
// @access  Super Admin
exports.updateTenant = asyncHandler(async (req, res, next) => {
  let tenant = await Tenant.findById(req.params.id);

  if (!tenant) {
    return next(new ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404));
  }

  // Check if subdomain is being changed and if it already exists
  if (req.body.subdomain && req.body.subdomain !== tenant.subdomain) {
    const existingTenant = await Tenant.findOne({ subdomain: req.body.subdomain });
    if (existingTenant) {
      return next(new ErrorResponse('Subdomain already exists', 400));
    }
  }

  tenant = await Tenant.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    success: true,
    data: tenant
  });
});

// @desc    Delete tenant
// @route   DELETE /api/v1/super-admin/tenants/:id
// @access  Super Admin
exports.deleteTenant = asyncHandler(async (req, res, next) => {
  const tenant = await Tenant.findById(req.params.id);

  if (!tenant) {
    return next(new ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404));
  }

  // Delete all associated data
  await User.deleteMany({ tenantId: tenant._id });
  await Appointment.deleteMany({ tenantId: tenant._id });
  await Service.deleteMany({ tenantId: tenant._id });
  await Customer.deleteMany({ tenantId: tenant._id });

  // Delete tenant
  await tenant.deleteOne();

  res.status(200).json({
    success: true,
    data: {}
  });
});

// @desc    Suspend tenant
// @route   POST /api/v1/super-admin/tenants/:id/suspend
// @access  Super Admin
exports.suspendTenant = asyncHandler(async (req, res, next) => {
  const tenant = await Tenant.findByIdAndUpdate(
    req.params.id,
    { 'subscription.status': 'suspended' },
    { new: true }
  );

  if (!tenant) {
    return next(new ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: tenant
  });
});

// @desc    Activate tenant
// @route   POST /api/v1/super-admin/tenants/:id/activate
// @access  Super Admin
exports.activateTenant = asyncHandler(async (req, res, next) => {
  const tenant = await Tenant.findByIdAndUpdate(
    req.params.id,
    { 'subscription.status': 'active' },
    { new: true }
  );

  if (!tenant) {
    return next(new ErrorResponse(`Tenant not found with id of ${req.params.id}`, 404));
  }

  res.status(200).json({
    success: true,
    data: tenant
  });
});

// @desc    Get all users
// @route   GET /api/v1/super-admin/users
// @access  Super Admin
exports.getAllUsers = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, search, role, tenantId } = req.query;

  // Build query
  let query = { role: { $ne: 'superAdmin' } };
  
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } }
    ];
  }

  if (role && role !== 'all') {
    query.role = role;
  }

  if (tenantId) {
    query.tenantId = tenantId;
  }

  // Execute query with pagination
  const users = await User.find(query)
    .populate('tenantId', 'name subdomain')
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  // Get total count
  const total = await User.countDocuments(query);

  res.status(200).json({
    success: true,
    data: users,
    pagination: {
      current: page,
      pages: Math.ceil(total / limit),
      total
    }
  });
});

// @desc    Get system settings
// @route   GET /api/v1/super-admin/settings
// @access  Super Admin
exports.getSystemSettings = asyncHandler(async (req, res, next) => {
  // Mock system settings - in a real app, these would come from a database
  const settings = {
    general: {
      siteName: 'Landscaping Management System',
      siteDescription: 'Multi-tenant landscaping business management platform',
      maintenanceMode: false,
      registrationEnabled: true,
      maxTenants: 1000,
      maxUsersPerTenant: 50
    },
    email: {
      provider: 'smtp',
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: true,
      fromEmail: process.env.FROM_EMAIL,
      fromName: process.env.FROM_NAME
    },
    payment: {
      provider: 'stripe',
      currency: 'USD',
      plans: {
        basic: { price: 29, features: ['Basic features', '5 users', 'Email support'] },
        premium: { price: 79, features: ['All basic features', '25 users', 'Priority support'] },
        enterprise: { price: 199, features: ['All premium features', 'Unlimited users', '24/7 support'] }
      }
    },
    security: {
      passwordMinLength: 8,
      requireEmailVerification: true,
      sessionTimeout: 24,
      maxLoginAttempts: 5
    }
  };

  res.status(200).json({
    success: true,
    data: settings
  });
});

// @desc    Update system settings
// @route   PUT /api/v1/super-admin/settings
// @access  Super Admin
exports.updateSystemSettings = asyncHandler(async (req, res, next) => {
  // In a real app, you would save these to a database
  // For now, we'll just return the updated settings
  const updatedSettings = req.body;

  res.status(200).json({
    success: true,
    data: updatedSettings,
    message: 'Settings updated successfully'
  });
});

// @desc    Get activity logs
// @route   GET /api/v1/super-admin/activity-logs
// @access  Super Admin
exports.getActivityLogs = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 50, type, tenantId, userId } = req.query;

  // Mock activity logs - in a real app, these would come from a database
  const logs = [
    {
      id: 1,
      type: 'tenant_created',
      message: 'New tenant "Green Gardens" registered',
      tenantId: 'tenant1',
      userId: 'user1',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000),
      metadata: { tenantName: 'Green Gardens', subdomain: 'greengardens' }
    },
    {
      id: 2,
      type: 'user_registered',
      message: 'New user registered in "Urban Landscaping"',
      tenantId: 'tenant2',
      userId: 'user2',
      timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000),
      metadata: { userName: 'John Doe', userEmail: 'john@urbanlandscaping.com' }
    },
    {
      id: 3,
      type: 'payment_received',
      message: 'Payment received from "Landscape Pro"',
      tenantId: 'tenant3',
      userId: 'user3',
      timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000),
      metadata: { amount: 79, plan: 'premium' }
    }
  ];

  // Filter logs based on query parameters
  let filteredLogs = logs;

  if (type) {
    filteredLogs = filteredLogs.filter(log => log.type === type);
  }

  if (tenantId) {
    filteredLogs = filteredLogs.filter(log => log.tenantId === tenantId);
  }

  if (userId) {
    filteredLogs = filteredLogs.filter(log => log.userId === userId);
  }

  // Sort by timestamp (newest first)
  filteredLogs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Pagination
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex);

  res.status(200).json({
    success: true,
    data: paginatedLogs,
    pagination: {
      current: parseInt(page),
      pages: Math.ceil(filteredLogs.length / limit),
      total: filteredLogs.length
    }
  });
});

// @desc    Get system health
// @route   GET /api/v1/super-admin/system/health
// @access  Super Admin
exports.getSystemHealth = asyncHandler(async (req, res, next) => {
  // Mock system health data - in a real app, this would check actual system metrics
  const health = {
    status: 'healthy',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    database: {
      status: 'connected',
      responseTime: 15
    },
    api: {
      status: 'online',
      responseTime: 25
    },
    email: {
      status: 'active',
      lastCheck: new Date()
    },
    payment: {
      status: 'connected',
      lastCheck: new Date()
    },
    services: [
      { name: 'Database', status: 'healthy', responseTime: 15 },
      { name: 'API Gateway', status: 'healthy', responseTime: 25 },
      { name: 'Email Service', status: 'healthy', responseTime: 100 },
      { name: 'Payment Gateway', status: 'healthy', responseTime: 50 }
    ]
  };

  res.status(200).json({
    success: true,
    data: health
  });
});

// Placeholder methods for other endpoints
exports.getTenantAnalytics = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.getRevenueAnalytics = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.getUserAnalytics = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.getTenantUsers = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.getTenantActivity = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.getUser = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.createUser = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.updateUser = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.deleteUser = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.suspendUser = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.activateUser = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.getSubscriptions = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.getInvoices = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.getRevenue = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.createInvoice = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.updateSubscription = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.cancelSubscription = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.getEmailSettings = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.updateEmailSettings = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.getPaymentSettings = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.updatePaymentSettings = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.getTenantLogs = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.getUserLogs = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.getSystemLogs = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.clearActivityLogs = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.getSystemPerformance = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.getSystemErrors = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.createBackup = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.getBackups = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.getNotifications = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.createNotification = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.updateNotification = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.deleteNotification = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.broadcastNotification = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.generateTenantReport = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.generateRevenueReport = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.generateUserReport = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.generateActivityReport = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
});

exports.exportReport = asyncHandler(async (req, res, next) => {
  res.status(200).json({ success: true, data: {} });
}); 