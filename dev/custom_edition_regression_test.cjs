'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const {engine,root}=require('./custom_test_support.cjs'),{J,context}=engine();
let count=0;async function test(name,fn){await fn();count++;console.log(name+' PASS');}
(async()=>{
 await test('asset_save_serial_failure_retry_and_dedup',async()=>{
  let calls=0;const data=new Map(),queue=J.createAssetSaveQueue(async entries=>{calls++;if(calls===1)throw Error('quota');await new Promise(r=>setTimeout(r,1));for(const [k,v]of entries)data.set(k,v);});
  await assert.rejects(queue([['background','A']]));
  await Promise.all([queue([['background','A'],['visualAsset:1','X']]),queue([['background','A'],['visualAsset:1','X']]),queue([['background','B'],['visualAsset:1','X']])]);
  assert.equal(calls,3);assert.equal(data.get('background'),'B');assert(queue.isDurable([['background','B']]));assert(!queue.isDurable([['background','A']]));
 });
 await test('history_shared_media_export_settings_and_pruning',()=>{
  const p=J.defaultProject(),assets=new Map(),refs=new Map();let id=0;
  const intern=url=>{if(!url)return null;if(!refs.has(url)){refs.set(url,''+(++id));assets.set(''+id,url);}return refs.get(url);};
  p.proAssets=[{id:'logo',dataUrl:'LARGE'}];p.visualAssets=[{id:'hero',dataUrl:'LARGE'}];p.customBg.dataUrl='LARGE';p.exportSettings={videoBitrate:18000000,range:'highlight'};
  const snap=J.historySnapshot(p,intern);assert.equal(assets.size,1);assert(!snap.includes('LARGE'));
  const restored=J.restoreHistory(snap,ref=>assets.get(ref));assert.equal(restored.proAssets[0].dataUrl,'LARGE');assert.equal(restored.visualAssets[0].dataUrl,'LARGE');assert.equal(restored.customBg.dataUrl,'LARGE');assert.equal(restored.exportSettings.videoBitrate,18000000);
  intern('REMOVED');J.pruneHistoryAssets([snap],assets,refs);assert.equal(assets.size,1);assert(!refs.has('REMOVED'));
 });
 await test('processing_control_lock_retains_original_disabled_state',()=>{const a={disabled:false},b={disabled:true},lock=J.createControlLock();lock.lock([a,b]);assert(a.disabled&&b.disabled);lock.lock([a]);lock.unlock();assert(!a.disabled);assert(b.disabled);});
 await test('media_wait_cleans_success_failure_timeout_abort',async()=>{
  class Media{constructor(){this.listeners=new Map();}addEventListener(e,f){if(!this.listeners.has(e))this.listeners.set(e,new Set());this.listeners.get(e).add(f);}removeEventListener(e,f){this.listeners.get(e)?.delete(f);}emit(e){for(const f of [...this.listeners.get(e)||[]])f();}get size(){return [...this.listeners.values()].reduce((s,v)=>s+v.size,0);}}
  for(let i=0;i<80;i++){const m=new Media(),p=J.waitMediaEvent(m,'seeked');m.emit('seeked');await p;assert.equal(m.size,0);}
  const m=new Media();let p=J.waitMediaEvent(m,'seeked',{timeout:1});await assert.rejects(p);assert.equal(m.size,0);p=J.waitMediaEvent(m,'seeked');m.emit('error');await assert.rejects(p);assert.equal(m.size,0);
  const c=new AbortController();p=J.waitMediaEvent(m,'seeked',{signal:c.signal});c.abort();await assert.rejects(p,{name:'AbortError'});assert.equal(m.size,0);
 });
 await test('pixel_validation_exact_rgb_threshold',()=>{const a=new Uint8ClampedArray(1600);for(let i=0;i<a.length;i++)a[i]=i%19;const b=Array.from(a).filter((_,i)=>i%4!==3).map(v=>v>8?1:0);assert.equal(J.nonBlackRGBFraction(a),b.reduce((s,v)=>s+v,0)/b.length);});
 await test('codec_retries_preserve_resolution_fps_bitrate_and_sample_rate',async()=>{
  context.VideoEncoder={isConfigSupported:async()=>({supported:true})};const attempts=await J.videoAttempts(1920,1080,60,52000000);assert(attempts.length>1);for(const a of attempts){assert.equal(a.cfg.width,1920);assert.equal(a.cfg.height,1080);assert.equal(a.cfg.framerate,60);assert.equal(a.cfg.bitrate,52000000);}
  context.AudioEncoder={isConfigSupported:async c=>({supported:c.bitrate===128000})};context.window.JIZURAAAC=null;assert.equal(await J.pickAudioCodec(44100,2,320000),null);
  context.window.JIZURAAAC={};const a=await J.pickAudioCodec(44100,2,320000);assert.equal(a.sr,44100);assert.equal(a.bitrate,320000);
 });
 await test('concurrent_decodes_failed_replacement_and_disposal',async()=>{
  let decodes=0,closed=0;context.fetch=async()=>({ok:true,blob:async()=>({})});context.createImageBitmap=async()=>{decodes++;await new Promise(r=>setTimeout(r,1));return {width:640,height:360,close(){closed++;}};};
  const r=new J.Renderer(),p={assetDeck:[{id:'hero',role:'visual',dataUrl:'A'}]};await Promise.all([r.loadAssetDeck(p),r.loadAssetDeck(p),r.loadAssetDeck(p)]);assert.equal(decodes,1);const old=r.assetBitmaps.get('hero');context.createImageBitmap=async()=>{throw Error('corrupt');};await assert.rejects(r.loadAssetDeck({assetDeck:[{id:'hero',role:'visual',dataUrl:'B'}]}));assert.equal(r.assetBitmaps.get('hero'),old);assert.equal(closed,0);
  context.createImageBitmap=async()=>{decodes++;return {width:640,height:360,close(){closed++;}};};await r.loadAssetDeck({assetDeck:[{id:'hero',role:'visual',dataUrl:'B'}]});assert.equal(closed,1);r.disposeAssets();assert.equal(closed,2);
  const q=new J.Renderer(),pending=q.loadAssetDeck(p);q.disposeAssets();await pending;assert.equal(q.assetBitmaps?.size||0,0);assert.equal(q.scratch.width,1);
  const late=new J.Renderer(),loading=late.loadCustomBackground('data:image/png;base64,AAAA');late.disposeAssets();await loading;assert.equal(late.customBgBitmap,null);
  const b=new J.Renderer();await Promise.all([b.loadCustomBackground('data:image/png;base64,AAAA'),b.loadCustomBackground('data:image/png;base64,AAAA')]);assert.equal(decodes,3);await b.loadCustomBackground('');
 });
 await test('ui_export_lock_restores_controls_and_export_state',()=>{const {J,context}=engine(root,true),control={disabled:false,id:'lyrics',classList:{contains:()=>false},closest:()=>null};context.document.querySelectorAll=()=>[control];J.ui.project=J.defaultProject();J.ui.plan=J.plan(J.ui.project,null);J.ui.exporting={};J.uiApi.syncDirectionUI();assert(control.disabled);J.ui.exporting=null;J.uiApi.syncDirectionUI();assert(!control.disabled);});
 await test('metadata_is_saved_only_after_latest_durable_assets',async()=>{
  const {J,context,nodes}=engine(root,true),stored=new Map(),assets=new Map();context.localStorage={getItem:k=>stored.get(k),setItem:(k,v)=>stored.set(k,v)};const status=nodes.get('localSaveStatus')||{};status.dataset={};nodes.set('localSaveStatus',status);
  let release;const gate=new Promise(r=>release=r);context.window.indexedDB=context.indexedDB={open(){const req={};setTimeout(()=>{req.result={objectStoreNames:{contains:()=>true},transaction(){const tx={objectStore(){return {put(v,k){assets.set(k,v);}}}};gate.then(()=>setTimeout(()=>tx.oncomplete(),0));return tx;}};req.onsuccess();},0);return req;}};
  J.ui.project=J.defaultProject();J.ui.project.customBg.dataUrl='A';let a=J.uiApi.flushSave();J.ui.project.customBg.dataUrl='B';let b=J.uiApi.flushSave();await new Promise(r=>setTimeout(r,5));assert.equal(stored.size,0);release();await Promise.all([a,b]);const saved=JSON.parse(stored.get('jizura.project.v1'));assert(saved.customBg.storedInIndexedDB);assert.equal(assets.get('background'),'B');assert.equal(status.textContent,'このブラウザに保存済み');
 });
 await test('interrupted_mirror_recovers_assets_and_respects_later_v35_edit',async()=>{
  const old=JSON.stringify({title:'旧版',style:'noir',schemaVersion:3}),next=JSON.stringify({title:'復旧版',style:'noir',schemaVersion:3,customBg:{enabled:true,dataUrl:'',storedInIndexedDB:true}}),url='data:image/png;base64,AA==';
  for(const [raw,expected] of [[old,'復旧版'],[JSON.stringify({title:'v35で後から編集',style:'noir',schemaVersion:3}),'v35で後から編集']]){const {J,context}=engine(root,true),data=new Map([['project-recovery-v1',JSON.stringify({previousRaw:old,metadata:next})],['background',url]]);context.localStorage={getItem:()=>raw};context.window.indexedDB=context.indexedDB={open(){const req={};setTimeout(()=>{req.result={transaction(){return {objectStore(){return {get(key){const r={};setTimeout(()=>{r.result=data.get(key);r.onsuccess();},0);return r;}}}};}};req.onsuccess();},0);return req;}};const project=await J.uiApi.loadLocal();assert.equal(project.title,expected);if(expected==='復旧版')assert.equal(project.customBg.dataUrl,url);}
 });
 await test('invalid_local_json_is_not_overwritten',async()=>{
  const {J,context,nodes}=engine(root,true);let writes=0;context.localStorage={getItem:()=>'{broken',setItem(){writes++;}};nodes.set('localSaveStatus',{dataset:{}});J.ui.project=await J.uiApi.loadLocal();await J.uiApi.flushSave();assert.equal(writes,0);assert(nodes.get('localSaveStatus').textContent.includes('自動保存停止'));
 });
 await test('muted_recorder_export_accepts_null_audio_and_cleans_failure',async()=>{let closed=0;const J={outputSize:()=>[640,360],Renderer:class{async loadCustomBackground(){throw Error('bad image');}get customBgBitmap(){return {close(){closed++;}}}}},sandbox={J,window:{},document:{createElement:()=>({width:640,height:360,getContext:()=>({})})},Blob,ArrayBuffer,DataView,TextEncoder,URL,setTimeout,clearTimeout,cancelAnimationFrame(){}};vm.runInNewContext(fs.readFileSync(path.join(root,'src/11_export.js'),'utf8'),sandbox);J.exportCapabilities=async()=>({recorder:'video/mp4'});await assert.rejects(J.exportMP4Fallback({plan:{duration:2,customBg:{enabled:true,dataUrl:'bad'}},project:{includeAudio:false},audio:null}),/bad image/);assert.equal(closed,1);});
 await test('semver_dependency_and_storage_schema_integrity',()=>{
  const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'))),lock=JSON.parse(fs.readFileSync(path.join(root,'package-lock.json')));assert.match(pkg.version,/^\d+[.]\d+[.]\d+$/);assert.equal(lock.packages[''].version,pkg.version);assert.equal(J.PROJECT_SCHEMA_VERSION,3);const ui=fs.readFileSync(path.join(root,'src/12_ui.js'),'utf8');assert(ui.includes("'jizura.project.v1'"));assert(ui.includes("'jizura-assets-v1'"));assert(!ui.includes('S.project.res=720'));assert(!ui.includes("bgDbSet('audio',null)"));
 });
 console.log(count+' custom quality regression groups passed');
})().catch(e=>{console.error(e);process.exitCode=1});
