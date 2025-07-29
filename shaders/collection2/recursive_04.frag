#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    vec3 a = vec3(0.6, 0.3, 0.5);
    vec3 b = vec3(0.4, 0.5, 0.3);
    vec3 c = vec3(1.2, 1.0, 0.8);
    vec3 d = vec3(0.3, 0.6, 0.1);
    return a + b * cos(6.28318 * (c * t + d));
}

vec2 complexSquare(vec2 z) {
    return vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y);
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = mod(u_time, 6.0);
    
    // Julia set parameters (animated)
    vec2 c = vec2(sin(t * 0.4) * 0.7, cos(t * 0.3) * 0.7);
    
    vec2 z = uv * 2.0;
    float iterations = 0.0;
    float maxIter = 64.0;
    
    // Julia set iteration with modifications
    for (int i = 0; i < 64; i++) {
        if (length(z) > 2.0) break;
        
        // Standard Julia iteration
        z = complexSquare(z) + c;
        
        // Add time-based perturbation
        z += vec2(sin(t * 3.0 + float(i) * 0.1), cos(t * 2.5 + float(i) * 0.1)) * 0.02;
        
        iterations += 1.0;
    }
    
    // Smooth coloring
    float smoothIter = iterations;
    if (length(z) > 2.0) {
        smoothIter = iterations - log2(log2(length(z)));
    }
    
    // Normalize iteration count
    float normalizedIter = smoothIter / maxIter;
    
    // Color based on escape time and final position
    float colorSeed = normalizedIter + atan(z.y, z.x) / 6.28318;
    vec3 color = palette(colorSeed + t * 0.1);
    
    // Enhance based on iteration depth
    color *= 0.3 + normalizedIter * 1.5;
    
    // Add glow for points that didn't escape
    if (iterations >= maxIter - 1.0) {
        color += vec3(0.2, 0.4, 0.8) * 0.5;
    }
    
    fragColor = vec4(color, 1.0);
}
