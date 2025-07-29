#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    return 0.5 + 0.5 * cos(6.28318 * (vec3(1.0, 1.0, 0.5) * t + vec3(0.8, 0.7, 0.9)));
}

float chebyshev(vec2 p) {
    return max(abs(p.x), abs(p.y));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time * 0.4;
    
    vec2 p = uv * 2.0;

    for (int i=0; i < 6; i++) {
        p = abs(p) / clamp(dot(p, p), 0.2, 1.0) - vec2(0.8 + 0.1 * sin(t), 0.6 + 0.1 * cos(t));
    }

    float d = chebyshev(p);
    float d2 = length(p);

    vec3 col = palette(d * 0.2 + t);
    col = mix(col, palette(d2 * 0.2 + t + 0.2), smoothstep(0.9, 1.0, sin(d * 10.0)));
    col *= smoothstep(1.5, 0.3, d);

    fragColor = vec4(col, 1.0);
}
