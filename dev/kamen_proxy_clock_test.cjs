// Controlled decoder callbacks; no real MP4 or creative merit claimed.
'use strict';
const assert=require('node:assert/strict'),{engine}=require('./custom_test_support.cjs'),{J,context}=engine();
(async()=>{
 const p=J.plan({...J.defaultProject(),lyrics:'[00:00.20]音を読む',aspect:'1:1',res:640,fps:24},{duration:1,beats:[]});
 J.encodeCinemaVisualProxy=async()=>new Blob(['controlled-unit-artifact']);J.cinemaDecodeTimes7=()=>[.31,.35,.44];
 let low=[],high=[],mode='missing';J.measureDecodedCinemaFrames=frames=>{low=frames;return {completed:true,frameCount:frames.length,metrics:{},lowerTailQuality:null};};J.verifyDecodedCinemaLayers=async frames=>{high=frames;return {};};J.applyDecodedCinemaEvidence=()=>{};
 context.window.JIZURAMedia={sampleMP4:async(blob,times,options)=>{for(const t of times){const pixels=new Uint8Array(options.width*options.height*4);await options.onSample(t,pixels,mode==='missing'?{}:{timestamp:Math.floor(t*10+1e-6)/10});}}};
 await assert.rejects(J.measureCinemaEncodedProxy(p,{start:0,end:1},null),/PROXY_ACTUAL_DECODED_TIMESTAMP_UNMEASURED/);
 mode='actual';const result=await J.measureCinemaEncodedProxy(p,{start:0,end:1},null,{inputHash:'controlled-input'});
 assert.deepEqual(Array.from(low,x=>x.time),[.3,.4],'deduplicate decoded frames, never substitute requested-time positions');assert.equal(low[0].requestedTime,.31);assert(high.length>0,'ordinary lyric units must be sampled without requiring Cinema grammar');assert(high.every(x=>x.time===x.actualTime),'all high-resolution phase clocks must be actual decoded clocks');assert(result.videoSHA256&&result.planHash&&result.profileId);assert.equal(result.inputHash,'controlled-input');assert.equal(J.cinemaV3.registryCreativeDominates(result,result),false,'unit mocks/missing creative metrics cannot promote a candidate');
 console.log('Missing decoded clocks, repeated-frame deduplication, non-Grammar lyric coverage and actual phase clocks PASS (controlled decoder, not an MP4)');
})().catch(e=>{console.error(e);process.exitCode=1;});
