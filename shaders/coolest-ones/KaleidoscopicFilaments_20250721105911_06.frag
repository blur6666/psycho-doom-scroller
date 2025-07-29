#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

// 2D simplex noise
vec3 permute(vec3 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
float snoise(vec2 v) {
    const vec4 C = vec4(0.2113248654, 0.3660254038, -0.5773502692, 0.0243902439);
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

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(0.6, 0.8, 0.4);
    vec3 d = vec3(0.1, 0.3, 0.4);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec3 finalColor = vec3(1.0); // Start with white for multiplicative blend

    for (float i = 1.0; i < 5.0; i++) {
        float scale = i * 1.5;
        float d = snoise((uv + i*0.1) * scale + u_time*0.2);
        
        vec3 color = palette(d + u_time * 0.1);
        
        d = sin(d * 8.0);
        d = abs(d);
        d = pow(0.1 / d, 0.8);

        finalColor *= color * d;
    }

    fragColor = vec4(finalColor, 1.0);
}
