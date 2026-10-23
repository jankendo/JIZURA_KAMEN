/* Extra assertions share the existing Chrome/encoder scenario, not another rig. */
module.exports=async function motionChecksV14(){
 const J=window.J,{q,p,a}=window.comparisonV12,assert=(ok,message)=>{if(!ok)throw Error(message);};
 const selection=p.songNativeDirection.selection,c=p.cuts.find(c=>c.line===0),index=J.explorationCatalogV13(p);
 assert(p.songNativeDirection.explorationVersion===14,'explicit v14 opt-in');
 assert(index.length===Object.keys(J.STYLES).length+J.GROUP_KEYS.reduce((n,g)=>n+Object.keys(J.registry(g)).length,0),'live registry coverage');
 const generate=()=>Array.from({length:40},(_,i)=>J.explorationProposalV13(p,c,index,i)).filter(Boolean);
 const before=generate(),random=Math.random,rank=J.directionStyleCandidatesV11;
 let after;try{Math.random=()=>{throw Error('unseeded PRNG');};J.directionStyleCandidatesV11=()=>{throw Error('ranked style dependency');};after=generate();}finally{Math.random=random;J.directionStyleCandidatesV11=rank;}
 assert(J.canonicalJSON(before)===J.canonicalJSON(after),'deterministic proposals independent of global PRNG and style ranking');
 assert(new Set(before.map(x=>x.cut.styleKey)).size>4&&new Set(before.map(x=>x.cut.layout)).size>8,'actual live component reach');
 const traces=selection.traces.map(t=>t.creative);
 assert(traces.every(t=>t.motionV14.motionSurvival.randomDiscovery.rootsInArchive<=t.motionV14.motionSurvival.randomDiscovery.moving),'random discovery roots survive repair/tuning without double-counting');
 assert(traces.every(t=>t.explorationVersion===14&&t.compared<=t.budget&&t.ablationSamples<=t.ablationBudget),'bounded exploration and controls');
 assert(traces.some(t=>t.archive.size>1&&t.archive.minDistance>0),'measured nonidentical niches');
 assert(traces.some(t=>t.origins.mutation+t.origins.crossover>0),'archive drives offspring');
 assert(traces.some(t=>t.repairs.some(r=>r.safe&&r.idsPreserved)),'actual local repair preserves technique IDs');

 const dims={compositionQuality:.8,musicFit:.8,temporalAlignment:.7};
 const descriptor=motion=>({signature:[.1,.3],typography:[.2,.4],channels:Object.fromEntries(['spatial','glyph','entry','exit','camera','backdrop','frame','backdropSpace','frameSpace'].map(k=>[k,{status:'MEASURED',value:k==='glyph'?[motion,motion,0,0]:[0,0,0,0]}])),holdMotion:{status:'MEASURED',value:motion},boundary:{first:[.2,.3],last:[.2,.3]}});
 const item=(motion,id)=>({cut:{...c,styleKey:id},safe:true,evidence:{eligible:true},signature:[.1,.3],descriptor:descriptor(motion),dimensions:{...dims},features:{energy:.5,onset:.5},intent:{motion:.4}});
 const still=item(0,'one'),moving=item(.3,'other'),archive=J.createMotionArchiveV14();archive.insert(still);archive.insert(moving);
 assert(archive.rows.length===2,'same composition / different measured motion retained');
 const steps=[{line:0,candidates:[still,moving]}],pick=()=>J.chooseMotionStoryboardV14(p,steps);
 assert(J.canonicalJSON(pick())===J.canonicalJSON(pick()),'seeded path replay');
 const switched={...moving,cut:{...moving.cut,styleKey:'changed',layout:'changed',cam:'changed'}};
 assert(J.canonicalJSON(J.motionTransitionV14(still,moving))===J.canonicalJSON(J.motionTransitionV14(still,switched)),'style/layout/camera names carry no transition cost');
 assert(J.chooseMotionStoryboardV14(p,[{line:0,candidates:[still]}]).picks[0].descriptor.holdMotion.value===0,'safe still remains selectable');
 assert(J.chooseMotionStoryboardV14(p,[{line:0,candidates:[{...moving,safe:false}]}]).status==='NO_MEASURED_SAFE_PATH','unsafe motion rejected');
 const unknown=descriptor(0);unknown.channels.glyph={status:'UNMEASURED',value:null};
 assert(J.motionDistancesV14(unknown,descriptor(.4)).glyph===null,'unknown motion is not zero');
 assert(J.motionRepairsV14(c,[{eligible:false,renderErrors:['failure']}]).length===0,'renderer errors are not papered over');
 assert(!J.chooseMotionStoryboardV14.toString().includes('chooseCreativeArcV10'),'dedicated selector does not invoke legacy arc');
 const R=new J.Renderer();await R.loadCustomBackground(q.customBg.dataUrl);
 const make=()=>{const cv=Object.assign(document.createElement('canvas'),{width:256,height:144}),mask=cv.cloneNode();return J.createCreativeProbeV10(J.createRegistryRenderProbe(p,R,cv,mask,{production:true}),cv);};
 const phases=cut=>J.directionPhasesV11(p,cut,a),args={p,c,f:J.songLineFeaturesV8(p,a,c),phases,audio:a,budget:18,initialCuts:[c],initialPlan:p,preserveCurrent:true};
 // Use an actual failed random candidate and its successful Canvas repair,
 // rather than assume that displacing a safely fitted selected cut must fail.
 const movingRepair=traces.flatMap(t=>t.repairs).find(r=>r.safe&&r.idsPreserved&&r.before[4]>1e-6&&r.after[4]>1e-6&&r.retention.channels.glyph.status==='MEASURED');
 assert(movingRepair,'actual random motion survives a successful role-preserving local repair');
 const partial={full:false,extra:true,sourceFull:true,directLabels:[],safe:true,ink:10,height:.1,contrast:{measured:true,renderedVsBackgroundContrastP10:4},geometry:[{distortion:false,collisions:0,readable:false}],advancedChecks:[{referencePixels:20,complete:false}]},transient={...c,enter:'test-reveal',inDur:.2,outDur:0,exit:'cut'};
 assert(J.directionSafetyV11(transient,.05,partial).eligible,'existing bounded reveal contract accepted');
 assert(!J.directionSafetyV11(transient,.5,partial).eligible,'missing hold glyphs rejected');
 assert(!J.directionSafetyV11({...transient,inDur:.4},.05,partial).eligible,'overlong partial reveal rejected');
 assert(!J.directionSafetyV11(transient,.05,{...partial,sourceFull:false}).eligible,'missing source text rejected even during reveal');
 const first=await J.optimizeExplorationLineV14({...args,sample:make()}),second=await J.optimizeExplorationLineV14({...args,sample:make()});
 assert(J.canonicalJSON(first.map(x=>x.cut))===J.canonicalJSON(second.map(x=>x.cut)),'actual Canvas exploration replay');
 assert(first.every(x=>x.cut.layout===c.layout&&x.cut.styleKey===c.styleKey),'adapt current retains layout and style');
 const locked={...p,overrides:{...p.overrides,[c.line]:{lock:true}}};let rejected=false;
 try{await J.optimizeExplorationLineV14({...args,p:locked,sample:make()});}catch(e){rejected=e.message==='V14_LOCKED_LINE';}assert(rejected,'manual lock is a hard boundary');
 // Test 3 reuses v9 resolved patches and their unchanged renderer binding.
 J.assertSelectionV9(p,a);assert(selection.multiScaleEvidence.width===640&&selection.multiScaleEvidence.status==='MEASURED_SAFE_SEQUENCE','unchanged final scale gate');
 const decisions=J.canonicalJSON(J.songNativeRenderDecisions(p));J.captureSongNativeResolved(q,a,p);
 const persisted=J.compactPersistentProjectV111(q),restored=J.plan(persisted,a);
 assert(restored.songNativeRestore.status==='RESTORED'&&J.canonicalJSON(J.songNativeRenderDecisions(restored))===decisions,'selected v13 cut parameters survive JSON/persistence projection');
 assert(restored.songNativeDirection.rendererCompatibilityId==='kamen-song-grammar-renderer-9','no legacy render contract invalidation');
 assert(J.canonicalJSON(p.lines.map(l=>l.start))===J.canonicalJSON(restored.lines.map(l=>l.start)),'LRC timing retained');
 const portrait={...J.clonePhotoRenderPlan(q),aspect:'9:16'};delete portrait.artDirection.songNativeResolved;
 const set=await J.generateJizuraDirectionV14(portrait,a);portrait.artDirection=J.makeArtDirection(portrait,a,set.recommended.proposal);const pp=J.plan(portrait,a),pc=pp.cuts.find(c=>c.line===0);
 const cv=Object.assign(document.createElement('canvas'),{width:256,height:Math.round(256*pp.H/pp.W)}),pm=cv.cloneNode(),probe=J.createCreativeProbeV10(J.createRegistryRenderProbe(pp,R,cv,pm,{production:true}),cv);
 probe.verifyScale=J.createRegistryRenderProbe(pp,R,cv,pm,{production:true}).verifyScale;
 const vertical=await J.optimizeExplorationLineV14({p:pp,c:pc,f:J.songLineFeaturesV8(pp,a,pc),sample:probe,phases:cut=>J.directionPhasesV11(pp,cut,a),audio:a,budget:48});
 assert(vertical.some(x=>x.checks.every(e=>e.eligible)),'portrait actual production Canvas');
 const verticalSteps=[{line:pc.line,energy:.5,candidates:vertical}],picked=J.chooseMotionStoryboardV14(pp,verticalSteps);
 const detail=await J.confirmDirectionScaleV11(pp,verticalSteps,picked,probe,cut=>J.directionPhasesV11(pp,cut,a));assert(detail.scaleSafety.status==='MEASURED_SAFE_SEQUENCE','portrait unchanged 640px gate');
 // The existing final-gate test covers a resolution-dependent FX wash; run it
 // independently in required legacy FAST tests rather than inventing a weaker gate.
 R.disposeAssets?.();return {determinism:'PASS',registry:index.length,styles:Object.keys(J.STYLES).length,techniques:index.length-Object.keys(J.STYLES).length,localRepair:'PASS',locks:'PASS',currentAdaptation:'PASS',saveRestore:'PASS',portrait:'PASS',scale:selection.multiScaleEvidence.status,artisticQuality:'UNVERIFIED'};
};
