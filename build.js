const fs = require('fs');

function safeRead(file) {
  try {
    return fs.readFileSync(file, 'utf8').replace(/`/g, '`');
  } catch (e) {
    console.error(`❌ Missing or unreadable file: ${file}`);
    process.exit(1);
  }
}

const vertex = safeRead('./shaders/vertex.glsl');
const fragment = safeRead('./shaders/fragment.glsl');
const webgl = safeRead('./static/webgl.js');

let template;
try {
  template = fs.readFileSync('./static/index.template.html', 'utf8');
} catch (e) {
  console.error('❌ Missing static/index.template.html');
  process.exit(1);
}
template = template
  .replace('{{VERTEX_SHADER}}', vertex)
  .replace('{{FRAGMENT_SHADER}}', fragment)
  .replace('{{WEBGL_SCRIPT}}', webgl);

fs.mkdirSync('./dist', { recursive: true });
fs.writeFileSync('./dist/index.html', template);
fs.cpSync('./static', './dist/static', { recursive: true });

console.log('✅ HTML generated at: dist/index.html');


