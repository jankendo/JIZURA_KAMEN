'use strict';
const assert=require('node:assert/strict'),{engine}=require('./custom_test_support.cjs');
const {J,context}=engine();
// PR #8's full-mask observer, independent of the indexed stencil implementation.
const reference=(actual,background,mask,w,h)=>{let cores=0,rings=0,separated=0,ink=0,surround=0;for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){const i=y*w+x;if(mask[i]>.75&&mask[i-w]>.75&&mask[i-1]>.75&&mask[i+1]>.75&&mask[i+w]>.75){cores++;ink+=actual[i];if(Math.abs(actual[i]-background[i])>=.25)separated++;}else if(mask[i]<.05&&(mask[i-w-1]>.5||mask[i-w]>.5||mask[i-w+1]>.5||mask[i-1]>.5||mask[i+1]>.5||mask[i+w-1]>.5||mask[i+w]>.5||mask[i+w+1]>.5)){rings++;surround+=actual[i];}}if(cores<3||rings<3)return {status:'UNMEASURED',score:null};ink/=cores;surround/=rings;const ratio=(Math.max(ink,surround)+.05)/(Math.min(ink,surround)+.05);return {status:'DECODED_LOCAL_CONTRAST_PROXY',score:Math.round(100*Math.min(separated/cores,J.clamp((ratio-1)/2))),contrastRatio:ratio,corePixels:cores,ringPixels:rings,resolution:[w,h],limits:'Eroded primary alpha cores and local ring; not OCR, WCAG certification or human reading accuracy'};};
let state=818;const random=()=>{state=(Math.imul(state,1664525)+1013904223)>>>0;return state/4294967296;},thresholds=[0,.049999999999,.05,.5,.500000000001,.75,.750000000001,1,NaN];
const check=(a,b,m,w,h)=>assert.equal(J.canonicalJSON(J.decodedGlyphContrast(a,b,m,w,h)),J.canonicalJSON(reference(a,b,m,w,h)));
for(const [w,h] of [[32,24],[24,32],[32,32]])for(let trial=0;trial<120;trial++){
 const a=Array.from({length:w*h},random),b=Array.from({length:w*h},random),m=Array.from({length:w*h},()=>thresholds[Math.floor(random()*thresholds.length)]);
 if(trial%2===0)for(let y=5;y<h-5;y++)for(let x=5;x<w-5;x++)m[y*w+x]=1;
 check(a,b,m,w,h);const hits=J.cinemaStencilStats.hits;check(b,a,m,w,h);assert(J.cinemaStencilStats.hits>hits,'reuse stencil but recompute contrast from new foreground/background');m[Math.floor(m.length/2)]=trial%2;check(a,b,m,w,h);
}
const imul=context.Math.imul;try{context.Math.imul=()=>0;const w=32,h=24,a=Array.from({length:w*h},random),b=Array.from({length:w*h},random);for(let shift=0;shift<4;shift++){const m=Array(w*h).fill(0);for(let y=5;y<18;y++)for(let x=4+shift;x<22+shift;x++)m[y*w+x]=1;check(a,b,m,w,h);}}finally{context.Math.imul=imul;}
const rgba=new Uint8ClampedArray(65536*4);for(let i=0;i<rgba.length;i++)rgba[i]=Math.floor(random()*256);const old=new Float32Array(rgba.length/4);for(let i=0;i<old.length;i++){const k=i*4;old[i]=(rgba[k]*.2126+rgba[k+1]*.7152+rgba[k+2]*.0722)/255;}const luma=J.cinemaReferenceLuma(rgba);assert(Array.isArray(luma));assert.deepEqual(Array.from(luma),Array.from(old),'same Float32 rounding and plain-array API');
console.log('1084 exact full-mask/stencil comparisons, mutated masks, forced hash collisions and 65536 exact luma values PASS');
