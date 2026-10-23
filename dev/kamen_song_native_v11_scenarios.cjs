'use strict';
async function runDirectionTestsV11(){
 const J=window.J,createCanvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h}),copy=x=>JSON.parse(JSON.stringify(x));
 const assert=Object.assign((v,m)=>{if(!v)throw Error(m||'Assertion failed');},{equal:(a,b,m)=>{if(a!==b)throw Error(m||`Expected ${a} === ${b}`);},notEqual:(a,b,m)=>{if(a===b)throw Error(m||'Expected distinct values');},deepEqual:(a,b,m)=>{if(JSON.stringify(a)!==JSON.stringify(b))throw Error(m||'Expected deep equality');},throws:(fn,re)=>{let caught=false;try{fn();}catch(e){caught=re.test(e.message);}if(!caught)throw Error('Expected exception '+re);}});J.enableSingleBackgroundMode();
 const q=J.defaultProject();q.lyrics='[00:00]光へ歩こう\n[00:02]同じ空\n[00:04]光へ歩こう';
 const image=createCanvas(160,90),ix=image.getContext('2d');ix.fillStyle='#10243c';ix.fillRect(0,0,160,90);ix.fillStyle='#657380';ix.fillRect(120,0,40,90);
 q.customBg={...q.customBg,enabled:true,dataUrl:image.toDataURL()};J.applyImagePalette(q,J.analyzeCustomBackground(image,q),{palette:true,readability:true,mood:false});
 const synth=order=>{const rows=order.flatMap((v,i)=>Array.from({length:8},(_,j)=>({time:i*2+j*.25,energy:.5,onset:v,brightness:v,bass:1-v,spectralFlux:j===4?v:0,logBands:[v,1-v,v,0,0,1-v]})));return {duration:6,bpm:120,energyRate:4,energy:new Float32Array(24).fill(.5),onset:Float32Array.from(rows.map(r=>r.onset)),features:{energy:.5,timeline:rows,detailedTimeline:rows}};};
 const a=synth([.05,.85,.05]),b=synth([.85,.05,.05]);
 const prepare=async(audio,input=q,search=true)=>{const source=copy(input),set=await J.generateJizuraDirectionV12(source,audio);source.autoDirection=true;source.artDirection=J.makeArtDirection(source,audio,set.recommended.proposal);source.fonts={...source.artDirection.typography};const p=J.plan(source,audio);if(search)await J.searchSongNativeCandidates(p,null,audio,{ensureFonts:false});return {q:source,p};};
 const left=await prepare(a),selection=left.p.songNativeDirection.selection;J.assertSelectionV9(left.p,a);assert.equal(selection.optimizerVersion,11);assert.equal(left.p.songNativeDirection.expressiveVersion,12);assert.equal(selection.multiScaleEvidence.status,'MEASURED_SAFE_SEQUENCE');
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
 const available=Object.entries(J.LAYOUTS).filter(([id])=>J.randomOk(left.p,'layout',id)),initial=[available[0][0]],sameRows=[{geometryFit:1,musicFit:null,signature:[.2,.2]}];
 const expanded=[...J.directionLayoutSequenceV11(initial,available,()=>true,{p:left.p,f:{change:.9,onset:.8},rows:()=>sameRows})];
 assert(expanded.length>initial.length,'deficient similar portfolio expands live layouts');
 assert.equal([...J.directionLayoutSequenceV11(initial,available,()=>true,{p:left.p,f:{change:0,onset:0},rows:()=>sameRows})].length,initial.length,'stable input preserves frontier');
 assert(selection.traces.some(t=>t.creative.layers.typography.status==='MEASURED'));
 const seedRows=Array.from({length:7},(_,i)=>({layout:'layout'+i,styleKey:'style',score:1-i*.01,signature:Array(16).fill(i/7)}));
 assert(J.directionSeedsV12(seedRows,{change:.9,onset:.9,flux:.9}).length>2,'v12 retains more than two spatial seeds');
 assert(selection.traces.some(t=>t.creative.seedCount>2),'actual optimizer starts from more than two baselines');
 assert(selection.traces.every(t=>Object.hasOwn(t.creative.axes,'acousticFit')&&Object.hasOwn(t.creative.axes,'geometryFit')&&Object.hasOwn(t.creative.axes,'readability')),'independent measurement axes');
 assert(selection.traces.every(t=>t.creative.realization.every(r=>r.mp4==='UNVERIFIED'&&(!r.visible||r.source==='same-time role removal'))),'dispatch/visible/encoding are distinct');
 const noAudio=J.scoreDirectionV11(cutPlaceholder(),{energy:0,brightness:0,length:3,onset:0,change:0},{expressiveVersion:12,status:'UNMEASURED',events:[],motion:0},[],1);
 assert.equal(noAudio.dimensions.acousticFit,null,'geometry never supplies missing acoustic fit');
 function cutPlaceholder(){return left.p.cuts.find(c=>c.line===0);}

 assert(selection.traces.every(t=>t.creative.layers.decorationFX.status==='UNMEASURED'));
 for(const t of selection.traces)for(const [layer,group] of [['background','bg'],['decoration','decor'],['fx','fx']])if(t.creative.layers[layer]?.status==='MEASURED')assert(t.creative.ablations.some(a=>a.group===group&&a.temporalContribution?.status==='MEASURED'),'role layer requires actual same-time ablation');
 const visited=J.directionStyleCandidatesV11(left.p,a,{energy:.5,change:.9,onset:.9,flux:.8,length:8});
 const narrow=[{musicFit:.2,signature:[.2,.2]},{musicFit:.2,signature:[.2,.2]}],extra=J.additionalStylesV112(left.p,a,{energy:.5,change:.9,onset:.9,flux:.8,length:8},narrow,visited);assert(extra.length>0&&extra.every(x=>!visited.some(y=>y.style===x.style)),'weak converged frontier expands beyond old style shortlist');
 assert.equal(J.additionalStylesV112(left.p,a,{change:0,onset:0,flux:0},[{musicFit:1},{musicFit:1},{musicFit:1}],visited).length,0,'adequate stable frontier does not expand');
 assert(J.inspectDirection(left.p).coherent,'v11 per-line inspection');
 const invalidRegistry=copy(left.p);invalidRegistry.cuts[0].cam='missing-camera';assert(!J.inspectDirection(invalidRegistry).coherent);
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
 // A real temporary FX with a resolution-dependent wash demonstrates that the
 // composed final gate rejects a low-raster winner, then selects a safe state.
 const scaleId='v11ScaleContrastRegression',baseScale=copy(left.p.cuts.find(c=>c.line===0));
 J.FXE[scaleId]={name:'test-only scale contrast wash',draw(ctx){if(ctx.canvas.width>256){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='rgba(255,255,255,.9)';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.restore();}}};
 try{
  const low=createCanvas(256,144),lm=createCanvas(256,144),probe=J.createRegistryRenderProbe(left.p,R,low,lm,{production:true}),feature=J.songLineFeaturesV8(left.p,a,baseScale);
  const makeRow=(cut,score)=>{const e=probe(left.p,cut,cut.dur*.5);assert(e.eligible);return {line:cut.line,cut,score,layout:cut.layout,styleKey:cut.styleKey,evidence:e,features:feature,intent:J.songVisualIntentV11(left.p,a,cut),dimensions:copy(selection.traces[0].creative.axes),signature:J.registryInkSignature(e.mask,256,144),typographySignature:J.registryTypographySignature(e.mask,256,144)};};
  const bad=makeRow({...baseScale,registryFxV9:scaleId},2),safe=makeRow(baseScale,1),steps=[{line:baseScale.line,energy:feature.energy,candidates:[bad,safe]}],first=J.chooseRegistryStoryboard(steps,8);
  const gate=await J.confirmDirectionScaleV11(left.p,steps,first,probe,c=>J.directionPhasesV11(left.p,c,a));
  assert(gate.scaleSafety.rejected.length>0);assert.equal(gate.picks[0].cut.registryFxV9,baseScale.registryFxV9);assert.equal(gate.scaleSafety.status,'MEASURED_SAFE_SEQUENCE');
 }finally{delete J.FXE[scaleId];}
 assert(left.p.lines.every((l,i)=>l.start===i*2));assert.equal(selection.artisticQuality,'UNVERIFIED');
 console.log('TEST 3 PASS: real Canvas temporal core, normal echo, missing glyph/contrast/bounds rejection, both aspects and LRC');
 const saved=J.captureSongNativeResolved(left.q,a,left.p),restored=J.plan(copy(left.q),a);assert.equal(saved.version,9);assert.equal(restored.songNativeRestore.status,'RESTORED');assert.equal(J.canonicalJSON(J.songNativeRenderDecisions(restored)),J.canonicalJSON(J.songNativeRenderDecisions(left.p)));
 const compact=J.compactPersistentProjectV111(left.q),compactPlan=J.plan(compact,a);assert.equal(compactPlan.songNativeRestore.status,'RESTORED');J.assertSelectionV9(compactPlan,a);assert.equal(J.canonicalJSON(J.songNativeRenderDecisions(compactPlan)),J.canonicalJSON(J.songNativeRenderDecisions(left.p)));assert(!compact.artDirection.songNativeDirection.selection.traces[0].creative.catalog);assert(selection.traces[0].creative.catalog.length>0,'live diagnostics retained');
 const alt=await J.applyRegistryAlternativeV9(left.q,a,left.p,null,{ensureFonts:false});assert(alt,'independent safe alternative');J.assertSelectionV9(alt,a);J.captureSongNativeResolved(left.q,a,alt);assert.equal(J.plan(copy(left.q),a).songNativeRestore.status,'RESTORED');J.captureSongNativeResolved(left.q,a,left.p);
 const locked=copy(q);for(let i=0;i<3;i++)locked.overrides[i]={lock:true,layout:'center',size:80};const lp=await prepare(a,locked);assert(lp.p.cuts.filter(c=>c.line>=0).every(c=>!c.registrySelectedV8&&c.layout==='center'));assert.equal(lp.p.songNativeDirection.selection.optimizerVersion,11);
 const bad=copy(left.p);bad.songNativeDirection.selection.entries.pop();assert(!J.selectionIntegrityV9(bad,a).ok);assert.throws(()=>J.captureSongNativeResolved(left.q,a,bad),/確定/);
 const before=J.songNativeFixSnapshot(left.q,a,restored);J.fixMVQuality(left.q,{issues:[{code:'motion',fixable:true}]},a);const fixed=J.plan(left.q,a);await J.runSongNativeFixSearch(before,left.q,a,fixed,null,{ensureFonts:false});J.ensureSongNativeDirection(left.q,a,fixed);J.captureSongNativeResolved(left.q,a,fixed);assert.equal(J.plan(copy(left.q),a).songNativeRestore.status,'RESTORED');
 for(const mode of ['fast','quality']){const x=copy(left.q);x.exportSettings.refinementMode=mode;assert.equal(J.resolveExportSettings(x).refinementMode,mode);}
 const quality=J.checkMVQuality(left.q,fixed,a,null,null).quality;assert.equal(quality.creativeScore,null);assert.equal(quality.socialScore,null);
 console.log('TEST 4 PASS: exact v11 save/restore, independent alternative, locks, repair finalization, invalid state and export modes');
 const report={counts,registered:index.length,techniques:index.length-counts.style,framesCompared:selection.framesCompared,lines:selection.traces.map(t=>({line:t.line,counts:t.creative.counts,compared:t.creative.compared,interactions:t.creative.interactions,ablations:t.creative.ablations})),audit:selection.traces.map(t=>({line:t.line,seedCount:t.creative.seedCount,hold:t.creative.hold,envelope:t.creative.envelope,axes:t.creative.axes,realization:t.creative.realization,canvasCompared:t.creative.catalog.filter(x=>x.probed).map(x=>({group:x.group,id:x.id,safe:x.safe}))})),selected:selection.entries.map(e=>({line:e.line,style:e.cut.styleKey,layout:e.cut.layout,enter:e.cut.enter,hold:e.cut.hold,exit:e.cut.exit,cam:e.cut.cam,bg:e.cut.bg,treat:e.cut.treat,decor:e.cut.decor,fx:e.cut.registryFxV9,trans:e.cut.trans})),artisticQuality:'UNVERIFIED',assets:'Synthetic 6s acoustic order + Japanese repeated lyrics + generated background; supplied real assets validated separately'};
 R.disposeAssets?.();return report;
}
module.exports=runDirectionTestsV11;

