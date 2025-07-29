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
    fsSource = await webglUtils.fetchShaderSource('fragment.glsl');               // default startup shader
    
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
    // webglUtils.initBuffer(gl, program, animationFrameId);

    // window.addEventListener('resize', webglUtils.resizeCanvasToDisplaySize);


    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

    gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([0.0, 0.8,-0.8, -0.8, 0.8, -0.8]),
        gl.STATIC_DRAW);

    const vertexCoord = gl.getAttribLocation(program, "vertexCoord");
    gl.vertexAttribPointer(vertexCoord, 2, gl.FLOAT, false, 0, 0);

    
    function render(time) {
        time *= 0.001;
        webglUtils.resizeCanvasToDisplaySize(canvas); 
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);


        gl.clearColor(1.0, 1.0 ,1.0, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);

        gl.useProgram(program);


        gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    render();
})();


