'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {engine}=require('./custom_test_support.cjs');
(async()=>{
 const {J,context,createCanvas}=engine(),V=J.cinemaV3;
 const assertRender=(p,expected)=>{const a=JSON.parse(J.canonicalJSON(J.songNativeRenderDecisions(p))),b=JSON.parse(expected);const diff=(x,y,path='')=>{if(JSON.stringify(x)===JSON.stringify(y))return null;if(x&&y&&typeof x==='object'&&typeof y==='object'){for(const k of new Set([...Object.keys(x),...Object.keys(y)])){const d=diff(x[k],y[k],path+'.'+k);if(d)return d;}}return {path,actual:x,expected:y};};assert.equal(JSON.stringify(diff(a,b)), 'null');};
 const project=J.defaultProject();project.lyrics='[00:00]見えない道\n[00:04]歩こう\n[00:08]見えない道\n[00:12]その先へ';
 const audio=values=>({duration:16,bpm:120,energy:Float32Array.from(values),energyRate:1,onset:Float32Array.from(values.map(v=>v*.2)),rms:Float32Array.from(values.map(v=>v===0?0:.03)),features:{energy:.5,beatStrength:.4,onsetDensity:.3},analysisSource:{status:'MEASURED',method:'PCM_AUDIO_FEATURES_V1'}});
 const a=audio([.15,.15,.15,.15,.85,.85,.85,.85,0,0,0,0,1,1,1,1]),b=audio([.85,.85,.85,.85,0,0,0,0,1,1,1,1,.15,.15,.15,.15]);
 const first=J.buildSongNativeDirection(project,a),second=J.buildSongNativeDirection(project,b);
 assert.equal(a.bpm,b.bpm);assert.equal([...a.energy].reduce((s,v)=>s+v,0),[...b.energy].reduce((s,v)=>s+v,0));
 assert.equal(JSON.stringify(first),JSON.stringify(J.buildSongNativeDirection(project,a)));
 assert.notDeepEqual(first.sections,second.sections);assert.notEqual(first.climax,second.climax);
 for(const key of ['intent','cameraTravel','negativeSpace','transitionIntensity'])assert.notDeepEqual(first.sections.map(s=>s[key]),second.sections.map(s=>s[key]),key+' follows structure without changing seed');
 for(const d of [first,second])for(const s of d.sections)for(const key of ['motionIntensity','visualDensity','cameraTravel','negativeSpace','typographyScale','contrastIntent','transitionIntensity'])assert(Number.isFinite(s[key])&&s[key]>=0&&s[key]<=1,key);
 assert(first.sections.some(s=>s.quietIntent));assert(first.lyrics[2].repetition>0);assert(first.lyrics.every(l=>l.semanticStatus==='UNKNOWN'));
 const unmeasured=J.buildSongNativeDirection(project,null);assert.equal(unmeasured.evidence.energy,'UNMEASURED');assert(unmeasured.sections.every(s=>s.measuredEnergy===null));
 // Persistence is ordinary project JSON; older projects do not opt into a new plan.
 assert(!J.plan(project,a).songNativeDirection);
 const proposal=J.proposeDirection(project,a,null);Object.assign(project,{style:proposal.style,mood:proposal.mood,fx:proposal.fx,enabled:proposal.enabled,seed:proposal.seed,overrides:proposal.overrides,autoDirection:true});
 project.artDirection=J.makeArtDirection(project,a,proposal);project.fonts={...project.artDirection.typography};
 const p=J.plan(project,a),saved=JSON.parse(JSON.stringify(project)),restored=J.plan(saved,a);
 assert.equal(p.songNativeDirection.version,2);assert(J.validSongNativeDirection(p.songNativeDirection));const corrupt=JSON.parse(JSON.stringify(saved));corrupt.artDirection.songNativeDirection.sections[0].motionIntensity=10;assert(J.validSongNativeDirection(J.plan(corrupt,a).songNativeDirection));assert.equal(JSON.stringify(p.songNativeDirection),JSON.stringify(restored.songNativeDirection));
 for(const change of [q=>q.lyrics+='\n[00:15]またね',q=>q.fonts.display='embedded_bold',q=>q.customBg.zoom=1.23,q=>q.aspect='9:16',q=>q.exportSettings.videoBitrate=123456]){
  const q=JSON.parse(JSON.stringify(project));change(q);assert.notEqual(J.plan(q,a).songNativeDirection.sourceIdentity,p.songNativeDirection.sourceIdentity);
 }
 assert.notEqual(J.plan(project,b).songNativeDirection.sourceIdentity,p.songNativeDirection.sourceIdentity);
 // Runtime adapter reaches mainDraw, and changing section energy changes size.
 const planSource=fs.readFileSync('src/11zzzzzzzzze_song_native_director.js','utf8');
 const fake={...J,mainDraw:(_env,it)=>it};const sandbox=vm.createContext({window:{J:fake},DOMException});vm.runInContext(planSource,sandbox);
 const item={text:p.cuts[0].lineText,size:100},env={plan:p,cut:p.cuts[0],t:.5};const small=fake.mainDraw(env,{...item}).size;
 const activeTime=first.sections.find(s=>!s.quietIntent&&s.measuredEnergy>.8).start+.2;env.t=activeTime;const large=fake.mainDraw(env,{...item}).size;assert(large>small);
 const manual=V.clone(p);manual.cuts[0].locked=true;const oldCut=JSON.stringify(manual.cuts[0]);J.applySongNativeDirection(manual);assert.equal(JSON.stringify(manual.cuts[0]),oldCut);assert.equal(fake.mainDraw({...env,plan:manual,cut:manual.cuts[0]},{...item}).size,100);
 // Full production observer chain with a tiny raster range. Any implicit search fails.
 for(const key of ['repairCinemaSequence','repairStrongEvents','refineMusicalPhotoPlan'])J[key]=async()=>{throw Error('IMPLICIT_SEARCH:'+key);};
 const before=JSON.stringify(p),pixel=await J.observeMVQuality(p,{start:0,end:.15},null,{onProgress(){}});
 assert(pixel.completed);assert(pixel.metrics.glyphInspection);assert(pixel.metrics.displayOnsetAccuracy);assert.equal(JSON.stringify(p),before);
 const cancel=new AbortController();cancel.abort();await assert.rejects(J.observeMVQuality(p,null,null,{signal:cancel.signal}),{name:'AbortError'});assert.equal(JSON.stringify(p),before);
 // Real single-image plan: all feedback observers execute without architecture search.
 J.enableSingleBackgroundMode();const image=createCanvas(160,90),ix=image.getContext('2d');ix.fillStyle='#273e62';ix.fillRect(0,0,160,90);ix.fillStyle='#b9cbdc';ix.fillRect(18,10,30,64);
 const photo=JSON.parse(JSON.stringify(project));photo.customBg={...photo.customBg,enabled:true,dataUrl:image.toDataURL()};const pp=J.proposeDirection(photo,a,{});photo.artDirection=J.makeArtDirection(photo,a,pp);const seed=J.plan(photo,a);
 pp.registrySelection={style:photo.style,font:'embedded_bold',lyricsKey:J.registrySelectionLyricsKey(seed),backgroundKey:J.registrySelectionBackgroundKey(photo),virtualShots:J.virtualShotCandidates(image),entries:Object.fromEntries(seed.cuts.filter(c=>c.line>=0).map(c=>[c.line,{layout:'photoStatement',params:{font:'embedded_bold',displayText:c.lineText},enter:'cut',hold:'still',inDur:0}]))};
 photo.artDirection=J.makeArtDirection(photo,a,pp);const photoPlan=J.plan(photo,a);assert(photoPlan.musicalPhoto.cinema);const photoBefore=JSON.stringify(photoPlan),photoPixel=await J.observeMVQuality(photoPlan,{start:0,end:.15},a,{onProgress(){}});
 assert(photoPixel.completed);assert(photoPixel.metrics.cinemaFeedback);assert.equal(JSON.stringify(photoPlan),photoBefore);
 const r=new J.Renderer(),raster=createCanvas(160,90),rx=raster.getContext('2d');await r.loadCustomBackground(photo.customBg.dataUrl);r.frame(rx,photoPlan,5,{scale:160/photoPlan.W,production:true});const nativePixels=Buffer.from(rx.getImageData(0,0,160,90).data);const legacy=V.clone(photoPlan);delete legacy.songNativeDirection;r.frame(rx,legacy,5,{scale:160/legacy.W,production:true});assert(!nativePixels.equals(Buffer.from(rx.getImageData(0,0,160,90).data)),'native adapter must change actual pixels');r.disposeAssets?.();
 // Individual renderer inputs must reach real pixels, and reusing an item cannot compound size.
 assert.equal(fake.mainDraw({...env,t:.5},{...item}).size,small);
 const probeRenderer=new J.Renderer(),probeCanvas=createCanvas(192,108),probeCtx=probeCanvas.getContext('2d');await probeRenderer.loadCustomBackground(photo.customBg.dataUrl);
 const intentPixels=(plan,time)=>{probeRenderer.frame(probeCtx,plan,time,{scale:192/plan.W,production:true});return Buffer.from(probeCtx.getImageData(0,0,192,108).data);};
 for(const [key,time] of [['negativeSpace',5],['contrastIntent',5],['transitionIntensity',photoPlan.cuts.at(-1).grammar.temporal.hit+.015]]){
  const left=V.clone(photoPlan),right=V.clone(photoPlan);J.songNativeSectionAt(left,time)[key]=0;J.songNativeSectionAt(right,time)[key]=1;
  assert(!intentPixels(left,time).equals(intentPixels(right,time)),key+' must affect Canvas pixels');
 }
 probeRenderer.disposeAssets?.();
 // T-01: a real renderer plan retains selected geometry, typography, camera and repairs.
 for(const aspect of ['16:9','9:16']){
  const q=J.migrateProject(JSON.parse(JSON.stringify(photo)));q.aspect=aspect;q.overrides[1]={lock:true,lockedSeed:451,cam:'stillCamera',font:'embedded_bold'};
  const resolvedPlan=J.plan(q,a),cut=resolvedPlan.cuts.find(c=>c.line>=0&&!J.photoChoreographyLocked(resolvedPlan,c));
  cut.params.photoAnchor={...cut.params.photoAnchor,x:.39,y:.55};cut.params.font='embedded_bold';cut.camP={...cut.camP,zoom:1.14};
  cut.songNativeRepair={motionDelta:.08};if(cut.grammar){cut.grammar.motion=.47;cut.grammar.temporal={...cut.grammar.temporal,level:.47};}
  resolvedPlan.lastPixelQA={completed:true,stale:'MUST_NOT_PERSIST'};
  const original=J.canonicalJSON(J.songNativeRenderDecisions(resolvedPlan)),identity=J.songNativeInputIdentity(q,a);
  const payload=J.captureSongNativeResolved(q,a,resolvedPlan,identity);
  assert.equal(payload.version,2);assert(payload.overrides.length>0);assert(!JSON.stringify(payload).includes('MUST_NOT_PERSIST'));assert(!('cuts' in payload));
  const roundtrip=JSON.parse(JSON.stringify(q));let rebuilt=J.plan(J.migrateProject(roundtrip),a);assert.equal(J.songNativeInputIdentity(J.migrateProject(roundtrip),a),identity,'migration identity');
  assertRender(rebuilt,original);assert.equal(V.lockSignature(rebuilt),V.lockSignature(resolvedPlan));assert(V.lockSignature(rebuilt)!=='[]');assert.equal(rebuilt.lastPixelQA,null);assert.equal(J.canonicalJSON(rebuilt.lines),J.canonicalJSON(resolvedPlan.lines));
  const rr=new J.Renderer(),cc=createCanvas(192,Math.round(192*rebuilt.H/rebuilt.W)),xx=cc.getContext('2d');await rr.loadCustomBackground(q.customBg.dataUrl);await rr.loadAssetDeck?.(rebuilt);
  const rasterAt=(plan,time)=>{rr.frame(xx,plan,time,{scale:192/plan.W,production:true});return Buffer.from(xx.getImageData(0,0,cc.width,cc.height).data);};
  for(const time of [.5,5,9])assert(rasterAt(resolvedPlan,time).equals(rasterAt(rebuilt,time)),aspect+' saved pixels '+time);
  for(let i=0;i<2;i++){J.restoreSongNativeResolved(roundtrip,a,rebuilt);J.captureSongNativeResolved(roundtrip,a,rebuilt);rebuilt=J.plan(JSON.parse(JSON.stringify(roundtrip)),a);assertRender(rebuilt,original);}
  const oldIdentity=J.songNativeInputIdentity(roundtrip,a);roundtrip.seed++;assert.throws(()=>J.captureSongNativeResolved(roundtrip,a,rebuilt,oldIdentity),/INPUT_CHANGED/);assert(!J.plan(roundtrip,a).cuts.some(c=>c.songNativeRepair));
  const staleRenderer=JSON.parse(JSON.stringify(q));staleRenderer.artDirection.songNativeResolved.rendererVersion='old-renderer';assert(!J.plan(staleRenderer,a).cuts.some(c=>c.songNativeRepair));
  const corruptPayload=JSON.parse(JSON.stringify(q));corruptPayload.artDirection.songNativeResolved.overrides.push({path:['cuts','0','__proto__','bad'],value:true});assert(!J.plan(corruptPayload,a).cuts.some(c=>c.songNativeRepair));assert.equal({}.bad,undefined);
  rr.disposeAssets?.();
 }
 // Authored section plans retain their native-modulation opt-out and still save safely.
 const authored=JSON.parse(JSON.stringify(project));authored.directorPlan={sections:[{from:0,to:16,role:'sustain',motionIntent:['stillCamera']}]};
 const authoredPlan=J.plan(authored,a);assert(authoredPlan.songNativeManualPlan);const authoredCuts=J.canonicalJSON(authoredPlan.cuts);J.applySongNativeDirection(authoredPlan);assert.equal(J.canonicalJSON(authoredPlan.cuts),authoredCuts);
 J.captureSongNativeResolved(authored,a,authoredPlan);assert.equal(J.canonicalJSON(J.plan(JSON.parse(JSON.stringify(authored)),a).cuts),authoredCuts);
 // T-02/T-03: search is exact at boundaries and through reverse seeks; temporal roles survive.
 for(const t of [0,4,8,12,16,7.99,3,-1,NaN])assert.equal(J.songNativeSectionAt(p,t),p.songNativeDirection.sections.find(s=>t>=s.start&&t<s.end)||null);
 assert.notDeepEqual(first.sections.map(s=>s.intent),second.sections.map(s=>s.intent));
 const coarse=J.buildSongNativeDirection(project,{duration:16,features:{sections:[.2,.2,.8,.8,.8,.8,.2,.2]}});assert.equal(coarse.evidence.coarseBlocks,'PROVIDED_NOT_FORMAL_SECTIONS');assert(coarse.sections.length<8);const coarseLong=J.buildSongNativeDirection({...project,timing:{...project.timing,duration:240}},{duration:240,features:{sections:[.2,.2,.8,.8,.8,.8,.2,.2]}});assert(coarseLong.sections.every(s=>s.measuredEnergy!==null));
 const oldV1=JSON.parse(JSON.stringify(project));oldV1.artDirection.songNativeDirection.version=1;assert(J.validSongNativeDirection(J.plan(oldV1,a).songNativeDirection));
 const temporalCut={...p.cuts[0],start:4,end:7,dur:3,locked:false,grammar:{temporal:{role:'impact',motionPrinciple:'percussive-deformation',level:.7,hit:.2,entry:.1,exit:.1},intentionalHold:false}};
 const temporalPlan={...p,cuts:[temporalCut]};J.applySongNativeDirection(temporalPlan);assert.equal(temporalCut.grammar.temporal.motionPrinciple,'percussive-deformation');
 temporalCut.grammar.intentionalHold=true;J.applySongNativeDirection(temporalPlan);assert(temporalCut.grammar.intentionalHold);
 const musicPlan={songNativeDirection:first},quiet=first.sections.find(s=>s.quietIntent),loud=first.sections.find(s=>s.motionIntensity>.4);
 const aligned=J.measureSongNativeFit(musicPlan,[{line:0,time:quiet.start+.1,motion:0},{line:1,time:loud.start+.1,motion:.03}]);
 const inverted=J.measureSongNativeFit(musicPlan,[{line:0,time:quiet.start+.1,motion:.03},{line:1,time:loud.start+.1,motion:0}]);assert(aligned.score>inverted.score);assert.equal(J.measureSongNativeFit({},[]).score,null);
 // Explicit search invokes the repair chain, invalidates prior QA and rolls back on error.
 let searched=0;J.repairCinemaSequence=async trial=>{searched++;trial.cuts[0].params.testSearch=true;};p.lastPixelQA=pixel;
 await J.searchSongNativeCandidates(p,null,null,{});assert.equal(searched,1);assert.equal(p.cuts[0].params.testSearch,true);assert.equal(p.lastPixelQA,null);
 const snap=JSON.stringify(p);J.repairCinemaSequence=async trial=>{trial.cuts=[];throw Error('SEARCH_FAILED');};await assert.rejects(J.searchSongNativeCandidates(p,null,null,{}),/SEARCH_FAILED/);assert.equal(JSON.stringify(p),snap);
 // Targeted repair accepts only bounded measured improvement, then clears old QA.
 const repairPlan={W:1920,H:1080,fps:30,duration:1,cuts:[{line:0,start:0,end:1,params:{},grammar:{motion:.3,temporal:{level:.3}}},{line:1,start:0,end:1,locked:true,params:{font:'manual'},grammar:{motion:.3}}]};
 const range={start:0,end:1},evaluation={completed:true,observationBinding:{planHash:await V.planHash(repairPlan),rangeKey:J.canonicalJSON(range)},metrics:{cinemaFeedback:{rank:.1,samples:[{line:0,safe:true,energyGap:.2},{line:1,safe:true,energyGap:.2}]}}};
 J.measureCinemaSequence=async()=>({rank:.2,samples:[{safe:true}]});let nativeChecks=0;J.measureCinemaOutputReadability=async()=>{nativeChecks++;return {};};V.physicalReadabilityDominates=()=>true;
 repairPlan.lastPixelQA=evaluation;const repaired=await J.repairWeakSections(repairPlan,evaluation,range,null,{});assert(repaired.accepted);assert.equal(nativeChecks,2);assert.equal(repairPlan.cuts[1].grammar.motion,.3);assert.equal(repairPlan.lastPixelQA,null);assert.equal((await J.repairWeakSections(repairPlan,evaluation,range,null,{})).status,'STALE_OBSERVATION');
 // Both formats render bounded real glyph masks; the native adapter changes pixels.
 const cv=createCanvas(320,180),ctx=cv.getContext('2d'),R=new J.Renderer();
 const portrait=J.plan({...project,aspect:'9:16'},a);
 for(const renderPlan of [restored,portrait]){cv.height=Math.round(320*renderPlan.H/renderPlan.W);R.frame(ctx,renderPlan,1,{scale:320/renderPlan.W,production:true});assert(ctx.getImageData(0,0,cv.width,cv.height).data.some(v=>v>0));}
 R.disposeAssets?.();
 // Production story tournament: identical raster candidates merge, detailed QA is deferred.
 const selection={style:'test',font:'embedded_bold',styleComparisons:[{id:'test',eligible:true,font:'embedded_bold',rank:1}],entries:{0:{params:{font:'embedded_bold'}}}},storyProject={customBg:{dataUrl:''},artDirection:{registrySelection:selection,visualDNA:{},typography:{}}};
 const base={project:storyProject,selection,proposal:{debug:{styleDecision:{}},visualDNA:{},motionDNA:{}},plan:{W:160,H:90,customBg:{dataUrl:''},artDirection:{registrySelection:selection},musicalPhoto:{story:{}}}};
 const pixels=new Uint8ClampedArray(16).fill(255),cx={getImageData:()=>({data:pixels})};let detailCalls=0;
 const T={clonePhotoRenderPlan:x=>JSON.parse(JSON.stringify(x)),canonicalJSON:J.canonicalJSON,FONTS:{embedded_bold:{kind:'sans'}},drawItem(){},layoutText:()=>[{i:0,ch:'歌'}],selectionGlyphEvidence:()=>({readable:true}),selectionPixelEvidence:()=>({safe:true}),observePixelFrame:()=>({}),measureWorldDistance7:()=>({score:90}),measurePhotoStyleTrial:()=>({passed:true,score:90}),photoChoreographyLocked:()=>false,styleSignature:()=>({core:[]}),makeArtDirection:(_q,_a,proposal)=>({registrySelection:proposal.registrySelection}),plan:q=>({W:160,H:90,cuts:[{line:0,lineText:'歌',start:0,end:1,dur:1}],musicalPhoto:{story:{}},artDirection:q.artDirection}),compareRegistryCandidates:async()=>({recommended:base}),analyzeRenderedFrames:async()=>{detailCalls++;throw Error('CANDIDATE_DETAIL_QA');},checkMVQuality(){},evaluateQualityTarget:()=>({failures:[],hardFailures:[]}),repairPhotoBottlenecks:()=>[]};
 T.Renderer=class {async loadCustomBackground(){} frame(ctx,plan){T.drawItem({pass:'main',ctx,cut:plan.cuts[0]},{alpha:1});} disposeAssets(){}};
 const storyCode=fs.readFileSync('src/11zzm_story_director.js','utf8');vm.runInNewContext(storyCode.slice(storyCode.indexOf('/* Bounded Top-K')),{window:{J:T},document:{createElement:()=>({width:2,height:2,getContext:()=>cx})},setTimeout});
 const tournament=await T.compareRegistryCandidates({},null,null,{});assert.equal(detailCalls,0);assert.equal(tournament.recommended.plan.musicalPhoto.story.search.qualityStatus,'UNMEASURED');assert.equal(tournament.recommended.plan.musicalPhoto.story.search.uniqueCandidateCount,1);
 console.log('Song-Native T01–T03: immutable production observation, explicit repair/invalidation, deterministic structure, save/restore, locks, stale inputs, runtime typography and two-aspect Canvas smoke PASS; no encoded-video certification');
})().catch(e=>{console.error(e);process.exitCode=1;});
