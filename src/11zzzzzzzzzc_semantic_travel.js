/* Verify a local semantic translation after selection; retain the original MP4. */
(()=>{'use strict';const J=window.J,V=J.cinemaV3,Q=J.cinemaV5,version='final-semantic-travel-v1';
const identity=c=>J.canonicalJSON([c.index,c.line,c.start,c.end,String(c.lineText??c.text??'')]);
J.finalSemanticTravelTarget=(p,c)=>!!c&&p.cinemaFinalSemanticTravel?.version===version&&p.cinemaFinalSemanticTravel.targets?.includes(identity(c));
Q.proposeFinalSemanticTravel=async(p,project,artifact)=>{
 if(project?.autoDirection!==true||artifact?.status!=='MEASURED'||!p.musicalPhoto?.cinema?.architecture)return null;
 if(await V.planHash(p)!==artifact.binding.planHash)throw Error('SEMANTIC_TRAVEL_PLAN_BINDING_MISMATCH');
 const targets=p.cuts.filter(c=>c.line>=0&&!c.locked&&!J.photoChoreographyLocked(p,c)&&c.layout!=='globalReadableUnit'&&!(J.automaticLyricTemporalTranslationEnabled?.(p,c)&&(J.LAYOUTS[c.layout]?.lyricTemporal?.uniformTranslation||/^cinemaGrammar/.test(c.layout||'')))&&c.grammar?.intentionalHold!==true&&c.grammar?.directionPolicy?.quietIntent!==true&&['light','continuity'].includes(c.grammar?.temporal?.role)).map(identity);
 if(!targets.length)return null;const plan=V.clone(p);plan.cinemaFinalSemanticTravel={version,targets};
 if(V.lockSignature(plan)!==V.lockSignature(p))throw Error('SEMANTIC_TRAVEL_LOCK_CHANGED');
 return {plan,targets,trigger:'Existing selected light/continuity uniform translation was cancelled by animated-bounds anchoring; trial the same selected composition only.'};
};
// Artifact-scoped unit IDs intentionally include planHash. Join different final
// artifacts only through a bijection of immutable source/fragment contracts.
Q.finalSemanticTravelUnitMap=(a,b)=>{
 const contract=(artifact,u)=>{
  const text=artifact.inputContract?.unitTexts?.filter(t=>t.unitId===u.unitId);
  if(!u.sourceUnitId||!Array.isArray(u.fragments)||!u.fragments.length||text?.length!==1)return null;
  return J.canonicalJSON([u.sourceUnitId,u.line,u.timeRange,u.holdRange,u.fragments.map(f=>[f.index,f.from,f.to,f.hold]),text[0].text,text[0].sourceUnitOrigin]);
 };
 if(!Array.isArray(a.units)||!Array.isArray(b.units)||a.units.length!==b.units.length)return null;
 const prior=new Map(a.units.map(u=>[u.unitId,u]));if(prior.size!==a.units.length||new Set(b.units.map(u=>u.unitId)).size!==b.units.length)return null;
 const joined=new Map(),used=new Set();for(const u of b.units){
  const key=contract(b,u),matches=key?a.units.filter(v=>contract(a,v)===key):a.units.filter(v=>v.unitId===u.unitId&&!v.sourceUnitId&&!u.sourceUnitId);
  if(matches.length!==1||used.has(matches[0].unitId))return null;
  joined.set(u.unitId,matches[0].unitId);used.add(matches[0].unitId);
 }
 // Each frame must still belong to its own artifact's declared unit/fragment.
 for(const artifact of [a,b])for(const f of artifact.frames){const u=artifact.units.find(u=>u.unitId===f.unitId);if(!u||u.sourceUnitId&&(f.sourceUnitId!==u.sourceUnitId||!u.fragments.some(g=>g.index===f.fragmentIndex)))return null;}
 return joined;
};
Q.measureFinalSemanticTravel=(before,after,plan)=>{
 const a=before.provenance?.finalArtifactVerification,b=after.provenance?.finalArtifactVerification;
 if(a?.status!=='MEASURED'||b?.status!=='MEASURED'||a.binding.inputHash!==b.binding.inputHash||a.binding.sourceCommit!==b.binding.sourceCommit||a.binding.rendererVersion!==b.binding.rendererVersion||V.profileId(a.binding.outputProfile)!==V.profileId(b.binding.outputProfile))return {status:'UNMEASURED',reason:'MATCHED_FINAL_ARTIFACTS_REQUIRED',targets:[]};
 const units=Q.finalSemanticTravelUnitMap(a,b);if(!units)return {status:'UNMEASURED',reason:'SOURCE_UNIT_CORRESPONDENCE_REQUIRED',targets:[]};
 const key=(f,joined=false)=>J.canonicalJSON([joined?units.get(f.unitId):f.unitId,f.fragmentIndex,f.actualDecodedTimestamp]),old=new Map(a.frames.map(f=>[key(f),f])),rows=[];
 if(old.size!==a.frames.length||new Set(b.frames.map(f=>key(f,true))).size!==b.frames.length)return {status:'UNMEASURED',reason:'DUPLICATE_ACTUAL_FRAME_IDENTITY',targets:[]};
 for(let i=0;i<plan.cuts.length;i++){
  const cut=plan.cuts[i];if(!J.finalSemanticTravelTarget(plan,cut))continue;
  const points=[],missing=[];for(const f of b.frames.filter(f=>f.fragmentIndex===i&&f.phase==='hold')){
   const prior=old.get(key(f,true));if(!prior){missing.push({time:f.actualDecodedTimestamp,reason:'OLD_ACTUAL_FRAME_ABSENT'});continue;}
   for(const g of f.glyphEvidence||[]){const h=prior.glyphEvidence?.find(h=>h.index===g.index&&h.row===g.row&&h.character===g.character);
    if(!h||![g,h].every(x=>x.nativeCentroid&&x.decodedCentroid)){missing.push({time:f.actualDecodedTimestamp,index:g.index,reason:'REGISTERED_GLYPH_ABSENT'});continue;}
    const expected=g.nativeCentroid.map((v,k)=>v-h.nativeCentroid[k]),observed=g.decodedCentroid.map((v,k)=>v-h.decodedCentroid[k]),pixels=Math.hypot(...expected),error=Math.hypot(...expected.map((v,k)=>v-observed[k])),tolerance=Math.max(.5,pixels*.1);
    points.push({actualDecodedTimestamp:f.actualDecodedTimestamp,index:g.index,row:g.row,character:g.character,expected,observed,pixels,error,tolerance,matched:error<=tolerance});
   }
  }
  const positive=points.filter(p=>p.pixels>=.5),frames=new Set(positive.map(p=>p.actualDecodedTimestamp)).size,matched=positive.filter(p=>p.matched).length,agreement=positive.length?matched/positive.length:null;
  rows.push({cutIdentity:identity(cut),role:cut.grammar.temporal.role,motionPrinciple:cut.grammar.temporal.motionPrinciple,registeredPoints:points.length,positiveDisplacementPoints:positive.length,actualFrames:frames,matched,agreement,missing,points,status:positive.length&&frames>=3&&!missing.length?(agreement>=.9?'VERIFIED':'FAILED'):'UNMEASURED'});
 }
 return {status:rows.length&&rows.every(r=>r.status==='VERIFIED')?'VERIFIED':rows.some(r=>r.status==='FAILED')?'FAILED':'UNMEASURED',targets:rows,method:'Same fixed selected plan; policy-only ON/OFF; actual registered native and decoded HOLD glyph displacement. Existing 0.5px/10% tolerance, >=3 frames and >=90% agreement. Local translation repair, not global camera or aesthetic certification.',beforeBinding:a.binding,afterBinding:b.binding};
};
Q.finalSemanticTravelDominates=(before,after,plan,observation)=>{
 const a=before.provenance?.finalArtifactVerification,b=after.provenance?.finalArtifactVerification;if(a?.status!=='MEASURED'||b?.status!=='MEASURED'||observation.status!=='VERIFIED')return false;
 const priorCinema=before.provenance.cinemaV3,currentCinema=after.provenance.cinemaV3;
 if(priorCinema?.selectedEvidence){const binding=b.binding;if(!currentCinema||currentCinema.videoHash!==binding.videoSHA256||currentCinema.planHash!==binding.planHash||currentCinema.selectedEvidence?.id!==binding.videoSHA256||currentCinema.selectedEvidence?.planHash!==binding.planHash||!currentCinema.history?.some(h=>h.videoHash===binding.videoSHA256&&h.planHash===binding.planHash&&h.stateHistory?.some(s=>s.state==='FULL_ENCODED')&&h.stateHistory?.some(s=>s.state==='DECODED_QA')))return false;}
 const correspondenceUnits=Q.finalSemanticTravelUnitMap(a,b);if(!correspondenceUnits)return false;
 const key=(f,joined=false)=>J.canonicalJSON([joined?correspondenceUnits.get(f.unitId):f.unitId,f.fragmentIndex,f.actualDecodedTimestamp]),frames=new Map(b.frames.filter(f=>f.phase==='hold').map(f=>[key(f,true),f]));
 for(const old of a.frames.filter(f=>f.phase==='hold')){const next=frames.get(key(old));if(!next||!next.nativeComplete||!next.safeArea||next.pixelPresence!==true||!Number.isFinite(next.localContrast)||!Number.isFinite(old.localContrast)||next.localContrast<old.localContrast)return false;}
 const units=new Map(b.units.map(u=>[correspondenceUnits.get(u.unitId),u]));for(const old of a.units){const next=units.get(old.unitId);if(!next||next.status!=='MEASURED'||![next.readableHoldSeconds,old.readableHoldSeconds,next.minimumContrast,old.minimumContrast].every(Number.isFinite)||next.readableHoldSeconds<old.readableHoldSeconds||next.minimumContrast<old.minimumContrast)return false;}
 const observed=r=>{const f=r.provenance.finalArtifactVerification,d=r.provenance.decodedCinema;return {...d,...f.binding,profileId:V.profileId(f.binding.outputProfile),encodedResolution:f.binding.outputProfile.resolution,fps:f.binding.outputProfile.fps,frameCount:f.frames.length};};
 const correspondence=observation.fixedPlanCorrespondence;
 if(!correspondence||correspondence.beforePlanHash!==a.binding.planHash||correspondence.strippedTrialPlanHash!==a.binding.planHash||correspondence.trialPlanHash!==b.binding.planHash)return false;
 // This is a policy-only correction of the already selected composition. Its
 // strict gain is the decoded declared motion above, not an unrelated proxy.
 // Every existing measured axis retains its exact floor; missing stays missing.
 if(a.binding.inputHash!==b.binding.inputHash||a.binding.sourceCommit!==b.binding.sourceCommit||a.binding.rendererVersion!==b.binding.rendererVersion||V.profileId(a.binding.outputProfile)!==V.profileId(b.binding.outputProfile))return false;
 const xobs=observed(before),yobs=observed(after);
 if(Number.isFinite(xobs.lowerTailQuality)&&(!Number.isFinite(yobs.lowerTailQuality)||yobs.lowerTailQuality<xobs.lowerTailQuality))return false;
 const x=before.provenance.decodedCinema?.metrics,y=after.provenance.decodedCinema?.metrics;if(!x||!y)return false;
 return Object.keys(x).every(k=>!Number.isFinite(x[k])||Number.isFinite(y[k])&&y[k]>=x[k]);
};
Q.recordFinalSemanticTravelHistory=async(before,after,args)=>{
 if(!before.provenance.cinemaV3?.selectedEvidence)return;
 const f=after.provenance.finalArtifactVerification;if(f?.status!=='MEASURED'||!f.evidenceId||!before.provenance.finalArtifactVerification.evidenceId||after.validation?.certification?.passed!==true)throw Error('FINAL_REPAIR_VERIFIED_ARTIFACT_REQUIRED');
 const locks=V.lockSignature(args.plan),input=await V.snapshot(args.project,args.audio,args.plan,args.range),old=before.provenance.cinemaV3,budgetPolicy=old.budgetPolicy??V.budgetPolicy(args.project.exportSettings),evidence=await V.finalEvaluation(after,args.plan,args,{input,budgetPolicy,locks});
 if(input.inputHash!==f.binding.inputHash||evidence.videoHash!==f.binding.videoSHA256||evidence.evaluation.planHash!==f.binding.planHash||evidence.evaluation.id!==f.binding.videoSHA256)throw Error('FINAL_REPAIR_HISTORY_BINDING_MISMATCH');
 // This is a post-selection final-artifact refinement, not a new proxy search.
 // Encode, decoder and FAV stages actually completed; no PROXY_MEASURED is claimed.
 const node={planHash:f.binding.planHash,videoHash:f.binding.videoSHA256,eligible:null,eligibilityStatus:'FINAL_ARTIFACT_GATE_NOT_PREENCODE_PROXY',decision:{accepted:null,reason:'AWAITING_FIXED_PLAN_FINAL_ARTIFACT_NONREGRESSION'},stateDomain:'POST_FINAL_ARTIFACT_VERIFICATION',parentArtifactEvidenceId:before.provenance.finalArtifactVerification.evidenceId,finalArtifactEvidenceId:f.evidenceId,stateHistory:[{state:'FINAL_PARENT_SELECTED',planHash:f.binding.planHash},{state:'FULL_ENCODED',videoHash:f.binding.videoSHA256,planHash:f.binding.planHash},{state:'DECODED_QA',videoHash:f.binding.videoSHA256,planHash:f.binding.planHash,finalArtifactEvidenceId:f.evidenceId}],cinemaV5:{after:after.provenance.cinemaV5?.finalEvaluation??null}};
 after.provenance.cinemaV3={version:V.version,input,budgetPolicy,planHash:f.binding.planHash,videoHash:f.binding.videoSHA256,state:'UNREPAIRABLE',history:[...(old.history||[]),node],selectedEvidence:evidence.evaluation,stopReason:'FINAL_ARTIFACT_REFINEMENT; PREENCODE_PROXY_NOT_REMEASURED; CREATIVE_DEFICITS_RETAINED',artistic100Established:false,peakMemoryBytes:null,peakMemoryStatus:'UNMEASURED'};
};
const run=Q.runVerifiedExport;
Q.runVerifiedExport=async(encode,args)=>{
 args={...args,refinementMode:J.exportRefinementMode(args)};
 delete J.lastFinalSemanticTravelTrial;delete J.lastFinalSemanticTravelBaseline;
 const original=args.plan?V.clone(args.plan):null,originalHash=args.plan?Object.getOwnPropertyDescriptor(args.plan,'_provenancePlanHash')?.value:undefined;
 try{
  // Bind the same automatic contract before initial measurement/selection.
  // Imported manual projects remove only this version's automatic metadata.
  if(J.bindAutomaticLyricTemporalPolicy?.(args.plan,args.project))V.invalidate(args.plan);
  // Repeated exports remove only our late grammar-anchor trial policy.
  if(args.project?.autoDirection===true&&args.plan?.cinemaFinalSemanticTravel?.version===version){delete args.plan.cinemaFinalSemanticTravel;V.invalidate(args.plan);}
  const first=await run(encode,args);
  if(args.refinementMode==='fast'){first.provenance.finalSemanticTravelRepair={version,status:'SKIPPED_FAST_MODE',additionalCompletedEncodes:0,observation:{status:'UNMEASURED'},reason:'Additional creative comparison skipped; selected MP4 final verification retained'};first.sidecar=new Blob([JSON.stringify(first.provenance,null,2)],{type:'application/json'});return first;}
  const proposal=args.plan?await Q.proposeFinalSemanticTravel(args.plan,args.project,first.provenance.finalArtifactVerification):null;if(!proposal)return first;
  args.onProgress?.(.995,'採用した構図を保ち、演出の移動だけを完成MP4で再検証しています',{stage:'verify',indeterminate:true});
  // Core certification/decoded observer and independent FAV remain enabled.
  // Frozen post-final history is recorded from those completed observations.
  const trialArgs={...args,plan:proposal.plan,_photoRefining:true,_finalArtifactInput:await V.snapshot(args.project,args.audio,proposal.plan,args.range),onProgress:(_,label)=>args.onProgress?.(.995,label||'演出移動を検証中',{stage:'verify',indeterminate:true})};
  V.invalidate(proposal.plan);let trial,raw,observation={status:'UNMEASURED'},accepted=false,error=null;
  try{raw=await encode(trialArgs);const unchanged=V.clone(proposal.plan);delete unchanged.cinemaFinalSemanticTravel;if(await V.planHash(unchanged)!==first.provenance.finalArtifactVerification.binding.planHash||V.lockSignature(proposal.plan)!==V.lockSignature(args.plan))throw Error('SEMANTIC_TRAVEL_FIXED_PLAN_CHANGED');trial=await Q.guardExport(raw,trialArgs);await Q.recordFinalSemanticTravelHistory(first,trial,trialArgs);observation=Q.measureFinalSemanticTravel(first,trial,proposal.plan);observation.fixedPlanCorrespondence={beforePlanHash:first.provenance.finalArtifactVerification.binding.planHash,strippedTrialPlanHash:await V.planHash(unchanged),trialPlanHash:await V.planHash(proposal.plan)};accepted=Q.finalSemanticTravelDominates(first,trial,proposal.plan,observation);}catch(e){if(args.signal?.aborted||e.name==='AbortError')throw e;error=String(e.message);}
  if(trial?.provenance.cinemaV3?.history?.at(-1)?.stateDomain==='POST_FINAL_ARTIFACT_VERIFICATION')trial.provenance.cinemaV3.history.at(-1).decision={accepted,reason:accepted?'VERIFIED_FIXED_PLAN_FINAL_ARTIFACT_NONREGRESSION':error?'FAILED_FINAL_ARTIFACT_REFINEMENT':'NO_STRICT_FINAL_ARTIFACT_IMPROVEMENT'};
  const record={version,status:accepted?'ACCEPTED':error?'KEPT_ORIGINAL_FAILED_TRIAL':'KEPT_ORIGINAL_NO_STRICT_IMPROVEMENT',targets:proposal.targets,trigger:proposal.trigger,frozenSelectedPlan:true,replannedTrial:false,additionalCompletedEncodes:raw?1:0,beforeVideoSHA256:first.provenance.finalArtifactVerification.binding.videoSHA256,trialVideoSHA256:trial?.provenance.finalArtifactVerification?.binding.videoSHA256??raw?.provenance?.videoSHA256??null,error,observation};
  if(raw)J.lastFinalSemanticTravelTrial={blob:raw.blob,provenance:trial?.provenance??raw.provenance,record,selected:accepted};
  const chosen=accepted?trial:first;if(accepted){J.lastFinalSemanticTravelBaseline={blob:first.blob,provenance:first.provenance,record};V.restorePlan(args.plan,proposal.plan,Object.getOwnPropertyDescriptor(proposal.plan,'_provenancePlanHash')?.value);}
  chosen.provenance.finalSemanticTravelRepair=record;chosen.sidecar=new Blob([JSON.stringify(chosen.provenance,null,2)],{type:'application/json'});return chosen;
 }catch(e){if(args.signal?.aborted&&original)V.restorePlan(args.plan,original,originalHash);throw e;}
};
})();
