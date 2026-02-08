process.env.NODE_ENV = 'test';

const request = require('supertest');
const { createApp } = require('../../src/server');
const { setupMockLLM, resetMockLLM } = require('../helpers/mock-llm');
const { closeDb } = require('../../src/db');

const authHeaders = {
  'x-test-auth': 'bypass',
  'x-test-user': 'test-user',
  'x-test-tier': 'MEGA',
};

const SAMPLE_TEXT = 'This is a comprehensive article about artificial intelligence, machine learning, and the future of technology in modern business environments.';

describe('API Endpoints Integration Tests', () => {
  let app;

  beforeAll(() => {
    setupMockLLM();
    app = createApp();
  });

  afterAll(() => {
    resetMockLLM();
    closeDb();
  });

  describe('POST /api/v1/repurpose', () => {
    it('returns platform data', async () => {
      const res = await request(app)
        .post('/api/v1/repurpose')
        .set(authHeaders)
        .send({ text: SAMPLE_TEXT, platforms: ['twitter', 'linkedin'] });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('platforms');
      expect(res.body).toHaveProperty('metadata');
    });

    it('returns 400 with short text', async () => {
      const res = await request(app)
        .post('/api/v1/repurpose')
        .set(authHeaders)
        .send({ text: 'too short' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/v1/summarize', () => {
    it('returns summary', async () => {
      const res = await request(app)
        .post('/api/v1/summarize')
        .set(authHeaders)
        .send({ text: SAMPLE_TEXT });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('summary');
      expect(res.body).toHaveProperty('wordCount');
      expect(res.body).toHaveProperty('keyPoints');
    });
  });

  describe('POST /api/v1/rewrite', () => {
    it('returns rewritten text', async () => {
      const res = await request(app)
        .post('/api/v1/rewrite')
        .set(authHeaders)
        .send({ text: SAMPLE_TEXT, tone: 'formal' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('rewritten');
      expect(res.body).toHaveProperty('tone');
      expect(res.body).toHaveProperty('changes');
    });
  });

  describe('POST /api/v1/seo/meta', () => {
    it('returns SEO meta tags', async () => {
      const res = await request(app)
        .post('/api/v1/seo/meta')
        .set(authHeaders)
        .send({ text: SAMPLE_TEXT });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('seo');
      expect(res.body).toHaveProperty('metadata');
    });
  });

  describe('POST /api/v1/email/subject-lines', () => {
    it('returns subject lines', async () => {
      const res = await request(app)
        .post('/api/v1/email/subject-lines')
        .set(authHeaders)
        .send({ text: SAMPLE_TEXT });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('subjectLines');
    });
  });

  describe('POST /api/v1/headlines', () => {
    it('returns headlines', async () => {
      const res = await request(app)
        .post('/api/v1/headlines')
        .set(authHeaders)
        .send({ text: SAMPLE_TEXT });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('headlines');
    });
  });

  describe('POST /api/v1/extract/keywords', () => {
    it('returns keywords', async () => {
      const res = await request(app)
        .post('/api/v1/extract/keywords')
        .set(authHeaders)
        .send({ text: SAMPLE_TEXT });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('keywords');
    });
  });

  describe('POST /api/v1/translate/tone', () => {
    it('returns tone translation', async () => {
      const res = await request(app)
        .post('/api/v1/translate/tone')
        .set(authHeaders)
        .send({ text: SAMPLE_TEXT, targetTone: 'formal' });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('detectedTone');
      expect(res.body).toHaveProperty('translated');
    });
  });

  describe('POST /api/v1/compare', () => {
    it('returns comparison', async () => {
      const res = await request(app)
        .post('/api/v1/compare')
        .set(authHeaders)
        .send({
          text1: SAMPLE_TEXT,
          text2: 'A different article about technology trends and digital transformation in various industries worldwide.',
        });
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('similarity');
      expect(res.body).toHaveProperty('differences');
      expect(res.body).toHaveProperty('summary');
    });
  });

  describe('Authentication', () => {
    it('returns 401 without auth headers', async () => {
      const res = await request(app)
        .post('/api/v1/repurpose')
        .send({ text: SAMPLE_TEXT });
      expect(res.status).toBe(401);
    });
  });
});
