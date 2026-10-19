'use strict';
const assert=require('assert/strict'),crypto=require('crypto'),{validateCurrentNativeEnvironment}=require('./validate_shared_control_baseline.cjs');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
function validateOriginalVerificationReuse(row,trace,referenceSHA256){
 const fav=row.provenance?.finalArtifactVerification,b=fav?.binding;
 assert(fav&&fav.status==='MEASURED','ORIGINAL_FAV_NOT_MEASURED');assert.equal(b.videoSHA256,row.sha256);assert.equal(b.inputHash,row.inputSnapshot?.inputHash??row.provenance.finalArtifactVerification.binding.inputHash);assert(Array.isArray(fav.units)&&fav.units.length&&fav.units.every(x=>x.status==='MEASURED'),'ORIGINAL_UNITS_NOT_MEASURED');assert(Array.isArray(fav.frames)&&fav.frames.length,'ORIGINAL_FRAMES_ABSENT');assert(!fav.failures?.length,'ORIGINAL_FAV_HAS_FAILURE');assert.equal(b.rendererVersion,b.sourceTreeSHA256);assert.equal(b.sourceDirty,false);assert.deepEqual(b.outputProfile,row.nativeOutputProof.profile);
 const native=validateCurrentNativeEnvironment(row,trace,referenceSHA256);
 return {schema:1,scope:'Reuse the original immutable measured FAV for the same original video only; no new verification run claimed and no transfer to a different encoded movie.',originalVideoSHA256:row.sha256,originalEvidenceId:fav.evidenceId,originalFAVObjectSHA256:sha(JSON.stringify(fav)),originalBinding:b,currentNative:native,unitCount:fav.units.length,frameCount:fav.frames.length,sourceCommit:b.sourceCommit,sourceTreeSHA256:b.sourceTreeSHA256};
}
module.exports={validateOriginalVerificationReuse};
