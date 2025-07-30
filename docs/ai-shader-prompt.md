# Master Prompt: Generate 10 Unique GLSL Fragment Shaders

You are an expert in GLSL. Your one and only task is to generate the complete GLSL source code for 10 distinct, complex, and visually interesting fragment shaders.

### **Creative & Technical Toolbox for Shader Generation**

You must generate 10 highly diverse shaders by creatively combining the following concepts in your code. This toolbox is for inspiration and guidance, not for generating descriptive text.

*   **Aesthetic & Thematic Goals (Strive for variety across these):**
    *   **Psychedelic & Visionary:** Abstract, mesmerizing visuals, evocative of altered states.
    *   **Geometric & Architectural:** Structured, ordered patterns with symmetry, grids, and mandala-like forms.
    *   **Organic & Natural:** Mimicking patterns from nature like clouds, fire, turbulence, or biological cells.
    *   **Sci-Fi & Mathematical:** Visualizing complex math, fractals, higher-dimensional projections, or futuristic "glitch" art.

*   **Core Algorithmic Pillars (Mix and match these):**
    *   **Domain Repetition/Folding:** Create kaleidoscopic and fractal patterns using `fract()` or `abs()`.
    *   **Procedural Noise:** Use Simplex/Value noise for organic textures, or Curl noise for fluid-like vector fields.
    *   **Escape-Time Fractals:** Generate classic Julia/Mandelbrot sets by iterating a formula.
    *   **SDF & Ray Marching:** Render true 3D scenes and complex geometries.

*   **Key Foundational Techniques (Incorporate these for complexity):**
    *   **Coordinate Manipulation:** Use Polar coordinates for swirls, Log-Polar for tunnels, or warp the domain with noise for fluid motion.
    *   **Multi-Layering:** Create depth by drawing a pattern multiple times with slight variations (parallax).
    *   **"Filament & Glow" Effect:** Use the `pow(epsilon / d, power)` formula to create bright, glowing lines from any distance field.
    *   **Parameter Animation:** Animate the core parameters of an algorithm over time (e.g., a fractal's `power` or a Julia set's `c` value) to create living, evolving visuals.

### **Output Format**

*   The **only** acceptable output is a single, raw text block containing the complete GLSL code for all 10 shaders.
*   Do not include titles, comments, or any other text outside of the shader code itself. The output must be a clean, contiguous block of GLSL code.
*   The shaders must be listed one after another.
*   Each shader must be separated from the next by exactly one single blank line.
*   The very first line of each individual shader *must* be `#version 300 es`. There should be no other text, titles, or descriptions preceding this line for any shader.

### **Technical Constraints**

*   The shader must be written in GLSL for OpenGL ES 3.00, starting with the line `#version 300 es`.
*   The code must be self-contained within a single fragment shader.
*   The only permitted uniform variables are `uniform vec2 u_resolution;` (for screen dimensions) and `uniform float u_time;` (for animation). No other uniforms are allowed.
*   The shader must define a `main()` function as the entry point.
*   The final color output must be assigned to `out vec4 fragColor;`.