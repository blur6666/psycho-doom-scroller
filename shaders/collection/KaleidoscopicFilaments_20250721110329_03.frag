#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.00, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);

    for (float i = 0.0; i < 4.0; i++) {
        uv = fract(uv * 1.7) - 0.5;
        float d = max(abs(uv.x), abs(uv.y)) * exp(-length(uv0)); // Square distance
        vec3 color = palette(length(uv0) + i * 0.4 + u_time * 0.3);
        d = sin(d * 7.0 + u_time) / 7.0;
        d = abs(d);
        d = pow(0.01 / d, 1.3);
        finalColor += color * d;
    }

    fragColor = vec4(finalColor, 1.0);
}
