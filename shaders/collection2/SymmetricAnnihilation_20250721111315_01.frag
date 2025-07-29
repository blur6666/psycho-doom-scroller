#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5), b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0), d = vec3(0.0, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
}

float hash1(float n) { return fract(sin(n)*43758.5453); }

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);
    
    // Glitch sorted by time
    float glitch = pow(fract(u_time * 0.8), 8.0);
    uv.x += (hash1(floor(uv.y * 100.0)) - 0.5) * glitch * 0.1;

    for (float i = 0.0; i < 4.0; i++) {
        uv = fract(uv * 1.5) - 0.5;
        float d = length(uv) * exp(-length(uv0));
        vec3 color = palette(length(uv0) + i * 0.4 + u_time * 0.4);
        d = tan(d * 4.0 + u_time) + sin(d * 10.0);
        d = abs(d);
        d = pow(0.005 / d, 1.5);
        finalColor += color * d;
    }
    fragColor = vec4(finalColor, 1.0);
}