// TEST 2: three short windows on identical inputs. Metrics share this observer;
// neither algorithm's private score is used to declare an artistic winner.
module.exports.compare=async function compareDirectionV12({mode}){
 const J=window.J;J.enableSingleBackgroundMode();
 const q=J.defaultProject();q.seed=12812;q.res=360;q.fps=24;q.timing.snap=false;q.lyrics='[00:00]光へ歩こう\n[00:02]光へ歩こう';
 const image=Object.assign(document.createElement('canvas'),{width:320,height:180}),ix=image.getContext('2d');ix.fillStyle='#10243c';ix.fillRect(0,0,320,180);ix.fillStyle='#657380';ix.fillRect(240,0,80,180);
 q.customBg={...q.customBg,enabled:true,dataUrl:image.toDataURL()};J.applyImagePalette(q,J.analyzeCustomBackground(image,q),{palette:true,readability:true,mood:false});
 const rows=Array.from({length:32},(_,i)=>({time:i/8,energy:.5,onset:(i<16?i%8===4:i%4===1)?.9:.05,spectralFlux:(i<16?i%8===4:i%4===1)?.8:.02,brightness:.5,bass:.3}));
 const a={duration:4,bpm:120,energyRate:8,energy:new Float32Array(32).fill(.5),onset:Float32Array.from(rows.map(r=>r.onset)),features:{energy:.5,timeline:rows,detailedTimeline:rows}};
 const originalProject=J.clonePhotoRenderPlan(q);
 if(mode==='random'){Object.assign(q,J.omakase(q,J.rng(12812)));q.autoDirection=false;}
 else{const set=await J[['v13','random-repaired'].includes(mode)?'generateJizuraDirectionV13':mode==='v12'?'generateJizuraDirectionV12':'generateJizuraDirectionV11'](q,a);q.autoDirection=true;q.artDirection=J.makeArtDirection(q,a,set.recommended.proposal);q.fonts={...q.artDirection.typography};}
 const p=J.plan(q,a),proposalGenerator=J.explorationProposalV13;
 if(mode==='random-repaired')J.explorationProposalV13=(plan,c,index,ordinal)=>{
  const input=J.clonePhotoRenderPlan(originalProject);Object.assign(input,J.omakase(input,J.rng(J.h(input.seed,ordinal,130))));input.autoDirection=false;input.artDirection=null;
  const random=J.plan(input,a),source=random.cuts.find(x=>x.line===c.line);if(!source)return null;
  const cut={...J.clonePhotoRenderPlan(source),style:random.style,styleKey:random.styleKey,registrySelectedV8:true};return {cut,mode:'fresh'};
 };
 if(mode!=='random')try{await J.searchSongNativeCandidates(p,null,a,{ensureFonts:false});}catch(error){if(mode==='random-repaired'&&/^V13_NO_SAFE_EXPLORATION_LINE/.test(error.message))return {mode,status:'NO_SAFE_CANDIDATE',diagnostic:error.diagnostic,framesCompared:error.diagnostic?.framesCompared??null,artisticQuality:'UNVERIFIED',input:'same fixed 4s synthetic audio/image/lyrics/seed',sheet:document.createElement('canvas').toDataURL()};console.error(JSON.stringify(error.diagnostic||{}));throw error;}finally{J.explorationProposalV13=proposalGenerator;}
 const R=new J.Renderer();await R.loadCustomBackground(q.customBg.dataUrl);
 const cv=Object.assign(document.createElement('canvas'),{width:256,height:144}),mask=Object.assign(document.createElement('canvas'),{width:256,height:144});
 const probe=J.createCreativeProbeV10(J.createRegistryRenderProbe(p,R,cv,mask,{production:true}),cv),measurements=[],distance=(a,b)=>a.reduce((sum,v,i)=>sum+Math.abs(v-b[i]),0)/a.length;
 let holdModulation=null;
 if(mode==='v12'){
  const c=p.cuts.find(c=>c.line===0),intent=J.songVisualIntentV11(p,a,c),curve=J.directionHoldEnvelopeV12(intent,c),base=J.changeDirectionRoleV11(c,'hold','breathe');
  if(!curve)throw Error('missing input-derived hold envelope');
  const observations=[.4,.9,1.4].map(t=>{const actual=probe(p,{...base,expressiveEnvelopeV12:curve},t),control=probe(p,base,t);return {time:t,safe:actual.eligible&&control.eligible,difference:distance(actual.raster,control.raster)};});
  if(!observations.every(e=>e.safe)||!observations.some(e=>e.difference>1e-6))throw Error('hold envelope must affect real safe production pixels');
  holdModulation={status:'MEASURED',observations,scope:'same registered breathe hold with/without acoustic modulation; comparison candidate, not necessarily selected'};
 }
 const sheet=Object.assign(document.createElement('canvas'),{width:768,height:144}),sx=sheet.getContext('2d');
 for(const c of p.cuts.filter(c=>c.line>=0)){
  const times=[.3,.55,.85,1.15,1.45,1.8].filter(t=>t<c.dur),checks=times.map(t=>probe(p,c,t)),pairs=checks.slice(1).map((b,i)=>({dt:times[i+1]-times[i],difference:distance(b.raster,checks[i].raster),audio:rows.filter(r=>r.time>=c.start+times[i]&&r.time<c.start+times[i+1])}));
  const valid=pairs.filter(x=>x.audio.length),v=valid.map(x=>x.difference/x.dt),a=valid.map(x=>x.audio.reduce((sum,r)=>sum+r.onset*.5+r.spectralFlux*.3+r.energy*.2,0)/x.audio.length),maxV=Math.max(0,...v),maxA=Math.max(0,...a);
  measurements.push({line:c.line,times,safety:checks.every(e=>e.eligible),readable:checks.every(e=>e.readable??e.eligible),sampledStagnationSeconds:pairs.filter(x=>x.difference<=1e-6).reduce((sum,x)=>sum+x.dt,0),temporalAlignment:maxV>1e-6&&maxA-Math.min(...a)>.02?1-v.reduce((sum,x,i)=>sum+Math.abs(x/maxV-a[i]/maxA),0)/v.length:null,hold:c.hold,cam:c.cam,layout:c.layout,envelope:!!c.expressiveEnvelopeV12,safeSampleCount:checks.filter(e=>e.eligible).length,sampleCount:checks.length,meanHeight:checks.reduce((sum,e)=>sum+e.height,0)/checks.length,primarySignature:J.registryInkSignature(checks[0].mask,256,144),typographySignature:J.registryTypographySignature(checks[0].mask,256,144),primaryTemporalChange:checks.slice(1).reduce((sum,e,i)=>sum+(J.registryInkDistance(J.registryInkSignature(e.mask,256,144),J.registryInkSignature(checks[i].mask,256,144))||0),0)/Math.max(1,checks.length-1),primaryTemporalAlignment:mode==='random'?null:J.scoreExplorationV13(c,J.songLineFeaturesV8(p,a,c),J.songVisualIntentV11(p,a,c),checks,p).dimensions.primaryTemporalAlignment});
 }
 for(const [i,t] of [.3,1.15,2.55].entries()){R.frame(cv.getContext('2d'),p,t,{scale:256/p.W,production:true,noHud:true});sx.drawImage(cv,i*256,0);}
 const selection=p.songNativeDirection?.selection;window.comparisonV12={q,p,a};
 const geometryChanges=measurements.slice(1).map((m,i)=>({from:measurements[i].line,to:m.line,spatial:J.registryInkDistance(measurements[i].primarySignature,m.primarySignature),typography:J.registryInkDistance(measurements[i].typographySignature,m.typographySignature)}));
 const result={mode,holdModulation,geometryChanges,visualArc:selection?.visualArc??null,finalDispatchObservations:selection?.entries.flatMap(e=>(e.phaseEvidence||[]).flatMap(x=>x.registryDispatchV11||[])).length??null,source:mode==='old'?'immutable 9950f14':'working source',input:'4s synthetic fixed mean energy; onset repetition changes at repeated Japanese lyric; generated asymmetric background',windows:[.3,1.15,2.55],measurements,framesCompared:selection?.framesCompared??null,techniqueAudit:selection?.traces.map(t=>({line:t.line,counts:t.creative.counts,axes:t.creative.axes,exploration:t.creative.explorationVersion?{origins:t.creative.origins,archive:t.creative.archive,repairs:t.creative.repairs,compared:t.creative.compared,budget:t.creative.budget}:null,hold:t.creative.hold,envelope:t.creative.envelope,realization:t.creative.realization}))??null,selected:selection?.entries.map(e=>({line:e.line,layout:e.cut.layout,hold:e.cut.hold,cam:e.cut.cam,bg:e.cut.bg,treat:e.cut.treat}))??null,artisticQuality:'UNVERIFIED',sheet:sheet.toDataURL('image/png')};
 R.disposeAssets?.();return result;
};
