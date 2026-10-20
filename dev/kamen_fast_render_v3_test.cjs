'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {createCanvas}=require('@napi-rs/canvas');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/11zzi_render_selection.js'),'utf8');
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
function load(code){const J={};vm.runInNewContext(code,{J,C:clamp});return J;}
// Frozen pre-v3 reference algorithms, retained for exact equivalence checks.
const old=load(`
J.registryInkSignature=(mask,w,h)=>{
 if(!mask||!w||!h)return null;
 const cols=20,rows=12,out=[];
 for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
  const x0=Math.floor(gx*w/cols),x1=Math.max(x0+1,Math.floor((gx+1)*w/cols)),y0=Math.floor(gy*h/rows),y1=Math.max(y0+1,Math.floor((gy+1)*h/rows));
  let n=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++)n+=mask[(y*w+x)*4+3]>80?1:0;
  out.push(n/((x1-x0)*(y1-y0)));
 }
 return out;
};
J.registryInkDistance=(a,b)=>{
 if(!a||!b||a.length!==b.length)return null;
 let delta=0,union=0;for(let i=0;i<a.length;i++){delta+=Math.abs(a[i]-b[i]);union+=Math.max(a[i],b[i]);}
 return union>0?Math.min(1,delta/union):0;
};
// Translation/zoom is a separate axis from primary typography structure.
J.registryTypographySignature=(mask,w,h)=>{
 let x0=w,y0=h,x1=-1,y1=-1;for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mask[(y*w+x)*4+3]>80){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}
 if(x1<x0)return null;const W=x1-x0+1,H=y1-y0+1,cut=new Uint8ClampedArray(W*H*4);
 for(let y=0;y<H;y++)for(let x=0;x<W;x++)cut[(y*W+x)*4+3]=mask[((y+y0)*w+x+x0)*4+3];
 return J.registryInkSignature(cut,W,H);
};
J.chooseRegistryStoryboard=(steps,beamWidth=8)=>{
 if(!steps.length)return {status:'NOT_APPLICABLE_NO_LYRIC_STEPS',picks:[],score:null};
 const cap=Math.max(1,Math.min(32,Math.floor(beamWidth)||8));
 let beam=[{score:0,picks:[],last:null,previous:null,serial:''}];
 for(const step of steps){
  const eligible=(step.candidates||[]).filter(c=>c?.evidence?.eligible&&Number.isFinite(c.score)&&c.signature?.length&&Array.from(c.signature).every(Number.isFinite));
  if(!eligible.length)return {status:'NO_MEASURED_SAFE_PATH',picks:[],score:null};
  const next=[];
  for(const state of beam)for(const c of eligible){
   const prev=state.last,spatialDistance=prev?J.registryInkDistance(prev.signature,c.signature):null,distance=prev?J.registryInkDistance(prev.typographySignature,c.typographySignature):null;
   const energyDelta=Number.isFinite(step.energy)&&Number.isFinite(prev?.energy)?Math.abs(step.energy-prev.energy):0,boundary=!!prev&&prev.role!==step.role;
   const quiet=['intro','outro','break'].includes(step.role)||(Number.isFinite(step.energy)&&step.energy<.25);
   const target=C((quiet?.09:.20)+energyDelta*.36+(boundary?.16:0),.05,.65);
   const pacing=(distance===null?0:.12*(1-Math.abs(distance-target)))+(spatialDistance===null?0:.06*(1-Math.abs(spatialDistance-target)));
   const previousDistance=state.previous?J.registryInkDistance(state.previous.typographySignature,c.typographySignature):null;
   const fatigue=distance!==null&&previousDistance!==null&&distance<.06&&previousDistance<.06&&!quiet?-.20:0;
   const stagnant=distance!==null&&distance<.06&&!quiet&&energyDelta>.15?-.12:0;
   const overload=distance!==null&&distance>.82&&!boundary&&quiet?-.16:0;
   const item={...c,line:step.line,energy:step.energy,role:step.role};
   next.push({score:state.score+c.score+pacing+fatigue+stagnant+overload,picks:[...state.picks,item],last:item,previous:prev,serial:state.serial+'|'+c.layout});
  }
  next.sort((a,b)=>b.score-a.score||a.serial.localeCompare(b.serial));beam=next.slice(0,cap);
 }
 return {status:'MEASURED_SAFE_SEQUENCE',picks:beam[0].picks,score:beam[0].score,method:'beam-search/rendered-primary-ink-v1',beamWidth:cap};
};

`);
const current=load(source.slice(source.indexOf('J.registryInkSignature='),source.indexOf('// Exact rendered-geometry'))+source.slice(source.indexOf('J.chooseRegistryStoryboard='),source.indexOf('J.registryCandidateTrace=')));
for(const [w,h] of [[1,1],[1,17],[23,1],[3,4],[20,12],[31,19]])for(let pattern=0;pattern<5;pattern++){
 const mask=new Uint8ClampedArray(w*h*4);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++)mask[(y*w+x)*4+3]=pattern===0?0:pattern===1?(x===w-1&&y===h-1?255:0):pattern===2?255:[0,80,81,150,255][(x*7+y*11+pattern)%5];
 assert.deepEqual(Array.from(current.registryTypographySignature(mask,w,h)||[]),Array.from(old.registryTypographySignature(mask,w,h)||[]));
 if(pattern)assert.equal(current.registryTypographySignature(mask,w,h).length,240);
}
const features=[Array(240).fill(0),Array(240).fill(.5),Array.from({length:240},(_,i)=>i%3/2)];
const steps=Array.from({length:5},(_,line)=>({line,role:line<3?'verse':'outro',energy:line*.16,candidates:['z','a','m'].map((layout,i)=>({layout,score:.5,evidence:{eligible:true},signature:features[i],typographySignature:features[(i+line)%3]}))}));
let calls=0;const seen=new Map(),original=current.registryInkDistance;
current.registryInkDistance=(a,b)=>{calls++;if(a&&b){let pairs=seen.get(a);if(!pairs)seen.set(a,pairs=new Set());assert(!pairs.has(b),'pair must be evaluated only once per search');pairs.add(b);}return original(a,b);};
assert.equal(JSON.stringify(current.chooseRegistryStoryboard(steps,8)),JSON.stringify(old.chooseRegistryStoryboard(steps,8)));
assert(calls>0&&calls<=9);current.registryInkDistance=original;
for(const input of [[],[{candidates:[]}],steps.map(s=>({...s,candidates:s.candidates.map(c=>({...c,signature:features[0],typographySignature:null}))}))])assert.equal(JSON.stringify(current.chooseRegistryStoryboard(input)),JSON.stringify(old.chooseRegistryStoryboard(input)));
assert.equal(original(null,features[0]),null);assert.equal(original(features[0],features[0]),0);
// Subsequent calls must see changed feature values, rather than stale cached distances.
features[0][0]=1;assert.equal(JSON.stringify(current.chooseRegistryStoryboard(steps)),JSON.stringify(old.chooseRegistryStoryboard(steps)));
const canvas=createCanvas(4,4),ctx=canvas.getContext('2d');ctx.fillStyle='#ff0000';ctx.fillRect(0,0,4,4);
const a=ctx.getImageData(0,0,4,4).data,snapshot=Array.from(a);ctx.clearRect(0,0,4,4);ctx.fillStyle='#0000ff';ctx.fillRect(0,0,4,4);
assert.deepEqual(Array.from(a),snapshot);assert.notDeepEqual(Array.from(ctx.getImageData(0,0,4,4).data),snapshot);
current.registryInkSignature(a,4,4);current.registryTypographySignature(a,4,4);assert.deepEqual(Array.from(a),snapshot);
console.log('OPT-01 exact 240-cell equivalence, OPT-02 beam/ties/cache equivalence, OPT-03 Canvas snapshot invariance PASS');
