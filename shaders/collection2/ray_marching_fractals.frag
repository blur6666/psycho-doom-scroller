#version 300 es
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    return 0.5 + 0.5 * cos(6.28 * (vec3(0.5, 0.7, 1.0) * t + vec3(0.4, 0.1, 0.3)));
}

float mandelbulb(vec3 p, float power) {
    vec3 z = p;
    float dr = 1.0;
    float r = 0.0;
    
    for(int i = 0; i < 8; i++) {
        r = length(z);
        if(r > 2.0) break;
        
        float theta = acos(z.z / r) * power;
        float phi = atan(z.y, z.x) * power;
        float zr = pow(r, power);
        
        dr = pow(r, power - 1.0) * power * dr + 1.0;
        
        z = zr * vec3(
            sin(theta) * cos(phi),
            sin(theta) * sin(phi),
            cos(theta)
        ) + p;
    }
    
    return 0.5 * log(r) * r / dr;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec3 col = vec3(0.0);
    
    for(float layer = 0.0; layer < 4.0; layer++) {
        // Ray marching setup
        vec3 ro = vec3(0.0, 0.0, 2.0 + layer * 0.5);
        vec3 rd = normalize(vec3(uv, -1.0));
        
        // Rotate camera
        float angle = u_time * 0.1 + layer * 1.5;
        ro.xz = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * ro.xz;
        rd.xz = mat2(cos(angle), -sin(angle), sin(angle), cos(angle)) * rd.xz;
        
        vec3 pos = ro;
        float total_dist = 0.0;
        
        // Ray march
        for(int i = 0; i < 32; i++) {
            float power = 3.0 + sin(u_time * 0.3 + layer) * 2.0;
            float dist = mandelbulb(pos, power);
            
            if(abs(dist) < 0.01 || total_dist > 10.0) break;
            
            pos += rd * dist * 0.8;
            total_dist += dist;
            
            // Add glow along ray
            float glow = exp(-dist * 10.0) * exp(-total_dist * 0.5);
            vec3 color = palette(total_dist * 0.1 + u_time * 0.05 + layer * 0.3);
            col += color * glow * 0.05;
        }
    }
    
    fragColor = vec4(col, 1.0);
}
