#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 0.7, 0.4);
    vec3 d = vec3(0.00, 0.15, 0.20);
    return a + b * cos(6.28318 * (c * t + d));
}

vec2 random2(vec2 p) {
    return fract(sin(vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)))) * 43758.5453);
}

float voronoi(in vec2 x, float time) {
    vec2 n = floor(x);
    vec2 f = fract(x);

    float m = 1.0;
    for (int j = -1; j <= 1; j++) {
        for (int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = random2(n + g);
            o = 0.5 + 0.5 * sin(time * 0.8 + 6.2831 * o); // Animate cell centers
            float d = length(g + o - f);
            m = min(m, d);
        }
    }
    return m;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    uv *= 2.5;
    float t = u_time * 0.3;

    float v = voronoi(uv, t);
    
    // Create glowing, pulsing lines from the Voronoi distance field
    float pulse = sin(v * 20.0 - t * 4.0);
    float glow = pow(0.01 / abs(pulse), 1.8);
    
    vec3 color = palette(length(uv) * 0.2 + t) * glow;
    
    fragColor = vec4(color, 1.0);
}
