#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    return vec3(0.8, 1.0, 1.0) * (0.6 + 0.4 * sin(t * 6.28318));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    
    // Wave distortion
    uv.x += sin(uv.y * 4.0 + u_time) * 0.2;
    uv.y += cos(uv.x * 4.0 - u_time) * 0.2;

    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);

    for (float i = 0.0; i < 4.0; i++) {
        uv = fract(uv * 1.5) - 0.5;

        float d = length(uv) * exp(-length(uv0));
        vec3 color = palette(length(uv0) + i * 0.4);

        d = sin(d * 12.0 + u_time * 1.5) / 12.0;
        d = abs(d);

        d = pow(0.005 / d, 1.3);
        finalColor += color * d;
    }

    fragColor = vec4(finalColor, 1.0);
}
