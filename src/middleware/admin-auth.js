const { jwtAuth } = require('./jwt-auth');
const config = require('../config');

function adminAuth(req, res, next) {
  // API key auth (for programmatic/CLI access)
  const adminKey = req.headers['x-admin-key'];
  if (adminKey && config.adminApiKey && adminKey === config.adminApiKey) {
    return next();
  }

  // JWT + email whitelist auth (for browser access)
  jwtAuth(req, res, (err) => {
    if (err) return; // jwtAuth already sent response
    if (res.headersSent) return;

    const email = req.user?.email?.toLowerCase();
    if (!email || !config.adminEmails.includes(email)) {
      return res.status(403).json({
        error: 'Forbidden',
        code: 'ADMIN_REQUIRED',
        details: 'Admin access required',
      });
    }
    next();
  });
}

module.exports = { adminAuth };
