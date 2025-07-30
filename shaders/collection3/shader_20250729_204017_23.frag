#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

vec2 moleculePos(int id, float t) {
    float phase = float(id) * 2.4 + t * 0.5;
    return vec2(sin(phase), cos(phase * 1.3)) * (0.3 + sin(t + float(id)) * 0.2);
}

float bondStrength(vec2 pos1, vec2 pos2) {
    float dist = length(pos1 - pos2);
    return exp(-dist * 5.0);
}

void main() {
    vec2 uv = (gl_FragCoord.xy * 2.0 - u_resolution.xy) / u_resolution.y;
    
    vec3 color = vec3(0.0);
    
    
    for (int i = 0; i < 8; i++) {
        vec2 molPos = moleculePos(i, u_time);
        float dist = length(uv - molPos);
        
        
        color += vec3(0.3, 0.8, 1.0) * exp(-dist * 50.0);
        
        
        for (int j = i + 1; j < 8; j++) {
            vec2 molPos2 = moleculePos(j, u_time);
            float bond = bondStrength(molPos, molPos2);
            
            
            vec2 line = molPos2 - molPos;
            float t = clamp(dot(uv - molPos, line) / dot(line, line), 0.0, 1.0);
            vec2 closest = molPos + t * line;
            float lineDist = length(uv - closest);
            
            color += vec3(1.0, 0.5, 0.2) * bond * exp(-lineDist * 100.0);
        }
    }
    
    fragColor = vec4(color, 1.0);
}


