#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 0.5);
    vec3 d = vec3(0.8, 0.9, 0.3);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);

    for (float i = 0.0; i < 4.0; i++) {
        uv = fract(uv * 1.9) - 0.5;

        float r = length(uv);
        float a = atan(uv.y, uv.x);
        
        float d = sin(r * 5.0 - u_time + a * 3.0);
        d *= cos(a * 6.0 + u_time);
        
        vec3 color = palette(r - i * 0.1 + u_time * 0.3);

        d = abs(d);
        d = pow(0.02 / d, 1.25);
        finalColor += color * d * (1.0 - length(uv0));
    }

    fragColor = vec4(finalColor, 1.0);
}
