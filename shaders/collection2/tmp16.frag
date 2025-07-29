#version 300 es
precision mediump float;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x*b.x - a.y*b.y, a.x*b.y + a.y*b.x);
}

vec3 flame(vec2 p, float t) {
    vec2 z = p;
    vec3 col = vec3(0.0);
    
    for(int i = 0; i < 12; i++) {
        float fi = float(i);
        z = cmul(z, z) + p;
        
        float mag = dot(z, z);
        if(mag > 4.0) break;
        
        float wave = sin(mag * 5.0 - t * 2.0 + fi);
        vec3 hue = vec3(
            0.5 + 0.5 * sin(fi * 0.4 + t + mag),
            0.5 + 0.5 * sin(fi * 0.5 - t * 0.7 + mag * 1.5),
            0.5 + 0.5 * sin(fi * 0.3 + t * 0.5 - mag * 0.5)
        );
        
        col += hue * exp(-mag) * abs(wave) * 0.1;
    }
    
    return col;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    float t = u_time * 0.4;
    
    vec3 finalColor = vec3(0.0);
    
    for(float j = 0.0; j < 5.0; j++) {
        vec2 p = uv * (1.5 + j * 0.3);
        p += vec2(sin(t * 0.3 + j), cos(t * 0.2 - j)) * 0.2;
        
        vec3 f = flame(p, t + j * 2.0);
        finalColor += f * (1.0 - j * 0.15);
    }
    
    finalColor = pow(finalColor * 0.5, vec3(0.8));
    finalColor = mix(finalColor, vec3(dot(finalColor, vec3(0.3, 0.6, 0.1))), -0.5);
    
    fragColor = vec4(finalColor, 1.0);
}