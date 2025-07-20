#version 300 es
precision highp float;
in vec2 position;
out vec4 v_color;

void main () {
    gl_Position = vec4(position, 0.0, 1.0);

    // vec2 uv = position / iResolution.xy * 2.0 - 1.0;
    // v_color = (uv, 0.0, 1.0);
    v_color = gl_Position * 0.5 + 0.5;
}


