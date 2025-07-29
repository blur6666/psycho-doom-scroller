#version 300 es
precision mediump float;
uniform vec2 u_resolution;
// uniform vec2 u_mouse;
vec2 u_mouse = vec2(0.0, 0.0);
uniform float u_time;
out vec4 fragColor;

vec2 complex_mul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    vec2 c = uv;
    vec2 z = vec2(0.0);
    
    float iterations = 0.0;
    for (float i = 0.0; i < 100.0; i++) {
        if (length(z) > 2.0) break;
        z = complex_mul(z, z) + c + vec2(sin(u_time * 0.3), cos(u_time * 0.2)) * 0.3;
        iterations = i;
    }
    
    float t = iterations / 100.0;
    vec3 color = vec3(
        sin(t * 6.28 + u_time),
        sin(t * 6.28 + u_time + 2.0),
        sin(t * 6.28 + u_time + 4.0)
    ) * 0.5 + 0.5;
    
    fragColor = vec4(color, 1.0);
}
