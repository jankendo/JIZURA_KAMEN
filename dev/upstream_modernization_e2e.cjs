'use strict';
// Production-bundle tests. Usage: KAMEN_CHROME=... node dev/upstream_modernization_e2e.cjs URL OUT
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),crypto=require('node:crypto'),{spawnSync}=require('node:child_process'),{chromium}=require('playwright-core');
const url=process.argv[2]||'http://127.0.0.1:4173/',out=path.resolve(process.argv[3]||'/tmp/kamen-upstream-qa');fs.mkdirSync(out,{recursive:true});
const report={version:require('../package.json').version,upstream:require('../vendor/jizura/upstream.json').commit,checks:[],movies:[],errors:[]};
const check=(name,data={})=>{report.checks.push({name,status:'PASS',...data});console.log('PASS',name);};
(async()=>{
 const manifest=require('../vendor/jizura/upstream.json');for(const [name,hash]of Object.entries(manifest.files))assert.equal(crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,'../vendor/jizura',name))).digest('hex'),hash,name);check('immutable upstream source checksums');
 let page;const browser=await chromium.launch({executablePath:process.env.KAMEN_CHROME||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
 page=await browser.newPage({acceptDownloads:true,viewport:{width:1365,height:900}});page.setDefaultTimeout(60000);const downloads=options=>{const task=page.waitForEvent('download',options);task.catch(()=>{});return task;};page.on('pageerror',e=>report.errors.push(e.stack));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('404')&&!m.text().includes('保存を中止しました')&&!/KAMEN processing.*音源.*Aborted|JIZURA audio import failed.*Aborted|KAMEN processing.*音源.*中止|JIZURA audio import failed.*中止|KAMEN processing.*音源.*Cancelled|JIZURA audio import failed.*Cancelled/.test(m.text()))report.errors.push(m.text());});
 await page.addInitScript(()=>Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true}));
 await page.goto(url,{waitUntil:'load'});await page.waitForFunction(()=>J.ui?.project&&J.ui?.plan);assert.equal(await page.evaluate(()=>KAMEN_APP_INFO.version),report.version);report.build=await page.evaluate(()=>KAMEN_BUILD_INFO);report.browser=browser.version();report.node=process.version;check('shipping UI boot');
 const contracts=await page.evaluate(async()=>{
  const U=JIZURAUpstream,assert=(condition,message)=>{if(!condition)throw Error(message)},q=J.defaultProject();
  q.lyrics='[00:00.10]朝の光\n時刻のない行\n[00:03.00]I will never-ending\n[00:04.50]마음을 전해';q.fps=24;q.res=720;
  const a={duration:6,bpm:120,beats:Array.from({length:12},(_,i)=>i*.5)};
  for(const seed of [1,12,999])for(const themeId of [null,...Object.keys(U.THEMES)]){
   const p={...q,themeId},actual=J.generateUpstream(p,a,{rnd:J.rng(seed)}),expected={...J.upstreamProject(p),...U.omakase(J.upstreamProject(p),J.rng(seed),themeId)};
   if(themeId){assert(U.THEMES[themeId].moods.includes(actual.project.mood),'theme mood ignored');const set=U.THEMES[themeId].set;if(set)assert(actual.project[set]===true,'theme expression set not enabled');}
   const reference=U.plan(expected,a);assert(JSON.stringify(actual.plan.cuts)===JSON.stringify(reference.cuts),'upstream cuts differ '+themeId);assert(JSON.stringify(actual.plan.lines)===JSON.stringify(reference.lines),'upstream timing differs');
   const restored=J.uiApi.mergeProject(JSON.parse(JSON.stringify(actual.project)));assert(restored.mood===actual.project.mood,'saved upstream mood changed');assert(JSON.stringify(J.plan(restored,a).cuts)===JSON.stringify(actual.plan.cuts),'saved standard project changed');
  }
  const sample=J.generateUpstream(q,a,{rnd:J.rng(12)});assert(sample.plan.lines[1].text==='時刻のない行','mixed LRC reordered');
  const locked={...q,overrides:{0:{lock:true,lockedSeed:123}},locks:{tech:{layout:true},params:{motion:true}}};
  const selected=J.generateUpstream(locked,a,{rnd:J.rng(1)});assert(selected.project.fx.motion===locked.fx.motion,'parameter lock changed');assert(JSON.stringify(selected.project.enabled.layout)===JSON.stringify(locked.enabled.layout),'tech lock changed');assert(selected.project.overrides[0].lockedSeed===123,'line lock changed');
  const legacy=J.uiApi.mergeProject({lyrics:'[00:01.00]古いMV',version:1,seed:42});assert(legacy.generation.engine==='kamen','unmarked save was converted');const before=JSON.stringify(legacy);J.plan(legacy,a);assert(legacy.generation.engine==='kamen','legacy plan converted');
  const all=U.GROUP_KEYS.flatMap(g=>Object.values(U.registry(g)));assert(all.filter(d=>['typo','kinetic','horror'].includes(d.set)).length>=153,'new expression sets missing');
  let rejected=false;try{await J.inspectMP4Blob(new Blob(['not MP4']),{requireAudio:false});}catch{rejected=true;}assert(rejected,'invalid MP4 accepted');
  return {comparisons:3*(1+Object.keys(U.THEMES).length),parts:all.filter(d=>['typo','kinetic','horror'].includes(d.set)).length};
 });check('upstream seed/theme parity, mixed LRC, words, lock and save compatibility',contracts);
 // Install real synthetic input assets through the UI's production import methods.
 const wav=Buffer.alloc(44+48000*3*2);wav.write('RIFF');wav.writeUInt32LE(wav.length-8,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(1,22);wav.writeUInt32LE(48000,24);wav.writeUInt32LE(96000,28);wav.writeUInt16LE(2,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(wav.length-44,40);for(let i=0;i<(wav.length-44)/2;i++)wav.writeInt16LE(Math.round(3000*Math.sin(i*2*Math.PI*220/48000)),44+i*2);
 await page.locator('#audioFile').setInputFiles({name:'test.wav',mimeType:'audio/wav',buffer:wav});await page.waitForFunction(()=>J.ui.audio&&!J.ui.audioLoading);
 const {createCanvas}=require('@napi-rs/canvas'),canvas=createCanvas(1280,720),ctx=canvas.getContext('2d');ctx.fillStyle='#17364a';ctx.fillRect(0,0,1280,720);ctx.fillStyle='#d2ae74';ctx.fillRect(950,100,200,200);
 await page.locator('[data-bg-file]').first().setInputFiles({name:'background.png',mimeType:'image/png',buffer:canvas.toBuffer('image/png')});await page.waitForFunction(()=>J.ui.renderer.customBgBitmap);
 await page.locator('#lrcFile').setInputFiles({name:'test.lrc',mimeType:'text/plain',buffer:Buffer.from('[00:00.10]朝の光\n[00:01.50]ここから歩こう')});await page.waitForFunction(()=>J.ui.plan.lines.length===2);
 await page.locator('#btnAutoDirection').click();await page.waitForFunction(()=>J.ui.project.generation?.generated&&!document.querySelector('#btnAutoDirection').disabled,{timeout:60000});
 assert.equal(await page.evaluate(()=>J.ui.project.generation.engine),'jizura');assert(await page.locator('#studioAdaptCurrent').isHidden());check('real image/audio/LRC import and generation button');
 await page.evaluate(()=>{J.ui.project.res=720;J.ui.project.fps=24;J.uiApi.syncUI();J.uiApi.replan();});
 // OS picker cancellation must not start an encode or lose the selected plan.
 const before=await page.evaluate(()=>JSON.stringify(J.ui.plan.cuts));
 await page.evaluate(()=>Object.defineProperty(window,'showSaveFilePicker',{value:async()=>{throw new DOMException('Cancelled','AbortError')},configurable:true}));
 await page.locator('#studioExport').click();await page.waitForFunction(()=>J.ui.exportOutcome?.fileState==='CANCELLED');assert.equal(await page.evaluate(()=>JSON.stringify(J.ui.plan.cuts)),before);check('native picker cancellation preserves selected plan');
 await page.evaluate(()=>Object.defineProperty(window,'showSaveFilePicker',{value:undefined,configurable:true}));
 const downloadPromise=downloads({timeout:120000});await page.locator('#studioExport').click();const download=await downloadPromise,file=path.join(out,'ui.mp4');await download.saveAs(file);await page.waitForFunction(()=>!J.ui.exporting);
 assert.equal(await page.evaluate(()=>JSON.stringify(J.ui.plan.cuts)),before);check('real export button and MP4 download preserve selected cuts');
 // Save and reopen through the production controls, then reattach the same audio.
 await page.locator('#studioAdvanced').click();const projectDownloadPromise=downloads();await page.locator('#btnSave').click();const projectDownload=await projectDownloadPromise,projectPath=path.join(out,'roundtrip.kamen.json');await projectDownload.saveAs(projectPath);
 const saved=JSON.parse(fs.readFileSync(projectPath,'utf8'));assert.equal(saved.generation.engine,'jizura');
 await page.locator('#fileProject').setInputFiles(projectPath);await page.waitForFunction(()=>!J.ui.projectLoading&&J.ui.audio===null);
 await page.locator('#audioFile').setInputFiles({name:'test.wav',mimeType:'audio/wav',buffer:wav});await page.waitForFunction(()=>J.ui.audio&&!J.ui.audioLoading);
 assert.equal(await page.evaluate(()=>JSON.stringify(J.ui.plan.cuts)),before);check('project file save/reopen and audio reload preserve cuts');
 await page.evaluate(async argumentsBase64=>{const S=J.ui,audio=S.audio,file=new File([Uint8Array.from(atob(argumentsBase64),c=>c.charCodeAt(0))],'stale.wav',{type:'audio/wav'}),project={...S.project};const pending=J.uiApi.loadAudioFile(file);S.project=project;await pending;if(S.audio!==audio||S.project!==project)throw Error('stale audio import replaced current state');J.uiApi.syncUI();J.uiApi.replan();},wav.toString('base64'));check('stale in-flight audio import cannot revive another project');await page.locator('#studioAdvanced').click();
 const verify=file=>{const probe=spawnSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'});assert.equal(probe.status,0,probe.stderr);const info=JSON.parse(probe.stdout);assert.equal(info.streams.find(s=>s.codec_type==='video')?.codec_name,'h264');assert.equal(spawnSync('ffmpeg',['-v','error','-i',file,'-f','null','-'],{encoding:'utf8'}).status,0,'complete FFmpeg decode');report.movies.push({file,bytes:fs.statSync(file).size,streams:info.streams.map(s=>({codec:s.codec_name,width:s.width,height:s.height,fps:s.avg_frame_rate,duration:s.duration})),duration:info.format.duration});return info;};verify(file);
 // Matrix encodes use the same public engine API, real renderer and real codecs.
 const cases=[{id:'720-silent',res:720,aspect:'16:9',audio:false},{id:'1080-audio',res:1080,aspect:'16:9',audio:true},{id:'vertical-audio',res:720,aspect:'9:16',audio:true},{id:'range-wasm-aac',res:720,aspect:'16:9',audio:true,wasm:true,start:.5,end:2}];
 if(process.env.KAMEN_LONG_EXPORT==='1')cases.push({id:'180-second-audio',res:720,aspect:'16:9',audio:true,end:180});
 for(const c of cases){
  const promise=downloads({timeout:c.end===180?600000:120000});
  const result=await page.evaluate(async c=>{
   const q=J.defaultProject();q.lyrics='[00:00.10]朝の光\n[00:01.00]ここから歩こう';q.res=c.res;q.aspect=c.aspect;q.fps=24;
   const duration=c.end===180?180:3,buffer=new AudioBuffer({length:48000*duration,sampleRate:48000,numberOfChannels:1});for(let i=0;i<buffer.length;i++)buffer.getChannelData(0)[i]=.09*Math.sin(i*2*Math.PI*220/48000);
   const audio={buffer,duration,bpm:120,beats:Array.from({length:duration*2},(_,i)=>i*.5)},r=J.generateUpstream(q,audio,{rnd:J.rng(35)}),range={start:c.start||0,end:c.end||2};
   if(c.end===180){r.project.fx={...r.project.fx,texture:0,chroma:0,glitch:0,decor:0};r.plan=J.plan(r.project,audio);}
   const args={project:r.project,plan:r.plan,audio:c.audio?audio:null,range,...(c.wasm?{audioAttempt:{codec:'mp4a.40.2',mux:'aac',sr:48000,bitrate:192000,wasm:true}}:{})};
   const before=JSON.stringify(r.plan.cuts),result=await J.exportMP4(args);if(before!==JSON.stringify(r.plan.cuts))throw Error('export changed cuts');await J.saveFile(c.id+'.mp4',result.blob);return result.validation;
  },c);
  const download=await promise,file=path.join(out,c.id+'.mp4');await download.saveAs(file);const info=verify(file),video=info.streams.find(s=>s.codec_type==='video');assert.equal(video.height,c.aspect==='9:16'?1280:c.res);assert.equal(info.streams.some(s=>s.codec_name==='aac'),c.audio);assert.equal(result.videoSamples,Math.round(((c.end||2)-(c.start||0))*24));check(c.id,{validation:result});
 }
 // Abort a running pipeline, then prove it is reusable; force a video init failure
 // through the real UI retry loop, independently of audio failures.
 await page.evaluate(async()=>{const q=J.defaultProject();q.lyrics='光の中で';q.res=720;q.fps=24;const plan=J.plan(q,null),controller=new AbortController();let aborted=false;try{await J.exportMP4({project:q,plan,range:{start:0,end:1},signal:controller.signal,onProgress:()=>controller.abort()});}catch{aborted=controller.signal.aborted;}if(!aborted)throw Error('cancel failed');});check('mid-encode cancellation');
 await page.evaluate(()=>{const Base=VideoEncoder;let failed=false;window.qaVideoFailures=0;window.VideoEncoder=class extends Base{configure(config){if(!failed){failed=true;window.qaVideoFailures++;throw new DOMException('Injected video initialization failure','NotSupportedError');}return super.configure(config);}};});
 const retried=downloads({timeout:120000});await page.locator('#studioExport').click();await(await retried).saveAs(path.join(out,'retried.mp4'));verify(path.join(out,'retried.mp4'));assert.equal(await page.evaluate(()=>qaVideoFailures),1);check('video failure retries without changing selection');
 // A native AAC failure retries the audio path with an unchanged video config.
 await page.evaluate(()=>{const Base=AudioEncoder;let failed=false;window.qaAudioFailures=0;window.AudioEncoder=class extends Base{static async isConfigSupported(config){return {supported:true,config};}configure(config){if(!failed){failed=true;qaAudioFailures++;throw new DOMException('Injected AAC initialization failure','NotSupportedError');}return super.configure(config);}};});
 const audioRetry=downloads({timeout:120000});await page.locator('#studioExport').click();await(await audioRetry).saveAs(path.join(out,'audio-retried.mp4'));verify(path.join(out,'audio-retried.mp4'));assert.equal(await page.evaluate(()=>qaAudioFailures),1);check('native AAC initialization failure retries through audio fallback');
 // Corrupt mux output must fail verification without creating a download.
 await page.evaluate(async()=>{const original=JIZURAMedia.createMuxer;let attempts=0;JIZURAMedia.createMuxer=async options=>{attempts++;const mux=await original(options);return {...mux,blob:()=>new Blob(['corrupt MP4'])};};try{const q=J.defaultProject();q.lyrics='[00:00.10]光';q.res=720;q.includeAudio=false;const plan=J.plan(q,null);let rejected=false;try{await J.exportWithRetries({project:q,plan,range:{start:0,end:1}},await J.exportCapabilities(q,null));}catch(e){rejected=/EXPORT_INVALID/.test(e.message);}if(!rejected||attempts!==1)throw Error('corrupt artifact was accepted or re-encoded');}finally{JIZURAMedia.createMuxer=original;}});check('corrupt output is terminal and never offered for download');
 assert.deepEqual(report.errors,[]);await page.screenshot({path:path.join(out,'studio.png'),fullPage:true});
 }catch(e){if(page)await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw e;}finally{await browser.close();}
})().then(()=>{report.status='PASS';fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.log('COMPLETE',out);}).catch(e=>{report.status='FAIL';report.failure=e.stack;fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));console.error(e);process.exitCode=1;});
