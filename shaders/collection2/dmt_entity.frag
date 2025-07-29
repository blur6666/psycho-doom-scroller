#version 300 es
precision mediump float;
uniform vec2 u_resolution;
// uniform vec2 u_mouse;
vec2 u_mouse = vec2(0.0, 0.0);
uniform float u_time;
out vec4 fragColor;

vec3 entity_colors(float t, float morph) {
    float r = sin(t * 3.0 + morph) * 0.5 + 0.5;
    float g = sin(t * 4.0 + morph + 2.0) * 0.5 + 0.5;
    float b = sin(t * 5.0 + morph + 4.0) * 0.5 + 0.5;
    
    // Enhance saturation for that otherworldly feel
    vec3 col = vec3(r, g, b);
    col = pow(col, vec3(0.7));
    return col * 1.4;
}

float entity_geometry(vec2 p, float time) {
    float r = length(p);
    float a = atan(p.y, p.x);
    
    // Morphing entity shape
    float morph = sin(time * 0.3) * 0.5 + 0.5;
    float sides = mix(3.0, 8.0, morph);
    
    // Create breathing, morphing geometry
    float shape = cos(a * sides + time) * 0.2 + 0.8;
    shape *= 1.0 + sin(r * 6.0 - time * 2.0) * 0.3;
    
    return abs(r - shape * 0.3) - 0.02 - sin(time + r * 10.0) * 0.01;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    
    vec3 color = vec3(0.0);
    float entity_time = u_time * 0.7;
    
    // Multiple entity layers
    for (float i = 0.0; i < 6.0; i++) {
        vec2 p = uv * (1.0 + i * 0.2);
        p += vec2(sin(entity_time + i * 1.3), cos(entity_time * 1.1 + i * 2.1)) * 0.1;
        
        float entity = entity_geometry(p, entity_time + i);
        entity = abs(entity) - 0.01;
        entity = 0.003 / entity;
        
        vec3 entity_col = entity_colors(i * 0.4 + entity_time * 0.2, length(p));
        color += entity_col * entity * 0.15;
    }
    
    // Add interdimensional shimmer
    float shimmer = sin(length(uv) * 20.0 + u_time * 5.0) * 0.1 + 0.9;
    color *= shimmer;
    
    fragColor = vec4(color, 1.0);
}
