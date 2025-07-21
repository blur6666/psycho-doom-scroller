precision highp float;

uniform float u_time;

uniform vec2 u_resolution;


void main() {
    float i = 0.0, d, z;
    vec4 accum = vec4(0.0), p, color, temp;
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 res = u_resolution.xy;

    z = fract(dot(fragCoord, sin(fragCoord))) - 0.5;

    for (i = 0.0; i < 3.0; i++, z += 0.6 * d)
    {
        p = vec4(z * normalize(vec3(fragCoord - 0.5 * res, res.y)), 0.1 * u_time);
        p.z += u_time;
        color = p;

        p.xy *= mat2(cos(2.0 + color.z), -sin(2.0 + color.z), sin(2.0 + color.z), cos(2.0 + color.z));

        color = (1.0 + sin(0.5 * color.z + length(p - color) + vec4(0, 4, 3, 6))) /
            (0.5 + 2.0 * dot(color.xy, color.xy));

        p = abs(fract(p) - 0.5);
        d = abs(min(length(p.xy) - 0.125, min(p.x, p.y) + 1e-3)) + 1e-3;
        accum += color.w / d * color;
    }

    temp = color = tanh(accum / 2e4);
    if(any(isnan(O)) || any(isinf(O))) O = vec4(1,0,1,1);
    gl_FragColor = color;
}