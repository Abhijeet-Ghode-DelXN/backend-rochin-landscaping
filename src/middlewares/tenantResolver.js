const asyncHandler = require('./async');
const ErrorResponse = require('../utils/errorResponse');
const Tenant = require('../models/tenant.model');
const tenantContext = require('../utils/tenantContext');

// Extract subdomain from host header
const extractSubdomain = (host) => {
  if (!host) return null;

  // Handle localhost development (e.g. grass.localhost or www.grass.localhost)
  if (host.includes('localhost') || host.includes('127.0.0.1')) {
    const parts = host.split('.');
    // www.sub.localhost → sub
    if (parts[0] === 'www' && parts.length > 2) {
      return parts[1];
    }
    // sub.localhost → sub
    if (parts.length > 1 && parts[0] !== 'www') {
      return parts[0];
    }
  }

  // Handle production domains
  const parts = host.split('.');
  if (parts[0] === 'www') {
    // www.<sub>.<root>.<tld> → sub
    if (parts.length >= 4) {
      return parts[1];
    }
    // www.<root>.<tld> → no tenant
    return null;
  }
  // <sub>.<root>.<tld>
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
};

// Resolve tenant from subdomain and set context
exports.resolveTenant = asyncHandler(async (req, res, next) => {
  // Prefer subdomain from host; fallback to custom header for SPA calls from main domain
  const headerSubdomain = req.headers['x-tenant-subdomain'];
  const subdomain = headerSubdomain || extractSubdomain(req.headers.host);
  // Skip tenant resolution if request is to the API host itself (no tenant context)
  const apiLabelsToIgnore = (process.env.API_HOST_LABELS || 'backend-rochin-landscaping,api').split(',').map(l => l.trim()).filter(Boolean);
  if (!headerSubdomain && apiLabelsToIgnore.includes(subdomain)) {
    return tenantContext.run({}, next);
  }
  
  // For super admin routes or no subdomain, continue without tenant context
  if (!subdomain || req.path.startsWith('/api/v1/admin') || req.path.startsWith('/api/v1/super-admin')) {
    return tenantContext.run({}, next);
  }
  
  // Find tenant by subdomain
  const tenant = await Tenant.findOne({ subdomain });
  
  if (!tenant) {
    return next(new ErrorResponse(`Tenant not found for subdomain: ${subdomain}`, 404));
  }
  
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