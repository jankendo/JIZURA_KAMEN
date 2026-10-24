'use strict';
// Four bounded contract checks; real Canvas, no encode or benchmark.
const assert=require('node:assert/strict'),fs=require('node:fs');
const {engine}=require('./custom_test_support.cjs');
(async()=>{
 const {J,createCanvas}=engine(),copy=x=>JSON.parse(JSON.stringify(x));J.enableSingleBackgroundMode();
 const project=J.defaultProject(),phrase='同じ空を見上げて遠い光の先へ歩いていこう';
 project.lyrics=[0,3,6,9].map(t=>`[00:${String(t).padStart(2,'0')}]${phrase}`).join('\n');
 const image=createCanvas(160,90),ix=image.getContext('2d');ix.fillStyle='#10243c';ix.fillRect(0,0,160,90);ix.fillStyle='#597887';ix.fillRect(105,0,55,90);ix.fillStyle='#b4c8aa';ix.fillRect(115,14,14,64);
 project.customBg={...project.customBg,enabled:true,dataUrl:image.toDataURL('image/png')};J.applyImagePalette(project,J.analyzeCustomBackground(image,project),{palette:true,readability:true,mood:false});
 const A={energy:.5,onset:.1,frequency:220},B={energy:.5,onset:.7,frequency:1760},S={energy:0,onset:0,frequency:0};
 const synth=order=>{const energy=Float32Array.from(order.flatMap(k=>Array(150).fill(k.energy))),onset=Float32Array.from(order.flatMap(k=>Array(150).fill(k.onset))),pcm=Float32Array.from({length:96000},(_,i)=>Math.sin(i/8000*Math.PI*2*order[Math.floor(i/24000)].frequency)*.2);return {duration:12,bpm:120,energyRate:50,energy,onset,rms:Float32Array.from(order.flatMap(k=>Array(150).fill(k===S?0:.04))),features:{energy:.5,...J.spectralTimeline(pcm,8000,energy,onset,12,.4)}};};
 const a=synth([A,B,A,B]),b=synth([A,A,B,B]);
 const prepare=async(audio,input=project)=>{const q=copy(input),set=await J.generateSongCausalCompositionV7(q,audio);q.autoDirection=true;q.artDirection=J.makeArtDirection(q,audio,set.recommended.proposal);q.fonts={...q.artDirection.typography};return {q,p:J.plan(q,audio),set};};
 const left=await prepare(a),right=await prepare(b),R=new J.Renderer();await R.loadCustomBackground(project.customBg.dataUrl);
 const render=(p,t)=>{const w=256,h=Math.round(w*p.H/p.W),cv=createCanvas(w,h),mask=createCanvas(w,h),ctx=cv.getContext('2d'),mc=mask.getContext('2d'),items=[],texts=[],draw=J.mainDraw;J.mainDraw=(env,it)=>{if(env.pass==='main')texts.push(it.text);return draw(env,it);};try{R.frame(ctx,p,t,{scale:w/p.W,production:true,lyricAuditCtx:mc,lyricAuditItems:items});}finally{J.mainDraw=draw;}const rgba=ctx.getImageData(0,0,w,h).data,ink=mc.getImageData(0,0,w,h).data;return {time:t,features:J.observePixelFrame(rgba,w,h,ink),ink:Buffer.from(ink),rgba:Buffer.from(rgba),texts,geometry:J.selectionPixelEvidence(rgba,ink,w,h,items.map(i=>i.bounds).filter(Boolean),p.W,p.H)};};
 // 1. Actual cut motion changes raster; low-level compatibility names cannot be
 // used to infer the v7 animation. Locks keep the existing manual layout.
 assert(J.validSongNativeDirection(left.p.songNativeDirection));
 assert(left.p.cuts.filter(c=>c.line>=0).every(c=>c.generatedMotionV7&&c.layout==='songGrammarV7'));
 assert(new Set(left.p.songNativeDirection.motions.map(m=>J.canonicalJSON(m.knots.map(k=>k.state)))).size>1);
 const motionCut=left.p.cuts.find(c=>c.generatedMotionV7?.evidence.entryImportance>.01);
 const pristine=J.canonicalJSON(left.p);assert(motionCut);assert(!render(left.p,motionCut.start+.001).ink.equals(render(left.p,motionCut.generatedMotionV7.entryEnd).ink),'numeric entry state reaches the real Renderer');assert.equal(J.canonicalJSON(left.p),pristine,'preview rendering cannot mutate the confirmed plan');
 const locked=copy(left.q);locked.overrides[0]={lock:true,layout:'center',size:80};const lockedPlan=J.plan(locked,a);assert(lockedPlan.cuts.filter(c=>c.line===0).every(c=>c.layout!=='songGrammarV7'&&!c.generatedMotionV7));
 const ui=fs.readFileSync('src/12_ui.js','utf8');assert(ui.includes('J.describeSongCompositionV7?.(S.plan,cut)'));assert(ui.includes('J.generateRandomDraftV16('));assert(J.describeSongCompositionV7(left.p,motionCut).entry==='数値軌道');
 console.log('TEST 1 PASS: numeric cut motion reaches Canvas, honest UI and manual locks');
 // 2. Distinct geometry, deterministic multistart, duplicate removal and Stage A/B.
 assert(left.set.candidates.length>1&&left.set.candidates.length<=8);
 const setAgain=await J.generateSongCausalCompositionV7(copy(project),a);assert.equal(J.canonicalJSON(left.set),J.canonicalJSON(setAgain));
 const duplicated=left.set.candidates.map(c=>({direction:c.proposal.grammarDirection}));assert.equal(J.distinctSongCompositionsV7([duplicated[0],duplicated[0],...duplicated]).length,duplicated.length);
 const alt=copy(left.p);alt.songNativeDirection=copy(left.set.candidates[1].proposal.grammarDirection);assert(!render(left.p,1).ink.equals(render(alt,1).ink),'different numeric solutions produce different glyph geometry');
 await J.searchSongNativeCandidates(left.p,null,a);const o=left.p.songNativeDirection.optimization;assert(o.candidateCount>1&&o.canvasComparedCount>1&&o.canvasComparedCount<=3);assert(o.canvasSafeCount>0);
 const winner=o.candidates.find(c=>c.id===o.selectedId);assert(winner.numericSafe&&winner.canvas.safe);assert(o.candidates.some(c=>c.canvas.status==='NOT_OBSERVED'));assert(o.candidates.filter(c=>c.canvas.safe).every(c=>c.utility<=winner.utility));
 const reproducible=await prepare(a);await J.searchSongNativeCandidates(reproducible.p,null,a);assert.equal(J.canonicalJSON(left.p.songNativeDirection),J.canonicalJSON(reproducible.p.songNativeDirection));
 const cancelled=new AbortController();cancelled.abort();await assert.rejects(J.searchSongNativeCandidates(left.p,null,a,{signal:cancelled.signal}),e=>e.name==='AbortError');
 console.log('TEST 2 PASS: distinct reproducible candidates, deduplication, bounded Canvas and safe best selection');
 // 3. Same loudness/BPM/image/lyrics; different acoustic structure. Local sweep
 // supplies genuine internal change events for paired observation tests.
 assert.equal(a.bpm,b.bpm);assert.equal([...a.energy].reduce((x,y)=>x+y),[...b.energy].reduce((x,y)=>x+y));
 assert.notEqual(J.canonicalJSON(left.p.songNativeDirection.trajectory),J.canonicalJSON(right.p.songNativeDirection.trajectory));
 assert([1,4,7,10].filter(t=>!render(left.p,t).ink.equals(render(right.p,t).ink)).length>=2);
 const energy=Float32Array.from({length:600},(_,i)=>.5+.22*Math.sin(i*.08)),onset=Float32Array.from({length:600},(_,i)=>.5+.2*Math.sin(i*.142)),pcm=Float32Array.from({length:96000},(_,i)=>Math.sin(2*Math.PI*(220*i/8000+160*Math.sin(i/8000*2)))*(.18+.06*Math.sin(i/8000*4)));
 const internalAudio={...a,energy,onset,features:J.spectralTimeline(pcm,8000,energy,onset,12,.4)},internal=await prepare(internalAudio),times=J.selectSongGrammarObservationTimesV7(internal.p,null);
 assert(times.length<=64);const events=internal.p.songNativeDirection.trajectory.knots.filter(k=>k.reason==='measured-local-change'&&times.includes(k.transitionStart)&&times.includes(k.time));assert(events.length);
 const e=events.find(e=>Math.floor(e.transitionStart/3)===Math.floor(e.time/3));assert(e);assert(times.includes(e.acousticTime));assert(Math.abs((e.transitionStart+e.time)/2-e.acousticTime)<1e-6);
 const f=render(internal.p,e.transitionStart),g=render(internal.p,e.time);assert(!f.ink.equals(g.ink));
 const observed=await J.collectSongGrammarEvidenceV5(internal.p,null);assert.equal(observed.contractVersion,'kamen-song-composition-quality-7');assert.equal(observed.metrics.background.status,'MEASURED');assert(observed.metrics.background.evidence.every(r=>r.error<.01));assert.equal(observed.metrics.temporal.status,'MEASURED');assert(observed.metrics.temporal.evidence[0].events.some(e=>e.covered&&e.observedChange>0));
 const missing=J.measureSongGrammarV5(internal.p,[f],null);assert.equal(missing.metrics.temporal.status,'UNMEASURED');
 const frozen=render(internal.p,e.transitionStart),staticRows=times.map(t=>({...frozen,time:t})),staticReport=J.measureSongGrammarV5(internal.p,staticRows,null);assert.equal(staticReport.metrics.temporal.score,0,'stationary observed raster never earns event correspondence');
 const rest=await prepare(synth([A,B,S,A])),quiet=rest.p.songNativeDirection.sections.find(s=>s.quietIntent);assert(quiet);const t=quiet.start+.4;assert(render(rest.p,t).rgba.equals(render(rest.p,t+.3).rgba));
 console.log('TEST 3 PASS: song causality, real glyph changes, centered paired event coverage and measured stillness');
 // 4. Full grapheme order, synchronization, safe bounds, schema and exact restore.
 for(const aspect of ['16:9','9:16']){const p=J.plan({...left.q,aspect},a),f=render(p,1);assert(p.lines.every((l,i)=>l.start===i*3&&l.text===phrase));assert.equal(f.texts.join('').replace(/\s/g,''),phrase);assert(f.geometry.safe);}
 const id=J.songNativeInputIdentity(left.q,a);left.q.renderFeedbackRequested=true;left.q.lastPixelQA={diagnostic:true};left.q.artDirection.songNativeDirection.optimization={temporary:true};assert.equal(J.songNativeInputIdentity(left.q,a),id);
 const changedAudio={...a,features:{...a.features,timeline:[{time:0,energy:.1}]}};assert.notEqual(J.songNativeInputIdentity(left.q,changedAudio),id);
 const saved=J.captureSongNativeResolved(left.q,a,left.p),round=J.plan(copy(left.q),a);assert.equal(saved.version,7);assert.equal(saved.rendererCompatibilityId,'kamen-song-grammar-renderer-7');assert.equal(round.songNativeRestore.status,'RESTORED');assert.equal(J.canonicalJSON(J.songNativeRenderDecisions(round)),J.canonicalJSON(J.songNativeRenderDecisions(left.p)));assert.equal(round.songNativeDirection.optimization.selectedId,o.selectedId);
 const before=J.songNativeFixSnapshot(left.q,a,round);J.fixMVQuality(left.q,{issues:[{code:'motion',fixable:true}]},a);const fixed=J.plan(left.q,a);await J.runSongNativeFixSearch(before,left.q,a,fixed,null);J.ensureSongNativeDirection(left.q,a,fixed);J.captureSongNativeResolved(left.q,a,fixed);assert.equal(J.plan(copy(left.q),a).songNativeRestore.status,'RESTORED');assert.equal(fixed.songNativeDirection.optimization.selectedId,o.selectedId);
 for(const version of [4,5,6]){const q=copy(project),set=await J[`generateSongVisualGrammarV${version}`](q,a);q.autoDirection=true;q.artDirection=J.makeArtDirection(q,a,set.recommended.proposal);q.fonts={...q.artDirection.typography};const p=J.plan(q,a);J.captureSongNativeResolved(q,a,p);assert.equal(J.plan(copy(q),a).songNativeDirection.version,version);assert.equal(J.plan(copy(q),a).songNativeRestore.status,'RESTORED');}
 for(const mode of ['fast','quality']){const q=copy(left.q);q.exportSettings.refinementMode=mode;assert.equal(J.resolveExportSettings(q).range,'full');}
 assert.equal(observed.artisticQuality,'UNVERIFIED');assert.equal(observed.metrics.backgroundMusicFit.status,'UNMEASURED');
 R.disposeAssets?.();console.log('TEST 4 PASS: Japanese LRC/order/timing, two aspects, v7 and legacy restore, fix finalization and export settings');
})().catch(e=>{console.error(e);process.exitCode=1;});
