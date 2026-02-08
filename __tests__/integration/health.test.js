process.env.NODE_ENV = 'test';

const request = require('supertest');
const express = require('express');
const healthRouter = require('../../src/routes/health');

describe('Health Endpoints', () => {
  let app;

  beforeAll(() => {
    app = express();
    app.use('/', healthRouter);
  });

  it('GET /health returns status ok', async () => {
    const response = await request(app)
      .get('/health')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('timestamp');
  });

  it('GET /status returns version, database status, endpoint count', async () => {
    const response = await request(app)
      .get('/status')
      .expect(200);

    expect(response.body).toHaveProperty('status', 'ok');
    expect(response.body).toHaveProperty('version');
    expect(response.body).toHaveProperty('environment');
    expect(response.body).toHaveProperty('database');
    expect(response.body).toHaveProperty('endpoints', 9);
    expect(response.body).toHaveProperty('timestamp');
  });
});
