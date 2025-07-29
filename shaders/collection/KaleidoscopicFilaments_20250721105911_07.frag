#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(0.9, 0.7, 1.0);
    vec3 d = vec3(0.0, 0.1, 0.2);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    
    // Log-polar coordinates for spiral
    float r = length(uv);
    float a = atan(uv.y, uv.x);
    vec2 polar_uv = vec2(log(r), a);

    vec3 finalColor = vec3(0.0);

    for (float i = 0.0; i < 4.0; i++) {
        polar_uv.x += u_time * 0.3; // Zoom
        polar_uv.y += i * 0.5;      // Layer rotation

        vec2 base_uv = vec2(cos(polar_uv.y), sin(polar_uv.y)) * exp(polar_uv.x);
        base_uv = fract(base_uv * 0.8) - 0.5;
        
        float d = length(base_uv);
        vec3 color = palette(d + i * 0.2 - u_time * 0.2);

        d = sin(d*10. + polar_uv.y * 3.0)/10.;
        d = abs(d);

        d = pow(0.008 / d, 1.3);

        finalColor += color * d / (1.0 + r*2.0);
    }

    fragColor = vec4(finalColor, 1.0);
}
