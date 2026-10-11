// Real browser hit-testing of retained save links and processing controls.
// The task is a UI fixture; this test does not encode or rate an MV.
'use strict';
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const [url,output]=process.argv.slice(2);assert(url&&output);fs.mkdirSync(output,{recursive:true});
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.KAMEN_CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 const cases=[];
 try{for(const viewport of [{width:1365,height:900},{width:601,height:600},{width:600,height:800},{width:390,height:844},{width:844,height:390}]){
  const page=await browser.newPage({viewport,acceptDownloads:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(url);await page.waitForFunction(()=>window.J?.ui?.project);
  await page.evaluate(async()=>{
   window.showSaveFilePicker=undefined;window.qaOverlay={cancelled:0,retried:0};
   for(let i=0;i<12;i++)await J.saveFile('overlay-'+i+'.txt',new Blob(['overlay accessibility fixture']),{automatic:false});
   window.qaOverlayTask=J.processing.begin('UI overlay fixture',[['work','処理中',1]],{cancel:()=>{qaOverlay.cancelled++;qaOverlayTask.fail(new Error('cancel fixture'),true);}});
   qaOverlayTask.enter('work');qaOverlayTask.update(1,4,'real UI hit-testing');
  });
  const cancel=page.locator('.processing-card[data-status="running"] .processing-cancel');await cancel.waitFor();
  const download=page.waitForEvent('download');await page.locator('#kamenDownloads a[download="overlay-11.txt"]').click();
  const file=path.join(output,viewport.width+'x'+viewport.height+'.txt');await (await download).saveAs(file);assert.equal(fs.readFileSync(file,'utf8'),'overlay accessibility fixture');
  await cancel.click();await page.waitForFunction(()=>qaOverlay.cancelled===1&&qaOverlayTask.state.status==='cancelled');
  await page.evaluate(()=>{qaOverlayTask.dismiss();qaOverlayTask=J.processing.begin('UI retry fixture',[['work','処理中',1]],{retry:()=>{qaOverlay.retried++;}});qaOverlayTask.enter('work');qaOverlayTask.fail(new Error('retry fixture'));});
  await page.locator('.processing-card[data-status="error"] .processing-retry').click();await page.waitForFunction(()=>qaOverlay.retried===1);
  assert.equal(errors.length,0);cases.push({viewport,status:'PASS',downloadSaved:true,cancelClick:true,retryClick:true,pageErrors:errors});await page.close();
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(output,'report.json'),JSON.stringify({status:'PASS',evidence:'REAL_BROWSER_CLICK_WITHOUT_FORCE; UI task fixture, no native encoder',cases},null,2)+'\n');
 console.log('Retained downloads, cancellation and retry remain clickable across five viewports PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
