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
   const J=window.J,q=J.legacyDefaultProject(),audio={duration:1,bpm:120,energy:Float32Array.from([.2,.8]),energyRate:2,features:{energy:.5}};
   q.lyrics='[00:00]歌\n[00:00.50]空';const proposal=J.proposeDirection(q,audio,null);Object.assign(q,{style:proposal.style,mood:proposal.mood,fx:{...proposal.fx,motion:.95},enabled:proposal.enabled,seed:proposal.seed,overrides:proposal.overrides,autoDirection:true});q.artDirection=J.makeArtDirection(q,audio,proposal);q.fonts={...q.artDirection.typography};let p=J.plan(q,audio);
   q.renderFeedbackRequested=true;if(p.songNativeDirection.sourceIdentity!==J.songNativeInputIdentity(q,audio))throw Error('DIAGNOSTIC_CHANGED_DIRECTION_IDENTITY');
   p.cuts[0].songNativeRepair={motionDelta:.12};const before=J.songNativeFixSnapshot(q,audio,p);J.fixMVQuality(q,{issues:[{code:'motion',fixable:true}]},audio);p=J.plan(q,audio);
   if(!J.reapplySongNativeSelection(before,q,audio,p,'LOCAL_MOTION'))throw Error('FIX_SELECTION_NOT_RETAINED');J.ensureSongNativeDirection(q,audio,p);
   await J.ensureFonts(q.lyrics,J.fontsOfPlan(p));await document.fonts.ready;
   const range={start:0,end:.04},qa=await J.observeMVQuality(p,range,audio,{observationCache:new Map()});if(!qa.completed||qa.observationBinding.planHash!==await J.cinemaV3.planHash(p))throw Error('SMOKE_FINAL_PLAN_UNOBSERVED');
   J.captureSongNativeResolved(q,audio,p);const restored=J.plan(JSON.parse(JSON.stringify(q)),audio);return {restored:restored.songNativeRestore.status,repair:restored.cuts[0].songNativeRepair?.motionDelta};
  });assert.equal(generation.restored,'RESTORED');assert.equal(generation.repair,.12);
  await page.evaluate(async()=>{
   const J=window.J,S=J.ui;S.project=J.uiApi.mergeProject(J.legacyDefaultProject());S.project.lyrics='[00:00]歩こう\n[00:02]同じ空';
   const canvas=document.createElement('canvas');canvas.width=160;canvas.height=90;const ctx=canvas.getContext('2d');ctx.fillStyle='#102540';ctx.fillRect(0,0,160,90);
   S.project.customBg={...S.project.customBg,enabled:true,dataUrl:canvas.toDataURL()};await S.renderer.loadCustomBackground(S.project.customBg.dataUrl);
   const buffer=new AudioBuffer({length:192000,sampleRate:48000,numberOfChannels:1}),pcm=buffer.getChannelData(0);for(let i=0;i<pcm.length;i++)pcm[i]=Math.sin(i/48000*Math.PI*440)*.2;
   S.audio={name:'synthetic',buffer,duration:4,bpm:120,energyRate:2,energy:Float32Array.from([.2,.8]),onset:Float32Array.from([.2,.6]),features:{energy:.5}};S.project.timing.snap=false;J.uiApi.syncUI();J.uiApi.replan();
  });
  await page.evaluate(async()=>{
   const S=J.ui,previous=S.project,plan=S.plan;
   J.randomDraftSeedV16=()=>16002;await J.uiApi.flushSave();const put=IDBObjectStore.prototype.put;
   IDBObjectStore.prototype.put=function(value,key){if(key==='project-current-v2')throw new DOMException('Injected IDB quota exhaustion','QuotaExceededError');return put.call(this,value,key);};
   try{await J.uiApi.runRandomWorkflowV16(false);if(S.project!==previous||S.plan!==plan)throw Error('V16_QUOTA_CHANGED_PREVIOUS');}finally{IDBObjectStore.prototype.put=put;}
   await J.uiApi.runRandomWorkflowV16(false);if(S.project.randomWorkflowV16?.state!=='RANDOM_DRAFT_READY')throw Error('V16_NO_DRAFT');
   if(!document.querySelector('#studioExport').disabled||S.pixelQA)throw Error('V16_DRAFT_WAS_FINISHED');
  });
  console.log('Browser v16 draft/atomic quota rollback PASS; selected finishing is covered by kamen_random_v16_test');
  await page.waitForFunction(()=>!document.querySelector('#btnAutoDirection').disabled,null,{timeout:15000});
  await page.evaluate(async()=>{
   const J=window.J,S=J.ui,project=S.project,plan=S.plan,generate=J.generateRandomDraftV16;
   J.generateRandomDraftV16=async()=>{throw Error('SMOKE_DRAFT_FAILURE');};
   try{await J.uiApi.runRandomWorkflowV16(false);if(S.project!==project||S.plan!==plan)throw Error('V16_FAILED_DRAFT_CHANGED_COMPLETION');}finally{J.generateRandomDraftV16=generate;}
  });
  console.log('Browser failed-generation rollback preserves the previous project and draft PASS');
  assert.deepEqual(errors,[]);console.log('Browser initialization and observed synthetic quality-fix/commit/restore smoke PASS',browser.version());
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
