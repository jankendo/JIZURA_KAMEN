'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {engine,root}=require('./custom_test_support.cjs');
const baseline=process.argv[2]||path.resolve(root,'../v36-baseline');
const {J}=engine();let count=0;const report={baseline:'v36',version:'1.2.1',tests:[],measurements:[]};
async function test(name,fn){await fn();count++;report.tests.push({name,result:'PASS'});console.log(name+' PASS');}
function audio(directory,sr,seconds,channels,silent=false){
 const data=Array.from({length:channels},(_,c)=>Float32Array.from({length:Math.round(sr*seconds)},(_,i)=>silent?0:Math.sin(i*2*Math.PI*(200+c*47)/sr)*(.15+.08*Math.sin(i/sr*4))+(i%Math.round(sr*.5)<sr*.01?.2:0)));
 const buffer={sampleRate:sr,length:data[0].length,numberOfChannels:channels,duration:seconds,getChannelData:c=>data[c]};let closed=0;
 const J={BPM_RANGE:{min:45,max:240}},context=vm.createContext({J,window:{AudioContext:class{async decodeAudioData(){return buffer;}async close(){closed++;}}},setTimeout,clearTimeout});
 vm.runInContext(fs.readFileSync(path.join(directory,'src/10_audio.js'),'utf8'),context);
 return {J,file:{name:'日本語「A&B」音源.wav',arrayBuffer:async()=>new ArrayBuffer(16)},get closed(){return closed;}};
}
const plain=a=>JSON.stringify({...a,buffer:undefined});
(async()=>{
 await test('weighted_progress_unknown_work_does_not_advance_or_complete',()=>{
  const t=J.processing.begin('検証',[['a','入力',2],['b','解析',8],['c','保存',2]]);t.enter('a');t.update(1,2);assert.equal(J.processing.snapshot(t.state).fraction,1/12);
  t.enter('b');assert.equal(J.processing.snapshot(t.state).fraction,2/12);t.update(null,null,'処理中');assert.equal(J.processing.snapshot(t.state).fraction,2/12);
  t.update(8,8);assert(J.processing.snapshot(t.state).fraction<1);assert.equal(t.state.status,'running');t.enter('c');t.update(1,1);assert(J.processing.snapshot(t.state).fraction<1);
  t.complete();assert.equal(J.processing.snapshot(t.state).fraction,1);assert.equal(t.state.status,'completed');t.dismiss();
 });
 await test('backward_retry_clears_work_and_preserves_skipped_steps',()=>{
  const t=J.processing.begin('検証',[['a','準備',1],['b','音声',1],['c','映像',8]]);t.skip('b');t.enter('a');t.enter('c');assert.equal(t.state.stages[1].status,'skipped');t.update(5,10);t.enter('a');assert.equal(t.state.stages[2].status,'pending');assert.equal(t.state.stages[1].status,'skipped');t.complete();assert.equal(J.processing.snapshot(t.state).totalSteps,2);t.dismiss();
 });
 await test('parallel_jobs_errors_and_cancellation_keep_the_failed_stage',()=>{
  const a=J.processing.begin('解析',[['a','周波数解析',1]]),b=J.processing.begin('保存',[['b','素材保存',1]]);a.enter('a');b.enter('b');a.update(1,4);b.complete();assert.equal(a.state.status,'running');a.fail(new Error('安全なテストエラー'));assert.equal(J.processing.snapshot(a.state).stage.label,'周波数解析');a.update(1,1);assert.equal(J.processing.snapshot(a.state).fraction,.25);a.dismiss();b.dismiss();
  const c=J.processing.begin('中止',[['a','解析',1]]);c.enter('a');c.fail(new Error('中止'),true);assert.equal(c.state.status,'cancelled');c.dismiss();
 });
 await test('audio_progress_and_chunked_arithmetic_exactly_match_v36',async()=>{
  for(const [sr,seconds,channels,silent]of [[8000,.1,1,true],[16000,6,1,false],[44100,30,2,false],[16000,120,1,false]]){
   const a=audio(baseline,sr,seconds,channels,silent),b=audio(root,sr,seconds,channels,silent),events=[];
   const previous=await a.J.analyzeAudio(a.file),next=await b.J.analyzeAudio(b.file,{onProgress:e=>events.push(e)});
   assert.equal(plain(next),plain(previous));assert.equal(b.closed,1);
   assert.deepEqual([...new Set(events.map(e=>e.stage))],['read','decode','wave','beat','spectrum','features']);
   assert(events.some(e=>e.stage==='decode'&&e.current===null));if(seconds>=6)assert(events.some(e=>e.stage==='spectrum'&&e.total>0));
  }
 });
 await test('analysis_yields_to_event_loop_and_cancellation_releases_audio_context',async()=>{
  const a=audio(root,44100,30,2);let heartbeat=0;const timer=setInterval(()=>heartbeat++,1);const start=performance.now();await a.J.analyzeAudio(a.file,{onProgress(){}});clearInterval(timer);assert(heartbeat>10);report.measurements.push({test:'30s stereo analysis with progress',elapsedMs:performance.now()-start,eventLoopHeartbeats:heartbeat,decode:'mocked'});
  const b=audio(root,16000,30,1),c=new AbortController();await assert.rejects(b.J.analyzeAudio(b.file,{signal:c.signal,onProgress:e=>{if(e.stage==='wave')c.abort();}}),/中止/);assert.equal(b.closed,1);
 });
 await test('plans_and_canvas_pixels_unchanged_across_aspects_and_media_counts',async()=>{
  const old=engine(baseline),next=engine(root),bg=old.createCanvas(320,180),ctx=bg.getContext('2d');ctx.fillStyle='#385f8f';ctx.fillRect(0,0,320,180);const url=bg.toDataURL('image/png');
  const a={duration:3,bpm:120,beats:[0,.5,1,1.5,2,2.5],features:{energy:.7,beatStrength:.8,density:.6,brightness:.5,bass:.6,high:.4,timeline:[{time:0,energy:.7,density:.6,spectralFlux:.5}]}};
  for(const aspect of ['16:9','9:16','1:1','4:5'])for(const images of [0,1,2]){
   const p=old.J.defaultProject();Object.assign(p,{aspect,seed:777,title:'日本語',lyrics:images?'[00:00.00]光をつなぐ\n[00:01.00]未来へ進む':'',res:1080,fps:30});if(images)p.customBg={...p.customBg,enabled:true,dataUrl:url};if(images===2)p.visualAssets=['hero','other'].map(id=>({id,name:id+'.png',dataUrl:url,role:'AUTO',pin:'auto',analysis:old.J.analyzeVisualAsset(bg)}));
   const op=old.J.plan(JSON.parse(JSON.stringify(p)),a),np=next.J.plan(JSON.parse(JSON.stringify(p)),a);assert.equal(JSON.stringify(np),JSON.stringify(op));old.resetRandom();next.resetRandom();
   const or=new old.J.Renderer(),nr=new next.J.Renderer();if(images){await or.loadCustomBackground(url);await nr.loadCustomBackground(url);}await or.loadAssetDeck(op);await nr.loadAssetDeck(np);
   const width=160,height=Math.round(width*op.H/op.W),oc=old.createCanvas(width,height),nc=next.createCanvas(width,height);
   for(const t of [.05,.5,1.05,1.8,2.6]){or.frame(oc.getContext('2d'),op,t,{scale:width/op.W,production:true});nr.frame(nc.getContext('2d'),np,t,{scale:width/np.W,production:true});assert.deepEqual(nc.getContext('2d').getImageData(0,0,width,height).data,oc.getContext('2d').getImageData(0,0,width,height).data);}or.disposeAssets();nr.disposeAssets();
  }
 });
 await test('real_canvas_quality_results_match_v36_with_scoped_events',async()=>{
  const old=engine(baseline),next=engine(root),p=old.J.defaultProject();Object.assign(p,{seed:777,lyrics:'[00:00.00]光をつなぐ\n[00:01.00]未来へ進む'});const a={duration:2,bpm:120,beats:[0,.5,1,1.5],features:{energy:.7,beatStrength:.8,density:.6}};
  const op=old.J.plan(JSON.parse(JSON.stringify(p)),a),np=next.J.plan(JSON.parse(JSON.stringify(p)),a),events=[];old.resetRandom();next.resetRandom();const oq=await old.J.analyzeRenderedFrames(op,{start:0,end:2},a),nq=await next.J.analyzeRenderedFrames(np,{start:0,end:2},a,{onProgress:e=>events.push(e)});assert.equal(JSON.stringify(nq),JSON.stringify(oq));assert(events.some(e=>e.total>0));
 });
 await test('progress_panel_completion_error_retry_and_elapsed_time',()=>{
  const e=engine(root),queue=[],intervals=new Map();let id=0;
  class Node{constructor(){this.dataset={};this.attrs={};this.children=[];this.map=new Map();this.textContent='';}set innerHTML(v){this.html=v;}get innerHTML(){return this.html;}appendChild(n){this.children.push(n);n.parent=this;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}setAttribute(k,v){this.attrs[k]=v;}removeAttribute(k){delete this.attrs[k];}querySelector(k){if(k==='ol'){if(!this.map.has(k))this.map.set(k,new Node());return this.map.get(k);}if(!this.map.has(k))this.map.set(k,new Node());return this.map.get(k);}querySelectorAll(k){return k==='li'?this.querySelector('ol').children:[];}}
  const host=new Node();e.context.document.getElementById=()=>host;e.context.document.createElement=()=>new Node();e.context.setTimeout=fn=>{queue.push(fn);return ++id;};e.context.setInterval=fn=>{intervals.set(++id,fn);return id;};e.context.clearInterval=n=>intervals.delete(n);
  vm.runInContext(fs.readFileSync(path.join(root,'src/12a_processing_ui.js'),'utf8'),e.context);e.J.mountProcessingUI();const paint=()=>{for(const fn of queue.splice(0))fn();};
  let retries=0;const t=e.J.processing.begin('解析',[['read','読込',1],['fft','周波数解析',9]],{retry:()=>retries++});t.enter('read');paint();let card=host.children[0];assert(card.querySelector('.processing-stage').textContent.includes('読込'));assert.equal(card.querySelector('.processing-total').value,0);assert.equal(intervals.size,1);
  t.enter('fft');paint();assert.equal(card.querySelector('.processing-total').value,10);assert(!('value'in card.querySelector('.processing-current progress').attrs));t.update(5,10);paint();assert.equal(card.querySelector('.processing-total').value,55);
  t.fail(new Error('検査エラー'));paint();assert.equal(intervals.size,0);assert(card.querySelector('.processing-stage').textContent.includes('周波数解析'));assert(!card.querySelector('.processing-retry').hidden);card.querySelector('.processing-retry').onclick();assert.equal(retries,1);paint();
  const done=e.J.processing.begin('保存',[['save','素材保存',1]]);done.enter('save');done.complete('保存完了');paint();card=host.children[0];assert.equal(card.querySelector('.processing-total').value,100);assert(card.querySelector('.processing-stage').textContent.includes('完了'));assert.equal(intervals.size,0);assert(card.querySelector('.processing-time').textContent.includes('経過'));card.querySelector('.processing-close').onclick();paint();assert(host.hidden);
 });
 await test('storage_schema_dependencies_and_output_settings_preserved',()=>{
  for(const name of ['package.json','package-lock.json']){const before=JSON.parse(fs.readFileSync(path.join(baseline,name))),after=JSON.parse(fs.readFileSync(path.join(root,name)));before.version=after.version;if(before.packages)before.packages[''].version=after.packages[''].version;assert.deepEqual(after,before);}
  assert.equal(J.PROJECT_SCHEMA_VERSION,3);assert.deepEqual(fs.readFileSync(path.join(root,'.openai/hosting.json')),fs.readFileSync(path.join(baseline,'.openai/hosting.json')));
  const old=engine(baseline).J;for(const aspect of ['16:9','9:16','1:1','4:5']){const p=J.defaultProject();p.aspect=aspect;assert.equal(JSON.stringify(J.resolveExportSettings(p)),JSON.stringify(old.resolveExportSettings(p)));}
 });
 fs.writeFileSync(path.join(root,'dev/processing-progress-results.json'),JSON.stringify(report,null,2));console.log(count+' processing regression groups passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
