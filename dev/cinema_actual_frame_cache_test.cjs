'use strict';
const assert=require('node:assert/strict'),{engine}=require('./custom_test_support.cjs');
const {J,context}=engine(),OriginalRenderer=J.Renderer,originalPrepare=J.prepareCinemaProxyRenderer;let renders=0;
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
  const subsetOptions={...options,inputHash:'subset',scope};
  const first=await J.measureCinemaOutputReadability(p,range,null,{...subsetOptions,times:[times[0]]});
  const expanded=await J.measureCinemaOutputReadability(p,range,null,{...subsetOptions,times:[times[0],times[1]]});
  const fresh=await J.measureCinemaOutputReadability(p,range,null,{...options,times:[times[0],times[1]]});
  assert.equal(J.canonicalJSON(expanded.samples),J.canonicalJSON(fresh.samples),'different time sets reuse only identical per-time evidence');assert.equal(expanded.sampleReuse.samples,1);assert.equal(expanded.renderCounts.native,1);
  expanded.samples[0].line=999;const cloned=await J.measureCinemaOutputReadability(p,range,null,{...subsetOptions,times:[times[0],times[2]]});assert.notEqual(cloned.samples[0].line,999,'per-time evidence is cloned');
  p.seed=2;assert(!(await J.measureCinemaOutputReadability(p,range,null,{...options,inputHash:'one',scope})).measurementReuse);p.seed=1;
  const fontStatus=context.document.fonts.status;context.document.fonts.status='loading';assert(!(await J.measureCinemaOutputReadability(p,range,null,{...options,inputHash:'one',scope})).measurementReuse);context.document.fonts.status=fontStatus;
  const raced=new AbortController(),hash=J.cinemaV3.planHash;
  try{J.cinemaV3.planHash=async p=>{const h=await hash(p);raced.abort();return h;};await assert.rejects(J.measureCinemaOutputReadability(p,range,raced.signal,{...options,inputHash:'one',scope}),{name:'AbortError'},'cancel during async hash must stop a cache hit');}finally{J.cinemaV3.planHash=hash;}
  for(const change of ['font','glyph']){const hash=J.cinemaV3.planHash,resolution=J.glyphs.maxRes;
   try{J.cinemaV3.planHash=async p=>{const h=await hash(p);if(change==='font')J.fontLoadEvidence.set('__cache_test__',{status:'LOADED',family:'synthetic'});else J.glyphs.maxRes=resolution+1;return h;};const result=await J.measureCinemaOutputReadability(p,range,null,{...options,inputHash:'one',scope});assert(!result.measurementReuse,'font/glyph changes during awaited hash invalidate cache');}finally{J.cinemaV3.planHash=hash;J.fontLoadEvidence.delete('__cache_test__');J.glyphs.maxRes=resolution;}
  }
  const controller=new AbortController();controller.abort();await assert.rejects(J.measureCinemaOutputReadability(p,range,controller.signal,{...options,inputHash:'one',scope}),{name:'AbortError'});assert.equal(scope.readabilitySamples.size,0,'cancel invalidates per-time evidence');
  for(let n=0;n<20;n++)await J.measureCinemaOutputReadability(p,range,null,{...options,inputHash:'unique-'+n,scope});assert(scope.readabilityCache.size<=16);assert(renders>before);
 }
 J.Renderer=OriginalRenderer;J.prepareCinemaProxyRenderer=originalPrepare;
 for(const aspect of ['16:9','9:16','1:1']){
  const project={...J.defaultProject(),aspect,res:360,fps:24,lyrics:'[00:00.20]光と夢'},p=J.plan(project,{duration:2,beats:[]});J.cinemaV3.bindDelivery(p,project);
  const options={physicalOnly:true,backgroundConsistency:true,additionalTimes:times,times},individual=[];
  for(const t of times){const r=await J.measureCinemaOutputReadability(p,range,null,{...options,times:[t]});individual.push(r.samples[0]);}
  const batched=await J.measureCinemaOutputReadability(p,range,null,options);assert.equal(J.canonicalJSON(batched.samples),J.canonicalJSON(individual),'shipping Renderer samples must equal independent fresh calls');assert.equal(batched.renderCounts.native,1);
  const scope={renderer:new OriginalRenderer()};try{await J.measureCinemaOutputReadability(p,range,null,{...options,scope,inputHash:'shipping',times:[times[0]]});const expanded=await J.measureCinemaOutputReadability(p,range,null,{...options,scope,inputHash:'shipping'});assert.equal(J.canonicalJSON(expanded.samples),J.canonicalJSON(batched.samples),'shipping Renderer per-time reuse preserves every measurement');assert.equal(expanded.sampleReuse.samples,1);}finally{scope.renderer.customBgBitmap?.close?.();scope.renderer.disposeAssets?.();}
 }
 console.log('Canvas cache contracts plus shipping Renderer differential samples across three aspects PASS');
})().catch(error=>{console.error(error);process.exitCode=1});
