const asyncHandler = require('./async');
const ErrorResponse = require('../utils/errorResponse');
const Tenant = require('../models/tenant.model');
const tenantContext = require('../utils/tenantContext');

// Extract tenant domain from host header
const extractTenantDomain = (host) => {
  if (!host) return null;

  const domain = host.split(':')[0]; // Remove port

  // Handle localhost development - superadmin domain
  if (domain === 'localhost' || domain === '127.0.0.1') {
    return null; // Superadmin mode
  }

  // Handle production - superadmin domain
  if (domain === 'www.landscape360.com' || domain === 'landscape360.com' || 
      domain === 'delxn.club' || domain === 'www.delxn.club' ||
      domain === 'backend-rochin-landscaping.onrender.com') {
    return null; // Superadmin mode
  }

  // All other domains are tenant domains
  return domain;
};

// Resolve tenant from domain and set context
exports.resolveTenant = asyncHandler(async (req, res, next) => {
  // Prefer domain from header; fallback to host extraction
  const headerDomain = req.headers['x-tenant-domain'];
  const tenantDomain = headerDomain || extractTenantDomain(req.headers.host);
  console.log('Tenant Resolver: headerDomain:', headerDomain, 'extracted domain:', tenantDomain);
  // For super admin routes or no tenant domain, continue without tenant context
  if (!tenantDomain || req.path.startsWith('/api/v1/admin') || req.path.startsWith('/api/v1/super-admin') || req.path === '/api/v1/tenant/info') {
    return tenantContext.run({}, next);
  }
  
  // Find tenant by subdomain (using domain as subdomain identifier)
  const tenant = await Tenant.findOne({ subdomain: tenantDomain });
  
  if (!tenant) {
    console.log('Tenant Resolver: No tenant found for domain:', tenantDomain);
    return next(new ErrorResponse(`Tenant not found for domain: ${tenantDomain}`, 404));
  }
  console.log('Tenant Resolver: Tenant found:', tenant.name, tenant._id);
  req.tenant = tenant;
  
  // Check if tenant is active
  if (tenant.subscription?.status === 'inactive') {
    return next(new ErrorResponse('Tenant account is inactive', 403));
  }
  
  // Set tenant context
  tenantContext.run({ 
    tenantId: tenant._id,
    tenant: tenant
  }, next);
});

// Validate user belongs to correct tenant
exports.validateTenantAccess = asyncHandler(async (req, res, next) => {
  const store = tenantContext.getStore();
  
  // Skip validation for super admin
  if (req.user?.role === 'superAdmin') {
    return next();
  }
  
  // Skip validation if no tenant context (public routes)
  if (!store?.tenantId) {
    return next();
  }
  
  // Validate user belongs to the tenant
  if (req.user && req.user.tenantId?.toString() !== store.tenantId.toString()) {
    return next(new ErrorResponse('Access denied: User does not belong to this tenant', 403));
  }
  
  next();
}); 