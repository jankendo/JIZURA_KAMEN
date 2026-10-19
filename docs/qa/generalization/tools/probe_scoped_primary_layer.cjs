'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),zlib=require('node:zlib');
const {chromium}=require('playwright-core');
const {installScopedPrimaryLayerControl}=require('./scoped_primary_layer_control.cjs');
const {restoreMeasuredCompositionCache}=require('./dev09_composition_replay_state.cjs');
const [url,rowFile,referenceFile,traceFile,movieFile,targetFile,out]=process.argv.slice(2);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),read=p=>JSON.parse(p.endsWith('.gz')?zlib.gunzipSync(fs.readFileSync(p)):fs.readFileSync(p));
const row=read(rowFile),reference=read(referenceFile),trace=read(traceFile),target=read(targetFile),movie=fs.readFileSync(movieFile);
assert.equal(sha(fs.readFileSync(referenceFile)),row.referenceInputs.sha256);assert.equal(sha(movie),row.sha256);assert.equal(trace.videoSHA256,row.sha256);
fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:process.env.KAMEN_CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.J?.ui?.project);
 await page.addScriptTag({content:'window.qaScopedLayer='+installScopedPrimaryLayerControl.toString()+';window.qaRestoreComposition='+restoreMeasuredCompositionCache.toString()+';'});
 const result=await page.evaluate(async({reference,row,target,movie})=>{
  const J=window.J,revive=v=>!v||typeof v!=='object'?v:v.__qaTypedArray?new window[v.__qaTypedArray](v.data):v.__qaMap?new Map(v.__qaMap.map(([k,x])=>[revive(k),revive(x)])):v.__qaSet?new Set(v.__qaSet.map(revive)):Array.isArray(v)?v.map(revive):Object.fromEntries(Object.entries(v).map(([k,x])=>[k,revive(x)]));
  const p=revive(reference.plan),project=revive(reference.project),binding=row.provenance.finalArtifactVerification.binding,build=window.KAMEN_BUILD_INFO;
  if(build.sourceCommit!==binding.sourceCommit||build.sourceTreeSHA256!==binding.rendererVersion||build.sourceDirty!==false)throw Error('SOURCE_BINDING_MISMATCH');
  const before=await J.cinemaV3.planHash(p);if(before!==reference.planHash||before!==binding.planHash)throw Error('PLAN_BINDING_MISMATCH');
  J.enableSingleBackgroundMode();if(p.visualAssets?.length>1)J.singleBackgroundMode=false;await J.ensureFonts(p.lines.map(l=>l.text).join(''),Object.keys(J.FONTS));
  const [width,height]=binding.outputProfile.resolution,all=[];J.glyphs.maxRes=height>=1000?768:512;
  const hash=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
  for(const mode of ['TRACE','OMIT','TRACE']) {
   const cv=document.createElement('canvas');cv.width=width;cv.height=height;const ctx=cv.getContext('2d',{alpha:false,willReadFrequently:true}),R=new J.Renderer(),frames=[];
   try{
    if(p.customBg?.enabled)await R.loadCustomBackground(p.customBg.dataUrl);await R.loadAssetDeck?.(p);
    if(row.provenance.photoComposition?.scenes){R.frame(ctx,p,reference.range.start,{scale:width/p.W,production:true,range:reference.range});window.qaRestoreComposition(J,p,{binding,actualPlanHash:before,build,inputHash:binding.inputHash,photoComposition:row.provenance.photoComposition});}
    const hook=window.qaScopedLayer(J,p,ctx,target,mode);
    try{for(const time of target.outputClocks){await R.prepareAssetFrame?.(p,time);R.frame(ctx,p,time,{scale:width/p.W,production:true,range:reference.range});const rgba=ctx.getImageData(0,0,width,height).data;frames.push({time,nativeSHA256:await hash(rgba),luma:Array.from(J.cinemaReferenceLuma(rgba))});}}finally{hook.restore();}
    all.push({mode,frames,records:hook.records});
   }finally{R.customBgBitmap?.close?.();R.disposeAssets?.();cv.width=cv.height=1;}
  }
  const decoded=[],start=binding.outputProfile.range[0],bytes=Uint8Array.from(atob(movie),c=>c.charCodeAt(0));
  await window.JIZURAMedia.sampleMP4(new Blob([bytes],{type:'video/mp4'}),target.outputClocks.map(t=>t-start),{width,height,onSample:(requested,pixels,meta)=>{decoded.push({requestedOutputTimestamp:start+requested,actualOutputTimestamp:start+meta.timestamp,luma:Array.from(J.cinemaReferenceLuma(pixels))});}});
  if(await J.cinemaV3.planHash(p)!==before)throw Error('PLAN_MUTATED');return {build,binding,target,all,decoded,dimensions:[width,height]};
 },{reference,row,target,movie:movie.toString('base64')});
 assert.deepEqual(errors,[]);const [on,off,repeat]=result.all;
 const samples=on.frames.map((a,i)=>{const b=off.frames[i],r=repeat.frames[i],d=result.decoded.find(x=>Math.abs(x.actualOutputTimestamp-a.time)<1e-6);assert(d,'EXACT_DECODED_OUTPUT_CLOCK_REQUIRED');let pixels=0,errorOn=0,errorOff=0,projection=0,energy=0;for(let n=0;n<a.luma.length;n++){const delta=a.luma[n]-b.luma[n];if(Math.abs(delta)<.02)continue;pixels++;errorOn+=(d.luma[n]-a.luma[n])**2;errorOff+=(d.luma[n]-b.luma[n])**2;projection+=(d.luma[n]-b.luma[n])*delta;energy+=delta*delta;}const historical=trace.nativeFrameHashes.find(f=>f.time===a.time);return {outputTimestamp:a.time,actualDecodedTimestamp:d.actualOutputTimestamp,affectedPixels:pixels,nativeRepeatEqual:a.nativeSHA256===r.nativeSHA256,nativeOriginalEqual:historical?.sha256===a.nativeSHA256,nativeSHA256:a.nativeSHA256,historicalNativeSHA256:historical?.sha256??null,projection:energy?projection/energy:null,decodedRMSEAgainstOn:pixels?Math.sqrt(errorOn/pixels):null,decodedRMSEAgainstOff:pixels?Math.sqrt(errorOff/pixels):null};});
 assert(on.records.some(r=>r.selected),'TARGET_PRIMARY_DISPATCH_NOT_OBSERVED');assert(off.records.some(r=>r.omitted),'TARGET_PRIMARY_OMISSION_NOT_OBSERVED');
 const strip=x=>x.map(({omitted,...v})=>v),nonTarget=x=>strip(x.records.filter(r=>!r.selected));
 assert.deepEqual(nonTarget(on),nonTarget(off),'NON_TARGET_DISPATCH_CHANGED');assert.deepEqual(on.records,repeat.records,'REPEAT_DISPATCH_CHANGED');
 const raw=Buffer.from(JSON.stringify(result));fs.writeFileSync(path.join(out,'raw.json.gz'),zlib.gzipSync(raw));
 const report={schema:1,caseId:row.fixture.id,sourceCommit:result.build.sourceCommit,videoSHA256:row.sha256,referenceSHA256:sha(fs.readFileSync(referenceFile)),traceSHA256:sha(fs.readFileSync(traceFile)),target,sourceCut:reference.plan.cuts[target.ordinal],samples,selectedCalls:on.records.filter(r=>r.selected),omittedCalls:off.records.filter(r=>r.omitted),nonTargetDispatchUnchanged:true,newVideos:0,rawSHA256:sha(fs.readFileSync(path.join(out,'raw.json.gz'))),classification:'SCOPED_NATIVE_OMISSION_AND_EXISTING_DECODED_DIAGNOSTIC',releaseCredit:false,limits:'No encoded target-specific OFF or independent semantic model. Pixel presence diagnostics cannot certify an operator or transfer historical evidence to a changed renderer.'};fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
 }finally{await browser.close();}})().catch(e=>{fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({status:'FAIL',error:String(e.stack)}));console.error(e);process.exitCode=1;});
