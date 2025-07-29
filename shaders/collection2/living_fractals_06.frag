#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}
float noise(vec2 st) {
    vec2 i = floor(st); vec2 f = fract(st);
    float a = random(i); float b = random(i + vec2(1.,0.));
    float c = random(i + vec2(0.,1.)); float d = random(i + vec2(1.,1.));
    vec2 u = f*f*(3.0-2.0*f);
    return mix(a,b,u.x) + (c-a)*u.y*(1.0-u.x) + (d-b)*u.y*u.x;
}

float julia(vec2 z, vec2 c) {
    for (int i=0; i<100; i++) {
        z = vec2(z.x*z.x-z.y*z.y, 2.0*z.x*z.y) + c;
        if(dot(z,z) > 4.0) return float(i)/100.0;
    }
    return 1.0;
}

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5); vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(2.0, 1.0, 0.0); vec3 d = vec3(0.5, 0.20, 0.25);
    return a + b*cos(6.28318*(c*t+d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / u_resolution.y;
    uv *= 2.0;
    
    // MOVEMENT: Parameter "surfing" via a noise function.
    // Creates chaotic, unpredictable but smooth evolution.
    float t = u_time * 0.1;
    vec2 c;
    c.x = noise(vec2(t, 0.0)) * 1.5 - 0.75;
    c.y = noise(vec2(0.0, t)) * 1.0 - 0.5;

    float val = julia(uv, c);
    
    vec3 col = palette(val);
    if(val > 0.99) col = vec3(0.0, 0.0, 0.05);

    fragColor = vec4(col, 1.0);
}
