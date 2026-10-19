'use strict';
// Re-evaluate immutable decoded observations; never re-label the movie source.
const fs=require('node:fs'),path=require('node:path'),z=require('node:zlib'),cp=require('node:child_process'),vm=require('node:vm'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const repo=process.argv[2],root=path.join(__dirname,'../composition-recovery/release-recovery-20261019'),from='5eb02e6fba86c2104711894dc894b461d2fae922',to=cp.execFileSync('git',['-C',repo,'rev-parse','HEAD']).toString().trim(),file='src/11zzzzzzzzzaa_final_artifact_v5.js';
const hash=x=>crypto.createHash('sha256').update(x).digest('hex');
function evaluator(rev){const code=cp.execFileSync('git',['-C',repo,'show',rev+':'+file]).toString(),a=code.indexOf('Q.measureFinalOperatorIntent='),b=code.indexOf('Q.finalMotionObservation=',a);assert(a>=0&&b>a);return {run:vm.runInNewContext('const Q={},F=Number.isFinite;'+code.slice(a,b)+';Q.measureFinalOperatorIntent'),codeSHA256:hash(code)};}
const before=evaluator(from),after=evaluator(to),rows=[];
for(const name of fs.readdirSync(path.join(root,'current31-results')).sort()){
 const p=path.join(root,'current31-results',name,'matrix',name+'-v3-row.json.gz');if(!fs.existsSync(p))continue;const data=fs.readFileSync(p),r=JSON.parse(z.gunzipSync(data)),fav=r.provenance.finalArtifactVerification;assert.equal(fav.binding.sourceCommit,from);
 for(const m of fav.motionObservations.filter(m=>m.operator==='hold'&&m.naturalSelection)){
  const frames=fav.frames.filter(f=>f.unitId===m.unitId&&f.actualDecodedTimestamp>=m.fragmentRange[0]&&f.actualDecodedTimestamp<m.fragmentRange[1]),old=before.run(m,frames),current=after.run(m,frames);
  assert.deepEqual(JSON.parse(JSON.stringify(old)),m.intentObservation,'ORIGINAL_OBSERVATION_REPLAY_MISMATCH');assert.notEqual(current.passed,true);
  rows.push({caseId:name,unitId:m.unitId,fragmentIndex:m.fragmentIndex,fragmentRange:m.fragmentRange,selectionOrigin:m.selectionOrigin,videoSHA256:fav.binding.videoSHA256,artifactSource:from,evaluatorSource:to,rawRowSHA256:hash(data),before:old,after:current});
 }
}
const report={artifactSource:from,evaluatorSource:to,beforeCodeSHA256:before.codeSHA256,afterCodeSHA256:after.codeSHA256,conditions:fs.readdirSync(path.join(root,'current31-results')).length,holdObservations:rows.length,withdrawnPositiveObservations:rows.filter(r=>r.before.passed===true),rows,releaseCredit:false,scope:'Actual immutable Native/coded glyph observations replayed through both source-bound observer functions. This corrects metadata only; no new-source movie or artistic failure is inferred.'};fs.writeFileSync(path.join(root,'hold-observer-remeasurement.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({targets:rows.length,withdrawn:report.withdrawnPositiveObservations.map(x=>[x.caseId,x.fragmentIndex,x.after.status])}));
