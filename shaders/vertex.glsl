#version 300 es
precision highp float;

in vec4 vertexCoord;

void main() {
    gl_Position = vec4(vertexCoord.xy, 0.0, 1.0);
}

