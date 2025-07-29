#version 300 es
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec2 rotate(vec2 p, float a) {
    float c = cos(a);
    float s = sin(a);
    return vec2(c*p.x - s*p.y, s*p.x + c*p.y);
}

float fractal(vec2 p, float t) {
    float acc = 0.0;
    float prev = 0.0;
    float tw = 0.0;
    for(int i = 0; i < 8; i++) {
        float fi = float(i);
        p = abs(p) / dot(p, p) - 1.2;
        p = rotate(p, t * 0.1 + fi * 0.15);
        float l = dot(p, p);
        acc += abs(l - prev) / (1.0 + l);
        prev = l;
        tw += 0.5 / (0.5 + pow(l, 2.0));
    }
    return max(abs(acc - 0.5) * tw, 0.0);
}

vec3 plasma(vec2 p, float t) {
    vec3 col = vec3(0.0);
    for(float i = 0.0; i < 3.0; i++) {
        vec2 q = p;
        q = rotate(q, t * 0.3 + i * 2.094);
        q *= 1.0 + sin(t * 0.2 + i) * 0.3;
        
        float f = fractal(q, t + i * 1.57);
        f = pow(f, 0.5 + sin(t * 0.1 + i) * 0.2);
        
        vec3 layer = vec3(0.0);
        layer.r = sin(f * 8.0 + t * 0.5 + i * 0.5) * 0.5 + 0.5;
        layer.g = sin(f * 6.0 - t * 0.3 + i * 1.2) * 0.5 + 0.5;
        layer.b = sin(f * 7.0 + t * 0.4 - i * 0.8) * 0.5 + 0.5;
        
        layer *= exp(-f * 0.5);
        layer = pow(layer, vec3(1.5 - i * 0.2));
        
        col += layer;
    }
    return col;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec2 uv0 = uv;
    
    float t = u_time * 0.5;
    vec3 finalColor = vec3(0.0);
    
    for(float j = 0.0; j < 6.0; j++) {
        vec2 p = uv;
        
        // Domain warping
        p += vec2(sin(p.y * 3.0 + t + j), cos(p.x * 3.0 - t * 0.7)) * 0.2;
        p = rotate(p, t * 0.2 + j * 0.52);
        
        // Kaleidoscope effect
        float angle = atan(p.y, p.x);
        float r = length(p);
        angle = mod(angle + t * 0.1, 3.14159 / 3.0) - 3.14159 / 6.0;
        p = vec2(cos(angle), sin(angle)) * r;
        
        // Fractal distortion
        vec3 plsm = plasma(p * (2.0 + j * 0.5), t + j * 2.0);
        
        // Additional oscillations
        float osc = sin(r * 10.0 - t * 2.0 + j) * cos(angle * 8.0 + t);
        osc = pow(abs(osc), 0.3 + sin(t * 0.15) * 0.2);
        
        plsm *= osc * exp(-r * 0.5);
        plsm = pow(plsm, vec3(0.7));
        
        // Color rotation
        float hueShift = t * 0.1 + j * 0.3 + length(uv0) * 0.5;
        plsm = mix(plsm, plsm.zxy, sin(hueShift) * 0.5 + 0.5);
        plsm = mix(plsm, plsm.yzx, cos(hueShift * 1.3) * 0.5 + 0.5);
        
        finalColor += plsm * (1.0 - j * 0.15);
    }
    
    // Post processing
    finalColor = pow(finalColor * 0.4, vec3(0.9));
    finalColor = mix(finalColor, smoothstep(0.0, 1.0, finalColor), 0.3);
    
    // Chromatic aberration
    float ca = length(uv0) * 0.02;
    finalColor.r *= 1.0 + ca;
    finalColor.b *= 1.0 - ca;
    
    fragColor = vec4(finalColor, 1.0);
}