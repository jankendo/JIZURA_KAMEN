'use strict';
const assert=require('node:assert/strict'),{engine}=require('./custom_test_support.cjs');
const {J,context}=engine();let renders=0;
class Raster {
 frame(x,p,t,options){renders++;x.fillStyle='#456';x.fillRect(0,0,x.canvas.width,x.canvas.height);if(!p._decodedNeutralPrimary){x.fillStyle='#fff';x.fillRect(24+t*3,40,100,24);}if(options.lyricAuditCtx){const m=options.lyricAuditCtx;m.clearRect(0,0,m.canvas.width,m.canvas.height);if(!p._decodedNeutralPrimary){m.fillStyle='#fff';m.fillRect(24+t*3,40,100,24);}}}
 disposeAssets(){}
}
J.Renderer=Raster;J.prepareCinemaProxyRenderer=async()=>{};
const times=[.31,.311,.312],range={start:0,end:2};
(async()=>{
 for(const [W,H] of [[640,360],[360,640],[360,360]])for(const physicalOnly of [false,true]){
  const p={W,H,seed:1,fps:24,duration:2,cinemaDelivery:{width:W,height:H},cuts:[{line:0,start:0,end:2,dur:2,grammar:{temporal:{}}}],lines:[{text:'光'}]};
  const options={physicalOnly,backgroundConsistency:true,additionalTimes:times,times};
  const individual=[];for(const t of times){const r=await J.measureCinemaOutputReadability(p,range,null,{...options,times:[t]});individual.push(r.samples[0]);}
  const scope={renderer:new Raster()},before=renders,batched=await J.measureCinemaOutputReadability(p,range,null,{...options,inputHash:'one',scope});
  assert.equal(J.canonicalJSON(batched.samples),J.canonicalJSON(individual),'batched physical and historical samples equal independent fresh pixels');assert.equal(batched.renderCounts.native,1);assert.equal(batched.renderCounts.actualFrameHits,2);
  const rendered=renders,hit=await J.measureCinemaOutputReadability(p,range,null,{...options,inputHash:'one',scope});assert.equal(renders,rendered);assert(hit.measurementReuse);assert.equal(J.canonicalJSON(hit),J.canonicalJSON(batched),'cache telemetry cannot alter serialized evidence or plan hash');
  hit.samples[0].contrast.score=12345;const safe=await J.measureCinemaOutputReadability(p,range,null,{...options,inputHash:'one',scope});assert.equal(J.canonicalJSON(safe),J.canonicalJSON(batched),'caller cannot corrupt cache');
  for(const changed of [{inputHash:'two'},{times:[times[0]]},{lines:[1]},{backgroundConsistency:false},{physicalOnly:!physicalOnly}]){const next=await J.measureCinemaOutputReadability(p,range,null,{...options,inputHash:'one',scope,...changed});assert(!next.measurementReuse,'changed measurement conditions never reuse evidence');}
  p.seed=2;assert(!(await J.measureCinemaOutputReadability(p,range,null,{...options,inputHash:'one',scope})).measurementReuse);p.seed=1;
  const fontStatus=context.document.fonts.status;context.document.fonts.status='loading';assert(!(await J.measureCinemaOutputReadability(p,range,null,{...options,inputHash:'one',scope})).measurementReuse);context.document.fonts.status=fontStatus;
  const controller=new AbortController();controller.abort();await assert.rejects(J.measureCinemaOutputReadability(p,range,controller.signal,{...options,inputHash:'one',scope}),{name:'AbortError'});
  for(let n=0;n<20;n++)await J.measureCinemaOutputReadability(p,range,null,{...options,inputHash:'unique-'+n,scope});assert(scope.readabilityCache.size<=16);assert(renders>before);
 }
 console.log('Actual Canvas pixels: fresh/adjacent frame equivalence across three aspects and two reference modes; immutable bounded cache, invalidation, hash identity and cancel PASS');
})().catch(error=>{console.error(error);process.exitCode=1});
