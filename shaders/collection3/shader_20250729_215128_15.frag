#version 300 es
precision highp float;
uniform vec2 u_resolution;
uniform float u_time;
out vec4 fragColor;

float ridge(float x){return 2.0*(0.5-abs(0.5-x));}

void main(){
vec2 uv=(gl_FragCoord.xy/u_resolution.xy)-0.5;
uv.x*=u_resolution.x/u_resolution.y;
float t=u_time*0.55;
float f=0.0;
vec2 p=uv;
for(int i=0;i<9;i++){
p=mat2(0.8,0.6,-0.6,0.8)*p*1.25 + 0.15*vec2(sin(t+float(i)),cos(t*1.1+float(i)));
f+=ridge(fract(sin(p.x*7.0+cos(p.y*6.0+t))*0.5+0.5));
}
float iso=abs(sin(f*1.2+t));
float g=pow(0.02/(iso+1e-4),1.5);
vec3 col=0.5+0.5*cos(vec3(0.0,1.95,4.05)+f*0.9+t*0.4);
col+=g;
fragColor=vec4(col,1.0);
}

