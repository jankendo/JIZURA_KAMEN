'use strict';
const assert=require('node:assert/strict'),{engine}=require('./custom_test_support.cjs');
(async()=>{
 const {J}=engine(),V=J.cinemaV3,p={W:160,H:90,fps:24,duration:1,cuts:[{line:0,start:0,end:1,dur:1,text:'歌',params:{},grammar:{}}],musicalPhoto:{cinema:{}},storyboard:[]};
 V.legacyPlanningStates.set(p,V.clone(p));
 const oldMeasure=J.measureCinemaSequence,oldRebuild=J.rebuildCinemaBeatIntent,oldSelect=J.selectCinemaProxyStages;
 const progress=[],controller=new AbortController(),telemetry={signal:controller.signal,onProgress:e=>progress.push(e)},sentinel=new Error('STOP_AFTER_NESTED_CONTRACT');let nested=null;
 try{
  J.rebuildCinemaBeatIntent=()=>{};
  J.measureCinemaSequence=async()=>({rank:1,samples:[{safe:true,signature:[0],primarySignature:[0],readabilityFailures:[]}]});
  J.selectCinemaProxyStages=async(_p,_range,t)=>{nested=t;t.onProgress({label:'actual nested candidate completed'});throw sentinel;};
  await assert.rejects(V.compareLegacyFinalist(p,null,controller.signal,[{id:'baseline'}],{score:90},telemetry),e=>e===sentinel);
  assert.equal(nested.signal,controller.signal);assert.equal(nested.onProgress,telemetry.onProgress);
  assert(progress.some(e=>e.label.includes('1/1')),'completed raster candidate must reach caller');
  assert(progress.some(e=>e.label==='actual nested candidate completed'),'nested Stage B/C must retain actual progress callback');
 }finally{J.measureCinemaSequence=oldMeasure;J.rebuildCinemaBeatIntent=oldRebuild;J.selectCinemaProxyStages=oldSelect;}
 console.log('Nested raster completion, Stage B/C progress and cancellation signal forwarding PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
