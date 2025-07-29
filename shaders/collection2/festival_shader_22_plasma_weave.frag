#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    return 0.5 + 0.5 * cos(6.28318 * (vec3(1.0, 0.5, 0.5) * t + vec3(0.8, 0.9, 0.3)));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time * 0.4;
    
    float v1 = sin(uv.x * 5.0 + t + sin(uv.y * 8.0 + t));
    float v2 = cos(uv.y * 5.0 - t + cos(uv.x * 8.0 - t));
    
    float plasma = v1 + v2;
    
    vec3 color = palette(plasma);
    fragColor = vec4(color, 1.0);
}
