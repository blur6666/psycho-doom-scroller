let canvas, gl, vsSource, fsSource, shaderProgram, currentIndex, manifest, animationFrameId;

const webglUtils = require('webgl-utils.js');


init().then(()=>{
    setTimeout(render, 100);
})

async function init() {
    canvas = document.getElementById('glsl-canvas');
    gl = canvas.getContext("webgl2");
    if (!gl) {
        alert("Unable to initialize WebGL2. Your browser or machine may not support it.");
        return;
    }

    currentIndex = 0;
    manifest = await fetchShaderManifest();
    vsSource = document.getElementById('vertex-shader').textContent;   // Vertex shader source from static HTML
    fsSource = await fetchShaderSource('fragment.glsl');                // default startup shader
    shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    if (!shaderProgram) {
        console.log('successfully loaded program');
    }
    else {
        alert('shader program failed');
        return;
    }
    initBuffer();

    // animationFrameId = null;

    window.addEventListener('resize', resizeCanvas);

    // Navigation: scroll down = next, scroll up = previous
    // window.addEventListener('wheel', (e) => {
    //   if (e.deltaY > 0) {
    //     currentIndex = (currentIndex + 1) % manifest.length;
    //     loadShader(currentIndex);
    //   } else if (e.deltaY < 0) {
    //     currentIndex = (currentIndex - 1 + manifest.length) % manifest.length;
    //     loadShader(currentIndex);
    //   }
    // });

    // // Initial load
    // await loadShader(currentIndex);

}


async function fetchShaderManifest() {
    const res = await fetch('/api/shaders/manifest');
    if (!res.ok) throw new Error('Failed to fetch shader manifest');
    return await res.json();
}

async function fetchShaderSource(id) {
    const res = await fetch(`/api/shaders/${encodeURIComponent(id)}`);
    if (!res.ok)
        throw new Error('Failed to fetch shader source');
    return await res.text();
}

function resizeCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);
}

async function reloadShader(index) {
    const nextShader = manifest[index];
    if (!nextShader)
        return;
    fsSource = await fetchShaderSource(nextShader.id);

    // Remove any previous fragment shader script tag
    // const oldFrag = document.getElementById('fragment-shader');
    // if (oldFrag) oldFrag.remove();

    // Dynamically create a fragment shader script tag for debugging/inspection
    // const fragScript = document.createElement('script');
    // fragScript.id = 'fragment-shader';
    // fragScript.type = 'x-shader/x-fragment';
    // fragScript.textContent = fsSource;
    // document.head.appendChild(fragScript);

    // Compile and use shader
    shaderProgram = initShaderProgram(gl, vsSource, fsSource);
    if (!shaderProgram) {
        console.log('11successfully loaded program');
    }
    else {
        alert('11shader program failed');
        return;
    }

    initBuffer();
    // resizeCanvas();
    // render();
}

function initBuffer() {
    // Set up a simple buffer for a fullscreen quad
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
        -1.0, -1.0,
        1.0, -1.0,
        -1.0, 1.0,
        1.0, 1.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(shaderProgram, "a_position");
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Cancel previous animation frame if any
    // if (animationFrameId) cancelAnimationFrame(animationFrameId);
}


function render(time) {
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(shaderProgram);
    const resolutionLocation = gl.getUniformLocation(shaderProgram, "u_resolution");
    if (resolutionLocation) {
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    }
    const timeLocation = gl.getUniformLocation(shaderProgram, "u_time");
    if (timeLocation) {
        gl.uniform1f(timeLocation, (time || performance.now()) / 1000.0);
    }
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    // animationFrameId = requestAnimationFrame(render);
}
    

// Shader utils (same as before)
function initShaderProgram(gl, vsSource, fsSource) {
    const vertexShader = initShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = initShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const shaderProgram = gl.createProgram();
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);
    gl.useProgram(shaderProgram);
    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        alert(`Unable to initialize the shader program: ${gl.getProgramInfoLog(shaderProgram)}`);
        return null;
    }
    return shaderProgram;
}

function initShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        alert(`An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`);
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}
