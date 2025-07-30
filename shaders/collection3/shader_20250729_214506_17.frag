#version 300 es
precision highp float;
out vec4 fragColor;
uniform vec2 u_resolution;
uniform float u_time;

float hash(vec2 p){p=fract(p*vec2(127.1,311.7));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float noise(vec2 x){
vec2 i=floor(x),f=fract(x);
float a=hash(i),b=hash(i+vec2(1,0)),c=hash(i+vec2(0,1)),d=hash(i+vec2(1,1));
vec2 u=f*f*(3.0-2.0*f);
return mix(mix(a,b,u.x),mix(c,d,u.x),u.y);
}
float fbm(vec2 p){float s=0.0,a=0.5; mat2 R=mat2(0.8,0.6,-0.6,0.8); for(int i=0;i<6;i++){s+=a*noise(p);p=R*p*2.0;a*=0.5;} return s;}

void main(){
vec2 uv=(gl_FragCoord.xy/u_resolution-0.5)*2.0; uv.x*=u_resolution.x/u_resolution.y;
float t=u_time*0.4;
vec2 flow=uv;
for(int i=0;i<5;i++){
vec2 v=vec2(fbm(flow*2.0+vec2(0.0,t)),fbm(flow*2.0+vec2(t,0.0)))-0.5;
flow+=v*0.25;
}
float stripes=sin(length(flow*4.0)+t*2.0+fbm(flow*6.0)*6.0);
float g=pow(0.02/abs(stripes),1.4);
vec3 col=0.5+0.5*cos(vec3(0.0,2.2,4.0)+stripes*4.0);
col+=g;
fragColor=vec4(col,1.0);
}

