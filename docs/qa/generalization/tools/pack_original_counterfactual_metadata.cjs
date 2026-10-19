'use strict';
const assert=require('assert/strict');
function packOriginalCounterfactualMetadata(provenance){
 const f=provenance?.finalArtifactVerification;assert(f?.binding&&f.evidenceId,'ORIGINAL_BINDING_OR_EVIDENCE_ID_ABSENT');
 return JSON.parse(JSON.stringify({finalArtifactVerification:{binding:f.binding,evidenceId:f.evidenceId},photoComposition:provenance.photoComposition??null}));
}
module.exports={packOriginalCounterfactualMetadata};
