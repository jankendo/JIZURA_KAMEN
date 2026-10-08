// Exercise the shipping UI at an HTTP(S) URL, including a Pages project subpath.
// Usage: KAMEN_CHROME=/path/to/chrome node dev/pages_e2e.cjs URL OUTPUT_DIR
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const {spawnSync} = require('node:child_process');
const {createCanvas} = require('@napi-rs/canvas');
const {chromium} = require('playwright-core');
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
 const errors=[], resourceFailures=[], checks=[];
 page.on('pageerror',err=>errors.push(err.message));
 page.on('requestfailed',r=>resourceFailures.push({url:r.url(),error:r.failure()?.errorText}));
 const check=(name,data={})=>{checks.push({name,status:'PASS',...data});console.log(name,'PASS',JSON.stringify(data));};
 try{
  const target=new URL(url);target.searchParams.set('kamen_qa',String(Date.now()));
  const response=await page.goto(target.toString(),{waitUntil:'load',timeout:60000});assert.equal(response.status(),200);
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
  await page.locator('#btnAutoDirection').click({force:true});
  await page.waitForFunction(()=>!document.querySelector('#studioResult').hidden&&!document.querySelector('#btnAutoDirection').disabled,null,{timeout:600000});
  const plan=await page.evaluate(()=>({cuts:J.ui.plan.cuts.length,lines:J.ui.plan.lines.length,duration:J.ui.plan.duration}));assert(plan.cuts>0);assert.equal(plan.lines,4);check('automatic MV generation',plan);
  if(await page.evaluate(()=>J.ui.playing))await page.locator('#btnPlay').click({force:true});await page.keyboard.press('Home');await page.locator('#btnPlay').click({force:true});await page.waitForFunction(()=>J.ui.playing);
  await page.waitForFunction(()=>J.ui.t>.3);await page.locator('#btnPlay').click({force:true});await page.waitForFunction(()=>!J.ui.playing);check('preview playback');
  const before=await page.evaluate(()=>({lyrics:J.ui.project.lyrics,image:J.ui.project.customBg.dataUrl}));
  await page.locator('#studioAdvanced').click();
  const saved=page.waitForEvent('download',{predicate:d=>d.suggestedFilename().endsWith('.json'),timeout:60000});saved.catch(()=>{});await page.locator('#btnSave').click();const projectFile=path.join(out,'saved-project.json');await (await saved).saveAs(projectFile);
  await page.locator('#fileProject').setInputFiles(projectFile);await page.waitForFunction(()=>!J.ui.projectLoading&&J.ui.audio===null,null,{timeout:60000});
  assert.deepEqual(await page.evaluate(()=>({lyrics:J.ui.project.lyrics,image:J.ui.project.customBg.dataUrl})),before);check('project save and reload');await page.locator('#studioAdvanced').click();
  await page.locator('#audioFile').setInputFiles(path.join(out,'audio.wav'));await page.waitForFunction(()=>J.ui.audio?.buffer&&!J.ui.audioLoading,null,{timeout:120000});
  await page.locator('#btnAutoDirection').click({force:true});await page.waitForFunction(()=>!document.querySelector('#studioResult').hidden&&!document.querySelector('#btnAutoDirection').disabled,null,{timeout:600000});check('regenerate after restored audio');
  await page.locator('#studioExportDetails').evaluate(el=>el.open=true);await page.locator('#studioRes').selectOption('720');await page.locator('#studioFPS').selectOption('24');
  await page.evaluate(()=>{
   const original=J.exportMP4;window.qaExport={progress:[]};J.exportMP4=async args=>{const progress=args.onProgress;const r=await original({...args,onProgress:(...p)=>{qaExport.progress.push({fraction:p[0],label:p[1]});progress?.(...p);}});qaExport.validation=r.validation;qaExport.provenance=r.provenance;return r;};
  });
  const mp4=page.waitForEvent('download',{predicate:d=>d.suggestedFilename().endsWith('.mp4'),timeout:1200000});
  mp4.catch(()=>{});await page.locator('#studioExport').click({force:true});
  const branch=await Promise.race([mp4.then(()=> 'download'),page.locator('#qualityDraftExport').waitFor({state:'visible',timeout:1200000}).then(()=> 'draft')]);
  let draftReason=null;
  if(branch==='draft'){draftReason=await page.locator('#studioQuality').innerText();assert(draftReason.includes('品質未達'));await page.locator('#qualityDraftExport').click({force:true});}
  const exported=await mp4;const video=path.join(out,'ui-export.mp4');await exported.saveAs(video);
  const observed=await page.evaluate(()=>qaExport);assert(observed.validation?.certification?.passed);assert.equal(observed.validation.videoCodec,'avc1');assert.equal(observed.validation.audioCodec,'mp4a');assert(observed.progress.length>0);
  const probe=spawnSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',video],{encoding:'utf8'});assert.equal(probe.status,0,probe.stderr);const media=JSON.parse(probe.stdout),v=media.streams.find(s=>s.codec_type==='video'),a=media.streams.find(s=>s.codec_type==='audio');assert(v&&a);assert.equal(v.codec_name,'h264');assert.equal(a.codec_name,'aac');assert.equal(v.width,1280);assert.equal(v.height,720);assert.equal(v.avg_frame_rate,'24/1');assert(Math.abs(Number(media.format.duration)-seconds)<.15);assert(Math.abs(Number(v.duration)-Number(a.duration))<.15);
  const decode=spawnSync('ffmpeg',['-v','error','-i',video,'-f','null','-'],{encoding:'utf8'});assert.equal(decode.status,0,decode.stderr);check('UI MP4 export and decode',{draft:!!draftReason,video:v.codec_name,audio:a.codec_name,duration:media.format.duration,progressUpdates:observed.progress.length});
  assert.equal(errors.length,0,errors.join('\n'));await page.screenshot({path:path.join(out,'ui.png'),fullPage:true});
  const report={status:'PASS',url:target.toString(),browser:browser.version(),checks,pageErrors:errors,resourceFailures,draftReason,validation:observed.validation,provenance:observed.provenance,ffprobe:media};
  fs.writeFileSync(path.join(out,'report.json'),JSON.stringify(report,null,2));
  console.log('PASS: actual uploads, generation, playback, save/reload, MP4 video/audio/progress. Creative quality:',draftReason?'below target; real draft UI exercised':'qualified');
 }catch(error){fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({status:'FAIL',url,checks,pageErrors:errors,resourceFailures,error:error.stack},null,2));await page.screenshot({path:path.join(out,'failure.png'),fullPage:true}).catch(()=>{});throw error;}
 finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
