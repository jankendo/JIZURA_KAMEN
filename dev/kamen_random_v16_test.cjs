'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.KAMEN_CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();page.on('console',m=>{if(m.type()==='error')console.error(m.text());});page.on('pageerror',e=>console.error(e));
  await page.goto(process.argv[2]||'http://127.0.0.1:4173/');await page.waitForFunction(()=>window.J?.uiApi);
  const assetDir=process.env.KAMEN_V16_ASSET_DIR;
  await page.exposeFunction('captureV16',async name=>{if(process.env.KAMEN_V16_SCREENSHOT)await page.screenshot({path:process.env.KAMEN_V16_SCREENSHOT.replace(/\.png$/,'-'+name+'.png'),fullPage:true});});
  const input=assetDir?{audio:fs.readFileSync(path.join(assetDir,'audio.mp3')).toString('base64'),background:fs.readFileSync(path.join(assetDir,'background.webp')).toString('base64'),lyrics:fs.readFileSync(path.join(assetDir,'lyrics.lrc'),'utf8')}:null;
  const report=await page.evaluate(async input=>{
   const J=window.J,S=J.ui,api=J.uiApi,check=(v,m)=>{if(!v)throw Error(m);},copy=J.clonePhotoRenderPlan;
   J.enableSingleBackgroundMode();S.project=api.mergeProject(J.defaultProject());S.project.timing.snap=false;
   if(input){
    S.project.lyrics=input.lyrics;S.project.customBg={...S.project.customBg,enabled:true,dataUrl:'data:image/webp;base64,'+input.background};
    const file=new File([Uint8Array.from(atob(input.audio),c=>c.charCodeAt(0))],'audio.mp3',{type:'audio/mpeg'});await api.loadAudioFile(file);
   }else{
    S.project.lyrics='[00:00]光へ歩こう\n[00:02]光へ歩こう';const bg=Object.assign(document.createElement('canvas'),{width:320,height:180}),x=bg.getContext('2d');x.fillStyle='#10243c';x.fillRect(0,0,320,180);S.project.customBg={...S.project.customBg,enabled:true,dataUrl:bg.toDataURL()};
    const buffer=new AudioBuffer({length:48000*4,sampleRate:48000,numberOfChannels:1});S.audio={name:'synthetic',buffer,duration:4,bpm:120,energyRate:2,energy:new Float32Array(8).fill(.4),onset:new Float32Array(8).fill(.3),features:{energy:.4}};
   }
   await S.renderer.loadCustomBackground(S.project.customBg.dataUrl);J.applyImagePalette(S.project,J.analyzeCustomBackground(S.renderer.customBgBitmap,S.project),{palette:true,readability:true,mood:false});
   api.syncUI();api.replan();await api.flushSave();
   let searches=0,observations=0;const search=J.searchSongNativeCandidates,observe=J.observeMVQuality;
   J.searchSongNativeCandidates=(...args)=>{searches++;return search(...args);};J.observeMVQuality=(...args)=>{observations++;return observe(...args);};
   J.randomDraftSeedV16=(()=>{let n=0;return ()=>[16000,16001,12812,16000,16000][n++]??16003;})();
   const drafts=[];
   for(let i=0;i<3;i++){
    await api.generateRandomDraft();const d=S.project.randomWorkflowV16;check(d?.state==='RANDOM_DRAFT_READY','draft '+i+': '+document.querySelector('#directionStatus').textContent);check(searches===0&&observations===0,'generation cannot finish automatically');check(S.plan.randomDraftV16&&S.plan.cuts.some(c=>c.registrySelectedV8),'actual registry preview '+JSON.stringify({random:S.plan.randomDraftV16,cuts:S.plan.cuts.map(c=>({line:c.line,registry:c.registrySelectedV8,layout:c.layout})),state:api.workflowStateV16()}));check(document.querySelector('#studioExport').disabled,'draft MP4 blocked');drafts.push(copy(d));
   }
   let blocked=false;try{await J.exportMP4({project:S.project,plan:S.plan,audio:S.audio});}catch(e){blocked=e.message==='V16_OPTIMIZE_DRAFT_BEFORE_EXPORT';}check(blocked,'engine blocks draft MP4');
   check(new Set(drafts.map(d=>d.seed)).size===3,'fresh seeds');check(new Set(drafts.map(d=>J.canonicalJSON(d.originalCreativeGenome))).size===3,'different genomes');
   await window.captureV16('draft');
   const chosen=copy(S.project.randomWorkflowV16),snapshot=J.selectedDraftSnapshotV16(S.project,S.plan,S.audio);check(Object.isFrozen(snapshot)&&Object.isFrozen(snapshot.originalCuts),'immutable selected source');
   const calls=searches;await api.optimizeSelectedDraft();check(searches===calls+1,'one selected search');check(S.project.randomWorkflowV16.state==='FINISHED','finish: '+document.querySelector('#directionStatus').textContent+' '+JSON.stringify(chosen.originalCuts.filter(c=>c.line>=0).map(c=>({line:c.line,genome:J.creativeGenomeV15(c),start:c.start,end:c.end,transDur:c.transDur}))));check(observations===1,'one final QA observation');check(document.querySelector('#directionStatus').dataset.selectionState==='SELECTED','finish UI committed without errors');
   const done=S.project.randomWorkflowV16;check(done.draftId===chosen.draftId&&done.seed===chosen.seed,'same selected draft');check(done.changes.length===S.plan.cuts.filter(c=>c.line>=0).length,'per-line provenance');check(J.canonicalJSON(done.originalCuts)===J.canonicalJSON(chosen.originalCuts),'immutable original cuts');
   check(done.scaleSafety?.width===640&&done.scaleSafety.entries.every(e=>e.checks.every(x=>x.eligible)),'all-line final 640 gate');
   await window.captureV16('finished');
   const unsafeNative=copy(S.plan),badCut=unsafeNative.cuts.find(c=>c.line===0);badCut.layout='tile';badCut.params={...J.LAYOUTS.tile.plan(J.rng(badCut.seed),badCut,badCut.style),font:badCut.params.font};
   const badBefore=J.canonicalJSON(unsafeNative.cuts);let nativeRejected=false;try{await J.prepareAutomaticUnitSafety({plan:unsafeNative,project:S.project,audio:S.audio});}catch(e){nativeRejected=e.message==='V16_NATIVE_GATE_WOULD_CHANGE_SELECTED_DRAFT';}check(nativeRejected&&J.canonicalJSON(unsafeNative.cuts)===badBefore,'native gate cannot replace a selected genome');
   const finishedProject=S.project,finishedPlan=S.plan,put=IDBObjectStore.prototype.put;
   IDBObjectStore.prototype.put=function(value,key){if(key==='project-current-v2')throw new DOMException('v16 quota test','QuotaExceededError');return put.call(this,value,key);};
   await api.generateRandomDraft();check(S.project===finishedProject&&S.plan===finishedPlan,'save failure protects finished MV');IDBObjectStore.prototype.put=put;
   const generate=J.generateRandomDraftV16;let ready;
   const started=new Promise(resolve=>{ready=resolve;});
   J.generateRandomDraftV16=async(_q,_a,{signal})=>{ready();await new Promise((resolve,reject)=>signal.addEventListener('abort',()=>reject(new DOMException('Aborted','AbortError')),{once:true}));};
   const pending=api.generateRandomDraft();await started;
   for(const state of J.processing.jobs.values())if(state.status==='running'&&typeof state.cancel==='function')state.cancel();
   await pending;J.generateRandomDraftV16=generate;check(S.project===finishedProject&&S.plan===finishedPlan,'UI cancellation protects finished MV');
   const ac=new AbortController();ac.abort();let cancelled=false;try{await J.generateRandomDraftV16(copy(S.project),S.audio,{signal:ac.signal});}catch(e){cancelled=e.name==='AbortError';}check(cancelled,'cancel propagates');
   await api.generateRandomDraft();check(S.project.randomWorkflowV16.previousFinishedProject?.artDirection?.songNativeResolved,'previous completion snapshot');
   const stored=await api.loadLocal();check(stored.randomWorkflowV16.draftId===S.project.randomWorkflowV16.draftId,'IDB draft round trip');
   const restored=J.plan(stored,S.audio);check(J.canonicalJSON(restored.cuts)===J.canonicalJSON(S.project.randomWorkflowV16.originalCuts),'draft actual Renderer cuts restore '+JSON.stringify({hash:stored.randomWorkflowV16.inputHash,current:J.songNativeInputIdentity(stored,S.audio),live:J.songNativeInputIdentity(S.project,S.audio),compat:restored.songNativeDirection?.rendererCompatibilityId,diff:Object.keys({...stored,...S.project}).filter(k=>J.canonicalJSON(S.project[k])!==J.canonicalJSON(stored[k]))}));
   const changed=copy(S.project);changed.lyrics+='\nchanged';let stale=false;try{J.selectedDraftSnapshotV16(changed,restored,S.audio);}catch(e){stale=e.message==='V16_DRAFT_INPUT_CHANGED';}check(stale,'input invalidation');
   const changing=copy(S.project);delete changing.randomWorkflowV16;let changedDuring=false;
   try{await J.generateRandomDraftV16(changing,S.audio,{seed:16000,onProgress:()=>{changing.title+='changed';}});}catch(e){changedDuring=e.message==='V16_DRAFT_INPUT_CHANGED';}check(changedDuring,'input changes during generation rejected');
   const lockedProject=copy(S.project);lockedProject.overrides[0]={...lockedProject.overrides[0],lock:true};delete lockedProject.randomWorkflowV16;
   const lockedDraft=await J.generateRandomDraftV16(lockedProject,S.audio,{seed:16000,initialPlan:S.plan});check(J.canonicalJSON(lockedDraft.plan.cuts.filter(c=>c.line===0))===J.canonicalJSON(S.plan.cuts.filter(c=>c.line===0)),'locked source cuts preserved');
   const s=copy(S.project);s.aspect='9:16';s.lyrics='[00:00]多言語の長い歌詞を全文表示するテストです Hello 世界\n[00:02]Again, tomorrow — 光の中へ';delete s.randomWorkflowV16;
   const portrait=await J.generateRandomDraftV16(s,S.audio,{seed:16002});check(portrait.plan.H>portrait.plan.W&&portrait.draft.certification==='UNOPTIMIZED_NOT_EXPORT_CERTIFIED','portrait multilingual draft');
   return {drafts:drafts.map(d=>({seed:d.seed,genomes:d.originalCreativeGenome,metrics:d.metrics})),chosenDraftId:done.draftId,finishMetrics:done.finishMetrics,changes:done.changes,scale:done.scaleSafety,saveFailureProtectsCompletion:true,immutable:true,cancelled,inputInvalidation:stale,restore:true,portrait:true,observations};
  },input);
  if(!assetDir){
   const reload=await browser.newPage();await reload.goto(process.argv[2]||'http://127.0.0.1:4173/');await reload.waitForFunction(()=>J.uiApi);
   await reload.evaluate(async()=>{
    const J=window.J,S=J.ui;S.project=J.uiApi.mergeProject(J.defaultProject());S.project.lyrics='[00:00]光へ歩こう\n[00:02]同じ空';
    const bg=Object.assign(document.createElement('canvas'),{width:320,height:180}),x=bg.getContext('2d'),g=x.createLinearGradient(0,0,320,180);g.addColorStop(0,'#10243c');g.addColorStop(1,'#ba8154');x.fillStyle=g;x.fillRect(0,0,320,180);S.project.customBg={...S.project.customBg,enabled:true,dataUrl:bg.toDataURL()};await S.renderer.loadCustomBackground(S.project.customBg.dataUrl);
    const samples=48000*4,bytes=new ArrayBuffer(44+samples*2),v=new DataView(bytes),write=(off,text)=>{for(let i=0;i<text.length;i++)v.setUint8(off+i,text.charCodeAt(i));};write(0,'RIFF');v.setUint32(4,36+samples*2,true);write(8,'WAVEfmt ');v.setUint32(16,16,true);v.setUint16(20,1,true);v.setUint16(22,1,true);v.setUint32(24,48000,true);v.setUint32(28,96000,true);v.setUint16(32,2,true);v.setUint16(34,16,true);write(36,'data');v.setUint32(40,samples*2,true);for(let i=0;i<samples;i++)v.setInt16(44+i*2,Math.round(Math.sin(i/48000*Math.PI*440)*5000),true);
    await J.uiApi.loadAudioFile(new File([bytes],'reload.wav',{type:'audio/wav',lastModified:123}));S.project.timing.snap=false;J.randomDraftSeedV16=()=>12812;J.uiApi.syncUI();J.uiApi.replan();await J.uiApi.generateRandomDraft();if(J.uiApi.workflowStateV16()!=='RANDOM_DRAFT_READY')throw Error('reload fixture draft failed');
   });
   await reload.reload();await reload.waitForFunction(()=>J.ui?.audio&&!J.ui.audioLoading,undefined,{timeout:120000});assert.equal(await reload.evaluate(()=>J.uiApi.workflowStateV16()),'RANDOM_DRAFT_READY');assert.equal(await reload.evaluate(()=>J.canonicalJSON(J.ui.plan.cuts)===J.canonicalJSON(J.ui.project.randomWorkflowV16.originalCuts)),true);report.browserReload=true;await reload.close();
  }
  if(process.env.KAMEN_V16_REPORT)fs.writeFileSync(process.env.KAMEN_V16_REPORT,JSON.stringify(report,null,2));
  if(assetDir){await page.reload();await page.waitForFunction(()=>J.ui?.audio&&!J.ui.audioLoading,undefined,{timeout:120000});assert.equal(await page.evaluate(()=>J.uiApi.workflowStateV16()),'RANDOM_DRAFT_READY');report.browserReload=true;}
  await page.screenshot({path:process.env.KAMEN_V16_SCREENSHOT||'/tmp/kamen-v16-ui.png',fullPage:true});
  if(process.env.KAMEN_V16_REPORT)fs.writeFileSync(process.env.KAMEN_V16_REPORT,JSON.stringify(report,null,2));
  console.log('V16 PASS',JSON.stringify({lines:report.changes.length,finishMetrics:report.finishMetrics,drafts:report.drafts.map(d=>d.metrics)}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
