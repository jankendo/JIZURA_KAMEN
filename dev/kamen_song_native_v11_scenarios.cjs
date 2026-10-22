'use strict';
async function runDirectionTestsV11(){
 const J=window.J,createCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h}),copy=x=>JSON.parse(JSON.stringify(x));
 const assert=Object.assign((v,m)=>{if(!v)throw Error(m||'Assertion failed');},{equal:(a,b,m)=>{if(a!==b)throw Error(m||`Expected ${a} === ${b}`);},notEqual:(a,b,m)=>{if(a===b)throw Error(m||'Expected distinct values');},deepEqual:(a,b,m)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(m||'Expected deep equality');},throws:(fn,re)=>{let caught=false;try{fn();}catch(e){caught=re.test(e.message);}if(!caught)throw Error('Expected exception '+re);}});J.enableSingleBackgroundMode();
 const q=J.defaultProject();q.lyrics='[00:00]光へ歩こう\n[00:02]同じ空\n[00:04]光へ歩こう';
 const image=createCanvas(160,90),ix=image.getContext('2d');ix.fillStyle='#10243c';ix.fillRect(0,0,160,90);ix.fillStyle='#657380';ix.fillRect(120,0,40,90);
 q.customBg={...q.customBg,enabled:true,dataUrl:image.toDataURL()};J.applyImagePalette(q,J.analyzeCustomBackground(image,q),{palette:true,readability:true,mood:false});
 const synth=order=>{const rows=order.flatMap((v,i)=>Array.from({length:8},(_,j)=>({time:i*2+j*.25,energy:.5,onset:v,brightness:v,bass:1-v,spectralFlux:j===4?v:0,logBands:[v,1-v,v,0,0,1-v]})));return {duration:6,bpm:120,energyRate:4,energy:new Float32Array(24).fill(.5),onset:Float32Array.from(rows.map(r=>r.onset)),features:{energy:.5,timeline:rows,detailedTimeline:rows}};};
 const a=synth([.05,.85,.05]),b=synth([.85,.05,.05]);
 const prepare=async(audio,input=q,search=true)=>{const source=copy(input),set=await J.generateJizuraDirectionV11(source,audio);source.autoDirection=true;source.artDirection=J.makeArtDirection(source,audio,set.recommended.proposal);source.fonts={...source.artDirection.typography};const p=J.plan(source,audio);if(search)await J.searchSongNativeCandidates(p,null,audio,{ensureFonts:false});return {q:source,p};};
 const left=await prepare(a),selection=left.p.songNativeDirection.selection;J.assertSelectionV9(left.p,a);assert.equal(selection.optimizerVersion,11);
 const index=J.directionCapabilityIndexV11(left.p),counts=Object.fromEntries(['style',...J.GROUP_KEYS].map(g=>[g,index.filter(x=>x.group===g).length]));
 assert.equal(index.length,Object.keys(J.STYLES).length+J.GROUP_KEYS.reduce((n,g)=>n+Object.keys(J.registry(g)).length,0));
 const trace=selection.traces[1].creative;
 const candidates=J.directionRoleCandidatesV11(left.p,'enter',trace.intent,index);assert(candidates.length>2);
 assert(J.directionRepresentativesV11(candidates,6).length>2);
 assert(selection.traces.some(t=>t.creative.interactions.some(x=>x.status==='MEASURED')));
 assert(selection.traces.some(t=>t.creative.ablations.some(x=>x.pixelDifference>1e-6)));
 assert(selection.traces.some(t=>t.creative.catalog.some(x=>x.probed&&x.safe&&['enter','hold','exit','cam','treat','bg','decor','trans','fx'].includes(x.group)&&!J.creativeRoleCandidatesV10(left.p,x.group,t.acoustics).some(y=>y.id===x.id))),'safe native dispatch beyond the old top-two shortlist');
 assert(selection.traces.every(t=>t.creative.catalog.every(x=>!x.safe||x.probed)));
 const calls={layout:0,hold:0},hooks=[];for(const [g,key] of [['layout','render'],['hold','apply']]){const c=left.p.cuts.find(x=>x.line===1),d=J.registry(g)[c[g]],fn=d[key];hooks.push(()=>d[key]=fn);d[key]=function(...args){calls[g]++;return fn.apply(this,args);};}
 const R=new J.Renderer();await R.loadCustomBackground(q.customBg.dataUrl);const cv=createCanvas(256,144),mask=createCanvas(256,144),sample=J.createRegistryRenderProbe(left.p,R,cv,mask,{production:true});
 try{sample(left.p,left.p.cuts.find(c=>c.line===1),1);}finally{hooks.forEach(f=>f());}assert(calls.layout&&calls.hold);
 console.log('TEST 1 PASS: full registry retrieval, diverse capability traversal, actual joint comparisons and production dispatch',JSON.stringify(counts));
 const draft=await prepare(a,q,false),other=await prepare(b,q,false),cut=draft.p.cuts.find(c=>c.line===0);
 const intentA=J.songVisualIntentV11(draft.p,a,cut),intentB=J.songVisualIntentV11(other.p,b,other.p.cuts.find(c=>c.line===0));
 assert.equal(a.bpm,b.bpm);assert.deepEqual(a.energy,b.energy);assert.notEqual(J.canonicalJSON(intentA),J.canonicalJSON(intentB));assert(intentA.repeat.some(x=>x.line===2));assert.equal(intentA.semantics.status,'UNMEASURED');
 assert.notEqual(J.directionRoleCandidatesV11(draft.p,'hold',intentA)[0].prior,J.directionRoleCandidatesV11(other.p,'hold',intentB)[0].prior);
 const again=await prepare(a);assert.equal(J.canonicalJSON(selection),J.canonicalJSON(again.p.songNativeDirection.selection));
 console.log('TEST 2 PASS: temporal acoustic order, repeated phrase relations, changed fit and deterministic selection');
 for(const aspect of ['16:9','9:16']){
  const p=aspect==='16:9'?left.p:(await prepare(a,{...q,aspect})).p;
  const canvas=createCanvas(256,Math.round(256*p.H/p.W)),m=createCanvas(canvas.width,canvas.height),probe=J.createRegistryRenderProbe(p,R,canvas,m,{production:true});
  for(const c of p.cuts.filter(c=>c.line>=0)){
   const checks=J.directionPhasesV11(p,c,a).map(t=>probe(p,c,t));assert(checks.every(e=>e.eligible),JSON.stringify({aspect,line:c.line,checks:checks.map(({mask,...e})=>e)}));assert(checks.some(e=>e.full&&e.readable&&e.safe&&e.temporalStage==='HOLD'));
  }
  const base=copy(p.cuts.find(c=>c.line===0));
  // Instrument actual registered hold callbacks to distinguish normal echo from
  // a persistent missing Japanese glyph; use the same production draw pipeline.
  const hold=J.HOLD[base.hold],original=hold.apply;
  try{
   hold.apply=function(env,it,...rest){const value=original.call(this,env,it,...rest);it.echo={n:2,a:.1,dx:1,dy:0};return value;};
   const echo=probe(p,base,base.dur*.5);assert(echo.eligible,'echo with a complete sharp core remains eligible '+JSON.stringify({...echo,mask:undefined}));
   hold.apply=function(env,it,...rest){const v=original.call(this,env,it,...rest);it.clip=[-env.W,env.W*2];return v;};assert(probe(p,base,base.dur*.5).eligible,'non-occluding clip is allowed');
   hold.apply=function(env,it){it.clip=[env.W*.5,env.W*.51];};assert.equal(probe(p,base,base.dur*.5).eligible,false,'persistent clipped glyphs are rejected');
   hold.apply=function(env,it){it.charFns.push(i=>({hide:i===0}));};assert.equal(probe(p,base,base.dur*.5).eligible,false,'missing glyph rejected');
   hold.apply=function(env,it){it.alpha=.1;};assert.equal(probe(p,base,base.dur*.5).eligible,false,'unreadable contrast/alpha rejected');
   hold.apply=function(env,it){it.x=-p.W*2;};const outside=probe(p,base,base.dur*.5);assert(!outside.eligible||outside.safe&&outside.readable&&outside.ink>8,'unsafe glyph placement rejected or fitted into safe bounds');
  }finally{hold.apply=original;}
  const typing={...base,enter:'type',inDur:Math.min(.22,base.dur*.15),hold:'still',exit:'cut',outDur:0};const entering=probe(p,typing,typing.inDur*.5),held=probe(p,typing,base.dur*.5);assert(entering.eligible&&entering.temporalStage==='ENTRY','bounded intentional entry is allowed');assert(held.eligible&&held.full&&held.readable,'entry must resolve to complete readable Japanese');
 }
 assert(left.p.lines.every((l,i)=>l.start===i*2));assert.equal(selection.artisticQuality,'UNVERIFIED');
 console.log('TEST 3 PASS: real Canvas temporal core, normal echo, missing glyph/contrast/bounds rejection, both aspects and LRC');
 const saved=J.captureSongNativeResolved(left.q,a,left.p),restored=J.plan(copy(left.q),a);assert.equal(saved.version,9);assert.equal(restored.songNativeRestore.status,'RESTORED');assert.equal(J.canonicalJSON(J.songNativeRenderDecisions(restored)),J.canonicalJSON(J.songNativeRenderDecisions(left.p)));
 const alt=await J.applyRegistryAlternativeV9(left.q,a,left.p,null,{ensureFonts:false});assert(alt,'independent safe alternative');J.assertSelectionV9(alt,a);J.captureSongNativeResolved(left.q,a,alt);assert.equal(J.plan(copy(left.q),a).songNativeRestore.status,'RESTORED');J.captureSongNativeResolved(left.q,a,left.p);
 const locked=copy(q);for(let i=0;i<3;i++)locked.overrides[i]={lock:true,layout:'center',size:80};const lp=await prepare(a,locked);assert(lp.p.cuts.filter(c=>c.line>=0).every(c=>!c.registrySelectedV8&&c.layout==='center'));assert.equal(lp.p.songNativeDirection.selection.optimizerVersion,11);
 const bad=copy(left.p);bad.songNativeDirection.selection.entries.pop();assert(!J.selectionIntegrityV9(bad,a).ok);assert.throws(()=>J.captureSongNativeResolved(left.q,a,bad),/確定/);
 const before=J.songNativeFixSnapshot(left.q,a,restored);J.fixMVQuality(left.q,{issues:[{code:'motion',fixable:true}]},a);const fixed=J.plan(left.q,a);await J.runSongNativeFixSearch(before,left.q,a,fixed,null,{ensureFonts:false});J.ensureSongNativeDirection(left.q,a,fixed);J.captureSongNativeResolved(left.q,a,fixed);assert.equal(J.plan(copy(left.q),a).songNativeRestore.status,'RESTORED');
 for(const mode of ['fast','quality']){const x=copy(left.q);x.exportSettings.refinementMode=mode;assert.equal(J.resolveExportSettings(x).refinementMode,mode);}
 const quality=J.checkMVQuality(left.q,fixed,a,null,null).quality;assert.equal(quality.creativeScore,null);assert.equal(quality.socialScore,null);
 console.log('TEST 4 PASS: exact v11 save/restore, independent alternative, locks, repair finalization, invalid state and export modes');
 const report={counts,registered:index.length,techniques:index.length-counts.style,framesCompared:selection.framesCompared,lines:selection.traces.map(t=>({line:t.line,counts:t.creative.counts,compared:t.creative.compared,interactions:t.creative.interactions,ablations:t.creative.ablations})),selected:selection.entries.map(e=>({line:e.line,style:e.cut.styleKey,layout:e.cut.layout,enter:e.cut.enter,hold:e.cut.hold,exit:e.cut.exit,cam:e.cut.cam,bg:e.cut.bg,treat:e.cut.treat,decor:e.cut.decor,fx:e.cut.registryFxV9,trans:e.cut.trans})),artisticQuality:'UNVERIFIED',assets:'Synthetic 6s acoustic order + Japanese repeated lyrics + generated background; KAMEN_ASSET_PACK unavailable'};
 R.disposeAssets?.();return report;
}
module.exports=runDirectionTestsV11;
