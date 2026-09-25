import * as THREE from '../vendor/three.module.js';

export function createCompositor(){
const backgroundTarget=new THREE.WebGLRenderTarget(1,1,{depthBuffer:true});
const focusScene=new THREE.Scene(),focusCamera=new THREE.OrthographicCamera(-1,1,1,-1,0,1);
const focusMaterial=new THREE.ShaderMaterial({depthTest:false,depthWrite:false,uniforms:{image:{value:backgroundTarget.texture},texel:{value:new THREE.Vector2(1,1)},focus:{value:0}},vertexShader:'varying vec2 uvOut;void main(){uvOut=uv;gl_Position=vec4(position.xy,0.,1.);}',fragmentShader:`precision highp float;varying vec2 uvOut;uniform sampler2D image;uniform vec2 texel;uniform float focus;
void main(){vec2 d=texel*focus*6.;vec3 c=texture2D(image,uvOut).rgb*.20;c+=texture2D(image,uvOut+vec2(d.x,0.)).rgb*.12;c+=texture2D(image,uvOut-vec2(d.x,0.)).rgb*.12;c+=texture2D(image,uvOut+vec2(0.,d.y)).rgb*.12;c+=texture2D(image,uvOut-vec2(0.,d.y)).rgb*.12;c+=texture2D(image,uvOut+d).rgb*.08;c+=texture2D(image,uvOut-d).rgb*.08;c+=texture2D(image,uvOut+vec2(d.x,-d.y)).rgb*.08;c+=texture2D(image,uvOut+vec2(-d.x,d.y)).rgb*.08;gl_FragColor=vec4(c*(1.-focus*.52),1.);}`});
focusScene.add(new THREE.Mesh(new THREE.PlaneGeometry(2,2),focusMaterial));
return {backgroundTarget,focusScene,focusCamera,focusMaterial};
}
