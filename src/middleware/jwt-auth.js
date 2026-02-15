const { verifyToken, getUserById } = require('../services/auth');

function jwtAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  const token = (authHeader && authHeader.startsWith('Bearer '))
    ? authHeader.slice(7)
    : req.cookies?.token;
  if (!token) {
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'AUTH_REQUIRED',
      details: 'Please log in',
    });
  }

  try {
    const payload = verifyToken(token);
    const user = getUserById(payload.userId);
    if (!user) {
      return res.status(401).json({
        error: 'Unauthorized',
        code: 'USER_NOT_FOUND',
        details: 'User no longer exists',
      });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({
      error: 'Unauthorized',
      code: 'INVALID_TOKEN',
      details: 'Invalid or expired token',
    });
  }
}

module.exports = { jwtAuth };
