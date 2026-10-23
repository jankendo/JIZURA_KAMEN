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
 const originalProposal=J.randomProposalV15;let preservedProposalCalls=0,first,second;
 try{J.randomProposalV15=(...x)=>{preservedProposalCalls++;return originalProposal(...x);};first=await J.optimizeRandomLineV15(args);second=await J.optimizeRandomLineV15(args);}finally{J.randomProposalV15=originalProposal;}
 assert(preservedProposalCalls===0,'preserveCurrent never creates a fresh genome');
 assert(J.canonicalJSON(first.map(x=>x.cut))===J.canonicalJSON(second.map(x=>x.cut)),'actual Canvas finish replay');
 assert(first.every(x=>!J.genomeChangesV15(genome,J.creativeGenomeV15(x.cut)).length),'actual timing/safety finishing retains IDs');
 let locked=false;try{await J.optimizeRandomLineV15({...args,p:{...p,overrides:{[c.line]:{lock:true}}}});}catch(e){locked=e.message==='V15_LOCKED_LINE';}assert(locked,'manual lock enforced');
 const phases=args.phases(c),checks=phases.map(t=>probe({...p,motionObservationV14:true},c,t));
 Object.assign(checks,{planWidthV14:p.W,planHeightV14:p.H,cutTextV14:c.lineText});
 const proposals=J.finishRepairsV15(p,c,checks.map(e=>({...e,eligible:false,safe:false})));assert(proposals.every(x=>!J.genomeChangesV15(genome,J.creativeGenomeV15(x)).length),'numeric repairs cannot replace genome');
 assert(proposals.some(x=>(x.explorationParamsV13?.size??1)!==(c.explorationParamsV13?.size??1)),'measured size correction exists');
 // TEST A: the first full genome and its numeric/local repairs all fail; an
 // independent seeded genome must be sampled and adopted only when safe.
 const proposalA=originalProposal(p,c,index,701),proposalB=J.clonePhotoRenderPlan(c),genomeB=J.creativeGenomeV15(proposalB);
 if(!J.genomeChangesV15(J.creativeGenomeV15(proposalA),genomeB).length){const alt=index.find(x=>x.group==='layout'&&x.eligible&&x.id!==proposalB.layout&&(!J.LAYOUTS[x.id].fits||J.LAYOUTS[x.id].fits(J.graphemes(c.lineText).length)));if(alt)Object.assign(proposalA,J.changeDirectionRoleV11(proposalA,'layout',alt.id));}
 proposalA.creativeGenomeV15=J.creativeGenomeV15(proposalA);proposalB.creativeGenomeV15=genomeB;const genomeA=J.creativeGenomeV15(proposalA);assert(J.genomeChangesV15(genomeA,genomeB).length,'retry fixture has independent genomes');
 const originalFinish=J.finishRepairsV15,originalReroll=J.rerollRoleV15,originalRecovery=J.recoverDirectionLineV112,originalMotion=J.motionDescriptorV14;
 let proposalNumber=0,beganSecondGenome=false;const rejected=Object.assign({},checks.find(e=>e.temporalStage==='HOLD'),{sampleOffset:.5,eligible:false,safe:false});
 try{
  J.randomProposalV15=()=>{if(proposalNumber++===0)return proposalA;beganSecondGenome=true;return proposalB;};
  J.finishRepairsV15=(_p,cut)=>[{...J.clonePhotoRenderPlan(cut),explorationParamsV13:{...cut.explorationParamsV13,size:(cut.explorationParamsV13?.size??1)*.91}}];
  J.rerollRoleV15=()=>null;J.recoverDirectionLineV112=async()=>Object.assign([],{examined:0});
  J.motionDescriptorV14=(items,plan)=>{const d=originalMotion(items,plan);return beganSecondGenome?{...d,holdMotion:{...d.holdMotion,value:Math.max(1e-5,d.holdMotion.value||0)}}:d;};
  const retry=await J.optimizeRandomLineV15({...args,preserveCurrent:false,initialCuts:[],budget:48,sample:(sp,cut,t)=>beganSecondGenome?probe(sp,cut,t):{...rejected,sampleOffset:t}}),audit=retry[0].optimizerEvidence.search;
  assert(retry[0].safe&&audit.fullRandomGenomeTrials>=2&&audit.newGenomeSwitches===1,'unsafe first genome switches to an independent safe genome');
  assert(audit.localRepairCount>0&&!audit.fallbackAttempted&&audit.safeCandidateFound,'failed local repair is recorded before random retry');
  assert(J.canonicalJSON(retry[0].optimizerEvidence.genome.generated)===J.canonicalJSON(genomeB),'retry records the new genome, not the failed genome');
  assert(J.genomeChangesV15(genomeA,retry[0].optimizerEvidence.genome.generated).length,'retry does not inherit the failed genome identity');
  assert(args.phases(retry[0].cut).every(t=>probe({...p,style:retry[0].cut.style,styleKey:retry[0].cut.styleKey,motionObservationV14:true},retry[0].cut,t).eligible),'accepted retry passes actual Canvas safety');
 }finally{J.finishRepairsV15=originalFinish;J.rerollRoleV15=originalReroll;J.recoverDirectionLineV112=originalRecovery;J.motionDescriptorV14=originalMotion;J.randomProposalV15=originalProposal;}
 console.log('V15 TEST 1 PASS: actual Canvas retention, numeric fit, local reroll, locks and replay');
 let exhausted=null;const originalRerollB=J.rerollRoleV15,originalRecoveryB=J.recoverDirectionLineV112,base=checks.find(e=>e.temporalStage==='HOLD');
 try{J.rerollRoleV15=()=>null;J.recoverDirectionLineV112=async()=>Object.assign([],{examined:0});await J.optimizeRandomLineV15({...args,preserveCurrent:false,initialCuts:[],budget:36,phases:()=>[.5],sample:(_sp,_cut,t)=>({...base,sampleOffset:t,eligible:false,safe:false})});}
 catch(e){exhausted=e;}
 finally{J.rerollRoleV15=originalRerollB;J.recoverDirectionLineV112=originalRecoveryB;}
 assert(exhausted?.message==='V15_NO_SAFE_RANDOM_LINE_0','all unsafe candidates end in a clear failure');
 assert(exhausted.diagnostic.evaluatedCandidates<=exhausted.diagnostic.budget&&exhausted.diagnostic.fullRandomGenomeTrials>1&&exhausted.diagnostic.newGenomeSwitches>0,'all-unsafe search is bounded and retries full genomes');
 assert(exhausted.diagnostic.fallbackAttempted&&!exhausted.diagnostic.safeCandidateFound&&exhausted.diagnostic.primaryFailureReasons.length,'failure keeps compact safety diagnostics and adopts no unsafe state');
 // Dedicated selector is first-safe even if a later candidate scores higher.
 const firstPick={...first[0],score:0},later={...first[0],score:100};
 assert(J.chooseRandomStoryboardV15(p,[{line:0,candidates:[firstPick,later]}]).picks[0].score===0,'no score reselection');
 assert(traces.every(t=>t.compared<=t.budget&&t.genome.changedRoles.every(role=>t.repairSummary.changedRoles.includes(role))),'bounded causal changes with compact audit');
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
 // TEST D: cancellation and changed input stay explicit failures.
 const controller=new AbortController();controller.abort();let cancelled=false;try{await J.optimizeRandomLineV15({...args,signal:controller.signal});}catch(e){cancelled=e.name==='AbortError';}assert(cancelled,'cancelled preserveCurrent finishing is not reported as success');
 const mutable=J.clonePhotoRenderPlan(p);mutable.cuts=[];mutable.customBg={enabled:false};mutable.songNativeDirection={...mutable.songNativeDirection,version:8,optimizerVersion:null,explorationVersion:15};mutable.artDirection={...mutable.artDirection,songNativeDirection:mutable.songNativeDirection};
 const planHash=J.cinemaV3.planHash;let hashCall=0,changedInput=false;J.cinemaV3.planHash=async()=>++hashCall===1?'before':'changed';try{await J.searchJizuraDirectionV8(mutable,null,a,{ensureFonts:false});}catch(e){changedInput=e.message==='INPUT_CHANGED_DURING_SEARCH';}finally{J.cinemaV3.planHash=planHash;}assert(changedInput,'input changes during search remain a clear failure');
 R.disposeAssets?.();return {retention:'PASS',determinism:'PASS',freshRetry:'PASS',allUnsafeBoundedFailure:'PASS',localReroll:'PASS',preserveCurrent:'PASS',cancellation:'PASS',inputChange:'PASS',locks:'PASS',intensityDistribution:'PASS',productionRoles:'PASS',saveRestore:'PASS',LRC:'PASS',portrait:'PASS',scale:'PASS',traces:traces.map(t=>({genome:t.genome,intensity:t.intensity,compared:t.compared,search:t.search,repairSummary:t.repairSummary,repairStats:t.repairStats,lightSafety:t.lightSafety})),artisticQuality:'UNVERIFIED'};
};
