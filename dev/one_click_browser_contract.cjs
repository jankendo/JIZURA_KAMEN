// UI boundary fixture: synthetic acceptance, independently validated MP4 reuse.
// Does not create new videos or measure creative quality.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright-core');
const [url,fixtureDirectory,output]=process.argv.slice(2);assert(url&&fixtureDirectory&&output);fs.mkdirSync(output,{recursive:true});
const fixture=JSON.parse(fs.readFileSync(path.join(fixtureDirectory,'report.json'))),video=fs.readFileSync(path.join(fixtureDirectory,'ui-export.mp4')).toString('base64');
(async()=>{const browser=await chromium.launch({executablePath:process.env.KAMEN_CHROME,headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const page=await browser.newPage({acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.J?.ui);
 await page.evaluate(({video,validation,videoHash})=>{
  window.showSaveFilePicker=undefined;const S=J.ui;S.project={...J.defaultProject(),lyrics:'[00:00.20]光へ',includeAudio:false};S.audio={duration:3,beats:[],buffer:new AudioContext().createBuffer(1,144000,48000)};S.plan=J.plan(S.project,{duration:3,beats:[]});S.rangeMode='full';S.range=null;
  const blob=new Blob([Uint8Array.from(atob(video),c=>c.charCodeAt(0))],{type:'video/mp4'});window.contract={calls:0,acceptance:null,mode:'ok'};
  J.preflightMV=()=>({fixes:0,plan:S.plan});J.fixMVQuality=()=>0;J.analyzeRenderedFrames=async()=>({completed:true});J.preparePhotoExport=async()=>{};J.ensureFonts=async()=>{};
  J.exportCapabilities=async()=>({webCodecs:true,h264:true,aac:true,recorder:null});
  J.checkMVQuality=()=>({ready:true,errors:[],warnings:[],issues:[],quality:{domains:[],categories:[],targetAcceptance:contract.acceptance}});
  J.exportMP4=async()=>{contract.calls++;if(contract.mode==='invalid')throw Error('EXPORT_INVALID invalid fixture');return {blob,sidecar:new Blob([JSON.stringify({fixture:'synthetic UI acceptance',videoSHA256:videoHash})]),codec:'avc1',audio:'aac',validation,provenance:{videoSHA256:videoHash,qualityTarget:contract.acceptance}};};
 },{video,validation:fixture.validation,videoHash:fixture.provenance.videoSHA256});
 const cases=[];
 for(const [state,acceptance] of [['TARGET_MET',{minimumMet:true}],['BELOW_TARGET',{minimumMet:false,failures:[{key:'creative',score:24,minimum:80}]}],['UNMEASURED',{minimumMet:false,failures:[{key:'creative',score:null,minimum:80}]}]]){
  await page.evaluate(a=>{contract.acceptance={hardFailures:[],failures:[],unmeasured:[],...a};document.querySelector('#studioResult').hidden=false;document.querySelector('#studioExport').disabled=false;},acceptance);
  const before=await page.evaluate(()=>contract.calls);await page.locator('#studioExport').click();await page.waitForFunction(()=>J.ui.exporting===null&&J.ui.exportOutcome?.fileState==='SAVE_AVAILABLE');
  const result=await page.evaluate(()=>({outcome:J.ui.exportOutcome,calls:contract.calls,draft:!!document.querySelector('#qualityDraftExport'),job:[...J.processing.jobs.values()].filter(j=>j.title==='動画を書き出しています').map(j=>({status:j.status,error:j.error})).at(-1)}));
  assert(await page.locator('#kamenDownloads a[download$=".mp4"]').count()>0);assert.equal(result.calls,before+1);assert.equal(result.draft,false);assert.equal(result.outcome.creativeState,state);assert.equal(result.job.status,'completed');cases.push({state,...result});
 }
 await page.evaluate(()=>{contract.mode='invalid';document.querySelector('#studioResult').hidden=false;document.querySelector('#studioExport').disabled=false});await page.locator('#studioExport').click();await page.waitForFunction(()=>J.ui.exportOutcome.fileState==='FAILED_TECHNICAL');cases.push(await page.evaluate(()=>({state:'INVALID_MP4',outcome:J.ui.exportOutcome})));
 await page.evaluate(()=>{contract.mode='ok';J.prepareFileSave=async()=> 'declined';document.querySelector('#studioResult').hidden=false;document.querySelector('#studioExport').disabled=false});const before=await page.evaluate(()=>contract.calls);await page.locator('#studioExport').click();await page.waitForFunction(()=>J.ui.exportOutcome.fileState==='CANCELLED');assert.equal(await page.evaluate(()=>contract.calls),before);cases.push(await page.evaluate(()=>({state:'PICKER_CANCEL',outcome:J.ui.exportOutcome})));
 assert.equal(errors.length,0);fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({status:'PASS',evidence:'BROWSER_UI_BOUNDARY_WITH_SYNTHETIC_ACCEPTANCE_AND_VALIDATED_MP4_REUSE',freshEncodes:0,sourceVideoHash:fixture.provenance.videoSHA256,browser:browser.version(),cases,pageErrors:errors},null,2));console.log('Browser UI acceptance/save/error/cancel boundaries PASS; synthetic acceptance and validated MP4 reuse');
 }finally{await browser.close();}})().catch(error=>{console.error(error);process.exitCode=1});
