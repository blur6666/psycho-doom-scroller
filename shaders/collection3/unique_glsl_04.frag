#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

vec3 hsv(float h, float s, float v) {
    vec4 t = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
    vec3 p = abs(fract(vec3(h) + t.xyz) * 6.0 - vec3(t.w));
    return v * mix(vec3(t.x), clamp(p - vec3(t.x), 0.0, 1.0), s);
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    
    float loop_t = u_time * 3.14159 * 2.0 / 10.0;
    
    // Animate Julia constant 'c' in a circle
    vec2 c = vec2(0.7885 * cos(loop_t), 0.7885 * sin(loop_t));
    vec2 z = uv * 1.5;

    int i;
    for (i = 0; i < 256; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        if (dot(z, z) > 4.0) break;
    }

    float iter = float(i);
    if (i == 256) {
        fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    } else {
        // Smooth iteration count
        float log_zn = log(dot(z,z)) / 2.0;
        float nu = log(log_zn / log(2.0)) / log(2.0);
        iter = iter + 1.0 - nu;

        float hue = 0.6 + 0.3 * sin(loop_t * 0.5) + iter * 0.01;
        float sat = 0.8;
        float val = pow(iter / 256.0, 0.5);

        fragColor = vec4(hsv(hue, sat, val), 1.0);
    }
}
