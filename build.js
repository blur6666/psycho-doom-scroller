const fs = require('fs');

const vertex = fs.readFileSync('./shaders/vertex.glsl', 'utf8').replace(/`/g, '\`');
const fragment = fs.readFileSync('./shaders/fragment.glsl', 'utf8').replace(/`/g, '\`');
const webgl = fs.readFileSync('./static/webgl.js', 'utf8').replace(/`/g, '\`');

let template = fs.readFileSync('./index.template.html', 'utf8');
template = template
  .replace('{{VERTEX_SHADER}}', vertex)
  .replace('{{FRAGMENT_SHADER}}', fragment)
  .replace('{{WEBGL_SCRIPT}}', webgl);

fs.mkdirSync('./dist', { recursive: true });
fs.writeFileSync('./dist/index.html', template);
fs.cpSync('./static', './dist/static', { recursive: true });

console.log('✅ HTML gerado em: dist/index.html');


