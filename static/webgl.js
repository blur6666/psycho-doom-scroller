import webglUtils from './webgl-utils.js';

let canvas, gl, vsSource, fsSource, program, currentIndex, manifest, animationFrameId;

(async function init() {
    canvas = document.getElementById('glsl-canvas');
    gl = canvas.getContext("webgl2");
    if (!gl)
        console.error("failed to load canvas or webgl2");
        
    animationFrameId = null;
    currentIndex = 0;
    manifest = await webglUtils.fetchShaderManifest();
    vsSource = document.getElementById('vertex-shader').textContent;   // Vertex shader source from static HTML
    fsSource = document.getElementById('fragment-shader').textContent;
    //fsSource = await webglUtils.fetchShaderSource('fragment.glsl');               // default startup shader
    
    // Remove any previous fragment shader script tag
    const oldFrag = document.getElementById('fragment-shader');
    if (oldFrag) oldFrag.remove();

    const fragScript = document.createElement('script');
    fragScript.id = 'fragment-shader';
    fragScript.type = 'x-shader/x-fragment';
    fragScript.textContent = fsSource;
    document.head.appendChild(fragScript);

    // START THIS SHIT
    program = webglUtils.createProgramFromScripts(gl, ['vertex-shader', 'fragment-shader']);
    gl.useProgram(program);

    
    // Set up a simple buffer for a fullscreen quad
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
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    webglUtils.resizeCanvasToDisplaySize(canvas);
    render();
    
    function render(time) {
        gl.clearColor(0.0, 0.0, 0.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(program);
        const resolutionLocation = gl.getUniformLocation(program, "u_resolution");
        if (resolutionLocation) {
            gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
        }
        const timeLocation = gl.getUniformLocation(program, "u_time");
        if (timeLocation) {
            gl.uniform1f(timeLocation, (time || performance.now()) / 1000.0);
        }
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
        requestAnimationFrame(render);
    }
})();


