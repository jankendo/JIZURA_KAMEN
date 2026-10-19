'use strict';
// Evidence adapter contract: normalized JSON observations are hash-bound files,
// never status strings. This verifies consistency, not authenticity of a runner.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const HASH=/^[a-f0-9]{64}$/, COMMIT=/^[a-f0-9]{40}$/;
// Build.mjs reads these shipped inputs. This exact QA allowlist must never
// expand implicitly to arbitrary dev/ scripts or runtime paths.
const QA_PATHS=['dev/pages_e2e.cjs','dev/export_watchdog.cjs','dev/export_watchdog_test.cjs','dev/release_gates.cjs','dev/release_gates_test.cjs'];
const QA_PREFIXES=['.github/workflows/','docs/qa/'];
const SHIPPING_PATHS=['src','scripts','app','assets','vendor','package.json','package-lock.json'];
const qaPath=p=>QA_PATHS.includes(p)||p.startsWith('docs/qa/');
// v2 keeps the v1 dynamic certificate contract, and adds target-specific static
// and composite contracts. Inventory/whole-hook pixel differences never suffice.
function typedImportantOperators(o,load,media){
 if(o.importanceClassificationFinalized!==true)return 'v2 importance classification is not finalized';
 const p=load(o.population),ledger=load(p.executionLedger),ids=o.expectedImportantIntentIds;
 const expected=ledger.expectedImportantIntentIds;
 if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length||!Array.isArray(expected)||JSON.stringify([...ids].sort())!==JSON.stringify([...expected].sort()))return 'v2 frozen execution population mismatch';
 if((o.observations||[]).some(a=>ids.includes(a.intentId)&&a.status==='FAILED'))return false;
 if(!Array.isArray(p.intents)||p.intents.length!==ids.length||new Set(p.intents.map(i=>i.intentId)).size!==ids.length||p.intents.some(i=>!ids.includes(i.intentId)))return 'v2 intent contracts missing or duplicated';
 const observations=o.observations||[],ledgerRows=new Map((ledger.rows||[]).map(i=>[i.intentId,i])),visited=new Set();
 const finitePoint=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
 const binding=(a,b)=>['sourceCommit','rendererVersion','inputHash','planHash','videoSHA256'].every(k=>a?.[k]===b?.[k])&&a?.outputProfile&&JSON.stringify(a.outputProfile)===JSON.stringify(b?.outputProfile)&&COMMIT.test(b?.sourceCommit||'')&&['rendererVersion','inputHash','planHash','videoSHA256'].every(k=>HASH.test(b?.[k]||''));
 function movie(ref,b,hash){const m=load(ref);if(!binding({...m.binding,videoSHA256:b.videoSHA256},b)||m.videoSHA256!==hash||m.binding.videoSHA256!==hash||m.decodeComplete!==true||m.decodeExitCode!==0||m.codecVideo!=='h264'||!HASH.test(m.decodedRGBA_SHA256||''))throw Error('v2 decoded movie binding missing');media(m.media,hash);return m;}
 function staticFrames(raw,c,b){
  const f=raw.decodedFrames,glyphs=c.glyphIds;
  if(c.target.layer!=='PRIMARY_LYRIC'||!Array.isArray(glyphs)||!glyphs.length||new Set(glyphs).size!==glyphs.length||!Array.isArray(f)||!Number.isFinite(c.fps)||c.fps<=0||!Number.isFinite(c.from)||!Number.isFinite(c.to)||c.to<=c.from||!Number.isFinite(c.frameOrigin)||!Number.isFinite(c.tolerancePixels)||c.tolerancePixels<0||c.tolerancePixels>1)return 'v2 static contract or glyph population incomplete';
  if(c.frameOrigin!==b.outputProfile.range?.[0]||c.fps!==b.outputProfile.fps||!Array.isArray(b.outputProfile.range)||c.from<b.outputProfile.range[0]||c.to>b.outputProfile.range[1])return 'v2 static interval differs from actual output profile';
  // Match the renderer's actual i/fps predicate. ceil(time*fps) can skip a
  // real boundary frame (e.g. (31/30)*30 rounds above 31).
  const firstAt=time=>{let lo=0,hi=Math.max(0,Math.ceil((c.to-c.frameOrigin)*c.fps)+2);while(lo<hi){const mid=Math.floor((lo+hi)/2);if(c.frameOrigin+mid/c.fps>=time)hi=mid;else lo=mid+1;}return lo;};
  const first=firstAt(c.from),end=firstAt(c.to);
  if(end-first<3||f.length!==end-first)return 'v2 static whole-interval frame population missing';
  const starts=new Map();let moved=false;
  for(let i=0;i<f.length;i++){
   const a=f[i],time=c.frameOrigin+(first+i)/c.fps;
   if(a.frameIndex!==first+i||!Number.isFinite(a.actualDecodedTimestamp)||Math.abs(a.actualDecodedTimestamp-time)>1e-7||a.targetId!==c.target.id||!Array.isArray(a.glyphs)||a.glyphs.length!==glyphs.length)return 'v2 static target or actual clock mismatch';
   if(new Set(a.glyphs.map(g=>g.id)).size!==glyphs.length||glyphs.some(id=>!a.glyphs.some(g=>g.id===id)))return 'v2 static glyph identity missing';
   for(const g of a.glyphs){if(g.pixelPresence===false||g.nativeComplete===false)return false;if(g.pixelPresence!==true||g.nativeComplete!==true||!finitePoint(g.nativeCentroid)||!finitePoint(g.decodedCentroid)||!(g.nativeInkPixels>0)||!(g.decodedInkPixels>0))return 'v2 static registered glyph not measured';if(Math.hypot(...g.decodedCentroid.map((v,k)=>v-g.nativeCentroid[k]))>.5)return false;if(!starts.has(g.id))starts.set(g.id,g.decodedCentroid);if(Math.hypot(...g.decodedCentroid.map((v,k)=>v-starts.get(g.id)[k]))>c.tolerancePixels)moved=true;}
  }
  if(moved)return false;
  const control=load(raw.sensitivityControl);
  const controlMovie=movie(control.movie,b,control.videoSHA256);if(controlMovie.decodedRGBA_SHA256===load(raw.movie).decodedRGBA_SHA256)return 'v2 static sensitivity control has identical decoded pixels';
  if(control.targetId!==c.target.id||control.videoSHA256===b.videoSHA256||!Array.isArray(control.glyphs)||control.glyphs.length!==glyphs.length||new Set(control.glyphs.map(g=>g.id)).size!==glyphs.length)return 'v2 static sensor independent moving-target control missing';
  for(const id of glyphs){const g=control.glyphs.find(g=>g.id===id);if(!g||!finitePoint(g.from)||!finitePoint(g.to)||!Number.isFinite(g.expectedDisplacementPixels)||g.expectedDisplacementPixels<=c.tolerancePixels*2||Math.abs(Math.hypot(...g.to.map((v,k)=>v-g.from[k]))-g.expectedDisplacementPixels)>.5)return 'v2 static sensor failed moving-target sensitivity control';}
  return true;
 }
 function verify(id){
  if(visited.has(id))return 'v2 cyclic composite proof';visited.add(id);
  try{
   const contract=p.intents.find(i=>i.intentId===id),l=ledgerRows.get(id),a=observations.filter(a=>a.intentId===id);
   if(a.some(a=>a.status==='FAILED'))return false;
   if(!contract||!l||l.important!==true||l.naturalSelection!=='NATURAL'||!['DYNAMIC','STATIC','COMPOSITE'].includes(contract.proofType)||!contract.target?.id||!contract.target?.layer||!Number.isFinite(contract.from)||!Number.isFinite(contract.to)||contract.to<=contract.from||!binding(contract.binding,l.binding))return 'v2 selected intent contract binding missing';
   if(contract.proofType==='STATIC'&&l.classification!=='INTENTIONAL_STATIC')return 'v2 dynamic/composite intent cannot borrow a local static contract';
   if(contract.proofType==='COMPOSITE'&&l.classification!=='COMPOSITE_IMPORTANT'||l.classification==='COMPOSITE_IMPORTANT'&&contract.proofType!=='COMPOSITE')return 'v2 composite attribution contract mismatch';
   if(a.length!==1||a[0].status!=='VERIFIED')return 'v2 required intent is not proven';
   const raw=load(a[0].measurement),b=contract.binding;
   if(raw.intentId!==id||raw.proofType!==contract.proofType||raw.contractSHA256!==sha(Buffer.from(JSON.stringify(contract)))||!binding(raw.binding,b)||raw.targetId!==contract.target.id||raw.decodedPixels!==true)return 'v2 raw target/contract/source/video binding mismatch';
   movie(raw.movie,b,b.videoSHA256);
   if(contract.proofType==='STATIC')return staticFrames(raw,contract,b);
   if(contract.proofType==='COMPOSITE'){
    const components=contract.requiredComponentIntentIds;
    if(!Array.isArray(components)||!components.length||new Set(components).size!==components.length||JSON.stringify([...(raw.componentIntentIds||[])].sort())!==JSON.stringify([...components].sort()))return 'v2 independent component proofs missing';
    for(const component of components){const child=p.intents.find(i=>i.intentId===component);if(!child||!binding(child.binding,b))return 'v2 component assembled movie mismatch';const v=verify(component);if(v!==true)return v;}
   }
   // Dynamics and assembled effects retain every v1 control requirement. The
   // typed contract additionally binds repeat, target, interval and actual files.
   if(a[0].counterfactual!==true||raw.isolatedControl!==true||!HASH.test(raw.controlVideoSHA256||'')||!HASH.test(raw.repeatVideoSHA256||'')||!Number.isFinite(raw.actualDecodedTimestamp)||raw.actualDecodedTimestamp!==a[0].actualDecodedTimestamp||raw.actualDecodedTimestamp<contract.from||raw.actualDecodedTimestamp>=contract.to||!Array.isArray(raw.measuredValues)||!raw.measuredValues.length||raw.measuredValues.some(v=>!Number.isFinite(v)))return 'v2 isolated dynamic/assembly control missing';
   if(a[0].videoSHA256!==b.videoSHA256||a[0].controlVideoSHA256!==raw.controlVideoSHA256||a[0].decodedPixels!==true)return 'v2 dynamic observation differs from raw proof';
   const controlMovie=movie(raw.controlMovie,b,raw.controlVideoSHA256);movie(raw.repeatMovie,b,raw.repeatVideoSHA256);if(raw.controlVideoSHA256===b.videoSHA256||controlMovie.decodedRGBA_SHA256===load(raw.movie).decodedRGBA_SHA256)return 'v2 original/control pixels are identical; no dynamic attribution';
   if(raw.independentRepeat!==true||raw.originalNativeIdentity!==true||raw.originalDecodedIdentity!==true||raw.repeatNativeIdentity!==true)return 'v2 repeat/original reproduction unverified';if(raw.targetModelPassed===false)return false;if(raw.targetModelPassed!==true)return 'v2 target semantic model unverified';
   const model=contract.semanticModel,samples=raw.semanticSamples;
   if(model?.units!=='OUTPUT_PIXELS'||!Array.isArray(model.expectedSamples)||model.expectedSamples.length<3||!Array.isArray(samples)||samples.length!==model.expectedSamples.length)return 'v2 preregistered target vector model or actual samples missing';
   let signal=false;const clocks=new Set();
   for(let i=0;i<samples.length;i++){
    const expected=model.expectedSamples[i],sample=samples[i],t=expected.actualDecodedTimestamp;
    if(!Number.isFinite(t)||t<contract.from||t>=contract.to||clocks.has(t)||sample.actualDecodedTimestamp!==t||sample.targetId!==contract.target.id||!finitePoint(expected.vector)||!finitePoint(sample.nativeExpectedVector)||!finitePoint(sample.observedVector)||!finitePoint(sample.repeatVector))return 'v2 target-model frame/target/vector mismatch';clocks.add(t);
    const amount=Math.hypot(...expected.vector),tolerance=Math.max(.5,amount*.1);signal||=amount>=.5;
    if(Math.hypot(...sample.nativeExpectedVector.map((v,k)=>v-expected.vector[k]))>tolerance||Math.hypot(...sample.observedVector.map((v,k)=>v-expected.vector[k]))>tolerance||Math.hypot(...sample.observedVector.map((v,k)=>v-sample.repeatVector[k]))>tolerance)return false;
   }
   if(!signal)return 'v2 dynamic semantic model has no resolved expected effect';
   return true;
  }finally{visited.delete(id);}
 }
 for(const id of ids){const r=verify(id);if(r!==true)return r;}return true;
}
function evaluate(manifest,root=process.cwd()) {
 const issues=[], checks={technical:[],quality:[]}, commit=manifest.releaseSourceCommit;
 const record=(domain,name,state,reason)=>{checks[domain].push({name,state,reason});if(state!=='PASS')issues.push({domain,name,state,reason});};
 const read=(ref)=>{if(!ref||typeof ref.path!=='string'||!HASH.test(ref.sha256||''))throw Error('missing path/SHA-256');const buf=fs.readFileSync(path.resolve(root,ref.path));if(sha(buf)!==ref.sha256)throw Error('evidence hash mismatch');return JSON.parse(buf[0]===31&&buf[1]===139?require('node:zlib').gunzipSync(buf):buf);};
 const corresponded=new Set();
 function correspondence(from){
  if(from===commit)return true;if(corresponded.has(from))return true;
  const refs=manifest.sourceCorrespondence||[],found=refs.map(read).filter(x=>x.fromCommit===from&&x.toCommit===commit);
  if(found.length!==1)throw Error('missing unique source correspondence');const c=found[0];
  if(c.sourceCommit!==commit||!COMMIT.test(from)||!manifest.gitRepository)throw Error('invalid source correspondence binding');
  const run=require('node:child_process').execFileSync,repo=path.resolve(root,manifest.gitRepository);
  const diff=run('git',['-C',repo,'diff','--no-ext-diff','--no-renames','--binary',from,commit,'--'],{maxBuffer:32*1024*1024});
  const paths=run('git',['-C',repo,'diff','--no-ext-diff','--no-renames','--name-only','-z',from,commit,'--']).toString().split('\0').filter(Boolean).sort();
  if(sha(diff)!==c.gitDiffSHA256||JSON.stringify(paths)!==JSON.stringify([...(c.changedPaths||[])].sort()))throw Error('actual Git diff/path correspondence mismatch');
  const assessment=read(c.runtimeAssessment);
  if(assessment.sourceCommit!==commit||assessment.fromCommit!==from||assessment.toCommit!==commit||assessment.gitDiffSHA256!==c.gitDiffSHA256||!Array.isArray(assessment.paths)||assessment.paths.length!==paths.length)throw Error('runtime assessment binding missing');
  for(const p of paths){const a=assessment.paths.filter(x=>x.path===p);if(a.length!==1||!['CI_ONLY','QA_ONLY','TELEMETRY_ONLY'].includes(a[0].classification)||typeof a[0].reason!=='string'||!a[0].reason.trim()||!HASH.test(a[0].diffHunkSHA256||''))throw Error('runtime-impact assessment incomplete');const d=run('git',['-C',repo,'diff','--no-ext-diff','--no-renames','--binary',from,commit,'--',p]);if(sha(d)!==a[0].diffHunkSHA256)throw Error('per-path diff mismatch');if(a[0].classification==='CI_ONLY'&&!p.startsWith('.github/workflows/'))throw Error('non-workflow path claimed CI-only');if(a[0].classification==='QA_ONLY'&&!qaPath(p))throw Error('path outside exact QA-only allowlist');}
  if(assessment.paths.some(p=>p.classification==='QA_ONLY')&&assessment.paths.every(p=>['CI_ONLY','QA_ONLY'].includes(p.classification))){
   // QA-only changes may reuse observations only when every other Git input,
   // including build scripts, dependencies, fonts and all renderer sources, is
   // byte-identical. Original observation sourceCommit remains unchanged.
   const proof=read(c.runtimeTreeProof),tree=(rev)=>{
    const rows=run('git',['-C',repo,'ls-tree','-r','-z',rev]).toString().split('\0').filter(Boolean).filter(line=>{const p=line.split('\t')[1];return !QA_PATHS.includes(p)&&!QA_PREFIXES.some(prefix=>p.startsWith(prefix));});
    return sha(Buffer.from(rows.join('\0')));
   };
   const before=tree(from),after=tree(commit);
   if(proof.sourceCommit!==commit||proof.fromCommit!==from||proof.toCommit!==commit||before!==after||proof.beforeRuntimeTreeSHA256!==before||proof.afterRuntimeTreeSHA256!==after||JSON.stringify(proof.excludedPrefixes)!==JSON.stringify(QA_PREFIXES)||JSON.stringify(proof.excludedExactPaths)!==JSON.stringify(QA_PATHS))throw Error('QA-only shipped tree proof mismatch');
   if(!Array.isArray(proof.shippingInputs)||proof.shippingInputs.length!==SHIPPING_PATHS.length)throw Error('QA-only shipped input proof missing');
   for(const p of SHIPPING_PATHS){
    const rows=proof.shippingInputs.filter(x=>x.path===p),beforeObject=run('git',['-C',repo,'rev-parse',from+':'+p]).toString().trim(),afterObject=run('git',['-C',repo,'rev-parse',commit+':'+p]).toString().trim();
    if(rows.length!==1||beforeObject!==afterObject||rows[0].beforeGitObject!==beforeObject||rows[0].afterGitObject!==afterObject)throw Error('QA-only shipped input differs');
   }
   corresponded.add(from);return true;
  }
  if(assessment.paths.every(p=>p.classification==='CI_ONLY')&&c.runtimeTreeProof){
   // A CI-only Git diff proves all shipped inputs identical. Native replay is
   // unnecessary here; telemetry changes still require actual Native proof.
   const proof=read(c.runtimeTreeProof),tree=(rev)=>{const rows=run('git',['-C',repo,'ls-tree','-r','-z',rev]).toString().split('\0').filter(Boolean).filter(line=>!line.split('\t')[1].startsWith('.github/workflows/'));return sha(Buffer.from(rows.join('\0')));};
   const before=tree(from),after=tree(commit);
   if(proof.sourceCommit!==commit||proof.fromCommit!==from||proof.toCommit!==commit||before!==after||proof.beforeRuntimeTreeSHA256!==before||proof.afterRuntimeTreeSHA256!==after||JSON.stringify(proof.excludedPrefixes)!==JSON.stringify(['.github/workflows/']))throw Error('CI-only shipped tree proof mismatch');
   corresponded.add(from);return true;
  }
  const native=read(c.nativeComparison);
  if(native.sourceCommit!==commit||native.fromCommit!==from||native.toCommit!==commit||native.actualNativeFrames!==true||native.completeOutputFramePopulation!==true||!Array.isArray(native.frames)||!native.frames.length||native.expectedFrameCount!==native.frames.length||new Set(native.frames.map(f=>f.frameIndex)).size!==native.frames.length)throw Error('native source-equivalence population missing');
  if(!HASH.test(native.inputHash||'')||!native.outputProfile||!native.rendererVersion)throw Error('native source-equivalence conditions missing');
  for(let i=0;i<native.frames.length;i++){const f=native.frames[i];if(f.frameIndex!==i||!HASH.test(f.beforeRGBA_SHA256||'')||f.beforeRGBA_SHA256!==f.afterRGBA_SHA256)throw Error('native source-equivalence pixels differ');}
  corresponded.add(from);return true;
 }
 const load=(ref,expectedCommit=commit)=>{const obj=read(ref);if(obj.sourceCommit!==expectedCommit){if(expectedCommit!==commit||!COMMIT.test(obj.sourceCommit||''))throw Error('stale or missing sourceCommit');correspondence(obj.sourceCommit);}return obj;};
 function check(domain,name,ref,fn){try{const o=load(ref);const r=fn(o);record(domain,name,r===true?'PASS':r===false?'FAIL':'UNVERIFIED',r===true?'hash-bound observations satisfy contract':r===false?'observed required check failed':String(r));}catch(e){record(domain,name,'UNVERIFIED',e.message);}}
 if(!COMMIT.test(commit||'')){return {schema:2,evaluatorVersion:'release-gates-v2',releaseSourceCommit:commit||null,TECHNICAL_GO:'UNVERIFIED',QUALITY_GO:'UNVERIFIED',RELEASE_GO:'UNVERIFIED',ARTISTIC_100_VERIFICATION:'UNVERIFIED',issues:[{reason:'exact 40-character releaseSourceCommit required'}]};}
 const e=manifest.evidence||{};
 check('technical','ci',e.ci,o=>o.headSha!==commit?'CI head does not match release source':o.conclusion==='failure'?false:o.conclusion==='success'&&/^https:\/\/github\.com\//.test(o.url||'')?true:'CI not completed successfully');
 check('technical','regression/build',e.tests,o=>{if(!Array.isArray(o.cases)||!o.cases.length)return 'per-test observations absent';if(o.cases.some(x=>x.status==='FAIL')||o.build?.exitCode>0||o.install?.exitCode>0)return false;if(o.install?.exitCode!==0||o.build?.exitCode!==0||!HASH.test(o.build?.outputSHA256||''))return 'install/build observation missing';const ids=new Set();for(const t of o.cases){if(!t.id||ids.has(t.id))return 'missing/duplicate test ID';ids.add(t.id);if(t.status==='SKIP'){if(!t.reason||!t.browserAlternative)return 'SKIP has no reason/alternative evidence';const a=load(t.browserAlternative);if(a.testId!==t.id||a.actualBrowser!==true||a.exitCode!==0)return 'SKIP browser alternative unverified';}else if(t.status!=='PASS'||t.exitCode!==0)return 'test exit observations incomplete';}return true;});
 check('technical','browser',e.browser,o=>{const required=['generation','oneClickExport','save','restore','cancel','retry','rejectInvalidMP4'];if(o.actualBrowser!==true||!Array.isArray(o.operations))return 'actual browser observations absent';for(const id of required){const a=o.operations.filter(x=>x.id===id);if(a.some(x=>x.completed===false||x.error))return false;if(a.length!==1||a[0].completed!==true||!HASH.test(a[0].traceSHA256||''))return `missing unique trace-bound operation: ${id}`;}return true;});
 check('technical','finished artifacts',e.artifacts,o=>{if(!Array.isArray(o.movies)||!o.movies.length)return 'movie observations absent';const seen=new Set();for(const m of o.movies){if(!m.id||seen.has(m.id))return 'duplicate/missing movie ID';seen.add(m.id);if(m.decodeExitCode>0||m.hashMatches===false||m.hasVideo===false||m.hasAudio===false)return false;if(m.decodeExitCode!==0||m.codecVideo!=='h264'||m.codecAudio!=='aac'||m.decodeComplete!==true||m.hashMatches!==true||!HASH.test(m.videoSHA256||'')||!HASH.test(m.inputHash||'')||!HASH.test(m.planHash||'')||!m.outputProfile||!m.rendererVersion||!m.selectedCandidateId)return 'incomplete decode/provenance observations';const raw=load(m.observation);if(raw.videoSHA256!==m.videoSHA256||raw.decodeExitCode!==0||raw.decodeComplete!==true)return 'raw decode record mismatch';}return true;});
 check('quality','comparison coverage',e.comparisons,o=>{if([...(Array.isArray(o.conditions)?o.conditions:[]),...(Array.isArray(o.independent)?o.independent:[])].some(c=>c.significantRegression===true||c.lyricSafetyFailed===true))return false;if(!Array.isArray(o.conditions)||!Array.isArray(o.expectedConditionIds)||o.expectedConditionIds.length!==30||new Set(o.expectedConditionIds).size!==30)return 'frozen 30-condition population missing';const ids=o.conditions.map(x=>x.id);if(new Set(ids).size!==ids.length||o.expectedConditionIds.some(id=>!ids.includes(id)))return 'missing/duplicate comparison condition';if(!Array.isArray(o.independent)||!o.independent.length)return 'independent conditions absent';for(const c of [...o.conditions,...o.independent]){if(c.significantRegression===true||c.lyricSafetyFailed===true)return false;if(c.significantRegression!==false||c.lyricSafetyFailed!==false)return 'regression/safety result not measured';if(c.sameInput!==true||c.sameSeed!==true||c.sameProfile!==true||c.shippedPipelines!==true||c.actualDecodedComparison!==true||!Array.isArray(c.movies)||c.movies.length<3)return 'comparison conditions or three versions unverified';if(new Set(c.movies.map(r=>r.expectedSourceCommit)).size<3||!c.movies.some(r=>r.expectedSourceCommit===commit||r.releaseEquivalent===true&&correspondence(r.expectedSourceCommit)))return 'three distinct source versions including release required';for(const r of c.movies){if(!COMMIT.test(r.expectedSourceCommit||''))return 'comparison source commit missing';const raw=load(r,r.expectedSourceCommit);if(!HASH.test(raw.videoSHA256||'')||raw.decodeComplete!==true||raw.decodeExitCode!==0)return 'comparison movie decode missing';}}if(!o.independent.some(x=>x.unusedBeforeFreeze===true&&x.notUsedForAdjustment===true))return 'at least one unused, untuned independent confirmation required';if(o.compositionAssessment?.significantRegressionsResolved!==true||!Array.isArray(o.compositionAssessment?.observations)||!o.compositionAssessment.observations.length)return 'composition regression resolution lacks observations';for(const r of o.compositionAssessment.observations){const a=load(r);if(a.actualDecodedFrames!==true||!Array.isArray(a.videoSHA256s)||a.videoSHA256s.length<2||a.videoSHA256s.some(h=>!HASH.test(h))||!Number.isFinite(a.measuredSampleCount)||a.measuredSampleCount<=0)return 'composition frame observations missing';}return true;});
 check('quality','important semantic operators',e.operators,o=>{if(o.proofSchema===2)return typedImportantOperators(o,load,(ref,hash)=>{if(!ref||typeof ref.path!=='string'||ref.sha256!==hash||!HASH.test(hash||''))throw Error('v2 actual MP4 file reference missing');if(sha(fs.readFileSync(path.resolve(root,ref.path)))!==hash)throw Error('v2 actual MP4 file hash mismatch');});if(o.proofSchema!==undefined&&o.proofSchema!==1)return 'unsupported operator proof schema';if(Array.isArray(o.expectedImportantIntentIds)&&Array.isArray(o.observations)&&o.observations.some(a=>o.expectedImportantIntentIds.includes(a.intentId)&&a.status==='FAILED'))return false;if(!Array.isArray(o.expectedImportantIntentIds)||!o.expectedImportantIntentIds.length||new Set(o.expectedImportantIntentIds).size!==o.expectedImportantIntentIds.length||!Array.isArray(o.observations))return 'important intent population missing';for(const id of o.expectedImportantIntentIds){const a=o.observations.filter(x=>x.intentId===id);if(a.some(x=>x.status==='FAILED'))return false;if(a.length!==1||a[0].status!=='VERIFIED'||a[0].counterfactual!==true||a[0].decodedPixels!==true||!HASH.test(a[0].videoSHA256||'')||!HASH.test(a[0].controlVideoSHA256||'')||!Number.isFinite(a[0].actualDecodedTimestamp))return 'important effect unmeasured/confounded/stale or no isolated encoded control';const raw=load(a[0].measurement);if(raw.intentId!==id||raw.videoSHA256!==a[0].videoSHA256||raw.controlVideoSHA256!==a[0].controlVideoSHA256||raw.actualDecodedTimestamp!==a[0].actualDecodedTimestamp||raw.isolatedControl!==true||!Array.isArray(raw.measuredValues)||!raw.measuredValues.length||raw.measuredValues.some(v=>!Number.isFinite(v)))return 'semantic raw measurement missing or differs';}return true;});
 check('quality','regressions and correspondence',e.safety,o=>{if(o.knownMajorDefects>0||o.lyricMissing>0||o.audioBroken>0||o.manualLocksChanged>0)return false;const fields=['knownMajorDefects','lyricMissing','audioBroken','manualLocksChanged'];if(fields.some(k=>o[k]!==0)||o.allTargetPathsBound!==true||o.finalArtifactMatchesSource!==true||!Array.isArray(o.pathObservations)||!o.pathObservations.length)return 'safety/path-source correspondence unverified';return true;});
 const gate=xs=>xs.some(x=>x.state==='FAIL')?'FAIL':xs.every(x=>x.state==='PASS')?'PASS':'UNVERIFIED';
 const technical=gate(checks.technical),quality=gate(checks.quality);
 return {schema:2,evaluatorVersion:'release-gates-v2',releaseSourceCommit:commit,manifestSHA256:sha(Buffer.from(JSON.stringify(manifest))),TECHNICAL_GO:technical,QUALITY_GO:quality,RELEASE_GO:[technical,quality].includes('FAIL')?'FAIL':technical==='PASS'&&quality==='PASS'?'PASS':'UNVERIFIED',ARTISTIC_100_VERIFICATION:'UNVERIFIED',human:'HUMAN_UNVERIFIED',checks,issues,limitations:['Hash binding establishes file consistency, not runner authenticity. Adapters must preserve raw observations; no artistic score is inferred.','No deployment or production verification is implied by RELEASE_GO.']};
}
module.exports={evaluate,sha};
if(require.main===module){try{const file=path.resolve(process.argv[2]||'');const result=evaluate(JSON.parse(fs.readFileSync(file)),path.dirname(file));process.stdout.write(JSON.stringify(result,null,2)+'\n');process.exitCode=result.RELEASE_GO==='PASS'?0:2;}catch(e){process.stderr.write(e.message+'\n');process.exitCode=2;}}
