import * as THREE from './vendor/three.module.js';
import {createBackground} from './background/background.js';
import {createBlackHole} from './black-hole/black-hole.js';
import {createCompositor} from './shared/compositor.js';
import {clamp,smooth} from './shared/math.js';
import './shared/scroll-settle.js';

const canvas=document.querySelector('#universe'),stage=document.querySelector('.stage'),journey=document.querySelector('.journey');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');let paused=reduced.matches,hidden=false,panel=false,progress=0,time=0,previous=0,spin=0,drag=0,dragging=false,lastX=0,raf=0;
reduced.addEventListener('change',e=>{paused=e.matches});
function scroll(){progress=clamp(-journey.getBoundingClientRect().top/(journey.offsetHeight-stage.offsetHeight)/.76);}
window.addEventListener('scroll',scroll,{passive:true});scroll();
let renderer;
try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:'low-power'});renderer.setPixelRatio(Math.min(devicePixelRatio,1.6));renderer.autoClear=false;}catch(e){canvas.dataset.webglUnavailable='true';console.error('The original visual effects require WebGL.',e);}
if(renderer){
document.body.classList.add('webgl-ready');
const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,1,.1,100);
const world=new THREE.Group();scene.add(world);
const {backgroundTarget,focusScene,focusCamera,focusMaterial}=createCompositor();
const {bgScene,bgCamera,bgMaterial}=createBackground();
const {upperMaterial,geometry}=createBlackHole(world);
let width=0,height=0,mobile=false;
function resize(){width=stage.clientWidth;height=stage.clientHeight;mobile=width<600;renderer.setSize(width,height,false);const ratio=renderer.getPixelRatio();backgroundTarget.setSize(Math.round(width*ratio),Math.round(height*ratio));focusMaterial.uniforms.texel.value.set(1/width,1/height);camera.aspect=width/height;camera.updateProjectionMatrix();bgMaterial.uniforms.uAspect.value=width/height;scroll()}
window.addEventListener('resize',resize);resize();
canvas.addEventListener('pointerdown',e=>{dragging=true;lastX=e.clientX;canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(dragging){drag+=(e.clientX-lastX)*.005;lastX=e.clientX}});canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
window.addEventListener('panelchange',e=>panel=e.detail);document.addEventListener('visibilitychange',()=>hidden=document.hidden);
canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();cancelAnimationFrame(raf);canvas.dataset.webglUnavailable='true';console.error('WebGL context lost. Reload to resume the original effects.');});
let lastRender=0;
function frame(now){raf=requestAnimationFrame(frame);const dt=previous?Math.min((now-previous)/1000,.05):0;previous=now;if(hidden||journey.getBoundingClientRect().bottom<0)return;if(now-lastRender<(mobile?33:22))return;const elapsed=(now-lastRender)/1000;lastRender=now;if(!paused&&!panel){time+=Math.min(elapsed,.08);spin+=Math.min(elapsed,.08)*.035;}const q=smooth(0,1,progress);bgMaterial.uniforms.uTime.value=time;bgMaterial.uniforms.uPhase.value=progress;
world.rotation.y=spin+drag;world.rotation.z=-.075;world.position.set(mobile?1.55:2.8,mobile?-.65:0,0);
// Translate the camera down the geometry, passing the throat and leaving the sky above.
camera.position.set(0,6.7-11.4*q,(mobile?17:14)-3*Math.sin(q*Math.PI));
camera.lookAt(0,2.6-6.7*q,0);camera.updateMatrixWorld();
upperMaterial.uniforms.flowTime.value=time;geometry(time);
focusMaterial.uniforms.focus.value=smooth(.72,.98,progress);
renderer.setRenderTarget(backgroundTarget);renderer.clear();renderer.render(bgScene,bgCamera);renderer.clearDepth();renderer.render(scene,camera);
renderer.setRenderTarget(null);renderer.clear();renderer.render(focusScene,focusCamera);
}
raf=requestAnimationFrame(frame);
}
