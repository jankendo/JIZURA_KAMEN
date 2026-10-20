'use strict';
const assert=require('node:assert/strict');
const {engine}=require('./custom_test_support.cjs');
(async()=>{
 const {J,createCanvas}=engine(),copy=x=>JSON.parse(JSON.stringify(x));
 J.enableSingleBackgroundMode();
 const q=J.defaultProject();q.lyrics='[00:00]同じ空を見上げる\n[00:03]同じ空を見上げる\n[00:06]同じ空を見上げる\n[00:09]同じ空を見上げる';
 const image=createCanvas(160,90),ix=image.getContext('2d');ix.fillStyle='#132b46';ix.fillRect(0,0,160,90);ix.fillStyle='#283950';ix.fillRect(90,0,70,90);q.customBg={...q.customBg,enabled:true,dataUrl:image.toDataURL('image/png')};
 J.applyImagePalette(q,J.analyzeCustomBackground(image,q),{palette:true,readability:true,mood:false});
 const A={energy:.45,onset:.15,brightness:.1,bass:.8,high:.1,spectralFlux:.1,logBands:[.8,.1,.05,.03,.01,.01]},B={energy:.55,onset:.7,brightness:.85,bass:.1,high:.8,spectralFlux:.65,logBands:[.01,.01,.03,.05,.1,.8]};
 const audio=order=>{
  const energy=Float32Array.from(order.flatMap(k=>Array(150).fill(k.energy))),onset=Float32Array.from(order.flatMap(k=>Array(150).fill(k.onset))),pcm=Float32Array.from({length:96000},(_,i)=>Math.sin(i/8000*Math.PI*2*(order[Math.floor(i/24000)]===A?220:1760))*.2);
  const spectrum=J.spectralTimeline(pcm,8000,energy,onset,12,.4);assert(spectrum.detailedTimeline.every(row=>row.logBands.length===6&&Math.abs(row.logBands.reduce((a,b)=>a+b)-1)<1e-6));
  return {duration:12,bpm:120,energyRate:50,energy,onset,rms:Float32Array.from({length:600},()=>.04),features:{energy:.5,...spectrum}};
 };
 const a=audio([A,B,A,B]),b=audio([A,A,B,B]);
 // Fixed archetype and story entry points must be unreachable, including plan
 // rebuild and quality-fix paths. Replacing their inner selectors catches leaks.
 const legacyProfile=J.songDirectionProfile,legacyArchitecture=J.cinemaArchitectureCandidates;
 J.songDirectionProfile=()=>{throw Error('FIXED_FOUR_MODES');};J.cinemaArchitectureCandidates=()=>{throw Error('FIXED_ARCHITECTURE');};
 const prepare=async audio=>{const project=copy(q),set=await J.generateSongVisualGrammarV4(project,audio);project.autoDirection=true;project.artDirection=J.makeArtDirection(project,audio,set.recommended.proposal);project.fonts={...project.artDirection.typography};return {project,p:J.plan(project,audio)};};
 const left=await prepare(a),right=await prepare(b);
 assert.equal(left.p.songNativeDirection.version,4);assert(!left.p.musicalPhoto);assert(left.p.cuts.filter(c=>c.line>=0).every(c=>c.layout==='songGrammarV4'&&!c.story&&!c.grammar));
 const action=copy(left.project);action.lyrics='[00:00]歩こう\n[00:06]集まれ';assert(J.plan(action,a).cuts.filter(c=>c.line>=0).every(c=>c.layout==='songGrammarV4'&&!c.semanticIntent));
 assert.equal(J.proposeDirection(left.project,a).songNativeDirector,4);
 assert.equal(J.makeArtDirection(left.project,a,J.proposeDirection(left.project,a)).songNativeDirection.version,4);
 console.log('TEST 1 PASS: generation → primitive direction → Planner → no Story/profile/architecture selectors');
 const da=left.p.songNativeDirection,db=right.p.songNativeDirection;
 assert.equal(a.bpm,b.bpm);assert.equal([...a.energy].reduce((x,y)=>x+y),[...b.energy].reduce((x,y)=>x+y));
 assert.notEqual(J.canonicalJSON(da.structure),J.canonicalJSON(db.structure));assert.notEqual(J.canonicalJSON(da.sections),J.canonicalJSON(db.sections));
 const cv=createCanvas(256,144),ctx=cv.getContext('2d'),R=new J.Renderer();await R.loadCustomBackground(q.customBg.dataUrl);
 const renderInput=J.canonicalJSON(left.p);let different=0;
 for(const time of [1,4,7,10]){R.frame(ctx,left.p,time,{scale:256/left.p.W,production:true});const first=Buffer.from(ctx.getImageData(0,0,256,144).data);R.frame(ctx,right.p,time,{scale:256/right.p.W,production:true});if(!first.equals(Buffer.from(ctx.getImageData(0,0,256,144).data)))different++;}
 assert.equal(J.canonicalJSON(left.p),renderInput,'preview must not mutate grammar or cut inputs');
 assert(different>=2,'same lyrics/image, different acoustic structure changes Canvas composition');
 console.log('TEST 2 PASS: equal BPM/mean energy, identical lyrics/background, different SSM/grammar/Canvas');
 assert(da.structure.relations.length>0,'acoustic recurrence discovered');
 const twice=J.buildSongVisualGrammarV4(left.project,a);assert.equal(J.canonicalJSON(twice),J.canonicalJSON(J.buildSongVisualGrammarV4(left.project,a)));
 for(const relation of da.structure.relations){const s=da.sections[relation.to];assert.equal(s.repeatFrom,relation.from);assert(s.repeatSimilarity>.75);}
 const large=J.analyzeSongRecurrenceV4(a,7200);assert(large.sampleCount<=192);assert(!('matrix'in large));
 const missing=J.analyzeSongRecurrenceV4(null,12);assert.equal(missing.status,'UNMEASURED');
 const stop=new AbortController();stop.abort();assert.throws(()=>J.buildSongVisualGrammarV4(q,a,{signal:stop.signal}),e=>e.name==='AbortError');
 console.log('TEST 3 PASS: acoustic repeat links, deterministic geometry, bounded analysis, missing evidence/cancel');
 await J.searchSongNativeCandidates(left.p,{start:0,end:12},a);
 assert(left.p.songNativeDirection.optimization.candidateCount<=3);
 const identity=J.songNativeInputIdentity(left.project,a);left.project.renderFeedbackRequested=true;assert.equal(J.songNativeInputIdentity(left.project,a),identity);
 assert(J.auditDirectionRealization(left.p).ok);assert(J.auditDirectionReality(left.p).ok);
 const saved=J.captureSongNativeResolved(left.project,a,left.p),restored=J.plan(copy(left.project),a);
 assert.equal(saved.version,4);assert.equal(saved.rendererCompatibilityId,'kamen-song-grammar-renderer-4');assert.equal(restored.songNativeRestore.status,'RESTORED');assert.equal(J.canonicalJSON(J.songNativeRenderDecisions(restored)),J.canonicalJSON(J.songNativeRenderDecisions(left.p)));
 const changed=copy(left.project);changed.lyrics+='空';assert.equal(J.plan(changed,a).songNativeRestore.status,'REJECTED');assert.throws(()=>J.captureSongNativeResolved(changed,a,left.p,identity),/INPUT_CHANGED/);
 const protectedInput=copy(left.project);protectedInput.overrides[0]={lock:true,layout:'center',size:80};const locked=J.plan(protectedInput,a);assert(locked.cuts.filter(c=>c.line===0).every(c=>c.layout!=='songGrammarV4'));
 for(const aspect of ['16:9','9:16']){const project={...left.project,aspect},p=J.plan(project,a);assert(p.lines.every((l,i)=>l.start===i*3&&l.text==='同じ空を見上げる'));const mask=createCanvas(256,Math.round(256*p.H/p.W)),mc=mask.getContext('2d'),screen=createCanvas(mask.width,mask.height),items=[];R.frame(screen.getContext('2d'),p,1,{scale:256/p.W,production:true,lyricAuditCtx:mc,lyricAuditItems:items});assert(items.length);assert([...mc.getImageData(0,0,mask.width,mask.height).data].some((v,i)=>i%4===3&&v>0));}
 const before=J.songNativeFixSnapshot(left.project,a,restored);J.fixMVQuality(left.project,{issues:[{code:'motion',fixable:true}]},a);const fixed=J.plan(left.project,a);await J.runSongNativeFixSearch(before,left.project,a,fixed,null);J.ensureSongNativeDirection(left.project,a,fixed);J.captureSongNativeResolved(left.project,a,fixed);assert.equal(J.plan(left.project,a).songNativeRestore.status,'RESTORED');
 J.songDirectionProfile=legacyProfile;J.cinemaArchitectureCandidates=legacyArchitecture;const old=J.defaultProject();old.lyrics=q.lyrics;const proposal=J.proposeDirection(old,a);Object.assign(old,{autoDirection:true,style:proposal.style,mood:proposal.mood,fx:proposal.fx,enabled:proposal.enabled,seed:proposal.seed,overrides:proposal.overrides});old.artDirection=J.makeArtDirection(old,a,proposal);old.fonts={...old.artDirection.typography};const legacy=J.plan(old,a);assert.equal(legacy.songNativeDirection.version,3);J.captureSongNativeResolved(old,a,legacy);assert.equal(J.plan(copy(old),a).songNativeRestore.status,'RESTORED');
 R.disposeAssets?.();console.log('TEST 4 PASS: complete timed glyphs, both aspects, locks, v4/v3 persistence, stale rejection, quality-fix commit');
})().catch(e=>{console.error(e);process.exitCode=1;});
