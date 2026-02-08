process.env.NODE_ENV = 'test';

const express = require('express');
const request = require('supertest');
const { validate } = require('../../../src/middleware/validate');

describe('Validate Middleware', () => {
  let app;

  function createTestApp(schema) {
    const testApp = express();
    testApp.use(express.json());
    testApp.post('/test', validate(schema), (req, res) => {
      res.json({ success: true, data: req.body });
    });
    return testApp;
  }

  describe('Required field validation', () => {
    beforeEach(() => {
      app = createTestApp({
        name: { type: 'string', required: true },
        email: { type: 'string', required: true },
      });
    });

    it('passes valid input with all required fields', async () => {
      const response = await request(app)
        .post('/test')
        .send({ name: 'John Doe', email: 'john@example.com' });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
    });

    it('rejects missing required fields', async () => {
      const response = await request(app)
        .post('/test')
        .send({ name: 'John Doe' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('Validation failed');
      expect(response.body.code).toBe('VALIDATION_ERROR');
      expect(response.body.details).toContain('email is required');
    });

    it('rejects empty string for required field', async () => {
      const response = await request(app)
        .post('/test')
        .send({ name: '', email: 'john@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.details).toContain('name is required');
    });

    it('rejects null for required field', async () => {
      const response = await request(app)
        .post('/test')
        .send({ name: null, email: 'john@example.com' });

      expect(response.status).toBe(400);
      expect(response.body.details).toContain('name is required');
    });
  });

  describe('Type validation', () => {
    beforeEach(() => {
      app = createTestApp({
        name: { type: 'string' },
        age: { type: 'number' },
        tags: { type: 'array' },
        active: { type: 'boolean' },
      });
    });

    it('accepts correct string type', async () => {
      const response = await request(app)
        .post('/test')
        .send({ name: 'John' });

      expect(response.status).toBe(200);
    });

    it('rejects wrong type for string field', async () => {
      const response = await request(app)
        .post('/test')
        .send({ name: 123 });

      expect(response.status).toBe(400);
      expect(response.body.details).toContain('name must be a string');
    });

    it('accepts correct number type', async () => {
      const response = await request(app)
        .post('/test')
        .send({ age: 25 });

      expect(response.status).toBe(200);
    });

    it('rejects wrong type for number field', async () => {
      const response = await request(app)
        .post('/test')
        .send({ age: '25' });

      expect(response.status).toBe(400);
      expect(response.body.details).toContain('age must be a number');
    });

    it('accepts correct array type', async () => {
      const response = await request(app)
        .post('/test')
        .send({ tags: ['tag1', 'tag2'] });

      expect(response.status).toBe(200);
    });

    it('rejects wrong type for array field', async () => {
      const response = await request(app)
        .post('/test')
        .send({ tags: 'not-an-array' });

      expect(response.status).toBe(400);
      expect(response.body.details).toContain('tags must be an array');
    });

    it('accepts correct boolean type', async () => {
      const response = await request(app)
        .post('/test')
        .send({ active: true });

      expect(response.status).toBe(200);
    });

    it('rejects wrong type for boolean field', async () => {
      const response = await request(app)
        .post('/test')
        .send({ active: 'true' });

      expect(response.status).toBe(400);
      expect(response.body.details).toContain('active must be a boolean');
    });
  });

  describe('String length validation', () => {
    beforeEach(() => {
      app = createTestApp({
        username: { type: 'string', minLength: 3, maxLength: 20 },
        description: { type: 'string', maxLength: 100 },
      });
    });

    it('accepts string within length limits', async () => {
      const response = await request(app)
        .post('/test')
        .send({ username: 'johndoe', description: 'A short description' });

      expect(response.status).toBe(200);
    });

    it('rejects string below minLength', async () => {
      const response = await request(app)
        .post('/test')
        .send({ username: 'ab' });

      expect(response.status).toBe(400);
      expect(response.body.details).toContain('username must be at least 3 characters');
    });

    it('rejects string above maxLength', async () => {
      const response = await request(app)
        .post('/test')
        .send({ username: 'a'.repeat(21) });

      expect(response.status).toBe(400);
      expect(response.body.details).toContain('username must be at most 20 characters');
    });

    it('accepts string at exact maxLength', async () => {
      const response = await request(app)
        .post('/test')
        .send({ username: 'a'.repeat(20) });

      expect(response.status).toBe(200);
    });

    it('accepts string at exact minLength', async () => {
      const response = await request(app)
        .post('/test')
        .send({ username: 'abc' });

      expect(response.status).toBe(200);
    });
  });

  describe('Enum validation', () => {
    beforeEach(() => {
      app = createTestApp({
        status: { type: 'string', enum: ['active', 'inactive', 'pending'] },
        priority: { type: 'number', enum: [1, 2, 3] },
      });
    });

    it('accepts valid enum value', async () => {
      const response = await request(app)
        .post('/test')
        .send({ status: 'active', priority: 2 });

      expect(response.status).toBe(200);
    });

    it('rejects invalid enum value', async () => {
      const response = await request(app)
        .post('/test')
        .send({ status: 'completed' });

      expect(response.status).toBe(400);
      expect(response.body.details).toContain('status must be one of: active, inactive, pending');
    });

    it('rejects invalid number enum value', async () => {
      const response = await request(app)
        .post('/test')
        .send({ priority: 5 });

      expect(response.status).toBe(400);
      expect(response.body.details).toContain('priority must be one of: 1, 2, 3');
    });
  });

  describe('Array validation', () => {
    beforeEach(() => {
      app = createTestApp({
        items: { type: 'array', maxItems: 5 },
        tags: { type: 'array', maxItems: 3, required: true },
      });
    });

    it('accepts array within maxItems limit', async () => {
      const response = await request(app)
        .post('/test')
        .send({ items: [1, 2, 3], tags: ['a', 'b'] });

      expect(response.status).toBe(200);
    });

    it('rejects array exceeding maxItems', async () => {
      const response = await request(app)
        .post('/test')
        .send({ tags: ['a', 'b', 'c', 'd'] });

      expect(response.status).toBe(400);
      expect(response.body.details).toContain('tags must have at most 3 items');
    });

    it('accepts array at exact maxItems', async () => {
      const response = await request(app)
        .post('/test')
        .send({ tags: ['a', 'b', 'c'] });

      expect(response.status).toBe(200);
    });

    it('accepts empty array if not required', async () => {
      const response = await request(app)
        .post('/test')
        .send({ items: [], tags: ['a'] });

      expect(response.status).toBe(200);
    });
  });

  describe('Multiple errors', () => {
    beforeEach(() => {
      app = createTestApp({
        name: { type: 'string', required: true, minLength: 3 },
        email: { type: 'string', required: true },
        age: { type: 'number', required: true },
        status: { type: 'string', enum: ['active', 'inactive'] },
      });
    });

    it('returns all validation errors at once', async () => {
      const response = await request(app)
        .post('/test')
        .send({ name: 'ab', status: 'pending' });

      expect(response.status).toBe(400);
      expect(response.body.details).toHaveLength(4);
      expect(response.body.details).toContain('name must be at least 3 characters');
      expect(response.body.details).toContain('email is required');
      expect(response.body.details).toContain('age is required');
      expect(response.body.details).toContain('status must be one of: active, inactive');
    });
  });

  describe('Optional fields', () => {
    beforeEach(() => {
      app = createTestApp({
        name: { type: 'string', required: true },
        bio: { type: 'string', maxLength: 200 },
        age: { type: 'number' },
      });
    });

    it('allows missing optional fields', async () => {
      const response = await request(app)
        .post('/test')
        .send({ name: 'John' });

      expect(response.status).toBe(200);
    });

    it('validates optional fields when provided', async () => {
      const response = await request(app)
        .post('/test')
        .send({ name: 'John', bio: 'a'.repeat(201) });

      expect(response.status).toBe(400);
      expect(response.body.details).toContain('bio must be at most 200 characters');
    });

    it('allows null for optional fields', async () => {
      const response = await request(app)
        .post('/test')
        .send({ name: 'John', bio: null, age: null });

      expect(response.status).toBe(200);
    });
  });

  describe('Complex validation scenarios', () => {
    it('validates complex nested requirements', async () => {
      app = createTestApp({
        text: { type: 'string', required: true, minLength: 10, maxLength: 5000 },
        platforms: { type: 'array', required: true, maxItems: 5 },
        tone: { type: 'string', enum: ['formal', 'casual', 'professional'] },
        includeHashtags: { type: 'boolean' },
      });

      const response = await request(app)
        .post('/test')
        .send({
          text: 'Short',
          platforms: ['twitter', 'linkedin', 'facebook', 'instagram', 'pinterest', 'tiktok'],
          tone: 'friendly',
          includeHashtags: 'yes',
        });

      expect(response.status).toBe(400);
      expect(response.body.details).toHaveLength(4);
      expect(response.body.details).toContain('text must be at least 10 characters');
      expect(response.body.details).toContain('platforms must have at most 5 items');
      expect(response.body.details).toContain('tone must be one of: formal, casual, professional');
      expect(response.body.details).toContain('includeHashtags must be a boolean');
    });
  });
});
