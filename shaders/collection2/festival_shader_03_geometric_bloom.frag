#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(0.8, 1.0, 0.3);
    vec3 d = vec3(0.2, 0.3, 0.3);
    return a + b * cos(6.28318 * (c * t + d));
}

mat2 rotate2d(float angle) {
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec3 finalColor = vec3(0.0);
    float t = u_time * 0.2;

    for (float i = 0.0; i < 5.0; i++) {
        uv = abs(uv) - 0.5;
        uv *= rotate2d(t * (0.5 + i * 0.1));
        uv *= 1.2;
        
        float d = length(uv);
        vec3 color = palette(d + i * 0.2 + t);
        
        float pattern = sin(uv.x * 10.0 + t * 2.0) * cos(uv.y * 10.0 + t * 2.0);
        float glow = pow(0.01 / abs(pattern), 1.2);
        
        finalColor += color * glow * 0.05;
    }

    fragColor = vec4(finalColor, 1.0);
}
