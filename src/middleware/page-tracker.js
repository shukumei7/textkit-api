const { getDb } = require('../db');

function pageTracker(req, res, next) {
  // Only track GET requests for HTML pages (not assets)
  if (req.method === 'GET' && (req.path.endsWith('.html') || req.path === '/')) {
    try {
      const db = getDb();
      const path = req.path === '/' ? '/index.html' : req.path;
      const referrer = req.headers.referer || req.headers.referrer || null;
      db.prepare('INSERT INTO page_views (path, referrer) VALUES (?, ?)').run(path, referrer);
    } catch {
      // Don't block page load on tracking failure
    }
  }
  next();
}

module.exports = { pageTracker };
