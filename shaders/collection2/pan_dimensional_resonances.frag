#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    vec3 a = vec3(0.2, 0.8, 0.4);
    vec3 b = vec3(0.8, 0.2, 0.6);
    vec3 c = vec3(1.1, 0.8, 0.5);
    vec3 d = vec3(0.0, 0.3, 0.6);
    return a + b * cos(6.28318 * (c * t + d));
}

// Simulate higher-dimensional projections onto 2D
float higher_dim_projection(vec2 p, float time_offset, float dim_factor) {
    // Project 2D point into a hypothetical higher dimension (e.g., 4D, 5D)
    vec4 q = vec4(p.x, p.y, sin(p.x * dim_factor + time_offset), cos(p.y * dim_factor - time_offset));
    
    // Calculate a "distance" or "resonance" in this higher space
    float resonance = length(q);
    
    // Introduce an additional dimension's "ripple"
    resonance += sin(q.z * 10.0 + time_offset * 3.0) * 0.2;
    resonance += cos(q.w * 8.0 - time_offset * 2.0) * 0.2;

    return resonance;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec3 finalColor = vec3(0.0);
    float t = u_time * 0.1;

    // Multiple layers representing different "dimensional slices"
    for (float i = 0.0; i < 5.0; i++) {
        vec2 p = uv * (1.0 + i * 0.2);
        p += vec2(sin(t * 0.5 + i * 1.3), cos(t * 0.6 + i * 0.8)) * 0.1; // Drift
        
        // Time-varying "dimensional factor"
        float dim_factor = 5.0 + sin(t * 0.3 + i) * 3.0;
        float resonance_val = higher_dim_projection(p, t + i * 0.7, dim_factor);
        
        // Visualize the resonance as glowing bands
        float band_width = 0.05 + sin(t * 0.7 + i) * 0.02;
        float bands = smoothstep(band_width, band_width * 0.5, abs(fract(resonance_val * 3.0) - 0.5));
        
        bands = pow(bands, 2.0); // Sharpen the bands

        vec3 col = palette(resonance_val * 0.5 + t * 0.1 + i * 0.15);
        finalColor += col * bands * (0.2 + i * 0.07);
    }
    
    // Background inter-dimensional hum
    finalColor += palette(sin(length(uv) * 2.0 + t * 0.04) * 0.5 + 0.5) * 0.06;

    fragColor = vec4(finalColor, 1.0);
}
