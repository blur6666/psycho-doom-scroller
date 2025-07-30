#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

// Polygon SDF - returns distance to a regular polygon with N sides
float sdPolygon(vec2 p, float radius, int sides, float rotation) {
    // Angle in radians
    float angle = atan(p.y, p.x) + rotation;
    // Length of the vector
    float len = length(p);
    
    // Angle of each section of the polygon
    float sectionAngle = 2.0 * 3.14159 / float(sides);
    
    // Distance to the closest edge
    return len * cos(mod(angle, sectionAngle) - 0.5 * sectionAngle) - radius;
}

// Vibrant color palette function
vec3 palette(float t) {
    vec3 a = vec3(0.5, 0.5, 0.5);
    vec3 b = vec3(0.5, 0.5, 0.5);
    vec3 c = vec3(1.0, 1.0, 0.5);
    vec3 d = vec3(0.80, 0.20, 0.20);
    return a + b * cos(6.28318 * (c * t + d));
}

void main() {
    // Normalized, aspect-corrected coordinates
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    
    // Scale to create a denser pattern
    uv *= 4.0;
    
    // Create hexagonal grid using modulo arithmetic
    vec2 hexCoord = vec2(uv.x + 0.5 * mod(floor(uv.y), 2.0), uv.y);
    vec2 cell = floor(hexCoord);
    vec2 localCoord = fract(hexCoord) - 0.5;
    
    // Animate the rotation of each hexagon
    float t = u_time * 0.2;
    float rot = t + cell.x * 0.1 + cell.y * 0.1;
    
    // Size of hexagon, oscillating with time
    float size = 0.4 + 0.1 * sin(t * 0.5 + length(cell));
    
    // Distance from point to hexagon
    float d = sdPolygon(localCoord, size, 6, rot);
    
    // Adjust line width with time
    float lineWidth = 0.05 + 0.02 * sin(t + cell.y);
    
    // Create sharp lines
    float line = smoothstep(lineWidth, lineWidth - 0.01, abs(d));
    
    // Add inner hexagon
    float d2 = sdPolygon(localCoord, size * 0.7, 6, -rot * 0.7);
    float line2 = smoothstep(lineWidth * 0.7, lineWidth * 0.7 - 0.01, abs(d2));
    
    // Create color based on cell position and time
    vec3 color = palette(length(cell) * 0.1 + t * 0.2);
    
    // Mix inner and outer hexagons
    float pattern = line * 0.8 + line2 * 0.6;
    
    // Combine everything
    vec3 finalColor = color * pattern;
    
    // Add subtle background
    finalColor += palette(length(uv) * 0.05 - t * 0.1) * 0.1;
    
    // Output final color
    fragColor = vec4(finalColor, 1.0);
}