#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec2 hash22(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
}

float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    
    return mix(mix(dot(hash22(i + vec2(0,0)), f - vec2(0,0)),
                   dot(hash22(i + vec2(1,0)), f - vec2(1,0)), u.x),
               mix(dot(hash22(i + vec2(0,1)), f - vec2(0,1)),
                   dot(hash22(i + vec2(1,1)), f - vec2(1,1)), u.x), u.y);
}

vec2 curl(vec2 p) {
    float eps = 0.1;
    float n1 = noise(p + vec2(eps, 0.0));
    float n2 = noise(p - vec2(eps, 0.0));
    float n3 = noise(p + vec2(0.0, eps));
    float n4 = noise(p - vec2(0.0, eps));
    
    return vec2(n3 - n4, n2 - n1) / (2.0 * eps);
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    
    vec2 p = uv * 3.0;
    vec2 velocity = curl(p + u_time * 0.5);
    
    float turbulence = length(velocity);
    float streamlines = sin(turbulence * 10.0 + u_time * 2.0);
    
    vec3 color = vec3(0.1, 0.3, 0.8) + vec3(0.8, 0.5, 0.1) * abs(streamlines) * turbulence;
    
    fragColor = vec4(color, 1.0);
}


