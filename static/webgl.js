let canvas, gl, program, animationFrameId;

function createShader(gl, source, type) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error('Shader compile error:', gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
        return null;
    }
    return program;
}

function resizeCanvasToDisplaySize(canvas) {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        return true;
    }
    return false;
}

document.addEventListener('DOMContentLoaded', function() {
    console.log('Starting WebGL application');
    
    canvas = document.getElementById('glsl-canvas');
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }
    
    gl = canvas.getContext('webgl2');
    if (!gl) {
        console.error('WebGL2 not supported');
        return;
    }
    
    console.log('WebGL2 context created');
    
    // Get shaders from script tags
    const vsSource = document.getElementById('vertex-shader')?.textContent;
    const fsSource = document.getElementById('fragment-shader')?.textContent;
    
    if (!vsSource || !fsSource) {
        console.error('Shader sources not found');
        console.log('Available script tags:', document.querySelectorAll('script').length);
        return;
    }
    
    console.log('Shaders found, compiling...');
    console.log('Vertex shader length:', vsSource.length, 'snippet:', vsSource.slice(0, 100));
    console.log('Fragment shader length:', fsSource.length, 'snippet:', fsSource.slice(0, 100));
    
    // Compile shaders
    const vertexShader = createShader(gl, vsSource, gl.VERTEX_SHADER);
    const fragmentShader = createShader(gl, fsSource, gl.FRAGMENT_SHADER);
    
    if (!vertexShader || !fragmentShader) {
        console.error('Shader compilation failed');
        return;
    }
    
    console.log('Shaders compiled successfully');
    
    // Create program
    program = createProgram(gl, vertexShader, fragmentShader);
    if (!program) {
        console.error('Program creation failed');
        return;
    }
    
    console.log('Program created successfully');
    
    gl.useProgram(program);
    
    // Set up vertex buffer
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
        -1.0, -1.0,
         1.0, -1.0,
        -1.0,  1.0,
         1.0,  1.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
    
    // Set up attributes
    const positionLocation = gl.getAttribLocation(program, 'aVertexPosition');
    console.log('Position attribute location:', positionLocation);
    if (positionLocation >= 0) {
        gl.enableVertexAttribArray(positionLocation);
        gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
    }
    
    // Set canvas to fullscreen
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    // Get uniform locations
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    console.log('u_resolution location:', resolutionLocation);
    console.log('u_time location:', timeLocation);
    
    console.log('Starting render loop');
    
    function render(time) {
        resizeCanvasToDisplaySize(canvas);
        gl.viewport(0, 0, canvas.width, canvas.height);
        
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        
        gl.useProgram(program);
        
        // Set uniforms
        if (resolutionLocation) {
            gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        }
        
        if (timeLocation) {
            gl.uniform1f(timeLocation, (time || performance.now()) / 1000.0);
        }
        
        // Draw
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

        // Log WebGL errors if any
        const err = gl.getError();
        if (err !== gl.NO_ERROR) {
            console.error('WebGL error after drawArrays:', err);
        }

        // Log program info log (should be empty if OK)
        const programInfoLog = gl.getProgramInfoLog(program);
        if (programInfoLog) {
            console.warn('Program info log:', programInfoLog);
        }

        animationFrameId = requestAnimationFrame(render);
    }
    
    render();
});
