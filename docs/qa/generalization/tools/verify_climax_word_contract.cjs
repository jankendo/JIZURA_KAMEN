'use strict';
// Observe actual draw-item text only after full Native-to-final-video binding.
// Decoded OCR and artistic quality are not inferred from these strings.
const fs=require('fs'),path=require('path'),assert=require('assert/strict'),crypto=require('crypto');
const [source,input,beforeDir,afterDir,output]=process.argv.slice(2);
const {J}=require(path.resolve(source,'dev/custom_test_support.cjs')).engine(source);
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),readBytes=p=>fs.existsSync(p)?fs.readFileSync(p):require('zlib').gunzipSync(fs.readFileSync(p+'.gz')),read=p=>JSON.parse(readBytes(p));
const revive=v=>v&&typeof v==='object'?(v.__qaTypedArray?new globalThis[v.__qaTypedArray](v.data):v.__qaMap?new Map(v.__qaMap.map(([k,x])=>[k,revive(x)])):v.__qaSet?new Set(v.__qaSet.map(revive)):Array.isArray(v)?v.map(revive):Object.fromEntries(Object.entries(v).map(([k,x])=>[k,revive(x)]))):v;
const rows=read(path.join(input,'results.json')).rows,observations=[];
for(const r of rows){
 const nativeFile=path.join(r.variant==='baseline'?beforeDir:afterDir,'native-source-continuity-dispatch.json'),n=read(nativeFile),refBytes=readBytes(path.join(input,r.referenceInputs.file)),ref=revive(JSON.parse(refBytes)),p=ref.plan;
 assert.equal(sha(refBytes),r.referenceInputs.sha256);assert.equal(n.referenceSHA256,r.referenceInputs.sha256);assert.equal(n.videoSHA256,r.sha256);
 assert.equal(n.build.sourceCommit,r.provenance.finalArtifactVerification.binding.sourceCommit);assert.equal(n.build.sourceDirty,false);assert.equal(n.sourceContinuity.status,'EXACT_NATIVE_RGBA_ALL_OUTPUT_FRAMES');
 assert.equal(r.status,'PASS');assert.equal(r.provenance.finalArtifactVerification.status,'MEASURED');assert.equal(r.manualLockUnchanged,true);
 if(r.fixture.manual)assert(r.manualLockedCutCount>0,'Manual fixture must contain a real locked cut; empty equality is not coverage');
 const samples=[];
 for(const x of n.parameters.filter(x=>x.kind==='primaryGlyphs')){
  const matches=p.cuts.map((c,i)=>({c,i})).filter(({c})=>c.index===x.cutIndex&&c.line===x.line);
  assert.equal(matches.length,1,'Ambiguous or missing Native stable cut identity');
  const {c,i:resolvedOrdinal}=matches[0];
  if(x.unitOrdinal>=0)assert.equal(x.unitOrdinal,resolvedOrdinal,'Native ordinal disagrees with stable identity');
  assert(n.nativeHashes.some(f=>f.time===x.time),'Observation timestamp is not an actual output frame');
  const unitKey=JSON.stringify([resolvedOrdinal,c.index,c.line,c.start,c.end,c.text??c.lineText]);
  assert(n.calls.some(call=>call.unitKey===unitKey&&call.firstTime<=x.time&&call.lastTime>=x.time),'Missing frozen unit dispatch identity witness');
  if(!c.grammar?.temporal?.climax||!c.grammar.stage||c.locked||J.photoChoreographyLocked(p,c))continue;
  const sourceText=String(c.lineText??c.text??'');
  assert.equal(x.text.replace(/\r?\n/g,''),sourceText.replace(/\r?\n/g,''),'Source text/space changed');
  samples.push({actualNativeTime:x.time,cutOrdinal:resolvedOrdinal,observedObjectOrdinal:x.unitOrdinal,identityMethod:'Unique frozen cut index AND line; nonnegative object ordinal cross-checked; exact output frame time',cutIndex:x.cutIndex,line:x.line,sourceText,actualDrawItemText:x.text,font:x.font,fontWeight:x.fontWeight,unsafeWordOrClusterSplit:J.climaxSplitNeedsProtection(sourceText,x.text)});
 }
 observations.push({variant:r.variant,sourceCommit:n.build.sourceCommit,videoSHA256:r.sha256,inputHash:r.provenance.finalArtifactVerification.binding.inputHash,planHash:n.planHash,referenceSHA256:r.referenceInputs.sha256,nativeOutputFrameCount:n.outputFramesSampled,nativeObservationSHA256:sha(readBytes(nativeFile)),automaticClimaxDrawSamples:samples.length,unsafeDrawSamples:samples.filter(s=>s.unsafeWordOrClusterSplit).length,samples});
}
const after=observations.find(r=>r.variant==='v3'),before=observations.find(r=>r.variant==='baseline');assert(after&&before);
const result={schema:1,fixture:rows[0].fixture.id,scope:'Actual full-output Native text layout bound by exact RGBA to the selected encoded artifact, plus existing decoded per-glyph FAV. Not OCR, artistic quality or whole-effect certification.',sourceCommit:after.sourceCommit,observations,status:after.unsafeDrawSamples?'FAILED_UNSAFE_AUTOMATIC_SPLIT_REMAINS':before.unsafeDrawSamples?'CONFIRMED_NATIVE_WORD_LAYOUT_REPAIR_DECODED_REVIEW_REQUIRED':'NO_PRIOR_UNSAFE_SELECTED_SPLIT_REPRODUCED',human:'HUMAN_UNVERIFIED'};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({fixture:result.fixture,status:result.status,beforeUnsafe:before.unsafeDrawSamples,afterUnsafe:after.unsafeDrawSamples}));assert.equal(after.unsafeDrawSamples,0,'Automatic climax still cuts a protected token/cluster');
