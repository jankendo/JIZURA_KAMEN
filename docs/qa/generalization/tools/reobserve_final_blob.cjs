'use strict';
const fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto'),assert=require('assert/strict'),os=require('os');
const {chromium}=require('playwright-core');
const [url,dir,out]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.KAMEN_CHROME||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 const ref=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir,'reference.json.gz'))));const row=JSON.parse(zlib.gunzipSync(fs.readFileSync(path.join(dir,'row.json.gz'))));const video=fs.readFileSync(path.join(dir,'video.mp4')),wav=fs.readFileSync(path.join(dir,'input.wav'));
 assert.equal(sha(video),row.sha256);assert.equal(sha(wav),row.referenceInputs.audioSHA256);
 for(let repeat=0;repeat<2;repeat++){
 const context=await browser.newContext(),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url,{waitUntil:'load'});await page.waitForFunction(()=>window.J?.ui?.project);
 const report=await page.evaluate(async({ref,row,video,wav})=>{
  const J=window.J,Q=J.cinemaV5,revive=v=>{if(!v||typeof v!=='object')return v;if(v.__qaTypedArray)return new window[v.__qaTypedArray](v.data);if(v.__qaMap)return new Map(v.__qaMap.map(([k,x])=>[revive(k),revive(x)]));if(v.__qaSet)return new Set(v.__qaSet.map(revive));if(Array.isArray(v))return v.map(revive);return Object.fromEntries(Object.entries(v).map(([k,x])=>[k,revive(x)]));};
  const bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));const plan=revive(ref.plan),project=revive(ref.project),audio=await J.analyzeAudio(new Blob([bytes(wav)],{type:'audio/wav'}));
  J.enableSingleBackgroundMode();await J.ensureFonts(plan.lines.map(l=>l.text).join(""),J.fontsOfPlan(plan));if(await J.cinemaV3.planHash(plan)!==ref.planHash)throw Error('RESTORED_PLAN_HASH_MISMATCH');
  const args={plan,project,audio,range:ref.range};const input=await J.cinemaV3.snapshot(project,audio,plan,ref.range);if(input.inputHash!==ref.inputSnapshot.inputHash)throw Error('RESTORED_INPUT_HASH_MISMATCH');
  const result={blob:new Blob([bytes(video)],{type:'video/mp4'}),validation:row.validation,provenance:row.provenance};
  return {inputHash:input.inputHash,result:await Q.verifyFinalArtifact(result,args,input)};
 },{ref,row,video:video.toString('base64'),wav:wav.toString('base64')});
 fs.writeFileSync(path.join(out,'repeat-'+repeat+'.json.gz'),zlib.gzipSync(JSON.stringify({environment:{browser:browser.version(),node:process.version,os:os.platform(),release:os.release()},originalEvidenceId:row.provenance.finalArtifactVerification.evidenceId,originalVideoSHA256:sha(video),repeat,errors,...report})));
 console.log(JSON.stringify({repeat,status:report.result?.status,errors}));assert.equal(errors.length,0);await context.close();
 }
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
