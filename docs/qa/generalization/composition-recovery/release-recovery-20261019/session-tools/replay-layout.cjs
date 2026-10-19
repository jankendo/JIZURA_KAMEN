'use strict';
const fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto'),assert=require('assert/strict');
const {chromium}=require('/workspace/kamen-release/node_modules/playwright-core');
const {spawnSync}=require('child_process');
const [url,source,input,out]=process.argv.slice(2);fs.mkdirSync(out,{recursive:true});
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();page.on('console',m=>{if(m.text().startsWith('REPLAY '))console.log(m.text());});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(url);await page.waitForFunction(()=>window.J?.ui?.project);
  const code=fs.readFileSync(path.join(source,'src/11_export.js'),'utf8');await page.addScriptTag({content:code+'\nwindow.qaFrozenExport=window.J.exportMP4;'});
  const ref=JSON.parse(fs.readFileSync(path.join(input,'development-04-v3-reference.json'))),row=JSON.parse(fs.readFileSync(path.join(input,'development-04-v3-row.json'))),wav=fs.readFileSync(path.join(input,'development-04-v3-input.wav'));
  await page.exposeFunction('preserveReplay',clip=>fs.writeFileSync(path.join(out,'fixed.mp4'),Buffer.from(clip,'base64')));
  const existing=fs.existsSync(path.join(out,'fixed.mp4'))?fs.readFileSync(path.join(out,'fixed.mp4')).toString('base64'):null;
  const result=await page.evaluate(async({ref,wav,existing})=>{
   const J=window.J,Q=J.cinemaV5,V=J.cinemaV3,revive=v=>!v||typeof v!=='object'?v:v.__qaTypedArray?new window[v.__qaTypedArray](v.data):v.__qaMap?new Map(v.__qaMap.map(([k,x])=>[revive(k),revive(x)])):v.__qaSet?new Set(v.__qaSet.map(revive)):Array.isArray(v)?v.map(revive):Object.fromEntries(Object.entries(v).map(([k,x])=>[k,revive(x)]));
   const plan=revive(ref.plan),project=revive(ref.project),range=ref.range;
   J.enableSingleBackgroundMode();await J.ensureFonts(project.lyrics,Object.keys(J.FONTS));
   const audio=await J.analyzeAudio(new Blob([Uint8Array.from(atob(wav),c=>c.charCodeAt(0))],{type:'audio/wav'}));
   const planHash=await V.planHash(plan);if(planHash!==ref.planHash)throw Error('SELECTED_PLAN_CHANGED');
   const layout=plan.cuts.map(c=>({line:c.line,source:c.lineText,layout:J.cinemaSemanticLyricLayout(plan,c)}));
   console.log('REPLAY encoding or reusing preserved MP4');const args={plan,project,audio,range},input=await V.snapshot(project,audio,plan,range),result=existing?{blob:new Blob([Uint8Array.from(atob(existing),c=>c.charCodeAt(0))],{type:'video/mp4'})}:await qaFrozenExport(args);
   const [width,height]=J.outputSize(project);result.validation=await J.certifyExport(result.blob,{width,height,fps:plan.fps,duration:range.end-range.start,audio:true});
   const bytes=new Uint8Array(await result.blob.arrayBuffer());let binary='';for(let n=0;n<bytes.length;n+=32768)binary+=String.fromCharCode(...bytes.subarray(n,n+32768));await preserveReplay(btoa(binary));
   console.log('REPLAY verifying');const verification=await Q.verifyFinalArtifact(result,args,input);
   return {build:window.KAMEN_BUILD_INFO,planHash,input,layout,verification,validation:result.validation,scope:'Saved naturally selected plan rendered with candidate source; fresh automatic selection is separate.'};
  },{ref,wav:wav.toString('base64'),existing});
  const file=path.join(out,'fixed.mp4'),decode=spawnSync('ffmpeg',['-v','error','-xerror','-i',file,'-f','null','-'],{encoding:'utf8'}),probe=JSON.parse(spawnSync('ffprobe',['-v','error','-show_streams','-of','json',file],{encoding:'utf8'}).stdout);
  const report={...result,errors,originalVideoSHA256:row.sha256,originalInputSnapshot:ref.inputSnapshot,actualFileSHA256:sha(fs.readFileSync(file)),decodeExitCode:decode.status,decodeError:decode.stderr,probe};
  fs.writeFileSync(path.join(out,'report.json.gz'),zlib.gzipSync(JSON.stringify(report)));console.log(JSON.stringify({status:result.verification.status,failures:result.verification.failures,source:result.build,hash:report.actualFileSHA256,decode:decode.status,errors,layouts:result.layout.map(x=>({line:x.line,text:x.layout.text,size:x.layout.size}))}));
  assert.equal(decode.status,0);assert.equal(errors.length,0);
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
