import * as THREE from '../vendor/three.module.js';

export function createBackground(){
const bgScene=new THREE.Scene(),bgCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const bgMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{uTime:{value:0},uPhase:{value:0},uAspect:{value:1}},vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`,fragmentShader:`precision highp float;varying vec2 vUv;uniform float uTime,uPhase,uAspect;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float stars(vec2 uv,float scale){vec2 p=uv*scale;vec2 cell=floor(p);vec2 f=fract(p);float h=hash(cell);vec2 pos=vec2(hash(cell+.3),hash(cell+7.));float d=length(f-pos);return (1.-smoothstep(.008,.038+hash(cell+1.)*.028,d))*step(.88,h);}
vec3 galaxy(vec2 p,vec2 center,float rotation,float size){vec2 q=(p-center)*size;float cs=cos(rotation),sn=sin(rotation);q=mat2(cs,-sn,sn,cs)*q;q.y*=2.7;float r=length(q),a=atan(q.y,q.x);float arms=pow(.5+.5*cos(a*2.-r*12.),6.);return vec3(.32,.42,.64)*(exp(-r*3.5)*arms*.27+exp(-r*12.)*.6);}
void main(){
vec2 p=(vUv-.5)*vec2(uAspect,1.);float t=uTime*.22;
// A vertical boundary travels up the viewport: two spatial realms, not a global crossfade.
vec2 sky=p-vec2(0.,uPhase*.85);
vec3 space=vec3(.017,.025,.052);
float s=stars(sky,92.)*.9+stars(sky+vec2(.432),155.)*.45;
space+=vec3(.75,.84,1.)*s;
space+=galaxy(sky,vec2(.51,.24),-.4,5.)*1.8;
space+=galaxy(sky,vec2(-.52,-.32),.65,8.)*1.6;
space+=vec3(.025,.016,.045)*exp(-length(sky-vec2(.5,0.))*2.);
vec2 q=(p-vec2(0.,uPhase*.42))*5.2;
q+=.55*vec2(sin(q.y*.8+t*.65),cos(q.x*.6-t*.53));
float re=sin(q.x*.8+q.y*.7-t)+sin(-q.x*.6+q.y*1.2+t*.6)+sin(q.x*1.1-q.y*.5+t*.8);
float im=cos(q.x*.6-q.y*.9+t*.8)+cos(q.x+q.y*.45-t*.7)+cos(-q.x*.8+q.y*.8-t);
float phase=atan(im,re);float amplitude=length(vec2(re,im))*.24;
vec3 wave=.5+.5*cos(phase+vec3(.3,2.4,4.6)+t*.17);
vec3 field=vec3(.025,.025,.067)+pow(wave,vec3(1.4))*(.12+amplitude*.40);
float contour=pow(.5+.5*sin(re*3.+im*2.),24.);
field+=mix(vec3(.08,.24,.3),vec3(.3,.09,.27),wave.r)*contour*.55;
float front=-.38+1.9*uPhase+.035*sin(vUv.x*8.+t*.55);
float realm=1.-smoothstep(front-.13,front+.13,vUv.y);
vec3 col=mix(space,field,realm);
// Preserve contrast behind the editorial text while leaving the right-hand field luminous.
float legibility=.46+.54*smoothstep(-uAspect*.35,uAspect*.10,p.x);
col*=mix(1.,legibility,realm);
gl_FragColor=vec4(col,1.);
}`});
bgScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),bgMaterial));
return {bgScene,bgCamera,bgMaterial};
}
