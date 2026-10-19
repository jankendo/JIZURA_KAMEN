'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict'),{chromium}=require('playwright-core');
const [url,out]=process.argv.slice(2),sha=b=>crypto.createHash('sha256').update(b).digest('hex');fs.mkdirSync(out,{recursive:true});
(async()=>{const browser=await chromium.launch({executablePath:process.env.KAMEN_CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const page=await browser.newPage(),pending=[],resources=[],errors=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{const u=r.url();if(/\.(woff2?|ttf)(\?|$)/.test(u))pending.push(r.body().then(b=>resources.push({url:u,status:r.status(),bytes:b.length,sha256:sha(b)})).catch(e=>resources.push({url:u,error:String(e)})));});
 await page.goto(url);await page.waitForFunction(()=>window.J?.ui?.project);
 const raster=await page.evaluate(async()=>{const J=window.J;await J.ensureFonts('窓辺に落ちる午後の影小さな息で時をつなぐ遠くの灯りを待つ',Object.keys(J.FONTS));const samples=[];
  for(const font of ['mincho','mincho_black','gothic_black'])for(const text of ['影','待つ'])for(const alpha of [false,true]){
   const c=document.createElement('canvas');c.width=800;c.height=400;const x=c.getContext('2d',{alpha,willReadFrequently:true});if(!alpha){x.fillStyle='white';x.fillRect(0,0,800,400);}x.font=J.fontCSS(font,180);x.fillStyle='black';x.textBaseline='alphabetic';x.fillText(text,30,260);const bytes=x.getImageData(0,0,800,400).data,digest=await crypto.subtle.digest('SHA-256',bytes);samples.push({font,text,alpha,fontCSS:x.font,advance:x.measureText(text).width,pixelSHA256:Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('')});
  }
  return {build:window.KAMEN_BUILD_INFO,userAgent:navigator.userAgent,platform:navigator.platform,language:navigator.language,devicePixelRatio:window.devicePixelRatio,fontFaces:[...document.fonts].map(f=>({family:f.family,weight:f.weight,style:f.style,status:f.status,unicodeRange:f.unicodeRange})),fontLoadingEvidence:[...(J.fontLoadEvidence||[])],samples};
 });await Promise.all(pending);assert.deepEqual(errors,[]);resources.sort((a,b)=>a.url.localeCompare(b.url));fs.writeFileSync(path.join(out,'report.json'),JSON.stringify({schema:1,browser:browser.version(),node:process.version,os:require('node:os').release(),resources,...raster,scope:'Font-resource and actual Canvas raster environment diagnostic only. No MP4 generated; no semantic, encoded-original or release credit.'},null,2)+'\n');console.log(JSON.stringify({browser:browser.version(),fontResources:resources.length,samples:raster.samples.length,source:raster.build.sourceCommit}));
 }finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
