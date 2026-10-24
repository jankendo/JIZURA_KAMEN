/* Actual Canvas resolution-specific failure through the selected-draft API. */
module.exports=async()=>{
 const J=window.J,{q:baseQ,p:baseP,a}=window.comparisonV12,copy=J.clonePhotoRenderPlan,check=(x,m)=>{if(!x)throw Error(m);};
 const q=copy(baseQ),p=copy(baseP),cuts=p.cuts.filter(c=>c.line>=0),target=cuts.at(-1),id='v16ResolutionWash';
 J.FXE[id]={name:'test 640-only opaque overlay',draw(ctx){if(ctx.canvas.width>256){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='rgba(255,255,255,.92)';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.restore();}}};
 target.registryFxV9=id;delete target.creativeGenomeV15;target.creativeGenomeV15=J.creativeGenomeV15(target);
 q.randomWorkflowV16={version:16,sourceTreeSHA256:window.KAMEN_BUILD_INFO?.sourceTreeSHA256??null,state:'RANDOM_DRAFT_READY',draftId:'v16-scale-fixture',seed:q.seed,inputHash:J.songNativeInputIdentity(q,a),rendererCompatibilityId:p.songNativeDirection.rendererCompatibilityId,originalCuts:copy(p.cuts),originalCreativeGenome:cuts.map(c=>({line:c.line,genome:J.creativeGenomeV15(c)}))};
 q.randomWorkflowV16.inputHash=J.songNativeInputIdentity(q,a);
 const snapshot=J.selectedDraftSnapshotV16(q,p,a),before=copy(p.cuts),random=J.randomProposalV15;let fullGenomeCalls=0;
 J.randomProposalV15=(...args)=>{fullGenomeCalls++;return random(...args);};
 try{
  const result=await J.finishSelectedDraftV16(q,p,a,snapshot),scale=result.scaleSafety;
  check(fullGenomeCalls===0,'selected mode may not create independent genomes');
  check(scale.width===640&&scale.rejected.some(r=>r.line===target.line),'actual 256 PASS / 640 FAIL is measured');
  check(scale.entries.every(r=>r.checks.every(e=>e.eligible)),'final composed sequence passes');
  for(const old of before.filter(c=>c.line!==target.line))check(J.canonicalJSON(old)===J.canonicalJSON(result.plan.cuts.find(c=>c.index===old.index)),'unrelated cuts changed');
  for(const cut of result.plan.cuts.filter(c=>c.line>=0))check(J.describeJizuraDirectionV8(result.plan,cut)?.canvas,'safe-row UI diagnostics');
  const change=result.changes.find(c=>c.line===target.line);check(change.changedRoles.join(',')==='fx','only causal effect changes');
  check(J.canonicalJSON(p.cuts)===J.canonicalJSON(before),'input plan immutable');
  const controller=new AbortController();controller.abort();let cancelled=false;try{await J.finishSelectedDraftV16(q,p,a,snapshot,{signal:controller.signal});}catch(e){cancelled=e.name==='AbortError';}check(cancelled,'selected cancel');
  console.log('V16 SCALE PASS',JSON.stringify({scale:scale.status,changedRoles:change.changedRoles,fullGenomeCalls,recovery:scale.recovery.map(r=>({line:r.line,examined:r.examined,budget:r.budget}))}));
  return {scale:scale.status,changes:result.changes,recovery:scale.recovery,fullGenomeCalls,cancelled};
 }finally{J.randomProposalV15=random;delete J.FXE[id];}
};
