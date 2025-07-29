#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    return 0.5 + 0.5 * cos(6.28318 * (vec3(1.0, 0.7, 0.9) * t + vec3(0.5, 0.2, 0.1)));
}

// Complex number multiplication
vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}
vec2 cpow(vec2 z, float n) {
    float r = length(z);
    float a = atan(z.y, z.x);
    return pow(r, n) * vec2(cos(a*n), sin(a*n));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec3 col = vec3(0.0);
    float t = u_time * 0.1;

    vec2 z = uv * 2.0;

    // A simplified equation for a Calabi-Yau Quintic
    // z1^5 + z2^5 + z3^5 + z4^5 + z5^5 = 0
    // We project this from complex space down to our 2D screen in an abstract way
    
    vec2 z1 = z;
    vec2 z2 = vec2(cos(t), sin(t)); // Time-varying slice
    vec2 z3 = vec2(sin(length(z)*5.0-t*2.0), cos(length(z)*5.0-t*2.0));
    vec2 z4 = vec2(z.y, z.x);
    vec2 z5 = vec2(1.0, 0.0);

    vec2 val = cpow(z1, 5.0) + cpow(z2, 5.0) + cpow(z3, 5.0) + cpow(z4, 5.0) + cpow(z5, 5.0);

    float l = length(val);
    float angle = atan(val.y, val.x);
    
    // Visualize the length and angle of the resulting complex number
    col = palette(angle / 6.28318 + t);
    col *= 1.0 - smoothstep(0.0, 0.5, l);
    col += palette(l*0.1 - t) * smoothstep(0.1, 0.0, abs(mod(l, 0.5) - 0.25));

    fragColor = vec4(col, 1.0);
}
