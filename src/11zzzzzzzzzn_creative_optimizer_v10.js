/* v10 searches live components, not completed profiles. The v9 persistence and
   renderer contract is deliberately retained; only new requests opt into v10. */
(()=>{'use strict';
const J=window.J,C=J.clamp,copy=J.clonePhotoRenderPlan,mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const roles=['enter','hold','exit','cam','treat','bg','decor','trans','fx'];
const neutral={enter:'cut',hold:'still',exit:'cut',cam:'stillCamera',treat:'none',bg:'none',decor:'none',trans:'cut',fx:null};
const id=(c,g)=>g==='decor'?c.decor?.[0]?.id||'none':g==='fx'?c.registryFxV9||null:c[g];
const cancelled=s=>{if(s?.aborted)throw new DOMException('Aborted','AbortError');};
const strip=({mask,raster,...e})=>e;
J.isCreativeOptimizerV10=p=>p?.songNativeDirection?.optimizerVersion===10;
J.generateJizuraDirectionV10=async(p,a,options={})=>{
 const set=await J.generateJizuraDirectionV9(p,a,options);
 for(const item of set.candidates){item.proposal.grammarDirection.optimizerVersion=10;item.proposal.summary='音響構造と実Canvasの対照比較からJIZURA演出を共同最適化 v10';}
 return set;
};
// v9 may rebuild analysis when project defaults change during planning. Preserve
// the explicit new-generation optimizer flag through that existing adapter.
const make=J.makeArtDirection;J.makeArtDirection=(p,a,pr)=>{
 const art=make(p,a,pr);if(pr.grammarDirection?.optimizerVersion===10)art.songNativeDirection.optimizerVersion=10;return art;
};
const build=J.buildJizuraDirectionV9;J.buildJizuraDirectionV9=(p,a)=>{
 const d=build(p,a);if((p.songNativeDirection||p.artDirection?.songNativeDirection)?.optimizerVersion===10)d.optimizerVersion=10;return d;
};
// Capture transforms returned during production rendering, including a camera
// applied to the image and/or lyrics. Missing calls remain unmeasured.
const renderProbe=J.createRegistryRenderProbe;J.createRegistryRenderProbe=(...args)=>{
 const sample=renderProbe(...args);return (p,c,t)=>{
  if(!J.isCreativeOptimizerV10(p))return sample(p,c,t);
  const camera=J.CAMERA[c.cam],get=camera?.get,observed=[];
  if(get)camera.get=function(env,...rest){const value=get.call(this,env,...rest);if(value)observed.push({time:env.t,transform:copy(value)});return value;};
  try{return {...sample(p,c,t),cameraSamples:observed};}finally{if(get)camera.get=get;}
 };
};
// A call-local raster cache includes the complete cut and neighboring sequence.
// No cache can survive an input, font, image, renderer or alternative change.
J.createCreativeProbeV10=(sample,canvas)=>{
 const readContext=canvas.getContext('2d',{willReadFrequently:true});
 const cache=new Map();let contexts=new WeakMap(),serial=0;
 const probe=(p,c,t)=>{
  // Search treats each cuts array as immutable; final install and alternative
  // install replace it. A new full sequence invalidates every role's evidence,
  // including previous-cut hold/camera/FX used by transition rendering.
  if(!contexts.has(p.cuts))contexts.set(p.cuts,++serial);
  const key=J.canonicalJSON([c,t,p.styleKey,contexts.get(p.cuts)]);
  if(cache.has(key))return cache.get(key);
  const e=sample(p,c,t),pixels=readContext.getImageData(0,0,canvas.width,canvas.height).data;
  // RGB cell averages retain background/treatment/FX evidence even when the
  // primary glyph mask is unchanged. Pixel distance is never an art score.
  const raster=[];for(let gy=0;gy<12;gy++)for(let gx=0;gx<20;gx++){
   const sums=[0,0,0];let n=0;
   for(let y=Math.floor(gy*canvas.height/12);y<Math.floor((gy+1)*canvas.height/12);y++)for(let x=Math.floor(gx*canvas.width/20);x<Math.floor((gx+1)*canvas.width/20);x++){
    const k=(y*canvas.width+x)*4;for(let ch=0;ch<3;ch++)sums[ch]+=pixels[k+ch]/255;n++;
   }raster.push(...sums.map(v=>v/Math.max(1,n)));
  }
  const result={...e,raster,sampleOffset:t,observedCenter:e.bounds?[(e.bounds.x0+e.bounds.x1)/2/p.W,(e.bounds.y0+e.bounds.y1)/2/p.H]:null};cache.set(key,result);if(cache.size>384)cache.delete(cache.keys().next().value);return result;
 };probe.clear=()=>{cache.clear();contexts=new WeakMap();serial=0;};return probe;
};
const distance=(a,b)=>a?.length&&a.length===b?.length?mean(a.map((v,i)=>Math.abs(v-b[i]))):null;
// Independent component amplitudes, reused from v8; no score bonus by name.
// Local metadata leaves all saved/legacy algorithms unchanged.
const calibration={enter:{cut:0,photoSettle:.14,photoResolve:.20},hold:{still:0,drift:.12,breathe:.38,wave:.55,jitter:.7},exit:{cut:0,shrink:.24},cam:{stillCamera:0,push:.1,panL:.18,panR:.18},treat:{none:0,softShadow:.1,outline:.3}};
const amount=(g,k)=>k===neutral[g]?0:J.registry(g)[k]?.motionAmount??calibration[g]?.[k]??J.registryRoleAmountV9(g,k);
const drive=f=>C(f.onset*.45+f.change*.25+(f.flux??0)*.20+(f.rmsChange??0)*.10);
const setRole=(cut,g,k)=>{
 const c=copy(cut);
 if(g==='fx'){if(k)c.registryFxV9=k;else delete c.registryFxV9;}
 else if(g==='decor')c.decor=k==='none'?[]:[{id:k}];else c[g]=k;
 if(g==='enter')c.inDur=k==='cut'?0:Math.min(.22,c.dur*.15);
 if(g==='exit')c.outDur=k==='cut'?0:Math.min(.12,c.dur*.08);
 if(g==='trans')c.transDur=k==='cut'?0:Math.min(.10,c.dur*.08);
 return c;
};
J.creativeRoleCandidatesV10=(p,g,f)=>{
 const method=g==='cam'?'get':['bg','decor','trans','fx'].includes(g)?'draw':'apply',target=drive(f);
 const ranked=Object.entries(J.registry(g)).filter(([k,d])=>k!==neutral[g]&&(typeof d[method]==='function'||g==='fx'&&d.builtin)&&!d.requiresAsset&&J.randomOk(p,g,k))
 .map(([k,d])=>({id:k,prior:1-Math.abs(target-amount(g,k)),amountSource:Number.isFinite(d.motionAmount)?'DECLARED':calibration[g]?.[k]!==undefined?'V8_CALIBRATED_PRIOR':'TAG_PRIOR_UNMEASURED'}))
 .sort((a,b)=>b.prior-a.prior||a.id.localeCompare(b.id));
 // A small calibrated supporting move can complement a stronger component.
 // Retain it before testing pairs, rather than letting amplitude fit eliminate
 // every low-amplitude component at the independent-role shortlist.
 const support=ranked.filter(x=>x.id!==ranked[0]?.id&&amount(g,x.id)>0&&(Number.isFinite(J.registry(g)[x.id].motionAmount)||calibration[g]?.[x.id]!==undefined)).sort((a,b)=>amount(g,a.id)-amount(g,b.id)||a.id.localeCompare(b.id))[0]||ranked[1];
 return [ranked[0],support].filter(Boolean);
};
// Independent dimensions. Intensity is only a music-fit prior. Geometry and
// contrast come from Canvas; contribution requires a same-time ablation.
J.scoreCreativeCandidateV10=(cut,f,checks,baseScore=0)=>{
 const target=drive(f),amps=roles.filter(g=>['enter','hold','exit','cam','trans','fx'].includes(g)).map(g=>amount(g,id(cut,g))),intensity=Math.max(0,...amps);
 const pairs=checks.slice(1).map((e,i)=>distance(e.raster,checks[i].raster)).filter(Number.isFinite),visualImpact=pairs.length?mean(pairs):null;
 // Position and size are separately observed; RGB differences prove realization.
 const extent=mean(checks.map(e=>C(e.height/.3))),contrast=mean(checks.map(e=>e.contrastFit??0));
 const position=checks.slice(1).map((e,i)=>e.observedCenter&&checks[i].observedCenter?Math.hypot(e.observedCenter[0]-checks[i].observedCenter[0],e.observedCenter[1]-checks[i].observedCenter[1]):0);
 const continuity=1-C(Math.max(0,...position)*3),composition=contrast*.7+(1-Math.abs(extent-(.35+f.energy*.25+f.brightness*.15-f.length/180)))*.3;
 const excess=Math.max(0,intensity-target-.12)*(1-target)+Math.max(0,(visualImpact??0)-.12-target*.2);
 const intervals=checks.slice(1).map((e,i)=>{const rows=(f.localAudio||[]).filter(r=>r.time>=checks[i].sampleOffset&&r.time<e.sampleOffset);return rows.length?mean(rows.map(r=>r.activity)):0;});
 const maxAudio=Math.max(0,...intervals),maxVisual=Math.max(0,...pairs);
 const onsetAlignment=pairs.length>1&&maxAudio-Math.min(...intervals)>.02&&maxVisual>0?1-mean(pairs.map((v,i)=>Math.abs(v/maxVisual-intervals[i]/maxAudio))):null;
 const musicFit=(1-Math.abs(target-intensity))*(onsetAlignment===null?1:.85)+(onsetAlignment??0)*.15,visualCoherence=1-C(intensity*.2*(1-f.change));
 const dimensions={musicFit,onsetAlignment,visualImpact,compositionQuality:composition,temporalContinuity:continuity,visualCoherence,expressiveContribution:null,excessPenalty:excess};
 // Quiet evidence gives stillness more weight without banning active components.
 const score=musicFit*(target<.08?.46:.30)+composition*.28+continuity*.12+visualCoherence*.08+baseScore*.12-excess*.35;
 return {score,dimensions};
};
// Pareto pruning removes only candidates dominated on all measured fit axes.
J.creativeParetoV10=rows=>rows.filter(a=>!rows.some(b=>b!==a&&['musicFit','compositionQuality','temporalContinuity','visualCoherence'].every(k=>Number.isFinite(a.dimensions[k])&&Number.isFinite(b.dimensions[k])?b.dimensions[k]>=a.dimensions[k]:a.dimensions[k]===b.dimensions[k])&&b.dimensions.excessPenalty<=a.dimensions.excessPenalty&&b.score>a.score+1e-9));
J.optimizeCreativeLineV10=async({p,c,f,ranked,distinct,sample,phases,signal,audio,anchors=[]})=>{
 const results=[],attempts=[],exclusions=[],interactions=[];let compared=0;
 const timeline=audio?.features?.detailedTimeline||audio?.features?.timeline||[];
 const local=timeline.filter(r=>r.time>=c.start&&r.time<c.end),sections=p.songNativeDirection.structure?.sections||[],sectionIndex=sections.findIndex(s=>c.start>=s.start&&c.start<s.end),section=sections[sectionIndex];
 f={...f,sectionIndex,sectionPhase:section?C((c.start-section.start)/(section.end-section.start)):null,boundaryConfidence:section?.boundaryConfidence??null,localAudio:local.map(r=>({time:r.time-c.start,activity:C((r.onset??0)*.5+(r.spectralFlux??0)*.3+(r.rms??r.energy??0)*.2)})),rmsChange:local.length>1?mean(local.slice(1).map((r,i)=>Math.abs((r.rms??r.energy??0)-(local[i].rms??local[i].energy??0)))):null};
 // Style profiles are already audio/image/lyric ranked by v8. Compare another
 // style even when its primary-ink geometry matches the best representatives.
 const starts=distinct.slice(0,3);if(starts.length>1&&!starts.some(x=>x.styleKey!==starts[0].styleKey)){const other=ranked.find(x=>x.styleKey!==starts[0].styleKey);if(other)starts.push(other);}
 for(const start of starts){
  cancelled(signal);const base=copy(start.cut),sp={...p,style:base.style,styleKey:base.styleKey};
  const top=Object.fromEntries(roles.map(g=>[g,J.creativeRoleCandidatesV10(p,g,f)]));
  // Independent components and pair exchanges are generated before any role is
  // committed. In particular bg+treat and layout+hold reach the renderer even
  // if either individual component would lose to the baseline.
  const mid=[];
  const selectedSingles=roles.flatMap(g=>top[g][0]?[setRole(base,g,top[g][0].id)]:[]);
  const selectedPairs=[['hold','cam'],['bg','treat'],['enter','exit'],['decor','bg'],['trans','fx']].flatMap(([a,b])=>top[a][0]&&top[b][0]?[setRole(setRole(base,a,top[a][0].id),b,top[b][0].id)]:[]);
  const cross=[['hold','cam'],['bg','treat']].flatMap(([a,b])=>top[a][0]&&top[b][1]?[setRole(setRole(base,a,top[a][0].id),b,top[b][1].id)]:[]);
  let complete=copy(base);for(const g of roles)if(top[g][0])complete=setRole(complete,g,top[g][0].id);const full=[complete];
  const spatial=anchors.filter(a=>a.x!==.5||a.y!==.5).sort((a,b)=>(a.saliency??.5)-(b.saliency??.5)).slice(0,2).map(anchor=>({...copy(base),params:{...copy(base.params),photoAnchor:copy(anchor)}}));
  const bounded=[...new Map([base,...selectedSingles,...selectedPairs,...cross,...spatial,...full].map(cut=>[J.canonicalJSON(cut),cut])).values()].slice(0,20);
  for(const cut of bounded){
   cancelled(signal);compared++;const e=sample(sp,cut,c.dur*.5);
   if(!e.eligible){exclusions.push({layout:cut.layout,roles:roles.map(g=>[g,id(cut,g)]),reason:'ACTUAL_GLYPH_HARD_GATE',errors:e.renderErrors||[]});continue;}
   const fit=J.scoreCreativeCandidateV10(cut,f,[e],start.score);mid.push({...fit,cut,mid:e});
  }
  const baseline=mid.find(x=>J.canonicalJSON(x.cut)===J.canonicalJSON(base));
  for(const [a,b] of [['hold','cam'],['bg','treat']]){
   const pair=mid.find(x=>id(x.cut,a)!==neutral[a]&&id(x.cut,b)!==neutral[b]&&roles.filter(g=>id(x.cut,g)!==neutral[g]).length===2);
   const one=mid.find(x=>id(x.cut,a)===id(pair?.cut||base,a)&&roles.filter(g=>id(x.cut,g)!==neutral[g]).length===1);
   const two=mid.find(x=>id(x.cut,b)===id(pair?.cut||base,b)&&roles.filter(g=>id(x.cut,g)!==neutral[g]).length===1);
   interactions.push({groups:[a,b],layout:base.layout,status:pair&&one&&two&&baseline?'MEASURED':'UNMEASURED',baseline:baseline?.score??null,one:one?.score??null,two:two?.score??null,joint:pair?.score??null,gain:pair&&one&&two?pair.score-Math.max(one.score,two.score):null,scope:'same-time midpoint Canvas; phase safety checked separately'});
  }
  // Keep a baseline control and a bounded, multiobjective shortlist. Paired
  // interactions are scored as complete render states, never as summed priors.
  mid.sort((a,b)=>b.score-a.score||J.canonicalJSON(a.cut).localeCompare(J.canonicalJSON(b.cut)));
  const shortlist=[...J.creativeParetoV10(mid).slice(0,3),...mid.slice(0,3),...mid.filter(x=>J.canonicalJSON(x.cut)===J.canonicalJSON(base))];
  const seen=new Set(),safe=[];
  for(const item of shortlist){
   const key=J.canonicalJSON(item.cut);if(seen.has(key))continue;seen.add(key);
   const times=phases(item.cut),checks=times.map(t=>sample(sp,item.cut,t)),eligible=checks.every(e=>e.eligible);
   attempts.push({layout:item.cut.layout,groups:roles.filter(g=>id(item.cut,g)!==neutral[g]),eligible});
   if(!eligible){exclusions.push({layout:item.cut.layout,reason:'PHASE_HARD_GATE'});continue;}
   const fit=J.scoreCreativeCandidateV10(item.cut,f,checks,start.score);safe.push({...item,...fit,checks,times});
  }
  safe.sort((a,b)=>b.score-a.score);
  for(const item of [...safe.slice(0,2),...safe.filter(x=>J.canonicalJSON(x.cut)===J.canonicalJSON(base)&&!safe.slice(0,2).includes(x))]){
   // Remove components proved invisible before they can earn a music-fit prior.
   // A control that fails the hard gate is never substituted into a safe state.
   for(const g of roles.filter(g=>id(item.cut,g)!==neutral[g])){
    const control=setRole(item.cut,g,neutral[g]),checks=item.times.map(t=>sample(sp,control,t));
    if(checks.every(e=>e.eligible)&&checks.every((e,i)=>(distance(e.raster,item.checks[i].raster)??1)<=1e-6)){item.cut=control;item.checks=checks;}
   }
   Object.assign(item,J.scoreCreativeCandidateV10(item.cut,f,item.checks,start.score));
   const ablations=[];
   for(const g of roles.filter(g=>id(item.cut,g)!==neutral[g])){
    cancelled(signal);const control=setRole(item.cut,g,neutral[g]),checks=item.times.map(t=>sample(sp,control,t));
    const eligible=checks.every(e=>e.eligible),fit=eligible?J.scoreCreativeCandidateV10(control,f,checks,start.score):null;
    ablations.push({group:g,id:id(item.cut,g),status:'MEASURED',controlSafe:eligible,pixelDifference:mean(checks.map((e,i)=>distance(e.raster,item.checks[i].raster))),fitGain:fit?item.score-fit.score:null,contrastGain:mean(item.checks.map(e=>e.contrastFit??0))-mean(checks.map(e=>e.contrastFit??0)),times:item.times.map(t=>c.start+t)});
   }
   const verified=ablations.filter(x=>x.controlSafe&&x.pixelDifference>1e-6&&Number.isFinite(x.fitGain));
   item.dimensions.expressiveContribution=verified.length?mean(verified.map(x=>x.fitGain)):ablations.length?null:0;
   // No pixel-magnitude reward. Add only a measured fit improvement, and charge
   // realized components that add pixels without a fit benefit.
   item.score+=mean(verified.map(x=>x.fitGain))*.25-ablations.filter(x=>x.controlSafe&&(x.pixelDifference<=1e-6||x.fitGain<=0)).length*.012;
   const e=item.checks[Math.floor(item.checks.length/2)];
   results.push({...start,cut:item.cut,params:item.cut.params,score:item.score,dimensions:item.dimensions,evidence:strip(e),signature:J.registryInkSignature(e.mask,256,Math.round(256*p.H/p.W)),typographySignature:J.registryTypographySignature(e.mask,256,Math.round(256*p.H/p.W)),phaseEvidence:item.checks.map(strip),ablations,attempts:[],features:f,musicFit:item.dimensions.musicFit});
  }
  await new Promise(r=>setTimeout(r,0));
 }
 results.sort((a,b)=>b.score-a.score||J.canonicalJSON(a.cut).localeCompare(J.canonicalJSON(b.cut)));
 for(const r of results){r.attempts=attempts;r.optimizerEvidence={compared,exclusions,interactions,axes:r.dimensions,ablations:r.ablations};}
 return results;
};
const acousticDistance=(a,b)=>mean(['energy','onset','brightness','change','flux'].filter(k=>Number.isFinite(a?.[k])&&Number.isFinite(b?.[k])).map(k=>Math.abs(a[k]-b[k])));
const visualDistance=(a,b)=>Math.max(J.registryInkDistance(a.signature,b.signature)??0,Math.abs((a.dimensions?.visualImpact??0)-(b.dimensions?.visualImpact??0))*4);
J.auditCreativeArcV10=(portfolios,picks)=>{
 const gaps=[];
 for(let i=1;i<picks.length;i++){
  const prev=picks[i-1],chosen=picks[i],step=portfolios[i],audio=acousticDistance(prev.features,chosen.features),visual=visualDistance(prev,chosen);
  const better=step.candidates.filter(c=>visualDistance(prev,c)>visual+.08&&c.dimensions.musicFit>chosen.dimensions.musicFit+.025&&c.dimensions.compositionQuality>=chosen.dimensions.compositionQuality-.02);
  if(prev.features.status==='MEASURED'&&chosen.features.status==='MEASURED'&&audio>.12&&visual<.08&&better.length)gaps.push({line:step.line,acousticChange:audio,observedVisualChange:visual,betterSafeCandidates:better.length});
 }
 return {status:picks.length>1?(picks.every(x=>x.features.status==='MEASURED')?'MEASURED':'UNMEASURED'):'NOT_APPLICABLE',gaps,requiresReevaluation:gaps.length>0,source:'acoustic neighborhoods + phase-safe rendered portfolio; no variety quota'};
};
J.chooseCreativeArcV10=(p,portfolios,initial)=>{
 const relations=p.songNativeDirection.structure?.relations||[];
 const relationBetween=(a,b)=>relations.find(r=>(r.from===a&&r.to===b||r.to===a&&r.from===b)&&a!==b);
 const transitionScore=(state,c,step)=>{
  const prev=state.last;if(!prev)return 0;
  const change=acousticDistance(prev.features,c.features),visual=visualDistance(prev,c),boundary=prev.features.sectionIndex!==c.features.sectionIndex?(c.features.boundaryConfidence??0):0,target=C(change*(2.5+boundary*.25),0,.8);
  const styleCost=prev.styleKey!==c.styleKey?.10*(1-change):0;
  const repeated=state.picks.find(x=>p.lines[x.line]?.text.replace(/\s/g,'')===p.lines[step.line]?.text.replace(/\s/g,''));
  const recurrence=repeated?(J.registryInkDistance(repeated.typographySignature,c.typographySignature)??0)*.10*(1-acousticDistance(repeated.features,c.features)):0;
  const acousticRepeat=state.picks.filter(x=>relationBetween(x.features.sectionIndex,c.features.sectionIndex)).sort((a,b)=>Math.abs(a.features.sectionPhase-c.features.sectionPhase)-Math.abs(b.features.sectionPhase-c.features.sectionPhase))[0];
  const relation=acousticRepeat?relationBetween(acousticRepeat.features.sectionIndex,c.features.sectionIndex):null;
  const structuralCost=relation?(J.registryInkDistance(acousticRepeat.typographySignature,c.typographySignature)??0)*.10*C(relation.similarity??0)*(1-acousticDistance(acousticRepeat.features,c.features)):0;
  return -.28*Math.abs(visual-target)-styleCost-recurrence-structuralCost;
 };
 let selected=J.chooseRegistryStoryboard(portfolios,8,{transitionScore,acousticPacingOnly:true}),audit=J.auditCreativeArcV10(portfolios,selected.picks);
 if(audit.requiresReevaluation){
  const lines=new Set(audit.gaps.map(g=>g.line));
  const retry=J.chooseRegistryStoryboard(portfolios,8,{acousticPacingOnly:true,transitionScore:(state,c,step)=>transitionScore(state,c,step)+(lines.has(step.line)&&state.last?.features?Math.min(.16,Math.max(0,c.dimensions.musicFit-state.last.dimensions.musicFit)*.2):0)});
  if(!J.auditCreativeArcV10(portfolios,retry.picks).requiresReevaluation)selected=retry;
 }
 if(J.auditCreativeArcV10(portfolios,selected.picks).requiresReevaluation)throw Error('V10_UNRESOLVED_ACOUSTIC_ARC');
 return {...selected,creativeArc:{...J.auditCreativeArcV10(portfolios,selected.picks),reevaluated:audit.requiresReevaluation,initialGaps:audit.gaps,acousticStructureStatus:p.songNativeDirection.structure?.status||'UNMEASURED',repeatRelations:copy(relations)},method:'bounded joint registry/Pareto + acoustic arc beam v10'};
};
J.attachCreativeEvidenceV10=(selection,storyboard,portfolios)=>{
 selection.optimizerVersion=10;selection.optimizerContract='jizura-creative-optimizer-10';selection.visualArc=storyboard.creativeArc;
 for(const trace of selection.traces){
  const chosen=storyboard.picks.find(x=>x.line===trace.line),step=portfolios.find(x=>x.line===trace.line);if(!chosen)continue;
  const alternative=step.candidates.filter(x=>J.canonicalJSON(x.cut)!==J.canonicalJSON(chosen.cut)).sort((a,b)=>b.score-a.score)[0];
  trace.creative=copy({...chosen.optimizerEvidence,axes:chosen.dimensions,structuralEvidence:{section:chosen.features.sectionIndex,phase:chosen.features.sectionPhase,boundaryConfidence:chosen.features.boundaryConfidence},closestAlternative:alternative?{layout:alternative.cut.layout,style:alternative.cut.styleKey,scoreGap:chosen.score-alternative.score,axes:alternative.dimensions}:null});
  trace.reason=`音響 onset=${chosen.features.onset.toFixed(2)} / flux=${chosen.features.flux?.toFixed(2)??'未測定'} / 変化=${chosen.features.change.toFixed(2)}、実字形・背景コントラスト、複合演出と除去対照、前後・反復構図を比較`;
 }
};
J.creativeAlternativeEvidenceV10=(selection,storyboard,portfolios)=>{
 const result={traces:copy(selection.traces)};J.attachCreativeEvidenceV10(result,storyboard,portfolios);return {traces:result.traces,visualArc:result.visualArc};
};
const measurement=J.measureJizuraDirectionV8;J.measureJizuraDirectionV8=(p,frames=[],range)=>{
 const result=measurement(p,frames,range);if(!J.isCreativeOptimizerV10(p))return result;
 result.optimizerVersion=10;
 const rows=p.songNativeDirection.selection?.traces.flatMap(t=>t.creative?.ablations||[])||[];
 result.metrics.effectRealization={status:rows.length?'MEASURED':'UNMEASURED',score:null,unit:'mean absolute normalized RGB cell difference',evidence:copy(rows),source:'same input/time/aspect production Canvas with one component removed; not artistic quality'};
 const cameras=p.songNativeDirection.selection?.entries.flatMap(e=>(e.phaseEvidence||[]).flatMap(f=>f.cameraSamples||[]))||[];
 result.metrics.camera={status:cameras.length?'MEASURED':'UNMEASURED',score:null,evidence:copy(cameras),source:'camera transforms returned inside production Renderer calls; diagnostic, not an art score'};
 const alignment=p.songNativeDirection.selection?.traces.filter(t=>Number.isFinite(t.creative?.axes.onsetAlignment)).map(t=>({line:t.line,value:t.creative.axes.onsetAlignment}))||[];
 result.metrics.acousticAlignment={status:alignment.length?'MEASURED':'UNMEASURED',score:null,evidence:alignment,source:'normalized rendered RGB change against same-time onset/flux/RMS intervals at representative phases'};
 result.visualArc=copy(p.songNativeDirection.selection?.visualArc||{status:'UNMEASURED'});
 return result;
};
const describe=J.describeJizuraDirectionV8;
J.describeJizuraDirectionV8=(p,c)=>{
 const d=describe(p,c);if(!d)return d;
 d.fx=c.registryFxV9?J.FXE[c.registryFxV9]?.name||c.registryFxV9:'なし';d.transition=J.TRANS[c.trans]?.name||c.trans||'cut';
 if(!J.isCreativeOptimizerV10(p))return d;
 const s=p.songNativeDirection.selection,t=s?.traces.find(x=>x.line===c.line),ev=t?.creative;
 return {...d,reason:t?.reason||'未測定',comparison:ev?`${ev.compared}複合候補・安全 ${t.safeCount}案`:'未測定',canvas:ev?`${ev.ablations.length}除去対照・画素差 ${mean(ev.ablations.map(x=>x.pixelDifference)).toFixed(5)}・芸術評価は未検証`:'未測定'};
};
})();
