'use strict';
const assert=require('assert/strict');
function selectAdoptedNativeOutput(row,expectedFrameCount){
 const b=row.provenance?.finalArtifactVerification?.binding,p=row.nativeOutputProof;assert(b&&p,'ADOPTED_BINDING_REQUIRED');
 assert.equal(row.sha256,b.videoSHA256,'ORIGINAL_VIDEO_BINDING_MISMATCH');assert.equal(p.videoSHA256,row.sha256,'NATIVE_PROOF_VIDEO_MISMATCH');assert.equal(p.selectedPlanHash,b.planHash,'NATIVE_PROOF_PLAN_MISMATCH');
 assert.deepEqual(p.profile,b.outputProfile,'NATIVE_PROOF_PROFILE_MISMATCH');assert.equal(Math.round((p.profile.range[1]-p.profile.range[0])*p.profile.fps),expectedFrameCount,'OUTPUT_FRAME_COUNT_MISMATCH');
 const groups=p.groups.filter(g=>g.planHash===b.planHash&&g.frames.length===expectedFrameCount);assert.equal(groups.length,1,'UNIQUE_ADOPTED_FULL_OUTPUT_GROUP_REQUIRED');
 const frames=groups[0].frames;assert.equal(new Set(frames.map(x=>x.time)).size,expectedFrameCount,'DUPLICATE_OUTPUT_CLOCK');assert(frames.every(x=>Number.isFinite(x.time)&&/^[0-9a-f]{64}$/.test(x.sha256)),'INVALID_NATIVE_FRAME');return groups[0];
}
module.exports={selectAdoptedNativeOutput};
