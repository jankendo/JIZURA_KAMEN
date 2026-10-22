'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs');
const {engine}=require('./custom_test_support.cjs');
(async()=>{
 const {J,createCanvas}=engine(),copy=x=>JSON.parse(JSON.stringify(x));J.enableSingleBackgroundMode();
 const q=J.defaultProject();q.lyrics='[00:00]光\n[00:02]同じ空を見上げて\n[00:04]遠い街の向こうへ歩こう';
 const image=createCanvas(160,90),ix=image.getContext('2d');ix.fillStyle='#10243c';ix.fillRect(0,0,160,90);ix.fillStyle='#657380';ix.fillRect(120,0,40,90);
 q.customBg={...q.customBg,enabled:true,dataUrl:image.toDataURL()};J.applyImagePalette(q,J.analyzeCustomBackground(image,q),{palette:true,readability:true,mood:false});
 const synth=order=>{const rows=order.flatMap((v,i)=>Array.from({length:8},(_,j)=>({time:i*2+j*.25,energy:.5,onset:v,brightness:v,bass:1-v,spectralFlux:j===4?v:0,logBands:[v,1-v,v,0,0,1-v]})));return {duration:6,bpm:120,energyRate:4,energy:new Float32Array(24).fill(.5),onset:Float32Array.from(rows.map(r=>r.onset)),features:{energy:.5,timeline:rows,detailedTimeline:rows}};};
 const a=synth([.05,.85,.05]),b=synth([.85,.05,.05]);
 const prepare=async(audio,input=q,search=true)=>{const source=copy(input),set=await J.generateJizuraDirectionV8(source,audio);source.autoDirection=true;source.artDirection=J.makeArtDirection(source,audio,set.recommended.proposal);source.fonts={...source.artDirection.typography};const p=J.plan(source,audio);if(search)await J.searchSongNativeCandidates(p,null,audio,{ensureFonts:false});return {q:source,p};};
 const left=await prepare(a),selection=left.p.songNativeDirection.selection;
 // 1: actual registry dispatch and matching UI, not renamed v7 trajectories.
 assert(J.validSongNativeDirection(left.p.songNativeDirection));assert(selection.traces.every(t=>t.layoutCandidates.length>1&&t.safeCount>0));
 assert(new Set(left.p.cuts.filter(c=>c.line>=0).map(c=>c.layout)).size>1,'fixture fits genuinely different existing layouts');
 assert(left.p.cuts.filter(c=>c.line>=0).every(c=>c.layout!=='songGrammarV7'&&!c.generatedMotionV7));
 assert(selection.traces.some(t=>t.motionAttempts.some(m=>m.group==='hold'&&m.id!=='still')));
 const R=new J.Renderer();await R.loadCustomBackground(q.customBg.dataUrl);const cv=createCanvas(256,144),mask=createCanvas(256,144),sample=J.createRegistryRenderProbe(left.p,R,cv,mask,{production:true});
 const calls={layout:0,enter:0,hold:0},cut=left.p.cuts.find(c=>c.line===1),hooks=[];
 for(const [g,key] of [['layout','render'],['enter','apply'],['hold','apply']]){const d=J.registry(g)[cut[g]],fn=d[key];hooks.push(()=>d[key]=fn);d[key]=function(...args){calls[g]++;return fn.apply(this,args);};}
 const pristine=J.canonicalJSON(left.p);try{assert(sample(left.p,cut,.001).eligible);assert(sample(left.p,cut,cut.dur*.5).eligible);}finally{hooks.reverse().forEach(f=>f());}
 assert.equal(J.canonicalJSON(left.p),pristine,'production rendering must not mutate confirmed decisions');assert(calls.layout>0&&calls.hold>0);if(cut.enter!=='cut')assert(calls.enter>0);assert.equal(J.describeJizuraDirectionV8(left.p,cut).hold,J.HOLD[cut.hold].name);
 const ui=fs.readFileSync('src/12_ui.js','utf8');assert(ui.includes('J.generateJizuraDirectionV12(')&&ui.includes('J.describeJizuraDirectionV8?.(S.plan,cut)'));
 console.log('TEST 1 PASS: registry candidates, different safe layouts, actual layout/enter/hold dispatch and cut-backed UI');
 // 2: same loudness/BPM, changed temporal order, deterministic results and locks.
 const right=await prepare(b);assert.equal(a.bpm,b.bpm);assert.deepEqual(a.energy,b.energy);
 assert.notEqual(J.canonicalJSON(selection.traces.map(t=>t.motionAttempts)),J.canonicalJSON(right.p.songNativeDirection.selection.traces.map(t=>t.motionAttempts)));
 const again=await prepare(a);assert.equal(J.canonicalJSON(selection),J.canonicalJSON(again.p.songNativeDirection.selection));
 assert(selection.traces.every(t=>t.acoustics&&t.candidates.every(c=>Number.isFinite(c.score))));
 const manual=copy(left.q);manual.overrides[0]={lock:true,layout:'center',size:80};const locked=await prepare(a,manual);assert(locked.p.cuts.filter(c=>c.line===0).every(c=>!c.registrySelectedV8&&c.layout==='center'));
 const controller=new AbortController();controller.abort();await assert.rejects(J.searchSongNativeCandidates(left.p,null,a,{signal:controller.signal}),e=>e.name==='AbortError');
 console.log('TEST 2 PASS: acoustic order affects fit, deterministic sequence, reasons, cancellation and manual locks');
 // 3: complete actual Japanese glyphs + safe bounds + contrast at all three phases.
 for(const aspect of ['16:9','9:16']){const p=aspect==='16:9'?left.p:(await prepare(a,{...q,aspect})).p;const canvas=createCanvas(256,Math.round(256*p.H/p.W)),m=createCanvas(canvas.width,canvas.height),probe=J.createRegistryRenderProbe(p,R,canvas,m,{production:true});for(const c of p.cuts.filter(c=>c.line>=0))for(const dt of [.001,c.dur*.5,c.dur-.015]){const e=probe(p,c,dt);assert(e.full&&e.safe&&e.eligible,JSON.stringify({aspect,line:c.line,dt,e:{...e,mask:undefined}}));}}
 const knots=[0,1,2,3].map(time=>({time,state:{x:time*.1,y:.5}})),at=t=>J.interpolateSongTrajectoryV8(knots,t).x,h=.0001;for(const t of [1,2]){assert(Math.abs((at(t)-at(t-h))/h-(at(t+h)-at(t))/h)<.001);assert(Math.abs(at(t+h)-at(t-h))<.001);}
 const evidence=await J.collectSongGrammarEvidenceV5(left.p,null);assert.equal(evidence.contractVersion,'kamen-jizura-direction-quality-8');assert.equal(evidence.metrics.typography.status,'MEASURED');assert.equal(evidence.metrics.typography.score,100);assert.equal(evidence.artisticQuality,'UNVERIFIED');assert.equal(J.measureJizuraDirectionV8(left.p).metrics.typography.status,'UNMEASURED');
 console.log('TEST 3 PASS: production Canvas full lyrics, contrast, safe area, two aspects, C1 interpolation and honest measurement states');
 // 4: exact saved decisions, legacy routes, identity and repair finalization.
 const saved=J.captureSongNativeResolved(left.q,a,left.p),round=J.plan(copy(left.q),a);assert.equal(saved.version,8);assert.equal(round.songNativeRestore.status,'RESTORED');assert.equal(J.canonicalJSON(J.songNativeRenderDecisions(round)),J.canonicalJSON(J.songNativeRenderDecisions(left.p)));
 const id=J.songNativeInputIdentity(left.q,a);left.q.lastPixelQA={test:true};left.q.renderFeedbackRequested=true;assert.equal(J.songNativeInputIdentity(left.q,a),id);assert.notEqual(J.songNativeInputIdentity({...left.q,lyrics:left.q.lyrics+'空'},a),id);
 const before=J.songNativeFixSnapshot(left.q,a,round);J.fixMVQuality(left.q,{issues:[{code:'motion',fixable:true}]},a);const fixed=J.plan(left.q,a);await J.runSongNativeFixSearch(before,left.q,a,fixed,null,{ensureFonts:false});J.ensureSongNativeDirection(left.q,a,fixed);J.captureSongNativeResolved(left.q,a,fixed);assert.equal(J.plan(copy(left.q),a).songNativeRestore.status,'RESTORED');
 for(const version of [3,4,5,6,7]){const legacy=copy(q);let proposal;if(version===3)proposal=J.proposeDirection(legacy,a,null);else proposal=(await J[version===7?'generateSongCausalCompositionV7':`generateSongVisualGrammarV${version}`](legacy,a)).recommended.proposal;Object.assign(legacy,{style:proposal.style,mood:proposal.mood,fx:proposal.fx,enabled:proposal.enabled,seed:proposal.seed,overrides:proposal.overrides,autoDirection:true});legacy.artDirection=J.makeArtDirection(legacy,a,proposal);legacy.fonts={...legacy.artDirection.typography};const p=J.plan(legacy,a);J.captureSongNativeResolved(legacy,a,p);const restored=J.plan(copy(legacy),a);assert.equal(restored.songNativeDirection.version,version);assert.equal(restored.songNativeRestore.status,'RESTORED');}
 assert(left.p.lines.every((l,i)=>l.start===i*2));for(const mode of ['fast','quality']){const x=copy(left.q);x.exportSettings.refinementMode=mode;assert.equal(J.resolveExportSettings(x).refinementMode,mode);}
 R.disposeAssets?.();console.log('TEST 4 PASS: v8 and v3-v7 restore, stable identities, manual locks, LRC, repair finalization and export modes');
})().catch(e=>{console.error(e);process.exitCode=1;});
