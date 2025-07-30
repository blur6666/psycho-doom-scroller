#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

// 2D simplex noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }

float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod(i, 289.0);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy), dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x  = a0.x  * x0.x  + h.x  * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
}

float fbm(vec2 p, float time) {
    float v = 0.0;
    float a = 0.5;
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 5; ++i) {
        v += a * snoise(p + time);
        p = rot * p * 2.0;
        a *= 0.5;
    }
    return v;
}

void main() {
    vec2 uv = (gl_FragCoord.xy / u_resolution.xy - 0.5) * 2.0;
    uv.x *= u_resolution.x / u_resolution.y;

    float loop_t = u_time / 10.0;

    // Two layers of noise moving at different speeds to create the "reaction"
    float n1 = fbm(uv * 2.0, loop_t * 0.5);
    float n2 = fbm(uv * 3.0 + n1 * 0.5, loop_t * 0.2);

    // The "diffusion" part is simulated by warping the domain with noise
    vec2 warp_uv = uv + vec2(n1, n2) * 0.3;
    float final_noise = fbm(warp_uv * 1.5, loop_t * 0.8);
    
    // Create sharp boundaries like in RD systems
    float band = sin(final_noise * 10.0 + loop_t * 6.283);
    float c = smoothstep(-0.2, 0.2, band);
    c = pow(c, 1.5);

    // Color mapping
    vec3 col1 = vec3(0.9, 0.5, 0.1); // Fiery orange
    vec3 col2 = vec3(0.1, 0.0, 0.2); // Deep purple
    vec3 col = mix(col1, col2, c);

    // Add a central glow
    float glow = pow(1.0 - length(uv) * 0.5, 3.0);
    col += glow * vec3(0.8, 0.7, 0.5) * 0.5;

    fragColor = vec4(col, 1.0);
}
