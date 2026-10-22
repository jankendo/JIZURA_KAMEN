/* v11.2 keeps the v9 renderer and v11 optimizer contracts. Optional variants
   never weaken the recommendation's temporal/readability requirements. */
(()=>{'use strict';const J=window.J,copy=J.clonePhotoRenderPlan,mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const key=c=>J.canonicalJSON(c),strip=({mask,raster,...e})=>e;
const abort=s=>{if(s?.aborted)throw new DOMException('Aborted','AbortError');};
const roles=c=>Object.fromEntries(['styleKey','layout','enter','hold','exit','cam','bg','treat','decor','registryFxV9','trans'].map(g=>[g,g==='decor'?(c.decor||[]).map(x=>x.id):c[g]??null]));
J.scaleFailureV112=(c,t,e,p)=>{
 const stage=e.temporalStage||'UNMEASURED',contrast=e.compositedContrast?.renderedVsBackgroundContrastP10??e.contrast?.renderedVsBackgroundContrastP10??null,reasons=[];
 if(contrast!==null&&contrast<3)reasons.push(e.compositedContrast&&c.registryFxV9?'FX_GLYPH_CONTRAST':'GLYPH_CONTRAST');
 if(stage==='HOLD'&&(e.full===false||e.advancedChecks?.some(x=>!x.complete)))reasons.push('MISSING_PRIMARY_GLYPHS');
 if(e.height!=null&&e.height<=.035)reasons.push('GLYPH_SIZE');
 if(e.safe===false)reasons.push('SAFE_AREA');
 if(e.geometry?.some(x=>!x.readable))reasons.push('GLYPH_GEOMETRY_OR_ALPHA');
 if(e.renderErrors?.length)reasons.push('RENDERER_ERROR');
 if(!reasons.length)reasons.push(e.eligible?'NO_READABLE_HOLD':'UNMEASURED_OR_TEMPORAL_SAFETY');
 return {line:c.line,displayLine:c.line+1,time:c.start+t,offset:t,stage,techniques:roles(c),reasons,observed:{contrastP10:contrast,full:e.full??null,safe:e.safe??null,height:e.height??null,ink:e.ink??null,geometry:e.geometry||null,core:e.advancedChecks||null},criteria:{contrastP10Min:3,heightMinExclusive:.035,inkMinExclusive:8,safeBounds:{x:[.105,.895],y:[.075,.925]},holdGeometry:{minAlpha:.55,collisionMax:0,shapeRatio:[.68,1.5],maxGlyphHeight:p?(p.H>p.W?(J.graphemes(String(c.text??c.lineText).replace(/\s/g,'')).length<=4?.25:.145):(J.graphemes(String(c.text??c.lineText).replace(/\s/g,'')).length<=4?.29:.195)):null},primaryCoreCoverage:1,hold:'complete primary source/core; original geometry/alpha/safe bounds',entryMax:Math.min(.22,c.dur*.15),exitMax:Math.min(.12,c.dur*.08)}};
};
const exhausted=(line,diagnostic)=>Object.assign(Error('V11_NO_MULTISCALE_SAFE_CANDIDATE_LINE_'+line),{code:'V11_SCALE_FRONTIER_EXHAUSTED',diagnostic});
const legacyScale=J.confirmDirectionScaleV11;
J.confirmDirectionScaleV11=async(p,portfolios,initial,sample,phases,signal,options={})=>{
 if(!J.isSongDerivedV11(p))return legacyScale(p,portfolios,initial,sample,phases,signal);
 abort(signal);if(!initial.picks.length)return {...initial,scaleSafety:{status:'NOT_APPLICABLE',width:640,entries:[],rejected:[],recovery:[]}};
 if(typeof sample.verifyScale!=='function')throw Error('V11_MISSING_DETAIL_PROBE');
 const candidates=portfolios.map(s=>({...s,candidates:[...s.candidates]})),rejected=[],recovery=[],expanded=new Set(),cache=options.detailCache||new Map();let selected=initial;
 // Every rejection deletes a distinct state. At most one bounded expansion per
 // failed line; the termination budget includes those possible extra states.
 let remaining=candidates.reduce((n,s)=>n+s.candidates.length,0)+(options.mode==='alternative'?0:candidates.length*12);
 while(remaining-->0){
  abort(signal);const trial=copy(p);J.installRegistryStoryboardV8(trial,selected.picks.map(x=>({line:x.line,cut:x.cut})));
  const context=J.canonicalJSON({cuts:trial.cuts,style:trial.styleKey,events:trial.events}),entries=[],bad=[];
  const checkOrder=[...selected.picks];if(options.mode==='alternative'){const priority=x=>(options.changedLines||[]).some(line=>line===x.line)?2:(options.changedLines||[]).some(line=>Math.abs(line-x.line)===1)?1:0;checkOrder.sort((a,b)=>priority(b)-priority(a)||a.line-b.line);}
  for(const pick of checkOrder){
   const c=trial.cuts.find(c=>c.line===pick.line);if(!c)throw Error('V112_CORRUPT_STORYBOARD');
   const times=phases(c),checks=times.map(t=>{abort(signal);const k=context+'|'+c.line+'|'+t;if(cache.has(k))return cache.get(k);const e=strip(sample.verifyScale(trial,c,t));if(e.renderErrors?.length)throw Object.assign(Error('V112_RENDERER_ERROR'),{code:'RENDERER_ERROR',diagnostic:e.renderErrors});cache.set(k,e);if(cache.size>192)cache.delete(cache.keys().next().value);return e;});
   entries.push({line:c.line,checks});if(!checks.every(e=>e.eligible)||!checks.some(e=>e.temporalStage==='HOLD'&&e.readable))bad.push({pick,cut:c,failures:checks.flatMap((e,i)=>!e.eligible||!checks.some(x=>x.temporalStage==='HOLD'&&x.readable)?[J.scaleFailureV112(c,times[i],e,p)]:[])});if(bad.length&&options.mode==='alternative')break;
  }
  if(!bad.length)return {...selected,scaleSafety:{status:'MEASURED_SAFE_SEQUENCE',width:640,entries,rejected,recovery:recovery.map(x=>({...x,safeCandidateRemains:true}))}};
  for(const {pick,cut,failures} of bad){
   const step=candidates.find(x=>x.line===pick.line);if(!step)throw Error('V112_CORRUPT_PORTFOLIO');
   step.candidates=step.candidates.filter(x=>key(x.cut)!==key(pick.cut));
   rejected.push({line:pick.line,reason:'LARGER_RASTER_GLYPH_CONTRAST_OR_GEOMETRY',techniques:roles(cut),failures});
   if(!step.candidates.length&&options.mode!=='alternative'&&!expanded.has(pick.line)&&sample.recoverLine){
    expanded.add(pick.line);abort(signal);const added=await sample.recoverLine(p,pick,failures,12);abort(signal);
    if(!Array.isArray(added))throw Error('V112_INVALID_RECOVERY_RESULT');
    const rows=added.filter(x=>key(x.cut)!==key(pick.cut)).slice(0,12);step.candidates.push(...rows);portfolios.find(x=>x.line===step.line).candidates.push(...rows);
    recovery.push({line:step.line,attempted:true,added:rows.length,examined:added.examined??rows.length,budget:12,techniques:rows.map(x=>roles(x.cut))});
   }
   if(!step.candidates.length)throw exhausted(step.line,{scope:options.mode||'recommendation',rejected,recovery,safeCandidateRemains:false});
  }
  selected=J.chooseCreativeArcV10(p,candidates,selected);await new Promise(r=>setTimeout(r,0));
 }
 throw Object.assign(Error('V112_SCALE_BUDGET_EXHAUSTED'),{code:'V112_SCALE_BUDGET_EXHAUSTED'});
};
J.recoverDirectionLineV112=async(p,pick,failures,{sample,phases,audio,signal,budget=12,frontier=[]})=>{
 const c=pick.cut;if(J.songNativeLockedV8(p,c))throw Error('V112_RECOVERY_LOCKED_LINE');
 const index=J.directionCapabilityIndexV11(p),f=pick.features||J.songLineFeaturesV8(p,audio,c),intent=pick.intent||J.songVisualIntentV11(p,audio,c,f),rows=[],seen=new Set([key(c)]),hypotheses=[];
 // Same-input ablations address observed failure mechanisms first. Other
 // hypotheses use unvisited live layouts/styles; never a fixed finished look.
 for(const row of J.registryGeometryRepresentatives(frontier,.25).candidates.slice(0,4))hypotheses.push(copy(row.cut));
 const reasons=failures.flatMap(x=>x.reasons);
 if(c.registryFxV9&&reasons.some(x=>/CONTRAST/.test(x)))hypotheses.push(J.changeDirectionRoleV11(c,'fx',null));
 if(reasons.some(x=>/GEOMETRY|SAFE_AREA/.test(x))&&c.cam!=='stillCamera')hypotheses.push(J.changeDirectionRoleV11(c,'cam','stillCamera'));
 const layouts=J.directionRepresentativesV11(index.filter(x=>x.group==='layout'&&x.eligible&&x.id!==c.layout&&(!J.LAYOUTS[x.id].fits||J.LAYOUTS[x.id].fits(f.length))).map(x=>({...x,prior:0})),6,index.filter(x=>x.group==='layout'&&x.id===c.layout));
 const styles=[{style:c.styleKey},...J.directionStyleCandidatesV11(p,audio,f,true).filter(x=>x.style!==c.styleKey).slice(0,2)];
 for(const st of styles)for(const layout of (st.style===c.styleKey?layouts:reasons.some(x=>/CONTRAST/.test(x))?[{id:c.layout},...layouts]:layouts).slice(0,st.style===c.styleKey?6:2)){
  const style=J.STYLES[st.style],sp={...p,style,styleKey:st.style};
  const cut=J.registryCandidateCut(sp,c,layout.id,c.params.font||'embedded_bold',c.enter,c.hold);
  for(const name of ['cam','camP','bg','bgP','treat','treatP','decor','enter','inDur','hold','exit','outDur','trans','transP','transDur','registryFxV9'])if(c[name]!==undefined)cut[name]=copy(c[name]);
  delete cut.generatedMotionV7;delete cut.grammar;delete cut.photoChoreography;
  hypotheses.push({...cut,style,styleKey:st.style,registrySelectedV8:true});
 }
 for(const cut of hypotheses){
  abort(signal);if(seen.has(key(cut)))continue;if(seen.size>=budget+1)break;seen.add(key(cut));
  const sp={...p,style:cut.style,styleKey:cut.styleKey},checks=phases(cut).map(t=>sample(sp,cut,t));
  if(checks.some(e=>e.renderErrors?.length))throw Error('V112_RENDERER_ERROR');
  if(!checks.every(e=>e.eligible)||!checks.some(e=>e.temporalStage==='HOLD'&&e.readable))continue;
  const fit=J.scoreDirectionV11(cut,f,intent,checks,pick.score),hold=checks.find(e=>e.temporalStage==='HOLD'&&e.readable),catalog=copy(pick.optimizerEvidence?.catalog||index);
  for(const row of catalog)if(checks.some(e=>e.registryDispatchV11?.some(d=>d.group===row.group&&d.id===row.id))){row.probed=true;row.safe=true;}
  rows.push({...pick,...fit,cut,params:cut.params,styleKey:cut.styleKey,layout:cut.layout,checks,times:phases(cut),evidence:strip(hold),phaseEvidence:checks.map(strip),signature:J.registryInkSignature(hold.mask,256,Math.round(256*p.H/p.W)),typographySignature:J.registryTypographySignature(hold.mask,256,Math.round(256*p.H/p.W)),rasterSignature:hold.raster,features:f,intent,ablations:[],optimizerEvidence:{...copy(pick.optimizerEvidence||{}),catalog,counts:Object.fromEntries(['registered','callable','eligible','probed','safe'].map(k=>[k,catalog.filter(x=>x[k]).length])),axes:fit.dimensions,ablations:[],recovery:{status:'MEASURED_LOW_RASTER_PENDING_SCALE',line:c.line},unmeasured:['artisticQuality','recoveryRoleAblations']}});
  if(rows.length>=4)break;await new Promise(r=>setTimeout(r,0));
 }
 rows.examined=seen.size-1;return rows;
};
J.observedVariationV112=(a,b)=>{
 const rgb=(x,y)=>x?.length&&x.length===y?.length?mean(x.map((v,i)=>Math.abs(v-y[i]))):null;
 const times=(a.checks||[]).map(e=>{const other=b.checks?.find(x=>x.sampleOffset===e.sampleOffset);return other?{offset:e.sampleOffset,difference:rgb(e.raster,other.raster)}:null;}).filter(x=>x&&Number.isFinite(x.difference));
 return {glyph:J.registryInkDistance(a.signature,b.signature),rgb:rgb(a.rasterSignature,b.rasterSignature),temporal:times.length?mean(times.map(x=>x.difference)):null,times};
};
// Use the already-rendered frontier to decide whether the style prior needs
// another hypothesis. Style profiles describe registries, not genre templates.
J.additionalStylesV112=(p,a,f,ranked,visited)=>{
 const remaining=J.directionStyleCandidatesV11(p,a,f,true).filter(x=>!visited.some(y=>y.style===x.style));
 if(!ranked.length)return remaining; // Preserve the existing no-safe fallback.
 const demand=J.clamp((f.change||0)*.4+(f.onset||0)*.3+(f.flux||0)*.3),best=Math.max(...ranked.map(x=>x.musicFit||0));
 const spread=Math.max(0,...ranked.flatMap((x,i)=>ranked.slice(i+1).map(y=>J.registryInkDistance(x.signature,y.signature)||0)));
 if(ranked.length>=3&&best>=.85&&(demand<.3||spread>=demand*.5))return [];
 const seeds=visited.map(x=>J.buildStyleProfile(x.style)),chosen=[];
 const distance=(a,b)=>mean(Object.keys(a).filter(k=>typeof a[k]==='number'&&typeof b[k]==='number').map(k=>Math.abs(a[k]-b[k])));
 while(remaining.length&&chosen.length<Math.ceil(1+demand*2)){
  remaining.sort((a,b)=>{const score=x=>x.score+Math.min(1,...[...seeds,...chosen.map(x=>J.buildStyleProfile(x.style))].map(y=>distance(J.buildStyleProfile(x.style),y)))*demand*.4;return score(b)-score(a)||a.style.localeCompare(b.style);});chosen.push(remaining.shift());
 }
 return chosen;
};
// Reuse the exact same-time ablations the optimizer already rendered. No extra
// images or a second drawing implementation are needed for role observations.
J.temporalRoleContributionV112=(c,times,checks,controls,intent)=>{
 const rgb=(a,b)=>a?.length&&a.length===b?.length?mean(a.map((v,i)=>Math.abs(v-b[i]))):null;
 const samples=times.map((t,i)=>({offset:t,stage:checks[i].temporalStage,spatialDifference:rgb(checks[i].raster,controls[i].raster),withRoleActivity:i?rgb(checks[i].raster,checks[i-1].raster):null,withoutRoleActivity:i?rgb(controls[i].raster,controls[i-1].raster):null,audioActivity:i?(()=>{const events=intent.events.filter(e=>e.time>=times[i-1]&&e.time<t);return events.length?mean(events.map(e=>e.value)):null;})():null}));
 const pairs=samples.filter(x=>[x.withRoleActivity,x.withoutRoleActivity,x.audioActivity].every(Number.isFinite));
 const fit=k=>{const a=pairs.map(x=>x.audioActivity),v=pairs.map(x=>x[k]),maxA=Math.max(0,...a),maxV=Math.max(0,...v);return pairs.length>1&&maxA-Math.min(...a)>.02&&maxV>1e-6?1-mean(a.map((x,i)=>Math.abs(x/maxA-v[i]/maxV))):null;};
 const one=fit('withRoleActivity'),zero=fit('withoutRoleActivity'),safe=controls.every(e=>e.eligible);
 return {status:samples.every(x=>Number.isFinite(x.spatialDifference))?'MEASURED':'UNMEASURED',controlSafe:safe,samples,acousticFitGain:safe&&one!==null&&zero!==null?one-zero:null,source:'same input/time/composition, one registered role removed; composited marginal contribution including interactions; not isolated RGBA or art quality'};
};
const layers=J.directionLayersV111;J.directionLayersV111=(item,p)=>{
 const result=layers(item,p);
 for(const [name,group,id] of [['background','bg',item.cut.bg],['decoration','decor',item.cut.decor?.[0]?.id],['fx','fx',item.cut.registryFxV9]]){
  const ab=item.ablations?.find(x=>x.group===group&&x.id===id&&x.status==='MEASURED'&&x.temporalContribution?.status==='MEASURED'),samples=ab?.temporalContribution.samples,hold=samples?.filter(x=>x.stage==='HOLD');
  result[name]=hold?.length?{status:'MEASURED',value:[mean(hold.map(x=>x.spatialDifference)),mean(samples.map(x=>x.spatialDifference))],source:ab.temporalContribution.source,controlSafe:ab.controlSafe,acousticFitGain:ab.temporalContribution.acousticFitGain}: {status:'UNMEASURED'};
 }
 return result;
};
const legacyAlternatives=J.registryAlternativesV9;
J.registryAlternativesV9=async(p,portfolios,winner,sample,phases,selection,options={})=>{
 if(!J.isSongDerivedV11(p))return legacyAlternatives(p,portfolios,winner,sample,phases,selection);
 abort(options.signal);if(winner.picks.length&&winner.scaleSafety?.status!=='MEASURED_SAFE_SEQUENCE')throw Error('V112_UNCONFIRMED_RECOMMENDATION');const before=await J.cinemaV3.planHash(p),detailCache=new Map(),attempts=[];
 const unchanged=async()=>{abort(options.signal);if(await J.cinemaV3.planHash(p)!==before)throw Error('INPUT_CHANGED_DURING_ALTERNATIVE_SEARCH');};
 const opportunities=portfolios.flatMap(step=>{const base=winner.picks.find(x=>x.line===step.line);if(!base)throw Error('V112_MISSING_RECOMMENDATION_LINE');return step.candidates.filter(x=>key(x.cut)!==key(base.cut)).map(candidate=>{const variation=J.observedVariationV112(base,candidate),observed=variation.glyph,rgb=variation.rgb,fit=candidate.dimensions?.musicFit??candidate.musicFit??0,demand=candidate.intent?.changeDemand??candidate.features?.change??0;
  return {line:step.line,base,candidate,observed,rgb,temporal:variation.temporal,priority:fit+demand*.2+(candidate.features?.boundaryConfidence??0)*.1-Math.max(0,base.score-candidate.score)*.2};});}).filter(x=>(x.observed??0)>1e-5||(x.rgb??0)>1e-5||(x.temporal??0)>1e-5).sort((a,b)=>b.priority-a.priority||a.line-b.line||key(a.candidate.cut).localeCompare(key(b.candidate.cut)));
 const finish=(status,extra={})=>{selection.alternativeSearch={status,attempted:attempts.length,budget:8,attempts,...extra};return [];};
 // Freeze all other lines to their safe recommendation. A variant can retain
 // repeated phrases and quiet sections; no all-lines exclusion is imposed.
 const unique=new Set(),frontier=opportunities.filter(x=>{const token=key(x.candidate.cut);if(unique.has(token))return false;unique.add(token);return true;});
 const proposals=frontier.slice(0,6).map(x=>({changes:[x]})),pairs=[];
 for(let i=0;i<Math.min(6,frontier.length);i++)for(let j=i+1;j<Math.min(6,frontier.length);j++){
  const a=frontier[i],b=frontier[j];if(a.line===b.line||Math.max(a.candidate.intent?.changeDemand??0,b.candidate.intent?.changeDemand??0)<.25)continue;
  const related=Math.abs(a.line-b.line)===1||p.lines[a.line].text.replace(/\s/g,'')===p.lines[b.line].text.replace(/\s/g,'')||(p.songNativeDirection.structure?.relations||[]).some(r=>r.from===a.candidate.features.sectionIndex&&r.to===b.candidate.features.sectionIndex);
  if(related)pairs.push({changes:[a,b],priority:a.priority+b.priority});
 }
 proposals.push(...pairs.sort((a,b)=>b.priority-a.priority).slice(0,2));
 for(const proposal of proposals){const changes=proposal.changes,item=changes[0];
  await unchanged();const variants=portfolios.map(step=>({...step,candidates:[changes.find(x=>x.line===step.line)?.candidate||winner.picks.find(x=>x.line===step.line)]}));
  let alt=J.chooseCreativeArcV10(p,variants,winner);
  try{alt=await J.confirmDirectionScaleV11(p,variants,alt,sample,phases,options.signal,{mode:'alternative',detailCache,changedLines:changes.map(x=>x.line)});}
  catch(error){await unchanged();if(error.code!=='V11_SCALE_FRONTIER_EXHAUSTED'||error.diagnostic?.scope!=='alternative')throw error;attempts.push({line:item.line,status:'NO_SAFE_VARIANT',diagnostic:error.diagnostic});continue;}
  await unchanged();if(alt.status!=='MEASURED_SAFE_SEQUENCE')throw Error('V112_INVALID_ALTERNATIVE_STATE');
  const trial=copy(p);J.installRegistryStoryboardV8(trial,alt.picks.map(x=>({line:x.line,cut:x.cut})));
  const observed=new Map();let safe=true;
  for(const c of trial.cuts.filter(c=>c.line>=0&&!J.songNativeLockedV8(trial,c))){const checks=phases(c).map(t=>{abort(options.signal);const e=sample(trial,c,t);if(e.renderErrors?.length)throw Error('V112_RENDERER_ERROR');return e;});if(!checks.every(e=>e.eligible))safe=false;observed.set(c.line,checks.map(strip));}
  await unchanged();if(!safe){attempts.push({line:item.line,status:'COMPOSED_TEMPORAL_REJECTION'});continue;}
  // Keep the existing acoustic/coherence arc objective. Pixel difference proves
  // an actual variation, not better art. A badly mismatched variant is optional.
  const music=item.candidate.dimensions?.musicFit??item.candidate.musicFit;
  if(changes.some(x=>Number.isFinite(x.candidate.dimensions?.musicFit)&&Number.isFinite(x.base.dimensions?.musicFit)&&x.candidate.dimensions.musicFit<x.base.dimensions.musicFit-.08)){attempts.push({line:item.line,status:'MUSIC_FIT_REGRESSION'});continue;}
  if(alt.creativeArc?.requiresReevaluation&&!winner.creativeArc?.requiresReevaluation){attempts.push({lines:changes.map(x=>x.line),status:'ACOUSTIC_ARC_REGRESSION'});continue;}
  const paired=changes.map(change=>{const changed=trial.cuts.find(c=>c.line===change.line),baseline=p.cuts.find(c=>c.line===change.line),times=[...new Set([...phases(changed),...phases(baseline)])].sort((a,b)=>a-b),samples=times.map(t=>{
   const one=sample(p,baseline,t),two=sample(trial,changed,t);if(one.renderErrors?.length||two.renderErrors?.length)throw Error('V112_RENDERER_ERROR');
   const difference=one.raster?.length&&one.raster.length===two.raster?.length?mean(one.raster.map((v,i)=>Math.abs(v-two.raster[i]))):null;
   return {offset:t,difference};
  });return {line:change.line,samples};});
  if(!paired.some(row=>row.samples.some(x=>Number.isFinite(x.difference)&&x.difference>1e-5))){attempts.push({line:item.line,status:'NO_COMPOSED_OBSERVED_VARIATION'});continue;}
  attempts.push({line:item.line,status:'MEASURED_SAFE_VARIATION',glyphDifference:item.observed,rgbDifference:item.rgb,musicFit:music??null});
  selection.alternativeSearch={status:'AVAILABLE',attempted:attempts.length,budget:8,attempts};
  const metadata=J.creativeAlternativeEvidenceV10(selection,alt,portfolios);
  return [{...metadata,status:'MEASURED_SAFE_SEQUENCE',sourceIdentity:p.songNativeDirection.sourceIdentity,rendererCompatibilityId:p.songNativeDirection.rendererCompatibilityId,entries:trial.cuts.filter(c=>c.registrySelectedV8&&!J.songNativeLockedV8(trial,c)).map(c=>({line:c.line,cut:copy(c),validation:'MEASURED_SAFE_SEQUENCE',phaseEvidence:observed.get(c.line)})),score:alt.score,method:'input-ranked local variation; unchanged safe recommendation elsewhere',variation:{status:'MEASURED',lines:changes.map(x=>x.line),glyphDifference:item.observed,rgbDifference:item.rgb,temporalPairs:paired}}];
 }
 await unchanged();return finish(opportunities.length?'NO_SAFE_ALTERNATIVE':'NO_MEASURED_VARIATION');
};
})();
