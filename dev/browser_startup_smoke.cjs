'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('playwright-core');
const url=process.argv[2];
assert(url,'URL is required');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.KAMEN_CHROME||'/usr/bin/google-chrome',headless:true,args:['--no-sandbox','--disable-dev-shm-usage'],timeout:30000});
 try{
  const page=await browser.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  const response=await page.goto(url,{waitUntil:'load',timeout:30000});assert.equal(response.status(),200);
  await page.waitForFunction(()=>window.J?.ui&&window.KAMEN_BUILD_INFO,undefined,{timeout:15000});
  assert.equal(await page.evaluate(()=>document.querySelector('#studioExport')!==null),true);
  assert.deepEqual(errors,[]);console.log('Browser initialization smoke PASS',browser.version());
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
