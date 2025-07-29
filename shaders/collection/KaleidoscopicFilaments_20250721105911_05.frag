#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    vec3 a = vec3(0.1, 0.4, 0.3);
    vec3 b = vec3(0.2, 0.5, 0.3);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.33, 0.67);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);

    float zoom = 1.0 + sin(u_time * 0.3) * 0.4;

    for (float i = 0.0; i < 3.0; i++) {
        uv = fract(uv * zoom) - 0.5;
        
        // Chebyshev distance for a square look
        float d = max(abs(uv.x), abs(uv.y));
        d *= exp(-length(uv0));

        vec3 color = palette(length(uv0) + i * 0.5 - u_time * 0.2);

        d = sin(d * 9.0 + u_time) / 9.0;
        d = abs(d);

        d = pow(0.012 / d, 1.0);
        finalColor += color * d;
    }

    fragColor = vec4(finalColor, 1.0);
}
