#version 300 es
precision mediump float;
uniform vec2 u_resolution;
// uniform vec2 u_mouse;
vec2 u_mouse = vec2(0.0, 0.0);
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 0.5);
    vec3 d = vec3(0.8, 0.9, 0.3);
    return a + b * cos(6.28 * (c * t + d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);
    
    for (float i = 0.0; i < 6.0; i++) {
        uv = fract(uv * 1.8) - 0.5;
        uv = abs(uv) - 0.3;
        
        float d = length(uv) * exp(-length(uv0));
        d = sin(d * 6.0 + u_time + i) / 6.0;
        d = abs(d);
        d = pow(0.02 / d, 1.5);
        
        vec3 color = palette(length(uv0) + i * 0.2 + u_time * 0.3);
        finalColor += color * d;
    }
    
    fragColor = vec4(finalColor, 1.0);
}
