import * as THREE from '../vendor/three.module.js';
import {fragment,ROWS,COLS,FLOW_SPEED} from './flow-geometry.js';
import {smooth} from '../shared/math.js';

export function createBlackHole(world){
const rows=ROWS,cols=COLS,total=rows*cols,verts=total*6;
const position=new Float32Array(verts*3),colors=new Float32Array(verts*3),linePosition=new Float32Array(total*12*3),lineColor=new Float32Array(total*12*3);
const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(position,3).setUsage(THREE.DynamicDrawUsage));geo.setAttribute('color',new THREE.BufferAttribute(colors,3).setUsage(THREE.DynamicDrawUsage));
const fill=new THREE.Mesh(geo,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.DoubleSide,transparent:true,opacity:.22,depthWrite:false,blending:THREE.AdditiveBlending}));fill.frustumCulled=false;world.add(fill);
const linesGeo=new THREE.BufferGeometry();linesGeo.setAttribute('position',new THREE.BufferAttribute(linePosition,3).setUsage(THREE.DynamicDrawUsage));linesGeo.setAttribute('color',new THREE.BufferAttribute(lineColor,3).setUsage(THREE.DynamicDrawUsage));
const lines=new THREE.LineSegments(linesGeo,new THREE.LineBasicMaterial({vertexColors:true,transparent:true,opacity:.62,depthWrite:false,blending:THREE.AdditiveBlending}));lines.frustumCulled=false;world.add(lines);
// Smooth classical surface: fine curvature with a sparse, antialiased flowing grid.
// Its grid dissolves into the individually moving low-resolution fragments near the throat.
const upperPositions=[],upperUV=[],upperIndices=[],azimuth=64,radial=20;
for(let r=0;r<=radial;r++)for(let c=0;c<=azimuth;c++){
 const u=r/radial*.38,a=c/azimuth*Math.PI*2,y=3.35-7.65*u,radius=.56+.22*y*y+.018*y**4;
 upperPositions.push(radius*Math.cos(a),y,radius*Math.sin(a));upperUV.push(c/azimuth,u);
}
for(let r=0;r<radial;r++)for(let c=0;c<azimuth;c++){const n=r*(azimuth+1)+c;upperIndices.push(n,n+azimuth+1,n+1,n+1,n+azimuth+1,n+azimuth+2)}
const upperGeometry=new THREE.BufferGeometry();upperGeometry.setAttribute('position',new THREE.Float32BufferAttribute(upperPositions,3));upperGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(upperUV,2));upperGeometry.setIndex(upperIndices);upperGeometry.computeVertexNormals();
const upperMaterial=new THREE.ShaderMaterial({side:THREE.DoubleSide,transparent:true,depthWrite:false,uniforms:{flowTime:{value:0},flowSpeed:{value:FLOW_SPEED},rows:{value:ROWS},cols:{value:COLS}},vertexShader:`varying vec2 gridUV;varying vec3 surfaceNormal;void main(){gridUV=uv;surfaceNormal=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,fragmentShader:`precision highp float;varying vec2 gridUV;varying vec3 surfaceNormal;uniform float flowTime,flowSpeed,rows,cols;
void main(){vec2 grid=vec2(gridUV.x*cols,gridUV.y*rows-flowTime*flowSpeed);vec2 d=abs(fract(grid+.5)-.5)/max(fwidth(grid),vec2(.0001));float line=1.-smoothstep(.35,1.15,min(d.x,d.y));float edge=smoothstep(0.,.018,gridUV.y)*(1.-smoothstep(.26,.37,gridUV.y));float light=.4+.6*abs(dot(normalize(surfaceNormal),normalize(vec3(-.3,.7,1.))));vec3 color=mix(vec3(.12,.20,.28)*light,vec3(.58,.72,.81),line);gl_FragColor=vec4(color,edge*(.10+line*.45));}`});
const smoothUpper=new THREE.Mesh(upperGeometry,upperMaterial);world.add(smoothUpper);
const upperColor=new THREE.Color('#adc0cf'),lowerColor=new THREE.Color(),color=new THREE.Color();
function geometry(t){let pi=0,li=0;
 for(let row=0;row<rows;row++)for(let col=0;col<cols;col++)for(let tri=0;tri<2;tri++){
  const f=fragment(row,col,tri,t);
  // Thin the released cloud gradually; keep the connected upper lattice intact.
  const visibility=f.fade*(f.seed<.5?1-smooth(.42,.62,f.u):1);
  lowerColor.setHSL(.47+f.seed*.36,.55,.66);color.copy(upperColor).lerp(lowerColor,smooth(.34,.67,f.u));
  for(const p of f.points){for(let k=0;k<3;k++){position[pi]=p[k];colors[pi++]=[color.r,color.g,color.b][k]*f.broken*visibility;}}
  for(let edge=0;edge<3;edge++){
   const diagonal=tri===0?edge===1:edge===0;
   const strength=visibility*smooth(.26,.37,f.u)*(diagonal?smooth(.29,.47,f.u):1);
   for(const idx of [edge,(edge+1)%3])for(let k=0;k<3;k++){linePosition[li]=f.points[idx][k];lineColor[li++]=[color.r,color.g,color.b][k]*strength;}
  }
 }
 geo.attributes.position.needsUpdate=true;geo.attributes.color.needsUpdate=true;linesGeo.attributes.position.needsUpdate=true;linesGeo.attributes.color.needsUpdate=true;
}
return {upperMaterial,geometry};
}
