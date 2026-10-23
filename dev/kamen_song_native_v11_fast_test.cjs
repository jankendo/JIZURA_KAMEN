/* Run the four bounded scenarios in Chrome's production Canvas implementation. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const scenarios=require('./kamen_song_native_v11_scenarios.cjs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.KAMEN_CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();page.on('console',m=>{if(['log','error'].includes(m.type()))console.log(m.text());});page.on('pageerror',e=>console.error(e.message));
  const root=process.env.KAMEN_V11_SOURCE_ROOT||path.resolve(__dirname,'..');
  if(process.env.KAMEN_V12_MP4){await page.route('http://127.0.0.1:4173/v12-probe',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><title>Short production encoder probe</title>'}));await page.goto('http://127.0.0.1:4173/v12-probe');await page.addScriptTag({path:path.join(root,'vendor/mp4-muxer.min.js')});}
  // Same manifest order as the production bundle, excluding the product UI.
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'scripts/source-manifest.json'),'utf8'));
  const sourceFiles=new Map(manifest.map(n=>[n,fs.readFileSync(path.join(root,'src',n),'utf8')]));
  await page.addScriptTag({content:manifest.filter(n=>!n.startsWith('12')).map(n=>sourceFiles.get(n)).join('\n')});
  const fontData=fs.readFileSync(path.join(root,'assets/fonts/NotoSansCJKjp-Bold.woff2')).toString('base64');
  await page.evaluate(async data=>{const f=new FontFace('JIZURA Noto CJK JP',`url(data:font/woff2;base64,${data})`,{weight:'700'});await f.load();document.fonts.add(f);},fontData);
  let report;
  if(process.env.KAMEN_V12_COMPARE){report=await page.evaluate(scenarios.compare,{mode:process.env.KAMEN_V12_COMPARE});if(process.env.KAMEN_V11_SHEET)fs.writeFileSync(process.env.KAMEN_V11_SHEET,Buffer.from(report.sheet.split(',')[1],'base64'));delete report.sheet;}
  else if(process.env.KAMEN_V112_ONLY){report=await page.evaluate(require('./kamen_safe_alternative_v112_scenario.cjs'),{expectOld:!!process.env.KAMEN_V112_EXPECT_OLD});}
  else if(process.env.KAMEN_V11_ASSET_DIR){
   const dir=process.env.KAMEN_V11_ASSET_DIR;
   const input={audio:fs.readFileSync(path.join(dir,'audio.mp3')).toString('base64'),background:fs.readFileSync(path.join(dir,'background.webp')).toString('base64'),lyrics:fs.readFileSync(path.join(dir,'lyrics.lrc'),'utf8'),onlyLine:process.env.KAMEN_V11_ONLY_LINE};
   if(process.env.KAMEN_V11_RESTORE)input.savedProject=JSON.parse(fs.readFileSync(process.env.KAMEN_V11_RESTORE,'utf8'));
   try{report=await page.evaluate(require('./kamen_song_native_v11_asset_scenario.cjs'),input);}finally{const saved=await page.evaluate(()=>window.assetProjectV11||null);if(saved&&process.env.KAMEN_V11_PROJECT)fs.writeFileSync(process.env.KAMEN_V11_PROJECT,JSON.stringify(saved));}
   if(process.env.KAMEN_V11_SHEET){fs.writeFileSync(process.env.KAMEN_V11_SHEET,Buffer.from(report.sheet.split(',')[1],'base64'));}
   delete report.sheet;
   console.log('ASSET PASS:',report.lines,'lines,',report.duration,'seconds, restore',report.restore);
  }else {report=await page.evaluate(scenarios);report.safeAlternativeRegression=await page.evaluate(require('./kamen_safe_alternative_v112_scenario.cjs'));}
  if(process.env.KAMEN_V13_CHECKS)report.v13Checks=await page.evaluate(require('./kamen_exploration_v13_checks.cjs'));
  if(process.env.KAMEN_V12_MP4){
   const encoded=await page.evaluate(async()=>{const {q,p,a}=window.comparisonV12;const result=await J.exportMP4({plan:p,project:q,audio:a,range:{start:.3,end:1.3}});const R=new J.Renderer();await R.loadCustomBackground(q.customBg.dataUrl);
    const actual=Object.assign(document.createElement('canvas'),{width:result.width,height:result.height}),expected=actual.cloneNode(),control=actual.cloneNode(),video=document.createElement('video'),url=URL.createObjectURL(result.blob),observations=[];
    const diff=(a,b)=>{let sum=0;for(let k=0;k<a.length;k++)if(k%4!==3)sum+=Math.abs(a[k]-b[k])/255;return sum/(a.length/4*3);};
    try{video.muted=true;video.src=url;await new Promise((resolve,reject)=>{video.onloadedmetadata=resolve;video.onerror=reject;});
     const first=J.cutAt(p,.3),firstTrace=p.songNativeDirection.selection.traces.find(x=>x.line===first.line),within=ab=>(ab.temporalContribution?.samples||[]).filter(x=>x.offset>=.3&&x.offset<1.3&&x.spatialDifference>1e-6),role=[...firstTrace.creative.ablations].filter(x=>x.controlSafe).sort((a,b)=>Math.max(0,...within(b).map(x=>x.spatialDifference))-Math.max(0,...within(a).map(x=>x.spatialDifference)))[0],frames=[...new Set([...(role?within(role).sort((a,b)=>b.spatialDifference-a.spatialDifference).slice(0,2).map(x=>Math.max(0,Math.min(23,Math.round((x.offset-.3)*p.fps)))):[]),12,21])].slice(0,3);
     for(const frame of frames){video.currentTime=(frame+.1)/p.fps;await new Promise((resolve,reject)=>{video.onseeked=resolve;video.onerror=reject;});const time=.3+frame/p.fps,c=J.cutAt(p,time),trace=p.songNativeDirection.selection.traces.find(x=>x.line===c.line),ab=role,group=ab?.group||'hold',neutral={hold:'still',cam:'stillCamera',bg:'none',decor:'none',treat:'none',fx:null,enter:'cut',exit:'cut',trans:'cut'},cc=J.changeDirectionRoleV11(c,group,neutral[group]),cp={...p,cuts:p.cuts.map(x=>x===c?cc:x)};
      R.frame(expected.getContext('2d'),p,time,{scale:result.width/p.W,production:true,noHud:true});R.frame(control.getContext('2d'),cp,time,{scale:result.width/p.W,production:true,noHud:true});actual.getContext('2d').drawImage(video,0,0,result.width,result.height);
      const pixels=cv=>cv.getContext('2d').getImageData(0,0,result.width,result.height).data,e=pixels(expected),d=pixels(actual),z=pixels(control),codecError=diff(e,d),removedDifference=diff(z,d),canvasContribution=diff(e,z);
      observations.push({frame,time,group,id:ab?.id??c.hold,codecError,removedDifference,canvasContribution,status:canvasContribution>1e-6&&removedDifference>codecError*2?'OBSERVED_ABOVE_CODEC_RESIDUAL':'UNVERIFIED',scope:'decoded selected MP4 versus same-time production Canvas role-removal control; not an encoded control'});
     }
    }finally{URL.revokeObjectURL(url);R.disposeAssets?.();}
    const bytes=new Uint8Array(await result.blob.arrayBuffer());let binary='';for(let i=0;i<bytes.length;i+=8192)binary+=String.fromCharCode(...bytes.subarray(i,i+8192));return {base64:btoa(binary),roleObservations:observations,validation:result.validation,provenance:result.provenance,width:result.width,height:result.height};});
   fs.writeFileSync(process.env.KAMEN_V12_MP4,Buffer.from(encoded.base64,'base64'));delete encoded.base64;report.encodedSmoke=encoded;
  }
  const {auditBootstrap,auditBoundary}=await import('../scripts/source-order.mjs');
  const source=auditBootstrap+'\n'+manifest.map(n=>sourceFiles.get(n)+auditBoundary(n)).join('\n');
  report.sourceTreeSHA256=require('node:crypto').createHash('sha256').update(source).digest('hex');
  report.sourceCommit=process.env.KAMEN_V11_SOURCE_COMMIT||require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  console.log('V11_EVIDENCE',JSON.stringify({registered:report.registered,techniques:report.techniques,framesCompared:report.framesCompared,sourceTreeSHA256:report.sourceTreeSHA256,sourceCommit:report.sourceCommit,lines:Array.isArray(report.lines)?report.lines.map(x=>({line:x.line,counts:x.counts,compared:x.compared})):report.lines,selected:report.selected}));
  if(process.env.KAMEN_V11_REPORT)fs.writeFileSync(process.env.KAMEN_V11_REPORT,JSON.stringify({...report,browser:browser.version()},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
