#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.263, 0.416, 0.557);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = mod(u_time, 8.0);
    
    vec2 p = uv;
    float totalDistance = 0.0;
    
    // Kaleidoscopic folding with 8 iterations
    for (int i = 0; i < 8; i++) {
        float fi = float(i);
        
        // Mirror folding
        p = abs(p) - 0.5;
        
        // Rotate around origin
        float angle = t * 0.2 + fi * 0.3;
        mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        p = rot * p;
        
        // Scale
        p *= 1.3 + sin(t + fi) * 0.1;
        
        // Track total transformation
        totalDistance += length(p);
    }
    
    // Final pattern based on position and accumulated distance
    float pattern = sin(p.x * 10.0) * cos(p.y * 10.0);
    pattern += sin(totalDistance * 2.0 - t * 3.0);
    
    // Color based on recursion depth and angle
    float colorSeed = atan(p.y, p.x) / 6.28318 + totalDistance * 0.1;
    vec3 color = palette(colorSeed + t * 0.1);
    
    // Enhance with pattern intensity
    color *= 0.7 + abs(pattern) * 0.5;
    
    fragColor = vec4(color, 1.0);
}
