#version 300 es
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    return 0.5 + 0.5 * cos(6.28 * (vec3(0.4, 0.9, 0.7) * t + vec3(0.6, 0.1, 0.8)));
}

vec2 clifford_attractor(vec2 p, float a, float b, float c, float d) {
    return vec2(
        sin(a * p.y) + c * cos(a * p.x),
        sin(b * p.x) + d * cos(b * p.y)
    );
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec3 col = vec3(0.0);
    
    for(float layer = 0.0; layer < 8.0; layer++) {
        vec2 p = uv * 0.5;
        
        // Time-varying attractor parameters
        float a = sin(u_time * 0.1 + layer) * 2.0;
        float b = cos(u_time * 0.15 + layer * 1.3) * 2.0;
        float c = sin(u_time * 0.08 + layer * 2.1) * 2.0;
        float d = cos(u_time * 0.12 + layer * 0.7) * 2.0;
        
        // Iterate the attractor
        for(int i = 0; i < 200; i++) {
            p = clifford_attractor(p, a, b, c, d);
            
            float dist = length(uv - p * 0.3);
            float trail = exp(-dist * 20.0) * (1.0 - float(i) / 200.0);
            
            vec3 color = palette(length(p) + u_time * 0.05 + layer * 0.2);
            col += color * trail * 0.01;
        }
    }
    
    fragColor = vec4(col, 1.0);
}
