/* eslint-env node */
/* global __dirname */

const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const SHADERS_DIR = path.join(__dirname, 'shaders');
const DIST_DIR = path.join(__dirname, 'dist');

// Serve static files from dist (for frontend)
app.use(express.static(DIST_DIR));

// Serve shaders for API
app.use('/shaders', express.static(SHADERS_DIR));

// Endpoint: /api/shaders/manifest
app.get('/api/shaders/manifest', (req, res) => {
  function collectShaders(dir, base = '') {
    let shaders = [];
    const files = fs.readdirSync(dir);
    for (const file of files) {
      const fullPath = path.join(dir, file);
      const relPath = path.join(base, file);
      if (fs.statSync(fullPath).isDirectory()) {
        shaders = shaders.concat(collectShaders(fullPath, relPath));
      } else if (file.endsWith('.frag')) {
        shaders.push({
          id: relPath.replace(/\\/g, '/'),
          name: path.basename(file)
        });
      }
    }
    return shaders;
  }
  const manifest = collectShaders(SHADERS_DIR);
  res.json(manifest);
});

// Endpoint: /api/shaders/:id
app.get('/api/shaders/:id(*)', (req, res) => {
  const shaderPath = path.join(SHADERS_DIR, req.params.id);
  if (!shaderPath.startsWith(SHADERS_DIR)) {
    return res.status(400).send('Invalid shader path');
  }
  if (fs.existsSync(shaderPath) && fs.statSync(shaderPath).isFile()) {
    res.type('text/plain').send(fs.readFileSync(shaderPath, 'utf8'));
  } else {
    res.status(404).send('Shader not found');
  }
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}/`);
  });
}

module.exports = app;
