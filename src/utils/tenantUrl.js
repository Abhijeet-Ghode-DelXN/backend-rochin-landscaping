function getTenantFrontendUrl(subdomain, path = '') {
  const mainDomain = process.env.BASE_DOMAIN || 'basketbuddy.in';
  const protocol = mainDomain.startsWith('localhost') ? 'http' : 'https';

  // Always prepend 'www.' to the subdomain (or use just 'www' if subdomain is empty)
  const fullSubdomain = subdomain ? `www.${subdomain}` : 'www';
  const fullDomain = `${fullSubdomain}.${mainDomain}`;

  return `${protocol}://${fullDomain}${path}`;
}

module.exports = { getTenantFrontendUrl }; 