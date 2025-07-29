#version 300 es
precision mediump float;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
out vec4 fragColor;

vec2 time_warp(vec2 p, float time_speed) {
    float warp_factor = sin(length(p) * 5.0 - time_speed * 2.0) * 0.2;
    float angle = atan(p.y, p.x) + warp_factor;
    float radius = length(p) * (1.0 + warp_factor * 0.5);
    return vec2(cos(angle), sin(angle)) * radius;
}

vec3 temporal_colors(float t, float time_layer) {
    // Colors that shift through time
    vec3 past = vec3(0.5, 0.2, 0.8);    // Purple past
    vec3 present = vec3(0.9, 0.9, 0.1); // Bright present
    vec3 future = vec3(0.1, 0.8, 0.9);  // Cyan future
    
    float time_phase = sin(t + time_layer) * 0.5 + 0.5;
    
    if (time_phase < 0.33) {
        return mix(past, present, time_phase * 3.0);
    } else if (time_phase < 0.66) {
        return mix(present, future, (time_phase - 0.33) * 3.0);
    } else {
        return mix(future, past, (time_phase - 0.66) * 3.0);
    }
}

float temporal_pattern(vec2 p, float time_speed) {
    vec2 warped = time_warp(p, time_speed);
    
    // Interference patterns across time
    float pattern = 0.0;
    pattern += sin(warped.x * 8.0 + time_speed);
    pattern += cos(warped.y * 6.0 + time_speed * 1.3);
    pattern += sin(length(warped) * 10.0 - time_speed * 2.0);
    
    return pattern / 3.0;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    
    vec3 color = vec3(0.0);
    
    // Multiple temporal layers
    for (float i = 0.0; i < 6.0; i++) {
        float time_speed = u_time * (0.5 + i * 0.3);
        float layer_offset = i * 0.7;
        
        vec2 layer_uv = uv;
        
        // Each layer moves at different temporal speed
        layer_uv += vec2(sin(time_speed + layer_offset), cos(time_speed * 1.2 + layer_offset)) * 0.1;
        
        float pattern = temporal_pattern(layer_uv, time_speed);
        vec3 time_color = temporal_colors(pattern + time_speed * 0.1, i);
        
        float intensity = abs(pattern) * exp(-i * 0.2);
        color += time_color * intensity * 0.4;
    }
    
    // Time ripples
    float ripple = sin(length(uv) * 15.0 - u_time * 4.0) * 0.1;
    color += vec3(ripple) * vec3(1.0, 0.5, 0.2);
    
    // Temporal breathing
    float breath = sin(u_time * 0.4) * 0.2 + 0.8;
    color *= breath;
    
    fragColor = vec4(color, 1.0);
}
