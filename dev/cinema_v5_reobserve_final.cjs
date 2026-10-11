'use strict';
// Reobserve an existing immutable MP4 with its original runtime and selected plan.
// This never replans, re-encodes, or replaces the original renderer.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{chromium}=require('playwright-core');
const [directory,currentURL,baselineURL]=process.argv.slice(2),root=path.resolve(__dirname,'..'),digest=b=>crypto.createHash('sha256').update(b).digest('hex');
assert(directory&&currentURL&&baselineURL,'Usage: cinema_v5_reobserve_final.cjs MATRIX_DIR CURRENT_URL BASELINE_URL');
(async()=>{
 const rows=JSON.parse(fs.readFileSync(path.join(directory,'results.json'))).rows,browser=await chromium.launch({executablePath:process.env.KAMEN_CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']}),observations=[];
 try{for(const row of rows){
  assert(row.referenceInputs,'Selected plan reference required; never infer a missing plan');
  const refBytes=fs.readFileSync(path.join(directory,row.referenceInputs.file)),wav=fs.readFileSync(path.join(directory,row.referenceInputs.audioFile)),video=fs.readFileSync(path.join(directory,row.fixture.id+'-'+row.variant+'.mp4'));
  assert.equal(digest(refBytes),row.referenceInputs.sha256);assert.equal(digest(wav),row.referenceInputs.audioSHA256);assert.equal(digest(video),row.sha256);
  const page=await browser.newPage();try{
   const response=await page.goto(row.variant==='baseline'?baselineURL:currentURL,{waitUntil:'load'});assert.equal(digest(await response.body()),row.runtimeHTMLSHA256,'Original renderer runtime changed');
   await page.evaluate(()=>{J.cinemaV5??={version:5,humanStatus:'HUMAN_UNVERIFIED'};});
   for(const file of ['vendor/aac-browser.min.js','src/11zzzzzzzzza_decoded_v5.js','src/11zzzzzzzzzaa_final_artifact_v5.js'])await page.addScriptTag({content:fs.readFileSync(path.join(root,file),'utf8')});
   const evidence=await page.evaluate(async({reference,wav,video,validation,provenance,variant})=>{
    const revive=(k,v)=>v?.__qaTypedArray?new window[v.__qaTypedArray](v.data):v?.__qaMap?new Map(v.__qaMap):v?.__qaSet?new Set(v.__qaSet):v;
    if(variant==='baseline'&&!window.KAMEN_BUILD_INFO)window.KAMEN_BUILD_INFO=Object.freeze({sourceCommit:'5ea7d953f1720654521a2cd9d800706d40f40c49',sourceDirty:false,sourceTreeSHA256:null,identityMethod:'Pinned pristine baseline worktree and independently checked runtime HTML SHA-256'});
    const ref=JSON.parse(reference,revive),bytes=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0)),audio=await J.analyzeAudio(new Blob([bytes(wav)],{type:'audio/wav'}));
    if(await J.cinemaV3.planHash(ref.plan)!==ref.planHash)throw Error('RESTORED_SELECTED_PLAN_HASH_MISMATCH');
    await J.cinemaV3.assertSnapshot(ref.inputSnapshot,ref.project,audio,ref.plan,ref.range);
    // These aliases expose the same existing renderer formulas without changing rendering.
    J.cinemaLoopWindow??=(p,end)=>{const c=p.cuts.filter(c=>c.line>=0&&c.start<end).at(-1)||J.cutAt(p,end-1/p.fps);return Math.min(.65,Math.max(0,end-(c?.end??end))+Math.max(0,c?.dur||0)*.15);};
    J.cinemaTypographyClosingWindow??=(p,c,end)=>Math.min(.36,Math.max(0,end-c.start-.55));
    await J.ensureFonts(ref.project.lyrics,J.fontsOfPlan(ref.plan));
    const observed=await J.cinemaV5.verifyFinalArtifact({blob:new Blob([bytes(video)],{type:'video/mp4'}),validation,provenance},{plan:ref.plan,project:ref.project,audio,range:ref.range},ref.inputSnapshot);
    return {artifact:observed,originalRuntime:variant,method:'Original immutable MP4 and selected plan; original renderer; newer independent verifier; no encode or plan repair'};
   },{reference:refBytes.toString(),wav:wav.toString('base64'),video:video.toString('base64'),validation:row.validation,provenance:{videoSHA256:row.sha256},variant:row.variant});
   const file=row.fixture.id+'-'+row.variant+'-final-reobserved.json';fs.writeFileSync(path.join(directory,file),JSON.stringify(evidence));observations.push({fixture:row.fixture.id,variant:row.variant,videoSHA256:row.sha256,runtimeHTMLSHA256:row.runtimeHTMLSHA256,file,sha256:digest(fs.readFileSync(path.join(directory,file))),status:evidence.artifact.status,motionSummary:evidence.artifact.motionSummary,units:evidence.artifact.units});
   fs.writeFileSync(path.join(directory,'final-reobservation-manifest.json'),JSON.stringify({observations},null,2));console.log(row.fixture.id,row.variant,evidence.artifact.status);
  }finally{await page.close();}
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
