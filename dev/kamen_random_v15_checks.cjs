/* Three groups reuse the production Chrome/Canvas/short encoder harness. */
module.exports=async function randomChecksV15(){
 const J=window.J,{q,p,a}=window.comparisonV12,assert=(ok,msg)=>{if(!ok)throw Error(msg);};
 const selection=p.songNativeDirection.selection,c=p.cuts.find(c=>c.line===0),index=J.explorationCatalogV13(p),traces=selection.traces.map(t=>t.creative);
 assert(J.isRandomFinisherV15(p)&&selection.explorationVersion===15,'v15 explicit opt in');
 const generate=plan=>Array.from({length:24},(_,i)=>J.randomProposalV15(plan,c,index,i));
 const before=generate(p),random=Math.random;let after;
 try{Math.random=()=>{throw Error('unseeded random');};after=generate(p);}finally{Math.random=random;}
 assert(J.canonicalJSON(before)===J.canonicalJSON(after),'seeded replay');
 const normal=generate({...p,songNativeDirection:{...p.songNativeDirection,intensityV15:'normal'}}),count=rows=>rows.filter(c=>c.hold!=='still').length+rows.filter(c=>c.cam!=='stillCamera').length;
 assert(count(before)>count(normal),'intensity changes actual registry generation');
 const genome=J.creativeGenomeV15(c),initial=J.initialFinishV15(p,c);
 assert(!J.genomeChangesV15(genome,J.creativeGenomeV15(initial)).length,'initial numeric fit retains all role IDs');
 const changed=J.rerollRoleV15(p,c,index,'hold',5);
 assert(J.genomeChangesV15(genome,J.creativeGenomeV15(changed)).join(',')==='hold','partial reroll is local');
 const R=new J.Renderer();await R.loadCustomBackground(q.customBg.dataUrl);
 const cv=Object.assign(document.createElement('canvas'),{width:256,height:144}),mask=cv.cloneNode(),raw=J.createRegistryRenderProbe(p,R,cv,mask,{production:true}),probe=J.createCreativeProbeV10(raw,cv);probe.verifyScale=raw.verifyScale;
 const args={p,c,f:J.songLineFeaturesV8(p,a,c),sample:probe,phases:cut=>J.directionPhasesV11(p,cut,a),audio:a,budget:18,preserveCurrent:true,initialCuts:[c],initialPlan:p};
 const first=await J.optimizeRandomLineV15(args),second=await J.optimizeRandomLineV15(args);
 assert(J.canonicalJSON(first.map(x=>x.cut))===J.canonicalJSON(second.map(x=>x.cut)),'actual Canvas finish replay');
 assert(first.every(x=>!J.genomeChangesV15(genome,J.creativeGenomeV15(x.cut)).length),'actual timing/safety finishing retains IDs');
 let locked=false;try{await J.optimizeRandomLineV15({...args,p:{...p,overrides:{[c.line]:{lock:true}}}});}catch(e){locked=e.message==='V15_LOCKED_LINE';}assert(locked,'manual lock enforced');
 const phases=args.phases(c),checks=phases.map(t=>probe({...p,motionObservationV14:true},c,t));
 Object.assign(checks,{planWidthV14:p.W,planHeightV14:p.H,cutTextV14:c.lineText});
 const proposals=J.finishRepairsV15(p,c,checks.map(e=>({...e,eligible:false,safe:false})));assert(proposals.every(x=>!J.genomeChangesV15(genome,J.creativeGenomeV15(x)).length),'numeric repairs cannot replace genome');
 assert(proposals.some(x=>(x.explorationParamsV13?.size??1)!==(c.explorationParamsV13?.size??1)),'measured size correction exists');
 console.log('V15 TEST 1 PASS: actual Canvas retention, numeric fit, local reroll, locks and replay');
 const reroll=J.rerollRoleV15;let bounded=false;
 try{J.rerollRoleV15=(_p,cut)=>J.clonePhotoRenderPlan(cut);const base=checks.find(e=>e.temporalStage==='HOLD');await J.optimizeRandomLineV15({...args,preserveCurrent:false,budget:108,phases:()=>[.5],sample:()=>({...base,sampleOffset:.5,eligible:false,safe:false})});}
 catch(e){bounded=e.message.startsWith('V15_NO_SAFE')&&e.diagnostic.compared<108;}
 finally{J.rerollRoleV15=reroll;}
 assert(bounded,'duplicate causal rerolls terminate even when no new Canvas state consumes budget');
 // Dedicated selector is first-safe even if a later candidate scores higher.
 const firstPick={...first[0],score:0},later={...first[0],score:100};
 assert(J.chooseRandomStoryboardV15(p,[{line:0,candidates:[firstPick,later]}]).picks[0].score===0,'no score reselection');
 assert(traces.every(t=>t.compared<=t.budget&&t.genome.changedRoles.every(role=>t.repairs.some(r=>r.role===role))),'bounded causal changes with audit');
 assert(traces.some(t=>t.motionV14.holdMotion.value>1e-6),'actual selected HOLD evolution');
 const motion=traces.flatMap(t=>t.ablations);
 assert(motion.some(x=>x.group==='cam'&&x.pixelDifference>1e-6),'camera has visible production contribution');
 assert(motion.some(x=>x.group==='bg'&&x.pixelDifference>1e-6),'background has visible production contribution');
 assert(motion.some(x=>x.group==='fx'&&x.pixelDifference>1e-6),'FX has visible production contribution');
 console.log('V15 TEST 2 PASS: selected HOLD, camera, background and FX pixels observed');
 J.assertSelectionV9(p,a);assert(selection.multiScaleEvidence.width===640&&selection.multiScaleEvidence.status==='MEASURED_SAFE_SEQUENCE','final 640px gate');
 const decisions=J.canonicalJSON(J.songNativeRenderDecisions(p));J.captureSongNativeResolved(q,a,p);
 const saved=J.compactPersistentProjectV111(q),restored=J.plan(saved,a);
 assert(restored.songNativeRestore.status==='RESTORED'&&J.canonicalJSON(J.songNativeRenderDecisions(restored))===decisions,'save restore exact render decisions');
 assert(restored.songNativeDirection.rendererCompatibilityId==='kamen-song-grammar-renderer-9','legacy renderer contract');
 assert(J.canonicalJSON(restored.lines.map(l=>l.start))===J.canonicalJSON(p.lines.map(l=>l.start)),'LRC preserved');
 const portrait=J.clonePhotoRenderPlan(q);portrait.aspect='9:16';delete portrait.artDirection.songNativeResolved;
 const set=await J.generateJizuraDirectionV15(portrait,a);portrait.artDirection=J.makeArtDirection(portrait,a,set.recommended.proposal);
 const pp=J.plan(portrait,a),pc=pp.cuts.find(c=>c.line===0),pv=Object.assign(document.createElement('canvas'),{width:256,height:Math.round(256*pp.H/pp.W)}),pm=pv.cloneNode(),pr=J.createRegistryRenderProbe(pp,R,pv,pm,{production:true}),ps=J.createCreativeProbeV10(pr,pv);ps.verifyScale=pr.verifyScale;
 const vertical=await J.optimizeRandomLineV15({p:pp,c:pc,f:J.songLineFeaturesV8(pp,a,pc),sample:ps,phases:cut=>J.directionPhasesV11(pp,cut,a),audio:a});
 const steps=[{line:0,candidates:vertical}],pick=J.chooseRandomStoryboardV15(pp,steps);ps.recoverLine=(plan,pick,failures,budget)=>J.recoverDirectionLineV112(plan,pick,failures,{sample:ps,phases:cut=>J.directionPhasesV11(pp,cut,a),audio:a,budget});
 const confirmed=await J.confirmDirectionScaleV11(pp,steps,pick,ps,cut=>J.directionPhasesV11(pp,cut,a));assert(confirmed.scaleSafety.status==='MEASURED_SAFE_SEQUENCE','portrait 640px');
 R.disposeAssets?.();return {retention:'PASS',determinism:'PASS',localReroll:'PASS',boundedStagnation:'PASS',locks:'PASS',intensityDistribution:'PASS',productionRoles:'PASS',saveRestore:'PASS',LRC:'PASS',portrait:'PASS',scale:'PASS',traces:traces.map(t=>({genome:t.genome,intensity:t.intensity,compared:t.compared,repairs:t.repairs,repairStats:t.repairStats,lightSafety:t.lightSafety})),artisticQuality:'UNVERIFIED'};
};
