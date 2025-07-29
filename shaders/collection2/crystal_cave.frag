#version 300 es
precision mediump float;
uniform vec2 u_resolution;
// uniform vec2 u_mouse;
vec2 u_mouse = vec2(0.0, 0.0);
uniform float u_time;
out vec4 fragColor;

float crystal_structure(vec2 p, float time) {
    // Hexagonal crystal lattice
    vec2 hex_uv = p * 6.0;
    vec2 hex_id = floor(hex_uv);
    vec2 hex_pos = fract(hex_uv) - 0.5;
    
    // Create hexagonal pattern
    float hex_dist = max(abs(hex_pos.x), abs(hex_pos.y * 0.866 + hex_pos.x * 0.5));
    hex_dist = max(hex_dist, abs(hex_pos.y * 0.866 - hex_pos.x * 0.5));
    
    // Growing crystals
    float growth = sin(time * 0.5 + dot(hex_id, vec2(0.1, 0.13))) * 0.5 + 0.5;
    float crystal = smoothstep(0.3 * growth, 0.25 * growth, hex_dist);
    
    return crystal;
}

vec3 crystal_refraction(vec2 p, float time) {
    vec3 color = vec3(0.0);
    
    // Light rays through crystal
    for (float i = 0.0; i < 8.0; i++) {
        float angle = i * 6.28 / 8.0 + time * 0.1;
        vec2 ray_dir = vec2(cos(angle), sin(angle));
        
        float ray = abs(dot(p, ray_dir));
        ray = sin(ray * 20.0 + time * 2.0 + i) * exp(-ray * 2.0);
        
        // Spectral dispersion
        vec3 spectrum = vec3(
            sin(i * 0.8 + time) * 0.5 + 0.5,
            sin(i * 0.9 + time + 2.0) * 0.5 + 0.5,
            sin(i * 1.1 + time + 4.0) * 0.5 + 0.5
        );
        
        color += spectrum * abs(ray) * 0.3;
    }
    
    return color;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    
    vec3 color = vec3(0.0);
    
    // Multiple crystal layers at different depths
    for (float depth = 0.0; depth < 4.0; depth++) {
        vec2 layer_uv = uv * (1.0 + depth * 0.3);
        
        // Parallax effect
        layer_uv += vec2(sin(u_time * 0.1 + depth), cos(u_time * 0.07 + depth)) * 0.1;
        
        float crystals = crystal_structure(layer_uv, u_time + depth * 0.5);
        vec3 refraction = crystal_refraction(layer_uv, u_time + depth * 0.3);
        
        // Crystal base color
        vec3 crystal_color = vec3(0.2, 0.4, 0.9) + refraction;
        
        // Add internal glow
        float glow = crystals * (sin(u_time + depth * 2.0) * 0.3 + 0.7);
        crystal_color += vec3(0.3, 0.8, 1.0) * glow;
        
        color += crystal_color * crystals * (1.0 - depth * 0.2);
    }
    
    // Cave atmosphere
    float cave_glow = exp(-length(uv) * 0.5) * (sin(u_time * 0.3) * 0.2 + 0.8);
    color += vec3(0.1, 0.2, 0.4) * cave_glow;
    
    fragColor = vec4(color, 1.0);
}
