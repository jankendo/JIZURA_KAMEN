/* Extra assertions share the existing Chrome/encoder scenario, not another rig. */
module.exports=async function explorationChecksV13(){
 const J=window.J,{q,p,a}=window.comparisonV12,assert=(ok,message)=>{if(!ok)throw Error(message);};
 const selection=p.songNativeDirection.selection,c=p.cuts.find(c=>c.line===0),index=J.explorationCatalogV13(p);
 assert(p.songNativeDirection.explorationVersion===13,'explicit v13 opt-in');
 assert(index.length===Object.keys(J.STYLES).length+J.GROUP_KEYS.reduce((n,g)=>n+Object.keys(J.registry(g)).length,0),'live registry coverage');
 const generate=()=>Array.from({length:40},(_,i)=>J.explorationProposalV13(p,c,index,i)).filter(Boolean);
 const before=generate(),random=Math.random,rank=J.directionStyleCandidatesV11;
 let after;try{Math.random=()=>{throw Error('unseeded PRNG');};J.directionStyleCandidatesV11=()=>{throw Error('ranked style dependency');};after=generate();}finally{Math.random=random;J.directionStyleCandidatesV11=rank;}
 assert(J.canonicalJSON(before)===J.canonicalJSON(after),'deterministic proposals independent of global PRNG and style ranking');
 assert(new Set(before.map(x=>x.cut.styleKey)).size>4&&new Set(before.map(x=>x.cut.layout)).size>8,'actual live component reach');
 const traces=selection.traces.map(t=>t.creative);
 assert(traces.every(t=>t.explorationVersion===13&&t.compared<=t.budget&&t.ablationSamples<=t.ablationBudget),'bounded exploration and controls');
 assert(traces.some(t=>t.archive.size>1&&t.archive.minDistance>0),'measured nonidentical niches');
 assert(traces.some(t=>t.origins.mutation+t.origins.crossover>0),'archive drives offspring');
 assert(traces.some(t=>t.repairs.some(r=>r.safe&&r.idsPreserved)),'actual local repair preserves technique IDs');
 const R=new J.Renderer();await R.loadCustomBackground(q.customBg.dataUrl);
 const make=()=>{const cv=Object.assign(document.createElement('canvas'),{width:256,height:144}),mask=cv.cloneNode();return J.createCreativeProbeV10(J.createRegistryRenderProbe(p,R,cv,mask,{production:true}),cv);};
 const phases=cut=>J.directionPhasesV11(p,cut,a),args={p,c,f:J.songLineFeaturesV8(p,a,c),phases,audio:a,budget:18,initialCuts:[c],initialPlan:p,preserveCurrent:true};
 const first=await J.optimizeExplorationLineV13({...args,sample:make()}),second=await J.optimizeExplorationLineV13({...args,sample:make()});
 assert(J.canonicalJSON(first.map(x=>x.cut))===J.canonicalJSON(second.map(x=>x.cut)),'actual Canvas exploration replay');
 assert(first.every(x=>x.cut.layout===c.layout&&x.cut.styleKey===c.styleKey),'adapt current retains layout and style');
 const locked={...p,overrides:{...p.overrides,[c.line]:{lock:true}}};let rejected=false;
 try{await J.optimizeExplorationLineV13({...args,p:locked,sample:make()});}catch(e){rejected=e.message==='V13_LOCKED_LINE';}assert(rejected,'manual lock is a hard boundary');
 // Test 3 reuses v9 resolved patches and their unchanged renderer binding.
 J.assertSelectionV9(p,a);assert(selection.multiScaleEvidence.width===640&&selection.multiScaleEvidence.status==='MEASURED_SAFE_SEQUENCE','unchanged final scale gate');
 const decisions=J.canonicalJSON(J.songNativeRenderDecisions(p));J.captureSongNativeResolved(q,a,p);
 const persisted=J.compactPersistentProjectV111(q),restored=J.plan(persisted,a);
 assert(restored.songNativeRestore.status==='RESTORED'&&J.canonicalJSON(J.songNativeRenderDecisions(restored))===decisions,'selected v13 cut parameters survive JSON/persistence projection');
 assert(restored.songNativeDirection.rendererCompatibilityId==='kamen-song-grammar-renderer-9','no legacy render contract invalidation');
 assert(J.canonicalJSON(p.lines.map(l=>l.start))===J.canonicalJSON(restored.lines.map(l=>l.start)),'LRC timing retained');
 const portrait={...J.clonePhotoRenderPlan(q),aspect:'9:16'};delete portrait.artDirection.songNativeResolved;
 const set=await J.generateJizuraDirectionV13(portrait,a);portrait.artDirection=J.makeArtDirection(portrait,a,set.recommended.proposal);const pp=J.plan(portrait,a),pc=pp.cuts.find(c=>c.line===0);
 const cv=Object.assign(document.createElement('canvas'),{width:256,height:Math.round(256*pp.H/pp.W)}),pm=cv.cloneNode(),probe=J.createCreativeProbeV10(J.createRegistryRenderProbe(pp,R,cv,pm,{production:true}),cv);
 probe.verifyScale=J.createRegistryRenderProbe(pp,R,cv,pm,{production:true}).verifyScale;
 const vertical=await J.optimizeExplorationLineV13({p:pp,c:pc,f:J.songLineFeaturesV8(pp,a,pc),sample:probe,phases:cut=>J.directionPhasesV11(pp,cut,a),audio:a,budget:48});
 assert(vertical.some(x=>x.checks.every(e=>e.eligible)),'portrait actual production Canvas');
 const steps=[{line:pc.line,energy:.5,candidates:vertical}],picked=J.chooseRegistryStoryboard(steps,8);
 const detail=await J.confirmDirectionScaleV11(pp,steps,picked,probe,cut=>J.directionPhasesV11(pp,cut,a));assert(detail.scaleSafety.status==='MEASURED_SAFE_SEQUENCE','portrait unchanged 640px gate');
 // The existing final-gate test covers a resolution-dependent FX wash; run it
 // independently in required legacy FAST tests rather than inventing a weaker gate.
 R.disposeAssets?.();return {determinism:'PASS',registry:index.length,styles:Object.keys(J.STYLES).length,techniques:index.length-Object.keys(J.STYLES).length,localRepair:'PASS',locks:'PASS',currentAdaptation:'PASS',saveRestore:'PASS',portrait:'PASS',scale:selection.multiScaleEvidence.status,artisticQuality:'UNVERIFIED'};
};
