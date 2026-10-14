'use strict';
const fs=require('fs'),path=require('path'),crypto=require('crypto'),assert=require('assert/strict'),{spawnSync}=require('child_process'),{chromium}=require('playwright-core');
const [url,input,caseId,source,out]=process.argv.slice(2),sha=x=>crypto.createHash('sha256').update(x).digest('hex');fs.mkdirSync(out,{recursive:true});
const row=JSON.parse(fs.readFileSync(path.join(input,'results.json'))).rows.find(x=>x.fixture.id===caseId&&x.status==='PASS'),ref=JSON.parse(fs.readFileSync(path.join(input,row.referenceInputs.file))),wav=fs.readFileSync(path.join(input,row.referenceInputs.audioFile));assert.equal(sha(wav),row.referenceInputs.audioSHA256);
const core=fs.readFileSync(path.join(source,'src/11_export.js'),'utf8');
(async()=>{const browser=await chromium.launch({executablePath:process.env.KAMEN_CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.J?.ui?.project);await page.addScriptTag({content:core+'\nwindow.qaFrozenExport=window.J.exportMP4;'});
 const data=await page.evaluate(async({ref,wav})=>{
  const J=window.J,V=J.cinemaV3,Q=J.cinemaV5,revive=v=>!v||typeof v!=='object'?v:v.__qaTypedArray?new window[v.__qaTypedArray](v.data):Array.isArray(v)?v.map(revive):Object.fromEntries(Object.entries(v).map(([k,x])=>[k,revive(x)])),original=revive(ref.plan),project=revive(ref.project),range=ref.range;
  J.enableSingleBackgroundMode();if(original.visualAssets?.length>1)J.singleBackgroundMode=false;await J.ensureFonts(original.lines.map(x=>x.text).join(''),Object.keys(J.FONTS));
  const audio=await J.analyzeAudio(new Blob([Uint8Array.from(atob(wav),c=>c.charCodeAt(0))],{type:'audio/wav'}));let target=null;const movies=[];
  for(const mode of ['ORIGINAL','SHADOW','EDGE']){
   const p=J.clonePhotoRenderPlan(original);
   if(mode!=='ORIGINAL'){for(const index of target.fragments.map(f=>f.index)){const c=p.cuts[index];if(J.photoChoreographyLocked(p,c))throw Error('TARGET_LOCKED');const old=c.params.cinemaReadabilityRepair;c.params.cinemaReadabilityRepair=mode==='SHADOW'?{...(typeof old==='object'?old:{}),shadow:2}:2;}}
   const input=await V.snapshot(project,audio,p,range),result=await window.qaFrozenExport({plan:p,project,audio,range}),contrast=J.decodedGlyphContrast,luma=J.cinemaReferenceLuma,queue=[],observations=[];
   J.cinemaReferenceLuma=function(...args){const x=luma.apply(this,args);queue.push(x);if(queue.length>3)queue.shift();return x;};
   J.decodedGlyphContrast=function(actual,off,alpha,w,h){const measured=contrast.apply(this,arguments);const on=queue[0];if(on?.length===actual.length)observations.push({nativeExpected:contrast(on,off,alpha,w,h),decoded:measured});return measured;};
   let artifact;try{artifact=await Q.verifyFinalArtifact(result,{plan:p,project,audio,range},input);}finally{J.decodedGlyphContrast=contrast;J.cinemaReferenceLuma=luma;}
   assertNever:if(observations.length!==artifact.frames.length)throw Error('NATIVE_DECODED_OBSERVATION_ALIGNMENT');
   const frames=artifact.frames.map((f,i)=>({unitId:f.unitId,fragmentIndex:f.fragmentIndex,actualDecodedTimestamp:f.actualDecodedTimestamp,phase:f.phase,nativeExpectedContrast:observations[i].nativeExpected.score,decodedContrast:observations[i].decoded.score}));
   if(mode==='ORIGINAL'){const units=artifact.units.filter(u=>u.status==='MEASURED'&&Number.isFinite(u.minimumContrast)&&u.fragments.every(f=>!J.photoChoreographyLocked(p,p.cuts[f.index]))).sort((a,b)=>a.minimumContrast-b.minimumContrast);if(!units.length)throw Error('NO_MEASURED_UNLOCKED_TARGET');target=units[0];}
   const bytes=new Uint8Array(await result.blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));movies.push({mode,base64:btoa(binary),artifact,frames,decodedMetrics:p.lastPixelQA?.metrics?.decodedCinema?.metrics??null,lowerTail:p.lastPixelQA?.metrics?.decodedCinema?.lowerTailQuality??null});
  }
  return {target,movies,build:window.KAMEN_BUILD_INFO,fonts:[...J.fontLoadEvidence.entries()],method:'Frozen natural selected plan; weakest measured unlocked unit selected before variants; original versus existing local shadow/edge treatments; actual full-profile decoded frames. No lyric/time/lock changes or score/threshold changes.'};
 },{ref,wav:wav.toString('base64')});assert.deepEqual(errors,[]);
 for(const m of data.movies){const bytes=Buffer.from(m.base64,'base64');delete m.base64;const file=path.join(out,m.mode+'.mp4');fs.writeFileSync(file,bytes);m.videoSHA256=sha(bytes);assert.equal(m.videoSHA256,m.artifact.binding.videoSHA256);const decoded=spawnSync('ffmpeg',['-v','error','-xerror','-i',file,'-map','0:v:0','-map','0:a:0','-f','null','-'],{encoding:'utf8'});assert.equal(decoded.status,0,decoded.stderr);m.fullDecode='PASS';}
 fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({caseId,originalAdoptedVideoSHA256:row.sha256,...data},null,2));console.log(JSON.stringify({caseId,units:data.movies.map(m=>({mode:m.mode,units:m.artifact.units.map(u=>({unitId:u.unitId,minimumContrast:u.minimumContrast,status:u.status}))}))}));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
