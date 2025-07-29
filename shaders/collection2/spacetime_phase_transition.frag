#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

// Unique Palette: Cool and ordered to hot and chaotic
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = mix(vec3(1.0, 2.0, 4.0), vec3(1.0, 0.7, 0.4), smoothstep(0.0, 1.0, sin(u_time*0.1)));
    vec3 d = vec3(0.0, 0.15, 0.20);
    return a + b * cos(6.28318 * (c * t + d));
}

// Euclidean distance metric (our starting "space")
float dist_euclidean(vec2 p1, vec2 p2) {
    return length(p1 - p2);
}

// Hyperbolic distance metric (our target "space")
// (Poincare disk model)
float dist_hyperbolic(vec2 p1, vec2 p2) {
    float p1_len_sq = dot(p1, p1);
    float p2_len_sq = dot(p2, p2);
    return acosh(1.0 + 2.0 * dot(p1 - p2, p1 - p2) / ((1.0 - p1_len_sq) * (1.0 - p2_len_sq)));
}

// A standard grid pattern
float grid(vec2 p, float cell_size) {
    vec2 grid_uv = fract(p / cell_size);
    float d = min(grid_uv.x, grid_uv.y);
    return smoothstep(0.0, 0.05, d);
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;

    // The phase transition is controlled by time
    // t_param goes from 0 (Euclidean) to 1 (Hyperbolic) over a cycle
    float t_param = smoothstep(0.0, 1.0, 0.5 + 0.5 * sin(u_time * 0.1 - 1.57));

    // We can't actually change the space, so we simulate it by
    // transforming the coordinates *before* applying a pattern.
    // This transform simulates moving from one metric to another.
    vec2 transformed_uv = uv;

    // As t_param increases, push points away from the center, simulating hyperbolic space
    float len = length(uv);
    transformed_uv = uv / (1.0 + len) * (1.0 + len * t_param); // Simple approximation
    
    // A more direct distance calculation for a central pattern
    float dist_from_center;
    if (length(uv) < 0.999) { // Avoid singularity in hyperbolic calc
        dist_from_center = mix(
            dist_euclidean(uv, vec2(0.0)),
            dist_hyperbolic(uv, vec2(0.0)) * 0.2, // scale for visual appeal
            t_param
        );
    } else {
        dist_from_center = 10.0;
    }

    // A pattern that gets distorted by the changing metric
    float pattern = sin(dist_from_center * 20.0 - u_time);
    
    // A background grid to visualize the coordinate distortion
    pattern += grid(transformed_uv * 2.0, 0.2);

    vec3 color = palette(pattern + t_param * 0.5);

    // Fade to black at the edge of the Poincare disk
    color *= smoothstep(1.0, 0.9, length(uv));

    fragColor = vec4(color, 1.0);
}
