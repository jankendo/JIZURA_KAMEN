/* Run the four bounded scenarios in Chrome's production Canvas implementation. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require('playwright-core');
const scenarios=require('./kamen_song_native_v11_scenarios.cjs');
(async()=>{
 const browser=await chromium.launch({executablePath:process.env.KAMEN_CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});
 try{
  const page=await browser.newPage();page.on('console',m=>{if(['log','error'].includes(m.type()))console.log(m.text());});page.on('pageerror',e=>console.error(e.message));
  const root=path.resolve(__dirname,'..');
  // Same manifest order as the production bundle, excluding the product UI.
  const manifest=JSON.parse(fs.readFileSync(path.join(root,'scripts/source-manifest.json'),'utf8'));
  await page.addScriptTag({content:manifest.filter(n=>!n.startsWith('12')).map(n=>fs.readFileSync(path.join(root,'src',n),'utf8')).join('\n')});
  const fontData=fs.readFileSync(path.join(root,'assets/fonts/NotoSansCJKjp-Bold.woff2')).toString('base64');
  await page.evaluate(async data=>{const f=new FontFace('JIZURA Noto CJK JP',`url(data:font/woff2;base64,${data})`,{weight:'700'});await f.load();document.fonts.add(f);},fontData);
  let report;
  if(process.env.KAMEN_V11_ASSET_DIR){
   const dir=process.env.KAMEN_V11_ASSET_DIR;
   const input={audio:fs.readFileSync(path.join(dir,'audio.mp3')).toString('base64'),background:fs.readFileSync(path.join(dir,'background.webp')).toString('base64'),lyrics:fs.readFileSync(path.join(dir,'lyrics.lrc'),'utf8'),onlyLine:process.env.KAMEN_V11_ONLY_LINE};
   if(process.env.KAMEN_V11_RESTORE)input.savedProject=JSON.parse(fs.readFileSync(process.env.KAMEN_V11_RESTORE,'utf8'));
   try{report=await page.evaluate(require('./kamen_song_native_v11_asset_scenario.cjs'),input);}finally{const saved=await page.evaluate(()=>window.assetProjectV11||null);if(saved&&process.env.KAMEN_V11_PROJECT)fs.writeFileSync(process.env.KAMEN_V11_PROJECT,JSON.stringify(saved));}
   if(process.env.KAMEN_V11_SHEET){fs.writeFileSync(process.env.KAMEN_V11_SHEET,Buffer.from(report.sheet.split(',')[1],'base64'));}
   delete report.sheet;
   console.log('ASSET PASS:',report.lines,'lines,',report.duration,'seconds, restore',report.restore);
  }else report=await page.evaluate(scenarios);
  const {auditBootstrap,auditBoundary}=await import('../scripts/source-order.mjs');
  const source=auditBootstrap+'\n'+manifest.map(n=>fs.readFileSync(path.join(root,'src',n),'utf8')+auditBoundary(n)).join('\n');
  report.sourceTreeSHA256=require('node:crypto').createHash('sha256').update(source).digest('hex');
  report.sourceCommit=require('node:child_process').execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
  console.log('V11_EVIDENCE',JSON.stringify({registered:report.registered,techniques:report.techniques,framesCompared:report.framesCompared,sourceTreeSHA256:report.sourceTreeSHA256,sourceCommit:report.sourceCommit,lines:Array.isArray(report.lines)?report.lines.map(x=>({line:x.line,counts:x.counts,compared:x.compared})):report.lines,selected:report.selected}));
  if(process.env.KAMEN_V11_REPORT)fs.writeFileSync(process.env.KAMEN_V11_REPORT,JSON.stringify({...report,browser:browser.version()},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
