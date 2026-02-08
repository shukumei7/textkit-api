const request = require('supertest');
const { createApp } = require('../../src/server');
const { setupMockLLM, resetMockLLM } = require('./mock-llm');
const { getDb, closeDb } = require('../../src/db');

// Test auth headers
const authHeaders = {
  'x-test-auth': 'bypass',
  'x-test-user': 'test-user',
  'x-test-tier': 'MEGA',
};

function createTestApp() {
  // Set test environment
  process.env.NODE_ENV = 'test';
  const app = createApp();
  return app;
}

function getTestRequest(app) {
  return request(app);
}

function clearUsageLog() {
  try {
    const db = getDb();
    db.prepare('DELETE FROM usage_log').run();
  } catch (err) {
    // DB may not be initialized
  }
}

module.exports = {
  createTestApp,
  getTestRequest,
  authHeaders,
  setupMockLLM,
  resetMockLLM,
  clearUsageLog,
  getDb,
  closeDb,
};
