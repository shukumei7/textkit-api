const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const { getDb } = require('../db');

const SALT_ROUNDS = 12;

async function createUser({ email, password, name }) {
  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    const err = new Error('Email already registered');
    err.status = 409;
    throw err;
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const result = db.prepare(
    'INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)'
  ).run(email, passwordHash, name || null);

  return { id: result.lastInsertRowid, email, name: name || null };
}

async function authenticateUser(email, password) {
  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    const err = new Error('Invalid email or password');
    err.status = 401;
    throw err;
  }

  return { id: user.id, email: user.email, name: user.name };
}

function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

function verifyToken(token) {
  return jwt.verify(token, config.jwt.secret);
}

function getUserById(id) {
  const db = getDb();
  const user = db.prepare(
    'SELECT id, email, name, stripe_customer_id, created_at FROM users WHERE id = ?'
  ).get(id);
  return user || null;
}

function updateStripeCustomerId(userId, stripeCustomerId) {
  const db = getDb();
  db.prepare(
    'UPDATE users SET stripe_customer_id = ?, updated_at = datetime(\'now\') WHERE id = ?'
  ).run(stripeCustomerId, userId);
}

module.exports = {
  createUser,
  authenticateUser,
  signToken,
  verifyToken,
  getUserById,
  updateStripeCustomerId,
};
