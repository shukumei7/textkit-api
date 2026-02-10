const { Router } = require('express');
const { auth } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rate-limit');
const { trackUsage } = require('../middleware/usage');
const healthRoutes = require('./health');
const authRoutes = require('./auth');
const stripeRoutes = require('./stripe');
const dashboardRoutes = require('./dashboard');
const adminRoutes = require('./admin');

const router = Router();

// Public routes (no auth)
router.use(healthRoutes);
router.use(authRoutes);
router.use(stripeRoutes);
router.use(dashboardRoutes);
router.use(adminRoutes);

// API v1 routes (auth + rate-limit + usage tracking)
const v1 = Router();
v1.use(auth);
v1.use(rateLimit);
v1.use(trackUsage);

// Tier 1 endpoints
v1.use(require('./v1/repurpose'));
v1.use(require('./v1/summarize'));
v1.use(require('./v1/rewrite'));

// Tier 2 endpoints
v1.use(require('./v1/seo'));
v1.use(require('./v1/email'));
v1.use(require('./v1/headlines'));

// Tier 3 endpoints
v1.use(require('./v1/keywords'));
v1.use(require('./v1/tone'));
v1.use(require('./v1/compare'));

router.use('/api/v1', v1);

module.exports = router;
