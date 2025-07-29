#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    return 0.5 + 0.5*cos(6.28* (t*vec3(1,0.9,0.8) + vec3(0.,0.1,0.2)));
}

void main() {
    vec2 uv = (gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);
    
    // The Abacus Grid
    vec2 grid_uv = floor(uv * 5.0 + u_time);
    uv = fract(uv * 5.0 + u_time) - 0.5;

    for (float i = 0.0; i < 3.0; i++) {
        uv = fract(uv*1.5)-0.5;
        float d = length(uv) * exp(-length(uv0));
        vec3 color = palette(length(grid_uv) + length(uv0) + i*0.4 + u_time*0.1);
        d = sin(d*8. + u_time)/8.;
        d = abs(d);
        d = pow(0.01 / d, 1.2);
        finalColor += color * d;
    }
    fragColor = vec4(finalColor, 1.0);
}
