#version 300 es
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    return 0.5 + 0.5 * cos(6.28 * (vec3(0.6, 0.1, 0.8) * t + vec3(0.4, 0.9, 0.2)));
}

vec2 field_line(vec2 p, vec2 pole1, vec2 pole2) {
    vec2 f1 = normalize(p - pole1) / max(length(p - pole1), 0.1);
    vec2 f2 = -normalize(p - pole2) / max(length(p - pole2), 0.1);
    return f1 + f2;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec3 col = vec3(0.0);
    
    // Magnetic poles
    vec2 pole1 = vec2(sin(u_time * 0.3), cos(u_time * 0.2)) * 0.5;
    vec2 pole2 = vec2(sin(u_time * 0.3 + 3.14), cos(u_time * 0.2 + 3.14)) * 0.5;
    
    for(float i = 0.0; i < 8.0; i++) {
        vec2 p = uv + vec2(sin(u_time + i), cos(u_time * 1.3 + i)) * 0.1;
        
        vec2 field = field_line(p, pole1, pole2);
        float field_strength = length(field);
        
        // Field lines
        float line = abs(sin(p.x * 5.0 + field.x * 10.0 + u_time));
        line *= abs(cos(p.y * 5.0 + field.y * 10.0 - u_time));
        line = pow(line, 3.0) * field_strength;
        
        // Flux density
        float flux = sin(field_strength * 20.0 + u_time * 2.0 + i);
        flux = abs(flux) * exp(-field_strength);
        
        vec3 color = palette(field_strength + u_time * 0.1 + i * 0.15);
        col += color * (line + flux) * 0.3;
    }
    
    fragColor = vec4(col, 1.0);
}
