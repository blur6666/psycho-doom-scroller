#version 300 es
precision highp float;

uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

// Complex number operations
vec2 cmul(vec2 a, vec2 b) {
    return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x);
}

float cmod(vec2 z) {
    return sqrt(z.x * z.x + z.y * z.y);
}

// Smooth coloring function based on orbit iterations
vec3 colorBands(float t, float iteration, float totalIterations) {
    // Adjust hue based on iteration count and time
    float hue = fract(t * 0.1 + iteration / totalIterations * 3.0);
    
    // Create bands with different saturation and value
    float saturation = 0.8 + 0.2 * sin(iteration * 0.1 + u_time);
    float value = 0.8 + 0.2 * cos(iteration * 0.3 - u_time * 0.5);
    
    // Convert HSV to RGB
    vec3 rgb;
    float h = fract(hue) * 6.0;
    float f = fract(h);
    float p = value * (1.0 - saturation);
    float q = value * (1.0 - saturation * f);
    float tValue = value * (1.0 - saturation * (1.0 - f)); // Renamed from 't' to 'tValue'
    
    if (h < 1.0) rgb = vec3(value, tValue, p);
    else if (h < 2.0) rgb = vec3(q, value, p);
    else if (h < 3.0) rgb = vec3(p, value, tValue);
    else if (h < 4.0) rgb = vec3(p, q, value);
    else if (h < 5.0) rgb = vec3(tValue, p, value);
    else rgb = vec3(value, p, q);
    
    return rgb;
}

// Mandelbrot set calculation with smooth coloring
vec3 mandelbrot(vec2 c, float zoom, vec2 offset) {
    // Maximum iterations (higher for more detail)
    const int MAX_ITER = 300;
    
    // Escape radius (squared)
    const float ESCAPE_RADIUS_SQ = 256.0;
    
    // Initialize values
    vec2 z = vec2(0.0);
    float iter = 0.0;
    
    // Record the closest we get to the origin (for interior coloring)
    float minDist = 1e10;
    float lastLength = 0.0;
    
    // Main iteration loop
    for (int i = 0; i < MAX_ITER; i++) {
        // Update minimum distance to origin
        minDist = min(minDist, cmod(z));
        
        // z = z² + c
        z = cmul(z, z) + c;
        
        // Record length before potential escape
        lastLength = cmod(z);
        
        // Check for escape
        if (lastLength > ESCAPE_RADIUS_SQ) {
            // Smooth iteration count for better coloring
            float smoothIter = float(i) - log2(log2(lastLength)) + 4.0;
            
            // Normalize iteration count
            float normalizedIter = smoothIter / float(MAX_ITER);
            
            // Create different color bands based on iteration count
            vec3 color1 = colorBands(u_time * 0.1, smoothIter, float(MAX_ITER));
            vec3 color2 = colorBands(u_time * 0.1 + 0.5, smoothIter, float(MAX_ITER));
            
            // Mix colors based on a sine wave for animated bands
            float mixFactor = sin(normalizedIter * 20.0 + u_time) * 0.5 + 0.5;
            vec3 color = mix(color1, color2, mixFactor);
            
            // Add brightness pulsing
            float pulse = 0.8 + 0.2 * sin(u_time * 2.0 + normalizedIter * 10.0);
            color *= pulse;
            
            return color;
        }
        
        iter += 1.0;
    }
    
    // Interior coloring based on minimum distance to origin
    // This creates intricate patterns in the "black" areas
    float interiorDetail = sin(minDist * 100.0 + u_time) * 0.5 + 0.5;
    vec3 interiorColor = vec3(0.05, 0.05, 0.1) + 
                         vec3(0.1, 0.2, 0.3) * interiorDetail;
    
    // Add subtle pulsing to interior
    float interiorPulse = 0.8 + 0.2 * sin(u_time + minDist * 20.0);
    return interiorColor * interiorPulse;
}

void main() {
    // Normalized pixel coordinates with aspect ratio correction
    vec2 uv = (gl_FragCoord.xy - 0.5 * u_resolution.xy) / min(u_resolution.x, u_resolution.y);
    
    // Animation parameters
    float t = u_time * 0.1;
    
    // Dynamic zoom level with smooth oscillation
    float zoom = 2.5 * (1.0 + 0.3 * sin(t * 0.5));
    
    // Offset for panning, creates a slow orbit around interesting features
    vec2 offset = vec2(
        -0.75 + 0.1 * sin(t * 0.7),
        0.1 * cos(t * 0.5)
    );
    
    // Scale and offset coordinates
    vec2 c = uv * zoom + offset;
    
    // Calculate Mandelbrot set with coloring
    vec3 color = mandelbrot(c, zoom, offset);
    
    // Add vignette effect
    float vignette = 1.0 - smoothstep(0.4, 1.4, length(uv));
    color *= vignette;
    
    // Gamma correction
    color = pow(color, vec3(0.9));
    
    // Output final color
    fragColor = vec4(color, 1.0);
}
