#version 300 es
precision mediump float;
uniform vec2 u_resolution;
// uniform vec2 u_mouse;
vec2 u_mouse = vec2(0.0, 0.0);
uniform float u_time;
out vec4 fragColor;

float serpent_body(vec2 p, float t) {
    float serpent_path = sin(p.x * 2.0 + t) * 0.3 + cos(p.x * 3.0 + t * 1.5) * 0.2;
    return abs(p.y - serpent_path) - 0.1 - sin(p.x * 8.0 + t * 2.0) * 0.03;
}

vec3 serpent_scales(vec2 p, float t) {
    vec2 scale_uv = p * 20.0;
    scale_uv.x += sin(p.y * 10.0 + t) * 2.0; // Undulating scales
    
    vec2 scale_id = floor(scale_uv);
    vec2 scale_pos = fract(scale_uv) - 0.5;
    
    float scale_pattern = length(scale_pos) - 0.3;
    scale_pattern = abs(scale_pattern) - 0.1;
    
    // Iridescent scale colors
    float hue = sin(scale_id.x * 0.5 + scale_id.y * 0.3 + t * 0.5) * 0.5 + 0.5;
    vec3 color = vec3(
        sin(hue * 6.28 + 0.0) * 0.5 + 0.5,
        sin(hue * 6.28 + 2.0) * 0.5 + 0.5,
        sin(hue * 6.28 + 4.0) * 0.5 + 0.5
    );
    
    // Add metallic sheen
    color += vec3(0.3, 0.6, 0.1) * sin(scale_pattern * 50.0 + t * 3.0) * 0.3;
    
    return color * smoothstep(0.1, 0.0, scale_pattern);
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    
    vec3 color = vec3(0.0);
    
    // Multiple serpents in spiral
    for (float i = 0.0; i < 5.0; i++) {
        float spiral_time = u_time + i * 1.2;
        float radius = 0.3 + i * 0.15;
        
        // Spiral motion
        vec2 serpent_center = vec2(
            sin(spiral_time * 0.3 + i) * radius,
            cos(spiral_time * 0.2 + i * 1.5) * radius
        );
        
        vec2 local_uv = uv - serpent_center;
        
        // Rotate serpent
        float rotation = spiral_time * 0.2 + i * 2.0;
        float c = cos(rotation);
        float s = sin(rotation);
        local_uv = mat2(c, -s, s, c) * local_uv;
        
        float body = serpent_body(local_uv, spiral_time);
        
        if (body < 0.0) {
            vec3 scales = serpent_scales(local_uv, spiral_time);
            color += scales * (1.0 - i * 0.15);
        }
        
        // Serpent glow
        float glow = exp(-abs(body) * 20.0) * (sin(spiral_time * 2.0 + i) * 0.3 + 0.7);
        color += vec3(0.2, 0.8, 0.3) * glow * 0.5;
    }
    
    // Add jungle atmosphere
    float atmosphere = sin(uv.x * 5.0 + u_time) * cos(uv.y * 3.0 + u_time * 1.3) * 0.1;
    color += vec3(0.1, 0.4, 0.1) * atmosphere;
    
    fragColor = vec4(color, 1.0);
}
