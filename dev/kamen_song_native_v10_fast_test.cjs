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
 const prepare=async(audio,input=q,search=true)=>{const source=copy(input),set=await J.generateJizuraDirectionV10(source,audio);source.autoDirection=true;source.artDirection=J.makeArtDirection(source,audio,set.recommended.proposal);source.fonts={...source.artDirection.typography};const p=J.plan(source,audio);if(search)await J.searchSongNativeCandidates(p,null,audio,{ensureFonts:false});return {q:source,p};};
 const cacheCanvas=createCanvas(20,12);let probeCalls=0;const cached=J.createCreativeProbeV10(()=>{probeCalls++;return {eligible:true};},cacheCanvas),context={styleKey:'x',cuts:[],W:20,H:12},testCut={line:0};
 cached(context,testCut,.5);cached(context,testCut,.5);assert.equal(probeCalls,1);
 context.cuts=[{hold:'breathe'}];cached(context,testCut,.5);assert.equal(probeCalls,2,'composed sequence changes must invalidate every role');cached.clear();cached(context,testCut,.5);assert.equal(probeCalls,3);
 const draft=await prepare(a,q,false);assert.equal(draft.p.songNativeDirection.status,'DRAFT');assert.throws(()=>J.captureSongNativeResolved(draft.q,a,draft.p),/確定/);
 const left=await prepare(a),selection=left.p.songNativeDirection.selection;J.assertSelectionV9(left.p,a);
 const broken=copy(left.p);broken.songNativeDirection.selection.entries.pop();assert.equal(J.selectionIntegrityV9(broken,a).ok,false);assert.throws(()=>J.captureSongNativeResolved(left.q,a,broken),/確定/);
 // 1: actual registry dispatch and matching UI, not renamed v7 trajectories.
 assert(J.validSongNativeDirection(left.p.songNativeDirection));assert(selection.traces.every(t=>t.layoutCandidates.length>1&&t.safeCount>0));
 assert(new Set(left.p.cuts.filter(c=>c.line>=0).map(c=>c.layout)).size>1,'fixture fits genuinely different existing layouts');
 assert(left.p.cuts.filter(c=>c.line>=0).every(c=>c.layout!=='songGrammarV7'&&!c.generatedMotionV7));
 assert.equal(selection.optimizerVersion,10);assert(selection.traces.every(t=>t.creative.compared>1));assert(selection.traces.some(t=>t.creative.ablations.some(x=>x.pixelDifference>1e-6)));assert.equal(selection.entries.find(e=>e.line===0).cut.hold,'still');assert.notEqual(selection.entries.find(e=>e.line===1).cut.hold,'still');assert(selection.traces.some(t=>t.creative.ablations.some(x=>x.fitGain>0&&x.pixelDifference>1e-6)));assert(selection.traces.some(t=>t.creative.interactions.some(x=>x.groups.join('+')==='bg+treat'&&x.status==='MEASURED')));
 const R=new J.Renderer();await R.loadCustomBackground(q.customBg.dataUrl);const cv=createCanvas(256,144),mask=createCanvas(256,144),sample=J.createRegistryRenderProbe(left.p,R,cv,mask,{production:true});
 // Existing breathe + push produce a safe composed improvement over either
 // component alone. Compare identical input/time/aspect in the real renderer.
 const compositeSample=J.createCreativeProbeV10(sample,cv),base=left.p.cuts.find(c=>c.line===0),jointFeatures={onset:.6,flux:.1,change:0,energy:.5,brightness:.5,length:J.graphemes(base.lineText).length};
 const jointScores=[['still','stillCamera'],['breathe','stillCamera'],['still','push'],['breathe','push']].map(([hold,cam])=>{const cut={...copy(base),hold,cam},checks=[.001,.7,1.4,1.985].map(t=>compositeSample(left.p,cut,t));assert(checks.every(e=>e.eligible));return J.scoreCreativeCandidateV10(cut,jointFeatures,checks,.8).score;});
 assert(jointScores[3]>Math.max(jointScores[1],jointScores[2])+1e-6,'joint rendering must improve fit, not just candidate counts');
 const calls={layout:0,enter:0,hold:0},cut=left.p.cuts.find(c=>c.line===1),hooks=[];
 for(const [g,key] of [['layout','render'],['enter','apply'],['hold','apply']]){const d=J.registry(g)[cut[g]],fn=d[key];hooks.push(()=>d[key]=fn);d[key]=function(...args){calls[g]++;return fn.apply(this,args);};}
 const small=left.p.cuts.find(c=>c.line===0);for(const [x,y] of [[.35,.5],[.65,.5],[.5,.3],[.5,.7],[.5,.5]]){const offset={...copy(small),params:{...copy(small.params),photoAnchor:{x,y}}},ev=sample(left.p,offset,small.dur*.5);assert(ev.eligible,'safe intentional placement '+x+','+y);if(x!==.5||y!==.5)assert(ev.centerError>.025);}
 const pristine=J.canonicalJSON(left.p);try{assert(sample(left.p,cut,.001).eligible);assert(sample(left.p,cut,cut.dur*.5).eligible);}finally{hooks.reverse().forEach(f=>f());}
 assert.equal(J.canonicalJSON(left.p),pristine,'production rendering must not mutate confirmed decisions');assert(calls.layout>0&&calls.hold>0);if(cut.enter!=='cut')assert(calls.enter>0);assert.equal(J.describeJizuraDirectionV8(left.p,cut).hold,J.HOLD[cut.hold].name);
 const ui=fs.readFileSync('src/12_ui.js','utf8');assert(ui.includes('J.generateJizuraDirectionV15(')&&ui.includes('J.describeJizuraDirectionV8?.(S.plan,cut)'));
 console.log('TEST 1 PASS: measured contribution, active/quiet fit, real registry dispatch and selected-cut UI');
 // 2: same loudness/BPM, changed temporal order, deterministic results and locks.
 const right=await prepare(b);assert.equal(a.bpm,b.bpm);assert.deepEqual(a.energy,b.energy);
 assert.notEqual(J.canonicalJSON(selection.entries.map(e=>e.cut.hold)),J.canonicalJSON(right.p.songNativeDirection.selection.entries.map(e=>e.cut.hold)));
 assert.notEqual(J.canonicalJSON(selection.traces.map(t=>t.creative)),J.canonicalJSON(right.p.songNativeDirection.selection.traces.map(t=>t.creative)));
 const again=await prepare(a);assert.equal(J.canonicalJSON(selection),J.canonicalJSON(again.p.songNativeDirection.selection));
 assert(selection.traces.every(t=>t.acoustics&&t.candidates.every(c=>Number.isFinite(c.score))));
 const first=selection.traces[0],next=selection.traces[1],sig=first.candidates[0].spatialSignature,other=next.candidates.find(x=>(J.registryInkDistance(sig,x.spatialSignature)??0)>.2).spatialSignature;
 const prev={features:first.acoustics,signature:sig,dimensions:{musicFit:.2,compositionQuality:.8}},stuck={features:next.acoustics,signature:sig,dimensions:{musicFit:.2,compositionQuality:.8}},better={features:next.acoustics,signature:other,dimensions:{musicFit:.9,compositionQuality:.8}};
 assert(J.auditCreativeArcV10([{line:0,candidates:[prev]},{line:1,candidates:[stuck,better]}],[prev,stuck]).requiresReevaluation);
 assert.equal(J.auditCreativeArcV10([{line:0,candidates:[prev]},{line:1,candidates:[stuck]}],[prev,stuck]).requiresReevaluation,false,'no safe improving alternate means no forced variety');
 assert.equal(selection.visualArc.requiresReevaluation,false);
 const manual=copy(left.q);manual.overrides[0]={lock:true,layout:'center',size:80};const locked=await prepare(a,manual);assert(locked.p.cuts.filter(c=>c.line===0).every(c=>!c.registrySelectedV8&&c.layout==='center'));
 const controller=new AbortController();controller.abort();await assert.rejects(J.searchSongNativeCandidates(left.p,null,a,{signal:controller.signal}),e=>e.name==='AbortError');
 console.log('TEST 2 PASS: real joint synergy, bg+treat comparison, acoustic arc, reproducibility, exclusions and locks');
 // 3: complete actual Japanese glyphs + safe bounds + contrast at all three phases.
 for(const aspect of ['16:9','9:16']){const p=aspect==='16:9'?left.p:(await prepare(a,{...q,aspect})).p;const canvas=createCanvas(256,Math.round(256*p.H/p.W)),m=createCanvas(canvas.width,canvas.height),probe=J.createRegistryRenderProbe(p,R,canvas,m,{production:true});for(const c of p.cuts.filter(c=>c.line>=0))for(const dt of [.001,c.dur*.5,c.dur-.015]){const e=probe(p,c,dt);assert(e.full&&e.safe&&e.eligible,JSON.stringify({aspect,line:c.line,dt,e:{...e,mask:undefined}}));}}
 const knots=[0,1,2,3].map(time=>({time,state:{x:time*.1,y:.5}})),at=t=>J.interpolateSongTrajectoryV8(knots,t).x,h=.0001;for(const t of [1,2]){assert(Math.abs((at(t)-at(t-h))/h-(at(t+h)-at(t))/h)<.001);assert(Math.abs(at(t+h)-at(t-h))<.001);}
 assert.equal(J.qualityScoreTextV9({technicalScore:92,overallScore:null,creativeScore:null,socialScore:null}),'総合：未確定 · 技術：92/100 · 創作：未測定 · 本編SNS適性：未測定');
 const evidence=await J.collectSongGrammarEvidenceV5(left.p,null);assert.equal(evidence.metrics.compositionChange.status,'MEASURED');assert.equal(evidence.metrics.background.status,'MEASURED');assert.equal(evidence.metrics.background.score,null);const unmeasured=J.checkMVQuality(left.q,left.p,a,null,null).quality;assert.equal(unmeasured.creativeScore,null);assert.equal(unmeasured.socialScore,null);assert.equal(unmeasured.overallScore,null);assert.equal(unmeasured.domainStates.creative.status,'UNMEASURED');
 assert.equal(evidence.contractVersion,'kamen-jizura-direction-quality-9');assert.equal(evidence.metrics.typography.status,'MEASURED');assert.equal(evidence.metrics.typography.score,100);assert.equal(evidence.artisticQuality,'UNVERIFIED');assert.equal(J.measureJizuraDirectionV8(left.p).metrics.typography.status,'UNMEASURED');
 console.log('TEST 3 PASS: production Canvas full lyrics, contrast, safe area, two aspects, C1 interpolation and honest measurement states');
 // 4: exact saved decisions, legacy routes, identity and repair finalization.
 const saved=J.captureSongNativeResolved(left.q,a,left.p),round=J.plan(copy(left.q),a);assert.equal(saved.version,9);assert.equal(round.songNativeRestore.status,'RESTORED');assert.equal(J.canonicalJSON(J.songNativeRenderDecisions(round)),J.canonicalJSON(J.songNativeRenderDecisions(left.p)));
 const alternative=await J.applyRegistryAlternativeV9(left.q,a,left.p,null,{ensureFonts:false});assert(alternative,'fixture has an independently phase-tested alternate storyboard');if(alternative){J.assertSelectionV9(alternative,a);J.captureSongNativeResolved(left.q,a,alternative);assert.equal(J.plan(copy(left.q),a).songNativeRestore.status,'RESTORED');J.captureSongNativeResolved(left.q,a,left.p);}
 const id=J.songNativeInputIdentity(left.q,a);left.q.lastPixelQA={test:true};left.q.renderFeedbackRequested=true;assert.equal(J.songNativeInputIdentity(left.q,a),id);assert.notEqual(J.songNativeInputIdentity({...left.q,lyrics:left.q.lyrics+'空'},a),id);
 const before=J.songNativeFixSnapshot(left.q,a,round);J.fixMVQuality(left.q,{issues:[{code:'motion',fixable:true}]},a);const fixed=J.plan(left.q,a);await J.runSongNativeFixSearch(before,left.q,a,fixed,null,{ensureFonts:false});J.ensureSongNativeDirection(left.q,a,fixed);J.captureSongNativeResolved(left.q,a,fixed);assert.equal(J.plan(copy(left.q),a).songNativeRestore.status,'RESTORED');
 for(const version of [3,4,5,6,7,8,9]){const legacy=copy(q);let proposal;if(version===3)proposal=J.proposeDirection(legacy,a,null);else proposal=(await J[version===9?'generateJizuraDirectionV9':version===8?'generateJizuraDirectionV8':version===7?'generateSongCausalCompositionV7':`generateSongVisualGrammarV${version}`](legacy,a)).recommended.proposal;Object.assign(legacy,{style:proposal.style,mood:proposal.mood,fx:proposal.fx,enabled:proposal.enabled,seed:proposal.seed,overrides:proposal.overrides,autoDirection:true});legacy.artDirection=J.makeArtDirection(legacy,a,proposal);legacy.fonts={...legacy.artDirection.typography};const p=J.plan(legacy,a);if(version===9)await J.searchSongNativeCandidates(p,null,a,{ensureFonts:false});J.captureSongNativeResolved(legacy,a,p);const restored=J.plan(copy(legacy),a);assert.equal(restored.songNativeDirection.version,version);assert.equal(restored.songNativeRestore.status,'RESTORED');}
 assert(left.p.lines.every((l,i)=>l.start===i*2));for(const mode of ['fast','quality']){const x=copy(left.q);x.exportSettings.refinementMode=mode;assert.equal(J.resolveExportSettings(x).refinementMode,mode);}
 R.disposeAssets?.();console.log('TEST 4 PASS: v10 and v3-v9 restore, stable identities, manual locks, LRC, repair finalization and export modes');
})().catch(e=>{console.error(e);process.exitCode=1;});
