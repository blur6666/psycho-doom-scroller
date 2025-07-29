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

function initBuffer(gl) {
    // Set up a simple buffer for a fullscreen quad
    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    const positions = [
        -1.0, -1.0, 1.0, -1.0,
        -1.0, 1.0, 1.0, 1.0
    ];
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(shaderProgram, "a_position");
    console.log(positionLocation);
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Cancel previous animation frame if any
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
}

export default {
    initBuffer: initBuffer,  
    fetchShaderSource: fetchShaderSource, 
    fetchShaderManifest: fetchShaderManifest
}