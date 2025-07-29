#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {return 0.5+0.5*cos(t*6.28+vec3(0,1,2));}

void main() {
    vec2 uv = (gl_FragCoord.xy*2.0-u_resolution.xy)/u_resolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0);
    
    float r = length(uv0);
    // Each ring has a different time scale. floor() creates the hard fracture.
    float time_scale = 1.0 + floor(r*3.0) * 2.0 + sin(u_time)*floor(r*5.0);
    float t = u_time * time_scale;

    for (float i=0.0; i<4.0; i++) {
        uv = fract(uv*1.5)-0.5;
        float d = length(uv) * exp(-r);
        vec3 color = palette(r + i*0.4 + t*0.1);
        d = sin(d*8. + t)/8.;
        d = abs(d);
        d = pow(0.01 / d, 1.2);
        finalColor += color*d;
    }
    fragColor = vec4(finalColor, 1.0);
}
