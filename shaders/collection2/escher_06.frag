#version 300 es
precision highp float;

out vec4 fragColor;
uniform vec2 u_resolution;
uniform float u_time;

// 2D simplex noise
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }
float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439, -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
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

// Curl noise
vec2 curlNoise(vec2 p, float t) {
    float e = 0.1;
    float n1 = snoise(vec2(p.x, p.y + e) + t);
    float n2 = snoise(vec2(p.x, p.y - e) + t);
    float n3 = snoise(vec2(p.x + e, p.y) + t);
    float n4 = snoise(vec2(p.x - e, p.y) + t);
    return vec2(n1 - n2, n3 - n4);
}

void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution.xy;
    uv -= 0.5;
    uv.x *= u_resolution.x / u_resolution.y;
    
    vec2 p = uv * 2.0;
    
    // Warp space with curl noise
    vec2 warp = curlNoise(p * 2.0, u_time * 0.1) * 0.5;
    p += warp;

    // Draw grid
    vec2 grid = abs(fract(p * 5.0) - 0.5);
    float d = min(grid.x, grid.y);
    
    vec3 col = vec3(0.0);
    
    float line = 1.0 - smoothstep(0.0, 0.02, d);
    
    // Color line based on flow direction
    vec3 flowColor = normalize(vec3(warp.x, warp.y, 0.2)) * 0.5 + 0.5;
    
    col += line * flowColor;

    fragColor = vec4(col, 1.0);
}
