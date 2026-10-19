'use strict';
// Frozen, historically naturally adopted plan compatibility. This does not
// exercise today's selector or the UI's project import/replanning path.
const fs=require('fs'),path=require('path'),zlib=require('zlib'),assert=require('assert/strict'),crypto=require('crypto'),{spawnSync}=require('child_process'),{chromium}=require('playwright-core');
const [url,reference,audioPath,out,source]=process.argv.slice(2),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
fs.mkdirSync(out,{recursive:true});
const refBytes=fs.readFileSync(reference),wav=fs.readFileSync(audioPath),ref=JSON.parse(refBytes);
assert.equal(sha(refBytes),'516840952a84deebe1de527cd08984624aa7101ccd9db7a856e0776fbb2ac124');
assert.equal(sha(wav),'3be2bd3b13145576f98251828e00c24c2f1e3cc701c56995a94338667dbbd455');
(async()=>{const browser=await chromium.launch({executablePath:process.env.KAMEN_CHROME||'/usr/bin/chromium',headless:true,args:['--no-sandbox','--disable-dev-shm-usage']});try{
 const page=await browser.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.exposeFunction('preserveMovie',async text=>{const b=Buffer.from(text,'base64');fs.writeFileSync(path.join(out,'current.mp4'),b);return sha(b);});
 await page.goto(url);await page.waitForFunction(()=>window.J?.ui?.project);
 const result=await page.evaluate(async({ref,wav,source})=>{
  const J=window.J,revive=v=>!v||typeof v!=='object'?v:v.__qaTypedArray?new window[v.__qaTypedArray](v.data):v.__qaMap?new Map(v.__qaMap.map(([k,x])=>[revive(k),revive(x)])):v.__qaSet?new Set(v.__qaSet.map(revive)):Array.isArray(v)?v.map(revive):Object.fromEntries(Object.entries(v).map(([k,x])=>[k,revive(x)]));
  if(window.KAMEN_BUILD_INFO.sourceCommit!==source||window.KAMEN_BUILD_INFO.sourceDirty!==false)throw Error('WRONG_SOURCE');
  const p=revive(ref.plan),project=revive(ref.project),range=ref.range;
  J.enableSingleBackgroundMode();await J.ensureFonts(p.lines.map(l=>l.text).join(''),Object.keys(J.FONTS));
  const before=await J.cinemaV3.planHash(p),locks=J.cinemaV3.lockSignature(p);if(before!==ref.planHash)throw Error('HISTORICAL_PLAN_CHANGED');
  const audio=await J.analyzeAudio(new Blob([Uint8Array.from(atob(wav),c=>c.charCodeAt(0))],{type:'audio/wav'}));
  const snapshot=await J.cinemaV3.snapshot(project,audio,p,range),trace=[],contract=J.cinemaLyricTemporalContract;
  J.cinemaLyricTemporalContract=function(env,it){const result=contract.apply(this,arguments);if(env.cut.layout==='photoCondensed')trace.push({time:env.t,cutIndex:env.cut.index,line:env.cut.line,text:it.text,status:result.status,reason:result.reason??null,mode:result.mode??null,role:result.state?.role??null,travel:result.state?.travel??null});return result;};
  let output;try{output=await J.exportMP4({plan:p,project,audio,range});}finally{J.cinemaLyricTemporalContract=contract;}
  const bytes=new Uint8Array(await output.blob.arrayBuffer());let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));
  const videoSHA256=await window.preserveMovie(btoa(text));
  return {build:window.KAMEN_BUILD_INFO,inputSnapshot:snapshot,initialPlanHash:before,finalPlanHash:await J.cinemaV3.planHash(p),locksUnchanged:J.cinemaV3.lockSignature(p)===locks,videoSHA256,validation:output.validation,provenance:output.provenance,photoContractTrace:trace,policy:p.cinemaLyricTemporalPolicy,cuts:p.cuts.map(c=>({index:c.index,line:c.line,start:c.start,end:c.end,layout:c.layout,role:c.grammar?.temporal?.role}))};
 },{ref,wav:wav.toString('base64'),source});
 const video=path.join(out,'current.mp4');assert.equal(sha(fs.readFileSync(video)),result.videoSHA256);
 const dec=spawnSync('ffmpeg',['-v','error','-xerror','-i',video,'-f','null','-'],{encoding:'utf8'});assert.equal(dec.status,0,dec.stderr);assert(!dec.stderr.trim());
 const probe=JSON.parse(spawnSync('ffprobe',['-v','error','-count_frames','-show_streams','-of','json',video],{encoding:'utf8'}).stdout);assert(probe.streams.some(s=>s.codec_name==='h264')&&probe.streams.some(s=>s.codec_name==='aac'));
 const fav=result.provenance.finalArtifactVerification;assert.equal(fav.binding.videoSHA256,result.videoSHA256);assert.equal(fav.binding.sourceCommit,source);assert(result.locksUnchanged);assert.equal(result.initialPlanHash,result.finalPlanHash);assert.deepEqual(errors,[]);
 const report={schema:1,scope:'HISTORICAL_NATURALLY_SELECTED_PLAN_CURRENT_PUBLIC_API_EXPORT_COMPATIBILITY',freshAutomaticSelection:false,uiProjectRestoreTest:false,historicalSourceCommit:'d6fe7be2fa53475dc7493f35229af6ad4f57235f',historicalVideoSHA256:'c8810ca3a5015a26c1ff7b01e24d169a44970ff9e7ba83fa857db739c703fae6',referenceSHA256:sha(refBytes),audioSHA256:sha(wav),independentFullDecode:'PASS',browserVersion:browser.version(),pageErrors:errors,ffprobe:probe,...result};
 fs.writeFileSync(path.join(out,'report.json.gz'),zlib.gzipSync(Buffer.from(JSON.stringify(report)),{mtime:0}));
 console.log(JSON.stringify({videoSHA256:result.videoSHA256,FAV:fav.status,fullDecode:'PASS',photoExecutableCalls:result.photoContractTrace.filter(x=>x.status==='EXECUTABLE').length,scope:report.scope}));
 }finally{await browser.close();}})().catch(e=>{fs.writeFileSync(path.join(out,'failure.json'),JSON.stringify({error:String(e.stack)}));console.error(e);process.exitCode=1;});
