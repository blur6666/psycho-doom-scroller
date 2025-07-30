#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform float u_time;

float quasi(vec2 p){
return cos(dot(p,vec2(1.0,1.618)))+cos(dot(p,vec2(-1.618,1.0)));
}
void main(){
vec2 uv=(gl_FragCoord.xy/u_resolution-0.5)*8.0;uv.x*=u_resolution.x/u_resolution.y;
float v=quasi(uv)+quasi(uv*1.3+u_time);
vec3 col=0.5+0.5*cos(vec3(0,2,4)+v*2.0);
fragColor=vec4(col,1.0);
}

