// One connected material lattice becomes independently moving fragments at the throat.
// Randomness is seeded per vertex/face so scrolling and pausing never regenerate the cloud.
export const ROWS=14,COLS=16;
// Keep the same descent speed when changing the number of lattice rows.
export const FLOW_SPEED=ROWS*.019;
import {smooth} from '../shared/math.js';
export {smooth} from '../shared/math.js';
const random=n=>{const x=Math.sin(n*127.1+311.7)*43758.5453123;return x-Math.floor(x)};
const noise=(r,c,k)=>random(r*COLS*7+(c%COLS)*7+k);
export function latticePoint(u,row,col){
 const fracture=smooth(.28,.49,u),a=col/COLS*Math.PI*2;
 const v=u+(noise(row,col,0)-.5)*.024*fracture;
 const y=3.35-7.65*v;
 const angle=a+(noise(row,col,1)-.5)*.095*fracture;
 const r=(y>=0?.56+.22*y*y+.018*y**4:.56+.27*(-y)**1.68)+(noise(row,col,2)-.5)*.13*fracture;
 return [r*Math.cos(angle),y,r*Math.sin(angle)];
}
export function fragment(row,col,tri,t){
 const u=((row+t*FLOW_SPEED)%ROWS)/ROWS,next=Math.min(1,u+1/ROWS);
 const p0=latticePoint(u,row,col),p1=latticePoint(u,row,col+1),p2=latticePoint(next,(row+1)%ROWS,col),p3=latticePoint(next,(row+1)%ROWS,col+1);
 const id=(row*COLS+col)*2+tri,seed=random(id+19),seed2=random(id+237),seed3=random(id+891);
 const release=.37+seed*.10,broken=smooth(release,release+.20,u),age=Math.max(0,u-release);
 const ps=tri===0?[p0,p2,p1]:[p1,p2,p3];
 const center=[0,1,2].map(k=>(ps[0][k]+ps[1][k]+ps[2][k])/3);
 const a=col/COLS*Math.PI*2;
 // Independent outward, tangential and vertical motion destroys the regular rings.
 const spread=broken*(.18+age*3.5),side=(seed2-.5)*spread*2.4;
 const drift=[Math.cos(a)*spread*(.25+seed)+Math.sin(a)*side+broken*.32*Math.sin(t*.48+id),broken*((seed3-.55)*1.6-age*.9)+broken*.24*Math.sin(t*.67+id*1.7),Math.sin(a)*spread*(.25+seed)-Math.cos(a)*side+broken*.36*Math.cos(t*.39+id*.7)];
 const scale=1-broken*(.18+seed*.4);
 const rx=broken*((seed-.5)*5+t*(seed2-.5)*.36),ry=broken*((seed2-.5)*6+t*(seed3-.5)*.43),rz=broken*((seed3-.5)*5+t*(seed-.5)*.27);
 const sx=Math.sin(rx),cx=Math.cos(rx),sy=Math.sin(ry),cy=Math.cos(ry),sz=Math.sin(rz),cz=Math.cos(rz);
 const points=ps.map(p=>{let x=(p[0]-center[0])*scale,y=(p[1]-center[1])*scale,z=(p[2]-center[2])*scale;[y,z]=[y*cx-z*sx,y*sx+z*cx];[x,z]=[x*cy+z*sy,-x*sy+z*cy];[x,y]=[x*cz-y*sz,x*sz+y*cz];return [x+center[0]+drift[0],y+center[1]+drift[1],z+center[2]+drift[2]]});
 return {points,center:center.map((v,k)=>v+drift[k]),u,broken,seed,fade:smooth(0,.025,u)*(1-smooth(.88,1,u))};
}
