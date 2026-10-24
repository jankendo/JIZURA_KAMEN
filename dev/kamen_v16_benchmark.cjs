/* Private asset inputs stay outside the repository. One full encode per run. */
'use strict';
const fs=require('node:fs'),path=require('node:path');const {chromium}=require('playwright-core');
(async()=>{const browser=await chromium.launch({executablePath:process.env.KAMEN_CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const page=await browser.newPage();page.on('console',m=>{if(m.type()==='error')console.error(m.text());});const dir=process.env.KAMEN_ASSET_DIR;if(!dir)throw Error('KAMEN_ASSET_DIR required');
 await page.goto(process.argv[2]);await page.waitForFunction(()=>J.ui?.plan);const mode=process.env.KAMEN_BENCH_MODE||'after';
 await page.evaluate(async input=>{
  const J=window.J,S=J.ui;S.project=J.uiApi.mergeProject(J.defaultProject());S.project.lyrics=input.lyrics;S.project.seed=15072;S.project.res=1080;S.project.fps=30;S.project.exportSettings.fpsMode='manual';S.project.exportSettings.refinementMode='fast';S.project.exportSettings.range='full';S.project.customBg={...S.project.customBg,enabled:true,dataUrl:'data:image/webp;base64,'+input.background};
  await S.renderer.loadCustomBackground(S.project.customBg.dataUrl);await J.uiApi.loadAudioFile(new File([Uint8Array.from(atob(input.audio),x=>x.charCodeAt(0))],'audio.mp3',{type:'audio/mpeg',lastModified:123}));
  S.project.timing.snap=false;J.applyImagePalette(S.project,J.analyzeCustomBackground(S.renderer.customBgBitmap,S.project),{palette:true,readability:true,mood:false});J.uiApi.syncUI();J.uiApi.replan();await J.uiApi.flushSave();
  window.benchV16={runs:[],source:KAMEN_BUILD_INFO};window.benchFrames=0;const frame=J.Renderer.prototype.frame;J.Renderer.prototype.frame=function(...args){window.benchFrames++;return frame.apply(this,args);};
  // Replayable seeds; warm runs reuse the exact media and browser process.
  J.randomDraftSeedV16=()=>15072;
 },{lyrics:fs.readFileSync(path.join(dir,'lyrics.lrc'),'utf8'),background:fs.readFileSync(path.join(dir,'background.webp')).toString('base64'),audio:fs.readFileSync(path.join(dir,'audio.mp3')).toString('base64')});
 for(let i=0;i<3;i++){
  if(mode==='before'){
   await page.evaluate(()=>{window.benchStart=performance.now();window.frameStart=benchFrames;document.querySelector('#btnAutoDirection').click();});
   await page.waitForFunction(()=>!document.querySelector('#btnAutoDirection').disabled,undefined,{timeout:1200000});
   await page.evaluate(i=>{if(document.querySelector('#directionStatus').dataset.result!=='true')throw Error(document.querySelector('#directionStatus').textContent);benchV16.runs.push({run:i,cache:i?'warm':'cold',combinedMs:performance.now()-benchStart,rendererFrames:benchFrames-frameStart});},i);
  }else await page.evaluate(async i=>{const start=performance.now(),frames=benchFrames;await J.uiApi.generateRandomDraft();const draft=J.ui.project.randomWorkflowV16;if(draft?.state!=='RANDOM_DRAFT_READY')throw Error(document.querySelector('#directionStatus').textContent);const draftMs=performance.now()-start,finish=performance.now();await J.uiApi.optimizeSelectedDraft();if(J.ui.project.randomWorkflowV16?.state!=='FINISHED'||document.querySelector('#directionStatus').dataset.selectionState!=='SELECTED')throw Error(document.querySelector('#directionStatus').textContent);benchV16.runs.push({run:i,cache:i?'warm':'cold',draftMs,finishMs:performance.now()-finish,rendererFrames:benchFrames-frames,draftMetrics:draft.metrics,finishMetrics:J.ui.project.randomWorkflowV16.finishMetrics});},i);
  const progress=await page.evaluate(()=>benchV16);fs.writeFileSync(process.env.KAMEN_BENCH_REPORT,JSON.stringify({...progress,browser:browser.version(),mode},null,2));console.log(mode,'RUN',i,JSON.stringify(progress.runs.at(-1)));
 }
 if(process.env.KAMEN_BENCH_MP4){const result=await page.evaluate(async()=>{
  const J=window.J,S=J.ui,started=performance.now(),before=J.canonicalJSON(S.plan.cuts);const result=await J.exportMP4({plan:S.plan,project:S.project,audio:S.audio,range:{start:0,end:Math.min(S.audio.duration,S.plan.duration)},refinementMode:'fast'});
  const bytes=new Uint8Array(await result.blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return {base64:btoa(binary),wallMs:performance.now()-started,performanceV16:result.performanceV16||null,validation:result.validation,codec:result.codec,provenance:result.provenance,genomesUnchanged:before===J.canonicalJSON(S.plan.cuts)};
 });fs.writeFileSync(process.env.KAMEN_BENCH_MP4,Buffer.from(result.base64,'base64'));delete result.base64;await page.evaluate(result=>{benchV16.export=result;},result);}
 const report=await page.evaluate(()=>benchV16);fs.writeFileSync(process.env.KAMEN_BENCH_REPORT,JSON.stringify({...report,browser:browser.version(),mode},null,2));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
