#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

out vec4 fragColor;

// 2D Random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// 2D Noise function (Value Noise)
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);

    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));

    // Smooth interpolation (Smoothstep)
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.y * u.x;
}

// Fractional Brownian Motion (fBm) to create organic textures
float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 6; i++) {
        value += amplitude * noise(st);
        st *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

// Psychedelic color palette
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.00, 0.10, 0.20); // Deep blues and purples
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    uv *= 1.5; // Zoom in a bit

    float time_offset = u_time * 0.1;
    
    // Create two layers of noise moving at different speeds for a parallax effect
    float fbm1 = fbm(uv + time_offset);
    float fbm2 = fbm(uv + vec2(5.2, 1.3) + time_offset * 0.5);

    // Combine the noise layers to create intricate, coral-like structures.
    float combined_fbm = fbm1 * fbm2 * 2.0;
    
    // Create sharp, glowing edges from the noise values.
    float d = sin(combined_fbm * 15.0 - u_time * 0.8);
    d = abs(d);
    
    // Invert and amplify the value to make the edges glow.
    d = pow(0.02 / d, 1.2);

    vec3 color = palette(combined_fbm + u_time * 0.05);
    vec3 finalColor = color * d;
    finalColor += palette(length(uv) * 0.4) * 0.1;

    fragColor = vec4(finalColor, 1.0);
}
