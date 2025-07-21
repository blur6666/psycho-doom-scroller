precision highp float;

uniform float u_time;

uniform vec2 u_resolution;


void main() {
    float i = 0.0, d, z;
    vec4 o = vec4(0.0), p, O, q;
    vec2 C = gl_FragCoord.xy;
    vec2 r = u_resolution.xy;

    z = fract(dot(C, sin(C))) - 0.5;

    for (i = 0.0; i < 77.0; i++, z += 0.6 * d)
    {
        p = vec4(z * normalize(vec3(C - 0.5 * r, r.y)), 0.1 * u_time);
        p.z += u_time;
        O = p;

        p.xy *= mat2(cos(2.0 + O.z), -sin(2.0 + O.z), sin(2.0 + O.z), cos(2.0 + O.z));

        O = (1.0 + sin(0.5 * O.z + length(p - O) + vec4(0, 4, 3, 6))) /
            (0.5 + 2.0 * dot(O.xy, O.xy));

        p = abs(fract(p) - 0.5);
        d = abs(min(length(p.xy) - 0.125, min(p.x, p.y) + 1e-3)) + 1e-3;
        o += O.w / d * O;
    }

    q = O = tanh(o / 2e4);
    gl_FragColor = O;
}