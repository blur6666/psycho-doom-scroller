// Simple WebGL test
console.log('Test WebGL script loaded');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, starting WebGL test');
    
    const canvas = document.getElementById('glsl-canvas');
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }
    
    console.log('Canvas found:', canvas);
    
    const gl = canvas.getContext('webgl2');
    if (!gl) {
        console.error('WebGL2 not supported');
        return;
    }
    
    console.log('WebGL2 context created successfully');
    
    // Simple test - just clear to red
    gl.clearColor(1.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    
    console.log('Canvas should now be red');
});