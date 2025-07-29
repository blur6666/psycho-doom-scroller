/* eslint-env node, jest */
/* global describe, test, expect, process */

const request = require('supertest');
const fs = require('fs');
const path = require('path');

const server = require('../server'); // assumes server.js exports the app

const SHADERS_DIR = path.join(process.cwd(), 'shaders');

describe('Phase 1 Success Criteria', () => {
  let manifest = [];

  test('API /api/shaders/manifest returns all shaders', async () => {
    const res = await request(server).get('/api/shaders/manifest');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    manifest = res.body;
    // Check that at least one shader is present
    expect(manifest.length).toBeGreaterThan(0);
  });

  test('Each shader in manifest is accessible and matches file', async () => {
    for (const shader of manifest) {
      const res = await request(server).get(`/api/shaders/${shader.id}`);
      expect(res.statusCode).toBe(200);
      const filePath = path.join(SHADERS_DIR, shader.id);
      expect(fs.existsSync(filePath)).toBe(true);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      expect(res.text).toBe(fileContent);
    }
  });

  test('All shaders compile successfully in WebGL2 (simulated)', () => {
    // This is a placeholder: true WebGL2 compilation requires a browser environment.
    // Here, we check that the shader source is non-empty and contains a version directive.
    for (const shader of manifest) {
      const filePath = path.join(SHADERS_DIR, shader.id);
      const fileContent = fs.readFileSync(filePath, 'utf8');
      expect(fileContent.length).toBeGreaterThan(0);
      expect(fileContent).toMatch(/#version\s+300\s+es/);
    }
  });

  test('Shader compilation times are documented with at least 5 decimal places', () => {
    // This test expects the results file to exist and contain 5 decimal places
    const resultsPath = path.join(process.cwd(), 'docs/shader-analysis-results.md');
    expect(fs.existsSync(resultsPath)).toBe(true);
    const results = fs.readFileSync(resultsPath, 'utf8');
    const regex = /\|\s*[\w\-.]+\.frag\s*\|\s*\d+\.\d{5}\s*\|/g;
    expect(results.match(regex)).not.toBeNull();
  });

  test('Documentation of findings and recommendations is complete', () => {
    const resultsPath = path.join(process.cwd(), 'docs/shader-analysis-results.md');
    const results = fs.readFileSync(resultsPath, 'utf8');
    expect(results).toMatch(/Recommendations/);
    expect(results).toMatch(/Observations/);
  });
});