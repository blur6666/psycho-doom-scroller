#version 300 es
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

// Color palette: harmonic, but more neon
vec3 palette(float t) {
    return 0.5 + 0.5*cos(6.2831*(vec3(0.16,0.30,0.45)*t + vec3(0.00,0.10,0.20)));
}

// Recursive swirl pattern
vec2 swirl(vec2 uv, float t) {
    float r = length(uv);
    float a = atan(uv.y, uv.x);
    a += 0.7 * sin(r*3.0 - t*0.9) + 0.5*cos(r*6.0 + t*0.3);
    return vec2(cos(a), sin(a)) * r;
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5*u_resolution.xy) / u_resolution.y;
    vec2 originalUV = uv;
    float t = u_time * 0.35;

    vec3 color = vec3(0.0);

    // Layered swirling fields
    for (float i = 1.0; i < 6.0; i += 1.0) {
        float depth = i*0.9;
        vec2 suv = swirl(uv * (0.6 + 0.25*i), t + 0.18*i);
        float w = exp(-length(suv*2.0));
        float p = sin(6.0*length(suv)+t*1.3+i*1.9 + cos(suv.x*3.7-t) + sin(suv.y*4.5+t))*0.5+0.5;
        color += palette(p + i*0.12 + t*0.08) * w * 1.3 / (depth);
        uv = suv + originalUV*0.1;
    }

    // Add some subtle caustic-like rings
    float rings = sin(18.0*length(originalUV) - t*2.2) * 0.4 + 0.6;
    rings *= smoothstep(0.3, 0.0, abs(length(originalUV)-0.3));
    color += palette(length(originalUV)*1.2-t*0.1+1.7) * rings * 0.21;

    fragColor = vec4(color,1.0);
}
