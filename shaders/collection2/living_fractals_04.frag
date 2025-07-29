#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

const float LOOP_DURATION = 10.0;

float julia(vec2 z, vec2 c) {
    for (int i = 0; i < 100; i++) {
        z = vec2(z.x*z.x-z.y*z.y, 2.0*z.x*z.y) + c;
        if (dot(z,z) > 4.0) return float(i)/100.0;
    }
    return 1.0;
}

vec3 palette(float t) {
    t = sqrt(t);
    return vec3(0.5) + 0.5 * cos(6.28318*(0.6*t + vec3(0.9, 0.8, 0.5)));
}

void main() {
    vec2 uv = (2.0 * gl_FragCoord.xy - u_resolution.xy) / u_resolution.y;

    float progress = mod(u_time, LOOP_DURATION) / LOOP_DURATION;

    // MOVEMENT 1: Parameter morphing in a small circle.
    float angle = progress * 6.28318;
    vec2 c = vec2(-0.8, 0.156) + vec2(cos(angle), sin(angle)) * 0.02;

    // MOVEMENT 2: A slow, pulsating "breathing" zoom.
    float zoom = 1.0 + 0.2 * pow(sin(angle) * 0.5 + 0.5, 4.0);
    uv *= zoom;
    
    float val = julia(uv, c);
    
    vec3 color = palette(val);
    if (val > 0.99) color = vec3(0.0);

    fragColor = vec4(color, 1.0);
}
