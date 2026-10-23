'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const url=process.argv[2];
assert(url,'URL is required');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.KAMEN_CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],timeout:30000});
 try{
  const page=await browser.newPage(),errors=[];page.on('console',m=>{if(m.type()==='error')console.error(m.text());});page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto(url,{waitUntil:'load',timeout:30000});assert.equal(response.status(),200);
  await page.waitForFunction(()=>window.J?.ui&&window.KAMEN_BUILD_INFO,undefined,{timeout:15000});
  assert.equal(await page.evaluate(()=>document.querySelector('#studioExport')!==null),true);
  assert.equal(await page.locator('#studioRefinementMode').inputValue(),'fast');
  assert.equal(await page.locator('#studioRefinementMode option[value=quality]').count(),1);
  const generation=await page.evaluate(async()=>{
   const J=window.J,q=J.defaultProject(),audio={duration:1,bpm:120,energy:Float32Array.from([.2,.8]),energyRate:2,features:{energy:.5}};
   q.lyrics='[00:00]歌\n[00:00.50]空';const proposal=J.proposeDirection(q,audio,null);Object.assign(q,{style:proposal.style,mood:proposal.mood,fx:{...proposal.fx,motion:.95},enabled:proposal.enabled,seed:proposal.seed,overrides:proposal.overrides,autoDirection:true});q.artDirection=J.makeArtDirection(q,audio,proposal);q.fonts={...q.artDirection.typography};let p=J.plan(q,audio);
   q.renderFeedbackRequested=true;if(p.songNativeDirection.sourceIdentity!==J.songNativeInputIdentity(q,audio))throw Error('DIAGNOSTIC_CHANGED_DIRECTION_IDENTITY');
   p.cuts[0].songNativeRepair={motionDelta:.12};const before=J.songNativeFixSnapshot(q,audio,p);J.fixMVQuality(q,{issues:[{code:'motion',fixable:true}]},audio);p=J.plan(q,audio);
   if(!J.reapplySongNativeSelection(before,q,audio,p,'LOCAL_MOTION'))throw Error('FIX_SELECTION_NOT_RETAINED');J.ensureSongNativeDirection(q,audio,p);
   await J.ensureFonts(q.lyrics,J.fontsOfPlan(p));await document.fonts.ready;
   const range={start:0,end:.04},qa=await J.observeMVQuality(p,range,audio,{observationCache:new Map()});if(!qa.completed||qa.observationBinding.planHash!==await J.cinemaV3.planHash(p))throw Error('SMOKE_FINAL_PLAN_UNOBSERVED');
   J.captureSongNativeResolved(q,audio,p);const restored=J.plan(JSON.parse(JSON.stringify(q)),audio);return {restored:restored.songNativeRestore.status,repair:restored.cuts[0].songNativeRepair?.motionDelta};
  });assert.equal(generation.restored,'RESTORED');assert.equal(generation.repair,.12);
  await page.evaluate(async()=>{
   const J=window.J,S=J.ui;S.project.lyrics='[00:00]歩こう\n[00:00.50]同じ空';
   const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const ctx=canvas.getContext('2d');ctx.fillStyle='#102540';ctx.fillRect(0,0,160,90);
   S.project.customBg={...S.project.customBg,enabled:true,dataUrl:canvas.toDataURL()};await S.renderer.loadCustomBackground(S.project.customBg.dataUrl);
   const buffer=new AudioBuffer({length:48000,sampleRate:48000,numberOfChannels:1}),pcm=buffer.getChannelData(0);for(let i=0;i<pcm.length;i++)pcm[i]=Math.sin(i/48000*Math.PI*440)*.2;
   S.audio={name:'synthetic',buffer,duration:1,bpm:120,energyRate:2,energy:Float32Array.from([.2,.8]),onset:Float32Array.from([.2,.6]),features:{energy:.5}};S.project.timing.snap=false;J.uiApi.syncUI();J.uiApi.replan();
  });
  await page.evaluate(()=>{const original=J.searchSongNativeCandidates;J.searchSongNativeCandidates=async(...args)=>{try{return await original(...args);}catch(e){console.error('DIRECTION_DIAGNOSTIC '+JSON.stringify(e.diagnostic));throw e;}};});
  await page.evaluate(async()=>{await J.uiApi.flushSave();window.storageFailurePut=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(value,key){if(key==='project-current-v2')throw new DOMException('Injected IDB quota exhaustion','QuotaExceededError');return window.storageFailurePut.call(this,value,key);};});
  await page.locator('#btnAutoDirection').click({force:true});
  await page.waitForFunction(()=>document.querySelector('#directionStatus').dataset.result==='true'||[...J.processing.jobs.values()].some(s=>s.status==='error'),null,{timeout:120000}).catch(async e=>{console.error('UI_TIMEOUT',await page.evaluate(()=>({status:document.querySelector('#directionStatus').textContent,jobs:[...J.processing.jobs.values()].map(x=>({status:x.status,error:x.error,stage:x.stage}))})));throw e;});
  await page.waitForFunction(()=>!document.querySelector('#btnAutoDirection').disabled,null,{timeout:60000});
  assert.equal(await page.evaluate(async()=>{const S=J.ui;if(!S.unsaved||S.persistenceError?.name!=='QuotaExceededError'||!document.querySelector('#directionStatus').textContent.includes('MVは生成できました'))return false;J.assertSelectionV9(S.plan,S.audio);const backup=JSON.parse(await J.uiApi.portableProjectJSON());if(!backup.artDirection.songNativeResolved)return false;IDBObjectStore.prototype.put=window.storageFailurePut;return await J.uiApi.flushSave()&&!S.unsaved;}),true);
  console.log('Generated MV survives IndexedDB quota failure, backup and retry PASS');
  const grammar=await page.evaluate(()=>{
   const J=window.J,S=J.ui;if(document.querySelector('#directionStatus').dataset.result!=='true')throw Error('V9_UI_GENERATION_FAILED: '+[...J.processing.jobs.values()].filter(s=>s.status==='error').map(s=>s.error).join(';'));
   J.assertSelectionV9(S.plan,S.audio);
   const audio={...S.audio,beats:J.beatGrid(S.project.timing.bpm,S.project.timing.beatOffset||0,1)},saved=JSON.parse(JSON.stringify(S.project)),round=J.plan(saved,audio);
   if(J.canonicalJSON(J.songNativeRenderDecisions(S.plan))!==J.canonicalJSON(J.songNativeRenderDecisions(round)))throw Error('V9_RENDER_DECISIONS_CHANGED');
   return {exploration:S.plan.songNativeDirection.explorationVersion,optimizer:S.plan.songNativeDirection.selection.optimizerVersion,arc:S.plan.songNativeDirection.selection.visualArc,version:S.plan.songNativeDirection.version,restored:round.songNativeRestore.status,observed:S.pixelQA?.completed,build:window.KAMEN_BUILD_INFO};
  });assert.equal(grammar.version,9);assert.equal(grammar.optimizer,11);assert.equal(grammar.exploration,15);assert.equal(grammar.arc.status,'MEASURED');assert.equal(grammar.restored,'RESTORED');assert.equal(grammar.observed,true);console.log('Browser v15 real UI/Canvas/quality/commit/restore smoke PASS',JSON.stringify(grammar.build));
  await page.waitForFunction(()=>!document.querySelector('#btnAutoDirection').disabled,null,{timeout:15000});
  if(await page.evaluate(()=>!!J.ui.plan.songNativeDirection.selection.alternatives?.length)){
   await page.locator('#studioAlternative').click({force:true});
   await page.waitForFunction(()=>document.querySelector('#alternativeChoice').textContent==='実Canvas確認済みの別案を適用しました'||!document.querySelector('#btnAutoDirection').disabled,null,{timeout:60000});
   assert.equal(await page.locator('#alternativeChoice').textContent(),'実Canvas確認済みの別案を適用しました',await page.evaluate(()=>document.body.innerText.slice(-2000)));
   assert.equal(await page.evaluate(()=>{const J=window.J,S=J.ui;J.assertSelectionV9(S.plan,S.audio);return S.project.artDirection.songNativeResolved.version;}),9);
   console.log('Browser safe alternate storyboard commit PASS');
  }
  await page.waitForFunction(()=>!document.querySelector('#btnAutoDirection').disabled,null,{timeout:15000});
  await page.evaluate(()=>{const J=window.J;window.smokeConfirmed={project:J.canonicalJSON(J.ui.project),decisions:J.canonicalJSON(J.songNativeRenderDecisions(J.ui.plan)),search:J.searchSongNativeCandidates};J.searchSongNativeCandidates=async()=>{throw Error('SMOKE_SEARCH_FAILURE');};});
  await page.locator('#btnAutoDirection').click({force:true});
  await page.waitForFunction(()=>document.querySelector('#directionStatus').textContent==='SMOKE_SEARCH_FAILURE',null,{timeout:15000});
  assert.equal(await page.evaluate(()=>{const J=window.J,b=window.smokeConfirmed;J.searchSongNativeCandidates=b.search;J.assertSelectionV9(J.ui.plan,J.ui.audio);return J.canonicalJSON(J.ui.project)===b.project&&J.canonicalJSON(J.songNativeRenderDecisions(J.ui.plan))===b.decisions;}),true);
  console.log('Browser failed-generation rollback preserves the confirmed project and storyboard PASS');
  assert.deepEqual(errors,[]);console.log('Browser initialization and observed synthetic quality-fix/commit/restore smoke PASS',browser.version());
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
