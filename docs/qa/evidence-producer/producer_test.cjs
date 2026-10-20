'use strict';
// Data graph fixtures, not real-film or formal release certification.
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),zlib=require('node:zlib');
const {sha}=require('../../../dev/release_gates.cjs');
const {evidenceReader}=require('../../../dev/pages_release.cjs');
const {assemble,produce}=require('./producer.cjs');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'kamen-producer-')),target='a'.repeat(40);
let checks=0,seq=0;
function setup(){const root=path.join(tmp,'input-'+seq++);fs.mkdirSync(root);return {root,output:path.join(tmp,'output-'+seq++),manifest:'input.json',provenance:{repository:'fixture/synthetic',commit:target}};}
function put(o,name,value,bytes){const b=bytes||Buffer.from(JSON.stringify(value));fs.writeFileSync(path.join(o.root,name),b);return {path:name,sha256:sha(b)};}
function run(fn){fn();checks++;}
function bad(mut,pattern){run(()=>{const o=setup();const r=put(o,'evidence.json',{sourceCommit:target});mut(o,r);put(o,'input.json',{releaseSourceCommit:target,e:r});const a=assemble(o);assert(a.index.errors.some(e=>pattern.test(e.reason)));assert(!fs.existsSync(path.join(o.output,'manifest.json')));});}
try {
 run(()=>{const o=setup(),r=put(o,'leaf.json',{sourceCommit:target,status:'UNMEASURED'});put(o,'input.json',{releaseSourceCommit:target,a:r,b:r});const a=assemble(o);assert.equal(a.index.errors.length,0);assert.deepEqual(a.normalized.a,a.normalized.b);assert.equal(a.index.stats.uniqueInputFiles,1);assert.equal(a.index.stats.reusedReferences,1);const reader=evidenceReader(o.output);reader.walk(a.normalized);assert.equal(reader.read(a.normalized.a).status,'UNMEASURED');const archive=reader.read(a.index.origins[0].rawEvidence);assert.equal(Buffer.from(archive.bytes,'base64').toString(),fs.readFileSync(path.join(o.root,'leaf.json')).toString());assert.equal(archive.originalSHA256,r.sha256);});
 bad((o,r)=>r.sha256='0'.repeat(64),/hash mismatch/);
 bad((o,r)=>r.path='../evidence.json',/Invalid evidence path/);
 bad((o,r)=>r.path=path.join(o.root,r.path),/Invalid evidence path/);
 bad((o,r)=>r.path='x\\evidence.json',/Invalid evidence path/);
 bad((o,r)=>r.path='x\0evidence.json',/Invalid evidence path/);
 bad((o,r)=>{fs.symlinkSync('evidence.json',path.join(o.root,'link.json'));r.path='link.json';},/symlink/);
 bad((o,r)=>{fs.mkdirSync(path.join(o.root,'dir'));fs.symlinkSync('dir',path.join(o.root,'linked'));r.path='linked/evidence.json';},/symlink/);
 bad((o,r)=>r.path='absent.json',/ENOENT/);
 bad((o,r)=>{r.path='folder';fs.mkdirSync(path.join(o.root,r.path));},/regular file/);
 bad((o,r)=>r.type='video/mp4',/type mismatch/);
 bad((o,r)=>{const b=Buffer.from('not JSON');fs.writeFileSync(path.join(o.root,r.path),b);r.sha256=sha(b);},/JSON|Unexpected/);
 run(()=>{const o=setup(),r=put(o,'nested.mp4',{bad:{path:'../escape',sha256:'b'.repeat(64)}});put(o,'input.json',{r});assert.match(assemble(o).index.errors[0].reason,/Invalid evidence path/);});
 run(()=>{const o=setup(),r=put(o,'gzip.mp4',null,zlib.gzipSync(JSON.stringify({sourceCommit:target})));put(o,'input.json',{r});const a=assemble(o);assert.equal(a.index.errors.length,0);assert.equal(evidenceReader(o.output).read(a.normalized.r).sourceCommit,target);});
 run(()=>{const o=setup(),r=put(o,'gzip.bin',null,zlib.gzipSync(JSON.stringify({r:{path:'../x',sha256:'b'.repeat(64)}})));put(o,'input.json',{r});assert(assemble(o).index.errors.length);});
 run(()=>{const o=setup(),r=put(o,'leaf.json',{sourceCommit:target});o.mappings=[{originalPath:'../legacy.json',sha256:r.sha256,safePath:'leaf.json'}];put(o,'input.json',{r:{...r,path:'../legacy.json'}});const a=assemble(o);assert.equal(a.index.errors.length,0);assert.equal(a.index.origins[0].originalPath,'../legacy.json');evidenceReader(o.output).walk(a.normalized);});
 run(()=>{const o=setup(),r=put(o,'leaf.json',{});o.mappings=[{originalPath:'x',sha256:r.sha256,safePath:'../leaf.json'}];put(o,'input.json',{r:{...r,path:'x'}});assert(assemble(o).index.errors.length);});
 run(()=>{const o=setup(),r=put(o,'leaf.json',{});const mapping={originalPath:'x',sha256:r.sha256,safePath:'leaf.json'};o.mappings=[mapping,mapping];put(o,'input.json',{});assert.throws(()=>assemble(o),/Duplicate relocation/);});
 run(()=>{const o=setup(),r=put(o,'leaf.json',{sourceCommit:'c'.repeat(40)});put(o,'input.json',{releaseSourceCommit:target,r});const a=produce({...o,target,repositoryRoot:path.resolve(__dirname,'../../..')});assert.equal(a.qualified,false);assert(!fs.existsSync(path.join(o.output,'manifest.json')));const raw=JSON.parse(fs.readFileSync(path.join(o.output,'diagnostic-manifest.json')));assert.equal(evidenceReader(o.output).read(raw.r).sourceCommit,'c'.repeat(40));});
 run(()=>{const o=setup();put(o,'input.json',{releaseSourceCommit:'d'.repeat(40)});const r=produce({...o,target,repositoryRoot:path.resolve(__dirname,'../../..')});assert.equal(r.qualified,false);assert.match(r.reason,/source differs/);});
 run(()=>{const o=setup();put(o,'input.json',{});const r=produce({...o,target,repositoryRoot:path.resolve(__dirname,'../../..')});assert.equal(r.artifactName,'kamen-evidence-diagnostic');assert(!fs.existsSync(path.join(o.output,'manifest.json')));});
 run(()=>{const o=setup();put(o,'input.json',{});o.output=path.join(o.root,'out');assert.throws(()=>assemble(o),/separate/);});
 run(()=>{const o=setup();put(o,'input.json',{});fs.mkdirSync(o.output);assert.throws(()=>assemble(o),/must not exist/);});
 run(()=>{const o=setup();put(o,'input.json',{});o.provenance.commit='main';assert.throws(()=>assemble(o),/Immutable/);});
 run(()=>{const o=setup(),r=put(o,'leaf.json',{});r.extra={path:'../hidden',sha256:'b'.repeat(64)};put(o,'input.json',{r});assert(assemble(o).index.errors.length);});
 run(()=>{const o=setup(),r=put(o,'leaf.json',{});put(o,'input.json',{r});const a=assemble(o),reader=evidenceReader(o.output),ref={path:'provenance.json',sha256:sha(fs.readFileSync(path.join(o.output,'provenance.json')))};reader.walk(ref);const archive=a.index.originalManifest.rawEvidence;fs.appendFileSync(path.join(o.output,archive.path),'tampered');assert.throws(()=>evidenceReader(o.output).walk(ref),/hash mismatch/);});
 console.log(JSON.stringify({suite:'producer data graph',checks,pass:checks,formalQualityClaim:false}));
} finally {fs.rmSync(tmp,{recursive:true,force:true});}
