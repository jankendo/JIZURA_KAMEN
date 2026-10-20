'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{engine}=require('./custom_test_support.cjs');
(async()=>{
 const {J,context}=engine(),Q=J.cinemaV5,V=J.cinemaV3;
 assert.equal(J.defaultProject().exportSettings.refinementMode,'fast');
 assert.equal(J.exportRefinementMode({project:{exportSettings:{refinementMode:'quality'}}}),'quality');
 assert.equal(J.exportRefinementMode({refinementMode:'fast',project:{exportSettings:{refinementMode:'quality'}}}),'fast');
 J.checkMVQuality=(project,p)=>({errors:[],quality:{overallScore:p.lastPixelQA.score,creativeScore:p.lastPixelQA.score,certified100:false,metrics:{temporalContrast:90}}});
 J.analyzeRenderedFrames=async()=>{};
 let encodes=0,guards=0,contrast=0,travel=0;
 V.snapshot=async()=>({inputHash:'input'});
 J.bindAutomaticLyricTemporalPolicy=()=>false;
 Q.guardExport=async(result,args)=>{guards++;assert.equal(args.refinementMode,'fast');result.provenance.finalArtifactVerification={status:'FAILED',binding:{videoSHA256:result.provenance.videoSHA256}};return result;};
 Q.proposeFinalContrastRepair=async()=>{contrast++;throw Error('fast contrast proposal called');};
 Q.proposeFinalSemanticTravel=async()=>{travel++;throw Error('fast travel proposal called');};
 const plan=()=>({musicalPhoto:{phraseSettle:{duration:.16,initialScale:.86}},cuts:[],events:[]});
 const encode=async args=>{encodes++;args.plan.lastPixelQA={score:70};return {audio:'aac',blob:new Blob(['mock-video']),validation:{},provenance:{videoSHA256:'video-'+encodes,planHash:'plan'}};};
 for(const args of [{},{refinementMode:'fast',refinementAttempts:5},{project:{exportSettings:{refinementMode:'fast'}}}]){
  const before=encodes,p=plan(),r=await Q.runVerifiedExport(a=>J.refinePhotoExport(a,encode),{project:{},...args,plan:p});
  assert.equal(encodes-before,1);assert.equal(r.provenance.machineRefinement.maxAttempts,1);assert.equal(r.provenance.machineRefinement.minimumMet,false);
  assert.equal(r.provenance.machineRefinement.score,70);assert.equal(r.provenance.renderHistory.nodes.length,1);
  assert.equal(r.provenance.finalArtifactVerification.status,'FAILED','no fabricated PASS');
  assert.equal(r.provenance.finalContrastRepair.status,'SKIPPED_FAST_MODE');assert.equal(r.provenance.finalSemanticTravelRepair.status,'SKIPPED_FAST_MODE');
  assert.equal(JSON.parse(await r.sidecar.text()).renderHistory.nodes.length,1);
 }
 assert.equal(guards,3);assert.equal(contrast,0);assert.equal(travel,0);
 Q.guardExport=async()=>{throw Error('CINEMA_V5_UNSAFE_EXPORT');};
 await assert.rejects(Q.runVerifiedExport(a=>J.refinePhotoExport(a,encode),{project:{},plan:plan()}),/CINEMA_V5_UNSAFE_EXPORT/);
 // Quality retains the outer trial and rejects a non-improving artifact.
 guards=encodes=0;Q.guardExport=async r=>{guards++;r.provenance.finalArtifactVerification={binding:{videoSHA256:r.provenance.videoSHA256}};return r;};
 Q.proposeFinalContrastRepair=async p=>{contrast++;return {plan:V.clone(p),indices:[0]};};
 Q.proposeFinalSemanticTravel=async()=>{travel++;return null;};Q.finalRepairDominates=()=>false;
 const quality=await Q.runVerifiedExport(encode,{project:{exportSettings:{refinementMode:'quality'}},plan:plan()});
 assert.equal(encodes,2);assert.equal(guards,2);assert.equal(quality.provenance.videoSHA256,'video-1');assert.equal(quality.provenance.finalContrastRepair.status,'KEPT_ORIGINAL_NO_STRICT_IMPROVEMENT');assert.equal(travel,1);
 // Font state is conservative: absent/loading state is never reusable; new faces invalidate.
 const font={family:'test',status:'loaded'},faces=new Set([font]);faces.status='loaded';context.document.fonts=faces;
 const project=J.defaultProject(),p={fps:30},range={start:0,end:1},key=V.qaRenderState(project,p,range);
 assert(key);assert.equal(key,V.qaRenderState(project,p,range));
 assert.notEqual(key,V.qaRenderState({...project,aspect:'9:16'},p,range));assert.notEqual(key,V.qaRenderState(project,{fps:24},range));assert.notEqual(key,V.qaRenderState(project,p,{start:0,end:2}));
 faces.delete(font);faces.add({...font});assert.notEqual(key,V.qaRenderState(project,p,range));faces.status='loading';assert.equal(V.qaRenderState(project,p,range),null);
 // Run the production frame closure with one draw item; compare to the frozen duplicate-call form.
 const source=fs.readFileSync('src/11zzq_render_feedback.js','utf8'),frameSource=source.slice(source.indexOf('const frame='),source.indexOf('\n try{await J.prepareCinemaProxyRenderer'));
 function sample(legacy){let calls=0;const x={getImageData:()=>({data:[1,2,3,4]})},mx=x,J={drawItem(){},layoutText:()=>[{i:0,ch:'字'}],selectionGlyphEvidence:()=>{calls++;return {readable:true,maxGlyphHeight:.1};}},p={},R={frame(){J.drawItem({pass:'main',ctx:x,cut:{line:0}},{alpha:1});}};
  const code=legacy?frameSource.replace('const glyphEvidence=J.selectionGlyphEvidence(env,it);','').replace('readable:glyphEvidence.readable,glyphEvidence','readable:J.selectionGlyphEvidence(env,it).readable,glyphEvidence:J.selectionGlyphEvidence(env,it)'):frameSource;
  const c={J,p,R,x,mx,w:128,h:72,range:null};vm.runInNewContext(code+'globalThis.result=frame(0);',c);return {calls,records:JSON.stringify(c.result.records)};
 }
 const current=sample(false),old=sample(true);assert.equal(current.records,old.records);assert.equal(current.calls,1);assert.equal(old.calls,2);
 console.log('Fast nested encode count, honest evidence, technical rejection, quality comparison, render state and glyph equivalence PASS (mocks; no MP4 encoded)');
})().catch(e=>{console.error(e);process.exitCode=1;});
