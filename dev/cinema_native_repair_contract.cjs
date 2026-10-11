'use strict';
const assert=require('node:assert/strict');
// The old scalar mixes composition distance, energy deficit and stagnation.
// A decline is allowed only for a verified local readability repair; it never
// certifies artistic improvement or replaces final encoded-MP4 safety QA.
module.exports=(initial,selected,search)=>{
 if(selected>=initial)return;
 const r=search?.readabilityTrial;
 assert.equal(r?.accepted,true,'A lower legacy raster rank needs verified readability repair');
 const a=r.before,b=r.after;
 assert.equal(a.source,b.source);assert(Number.isFinite(a.fps)&&a.fps>0);assert.equal(a.fps,b.fps);
 assert(Array.isArray(a.outputResolution)&&a.outputResolution.length===2&&a.outputResolution.every(v=>Number.isFinite(v)&&v>0));
 assert.equal(JSON.stringify(a.outputResolution),JSON.stringify(b.outputResolution));
 assert.equal(JSON.stringify(a.observerResolution),JSON.stringify(b.observerResolution));
 assert.equal(a.cacheIdentity?.profileId,b.cacheIdentity?.profileId);
 assert.equal(a.cacheIdentity?.inputHash,b.cacheIdentity?.inputHash);
 assert(Number.isFinite(a.score)&&Number.isFinite(b.score)&&b.score>=a.score);
 const next=new Map(b.samples.map(s=>[s.time,s]));let measured=0,improved=false;
 for(const old of a.samples){const n=next.get(old.time);for(const key of ['contrast','alignedContrast']){
  if(!Number.isFinite(old[key]?.score))continue;measured++;
  assert(Number.isFinite(old.actualTime)&&n&&n.line===old.line&&n.actualTime===old.actualTime,'Protect identical phrase/frame observations');
  assert(Number.isFinite(n[key]?.score)&&n[key].score>=old[key].score,'Every measured readability interval remains protected');
  improved ||= n[key].score>old[key].score;
 }}
 assert(measured>0&&improved,'A raster-rank tradeoff requires an actual measured readability gain');
};
