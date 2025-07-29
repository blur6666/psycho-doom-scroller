console.log('Shader test script loaded');

// Copy the webgl-utils functions we need for testing
function loadShader(gl, shaderSource, shaderType) {
    const shader = gl.createShader(shaderType);
    gl.shaderSource(shader, shaderSource);
    gl.compileShader(shader);

    const compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled) {
        const lastError = gl.getShaderInfoLog(shader);
        console.error(`Error compiling shader: ${lastError}`);
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, shaders) {
    const program = gl.createProgram();
    shaders.forEach(shader => gl.attachShader(program, shader));
    gl.linkProgram(program);

    const linked = gl.getProgramParameter(program, gl.LINK_STATUS);
    if (!linked) {
        const lastError = gl.getProgramInfoLog(program);
        console.error(`Error linking program: ${lastError}`);
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, starting shader test');
    
    const canvas = document.getElementById('glsl-canvas');
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }
    
    const gl = canvas.getContext('webgl2');
    if (!gl) {
        console.error('WebGL2 not supported');
        return;
    }
    
    console.log('WebGL2 context created');
    
    // Get shader sources from script tags
    const vsSource = document.getElementById('vertex-shader')?.textContent;
    const fsSource = document.getElementById('fragment-shader')?.textContent;
    
    if (!vsSource) {
        console.error('Vertex shader script tag not found or empty');
        return;
    }
    
    if (!fsSource) {
        console.error('Fragment shader script tag not found or empty');
        return;
    }
    
    console.log('Shader sources found');
    console.log('Vertex shader length:', vsSource.length);
    console.log('Fragment shader length:', fsSource.length);
    
    // Compile shaders
    const vertexShader = loadShader(gl, vsSource, gl.VERTEX_SHADER);
    if (!vertexShader) {
        console.error('Failed to compile vertex shader');
        return;
    }
    console.log('Vertex shader compiled successfully');
    
    const fragmentShader = loadShader(gl, fsSource, gl.FRAGMENT_SHADER);
    if (!fragmentShader) {
        console.error('Failed to compile fragment shader');
        return;
    }
    console.log('Fragment shader compiled successfully');
    
    // Create program
    const program = createProgram(gl, [vertexShader, fragmentShader]);
    if (!program) {
        console.error('Failed to create shader program');
        return;
    }
    console.log('Shader program created successfully');
    
    gl.useProgram(program);
    
    // Set up geometry
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
         1.0,  1.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    const positionLocation = gl.getAttribLocation(program, "aVertexPosition");
    console.log('Position attribute location:', positionLocation);
    
    if (positionLocation >= 0) {
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    }
    
    // Set up viewport
    canvas.width = 500;
    canvas.height = 500;
    gl.viewport(0, 0, canvas.width, canvas.height);
    
    // Get uniform locations
    const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
    const timeLocation = gl.getUniformLocation(program, "u_time");
    console.log('u_resolution uniform location:', resolutionLocation);
    console.log('u_time uniform location:', timeLocation);
    
    // Render function
    function render(time) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.useProgram(program);
        
        if (resolutionLocation) {
            gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        }
        
        if (timeLocation) {
            gl.uniform1f(timeLocation, (time || performance.now()) / 1000.0);
        }
        
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        
        requestAnimationFrame(render);
    }
    
    console.log('Starting render loop');
    render();
});