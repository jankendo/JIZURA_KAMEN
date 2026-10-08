// Actual UI Validate -> Apply, then actual browser vertical MP4 pixel evidence.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{chromium}=require('playwright-core');
(async()=>{
 const [executable,fixture,audioPath,outDir]=process.argv.slice(2);
 const browser=await chromium.launch({executablePath:executable,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--allow-file-access-from-files']});
 const page=await browser.newPage({viewport:{width:1365,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await page.goto('file://'+path.resolve(__dirname,'../dist/index.html'));await page.waitForFunction(()=>window.J&&document.querySelector('#directorRevisionPack'));
  await page.evaluate(()=>{const old=J.plan;J.plan=(p,a,...rest)=>{const plan=old(p,a,...rest);window.directorCapture={project:p,audio:a,plan};return plan;};});
  await page.locator('#fileProject').setInputFiles(fixture);await page.waitForTimeout(1000);await page.locator('#audioFile').setInputFiles(audioPath);await page.waitForFunction(()=>document.querySelector('#audioName').textContent.includes('BPM'),null,{timeout:120000});
  await page.locator('#btnAutoDirection').click();await page.locator('#studioResult').waitFor({state:'visible',timeout:600000});
  const raw=await page.evaluate(()=>{const {project:p,audio:a,plan}=directorCapture;window.originalLyrics=p.lyrics;return {schema:'jizura-director-v4',projectHash:J.directorProjectHash(p,a.duration,a),chapters:plan.musicalStructure.sections.map(s=>({...s,typographyIntent:'vertical',sceneIntent:'detail',motionIntent:'calm'})),constraints:{preserveLyrics:true,safeArea:true}};});
  await page.locator('#studioAdvanced').click();
  await page.locator('[data-tab="tech"]').click();
  await page.locator('#directorJSON').evaluate((el,value)=>{el.value=value;for(let p=el.parentElement;p;p=p.parentElement)if(p.tagName==='DETAILS')p.open=true;},JSON.stringify(raw));await page.locator('#directorValidate').click();assert(!await page.locator('#directorApply').isDisabled());await page.locator('#directorApply').click();assert((await page.locator('#directorStatus').textContent()).includes('適用しました'));
  const result=await page.evaluate(async()=>{
   const {project,audio,plan}=directorCapture;for(const c of plan.cuts.filter(c=>c.line>=0)){if(c.layout!=='vcols'||c.backgroundScene.id!=='DETAIL'||c.cam!=='stillCamera')throw Error('Director intent was replaced');}if(project.lyrics!==originalLyrics)throw Error('Lyrics modified');
   const range={start:0,end:6},R=new J.Renderer();if(plan.customBg?.enabled)await R.loadCustomBackground(plan.customBg.dataUrl);const c=document.createElement('canvas'),m=document.createElement('canvas');c.width=m.width=plan.W;c.height=m.height=plan.H;const proxy=document.createElement('canvas'),pm=document.createElement('canvas');proxy.width=pm.width=192;proxy.height=pm.height=108;const b64=bytes=>{let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);},points=[];
   for(const cut of plan.cuts.filter(c=>c.line>=0&&c.start<6)){for(const time0 of [cut.start+.1,(cut.start+Math.min(6,cut.end))/2,Math.min(6,cut.end)-.1]){if(time0>=6||time0<cut.start)continue;const frameIndex=Math.round(time0*plan.fps),time=frameIndex/plan.fps;R.frame(c.getContext('2d'),plan,time,{scale:1,production:true,range,lyricAuditCtx:m.getContext('2d'),lyricAuditItems:[]});proxy.getContext('2d').drawImage(c,0,0,192,108);pm.getContext('2d').clearRect(0,0,192,108);pm.getContext('2d').drawImage(m,0,0,192,108);points.push({line:cut.line,time,frameIndex,phase:'vertical',expected:b64(proxy.getContext('2d').getImageData(0,0,192,108).data),mask:b64(pm.getContext('2d').getImageData(0,0,192,108).data)});}}
   const exported=await J.exportMP4({project,plan,audio,range});return {video:b64(new Uint8Array(await exported.blob.arrayBuffer())),validation:exported.validation,provenance:exported.provenance,pixels:{width:192,height:108,points},cutCount:plan.cuts.filter(c=>c.line>=0).length,lyricsPreserved:true};
  });
  fs.writeFileSync(path.join(outDir,'Chrome-vertical.mp4'),Buffer.from(result.video,'base64'));fs.writeFileSync(path.join(outDir,'Chrome-vertical-pixels.json'),JSON.stringify(result.pixels));delete result.video;delete result.pixels;assert(result.validation.certification.passed);assert.equal(errors.length,0);fs.writeFileSync(path.join(outDir,'Chrome-vertical-report.json'),JSON.stringify({status:'PASS',browser:browser.version(),uiValidateApply:true,errors,...result},null,2));console.log('Director UI / vertical browser MP4 PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
