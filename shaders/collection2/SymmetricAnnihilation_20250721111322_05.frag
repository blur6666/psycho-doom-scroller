#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    return vec3(0.9,0.2,0.1) + 0.3 * sin(t * 10.0 + vec3(0.0, 2.0, 4.0));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);
    
    vec2 feedback_uv = vec2(0.0);

    for (float i = 0.0; i < 5.0; i++) {
        uv += feedback_uv * 0.3; // Cannibalize the last pattern
        uv = fract(uv * 1.5) - 0.5;
        
        float d = length(uv) * exp(-length(uv0));
        vec3 color = palette(length(uv0) + i * .4 + u_time * 0.4);
        d = sin(d * 8.0 + u_time) / 8.0;
        d = abs(d);
        d = pow(0.01 / d, 1.2);

        feedback_uv = color.rg * d; // The red/green channels become the next distortion
        finalColor += color * d;
    }
    fragColor = vec4(finalColor, 1.0);
}
