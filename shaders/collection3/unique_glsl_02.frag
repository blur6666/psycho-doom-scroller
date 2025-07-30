#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

mat2 rot(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

float sdBox(vec3 p, vec3 b) {
    vec3 q = abs(p) - b;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

float map(vec3 p) {
    float loop_t = mod(u_time, 10.0);
    float angle = loop_t * 3.14159 * 2.0 / 10.0;
    
    vec3 q = p;
    q.xy *= rot(angle * 0.5);
    q.xz *= rot(angle);

    vec3 grid_p = mod(q, 4.0) - 2.0;
    return sdBox(grid_p, vec3(0.5));
}

vec3 getNormal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        map(p + e.xyy) - map(p - e.xyy),
        map(p + e.yxy) - map(p - e.yxy),
        map(p + e.yyx) - map(p - e.yyx)
    ));
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;

    vec3 ro = vec3(0, 0, -5.0 + sin(u_time * 0.2) * 2.0);
    vec3 rd = normalize(vec3(uv, 1.0));
    ro.yz *= rot(sin(u_time * 0.3) * 0.4);

    float d = 0.0;
    vec3 p = ro;

    for (int i = 0; i < 100; i++) {
        float res = map(p);
        if (res < 0.001) break;
        d += res;
        p = ro + rd * d;
        if (d > 100.0) break;
    }
    
    vec3 col = vec3(0.0);
    if (d < 100.0) {
        vec3 nor = getNormal(p);
        vec3 light_dir = normalize(vec3(1.0, 1.0, -1.0));
        float diff = max(dot(nor, light_dir), 0.1);
        col = vec3(0.1, 0.5, 0.8) * diff;
        col += pow(max(0.0, dot(reflect(rd, nor), light_dir)), 32.0); // Specular
        col = mix(col, vec3(0.0), 1.0 - exp(-0.05 * d)); // Fog
    }
    
    fragColor = vec4(col, 1.0);
}
