'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {engine}=require('./custom_test_support.cjs');
(async()=>{
 const {J,context,createCanvas}=engine(),V=J.cinemaV3,clone=x=>JSON.parse(JSON.stringify(x));
 const project=J.defaultProject();project.lyrics='[00:00]同じ空\n[00:04]歩こう\n[00:08]同じ空\n[00:12]また明日';
 const audio=values=>({duration:16,bpm:120,energy:Float32Array.from(values),energyRate:1,onset:Float32Array.from(values.map(v=>v*.3)),rms:Float32Array.from(values.map(v=>v? .03:0)),features:{energy:.5,beatStrength:.4,onsetDensity:.3},analysisSource:{status:'MEASURED',method:'PCM_AUDIO_FEATURES_V1'}});
 const a=audio([.1,.1,.1,.1,.9,.9,.9,.9,0,0,0,0,1,1,1,1]),b=audio([.9,.9,.9,.9,0,0,0,0,1,1,1,1,.1,.1,.1,.1]);
 const proposal=J.proposeDirection(project,a,null);Object.assign(project,{style:proposal.style,mood:proposal.mood,fx:proposal.fx,enabled:proposal.enabled,seed:proposal.seed,overrides:proposal.overrides,autoDirection:true});project.artDirection=J.makeArtDirection(project,a,proposal);project.fonts={...project.artDirection.typography};
 const p=J.plan(project,a);p.cuts[0].songNativeRepair={motionDelta:.08};const saved=J.captureSongNativeResolved(project,a,p),original=J.canonicalJSON(J.songNativeRenderDecisions(p));
 assert.equal(saved.songNativeSchemaVersion,3);context.window.KAMEN_BUILD_INFO={sourceTreeSHA256:'different-build'};
 const round=J.plan(clone(project),a);assert.equal(round.songNativeRestore.status,'RESTORED');assert.equal(J.canonicalJSON(J.songNativeRenderDecisions(round)),original);
 for(const change of [r=>r.rendererCompatibilityId='incompatible',r=>r.version=2,r=>r.overrides.push({path:['cuts','0','__proto__','bad'],value:1}),r=>r.baselineIdentity='bad',r=>r.locks='bad']){
  const q=clone(project);change(q.artDirection.songNativeResolved);const bytes=JSON.stringify(q),rejected=J.plan(q,a);assert.equal(rejected.songNativeRestore.status,'REJECTED');assert.equal(JSON.stringify(q),bytes);assert(!rejected.cuts[0].songNativeRepair);
 }
 assert.equal({}.bad,undefined);assert.equal(J.plan(clone(project),null).songNativeRestore.status,'PENDING_INPUT');
 console.log('保存互換性 PASS');
 let searches=0;J.searchSongNativeCandidates=async()=>{searches++;};
 for(const impact of ['OBSERVATION_ONLY','LOCAL_READABILITY','LOCAL_MOTION','GLOBAL_COMPOSITION','INPUT_OR_ASPECT_CHANGE','UNKNOWN']){
  const q=clone(project),selected=J.plan(q,a);selected.cuts[0].songNativeRepair={motionDelta:.16};const before=J.songNativeFixSnapshot(q,a,selected);
  if(impact==='LOCAL_READABILITY')q.lyricPlacementWide=!q.lyricPlacementWide;
  if(impact==='LOCAL_MOTION')q.fx.motion=(q.fx.motion||0)+.1;
  if(impact==='GLOBAL_COMPOSITION')q.seed++;
  if(impact==='INPUT_OR_ASPECT_CHANGE')q.aspect='9:16';
  if(impact==='UNKNOWN')q.newUnknownSetting=true;
  const fixed=J.plan(q,a);assert.equal(J.classifySongNativeFix(before,q,fixed,a),impact);const old=searches;
  const result=await J.runSongNativeFixSearch(before,q,a,fixed,null);assert.equal(searches-old,['GLOBAL_COMPOSITION','INPUT_OR_ASPECT_CHANGE','UNKNOWN'].includes(impact)?1:0,impact);assert(result.requiresObservation);
  if(result.reused){assert.equal(fixed.cuts[0].songNativeRepair.motionDelta,.16);assert(!fixed.lastPixelQA);}
 }
 const stale={completed:true,observationBinding:{planHash:'old',rangeKey:'null'}};assert.equal((await J.repairWeakSections(round,stale,null,a)).status,'STALE_OBSERVATION');
 console.log('探索削減 PASS');
 const da=J.buildSongNativeDirection(project,a),other=clone(project);other.lyrics='[00:00]同じ空\n[00:04]同じ空\n[00:08]歩こう\n[00:12]また明日';const db=J.buildSongNativeDirection(other,b);
 assert.equal(a.bpm,b.bpm);assert.equal([...a.energy].reduce((s,v)=>s+v),[...b.energy].reduce((s,v)=>s+v));assert.notDeepEqual(da.sections.map(s=>s.motif),db.sections.map(s=>s.motif));assert.equal(J.canonicalJSON(da),J.canonicalJSON(J.buildSongNativeDirection(project,a)));
 const canvas=createCanvas(192,108),ctx=canvas.getContext('2d'),R=new J.Renderer(),left=J.plan(project,a),right=J.plan(other,b);let different=0;
 for(const t of [1,5,13]){R.frame(ctx,left,t,{scale:192/left.W,production:true});const bytes=Buffer.from(ctx.getImageData(0,0,192,108).data);R.frame(ctx,right,t,{scale:192/right.W,production:true});different+=Number(!bytes.equals(Buffer.from(ctx.getImageData(0,0,192,108).data)));}assert(different>0);
 // Isolate the native adapters from different text or unrelated planner decisions.
 const fake={...J,mainDraw:(_e,it)=>it,temporalCinemaFocus:(_p,_c,f)=>f,safeLyricItem:(_e,it)=>it};vm.runInNewContext(fs.readFileSync('src/11zzzzzzzzze_song_native_director.js','utf8'),{window:{J:fake},DOMException});
 const cut={line:0,lineText:'同じ空',start:0,end:16,params:{}},pa={...left,cuts:[cut],songNativeDirection:da},pb={...left,cuts:[cut],songNativeDirection:db};const item={text:cut.lineText,size:100,x:960,y:540};
 assert.notDeepEqual(fake.mainDraw({plan:pa,cut,t:5,W:1920,H:1080},{...item}),fake.mainDraw({plan:pb,cut,t:5,W:1920,H:1080},{...item}));
 const motifOnly=V.clone(left);motifOnly.songNativeDirection.sections.forEach((section,i)=>{section.motif=clone(db.sections[Math.min(i,db.sections.length-1)].motif);});
 R.frame(ctx,left,5,{scale:192/left.W,production:true});const native=Buffer.from(ctx.getImageData(0,0,192,108).data);R.frame(ctx,motifOnly,5,{scale:192/left.W,production:true});assert(!native.equals(Buffer.from(ctx.getImageData(0,0,192,108).data)),'motif alone changes real renderer pixels');
 assert.notDeepEqual(fake.temporalCinemaFocus(pa,cut,{x:.5,y:.5,zoom:1},5),fake.temporalCinemaFocus(pb,cut,{x:.5,y:.5,zoom:1},5));
 const lockedCut={...cut,locked:true};assert.deepEqual(fake.mainDraw({plan:pa,cut:lockedCut,t:5,W:1920,H:1080},{...item}),item);
 assert.equal(J.buildSongNativeDirection(project,null).evidence.energy,'UNMEASURED');console.log('Visual Motif PASS');
 assert.equal(J.canonicalJSON(left.lines),J.canonicalJSON(round.lines));for(const aspect of ['16:9','9:16']){const plan=J.plan({...project,aspect},a);assert(plan.lines.every((l,i)=>l.start===left.lines[i].start));}
 const quiet=da.sections.find(s=>s.quietIntent),loud=da.sections.find(s=>s.motionIntensity>.4),samples=[{line:0,time:quiet.start+.1,motion:0,cameraMotion:0},{line:1,time:loud.start+.1,motion:.03,cameraMotion:.01}];const fit=J.measureSongNativeFit({songNativeDirection:da},samples);assert(fit.score>J.measureSongNativeFit({songNativeDirection:da},samples.map(r=>({...r,motion:.03-r.motion}))).score);assert.equal(fit.components.intentionalSilence,1);assert.equal(fit.fallback,'ORDINAL_INCOMPLETE_TEMPORAL_EVIDENCE');const completeFit=J.measureSongNativeFit({songNativeDirection:da},da.sections.map((s,i)=>({line:i,time:s.start+.1,motion:s.quietIntent?0:s.motionIntensity*.03,cameraMotion:s.quietIntent?0:.01,centroidX:s.motif.axis,spread:s.motif.spread})));for(const name of ['transitionTiming','accumulationRelease','intentionalSilence','motifProgression'])assert(Number.isFinite(completeFit.components[name]),name);assert.equal(J.measureSongNativeFit({},[]).score,null);
 const keyItems=[{id:'baseline',plan:left},{id:'same',plan:left},{id:'different',plan:right}];assert.equal(J.songNativeDistinctCandidates(keyItems,2).items.length,2);assert.equal(J.songNativeDistinctCandidates([keyItems[1],keyItems[0],keyItems[2]],2).items[0].id,'baseline');assert.equal(J.songNativeDistinctCandidates(keyItems,3).fallback,true);
 const ui=fs.readFileSync('src/12_ui.js','utf8');assert(ui.includes('songNativeRestoreNotice'));assert(ui.includes('J.finishSelectedDraftV16('));const defaults=J.defaultProject();assert.equal(J.resolveExportSettings(defaults).refinementMode,'fast');assert.equal(J.resolveExportSettings({...defaults,exportSettings:{...defaults.exportSettings,refinementMode:'quality'}}).refinementMode,'quality');R.disposeAssets?.();
 // Production story tournament: identical raster candidates merge, detailed QA is deferred.
 const selection={style:'test',font:'embedded_bold',styleComparisons:[{id:'test',eligible:true,font:'embedded_bold',rank:1}],entries:{0:{params:{font:'embedded_bold'}}}},storyProject={customBg:{dataUrl:''},artDirection:{registrySelection:selection,visualDNA:{},typography:{}}};
 const base={project:storyProject,selection,proposal:{debug:{styleDecision:{}},visualDNA:{},motionDNA:{}},plan:{W:160,H:90,customBg:{dataUrl:''},artDirection:{registrySelection:selection},musicalPhoto:{story:{}}}};
 const pixels=new Uint8ClampedArray(16).fill(255),cx={getImageData:()=>({data:pixels})};let detailCalls=0;
 const T={clonePhotoRenderPlan:x=>JSON.parse(JSON.stringify(x)),canonicalJSON:J.canonicalJSON,FONTS:{embedded_bold:{kind:'sans'}},drawItem(){},layoutText:()=>[{i:0,ch:'歌'}],selectionGlyphEvidence:()=>({readable:true}),selectionPixelEvidence:()=>({safe:true}),observePixelFrame:()=>({}),measureWorldDistance7:()=>({score:90}),measurePhotoStyleTrial:()=>({passed:true,score:90}),photoChoreographyLocked:()=>false,styleSignature:()=>({core:[]}),makeArtDirection:(_q,_a,proposal)=>({registrySelection:proposal.registrySelection}),plan:q=>({W:160,H:90,cuts:[{line:0,lineText:'歌',start:0,end:1,dur:1}],musicalPhoto:{story:{}},artDirection:q.artDirection}),compareRegistryCandidates:async()=>({recommended:base}),analyzeRenderedFrames:async()=>{detailCalls++;throw Error('CANDIDATE_DETAIL_QA');},checkMVQuality(){},evaluateQualityTarget:()=>({failures:[],hardFailures:[]}),repairPhotoBottlenecks:()=>[]};
 T.Renderer=class {async loadCustomBackground(){} frame(ctx,plan){T.drawItem({pass:'main',ctx,cut:plan.cuts[0]},{alpha:1});} disposeAssets(){}};
 const storyCode=fs.readFileSync('src/11zzm_story_director.js','utf8');vm.runInNewContext(storyCode.slice(storyCode.indexOf('/* Bounded Top-K')),{window:{J:T},document:{createElement:()=>({width:2,height:2,getContext:()=>cx})},setTimeout});
 const tournament=await T.compareRegistryCandidates({},null,null,{});assert.equal(detailCalls,0);assert.equal(tournament.recommended.plan.musicalPhoto.story.search.qualityStatus,'UNMEASURED');assert.equal(tournament.recommended.plan.musicalPhoto.story.search.uniqueCandidateCount,1);
 // Emergency regression: actual preflight/fix wrappers, selection, replan and commit.
 {
  const {J:K}=engine(),q=clone(project);delete q.artDirection.songNativeResolved;q.artDirection.registrySelection={};q.fx.motion=.95;
  q.timing.bpm=120;const analysis=()=>({...a,beats:K.beatGrid(q.timing.bpm,q.timing.beatOffset||0,a.duration)});let plan=K.plan(q,analysis());
  const startIdentity=K.songNativeInputIdentity(q,analysis()),check=K.checkMVQuality;
  K.checkMVQuality=()=>({issues:[{code:'direction_realization',fixable:true}]});
  const pre=K.preflightMV(q,analysis(),null,()=>K.plan(q,analysis()));K.checkMVQuality=check;
  assert.equal(pre.fixes,0);assert.equal(q.renderFeedbackRequested,true);assert.equal(K.songNativeInputIdentity(q,analysis()),startIdentity,'diagnostic feedback does not change inputs');
  assert(K.validSongNativeDirection(plan.songNativeDirection));assert.equal(plan.songNativeDirection.sourceIdentity,startIdentity);
  plan=pre.plan;let selected=0;K.repairCinemaSequence=async trial=>{selected++;trial.cuts.find(c=>!c.locked).songNativeRepair={motionDelta:.19};};
  await K.searchSongNativeCandidates(plan,null,analysis());const before=K.songNativeFixSnapshot(q,analysis(),plan);
  assert(K.fixMVQuality(q,{issues:[{code:'motion',fixable:true}]},analysis())>0);plan=K.plan(q,analysis());
  const fix=await K.runSongNativeFixSearch(before,q,analysis(),plan,null);assert(fix.reused);assert.equal(selected,1);assert.equal(plan.cuts[0].songNativeRepair.motionDelta,.19);
  const finalIdentity=K.songNativeInputIdentity(q,analysis());assert.equal(plan.songNativeDirection.sourceIdentity,finalIdentity);
  const observed=await K.observeMVQuality(plan,{start:0,end:.08},analysis(),{observationCache:new Map()});assert(observed.completed);assert.equal(observed.observationBinding.planHash,await K.cinemaV3.planHash(plan));
  const resolved=K.captureSongNativeResolved(q,analysis(),plan,finalIdentity),reloaded=K.plan(clone(q),analysis());assert.equal(reloaded.songNativeRestore.status,'RESTORED');assert.equal(K.canonicalJSON(K.songNativeRenderDecisions(reloaded)),K.canonicalJSON(K.songNativeRenderDecisions(plan)));
  const broken=K.cinemaV3.clone(plan);broken.songNativeDirection.sections[0].motionIntensity=2;assert.throws(()=>K.captureSongNativeResolved(q,analysis(),broken),e=>e.reason==='INVALID_DIRECTION'&&!e.diagnostic.validDirection);
  broken.songNativeDirection=clone(plan.songNativeDirection);broken.songNativeDirection.sourceIdentity='stale';assert.throws(()=>K.captureSongNativeResolved(q,analysis(),broken),e=>e.reason==='SOURCE_IDENTITY_MISMATCH'&&e.diagnostic.validDirection);
  broken.lastPixelQA=observed;assert(K.ensureSongNativeDirection(q,analysis(),broken).requiresObservation);assert.equal(broken.lastPixelQA,null);assert.equal(broken.cuts[0].songNativeRepair.motionDelta,.19);
  const old=finalIdentity;q.lyrics+='\n[00:15]変化';assert.throws(()=>K.captureSongNativeResolved(q,analysis(),plan,old),/INPUT_CHANGED/);assert.throws(()=>K.ensureSongNativeDirection(q,analysis(),plan),/STALE_SONG_NATIVE_PLAN/);
  assert.equal(resolved.sourceIdentity,old);
  console.log('緊急回帰 PASS: diagnostic-only preflight + real quality fix + selected repair + replan + observed commit + restore; invalid vs mismatched direction distinguished');
 }
 // Existing frames only: real glyph/mask renders, 30/60 fps, both aspects, tail.
 {
  const {J:K}=engine(),q=K.defaultProject();q.lyrics='[00:00]歌\n[00:00.10]空\n[00:00.90]光';q.timing.duration=1;
  const A={duration:1};let frameCalls=0;const originalFrame=K.Renderer.prototype.frame;
  K.Renderer.prototype.frame=function(...args){frameCalls++;return originalFrame.apply(this,args);};
  let lastPlan,lastResult;
  for(const fps of [30,60])for(const aspect of ['16:9','9:16']){
   const plan=K.plan({...q,fps,aspect},A);for(const c of plan.cuts){c.layout='center';c.enter='cut';c.hold='still';c.exit='cut';c.inDur=c.outDur=c.stagger=0;}
   const cache=new Map(),result=await K.measureDisplayOnsets(plan,{start:0,end:1},{observationCache:cache});
   assert.equal(result.samples.length,3);assert.equal(result.samples[0].early,null);assert.equal(result.samples[0].preBoundaryStatus,'NOT_APPLICABLE');assert.equal(result.samples[0].pass,true,'zero-time static glyph is on time');assert(result.samples[0].probes.every(r=>!r.preBoundary));assert(result.samples.some(s=>s.probes.some(r=>r.displayed)),'actual rendered glyph ink');
   assert(result.samples.every(s=>s.probes.every(r=>r.t>=0&&r.t<1)));assert(result.samples[1].probes.some(r=>r.preBoundary));
   const calls=frameCalls;await K.measureDisplayOnsets(plan,{start:0,end:1},{observationCache:cache});assert.equal(frameCalls,calls,'identical onset results reuse real dependency key');
   plan.cuts[0].params.font='embedded_bold';await K.measureDisplayOnsets(plan,{start:0,end:1},{observationCache:cache});assert(frameCalls>calls,'font change invalidates onset observation');
   lastPlan=plan;lastResult=result;
  }
  const oldFrame=K.Renderer.prototype.frame,error=new Error('original raster failure');K.Renderer.prototype.frame=()=>{throw error;};await assert.rejects(K.measureDisplayOnsets(lastPlan,{start:0,end:1}),e=>e.code==='DISPLAY_ONSET_INSPECTION_FAILED'&&e.cause===error&&e.line===0&&e.time===0&&e.stage==='glyph-mask');K.Renderer.prototype.frame=oldFrame;
  const near=K.cinemaV3.clone(lastPlan);near.lines=[{index:0,text:'歌',start:.999,end:1}];const tail=await K.measureDisplayOnsets(near,{start:0,end:1});assert.equal(tail.samples[0].status,'UNMEASURED');assert.equal(tail.samples[0].pass,null);assert.equal(tail.score,null);
  // A completed quality observation is reused only for the exact current plan.
  const cache=new Map(),range={start:0,end:.02};const one=await K.observeMVQuality(lastPlan,range,null,{observationCache:cache}),count=frameCalls;
  const two=await K.observeMVQuality(lastPlan,range,null,{observationCache:cache});assert(two.completed&&one.completed);assert.equal(frameCalls,count);assert.equal(two.observationBinding.planHash,await K.cinemaV3.planHash(lastPlan));lastPlan.fps=24;await K.observeMVQuality(lastPlan,range,null,{observationCache:cache});assert(frameCalls>count);
  console.log('LRC境界 PASS: existing zero/normal/last frames, short cues, actual glyphs, two aspects/FPS, safe cache invalidation and original error cause');
 }
 // Reuse the existing durable queue contract and exercise real UI save supersession.
 {
  const {J:K,context:saveContext}=engine();let calls=0;const data=new Map(),queue=K.createAssetSaveQueue(async entries=>{calls++;if(calls===1)throw Error('quota');await new Promise(r=>setTimeout(r,1));for(const [k,v]of entries)data.set(k,v);});
  await assert.rejects(queue([['background','A']]));await Promise.all([queue([['background','A']]),queue([['background','B']])]);assert.equal(data.get('background'),'B');assert(queue.isDurable([['background','B']]));
  const text=fs.readFileSync('src/12_ui.js','utf8'),fn=text.slice(text.indexOf('function flushSave()'),text.indexOf('function fileAsDataUrl('));
  const writes=[],storage=new Map();let release;const held=new Promise(r=>release=r),persist=K.createAssetSaveQueue(async entries=>{await held;writes.push(entries);});
  let failIDB=false;const records=new Map();const state={project:K.defaultProject()},errors=[],box=vm.createContext({J:K,S:state,localRecoveryBlocked:false,saveTimer:0,saveRevision:0,projectSaveQueue:Promise.resolve(),bgDbSetMany:async entries=>{await held;if(failIDB)throw new DOMException('IDB quota','QuotaExceededError');for(const [k,v]of entries)records.set(k,v);},bgDbGet:async key=>records.get(key),LS_KEY:'project',localStorage:{getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)},saveStatus(){},clearTimeout,console:{error:(...args)=>errors.push(args)},Promise});vm.runInContext(fn,box);
  const first=box.flushSave();state.project.title='newest';const second=box.flushSave();release();assert.equal(await first,false);assert.equal(await second,true);assert.equal(records.get('project-current-v2').project.title,'newest');assert.equal(errors.length,0);assert(![...K.processing.jobs.values()].some(s=>s.status==='error'));
  saveContext.console={error:(...args)=>errors.push(args)};box.localStorage.setItem=()=>{throw Error('quota')};state.project.title='localStorage unavailable';assert.equal(await box.flushSave(),true);failIDB=true;state.project.title='cannot save';assert.equal(await box.flushSave(),false);assert(errors.length>0);assert([...K.processing.jobs.values()].some(s=>s.status==='error'&&s.errorObject));
  vm.runInContext(fs.readFileSync('src/12a_processing_ui.js','utf8'),vm.createContext({J:K}));assert(K.processingErrorGuidance({error:'STALE_SONG_NATIVE_PLAN'}).includes('整合性'));assert(K.processingErrorGuidance({error:'quota'}).includes('保存'));assert(K.processingErrorGuidance({error:'DISPLAY_ONSET_INSPECTION_FAILED'}).includes('品質検査'));
  console.log('保存安全性 PASS: original saved decisions/locks retained, queue failure/retry, latest metadata wins and normal handoff stays quiet');
 }
 console.log('既存機能保護 PASS (locks, timing, two aspects, save/restore, fit, dedup fallback, export mode paths; MP4 UNVERIFIED)');
})().catch(e=>{console.error(e);process.exitCode=1;});
