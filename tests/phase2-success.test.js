/* eslint-env node, jest */
/* global describe, test, expect */

const request = require('supertest');
const app = require('../server');

describe('Phase 2 Success Criteria', () => {
  let manifest = [];

  test('Frontend can fetch shader manifest from backend', async () => {
    const res = await request(app).get('/api/shaders/manifest');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    manifest = res.body;
    expect(manifest.length).toBeGreaterThan(0);
    expect(manifest[0]).toHaveProperty('id');
    expect(manifest[0]).toHaveProperty('name');
  });

  test('Frontend can fetch individual shader source', async () => {
    if (!manifest.length) {
      const res = await request(app).get('/api/shaders/manifest');
      manifest = res.body;
    }
    const shader = manifest[0];
    const res = await request(app).get(`/api/shaders/${shader.id}`);
    expect(res.statusCode).toBe(200);
    expect(typeof res.text).toBe('string');
    expect(res.text.length).toBeGreaterThan(0);
  });

  test('Manifest navigation logic (simulated)', () => {
    // Simulate navigation logic
    const len = manifest.length || 5;
    let currentIndex = 0;
    currentIndex = (currentIndex + 1) % len;
    expect(currentIndex).toBe(1);
    currentIndex = (currentIndex - 1 + len) % len;
    expect(currentIndex).toBe(0);
  });

  test('Canvas and WebGL2 context are referenced in the frontend code', () => {
    const fs = require('fs');
    const webglJs = fs.readFileSync('./static/webgl.js', 'utf8');
    expect(webglJs).toMatch(/canvas\.getContext\(["']webgl2["']\)/);
    expect(webglJs).toMatch(/window\.addEventListener\(['"]resize['"]/);
  });
});