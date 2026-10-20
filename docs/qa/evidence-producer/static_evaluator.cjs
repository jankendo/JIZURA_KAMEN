'use strict';
// Replay an existing real-film negative fixture through unchanged v3 gates.
// Only this deliberately invalid single-Intent population is evaluated.
const fs=require('node:fs'),path=require('node:path');
const {assemble}=require('./producer.cjs'),{evaluate,sha}=require('../../../dev/release_gates.cjs');
const {evidenceReader}=require('../../../dev/pages_release.cjs');
const [root,output,measurements]=process.argv.slice(2);
const base='docs/qa/generalization/composition-recovery/release-recovery-20261019/static-world-raster-counterexample';
const mappings=new Map();
function scan(v){if(!v||typeof v!=='object')return;if(typeof v.path==='string'&&v.sha256)mappings.set(v.path+'\0'+v.sha256,{originalPath:v.path,sha256:v.sha256,safePath:path.posix.normalize(base+'/'+v.path)});for(const child of Object.values(v))scan(child);}
for(const name of fs.readdirSync(path.join(root,base)))if(name.endsWith('.json'))scan(JSON.parse(fs.readFileSync(path.join(root,base,name))));
const {normalized,index}=assemble({root,output,manifest:base+'/v3-complete-raster-contract-NOT-A-RELEASE-MANIFEST.json',mappings:[...mappings.values()],provenance:{repository:'jankendo/JIZURA_KAMEN',commit:'bd38de83ecff998c3a45821a6e01da233f106ad3'}});
if(index.errors.length)throw Error('Incomplete static fixture graph: '+index.errors.length);
const reader=evidenceReader(output);reader.walk(normalized);reader.walk({path:'provenance.json',sha256:sha(fs.readFileSync(path.join(output,'provenance.json')))});
const operators=reader.read(normalized.evidence.operators),raw=reader.read(operators.observations[0].measurement);
function write(value,name){const b=Buffer.from(JSON.stringify(value));fs.writeFileSync(path.join(output,name),b);return {path:name,sha256:sha(b)};}
function check(name,change,expected){
 const ops=structuredClone(operators),m=structuredClone(normalized),r=structuredClone(raw);
 change(r,ops,m);if(!name.includes('hash-tamper')){ops.observations[0].measurement=write(r,name+'-measurement.json');m.evidence.operators=write(ops,name+'-operators.json');}
 const result=evaluate(m,output);const item=result.checks.quality.find(c=>c.name==='important semantic operators');
 if(item.state!==expected)throw Error(name+': '+JSON.stringify(item));return {scenario:name,...item};
}
const checks=[
 check('retained-centered-shrinking',()=>{},'FAIL'),
 check('actual-ffmpeg-centered-shrinking',r=>{r.decodedFrames=JSON.parse(fs.readFileSync(path.join(measurements,'static-original-ffmpeg-measurement.json'))).decodedFrames;},'FAIL'),
 check('missing-full-raster',r=>{for(const f of r.decodedFrames)for(const g of f.glyphs)delete g.decodedRaster;},'UNVERIFIED'),
 check('source-mismatch',r=>{r.sourceCommit='0'.repeat(40);},'UNVERIFIED'),
 check('plan-mismatch',r=>{r.binding.planHash='0'.repeat(64);},'UNVERIFIED'),
 check('hash-tamper',(_,__,m)=>{m.evidence.operators.sha256='0'.repeat(64);},'UNVERIFIED')
];
const result={schema:1,checks,assemblyStats:index.stats,formalPositiveStaticIntentProven:false,newMP4s:0,scope:'Real negative counterexample plus actual decoded pixels; no population-wide or release PASS'};
fs.writeFileSync(path.join(measurements,'static-evaluator-results.json'),JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
