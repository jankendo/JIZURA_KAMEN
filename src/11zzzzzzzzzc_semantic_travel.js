/* Verify a local semantic translation after selection; retain the original MP4. */
(()=>{'use strict';const J=window.J,V=J.cinemaV3,Q=J.cinemaV5,version='final-semantic-travel-v1';
const identity=c=>J.canonicalJSON([c.index,c.line,c.start,c.end,String(c.lineText??c.text??'')]);
J.finalSemanticTravelTarget=(p,c)=>!!c&&p.cinemaFinalSemanticTravel?.version===version&&p.cinemaFinalSemanticTravel.targets?.includes(identity(c));
Q.proposeFinalSemanticTravel=async(p,project,artifact)=>{
 if(project?.autoDirection!==true||artifact?.status!=='MEASURED'||!p.musicalPhoto?.cinema?.architecture)return null;
 if(await V.planHash(p)!==artifact.binding.planHash)throw Error('SEMANTIC_TRAVEL_PLAN_BINDING_MISMATCH');
 const targets=p.cuts.filter(c=>c.line>=0&&!c.locked&&!J.photoChoreographyLocked(p,c)&&['light','continuity'].includes(c.grammar?.temporal?.role)).map(identity);
 if(!targets.length)return null;const plan=V.clone(p);plan.cinemaFinalSemanticTravel={version,targets};
 if(V.lockSignature(plan)!==V.lockSignature(p))throw Error('SEMANTIC_TRAVEL_LOCK_CHANGED');
 return {plan,targets,trigger:'Existing selected light/continuity uniform translation was cancelled by animated-bounds anchoring; trial the same selected composition only.'};
};
Q.measureFinalSemanticTravel=(before,after,plan)=>{
 const a=before.provenance?.finalArtifactVerification,b=after.provenance?.finalArtifactVerification;
 if(a?.status!=='MEASURED'||b?.status!=='MEASURED'||a.binding.inputHash!==b.binding.inputHash||a.binding.sourceCommit!==b.binding.sourceCommit||a.binding.rendererVersion!==b.binding.rendererVersion||V.profileId(a.binding.outputProfile)!==V.profileId(b.binding.outputProfile))return {status:'UNMEASURED',reason:'MATCHED_FINAL_ARTIFACTS_REQUIRED',targets:[]};
 const key=f=>J.canonicalJSON([f.unitId,f.fragmentIndex,f.actualDecodedTimestamp]),old=new Map(a.frames.map(f=>[key(f),f])),rows=[];
 if(old.size!==a.frames.length||new Set(b.frames.map(key)).size!==b.frames.length)return {status:'UNMEASURED',reason:'DUPLICATE_ACTUAL_FRAME_IDENTITY',targets:[]};
 for(let i=0;i<plan.cuts.length;i++){
  const cut=plan.cuts[i];if(!J.finalSemanticTravelTarget(plan,cut))continue;
  const points=[],missing=[];for(const f of b.frames.filter(f=>f.fragmentIndex===i&&f.phase==='hold')){
   const prior=old.get(key(f));if(!prior){missing.push({time:f.actualDecodedTimestamp,reason:'OLD_ACTUAL_FRAME_ABSENT'});continue;}
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
 const key=f=>J.canonicalJSON([f.unitId,f.fragmentIndex,f.actualDecodedTimestamp]),frames=new Map(b.frames.filter(f=>f.phase==='hold').map(f=>[key(f),f]));
 for(const old of a.frames.filter(f=>f.phase==='hold')){const next=frames.get(key(old));if(!next||!next.nativeComplete||!next.safeArea||next.pixelPresence!==true||!Number.isFinite(next.localContrast)||!Number.isFinite(old.localContrast)||next.localContrast<old.localContrast)return false;}
 const units=new Map(b.units.map(u=>[u.unitId,u]));for(const old of a.units){const next=units.get(old.unitId);if(!next||next.status!=='MEASURED'||![next.readableHoldSeconds,old.readableHoldSeconds,next.minimumContrast,old.minimumContrast].every(Number.isFinite)||next.readableHoldSeconds<old.readableHoldSeconds||next.minimumContrast<old.minimumContrast)return false;}
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
const run=Q.runVerifiedExport;
Q.runVerifiedExport=async(encode,args)=>{
 delete J.lastFinalSemanticTravelTrial;delete J.lastFinalSemanticTravelBaseline;
 const original=args.plan?V.clone(args.plan):null,originalHash=args.plan?Object.getOwnPropertyDescriptor(args.plan,'_provenancePlanHash')?.value:undefined;
 try{
  // The original selection pipeline sees the original renderer, including on a
  // retry of our own previously repaired plan. Authored inputs/locks are untouched.
  if(args.project?.autoDirection===true&&args.plan?.cinemaFinalSemanticTravel?.version===version){delete args.plan.cinemaFinalSemanticTravel;V.invalidate(args.plan);}
  const first=await run(encode,args),proposal=args.plan?await Q.proposeFinalSemanticTravel(args.plan,args.project,first.provenance.finalArtifactVerification):null;if(!proposal)return first;
  args.onProgress?.(.995,'採用した構図を保ち、演出の移動だけを完成MP4で再検証しています',{stage:'verify',indeterminate:true});
  // One frozen candidate still uses normal decoded Cinema history/certification.
  // Explicit one-attempt mode skips preparation/repair search, never the observer.
  const trialArgs={...args,plan:proposal.plan,_photoRefining:false,refinementAttempts:1,_finalArtifactInput:await V.snapshot(args.project,args.audio,proposal.plan,args.range),onProgress:(_,label)=>args.onProgress?.(.995,label||'演出移動を検証中',{stage:'verify',indeterminate:true})};
  V.invalidate(proposal.plan);let trial,raw,observation={status:'UNMEASURED'},accepted=false,error=null;
  try{raw=await encode(trialArgs);const unchanged=V.clone(proposal.plan);delete unchanged.cinemaFinalSemanticTravel;if(await V.planHash(unchanged)!==first.provenance.finalArtifactVerification.binding.planHash||V.lockSignature(proposal.plan)!==V.lockSignature(args.plan))throw Error('SEMANTIC_TRAVEL_FIXED_PLAN_CHANGED');trial=await Q.guardExport(raw,trialArgs);observation=Q.measureFinalSemanticTravel(first,trial,proposal.plan);observation.fixedPlanCorrespondence={beforePlanHash:first.provenance.finalArtifactVerification.binding.planHash,strippedTrialPlanHash:await V.planHash(unchanged),trialPlanHash:await V.planHash(proposal.plan)};accepted=Q.finalSemanticTravelDominates(first,trial,proposal.plan,observation);}catch(e){if(args.signal?.aborted||e.name==='AbortError')throw e;error=String(e.message);}
  const record={version,status:accepted?'ACCEPTED':error?'KEPT_ORIGINAL_FAILED_TRIAL':'KEPT_ORIGINAL_NO_STRICT_IMPROVEMENT',targets:proposal.targets,trigger:proposal.trigger,frozenSelectedPlan:true,replannedTrial:false,additionalCompletedEncodes:raw?1:0,beforeVideoSHA256:first.provenance.finalArtifactVerification.binding.videoSHA256,trialVideoSHA256:trial?.provenance.finalArtifactVerification?.binding.videoSHA256??raw?.provenance?.videoSHA256??null,error,observation};
  if(raw)J.lastFinalSemanticTravelTrial={blob:raw.blob,provenance:trial?.provenance??raw.provenance,record,selected:accepted};
  const chosen=accepted?trial:first;if(accepted){if(trial.provenance.cinemaV3?.history)trial.provenance.cinemaV3.history=[...(first.provenance.cinemaV3?.history||[]),...trial.provenance.cinemaV3.history];J.lastFinalSemanticTravelBaseline={blob:first.blob,provenance:first.provenance,record};V.restorePlan(args.plan,proposal.plan,Object.getOwnPropertyDescriptor(proposal.plan,'_provenancePlanHash')?.value);}
  chosen.provenance.finalSemanticTravelRepair=record;chosen.sidecar=new Blob([JSON.stringify(chosen.provenance,null,2)],{type:'application/json'});return chosen;
 }catch(e){if(args.signal?.aborted&&original)V.restorePlan(args.plan,original,originalHash);throw e;}
};
})();
