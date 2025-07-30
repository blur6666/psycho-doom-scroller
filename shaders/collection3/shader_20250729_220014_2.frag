#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform float u_time;

float h(vec2 p){return fract(sin(dot(p,vec2(41.3,289.1))+sin(dot(p,vec2(73.7,19.2))))*12345.678);}
float vnoise(vec2 p){
vec2 i=floor(p),f=fract(p);
float a=h(i),b=h(i+vec2(1,0)),c=h(i+vec2(0,1)),d=h(i+vec2(1,1));
f=f*f*(3.0-2.0*f);
return mix(mix(a,b,f.x),mix(c,d,f.x),f.y);
}
vec2 grad(vec2 p){float e=0.001;return vec2(vnoise(p+vec2(e,0))-vnoise(p-vec2(e,0)),vnoise(p+vec2(0,e))-vnoise(p-vec2(0,e)))/(2.0*e);}
vec2 curl(vec2 p){vec2 g=grad(p);return vec2(g.y,-g.x);}

void main(){
vec2 uv=(gl_FragCoord.xy/u_resolution.xy)-0.5;
uv.x*=u_resolution.x/u_resolution.y;
vec2 p=uv*2.0;
float t=u_time*0.25;
vec3 col=vec3(0.0);
for(int i=0;i<60;i++){
vec2 v = 0.55*curl(p*1.1+vec2(0.0,t)) + 0.45*curl(p*2.3-vec2(t,0.0));
p+=v*0.035;
float m=sin(float(i)*0.08 + length(p)*3.2 + t);
vec3 c=0.5+0.5*cos(vec3(0.0,2.2,4.4)+m*6.2831+float(i)*0.017);
col+=c*0.015;
}
fragColor=vec4(col,1.0);
}

