#version 300 es
precision mediump float;
uniform vec2 u_resolution;
// uniform vec2 u_mouse;
vec2 u_mouse = vec2(0.0, 0.0);
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    vec3 a = vec3(0.8, 0.5, 0.4);
    vec3 b = vec3(0.2, 0.4, 0.2);
    vec3 c = vec3(2.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.25, 0.25);
    return a + b * cos(6.28 * (c * t + d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);
    
    for (float i = 0.0; i < 3.0; i++) {
        uv = fract(uv * 2.0) - 0.5;
        float d = length(uv);
        d = sin(d * 12.0 + u_time + i * 2.0) / 12.0;
        d = abs(d);
        d = smoothstep(0.0, 0.1, d);
        vec3 col = palette(length(uv0) + i * 0.3 + u_time * 0.2);
        finalColor += col * d;
    }
    
    fragColor = vec4(finalColor, 1.0);
}
