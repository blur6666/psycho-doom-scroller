// --- WebGL Boilerplate & Setup ---
const canvas = document.getElementById('glsl-canvas');
const gl = canvas.getContext('webgl2');

if (!gl) {
    console.error("WebGL not supported!");
    document.body.innerHTML = "Sorry, your browser does not support WebGL.";
}

// --- Create and Compile Shader ---
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) 
        return shader;
    console.error(gl.getShaderInfoLog(shader)); 
    gl.deleteShader(shader);
}


// --- Create program, attach and link shaders---
function createProgram(gl, vertexShader, fragmentShader) {
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    gl.useProgram(program);
    if (gl.getProgramParameter(program, gl.LINK_STATUS)) 
        return program;
    console.error(gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
}

function randomCoord() {
    return Math.random() * 2 - 1; // from -1 to 1
}


function render(program) {
    // allocate memory to gpu
    const buffer = gl.createBuffer();
    // bind this memory to a channel
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    // use this channel to send data to the GPU (our triangle coordinates)
    
    const coordinates = [
        randomCoord(), randomCoord(),
        randomCoord(), randomCoord(),
        randomCoord(), randomCoord()
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coordinates), gl.STATIC_DRAW);
    // desallocate memory after send data to avoid memory leak issues
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.vertexAttribPointer(
        position, // Location of the vertex attribute
        2, // Dimension - 2D
        gl.FLOAT, // Type of data we are going to send to GPU
        gl.FALSE, // If data should be normalized
        0, // Stride
        0 // Offset
    );

    gl.drawArrays(
        gl.TRIANGLES, // Type of primitive
        0, // Start index in the array of vector points
        3 // Number of indices to be rendered
    );
}


function main() {
    const vertexShaderSource = document.getElementById('vertex-shader').textContent;
    const fragmentShaderSource = document.getElementById('fragment-shader').textContent;

    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    const program = createProgram(gl, vertexShader, fragmentShader);

    const intervalId = setInterval(render, 100, program);
}

main();
