#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)),
             dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
}

float voronoi(vec2 x) {
    vec2 n = floor(x);
    vec2 f = fract(x);
    
    float F1 = 8.0; // Distance to closest feature point
    float F2 = 8.0; // Distance to second closest feature point
    vec2 mr;        // Minimum point
    
    for(int j = -1; j <= 1; j++) {
        for(int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = hash22(n + g);
            o = 0.5 + 0.5 * sin(u_time * 0.3 + 6.2831 * o);
            
            vec2 r = g + o - f;
            float d = dot(r, r);
            
            if(d < F1) {
                F2 = F1;
                F1 = d;
                mr = r;
            } else if(d < F2) {
                F2 = d;
            }
        }
    }
    
    // F2 - F1 is the distance to the cell boundary
    return sqrt(F2) - sqrt(F1);
}

vec2 grad(vec2 p, float t) {
    float eps = 0.001;
    float center = voronoi(p * 10.0);
    float right = voronoi((p + vec2(eps, 0.0)) * 10.0);
    float top = voronoi((p + vec2(0.0, eps)) * 10.0);
    return vec2(right - center, top - center) / eps;
}

float reactionDiffusion(vec2 p, float t) {
    // Simulate a reaction-diffusion system by combining different scales of Voronoi
    float sum = 0.0;
    float amp = 0.5;
    
    for(int i = 0; i < 3; i++) {
        float scale = pow(2.0, float(i));
        sum += voronoi(p * scale * 5.0 + t * 0.2) * amp;
        amp *= 0.5;
    }
    
    return sum;
}

vec3 morphogenesisColor(float v, float edge, vec2 p) {
    // Create natural-looking color patterns similar to biological tissues
    vec3 col1 = vec3(0.8, 0.7, 0.5); // Beige
    vec3 col2 = vec3(0.3, 0.5, 0.2); // Green
    vec3 col3 = vec3(0.7, 0.3, 0.2); // Reddish
    
    // Base tissue pattern
    vec3 tissue = mix(col1, col2, smoothstep(0.0, 0.5, v));
    
    // Add vein-like structures
    float veins = smoothstep(0.1, 0.0, abs(v - 0.3)) * 0.5;
    tissue = mix(tissue, col3, veins);
    
    // Add cell walls/edges
    vec3 edgeColor = vec3(0.1, 0.1, 0.0);
    tissue = mix(tissue, edgeColor, smoothstep(0.0, 0.1, edge) * 0.8);
    
    return tissue;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    
    // Time-varying deformation field
    vec2 deform = vec2(
        sin(uv.y * 3.0 + u_time * 0.7) * 0.1,
        cos(uv.x * 3.0 + u_time * 0.6) * 0.1
    );
    
    // Apply deformation
    vec2 p = uv + deform * (0.5 + 0.5 * sin(u_time * 0.2));
    
    // Calculate cellular boundaries and reaction-diffusion pattern
    float edge = voronoi(p * 10.0);
    float pattern = reactionDiffusion(p, u_time);
    
    // Calculate gradient for growth direction
    vec2 g = grad(p, u_time);
    float growth = length(g);
    
    // Combine into final color
    vec3 color = morphogenesisColor(pattern, edge, p);
    
    // Add growth/direction indicator
    color += vec3(0.1, 0.0, 0.0) * growth;
    
    // Add pulsing effect
    float pulse = 0.5 + 0.5 * sin(pattern * 10.0 - u_time * 2.0);
    color *= 0.8 + 0.2 * pulse;
    
    fragColor = vec4(color, 1.0);
}

//  Shader 7: Topological Surface Deformation
