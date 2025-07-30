#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

float mandelbulb(vec3 p) {
    vec3 z = p;
    float dr = 1.0;
    float r = 0.0;
    float power = 8.0 + sin(u_time) * 2.0;
    for (int i = 0; i < 15; i++) {
        r = length(z);
        if (r > 2.0) break;
        float theta = acos(z.z / r);
        float phi = atan(z.y, z.x);
        dr = pow(r, power - 1.0) * power * dr + 1.0;
        float zr = pow(r, power);
        theta *= power;
        phi *= power;
        z = zr * vec3(sin(theta) * cos(phi), sin(phi) * sin(theta), cos(theta));
        z += p;
    }
    return 0.5 * log(r) * r / dr;
}

float scene(vec3 p) {
    return mandelbulb(p);
}

vec3 normal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(
        scene(p + e.xyy) - scene(p - e.xyy),
        scene(p + e.yxy) - scene(p - e.yxy),
        scene(p + e.yyx) - scene(p - e.yyx)
    ));
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution) / min(u_resolution.x, u_resolution.y);
    vec3 ro = vec3(0.0, 0.0, -2.5 + sin(u_time));
    vec3 rd = normalize(vec3(uv, 1.0));
    float t = 0.0;
    for (int i = 0; i < 100; i++) {
        float d = scene(ro + t * rd);
        if (d < 0.001) break;
        t += d;
        if (t > 20.0) break;
    }
    vec3 p = ro + t * rd;
    vec3 n = normal(p);
    vec3 col = 0.5 + 0.5 * cos(u_time + uv.xyx + vec3(0, 2, 4)) * (0.5 + 0.5 * n);
    fragColor = vec4(col * (1.0 - t * 0.1), 1.0);
}

