#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    vec3 a = vec3(0.9, 0.7, 0.3);
    vec3 b = vec3(0.1, 0.3, 0.7);
    vec3 c = vec3(1.8, 1.0, 0.6);
    vec3 d = vec3(0.7, 0.4, 0.1);
    return a + b * cos(6.28318 * (c * t + d));
}

float circle(vec2 p, vec2 center, float radius) {
    return length(p - center) - radius;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = mod(u_time, 8.0);
    
    vec2 p = uv;
    float minDist = 1000.0;
    float totalCurvature = 0.0;
    
    // Recursive circle packing approximation
    for (int level = 0; level < 6; level++) {
        float levelScale = pow(1.5, float(level));
        float circleRadius = 0.3 / levelScale;
        
        // Create grid of circles at this level
        vec2 gridSize = vec2(-levelScale);
        vec2 cellID = floor(p * gridSize);
        vec2 cellUV = fract(p * gridSize) - 0.5;
        
        // Animated circle centers
        vec2 offset = vec2(
            sin(t * 1.5 + cellID.x * 0.5 + cellID.y * 0.3),
            cos(t * 1.2 + cellID.x * 0.3 + cellID.y * 0.7)
        ) * 0.1;
        
        float dist = circle(cellUV, offset, circleRadius);
        minDist = min(minDist, dist);
        
        // Curvature calculation (1/radius)
        if (dist < circleRadius * 1.5) {
            totalCurvature += 1.0 / (circleRadius + 0.01);
        }
        
        // Transform space for next level
        if (dist > 0.0) {
            // Inversion transformation
            p = p / dot(p, p) * 0.5;
            
            // Add rotation
            float angle = t * 0.1 + float(level) * 0.4;
            mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
            p = rot * p;
        }
    }
    
    // Pattern based on distance to nearest circle
    float pattern = smoothstep(0.02, 0.0, minDist);
    pattern += smoothstep(0.05, 0.02, minDist) * 0.5;
    
    // Color based on curvature and position
    vec3 color = palette(totalCurvature * 0.02 + atan(uv.y, uv.x) / 6.28318 + t * 0.08);
    
    // Apply pattern intensity
    color *= 0.4 + pattern * 1.2;
    
    // Add rim lighting for circles
    float rim = exp(-abs(minDist) * 20.0) * 0.3;
    color += rim * palette(t * 0.12);
    
    fragColor = vec4(color, 1.0);
}
