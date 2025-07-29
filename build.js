/* eslint-env node */
/* global process */

const fs = require('fs');

function safeRead(file) {
  try {
    return fs.readFileSync(file, 'utf8');
  } catch {
    console.error(`❌ Missing or unreadable file: ${file}`);
    process.exit(1);
  }
}

function normalizeShader(src) {
  // Remove BOM, trim whitespace, normalize line endings to LF
  return src.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}
const vertex = normalizeShader(safeRead('./shaders/default.vert'));
const fragment = normalizeShader(safeRead('./shaders/default.frag'));
const webgl = safeRead('./static/webgl.js');

// Write normalized shaders to debug files for comparison
fs.writeFileSync('./dist/vertex.normalized.glsl', vertex, 'utf8');
fs.writeFileSync('./dist/fragment.normalized.glsl', fragment, 'utf8');

let template;
try {
  template = fs.readFileSync('./static/index.template.html', 'utf8');
} catch {
  console.error('❌ Missing static/index.template.html');
  process.exit(1);
}
template = template
  .replace('{{VERTEX_SHADER}}', vertex)
  .replace('{{FRAGMENT_SHADER}}', fragment)
  .replace('{{WEBGL_SCRIPT}}', webgl);

fs.mkdirSync('./dist', { recursive: true });
fs.writeFileSync('./dist/index.html', template);
fs.cpSync('./static', './dist/', { recursive: true });

console.log('✅ HTML generated at: dist/index.html');

