#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

// Complex number operations
vec2 complex_mul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

vec2 complex_pow(vec2 z, float n) {
    float r = length(z);
    float theta = atan(z.y, z.x);
    return pow(r, n) * vec2(cos(theta * n), sin(theta * n));
}

// Vibrant color palette function
vec3 palette(float t) {
    // Create a palette with cosmic purples, blues and teals
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 0.7, 0.4);
    vec3 d = vec3(0.00, 0.15, 0.20);
    return a + b * cos(6.28318 * (c * t + d));
}

// Domain warping function
vec2 warp(vec2 p, float time) {
    // Create a swirling effect
    float r = length(p);
    float theta = atan(p.y, p.x);
    
    // Add time-based distortion
    theta += sin(r * 3.0 - time) * 0.5;
    r += sin(theta * 5.0 + time * 0.5) * 0.1;
    
    return vec2(cos(theta), sin(theta)) * r;
}

void main() {
    // Normalized, aspect-corrected coordinates
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    
    // Store original coordinates for the final composition
    vec2 uv0 = uv;
    
    // Initialize our final color
    vec3 finalColor = vec3(0.0);
    float t = u_time * 0.2; // Slowed down time for smoother animation
    
    // Create the dimensional gateway
    float gatewayRadius = 0.7 + sin(t * 0.5) * 0.05; // Pulsating radius
    float distFromCenter = length(uv);
    
    // Gateway rim glow effect
    float rimGlow = exp(-pow(abs(distFromCenter - gatewayRadius) * 15.0, 2.0));
    finalColor += vec3(0.1, 0.5, 0.8) * rimGlow * 2.0;
    
    // Inside the gateway - multiple layers of warped dimensions
    if (distFromCenter < gatewayRadius) {
        // Normalize UV inside gateway to go from 0 to 1 from center to edge
        vec2 gateUV = uv / gatewayRadius;
        
        // Apply multiple layers of effects
        for (float i = 0.0; i < 4.0; i++) {
            float layerTime = t * (0.5 + i * 0.2);
            float depth = 4.0 - i; // Deeper layers appear smaller
            
            // Warp the coordinates differently for each layer
            vec2 warped = warp(gateUV * depth, layerTime);
            
            // Apply domain repetition with different scales per layer
            warped = fract(warped * (1.3 + i * 0.2)) - 0.5;
            
            // For each iteration, apply complex number operations to create fractal patterns
            vec2 z = warped;
            for (int j = 0; j < 3; j++) {
                z = complex_pow(z, 2.0 + sin(layerTime * 0.2) * 0.5) + warped * 0.7;
            }
            
            // Calculate a pattern based on the complex operations
            float pattern = length(z);
            
            // Create glowing filaments using the inverse power function
            float filament = pow(0.02 / (abs(sin(pattern * 10.0 + layerTime)) + 0.02), 1.2);
            
            // Calculate layer color based on position and time
            vec3 layerColor = palette(pattern * 0.5 + i * 0.2 + layerTime * 0.1);
            
            // Add the layer to our final color with depth-based intensity
            finalColor += layerColor * filament * (0.3 - i * 0.05);
        }
        
        // Add subtle center glow
        float centerGlow = exp(-distFromCenter * 5.0) * 0.5;
        finalColor += vec3(1.0, 0.8, 0.6) * centerGlow;
    } else {
        // Outside the gateway - dark space with subtle nebula
        float nebula = sin(uv.x * 5.0 + t) * cos(uv.y * 3.0 - t * 0.5) * 0.5 + 0.5;
        nebula *= exp(-pow(distFromCenter - gatewayRadius, 2.0) * 1.5); // Fade with distance from rim
        finalColor += palette(nebula + t * 0.05) * nebula * 0.15;
        
        // Add subtle star field
        vec2 starUV = floor(uv * 50.0);
        float star = fract(sin(starUV.x * 173.3 + starUV.y * 284.3) * 4783.3);
        star = smoothstep(0.98, 1.0, star) * (0.5 + 0.5 * sin(t + star * 6.28));
        finalColor += vec3(star);
    }
    
    // Apply vignette effect
    float vignette = 1.0 - smoothstep(0.5, 1.5, length(uv0));
    finalColor *= vignette;
    
    // Tone mapping to handle high dynamic range
    finalColor = finalColor / (finalColor + vec3(1.0));
    
    // Output the final color
    fragColor = vec4(finalColor, 1.0);
}