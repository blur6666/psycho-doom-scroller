#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec3 palette(float t) {
    vec3 a = vec3(0.8, 0.5, 0.4);
    vec3 b = vec3(0.2, 0.4, 0.2);
    vec3 c = vec3(2.0, 1.0, 1.0);
    vec3 d = vec3(0.0, 0.25, 0.25);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    
    // Warp space
    uv.x += sin(uv.y * 10.0 + u_time) * 0.1;
    uv.y += cos(uv.x * 12.0 + u_time * 1.2) * 0.1;

    // Create grid
    vec2 grid_uv = fract(uv * 10.0);
    float grid = min(grid_uv.x, grid_uv.y);
    grid = step(0.05, grid);

    // Create another rotated grid
    mat2 rot = mat2(cos(0.785), -sin(0.785), sin(0.785), cos(0.785));
    vec2 rotated_uv = rot * uv;
    rotated_uv.x += sin(rotated_uv.y * 8.0 - u_time * 1.5) * 0.15;
    vec2 grid_uv2 = fract(rotated_uv * 12.0);
    float grid2 = min(grid_uv2.x, grid_uv2.y);
    grid2 = step(0.05, grid2);

    float final_grid = 1.0 - min(grid, grid2);
    vec3 color = palette(length(uv) + u_time * 0.2) * final_grid;

    fragColor = vec4(color, 1.0);
}
