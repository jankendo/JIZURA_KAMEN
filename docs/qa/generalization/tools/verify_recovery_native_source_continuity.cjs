'use strict';
// Reuse the exact adopted-plan observer. Original artifact bindings stay intact;
// only the observed renderer build is explicitly selected for source comparison.
const fs=require('node:fs'),path=require('node:path'),zlib=require('node:zlib'),Module=require('node:module'),assert=require('node:assert/strict');
const expected=process.env.KAMEN_EXPECTED_CURRENT_SOURCE;assert(/^[a-f0-9]{40}$/.test(expected||''));
const cp=require('node:child_process'),repo=process.env.KAMEN_CURRENT_REPOSITORY||'/workspace/kamen-final-source',from='5eb02e6fba86c2104711894dc894b461d2fae922',git=(...a)=>cp.execFileSync('git',['-C',repo,...a],{maxBuffer:32*1024*1024}).toString();
assert.equal(git('rev-parse','HEAD').trim(),expected);
const changed=git('diff','--name-only',from,expected,'--','src').trim().split('\n');assert.deepEqual(changed,['src/11zzzzzzzzzaa_final_artifact_v5.js']);
const stripMeasure=x=>{const a=x.indexOf('Q.measureFinalOperatorIntent='),b=x.indexOf('Q.finalMotionObservation=',a);assert(a>=0&&b>a);return x.slice(0,a)+x.slice(b);};
assert.equal(stripMeasure(git('show',from+':'+changed[0])),stripMeasure(git('show',expected+':'+changed[0])),'NON_OBSERVATION_RUNTIME_CHANGE');
const beforeTree='3afc3c4084435b0abc5a311a6ebfb6f8316eccf76b9ec4160f3f6c252c8de8a1',afterTree='8c9dee4d995bcf0e0802b9fa07e429b39a083daf9a018280751bd285d197109b';
const {restoreMeasuredCompositionCache}=require('./dev09_composition_replay_state.cjs');
const oldGuard="binding.sourceCommit !== build.sourceCommit || binding.sourceTreeSHA256 !== build.sourceTreeSHA256 || binding.rendererVersion !== build.sourceTreeSHA256";
const guard="binding.sourceCommit !== "+JSON.stringify(from)+" || binding.sourceTreeSHA256 !== "+JSON.stringify(beforeTree)+" || binding.rendererVersion !== "+JSON.stringify(beforeTree)+" || build.sourceCommit !== "+JSON.stringify(expected)+" || build.sourceTreeSHA256 !== "+JSON.stringify(afterTree);
assert(restoreMeasuredCompositionCache.toString().includes(oldGuard));
const qaCacheReplay=Function('return ('+restoreMeasuredCompositionCache.toString().replace(oldGuard,guard)+')')();
const file=path.join(__dirname,'native_dispatch_lineage_trace_v7.cjs');let code=fs.readFileSync(file,'utf8');
function replaceOnce(a,b){assert.equal(code.split(a).length,2,'OBSERVER_ANCHOR_CHANGED');code=code.replace(a,b);}
replaceOnce("require('./read_adopted_matrix_row.cjs').readAdoptedMatrixRow(input,caseId,variant)","JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync(path.join(input,caseId+'-'+variant+'-row.json.gz'))))");
replaceOnce("const bytes=fs.readFileSync(path.join(input,row.referenceInputs.file));","assert.equal(row.fixture.id,caseId);assert.equal(row.variant,variant);assert.equal(row.status,'PASS');const bytes=require('node:zlib').gunzipSync(fs.readFileSync(path.join(input,row.referenceInputs.file+'.gz')));");
replaceOnce("build?.sourceCommit!==binding.sourceCommit||build?.sourceTreeSHA256!==binding.sourceTreeSHA256", "build?.sourceCommit!=="+JSON.stringify(expected));
replaceOnce("const report={schema:7,", "assert.equal(result.build.sourceCommit,"+JSON.stringify(expected)+");const report={schema:7,observedSourceCommit:"+JSON.stringify(expected)+",sourceComparisonScope:'Frozen adopted plans only; original movie source labels preserved; no planning or new encoding equivalence inferred.',");
replaceOnce("console.log(JSON.stringify({caseId,nativeFrames:","assert.equal(exactNativeRGBA,true,'FROZEN_NATIVE_SOURCE_CONTINUITY_MISMATCH');console.log(JSON.stringify({caseId,nativeFrames:");
replaceOnce('restoreMeasuredCompositionCache.toString()', 'qaCacheReplay.toString()');
code='const qaCacheReplay='+qaCacheReplay.toString()+';\n'+code;
const probe=new Module(file,module);probe.filename=file;probe.paths=Module._nodeModulePaths(__dirname);probe._compile(code,file);
