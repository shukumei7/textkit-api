const { Router } = require('express');
const { createUser, authenticateUser, signToken } = require('../services/auth');
const { jwtAuth } = require('../middleware/jwt-auth');

const router = Router();

router.post('/auth/register', async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        code: 'MISSING_FIELDS',
        details: 'Email and password are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Validation Error',
        code: 'WEAK_PASSWORD',
        details: 'Password must be at least 8 characters',
      });
    }

    const user = await createUser({ email, password, name });
    const token = signToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(201).json({
      message: 'Account created',
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

router.post('/auth/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        code: 'MISSING_FIELDS',
        details: 'Email and password are required',
      });
    }

    const user = await authenticateUser(email, password);
    const token = signToken(user);

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Logged in',
      user: { id: user.id, email: user.email, name: user.name },
      token,
    });
  } catch (err) {
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    next(err);
  }
});

router.post('/auth/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out' });
});

router.get('/auth/me', jwtAuth, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      email: req.user.email,
      name: req.user.name,
      stripeCustomerId: req.user.stripe_customer_id,
      createdAt: req.user.created_at,
    },
  });
});

module.exports = router;
