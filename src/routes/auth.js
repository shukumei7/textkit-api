const { Router } = require('express');
const { createUser, authenticateUser, signToken, generateResetToken, validateResetToken, updatePassword, getUserById } = require('../services/auth');
const { sendPasswordResetEmail } = require('../services/email-sender');
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

router.post('/auth/forgot-password', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        error: 'Validation Error',
        code: 'MISSING_FIELDS',
        details: 'Email is required',
      });
    }

    // Always respond with success to prevent email enumeration
    const token = await generateResetToken(email);
    if (token) {
      const protocol = req.protocol;
      const host = req.get('host');
      const resetUrl = `${protocol}://${host}/reset-password.html?token=${token}&email=${encodeURIComponent(email)}`;
      try {
        await sendPasswordResetEmail(email, resetUrl);
      } catch (emailErr) {
        console.error('Failed to send reset email:', emailErr);
      }
    }

    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (err) {
    next(err);
  }
});

router.post('/auth/reset-password', async (req, res, next) => {
  try {
    const { email, token, password } = req.body;

    if (!email || !token || !password) {
      return res.status(400).json({
        error: 'Validation Error',
        code: 'MISSING_FIELDS',
        details: 'Email, token, and password are required',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        error: 'Validation Error',
        code: 'WEAK_PASSWORD',
        details: 'Password must be at least 8 characters',
      });
    }

    const user = await validateResetToken(email, token);
    if (!user) {
      return res.status(400).json({
        error: 'Invalid or expired reset token',
        code: 'INVALID_TOKEN',
      });
    }

    await updatePassword(user.id, password);

    const fullUser = getUserById(user.id);
    const jwtToken = signToken(fullUser);

    res.cookie('token', jwtToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.json({
      message: 'Password reset successful',
      user: { id: fullUser.id, email: fullUser.email, name: fullUser.name },
      token: jwtToken,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
