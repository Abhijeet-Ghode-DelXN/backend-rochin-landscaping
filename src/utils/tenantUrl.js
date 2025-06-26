function getTenantFrontendUrl(subdomain, path = '') {
  const mainDomain = process.env.FRONTEND_URL || 'localhost:3000';
  const protocol = mainDomain.startsWith('localhost') ? 'http' : 'https';
  return `${protocol}://${subdomain}.${mainDomain}${path}`;
}

module.exports = { getTenantFrontendUrl }; 