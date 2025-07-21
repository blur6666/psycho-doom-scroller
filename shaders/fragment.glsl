#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
// out vec4 gl_FragColor;

vec3 pallete(float t) {
    vec3 a = vec3(0.5f, 0.5f, 0.5f);
    vec3 b = vec3(0.5f, 0.5f, 0.5f);
    vec3 c = vec3(1.0f, 1.0f, 1.0f);
    vec3 d = vec3(0.263f, 0.416f, 0.557f);

    return a+b*cos(6.28f*(c*t*d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy*2.0f-u_resolution.xy)/u_resolution.y;
    vec2 uv0 = uv;
    vec3 finalColor = vec3(0.0f);

    for (float i = 0.0f; i<4.0f; i++) {
        uv = fract(uv*1.5f)-0.5f;

        float d = length(uv)*exp(-length(uv0));
        d = sin(d*8.f+u_time)/8.f;
        d = abs(d);
        d = pow(0.01f/d, 1.2f);

        vec3 color = pallete(length(uv0)+i*.4f+u_time*0.4f);

        finalColor += color*d;
    }

    gl_FragColor = vec4(finalColor, 1.0f);
}