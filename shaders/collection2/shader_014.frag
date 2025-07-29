#version 300 es
precision mediump float;
uniform vec2 u_resolution;
uniform vec2 u_mouse;
uniform float u_time;
out vec4 fragColor;

vec2 rotate(vec2 v, float a) {
    float s = sin(a);
    float c = cos(a);
    mat2 m = mat2(c, -s, s, c);
    return m * v;
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    
    vec3 color = vec3(0.0);
    
    for (float i = 0.0; i < 8.0; i++) {
        vec2 p = rotate(uv, u_time * 0.1 + i * 0.5);
        p = abs(p) - 0.5;
        p = rotate(p, u_time * 0.2 + i);
        
        float d = min(abs(p.x), abs(p.y));
        d = abs(sin(d * 20.0 + u_time + i)) * 0.05;
        d = 0.01 / d;
        
        vec3 layerColor = vec3(
            sin(i + u_time) * 0.5 + 0.5,
            sin(i + u_time + 2.0) * 0.5 + 0.5,
            sin(i + u_time + 4.0) * 0.5 + 0.5
        );
        
        color += layerColor * d * 0.1;
    }
    
    fragColor = vec4(color, 1.0);
}
