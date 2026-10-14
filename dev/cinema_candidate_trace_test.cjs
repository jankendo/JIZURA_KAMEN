'use strict';
const assert=require('node:assert/strict'),{engine}=require('./custom_test_support.cjs'),{J}=engine();
const candidates=Array.from({length:8},(_,i)=>({layout:'layout-'+i,family:'family',score:1-i/100,params:{font:'embedded_bold',photoAnchor:{x:.5,y:.5}},signature:new Float32Array([i,0]),typographySignature:new Float32Array([0,i])})),excluded=[{layout:'unsafe',reason:'ACTUAL_PHRASE_RASTER_NOT_ELIGIBLE',geometry:[{readable:false}]}],cut={line:2,start:1,end:2,lineText:'同じ行',text:'同じ行'};
const trace=J.registryCandidateTrace(cut,'style','embedded_bold','verse',.4,candidates,excluded),next=J.registryCandidateTrace({...cut,start:2,end:3},'style','embedded_bold','verse',.4,candidates,excluded);
assert.notEqual(trace.unitKey,next.unitKey,'different internal intervals on the same line cannot share the trace identity');assert.equal(trace.candidates.length,8);assert.equal(trace.candidates.filter(c=>c.retainedForGlobal).length,8);assert.equal(trace.candidates[7].exclusionReason,null);
candidates[0].params.photoAnchor.y=.9;candidates[0].signature[0]=99;excluded[0].geometry[0].readable=true;
assert.equal(trace.candidates[0].params.photoAnchor.y,.5,'later anchor repair cannot rewrite the pre-global trace');assert.equal(trace.candidates[0].spatialSignature[0],0);assert.equal(trace.exclusions[0].geometry[0].readable,false);assert.equal(trace.fontLoadEvidence.status,'UNMEASURED','requested font ID cannot manufacture a loaded-face observation');console.log('Candidate trace: stable internal interval identity, full pre-cap ranking, immutable snapshots and honest font availability PASS');

const low=candidates[7],duplicates=[...candidates,{...candidates[0],layout:'same-raster-alias'}];
const portfolio=J.registryCompositionPortfolio(duplicates);
assert.equal(portfolio.candidates.length,8);assert(portfolio.candidates.includes(low),'distinct low-local-rank composition survives to global search');
assert.equal(portfolio.duplicates[0].layout,'same-raster-alias');
const bounded=J.registryCompositionPortfolio(duplicates,3);assert.equal(bounded.candidates.length,3);assert.equal(bounded.candidates[0],candidates[0]);
const original={line:2,start:1,end:2,lineText:'同じ行',params:{photoAnchor:{x:.1,y:.1}}};
const selected={...original,layout:'right',enter:'wipe',hold:'breathe',exit:'cut',camera:'pan',bg:'image',fx:['glow'],grammar:{kind:'duo'},params:{font:'embedded_bold',photoAnchor:{x:.8,y:.7}}};
const applied=J.registryApplyMeasuredCandidate(original,{cut:selected});assert.equal(applied.params.photoAnchor.x,.8);assert.equal(applied.hold,'breathe');assert.equal(applied.camera,'pan');assert.equal(applied.grammar.kind,'duo');
applied.params.photoAnchor.x=.2;assert.equal(selected.params.photoAnchor.x,.8,'application does not mutate measured candidate');
assert.throws(()=>J.registryApplyMeasuredCandidate({...original,end:3},{cut:selected}),/REGISTRY_UNIT_IDENTITY_CHANGED/);
console.log('Distinct composition portfolio and immutable complete candidate application PASS');
