#version 300 es
precision mediump float;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
out vec4 fragColor;

vec2 complex_pow(vec2 z, float n) {
    float r = length(z);
    float theta = atan(z.y, z.x);
    r = pow(r, n);
    theta *= n;
    return vec2(cos(theta), sin(theta)) * r;
}

vec2 complex_mul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

vec3 dream_palette(float t, float depth) {
    // Colors that morph like in dreams
    vec3 color = vec3(
        sin(t * 4.0 + depth) * 0.5 + 0.5,
        sin(t * 6.0 + depth + 1.5) * 0.5 + 0.5,
        sin(t * 8.0 + depth + 3.0) * 0.5 + 0.5
    );
    
    // Dream-like color enhancement
    color = pow(color, vec3(0.8)) * 1.3;
    
    return color;
}

float fractal_dream(vec2 c, float time) {
    vec2 z = vec2(0.0);
    float iterations = 0.0;
    
    // Dream-morphing parameters
    vec2 dream_c = c + vec2(sin(time * 0.2), cos(time * 0.3)) * 0.3;
    float dream_power = 2.0 + sin(time * 0.1) * 0.5;
    
    for (float i = 0.0; i < 50.0; i++) {
        if (length(z) > 2.0) break;
        
        z = complex_pow(z, dream_power) + dream_c;
        iterations = i;
    }
    
    return iterations / 50.0;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    
    vec3 color = vec3(0.0);
    
    // Multiple dream layers at different scales
    for (float layer = 0.0; layer < 4.0; layer++) {
        float scale = 1.0 + layer * 0.5;
        float time_warp = u_time * (0.3 + layer * 0.2);
        
        vec2 dream_uv = uv * scale;
        
        // Dream drift
        dream_uv += vec2(sin(time_warp + layer), cos(time_warp * 1.3 + layer)) * 0.2;
        
        float fractal = fractal_dream(dream_uv, time_warp);
        
        // Dream logic - impossible transitions
        fractal = abs(sin(fractal * 6.28 * 3.0 + time_warp));
        
        vec3 dream_color = dream_palette(fractal + time_warp * 0.1, layer);
        color += dream_color * fractal * (0.4 - layer * 0.08);
    }
    
    // Dream fog
    float fog = exp(-length(uv) * 0.5) * (sin(u_time * 0.5) * 0.3 + 0.7);
    color *= fog;
    
    // Reality glitches
    float glitch = sin(uv.x * 100.0 + u_time * 10.0) * cos(uv.y * 80.0 + u_time * 7.0) * 0.05;
    color += vec3(glitch) * vec3(1.0, 0.2, 0.8);
    
    fragColor = vec4(color, 1.0);
}
