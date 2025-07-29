#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    vec3 a = vec3(0.8, 0.5, 0.4);
    vec3 b = vec3(0.2, 0.4, 0.2);
    vec3 c = vec3(2.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.25, 0.25);
    return a + b * cos(6.28318 * (c * t + d));
}

vec2 fold(vec2 p) {
    return abs(p) - 1.0;
}

float fractalDistance(vec2 p, float t) {
    float scale = 1.0;
    float dist = 1000.0;
    
    for (int i = 0; i < 8; i++) {
        // Rotate and fold
        float angle = t * 0.3 + float(i) * 0.8;
        mat2 rot = mat2(cos(angle), -sin(angle), sin(angle), cos(angle));
        p = rot * p;
        p = fold(p);
        
        // Scale and translate
        p = p * 2.0 - vec2(sin(t * 0.4), cos(t * 0.6)) * 0.5;
        scale *= 2.0;
        
        // Distance estimation
        float d = (length(p) - 0.5) / scale;
        dist = min(dist, d);
    }
    
    return dist;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = mod(u_time, 7.0);
    
    // Zoom oscillation
    float zoom = 1.0 + sin(t * 0.9) * 0.3;
    uv *= zoom;
    
    // Rotation
    float rotation = t * 0.2;
    mat2 rot = mat2(cos(rotation), -sin(rotation), sin(rotation), cos(rotation));
    uv = rot * uv;
    
    float dist = fractalDistance(uv, t);
    
    // Create multiple layers
    float layer1 = smoothstep(0.02, 0.0, dist);
    float layer2 = smoothstep(0.05, 0.02, dist) * 0.6;
    float layer3 = smoothstep(0.1, 0.05, dist) * 0.3;
    
    float combined = layer1 + layer2 + layer3;
    
    // Add flowing energy
    float energy = sin(dist * 30.0 - t * 8.0) * exp(-dist * 5.0) * 0.2;
    combined += energy;
    
    // Breathing effect
    combined *= 1.0 + sin(t * 1.5) * 0.1;
    
    vec3 color = palette(combined + t * 0.05);
    
    // Add center glow
    float centerGlow = exp(-length(uv) * 1.5) * 0.3;
    color += centerGlow * palette(t * 0.1);
    
    fragColor = vec4(color, 1.0);
}
