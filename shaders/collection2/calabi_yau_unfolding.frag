#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

// Unique Palette: Metallic, complex golds and cyans
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 0.8);
    vec3 d = vec3(0.10, 0.20, 0.25);
    return a + b * cos(6.28318 * (c * t + d));
}

// Rotation matrix
mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

// SDF for a torus
float sdTorus(vec3 p, vec2 t) {
    vec2 q = vec2(length(p.xz) - t.x, p.y);
    return length(q) - t.y;
}

// Complex folding/unfolding function
vec3 fold(vec3 p) {
    p.xy *= rot(p.z * 0.2 + u_time * 0.1);
    p.xz *= rot(p.y * 0.3 - u_time * 0.15);
    return p;
}

// The scene's Signed Distance Function
float map(vec3 p) {
    vec3 p_orig = p;
    
    // Time-driven unfolding parameter
    float unfold = 0.5 + 0.5 * sin(u_time * 0.1);
    
    // Create a complex, self-intersecting structure
    // by repeating and folding space
    p = abs(p);
    p.x = abs(p.x - 4.0);
    p = fold(p);
    
    float d = 1000.0;

    for (int i = 0; i < 6; i++) {
        p = abs(p);
        p -= vec3(1.0, 0.5, 0.0) * unfold;
        p = fold(p);
        d = min(d, sdTorus(p, vec2(0.5, 0.1)));
    }
    
    return d;
}

// Ray marching
vec3 march(vec3 ro, vec3 rd) {
    float dO = 0.0;
    vec3 col = vec3(0.0);
    for(int i = 0; i < 100; i++) {
        vec3 p = ro + rd * dO;
        float dS = map(p);
        if (dS < 0.001) {
            // Use depth and position for coloring
            float depth_color = float(i) / 100.0;
            float pos_color = length(p) * 0.1;
            col = palette(depth_color + pos_color);
            break;
        }
        if (dO > 100.0) break;
        dO += dS * 0.7;
    }
    return col;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    
    // Camera setup
    vec3 ro = vec3(0.0, 0.0, -5.0 + sin(u_time * 0.2) * 2.0);
    ro.yz *= rot(u_time * 0.1);
    ro.xz *= rot(u_time * 0.15);
    vec3 rd = normalize(vec3(uv, 1.0));
    
    vec3 col = march(ro, rd);
    
    fragColor = vec4(col, 1.0);
}
