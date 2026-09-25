export const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));export const smooth=(a,b,x)=>{const v=clamp((x-a)/(b-a));return v*v*(3-2*v)};
