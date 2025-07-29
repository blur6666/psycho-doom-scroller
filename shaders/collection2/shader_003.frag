#version 300 es
precision mediump float;
uniform vec2 u_resolution;
// uniform vec2 u_mouse;
vec2 u_mouse = vec2(0.0, 0.0);
uniform float u_time;
out vec4 fragColor;

float noise(vec2 p) {
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    vec3 color = vec3(0.0);
    
    for (float i = 0.0; i < 8.0; i++) {
        vec2 p = uv * pow(2.0, i);
        float n = noise(p + u_time * 0.5);
        float wave = sin(p.x * 10.0 + u_time + i) * cos(p.y * 10.0 + u_time + i);
        color.r += n * wave * exp(-i * 0.3);
        color.g += n * sin(wave + i) * exp(-i * 0.2);
        color.b += n * cos(wave - i) * exp(-i * 0.4);
    }
    
    fragColor = vec4(color, 1.0);
}
