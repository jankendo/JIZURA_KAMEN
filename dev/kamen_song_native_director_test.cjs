'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const {engine}=require('./custom_test_support.cjs');
(async()=>{
 const {J,context,createCanvas}=engine(),V=J.cinemaV3;
 const project=J.defaultProject();project.lyrics='[00:00]見えない道\n[00:04]歩こう\n[00:08]見えない道\n[00:12]その先へ';
 const audio=values=>({duration:16,bpm:120,energy:Float32Array.from(values),energyRate:1,onset:Float32Array.from(values.map(v=>v*.2)),rms:Float32Array.from(values.map(v=>v===0?0:.03)),features:{energy:.5,beatStrength:.4,onsetDensity:.3},analysisSource:{status:'MEASURED',method:'PCM_AUDIO_FEATURES_V1'}});
 const a=audio([.15,.15,.15,.15,.85,.85,.85,.85,0,0,0,0,1,1,1,1]),b=audio([.85,.85,.85,.85,0,0,0,0,1,1,1,1,.15,.15,.15,.15]);
 const first=J.buildSongNativeDirection(project,a),second=J.buildSongNativeDirection(project,b);
 assert.equal(a.bpm,b.bpm);assert.equal([...a.energy].reduce((s,v)=>s+v,0),[...b.energy].reduce((s,v)=>s+v,0));
 assert.equal(JSON.stringify(first),JSON.stringify(J.buildSongNativeDirection(project,a)));
 assert.notDeepEqual(first.sections,second.sections);assert.notEqual(first.climax,second.climax);
 for(const d of [first,second])for(const s of d.sections)for(const key of ['motionIntensity','visualDensity','cameraTravel','negativeSpace','typographyScale','contrastIntent','transitionIntensity'])assert(Number.isFinite(s[key])&&s[key]>=0&&s[key]<=1,key);
 assert(first.sections.some(s=>s.quietIntent));assert(first.lyrics[2].repetition>0);assert(first.lyrics.every(l=>l.semanticStatus==='UNKNOWN'));
 const unmeasured=J.buildSongNativeDirection(project,null);assert.equal(unmeasured.evidence.energy,'UNMEASURED');assert(unmeasured.sections.every(s=>s.measuredEnergy===null));
 // Persistence is ordinary project JSON; older projects do not opt into a new plan.
 assert(!J.plan(project,a).songNativeDirection);
 const proposal=J.proposeDirection(project,a,null);Object.assign(project,{style:proposal.style,mood:proposal.mood,fx:proposal.fx,enabled:proposal.enabled,seed:proposal.seed,overrides:proposal.overrides,autoDirection:true});
 project.artDirection=J.makeArtDirection(project,a,proposal);project.fonts={...project.artDirection.typography};
 const p=J.plan(project,a),saved=JSON.parse(JSON.stringify(project)),restored=J.plan(saved,a);
 assert.equal(p.songNativeDirection.version,1);assert(J.validSongNativeDirection(p.songNativeDirection));const corrupt=JSON.parse(JSON.stringify(saved));corrupt.artDirection.songNativeDirection.sections[0].motionIntensity=10;assert(J.validSongNativeDirection(J.plan(corrupt,a).songNativeDirection));assert.equal(JSON.stringify(p.songNativeDirection),JSON.stringify(restored.songNativeDirection));
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
