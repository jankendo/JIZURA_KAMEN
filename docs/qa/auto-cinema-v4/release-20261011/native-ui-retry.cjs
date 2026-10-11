// Exercise the shipping UI at an HTTP(S) URL, including a Pages project subpath.
// Usage: KAMEN_CHROME=/path/to/chrome node dev/pages_e2e.cjs URL OUTPUT_DIR
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const os = require('node:os');
const {createHash}=require('node:crypto');
const {ExportWatchdog}=require('/workspace/JIZURA_KAMEN/dev/export_watchdog.cjs');
const {createCanvas} = require('/workspace/JIZURA_KAMEN/node_modules/@napi-rs/canvas');
const {chromium} = require('/workspace/JIZURA_KAMEN/node_modules/playwright-core');
const [url, output] = process.argv.slice(2);
assert(url && output, 'URL and output directory are required');
const out = path.resolve(output); fs.mkdirSync(out, {recursive:true});
const canvas=createCanvas(1280,720), ctx=canvas.getContext('2d');
const gradient=ctx.createLinearGradient(0,0,1280,720);gradient.addColorStop(0,'#13253b');gradient.addColorStop(1,'#263f54');ctx.fillStyle=gradient;ctx.fillRect(0,0,1280,720);
for(let i=0;i<10;i++){ctx.fillStyle=`rgba(80,160,200,${.08+i*.012})`;ctx.fillRect(i*150-200,420-i*24,360,400);}
ctx.fillStyle='#dabd88';ctx.beginPath();ctx.arc(1000,155,72,0,Math.PI*2);ctx.fill();
fs.writeFileSync(path.join(out,'background.webp'),canvas.toBuffer('image/webp'));
const lyrics=['朝の光を見つけた','小さな音が重なる','ここから歩き出そう','新しい空へ進む'];
fs.writeFileSync(path.join(out,'lyrics.txt'),lyrics.join('\n'));
fs.writeFileSync(path.join(out,'lyrics.lrc'),'[ti:KAMEN 合成QA]\n[ar:Synthetic fixture]\n'+lyrics.map((line,i)=>`[00:0${i*2}.50]${line}`).join('\n'));
const rate=48000, seconds=9, frames=rate*seconds, wav=Buffer.alloc(44+frames*4);
wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(frames*4,40);
for(let i=0;i<frames;i++){const t=i/rate,v=.12*Math.sin(2*Math.PI*220*t)+.25*Math.exp(-(t%.5)*70)*Math.sin(2*Math.PI*110*t),sample=Math.round(v*32767);wav.writeInt16LE(sample,44+i*4);wav.writeInt16LE(sample,46+i*4);}
fs.writeFileSync(path.join(out,'audio.wav'),wav);
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.KAMEN_CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const page=await browser.newPage({acceptDownloads:true,viewport:{width:1365,height:900}});
 // This runner validates browser downloads, not the OS-native save picker.
 // Headless Chrome aborts that picker before preflight/encoding. Model the
 // supported no-picker browser capability; retain the real UI/encoder/QA/saveFile.
 const saveMode=process.env.KAMEN_FILE_SAVE_MODE||'download';
 assert(['download','native'].includes(saveMode),'KAMEN_FILE_SAVE_MODE must be download or native');
 if(saveMode==='download')await page.addInitScript(()=>{
  window.qaNativeSavePickerAvailable=typeof window.showSaveFilePicker==='function';
  Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true});
 });
 const errors=[], resourceFailures=[], checks=[], consoleMessages=[], states=[];
 const environment={saveMode,browser:browser.version(),os:os.platform(),release:os.release(),node:process.version};
 const safeURL=value=>{try{const u=new URL(value);return u.origin+u.pathname;}catch{return '[non-URL]';}};
 page.on('console',m=>consoleMessages.push({time:new Date().toISOString(),type:m.type(),text:m.text().slice(0,4000)}));
 page.on('response',r=>{if(r.status()>=400)resourceFailures.push({url:safeURL(r.url()),status:r.status()});});
 await page.context().tracing.start({screenshots:true,snapshots:true,sources:false});
 let lastState=null;
 page.on('pageerror',err=>errors.push(err.message));
 page.on('requestfailed',r=>resourceFailures.push({url:safeURL(r.url()),error:r.failure()?.errorText}));
 const check=(name,data={})=>{checks.push({name,status:'PASS',...data});console.log(name,'PASS',JSON.stringify(data));};
 try{
  const target=new URL(url);target.searchParams.set('kamen_qa',String(Date.now()));
  const response=await page.goto(target.toString(),{waitUntil:'load',timeout:60000});assert.equal(response.status(),200);environment.runtimeSHA256=createHash('sha256').update(await response.body()).digest('hex');
  await page.waitForFunction(()=>window.J?.ui?.project&&document.querySelector('#studioExport'));
  assert((await page.title()).includes('KAMEN'));assert.equal(await page.evaluate(()=>KAMEN_APP_INFO.version),'2.0.26');
  check('startup',{version:'2.0.26',secure:await page.evaluate(()=>isSecureContext)});
  await page.locator('[data-bg-file]').first().setInputFiles(path.join(out,'background.webp'));
  await page.waitForFunction(()=>J.ui.project.customBg.enabled&&J.ui.project.customBg.dataUrl.startsWith('data:image/'));
  check('background upload');
  await page.locator('#lrcFile').setInputFiles(path.join(out,'lyrics.txt'));
  await page.waitForFunction(()=>document.querySelector('#lrcStatus').textContent.includes('lyrics.txt')&&J.ui.plan.lines.length===4);
  check('TXT import');
  await page.locator('#lrcFile').setInputFiles(path.join(out,'lyrics.lrc'));
  await page.waitForFunction(()=>document.querySelector('#lrcStatus').textContent.includes('lyrics.lrc')&&J.ui.plan.lines.length===4);
  assert(Math.abs(await page.evaluate(()=>J.ui.plan.lines[0].start)-.5)<.05);
  check('LRC import and timing');
  await page.locator('#audioFile').setInputFiles(path.join(out,'audio.wav'));
  await page.waitForFunction(()=>J.ui.audio?.buffer&&Math.abs(J.ui.audio.duration-9)<.001&&!J.ui.audioLoading,null,{timeout:120000});
  check('audio upload and analysis',{bpm:await page.evaluate(()=>J.ui.audio.bpm)});
  await page.locator('#btnAutoDirection').click();
  await page.waitForFunction(()=>!document.querySelector('#studioResult').hidden&&!document.querySelector('#btnAutoDirection').disabled,null,{timeout:600000});
  const plan=await page.evaluate(()=>({cuts:J.ui.plan.cuts.length,lines:J.ui.plan.lines.length,duration:J.ui.plan.duration}));assert(plan.cuts>0);assert.equal(plan.lines,4);check('automatic MV generation',plan);
  if(await page.evaluate(()=>J.ui.playing))await page.locator('#btnPlay').click();await page.keyboard.press('Home');await page.locator('#btnPlay').click();await page.waitForFunction(()=>J.ui.playing);
  await page.waitForFunction(()=>J.ui.t>.3);await page.locator('#btnPlay').click();await page.waitForFunction(()=>!J.ui.playing);check('preview playback');
  const before=await page.evaluate(()=>({lyrics:J.ui.project.lyrics,image:J.ui.project.customBg.dataUrl}));
  await page.locator('#studioAdvanced').click();
  const saved=page.waitForEvent('download',{predicate:d=>d.suggestedFilename().endsWith('.json'),timeout:60000});saved.catch(()=>{});await page.locator('#btnSave').click();const projectFile=path.join(out,'saved-project.json');await (await saved).saveAs(projectFile);
  await page.locator('#fileProject').setInputFiles(projectFile);await page.waitForFunction(()=>!J.ui.projectLoading&&J.ui.audio===null,null,{timeout:60000});
  assert.deepEqual(await page.evaluate(()=>({lyrics:J.ui.project.lyrics,image:J.ui.project.customBg.dataUrl})),before);check('project save and reload');await page.locator('#studioAdvanced').click();
  await page.locator('#audioFile').setInputFiles(path.join(out,'audio.wav'));await page.waitForFunction(()=>J.ui.audio?.buffer&&!J.ui.audioLoading,null,{timeout:120000});
  await page.locator('#btnAutoDirection').click();await page.waitForFunction(()=>!document.querySelector('#studioResult').hidden&&!document.querySelector('#btnAutoDirection').disabled,null,{timeout:600000});check('regenerate after restored audio');
  await page.locator('#studioExportDetails').evaluate(el=>el.open=true);await page.locator('#studioRes').selectOption('720');await page.locator('#studioFPS').selectOption('24');
  // Actual shipping UI cancellation after native frame submission, then normal one-click retry below.
  await page.evaluate(()=>{
   window.qaNativeUI={progress:null,encoders:[],frames:[],restored:null};window.qaNativeOriginal=J.exportMP4;window.qaOriginalVE=VideoEncoder;window.qaOriginalVF=VideoFrame;
   window.VideoEncoder=new Proxy(qaOriginalVE,{construct(target,args){const e=Reflect.construct(target,args);qaNativeUI.encoders.push(e);return e;}});
   window.VideoFrame=new Proxy(qaOriginalVF,{construct(target,args){const f=Reflect.construct(target,args);qaNativeUI.frames.push(f);return f;}});
   J.exportMP4=async(args)=>{const hash=()=>J.sha256(J.canonicalJSON(args.plan)+'\n'+JSON.stringify({pixelQA:args.plan.lastPixelQA??null,qualityTarget:args.plan.lastQualityTarget??null})),before=await hash(),progress=args.onProgress;try{return await qaNativeOriginal({...args,onProgress:(...values)=>{if(values[2]?.stage==='frames'&&values[2].current>=2)qaNativeUI.progress=values[2];progress?.(...values);}});}finally{qaNativeUI.before=before;qaNativeUI.after=await hash();qaNativeUI.restored=qaNativeUI.before===qaNativeUI.after;qaNativeUI.allEncodersClosed=qaNativeUI.encoders.every(e=>e.state==='closed');qaNativeUI.allFramesClosed=qaNativeUI.frames.every(f=>f.codedWidth===0);}};
  });
  await page.locator('#studioExport').click();await page.waitForFunction(()=>qaNativeUI.progress,null,{timeout:360000});
  await page.locator('.processing-card[data-status="running"] .processing-cancel').click();await page.waitForFunction(()=>!J.ui.exporting,null,{timeout:30000});
  const nativeEvidence=await page.evaluate(()=>({method:'ACTUAL_UI_POINTER_CANCEL_AFTER_NATIVE_WEBCODECS_FRAME_SUBMISSION; normal one-click native retry follows',progress:qaNativeUI.progress,encoders:qaNativeUI.encoders.length,frames:qaNativeUI.frames.length,before:qaNativeUI.before,after:qaNativeUI.after,planAndQARestored:qaNativeUI.restored,allEncodersClosed:qaNativeUI.allEncodersClosed,allFramesClosed:qaNativeUI.allFramesClosed,fileState:J.ui.exportOutcome?.fileState}));
  assert.equal(nativeEvidence.fileState,'CANCELLED');assert(nativeEvidence.encoders>0&&nativeEvidence.frames>0);assert(nativeEvidence.planAndQARestored&&nativeEvidence.allEncodersClosed&&nativeEvidence.allFramesClosed);
  await page.evaluate(()=>{J.exportMP4=qaNativeOriginal;window.VideoEncoder=qaOriginalVE;window.VideoFrame=qaOriginalVF;});fs.writeFileSync(path.join(out,'native-ui-cancellation.json'),JSON.stringify(nativeEvidence,null,2));
  // Reproduce the native headless dialog separately; it never touches the project.
  const pickerProbe=await browser.newPage();
  try{
   await pickerProbe.goto(target.toString(),{waitUntil:'load'});
   await pickerProbe.evaluate(()=>{window.qaPickerProbe={available:typeof showSaveFilePicker==='function'};
    const button=document.createElement('button');button.id='qaPickerProbe';button.textContent='Native save dialog pickerProbe';
    button.style='position:fixed;top:0;left:0;z-index:999999';button.onclick=async()=>{
     if(!qaPickerProbe.available){qaPickerProbe.outcome='unavailable';return;}
     try{await showSaveFilePicker({suggestedName:'kamen-headless-pickerProbe.mp4'});qaPickerProbe.outcome='selected';}
     catch(e){qaPickerProbe.outcome=e.name;qaPickerProbe.message=e.message;}
    };document.body.appendChild(button);
   });
   await pickerProbe.locator('#qaPickerProbe').click();
   await pickerProbe.waitForFunction(()=>qaPickerProbe.outcome,null,{timeout:3000}).catch(()=>{});
   environment.nativePickerProbe=await pickerProbe.evaluate(()=>qaPickerProbe);
  }finally{await pickerProbe.close();}
  environment.codecs=await page.evaluate(async()=>({videoEncoder:typeof VideoEncoder,audioEncoder:typeof AudioEncoder,
   nativeH264:typeof VideoEncoder!=='undefined'&&(await VideoEncoder.isConfigSupported({codec:'avc1.42001f',width:1280,height:720,framerate:24,bitrate:6000000})).supported,
   nativeAAC:typeof AudioEncoder!=='undefined'&&(await AudioEncoder.isConfigSupported({codec:'mp4a.40.2',sampleRate:48000,numberOfChannels:2,bitrate:192000})).supported,
   nativeSavePickerAvailable:window.qaNativeSavePickerAvailable??typeof showSaveFilePicker==='function',savePicker:typeof showSaveFilePicker,secure:isSecureContext}));
  console.log('browser capabilities',JSON.stringify(environment));
  await page.evaluate(()=>{
   window.qaExport={progress:[],calls:0,completed:0,failures:[],picker:[],jobs:[],startedAt:null,endedAt:null};
   const describe=s=>({id:s.id,title:s.title,status:s.status,stage:s.stages[s.index]?.id,detail:s.detail,error:s.error,stages:s.stages.map(x=>({id:x.id,status:x.status,fraction:x.fraction})),lastEvent:s.lastEvent});
   window.qaUnsubscribe=J.processing.subscribe(s=>{const job=describe(s),i=qaExport.jobs.findIndex(x=>x.id===s.id);if(i<0)qaExport.jobs.push(job);else qaExport.jobs[i]=job;});
   const prepare=J.prepareFileSave;J.prepareFileSave=async(...args)=>{const event={requestedAt:Date.now(),active:navigator.userActivation?.isActive,pending:true};qaExport.picker.push(event);try{const result=await prepare(...args);event.result=result==='declined'?'declined':result?'native-handle':'browser-download';return result;}finally{event.pending=false;event.endedAt=Date.now();}};
   const original=J.exportMP4;J.exportMP4=async args=>{
    qaExport.calls++;qaExport.startedAt??=Date.now();const progress=args.onProgress;
    try{const r=await original({...args,onProgress:(...p)=>{qaExport.progress.push({time:Date.now(),fraction:p[0],label:p[1],stage:p[2]});progress?.(...p);}});
     qaExport.completed++;qaExport.validation=r.validation;qaExport.provenance=r.provenance;return r;
    }catch(error){qaExport.failures.push(String(error?.stack||error));throw error;}finally{qaExport.endedAt=Date.now();}
   };
  });
  const snapshot=()=>page.evaluate(()=>({time:Date.now(),calls:qaExport.calls,completed:qaExport.completed,
   lastProgress:qaExport.progress.at(-1),progressCount:qaExport.progress.length,failures:qaExport.failures,picker:qaExport.picker,
   jobs:qaExport.jobs,exporting:!!J.ui.exporting,quality:document.querySelector('#studioQuality')?.textContent,
   draft:!!document.querySelector('#qualityDraftExport'),links:[...document.querySelectorAll('#kamenDownloads a[download]')].map(a=>({name:a.download,blob:a.href.startsWith('blob:')})),
   progressDOM:[...document.querySelectorAll('.processing-card')].map(el=>({text:el.textContent,html:el.outerHTML})),
   dialogs:[...document.querySelectorAll('dialog[open],[role="alert"]')].map(el=>el.textContent)}));
  let exported=null,draftReason=null,downloadStarted=null,downloadError=null,downloadSaveWallMs=null;
  const onDownload=d=>{if(d.suggestedFilename().endsWith('.mp4')){exported=d;downloadStarted=Date.now();console.log('export state: download-started');}};
  page.on('download',onDownload); // Register before either export button is clicked.
  const started=Date.now(),watchdog=new ExportWatchdog(started);
  try{
   console.log('export state: before-click');await page.locator('#studioExport').click();console.log('export state: clicked');
   while(!exported){
    lastState=await snapshot();states.push(lastState);
    const deadline=watchdog.observe(lastState,Date.now());
    console.log('export state',JSON.stringify({elapsedSeconds:Math.round((Date.now()-started)/1000),calls:lastState.calls,completed:lastState.completed,picker:lastState.picker,progress:lastState.lastProgress,jobs:lastState.jobs.map(({id,status,stage,detail,error})=>({id,status,stage,detail,error})),quality:lastState.quality}));
    fs.writeFileSync(path.join(out,'export-states.json'),JSON.stringify(states,null,2));
    assert.equal(lastState.draft,false,'one-click export must not request Draft approval');
    const terminal=lastState.jobs.filter(j=>j.title==='動画を書き出しています').sort((a,b)=>a.id-b.id).at(-1);
    if(terminal&&['error','cancelled'].includes(terminal.status))throw new Error('Application export stopped: '+terminal.error);
    if(deadline==='timeout')throw new Error('Export timeout: maximum 8 minutes exceeded');
    if(deadline==='stalled')throw new Error('Export stalled: no state or progress change for 90 seconds');
    if(!exported)await page.waitForTimeout(5000);
   }
   const video=path.join(out,'ui-export.mp4');console.log('export state: saving download');const saveStarted=Date.now();let saveTimer;
   try{await Promise.race([exported.saveAs(video),new Promise((_,reject)=>{saveTimer=setTimeout(()=>reject(new Error('Export timeout while saving download')),Math.max(1,480000-(Date.now()-started)));})]);}
   catch(error){await exported.cancel().catch(()=>{});throw error;}finally{clearTimeout(saveTimer);downloadSaveWallMs=Date.now()-saveStarted;}
   downloadError=await exported.failure();assert.equal(downloadError,null);console.log('export state: download-completed');
  }finally{page.off('download',onDownload);await page.evaluate(()=>window.qaUnsubscribe?.()).catch(()=>{});}
  const video=path.join(out,'ui-export.mp4');
  await page.waitForFunction(()=>!J.ui.exporting&&['SAVED','SAVE_AVAILABLE'].includes(J.ui.exportOutcome?.fileState),null,{timeout:30000});
  const outcome=await page.evaluate(()=>J.ui.exportOutcome);assert.equal(await page.locator('#qualityDraftExport').count(),0);
  const observed=await page.evaluate(()=>qaExport);assert.equal(observed.calls,1);assert.equal(observed.jobs.filter(j=>j.title==='動画を書き出しています').at(-1)?.status,'completed');assert(observed.validation?.certification?.passed);assert.equal(observed.validation.videoCodec,'avc1');assert.equal(observed.validation.audioCodec,'mp4a');assert(observed.progress.length>0);
  const probe=spawnSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',video],{encoding:'utf8'});assert.equal(probe.status,0,probe.stderr);const media=JSON.parse(probe.stdout),v=media.streams.find(s=>s.codec_type==='video'),a=media.streams.find(s=>s.codec_type==='audio');assert(v&&a);assert.equal(v.codec_name,'h264');assert.equal(a.codec_name,'aac');assert.equal(v.width,1280);assert.equal(v.height,720);assert.equal(v.avg_frame_rate,'24/1');assert(Math.abs(Number(media.format.duration)-seconds)<.15);assert(Math.abs(Number(v.duration)-Number(a.duration))<.15);
  const decode=spawnSync('ffmpeg',['-v','error','-i',video,'-vf','signalstats,metadata=print:file=-','-f','null','-'],{encoding:'utf8'});assert.equal(decode.status,0,decode.stderr);const minima=[...decode.stdout.matchAll(/lavfi.signalstats.YMIN=(\d+)/g)].map(m=>Number(m[1])),maxima=[...decode.stdout.matchAll(/lavfi.signalstats.YMAX=(\d+)/g)].map(m=>Number(m[1]));assert(minima.length>200,'Expected decoded video frames');assert(maxima.some((max,i)=>max-minima[i]>32),'Decoded video must contain visible image content');check('UI MP4 export and decode',{creativeState:outcome.creativeState,oneClick:true,video:v.codec_name,audio:a.codec_name,duration:media.format.duration,progressUpdates:observed.progress.length,decodedFrames:minima.length,visibleContent:true});
  assert.equal(errors.length,0,errors.join('\n'));await page.screenshot({path:path.join(out,'ui.png'),fullPage:true});
  const report={status:'PASS',outcome,oneClick:true,environment,consoleMessages,exportStates:states,downloadStarted,downloadError,saveTiming:{downloadSaveWallMs,method:'Playwright download.saveAs wall time; includes browser transfer and test-host persistence; native File System Access picker timing UNMEASURED'},url:target.toString(),browser:browser.version(),checks,pageErrors:errors,resourceFailures,draftReason,validation:observed.validation,provenance:observed.provenance,ffprobe:media};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log('PASS: actual uploads, generation, playback, save/reload, MP4 video/audio/progress. Creative quality:',outcome.creativeState);
 }catch(error){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({status:'FAIL',url,environment,checks,pageErrors:errors,resourceFailures,consoleMessages,exportState:lastState,exportStates:states,error:error.stack},null,2));await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
 finally{fs.writeFileSync(path.join(out,'console.json'),JSON.stringify(consoleMessages,null,2));await page.context().tracing.stop({path:path.join(out,'trace.zip')}).catch(()=>{});await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
