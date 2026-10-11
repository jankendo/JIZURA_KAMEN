const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const {J}=require('/workspace/kamen-cinema-v5/dev/custom_test_support.cjs').engine();
const root='/workspace/kamen-v5-results',dir=path.join(root,'completion-matrix-release-14c9343');
const digest=b=>crypto.createHash('sha256').update(b).digest('hex');
const verify=a=>{const {evidenceId,...payload}=a;assert.equal(digest(J.canonicalJSON(payload)),evidenceId,'Final evidence SHA mismatch');};
const result=JSON.parse(fs.readFileSync(path.join(dir,'results.json'))),rows=result.rows;
const cases=[];let units=0,decodedFrames=0;
for(const current of rows.filter(r=>r.variant==='v3')){
 const baseline=rows.find(r=>r.variant==='baseline'&&r.fixture.id===current.fixture.id);assert(baseline);
 assert.deepEqual(current.fixture,baseline.fixture);assert.deepEqual(current.input,baseline.input,'Comparison input mismatch');
 for(const k of ['pcmHash','lyricsHash','imageHash'])assert.equal(current.sourceInvariant[k],baseline.sourceInvariant[k]);
 const a=current.provenance.finalArtifactVerification;verify(a);
 assert.equal(a.binding.videoSHA256,current.sha256);assert.equal(digest(fs.readFileSync(path.join(dir,current.fixture.id+'-v3.mp4'))),current.sha256);
 const ref=JSON.parse(fs.readFileSync(path.join(dir,current.referenceInputs.file)));assert.equal(a.binding.planHash,ref.planHash);assert.equal(a.binding.inputHash,ref.inputSnapshot.inputHash);
 assert.equal(a.status,'MEASURED');assert(current.validation.certification.passed);assert.equal(a.binding.outputProfile.fps,current.fixture.fps);
 units+=a.units.length;decodedFrames+=a.frames.length;
 const baselineFiles=fs.readdirSync(path.join(root,'baseline-final-reobservation-7fad8cb')).filter(f=>f.startsWith(current.fixture.id+'-baseline-final-reobserved-')&&f.endsWith('.json'));
 assert.equal(baselineFiles.length,1);const before=JSON.parse(fs.readFileSync(path.join(root,'baseline-final-reobservation-7fad8cb',baselineFiles[0]))).artifact;verify(before);assert.equal(before.binding.videoSHA256,baseline.sha256);
 cases.push({fixture:current.fixture,comparable:true,input:current.input,baseline:{videoSHA256:baseline.sha256,sourceCommit:before.binding.sourceCommit,lyricVerification:before.status,failedUnits:before.units.filter(u=>u.status==='FAILED'),rawMetrics:baseline.decoded.metrics},v5:{videoSHA256:current.sha256,sourceCommit:a.binding.sourceCommit,rendererVersion:a.binding.rendererVersion,planHash:a.binding.planHash,inputHash:a.binding.inputHash,selectedCandidateId:a.binding.selectedCandidateId,evidenceId:a.evidenceId,outputProfile:a.binding.outputProfile,lyricVerification:a.status,units:a.units,rawMetrics:current.decoded.metrics,manualSettingsUnchanged:current.sourceInvariant.manualSettingsUnchanged},improvement:before.status==='FAILED'&&a.status==='MEASURED'?'ACTUAL_PRIMARY_LYRIC_ABSENCE_REPAIRED':'NO_IMPROVEMENT_CLAIM_FROM_EQUAL_OR_UNCALIBRATED_SCORES'});
}
const summary={releaseHead:'14c93432803984edbb4c8a3591d733d9b32380d7',runtimeEquivalence:'release-runtime-equivalence-14c9343.json',status:cases.length===13?'COMPARISON_COMPLETE':'IN_PROGRESS',pairs:cases.length,requiredPairs:13,fullyDecodedMP4s:rows.filter(r=>r.status==='PASS').length,finalLyricUnitsMeasured:units,actualDecodedLyricFrames:decodedFrames,independentActualImprovements:cases.filter(c=>c.improvement==='ACTUAL_PRIMARY_LYRIC_ABSENCE_REPAIRED').map(c=>c.fixture.id),rawScoresUnchanged:true,humanStatus:'HUMAN_UNVERIFIED',artistic100Established:false,limits:'Input/rendering contracts are not OCR. Registered actual glyph contrast is not human reading accuracy. Missing or uncalibrated creativity scores remain unmeasured; equal scores are not improvement.',cases};
fs.writeFileSync(path.join(root,'release-comparison-summary.json'),JSON.stringify(summary,null,2));
console.log(JSON.stringify({status:summary.status,pairs:summary.pairs,fullDecodes:summary.fullyDecodedMP4s,units,decodedFrames,improvements:summary.independentActualImprovements}));
