#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

mat2 rotate(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
}

vec3 palette(float t) {
    vec3 a = vec3(0.8, 0.5, 0.4);
    vec3 b = vec3(0.2, 0.4, 0.2);
    vec3 c = vec3(2.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.25, 0.25);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);
    
    float angle = 6.28318 / 6.0; // 60 degrees for hex symmetry

    for (float i = 0.0; i < 5.0; i++) {
        uv *= rotate(angle + u_time * 0.1);
        uv = fract(uv * 1.6) - 0.5;

        float d = length(uv) * exp(-length(uv0));

        vec3 color = palette(length(uv0) + i * 0.3 + u_time * 0.2);

        d = sin(d * 10.0 - u_time * 2.0) / 10.0;
        d = abs(d);
        
        d = pow(0.015 / d, 1.1);
        finalColor += color * d;
    }

    fragColor = vec4(finalColor, 1.0);
}
