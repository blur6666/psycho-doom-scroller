#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    vec3 a = vec3(0.3, 0.6, 0.5);
    vec3 b = vec3(0.4, 0.3, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.2, 0.4);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);
    float scale = 1.5 + 0.3 * sin(u_time * 0.5); // Animating scale

    for (float i = 0.0; i < 4.0; i++) {
        uv = fract(uv * scale) - 0.5;
        float d = length(uv) * exp(-length(uv0));
        vec3 color = palette(length(uv0) + i * 0.4 + u_time * 0.4);
        d = sin(d * 8.0 + u_time) / 8.0;
        d = abs(d);
        d = pow(0.01 / d, 1.2);
        finalColor += color * d;
    }

    fragColor = vec4(finalColor, 1.0);
}
