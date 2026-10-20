'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const url=process.argv[2];
assert(url,'URL is required');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.KAMEN_CHROME||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],timeout:30000});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
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
   const range={start:0,end:.04},qa=await J.observeMVQuality(p,range,audio,{observationCache:new Map()});if(!qa.completed||qa.observationBinding.planHash!==await J.cinemaV3.planHash(p))throw Error('SMOKE_FINAL_PLAN_UNOBSERVED');
   J.captureSongNativeResolved(q,audio,p);const restored=J.plan(JSON.parse(JSON.stringify(q)),audio);return {restored:restored.songNativeRestore.status,repair:restored.cuts[0].songNativeRepair?.motionDelta};
  });assert.equal(generation.restored,'RESTORED');assert.equal(generation.repair,.12);
  assert.deepEqual(errors,[]);console.log('Browser initialization and observed synthetic quality-fix/commit/restore smoke PASS',browser.version());
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
