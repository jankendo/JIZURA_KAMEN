/* Two explicit operations. Drafts never claim final-scale certification. */
(()=>{'use strict';
const J=window.J,copy=J.clonePhotoRenderPlan;
const abort=s=>{if(s?.aborted)throw new DOMException('Aborted','AbortError');};
const freeze=x=>{if(x&&typeof x==='object'){Object.freeze(x);for(const v of Object.values(x))freeze(v);}return x;};
// Workflow metadata is output, not an input to the legacy identity contract.
const identity=J.songNativeInputIdentityV7;
J.songNativeInputIdentityV7=(q,a)=>{if(!q.randomWorkflowV16)return identity(q,a);const p={...q};delete p.randomWorkflowV16;return identity(p,a);};
J.randomDraftSeedV16=()=>{const n=new Uint32Array(1);if(globalThis.crypto?.getRandomValues)crypto.getRandomValues(n);else n[0]=Math.floor(Math.random()*4294967296);return n[0];};
J.selectedDraftSnapshotV16=(q,p,a)=>{
 const d=q.randomWorkflowV16;
 if(!d||d.state!=='RANDOM_DRAFT_READY'||d.inputHash!==J.songNativeInputIdentity(q,a))throw Error('V16_DRAFT_INPUT_CHANGED');
 if(J.canonicalJSON(p.cuts)!==J.canonicalJSON(d.originalCuts))throw Error('V16_DRAFT_EDITED_REGENERATE');
 return freeze(copy({draftId:d.draftId,inputHash:d.inputHash,seed:d.seed,originalCuts:d.originalCuts,originalCreativeGenome:d.originalCreativeGenome,locks:J.cinemaV3.lockSignature(p),rendererCompatibilityId:d.rendererCompatibilityId}));
};
const plan=J.plan;
J.plan=(q,a)=>{
 const p=plan(q,a),d=q.randomWorkflowV16;
 if(d?.state==='RANDOM_DRAFT_READY'&&d.inputHash===J.songNativeInputIdentity(q,a)&&d.rendererCompatibilityId===p.songNativeDirection?.rendererCompatibilityId){
  p.cuts=copy(d.originalCuts);p.randomDraftV16=true;
 }
 return p;
};
J.generateRandomDraftV16=async(q,a,{signal,onProgress,seed=J.randomDraftSeedV16(),initialPlan=null}={})=>{
 const started=performance.now();abort(signal);q.seed=seed;
 const set=await J.generateJizuraDirectionV15(q,a,{signal});abort(signal);
 q.autoDirection=true;q.artDirection=J.makeArtDirection(q,a,set.recommended.proposal);
 // Keep user font choices. Fonts, decoded audio and palette remain input-owned.
 const inputIdentity=J.songNativeInputIdentity(q,a),p=J.plan(q,a),R=new J.Renderer(),cv=Object.assign(document.createElement('canvas'),{width:256,height:Math.round(256*p.H/p.W)}),mask=cv.cloneNode();
 let frames=0,candidates=0;const probe=J.createRegistryRenderProbe(p,R,cv,mask,{production:true,onFrame:()=>frames++}),catalog=J.explorationCatalogV13(p);
 const selected=[];
 try{
  if(p.customBg?.enabled&&p.customBg.dataUrl)await R.loadCustomBackground(p.customBg.dataUrl);await R.loadAssetDeck?.(p);
  await J.ensureFonts(q.lyrics+(q.title||'')+(q.artist||''),J.fontsOfPlan(p));abort(signal);
  for(const c of p.cuts.filter(c=>c.line>=0)){
   abort(signal);
   if(J.songNativeLockedV8(p,c)){const locked=initialPlan?.cuts.filter(x=>x.line===c.line)||[c];selected.push(...copy(locked));continue;}
   let found=null;const rejected=[];
   for(let attempt=0;attempt<32;attempt++){
    candidates++;const cut=J.initialFinishV15(p,J.randomProposalV15(p,c,catalog,attempt));
    const e=probe({...p,style:cut.style,styleKey:cut.styleKey},cut,Math.min(cut.dur*.65,Math.max(cut.inDur+.08,cut.dur*.5)));
    if(e.renderErrors?.length)continue;rejected.push({full:e.full,readable:e.readable,eligible:e.eligible,geometry:e.geometry,safe:e.safe,stage:e.temporalStage,contrast:e.contrast});
    if(e.eligible&&e.readable){found=cut;break;}
   }
   if(!found)throw Object.assign(Error('V16_NO_RENDERABLE_DRAFT_LINE_'+c.line),{diagnostic:{line:c.line,candidates,frames,rejected:rejected.slice(0,3)}});
   selected.push(found);onProgress?.({current:selected.length,total:p.lines.length,label:'ランダム案のプレビューを準備しています'});await new Promise(r=>setTimeout(r,0));
  }
  J.installRegistryStoryboardV8(p,selected.map(cut=>({line:cut.line,cut})));
  // Locked multi-cut lines retain the exact source cuts.
  if(initialPlan){
   const lockedLines=new Set(p.cuts.filter(c=>c.line>=0&&J.songNativeLockedV8(p,c)).map(c=>c.line)),seen=new Set();
   p.cuts=p.cuts.flatMap(c=>{if(!lockedLines.has(c.line))return [c];if(seen.has(c.line))return [];seen.add(c.line);return copy(initialPlan.cuts.filter(x=>x.line===c.line));});
   p.cuts.forEach((c,i)=>{c.index=i;});
  }
  abort(signal);if(inputIdentity!==J.songNativeInputIdentity(q,a))throw Error('V16_DRAFT_INPUT_CHANGED');
  const draft={version:16,state:'RANDOM_DRAFT_READY',draftId:'draft-'+seed+'-'+Date.now(),seed,inputHash:J.songNativeInputIdentity(q,a),rendererCompatibilityId:p.songNativeDirection.rendererCompatibilityId,originalCuts:copy(p.cuts),originalCreativeGenome:p.cuts.filter(c=>c.line>=0).map(c=>({line:c.line,genome:J.creativeGenomeV15(c)})),certification:'UNOPTIMIZED_NOT_EXPORT_CERTIFIED',metrics:{wallMs:performance.now()-started,rendererFrames:frames,candidates,probe640:0,qaObservations:0,fullEncodes:0}};
  q.randomWorkflowV16=draft;p.randomDraftV16=true;return {project:q,plan:p,draft};
 }finally{R.disposeAssets?.();cv.width=cv.height=mask.width=mask.height=1;}
};
// Exact source first; only actual failure reaches the existing bounded causal
// recovery. No independent genome exploration or beauty-score search is used.
const optimize=J.optimizeCreativeLineV10;
J.optimizeCreativeLineV10=async args=>{
 if(!args.finishSelectedDraft)return optimize(args);
 const {p,c,f,sample,phases,signal,audio}=args,source=args.initialCuts?.find(x=>x.line===c.line);
 if(!source)throw Error('V16_MISSING_SELECTED_LINE');abort(signal);
 const cut=copy(source),times=phases(cut),checks=times.map(t=>sample({...p,style:cut.style,styleKey:cut.styleKey,motionObservationV14:true},cut,t));
 if(checks.some(e=>e.renderErrors?.length))throw Error('V16_RENDERER_ERROR');
 Object.assign(checks,{planWidthV14:p.W,planHeightV14:p.H,cutTextV14:cut.lineText});
 const genome=J.creativeGenomeV15(source),descriptor=J.motionDescriptorV14(checks,p),intent=J.songVisualIntentV11(p,audio,c,f),fit=J.scoreExplorationV13(cut,f,intent,checks,p),hold=checks.find(e=>e.temporalStage==='HOLD'&&e.readable)||checks[0];
 const strip=({mask,raster,backgroundRasterV14,...e})=>e;
 let row={...fit,cut,times,checks,features:f,intent,descriptor,safe:checks.every(e=>e.eligible)&&checks.some(e=>e.temporalStage==='HOLD'&&e.readable),layout:cut.layout,styleKey:cut.styleKey,font:cut.params.font,params:cut.params,evidence:strip(hold),phaseEvidence:checks.map(strip),signature:descriptor.signature,typographySignature:descriptor.typography,rasterSignature:hold.raster,attempts:[],ablations:[],optimizerEvidence:{explorationVersion:15,compared:1,budget:49,catalog:[],counts:{},axes:fit.dimensions,genome:{generated:genome,final:genome,changedRoles:[],retention:1},search:{fullRandomGenomeTrials:0,newGenomeSwitches:0},artisticQuality:'UNVERIFIED'}};
 if(!row.safe){
  const failures=checks.flatMap((e,i)=>!e.eligible?[{...J.scaleFailureV112(cut,times[i],e,p),check:e}]:[]);
  let recovered=[],current=row;
  for(let batch=0;batch<3&&!recovered.length;batch++){
   recovered=await J.recoverDirectionLineV112(p,current,failures,{sample,phases,audio,signal,budget:16,finishSelectedDraft:true});
   if(recovered.continuationV16)current={...current,...recovered.continuationV16};
  }
  if(!recovered.length)throw Object.assign(Error('V16_SELECTED_LINE_UNSAFE_'+c.line),{diagnostic:recovered.diagnostic});row=recovered[0];
 }
 row.lightSafetyV15=J.checkRandomLightV15(p,row.cut,sample,signal);
 return [row];
};
J.finishSelectedDraftV16=async(q,p,a,snapshot,{signal,onProgress}={})=>{
 const started=performance.now();abort(signal);
 const d=q.randomWorkflowV16;
 if(!d||snapshot.draftId!==d.draftId||snapshot.inputHash!==J.songNativeInputIdentity(q,a)||snapshot.rendererCompatibilityId!==p.songNativeDirection?.rendererCompatibilityId||J.canonicalJSON(snapshot.originalCuts)!==J.canonicalJSON(p.cuts)||snapshot.locks!==J.cinemaV3.lockSignature(p))throw Error('V16_STALE_DRAFT');
 const trial=copy(p);
 await J.searchSongNativeCandidates(trial,null,a,{signal,onProgress,finishSelectedDraft:true,initialCuts:snapshot.originalCuts,initialPlan:p});abort(signal);
 if(snapshot.inputHash!==J.songNativeInputIdentity(q,a))throw Error('V16_DRAFT_INPUT_CHANGED');
 // Include locked lines in final composed safety, while never editing them.
 const R=new J.Renderer(),cv=Object.assign(document.createElement('canvas'),{width:256,height:Math.round(256*trial.H/trial.W)}),probe=J.createRegistryRenderProbe(trial,R,cv,cv.cloneNode(),{production:true});
 try{
  if(trial.customBg?.enabled&&trial.customBg.dataUrl)await R.loadCustomBackground(trial.customBg.dataUrl);await R.loadAssetDeck?.(trial);
  for(const c of trial.cuts.filter(c=>c.line>=0&&J.songNativeLockedV8(trial,c))){
   const checks=J.directionPhasesV11(trial,c,a).map(t=>{abort(signal);return probe.verifyScale(trial,c,t);});
   if(!checks.every(e=>e.eligible)||!checks.some(e=>e.temporalStage==='HOLD'&&e.readable))throw Error('V16_LOCKED_LINE_UNSAFE_'+c.line);
  }
 }finally{R.disposeAssets?.();}
 J.assertSelectionV9(trial,a);
 const changes=trial.cuts.filter(c=>c.line>=0).map(c=>{
  const original=snapshot.originalCuts.find(x=>x.line===c.line&&x.index===c.index)||snapshot.originalCuts.find(x=>x.line===c.line),from=J.creativeGenomeV15(original),to=J.creativeGenomeV15(c),changedRoles=J.genomeChangesV15(from,to),trace=trial.songNativeDirection.selection.traces.find(t=>t.line===c.line);
  return {line:c.line,original:from,final:to,changedRoles,reason:changedRoles.length?'MEASURED_SAFETY_FAILURE_CAUSAL_ROLE_REPAIR':J.canonicalJSON(original)===J.canonicalJSON(c)?'UNCHANGED':'NUMERIC_READABILITY_FINISH',safety:trace?.creative?.recovery||null};
 });
 return {plan:trial,changes,metrics:{wallMs:performance.now()-started,rendererFrames:trial.songNativeDirection.selection.framesCompared,qaObservations:0,fullEncodes:0},scaleSafety:trial.songNativeDirection.selection.multiScaleEvidence};
};
})();
