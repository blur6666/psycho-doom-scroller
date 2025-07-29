#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

// Unique Palette: Fiery core, muted periphery
vec3 palette(float t) {
    vec3 a = vec3(0.6, 0.5, 0.4);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 0.5);
    vec3 d = vec3(0.80, 0.90, 0.30);
    return a + b * cos(6.28318 * (c * t + d));
}

float random(vec2 p) {
    return fract(sin(dot(p.xy, vec2(12.9898, 78.233))) * 43758.5453);
}

// Simplex-like noise for organic patterns
float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float n = mix(mix(random(i + vec2(0, 0)), random(i + vec2(1, 0)), f.x),
                  mix(random(i + vec2(0, 1)), random(i + vec2(1, 1)), f.x), f.y);
    return n;
}

// The "mind" or central structure
float core(vec2 uv) {
    float d = length(uv);
    float r = 0.5 + 0.1 * sin(u_time * 0.5);
    float s = 0.02 / (abs(d - r));
    s = pow(s, 1.1);
    return s;
}

// Domain warping - reality is distorted by the core
vec2 warp(vec2 uv) {
    float t = u_time * 0.2;
    vec2 q = vec2(noise(uv + t), noise(uv - t));
    vec2 r = vec2(noise(uv + q * 2.0 + t * 0.5), noise(uv - q * 2.0 - t * 0.5));
    return uv + r * 0.5;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

    // The core "self"
    float c = core(uv);
    vec3 color = palette(c * 0.1 + u_time * 0.2);

    // The generated "external reality"
    // The further from the core, the more distorted and less "real" it is
    float dist_from_core = length(uv);
    float reality_stability = smoothstep(1.5, 0.3, dist_from_core);

    vec2 warped_uv = warp(uv * (2.0 - reality_stability));
    float external_pattern = noise(warped_uv * 5.0) * reality_stability;
    
    vec3 external_color = palette(external_pattern + 0.5);
    
    // Combine the core and its generated reality
    // The core overwrites everything, its influence fades with distance
    color = mix(external_color, color, c);
    color = mix(color, vec3(0.0), 1.0 - smoothstep(0.0, 2.0, dist_from_core));

    fragColor = vec4(color, 1.0);
}
