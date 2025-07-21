

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) 
        return shader;
    console.error(gl.getShaderInfoLog(shader)); 
    gl.deleteShader(shader);
}

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
    return Math.random() * 2 - 1;
}

function render(program) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    
    const coordinates = [
        randomCoord(), randomCoord(),
        randomCoord(), randomCoord(),
        randomCoord(), randomCoord()
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coordinates), gl.STATIC_DRAW);
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


const canvas = document.getElementById('glsl-canvas');
const gl = canvas.getContext('webgl2');

if (!gl) {
    console.error("WebGL not supported!");
    document.body.innerHTML = "Sorry, your browser does not support WebGL.";
}

const vertexShaderSource = document.getElementById('vertex-shader').textContent;
const fragmentShaderSource = document.getElementById('fragment-shader').textContent;

const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
const program = createProgram(gl, vertexShader, fragmentShader);

const intervalId = setInterval(render, 100, program);s
