'use strict';
// Executes the actual UI handlers with isolated UI/storage/codec adapters.
// This is not a browser end-to-end test and does not access user storage.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const {engine,root}=require('./custom_test_support.cjs'),path=require('node:path');
const source=fs.readFileSync(path.join(root,'src/12_ui.js'),'utf8');
function harness(){
 const e=engine(root),{J,context}=e,nodes=new Map();
 const $=id=>{if(!nodes.has(id))nodes.set(id,{dataset:{},textContent:'',disabled:false,setAttribute(){},removeAttribute(){},value:'',querySelector(){return $(`${id}-child`);},classList:{toggle(){},remove(){}},style:{}});return nodes.get(id);};
 const p=J.defaultProject();p.seed=777;p.lyrics='[00:00.00]光をつなぐ\n[00:01.00]未来へ進む';
 const audio={duration:2,bpm:120,beats:[0,.5,1,1.5],features:{energy:.7,beatStrength:.8,density:.6}},S={project:p,audio,plan:J.plan(p,audio),renderer:new J.Renderer(),audioLoad:0,need:false};
 Object.assign(context,{S,$,directionBusy:false,exportPreflightBusy:false,fontKey:'',URLSearchParams,AbortController,location:{search:''},remember(){},syncUI(){},syncDirectionUI(){},showMsg(){},commit(){},restartPreview(){},updateStudioQuality(){},syncStudioResultVisibility(){},toast(){},pause(){},flushSave:async()=>true,replan:()=>{S.plan=J.plan(S.project,S.audio);},audioLike:()=>S.audio});
 context.requestAnimationFrame=fn=>setTimeout(fn,0);return {...e,S,$};
}
(async()=>{
 const mv=harness();vm.runInContext(source.slice(source.indexOf('async function autoDirection()'),source.indexOf('\nfunction updateStudioQuality')),mv.context);
 const first=vm.runInContext('autoDirection()',mv.context),second=vm.runInContext('autoDirection()',mv.context);await Promise.all([first,second]);
 const jobs=[...mv.J.processing.jobs.values()].filter(s=>s.title==='MVを作成しています');assert.equal(jobs.length,1);assert.equal(jobs[0].status,'completed');assert.equal(mv.J.processing.snapshot(jobs[0]).fraction,1);assert.equal(mv.context.directionBusy,false);assert(mv.S.project.autoDirection);console.log('actual MV handler stages, completion and duplicate guard PASS');
 const failed=harness();failed.J.optimizeDirectionCandidatesRendered=async()=>{throw Error('安全に再現した演出設計エラー');};vm.runInContext(source.slice(source.indexOf('async function autoDirection()'),source.indexOf('\nfunction updateStudioQuality')),failed.context);await vm.runInContext('autoDirection()',failed.context);const error=[...failed.J.processing.jobs.values()].find(s=>s.title==='MVを作成しています');assert.equal(error.status,'error');assert.equal(failed.J.processing.snapshot(error).stage.id,'direction');assert.equal(failed.context.directionBusy,false);assert(error.retry);console.log('actual MV handler error stage and control release PASS');
 const ex=harness(),events=[];const report={ready:true,errors:[],quality:{},issues:[]};Object.assign(ex.context,{HUD_CHARS:"",exportRangeForSettings:()=>({start:0,end:2}),EXP_BTNS:[],navigator:{},baseName:()=> '検証',codecNote(){}});
 Object.assign(ex.J,{preflightMV:()=>({fixes:0,plan:ex.S.plan}),exportCapabilities:async()=>({webCodecs:true,h264:true,aac:true}),analyzeRenderedFrames:async()=>({completed:true}),checkMVQuality:()=>report,fixMVQuality:()=>0,ensureFonts:async()=>{},saveFile:async()=> 'saved',exportMP4:async args=>{for(const stage of [{stage:'frames',current:1,total:60,encoded:1},{stage:'frames',current:60,total:60,encoded:60},{stage:'video',indeterminate:true},{stage:'resample',indeterminate:true},{stage:'audio',current:96000,total:96000},{stage:'mux',indeterminate:true},{stage:'verify',indeterminate:true}]){args.onProgress(.99,'工程を実行しています',stage);const job=[...ex.J.processing.jobs.values()].find(s=>s.title==='動画を書き出しています');events.push({stage:stage.stage,progress:ex.J.processing.snapshot(job).fraction,status:job.status});}return {blob:new Blob(['test']),codec:'H.264',audio:'aac',validation:{videoCodec:'avc1',audioCodec:'mp4a',duration:2,certification:{passed:true}}};}});
 const box={hidden:true,querySelector:q=>ex.$(q)};ex.context.document.querySelectorAll=selector=>selector==='.exp-box'?[box]:[];
 vm.runInContext(source.slice(source.indexOf('async function runExport('),source.indexOf('\n/* ---------------- tap sync')),ex.context);await vm.runInContext("runExport('mp4')",ex.context);
 const done=[...ex.J.processing.jobs.values()].find(s=>s.title==='動画を書き出しています');assert.equal(done.status,'completed');assert.equal(ex.J.processing.snapshot(done).fraction,1);assert(events.every(e=>e.progress<1&&e.status==='running'));assert.equal(ex.S.exporting,null);assert(!source.includes("document.querySelectorAll('.exp-box')"));console.log('actual export handler frame/encode/mux/verify/save and no early 100% PASS');
 ex.J.exportCapabilities=async()=>({webCodecs:false,h264:true,aac:true,recorder:'video/mp4'});
 ex.J.exportMP4Fallback=async args=>{args.onProgress(0,'録画の準備',{stage:'frames',label:'映像と音声を録画しています',skip:['video','resample','audio','mux'],indeterminate:true});args.onProgress(.96,'録画中',{stage:'frames',current:2,total:2,unit:'秒'});args.onProgress(.99,'MP4検査',{stage:'verify',indeterminate:true});return {blob:new Blob(['test']),codec:'H.264',audio:'aac',validation:{videoCodec:'avc1',audioCodec:'mp4a',duration:2}};};
 await vm.runInContext("runExport('mp4')",ex.context);
 const fallback=[...ex.J.processing.jobs.values()].filter(s=>s.title==='動画を書き出しています').at(-1);assert.equal(fallback.status,'completed');assert.equal(ex.J.processing.snapshot(fallback).totalSteps,5);for(const id of ['video','resample','audio','mux'])assert.equal(fallback.stages.find(s=>s.id===id).status,'skipped');console.log('actual Recorder fallback marks unused encoder stages skipped PASS');
 fs.writeFileSync(path.join(root,'dev/processing-pipeline-results.json'),JSON.stringify({environment:'isolated UI and codec adapters; actual handlers',tests:4,passed:4,exportEvents:events},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
