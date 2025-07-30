#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform float u_time;

float qcr(vec2 p){
float s=0.0;
for(int i=0;i<7;i++){
float a=3.14159265*float(i)/7.0 + 0.1*u_time;
vec2 k=vec2(cos(a),sin(a));
s+=cos(dot(p,k)*12.0);
p*=mat2(0.8,0.6,-0.6,0.8);
}
return s/7.0;
}

void main(){
vec2 uv=(gl_FragCoord.xy/u_resolution-0.5)*2.0; uv.x*=u_resolution.x/u_resolution.y;
float f=qcr(uv);
float bands=sin(8.0*f+u_time*0.7);
float glow=pow(0.03/abs(bands),1.5);
vec3 col=0.5+0.5*cos(vec3(0.0,2.1,4.2)+f*4.0+u_time*0.3);
col+=glow;
fragColor=vec4(col,1.0);
}

