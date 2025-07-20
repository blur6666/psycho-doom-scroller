precision highp float;


void main(out vec4 O, vec2 C) {
    float i, d, z = fract(dot(C, sin(C))) - 0.5;
    vec4 o, p, q;

    for (vec2 r = iResolution.xy; ++i < 77.0; z += 0.6 * d)
    {
        p = vec4(z * normalize(vec3(C - 0.5 * r, r.y)), 0.1 * iTime);
        p.z += iTime;
        O = p;

        p.xy *= mat2(cos(2.0 + O.z + vecs 33, 0)));

        O = (1.0 + sin(0.5 * O.z + length(p - O) + vec4(0, 4, 3, 6))) /
            (0.5 + 2.0 * dot(O.xy, O.xy));

        p = abs(fract(p) - 0.5);
        d = abs(min(length(p.xy) - 0.125, min(p.x, p.y) + 1e-3)) + 1e-3;
        o += O.w / d * O;
    }

    q = O = tanh(o / 2e4);
}