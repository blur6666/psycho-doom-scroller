precision highp float;

uniform vec2 u_resolution;
uniform float u_time;

uniform float u_time_speed;
uniform float u_warp_intensity;
uniform float u_saturation;
uniform float u_brightness_mult;
uniform float u_vignette_intensity;

vec3 hsb2rgb(vec3 c) {
    vec3 rgb = clamp(abs(mod(c.x*6.0+vec3(0.0,4.0,2.0), 6.0)-3.0)-1.0, 0.0, 1.0);
    rgb = rgb*rgb*(3.0-2.0*rgb);
    return c.z * mix(vec3(1.0), rgb, c.y);
}

// 2D Random function
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

// 2D Noise function (Value Noise)
float noise(vec2 st) {
    vec2 i = floor(st);
    vec2 f = fract(st);
    float a = random(i);
    float b = random(i + vec2(1.0, 0.0));
    float c = random(i + vec2(0.0, 1.0));
    float d = random(i + vec2(1.0, 1.0));
    vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

// Fractal Brownian Motion (fbm) - sums up layers of noise
float fbm(vec2 st) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 6; i++) {
        value += amplitude * noise(st); 
        st *= 2.0;
        amplitude *= 0.5;
    }
    return value;
}

void main() {
    // Normalize coordinates and center them
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

    // --- DOMAIN WARPING ---
    // We use noise to distort the coordinate space itself.
    vec2 q = vec2(fbm(uv + u_time * 0.1 * u_time_speed), fbm(uv + vec2(5.2, 1.3)));
    vec2 r = vec2(fbm(uv + q * u_warp_intensity + u_time * 0.5 * u_time_speed), fbm(uv + q * u_warp_intensity + vec2(1.7, 9.2)));
    
    // --- KALEIDOSCOPIC EFFECT ---
    r = abs(r);
    r = 0.5 - r;

    // --- FINAL PATTERN GENERATION ---
    float final_pattern = fbm(uv + r * 2.0 + sin(u_time * 0.2 * u_time_speed) * 0.1);

    // --- COLORING ---
    float hue = final_pattern + u_time * 0.05 * u_time_speed;
    float saturation = u_saturation;
    float brightness = pow(final_pattern, 1.5) * u_brightness_mult;

    vec3 color = hsb2rgb(vec3(hue, saturation, brightness));

    // --- VIGNETTE ---
    float vignette = length(uv * u_vignette_intensity);
    color *= 1.0 - vignette * 0.5;

    gl_FragColor = vec4(color, 1.0);
}