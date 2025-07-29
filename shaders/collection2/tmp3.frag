#version 300 es
precision highp float;

// Uniforms passed from the host application
uniform vec2 u_resolution;
uniform float u_time;

// The output color for the fragment
out vec4 fragColor;

// A custom palette function to generate a smooth, psychedelic color gradient.
// It uses cosine waves with different phases to create rich color transitions.
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 0.8);
    vec3 d = vec3(0.3, 0.20, 0.20);
    return a + b * cos(6.28318 * (c * t + d));
}

// A helper function to create a 2D rotation matrix
mat2 rotate2d(float angle){
    return mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
}

void main() {
    // Normalize and center the coordinates, making them aspect-ratio correct.
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    
    // Keep a copy of the original coordinates for coloring later.
    vec2 uv0 = uv;
    
    // Initialize the final color as black. We will add to it in layers.
    vec3 finalColor = vec3(0.0);
    
    // Loop six times to create more layers of detail, making the visual more intricate.
    for (float i = 0.0; i < 6.0; i++) {
        // 1. Warp the coordinate space using sine waves. This creates a liquid, flowing effect.
        // The time and loop index 'i' are used to ensure the pattern evolves and layers differ.
        uv += vec2(sin(uv.y * 5.0 + u_time * 0.6 + i * 1.5) * 0.12, 
                     cos(uv.x * 5.0 + u_time * 0.6 + i * 1.5) * 0.12);

        // 2. Rotate and scale the warped coordinates. This adds swirling motion and zooms into the pattern.
        uv *= rotate2d(u_time * 0.3 + i * 0.5);
        uv *= 1.35;
        
        // 3. Fold the space using fract(). This creates a kaleidoscopic, repeating effect.
        uv = fract(uv) - 0.5;

        // 4. Add a secondary folding/reflection for more geometric complexity.
        uv.x = abs(uv.x) - 0.2;

        // 5. Calculate the distance from the center of this new, folded space.
        float d = length(uv);
        
        // 6. Determine the color for this layer. It's based on the original screen position,
        // the loop index, and time. This creates a base of large, swirling color fields.
        vec3 color = palette(length(uv0) + i * 0.3 + u_time * 0.25);
        
        // 7. Create sharp, glowing lines from the distance 'd'.
        // The sine function creates concentric ripples that move with time.
        d = sin(d * 12.0 - u_time * 2.5) / 12.0;
        d = abs(d);
        
        // 8. Invert and amplify the distance value. Where 'd' is close to zero (the dark parts of the ripples),
        // this expression becomes very large, creating bright, thin lines.
        // The smoothstep function helps to avoid overly harsh or aliased edges.
        d = smoothstep(0.0, 0.08, d);
        d = pow(0.01 / d, 1.35);
        
        // 9. Add this layer's glowing lines to the final color. Each layer is scaled down
        // to prevent the final image from being too bright.
        finalColor += color * d * 0.17;
    }

    // Add a very faint background gradient based on the original coordinates.
    // This adds a subtle depth to the final image.
    fragColor = vec4(finalColor + palette(length(uv0) * 0.5) * 0.1, 1.0);
}
