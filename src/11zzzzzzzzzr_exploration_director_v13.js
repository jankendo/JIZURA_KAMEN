/* Exploration first. Only explicit new requests opt in; v9 owns persistence,
   source identity, locks, compositing and the unchanged 640px safety gate. */
(()=>{'use strict';
const J=window.J,C=J.clamp,copy=J.clonePhotoRenderPlan;
const roles=['enter','hold','exit','cam','treat','bg','decor','trans','fx'];
const neutral={enter:'cut',hold:'still',exit:'cut',cam:'stillCamera',treat:'none',bg:'none',decor:'none',trans:'cut',fx:null};
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const delta=(a,b)=>a?.length&&a.length===b?.length?mean(a.map((v,i)=>Math.abs(v-b[i]))):null;
const strip=({mask,raster,...e})=>e;
const abort=s=>{if(s?.aborted)throw new DOMException('Aborted','AbortError');};
const get=(c,g)=>g==='decor'?c.decor?.[0]?.id||'none':g==='fx'?c.registryFxV9||null:c[g];
J.isExplorationV13=p=>(p?.songNativeDirection||p?.artDirection?.songNativeDirection)?.explorationVersion===13;
J.generateJizuraDirectionV13=async(p,a,o={})=>{
 const set=await J.generateJizuraDirectionV12(p,a,o);
 for(const x of set.candidates){x.proposal.seed=p.seed;x.proposal.grammarDirection.explorationVersion=13;x.proposal.summary='自由探索・実Canvas多様性・局所修復・全曲共同選択 v13';}
 return set;
};
const make=J.makeArtDirection;J.makeArtDirection=(p,a,pr)=>{const art=make(p,a,pr);if(pr.grammarDirection?.explorationVersion===13)art.songNativeDirection.explorationVersion=13;return art;};
const build=J.buildJizuraDirectionV9;J.buildJizuraDirectionV9=(p,a)=>{const d=build(p,a);if(J.isExplorationV13(p))d.explorationVersion=13;return d;};
// A tagged stream per line/proposal isolates search from renderer call order.
J.explorationRandomV13=(p,c,ordinal,tag=0)=>J.rng(J.h(p.seed,c.line+1,13,ordinal,tag));
J.explorationCatalogV13=p=>J.directionCapabilityIndexV11(p);
J.explorationProposalV13=(p,c,index,ordinal,parents=[],anchors=[],preserve=false)=>{
 const rng=J.explorationRandomV13(p,c,ordinal),pick=a=>a.length?rng.pick(a):null;
 const available=g=>index.filter(x=>x.group===g&&x.eligible).map(x=>x.id);
 const parent=parents.length?pick(parents):null,mode=parent&&(preserve||rng()<.35)?(rng()<.5?'mutation':'crossover'):'fresh';
 let cut;
 if(mode==='fresh'){
  const styleKey=pick(available('style')),style=J.STYLES[styleKey];
  const layouts=available('layout').filter(id=>!J.LAYOUTS[id].fits||J.LAYOUTS[id].fits(J.graphemes(c.lineText).length));
  const layout=pick(layouts);if(!style||!layout)return null;
  cut={...J.registryCandidateCut({...p,style,styleKey},{...c,seed:J.h(c.seed,ordinal,13)},layout,c.params.font||'embedded_bold','cut','still'),style,styleKey,registrySelectedV8:true,stagger:0};
  delete cut.generatedMotionV7;delete cut.grammar;delete cut.photoChoreography;
  // Random sparsity spans restrained and complex combinations; no count reward.
  const activation=ordinal%4===0?rng.range(0,.15):rng.range(.15,.8);
  for(const g of roles){const id=rng()<activation?pick(available(g)):neutral[g];cut=J.changeDirectionRoleV11(cut,g,id??neutral[g]);}
  cut.explorationParamsV13={size:rng.range(.72,1.12),dx:rng.range(-.09,.09),dy:rng.range(-.15,.15),motion:rng.range(.35,1),camera:rng.range(.35,1),fx:rng.range(.35,1),crop:{zoom:rng.range(1,1.08),x:rng.range(-5,5),y:rng.range(-5,5)}};
  if(anchors.length&&rng()<.65)cut.params.photoAnchor=copy(pick(anchors));
 }else{
  cut=copy(parent.cut);
  const donor=mode==='crossover'?pick(parents):null;
  for(let n=0;n<(mode==='mutation'?1:2);n++){
   const g=pick(roles),id=donor?get(donor.cut,g):pick(available(g));cut=J.changeDirectionRoleV11(cut,g,id??neutral[g]);
   const k=g==='cam'?'camP':g+'P';if(donor?.cut[k])cut[k]=copy(donor.cut[k]);
  }
  const e=cut.explorationParamsV13||{};cut.explorationParamsV13={...e,size:C((e.size??1)+rng.range(-.08,.08),.55,1.2),dy:C((e.dy??0)+rng.range(-.05,.05),-.2,.2)};
 }
 // Registry parameter constructors, never mood-specific technique pools.
 for(const g of ['cam','treat','bg','trans']){const d=J.registry(g)[cut[g]],key=g+'P';if(d?.plan&&!cut[key])cut[key]=d.plan(rng,cut,cut.style)||{};}
 if(cut.decor?.length)cut.decor=cut.decor.map(d=>({...d,seed:d.seed??rng.int(1,1e9),n:d.n??rng.int(1,4),r:d.r??rng(),low:d.low??rng()<.5}));
 return {cut,mode};
};
// Reuse a motif only after it was discovered in this song's actual archive.
// Phrase timing is rebuilt; no intro/chorus/genre/keyword look is supplied.
J.explorationMotifSeedsV13=(p,c,portfolios)=>{
 const text=String(c.lineText).replace(/\s/g,''),previous=[...portfolios].reverse().find(step=>String(p.lines[step.line]?.text).replace(/\s/g,'')===text);
 if(!previous)return [];
 const rows=previous.candidates,first=rows[0],other=[...rows].sort((a,b)=>J.explorationDistanceV13(b.descriptor,first.descriptor)-J.explorationDistanceV13(a.descriptor,first.descriptor))[0];
 return [...new Set([first,other])].filter(Boolean).map(item=>{
  const cut={...copy(item.cut),line:c.line,start:c.start,end:c.end,dur:c.dur,seed:c.seed,motifSourceV13:{line:previous.line,source:'discovered earlier phrase archive'}};
  delete cut.expressiveEnvelopeV12;delete cut.expressiveEventsV12;return cut;
 });
};
// Continuous measured descriptors. RGB and technique IDs never earn quality.
J.explorationDescriptorV13=(checks,p)=>{
 const holds=checks.filter(e=>e.temporalStage==='HOLD'),rows=holds.length?holds:checks,w=256,h=Math.round(w*p.H/p.W);
 const signatures=rows.filter(e=>e.mask).map(e=>J.registryInkSignature(e.mask,w,h));
 const shape=rows.find(e=>e.mask),typography=shape?J.registryTypographySignature(shape.mask,w,h):null;
 const occupancy=mean(rows.map(e=>(e.ink||0)/(w*h))),centers=rows.filter(e=>e.observedCenter).map(e=>e.observedCenter);
 const camera=checks.flatMap(e=>e.cameraSamples||[]).map(e=>e.transform);
 const color=[0,1,2].map(k=>mean(rows.flatMap(e=>(e.raster||[]).filter((_,i)=>i%3===k))));
 return {vector:[mean(centers.map(x=>x[0])),mean(centers.map(x=>x[1])),occupancy,mean(rows.map(e=>e.height||0)),mean(signatures.slice(1).map((s,i)=>J.registryInkDistance(s,signatures[i])||0)),mean(checks.slice(1).map((e,i)=>delta(e.raster,checks[i].raster)||0)),mean(camera.map(c=>Math.abs(c.x||0)/p.W+Math.abs(c.y||0)/p.H+Math.abs((c.s??1)-1))),...color],signature:signatures[0]||null,typography};
};
J.explorationDistanceV13=(a,b)=>mean([delta(a.vector,b.vector)??0,J.registryInkDistance(a.signature,b.signature)??0,J.registryInkDistance(a.typography,b.typography)??0]);
const axes=['compositionQuality','temporalContinuity','visualCoherence','musicFit','temporalAlignment'];
J.explorationDominatesV13=(a,b)=>{
 if(axes.some(k=>Number.isFinite(a.dimensions[k])!==Number.isFinite(b.dimensions[k])))return false;
 const keys=axes.filter(k=>Number.isFinite(a.dimensions[k])&&Number.isFinite(b.dimensions[k]));
 return keys.length>0&&keys.every(k=>a.dimensions[k]>=b.dimensions[k])&&(a.dimensions.excessPenalty??0)<=(b.dimensions.excessPenalty??0)&&(keys.some(k=>a.dimensions[k]>b.dimensions[k])||(a.dimensions.excessPenalty??0)<(b.dimensions.excessPenalty??0));
};
// Music alignment uses primary glyph motion, not background grain. A flat
// primary raster cannot claim measured temporal alignment. This is fit, not art.
J.scoreExplorationV13=(cut,f,intent,checks,p)=>{
 const result=J.scoreDirectionV11(cut,f,intent,checks,0),w=256,h=Math.round(w*p.H/p.W);
 const holds=checks.filter(e=>e.temporalStage==='HOLD'&&e.mask),pairs=holds.slice(1).map((e,i)=>{
  const from=holds[i],dt=e.sampleOffset-from.sampleOffset;
  return {visual:dt>0?(J.registryInkDistance(J.registryInkSignature(e.mask,w,h),J.registryInkSignature(from.mask,w,h))||0)/dt:0,audio:mean(intent.events.filter(x=>x.time>=from.sampleOffset&&x.time<e.sampleOffset).map(x=>x.value))};
 });
 const maxV=Math.max(0,...pairs.map(x=>x.visual)),maxA=Math.max(0,...pairs.map(x=>x.audio));
 const alignment=intent.status==='MEASURED'&&pairs.length>1&&maxV>1e-6&&maxA-Math.min(...pairs.map(x=>x.audio))>.02?1-mean(pairs.map(x=>Math.abs(x.visual/maxV-x.audio/maxA))):null;
 Object.assign(result.dimensions,{legacyAcousticFit:result.dimensions.acousticFit,primaryTemporalAlignment:alignment,temporalAlignment:alignment,musicFit:alignment,acousticFit:alignment});
 result.primaryMusicEvidence={status:alignment===null?'UNMEASURED':'MEASURED',source:'successive complete primary glyph masks versus same-interval acoustic events; flat ink is not aligned motion',pairs};
 return result;
};
J.rankExplorationPortfolioV13=rows=>{
 let pending=[...rows],rank=0;
 while(pending.length){const front=pending.filter(a=>!pending.some(b=>a!==b&&J.explorationDominatesV13(b,a)));if(!front.length)throw Error('V13_INVALID_PARETO_ORDER');
  for(const item of front){item.paretoRankV13=rank;item.score=1/(1+rank);}pending=pending.filter(x=>!front.includes(x));rank++;
 }return rows;
};
J.createExplorationArchiveV13=(capacity=12)=>{
 const rows=[];
 return {rows,insert(item){
  const closest=[...rows].sort((a,b)=>J.explorationDistanceV13(a.descriptor,item.descriptor)-J.explorationDistanceV13(b.descriptor,item.descriptor))[0];
  if(closest&&J.explorationDistanceV13(closest.descriptor,item.descriptor)<.055){
   if(J.explorationDominatesV13(closest,item))return false;
   // Incomparable candidates share a niche only when their temporal axes differ.
   if(!J.explorationDominatesV13(item,closest)&&Math.abs((item.dimensions.temporalAlignment??0)-(closest.dimensions.temporalAlignment??0))<.08)return false;
   rows.splice(rows.indexOf(closest),1);
  }
  rows.push(item);
  if(rows.length>capacity){
   const crowd=x=>Math.min(...rows.filter(y=>y!==x).map(y=>J.explorationDistanceV13(x.descriptor,y.descriptor)));
   const dominated=rows.filter(x=>rows.some(y=>y!==x&&J.explorationDominatesV13(y,x)));
   const victim=(dominated.length?dominated:rows).sort((a,b)=>crowd(a)-crowd(b))[0];rows.splice(rows.indexOf(victim),1);
  }
  return rows.includes(item);
 }};
};
// Failure-directed numeric edits preserve IDs/layout. At most one failing role
// is exchanged as a last local hypothesis; never reset the complete expression.
J.explorationRepairsV13=(cut,checks)=>{
 const bad=checks.filter(e=>!e.eligible),e=cut.explorationParamsV13||{},out=[];
 const edit=patch=>out.push({...copy(cut),explorationParamsV13:{...e,...patch}});
 if(bad.some(x=>x.safe===false||x.geometry?.some(g=>!g.readable))){edit({size:(e.size??1)*.86,camera:(e.camera??1)*.65});edit({motion:(e.motion??1)*.6,size:(e.size??1)*.92});}
 if(bad.some(x=>x.readable===false||x.contrastFit<.5))out.push({...copy(cut),params:{...copy(cut.params),cinemaReadabilityRepair:{shadow:2,scrim:.32}}});
 if(bad.some(x=>x.height<=.035))edit({size:Math.min(1.3,(e.size??1)*1.18)});
 if(bad.some(x=>x.temporalStage==='ENTRY'||x.temporalStage==='EXIT'))out.push({...copy(cut),inDur:Math.min(cut.inDur,.12),outDur:Math.min(cut.outDur,.06)});
 if(bad.some(x=>x.full===false)&&cut.hold!=='still')out.push(J.changeDirectionRoleV11(cut,'hold','still'));
 const contrast=bad.some(x=>(x.compositedContrast?.renderedVsBackgroundContrastP10??x.contrast?.renderedVsBackgroundContrastP10??Infinity)<3);
 if(contrast&&out.length){const treatment={shadow:2,scrim:.32};out.unshift({...copy(out[0]),params:{...copy(out[0].params),cinemaReadabilityRepair:treatment}});}
 const transient=bad.some(x=>x.temporalStage==='ENTRY'||x.temporalStage==='EXIT');
 if(transient&&out.length){const combined=copy(out[0]);combined.inDur=Math.min(cut.inDur,.22,cut.dur*.15);combined.outDur=Math.min(cut.outDur,.12,cut.dur*.08);out.unshift(combined);}
 return [...new Map(out.map(x=>[J.canonicalJSON(x),x])).values()].slice(0,3);
};
J.optimizeExplorationLineV13=async({p,c,f,sample,phases,signal,audio,anchors=[],budget=108,initialCuts=[],initialPlan=null,randomOnly=false,preserveCurrent=false})=>{
 if(J.songNativeLockedV8(p,c))throw Error('V13_LOCKED_LINE');
 const intent=J.songVisualIntentV11(p,audio,c,f,anchors);f={...f,sectionIndex:intent.sectionIndex,sectionPhase:intent.sectionPhase,boundaryConfidence:intent.boundaryConfidence,localAudio:intent.events.map(e=>({time:e.time,activity:e.value}))};
 const catalog=J.explorationCatalogV13(p).map(x=>({...x,generated:false,probed:false,safe:false})),archive=J.createExplorationArchiveV13(),seen=new Set(),nursery=[],repairs=[],exclusions=[],origins={fresh:0,mutation:0,crossover:0,repair:0,tune:0,initial:0};
 let compared=0,proposals=0,stalled=0,preservedReference=null;
 const originalCut=preserveCurrent&&initialPlan?.cuts.find(x=>x.line===c.line);
 const originalDescriptor=originalCut?J.explorationDescriptorV13(phases(originalCut).map(t=>{abort(signal);return sample(initialPlan,originalCut,t);}),initialPlan):null;
 const evaluate=(cut,origin,retain=true)=>{
  abort(signal);if(compared>=budget)return null;const key=J.canonicalJSON(cut);if(seen.has(key))return null;seen.add(key);compared++;origins[origin]++;
  for(const row of catalog)if(row.group==='style'?row.id===cut.styleKey:row.group==='layout'?row.id===cut.layout:row.id===get(cut,row.group))row.generated=true;
  const sp={...p,style:cut.style,styleKey:cut.styleKey},times=phases(cut),checks=times.map(t=>{abort(signal);try{return sample(sp,cut,t);}catch(error){if(error.name==='AbortError')throw error;return {eligible:false,readable:false,renderErrors:[error.message]};}});
  const safe=checks.every(e=>e.eligible)&&checks.some(e=>e.temporalStage==='HOLD'&&e.readable);
  for(const call of checks.flatMap(e=>e.registryDispatchV11||[])){const row=catalog.find(x=>x.group===call.group&&x.id===call.id);if(row){row.probed=true;if(safe)row.safe=true;}}
  if(checks.some(e=>e.renderErrors?.length)){exclusions.push({origin,layout:cut.layout,reason:'RENDERER_ERROR'});return null;}
  const fit=J.scoreExplorationV13(cut,f,intent,checks,p),descriptor=J.explorationDescriptorV13(checks,p),hold=checks.find(e=>e.temporalStage==='HOLD'&&e.readable)||checks[Math.floor(checks.length/2)];
  const item={...fit,cut,layout:cut.layout,styleKey:cut.styleKey,font:cut.params.font,params:cut.params,checks,times,descriptor,features:f,intent,ablations:[],attempts:[],origin,evidence:strip(hold),phaseEvidence:checks.map(strip),signature:descriptor.signature,typographySignature:descriptor.typography,rasterSignature:hold.raster,musicFit:fit.dimensions.musicFit,safe};
  item.dimensions.visualIndividuality={status:'MEASURED',vector:descriptor.vector};item.dimensions.surprise={status:'UNVERIFIED'};item.dimensions.artisticQuality='UNVERIFIED';
  if(origin==='initial'&&!preservedReference)preservedReference=item;
  if(preserveCurrent&&safe&&(originalDescriptor||preservedReference?.safe)&&J.explorationDistanceV13(originalDescriptor||preservedReference.descriptor,descriptor)>.12){exclusions.push({origin,reason:'PRESERVED_IDENTITY_LOSS'});return null;}
  if(safe&&retain){const retained=archive.insert(item);stalled=retained?0:stalled+1;}
  else if(!safe){exclusions.push({origin,layout:cut.layout,reason:'TEMPORAL_GLYPH_GATE',failures:checks.filter(e=>!e.eligible).slice(0,1).map(e=>({stage:e.temporalStage,full:e.full,safe:e.safe,height:e.height,readable:e.readable,contrast:e.compositedContrast?.renderedVsBackgroundContrastP10??e.contrast?.renderedVsBackgroundContrastP10,geometry:e.geometry,advanced:e.advancedChecks}))});if(nursery.length<6)nursery.push(item);}
  return item;
 };
 const repair=item=>{
  if(!item||item.safe)return;
  for(const cut of J.explorationRepairsV13(item.cut,item.checks).slice(0,2)){
   const fixed=evaluate(cut,'repair');if(!fixed)continue;
   const loss=J.explorationDistanceV13(item.descriptor,fixed.descriptor);
   repairs.push({layout:item.cut.layout,safe:fixed.safe,loss,idsPreserved:roles.every(g=>get(item.cut,g)===get(fixed.cut,g)),before:item.descriptor.vector,after:fixed.descriptor.vector});
   if(fixed.safe){fixed.repairEvidence=repairs.at(-1);break;}
  }
 };
 for(const cut of initialCuts){const item=evaluate(copy(cut),'initial');repair(item);}
 // 72% nominal exploration; observed failure rate draws from the repair reserve.
 // No fit sorting occurs before archive insertion. Stagnation restarts fresh.
 while(compared<Math.floor(budget*.76)&&proposals<budget){
  abort(signal);const parents=preserveCurrent?[...archive.rows,...initialCuts.map(cut=>({cut}))]:randomOnly||stalled>=5||!archive.rows.length?[]:[...archive.rows,...nursery.slice(-2)];
  let proposal;try{proposal=J.explorationProposalV13(p,c,catalog,proposals++,parents,anchors,preserveCurrent);}catch(error){exclusions.push({reason:'PARAMETER_CONTRACT',message:error.message});continue;}if(!proposal)continue;
  if(preserveCurrent&&initialCuts.length&&roles.filter(g=>get(proposal.cut,g)!==get(initialCuts[0],g)).length>2)continue;
  const item=evaluate(proposal.cut,proposal.mode);
  if(item&&!item.safe&&compared<Math.floor(budget*.76)&&proposals%2===0)repair(item);
  if(proposals%4===0)await new Promise(r=>setTimeout(r,0));
 }
 for(const item of nursery){if(compared>=budget-8)break;repair(item);}
 // Acoustic timing edits retain the discovered spatial genome and are accepted
 // only after a measured identity check and a music-axis improvement.
 for(const item of [...archive.rows]){
  if(compared>=budget)break;
  const early=intent.events.filter(e=>e.time>0&&e.time<=Math.min(.22,c.dur*.15)).sort((a,b)=>b.value-a.value||a.time-b.time)[0];
  const cut={...copy(item.cut),inDur:item.cut.enter==='cut'?0:early?.time??item.cut.inDur,expressiveEnvelopeV12:J.directionHoldEnvelopeV12(intent,item.cut),expressiveEventsV12:J.directionEventsV12(intent,item.cut),explorationParamsV13:{...item.cut.explorationParamsV13,camera:C((item.cut.explorationParamsV13?.camera??1)*(.8+intent.motion*.4),.2,1)}};
  const tuned=evaluate(cut,'tune',false);if(!tuned)continue;
  const loss=J.explorationDistanceV13(item.descriptor,tuned.descriptor),gain=(tuned.dimensions.musicFit??0)-(item.dimensions.musicFit??0);
  tuned.tuningEvidence={loss,gain,accepted:tuned.safe&&loss<=.12&&gain>=0};
  if(tuned.tuningEvidence.accepted)archive.insert(tuned);
 }
 if(!archive.rows.length)throw Object.assign(Error(preserveCurrent?'現在の演出を安全に保ったまま曲へ合わせられませんでした。元のMVを維持します。':'V13_NO_SAFE_EXPLORATION_LINE_'+c.line),{diagnostic:{compared,proposals,exclusions,repairs}});
 // A bounded arc portfolio keeps niches even when globally Pareto dominated.
 // Only now may the existing music/coherence score order complete sequences.
 const results=[...archive.rows];let ablationSamples=0;
 for(const item of results){
  const sp={...p,style:item.cut.style,styleKey:item.styleKey};
  for(const g of roles.filter(g=>get(item.cut,g)!==neutral[g])){
   abort(signal);if(ablationSamples+item.times.length>240)break;ablationSamples+=item.times.length;const control=J.changeDirectionRoleV11(item.cut,g,neutral[g]),checks=item.times.map(t=>sample(sp,control,t));
   item.ablations.push({group:g,id:get(item.cut,g),status:checks.some(e=>e.renderErrors?.length)?'FAILED':checks.every(e=>e.raster)?'MEASURED':'UNMEASURED',controlSafe:checks.every(e=>e.eligible),pixelDifference:checks.every(e=>e.raster)?mean(checks.map((e,i)=>delta(e.raster,item.checks[i].raster))):null,fitGain:checks.every(e=>e.eligible)?item.score-J.scoreExplorationV13(control,f,intent,checks,p).score:null,temporalContribution:J.temporalRoleContributionV112(c,item.times,item.checks,checks,intent)});
  }
  item.optimizerEvidence={compared,budget,ablationSamples,ablationBudget:240,proposals,origins,exclusions,repairs,repair:item.repairEvidence||null,tuning:item.tuningEvidence||null,axes:item.dimensions,ablations:item.ablations,interactions:item.ablations.filter(x=>x.pixelDifference>1e-6).map(x=>({groups:[x.group,'composedState'],status:'MEASURED',source:'marginal contribution in actual combined state; not additive synergy'})),intent,primaryMusic:item.primaryMusicEvidence,catalog,counts:Object.fromEntries(['registered','callable','eligible','generated','probed','safe'].map(k=>[k,catalog.filter(x=>x[k]).length])),archive:{capacity:12,size:results.length,descriptors:results.map(x=>x.descriptor.vector),minDistance:results.length>1?Math.min(...results.flatMap((x,i)=>results.slice(i+1).map(y=>J.explorationDistanceV13(x.descriptor,y.descriptor)))):null},seed:p.seed,originalAppearance:originalDescriptor?{status:'MEASURED',vector:originalDescriptor.vector}:null,explorationVersion:13,unmeasured:['artisticQuality','semantics','subjectRecognition','encodedSurvival']};
 }
 J.rankExplorationPortfolioV13(results);
 for(const item of results){item.optimizerEvidence.paretoRank=item.paretoRankV13;item.optimizerEvidence.ablationSamples=ablationSamples;item.checks=item.checks.map(({mask,...e})=>e);}
 return results;
};
const layerEvidence=J.directionLayersV111;J.directionLayersV111=(item,p)=>{
 const layers=layerEvidence(item,p);if(!item.descriptor)return layers;
 layers.typography={status:'MEASURED',value:item.descriptor.signature,source:'cached actual primary glyph mask signature'};
 layers.glyphMotion={status:'MEASURED',value:[item.descriptor.vector[4]],source:'cached successive actual primary glyph mask differences'};return layers;
};
const optimize=J.optimizeCreativeLineV10;J.optimizeCreativeLineV10=args=>J.isExplorationV13(args.p)?J.optimizeExplorationLineV13(args):optimize(args);
const arc=J.chooseCreativeArcV10;J.chooseCreativeArcV10=(p,portfolios,initial)=>{
 if(J.isExplorationV13(p))for(const step of portfolios)J.rankExplorationPortfolioV13(step.candidates);
 const selected=arc(p,portfolios,initial);if(J.isExplorationV13(p))selected.method='v13 measured niche/Pareto-front ranks + acoustic/recurrent whole-song beam';return selected;
};
const attach=J.attachCreativeEvidenceV10;J.attachCreativeEvidenceV10=(selection,storyboard,portfolios)=>{
 attach(selection,storyboard,portfolios);if(!storyboard.picks.some(x=>x.optimizerEvidence?.explorationVersion===13))return;
 selection.explorationVersion=13;selection.optimizerContract='kamen-exploration-first-13';
 for(const trace of selection.traces)trace.reason='seed付き自由探索 → 実Canvas多様性アーカイブ → 局所修復 → 音楽同期 → 全曲ビーム選択。芸術品質は未検証';
};
// Minimal new render parameters are cut-owned and shared by preview/MP4/probes.
const draw=J.mainDraw;J.mainDraw=(env,it)=>{
 const e=env.cut.explorationParamsV13;
 if(e&&J.isExplorationV13(env.plan)){
  it={...it,size:it.size*(e.size??1),x:(it.x??env.W/2)+(e.dx||0)*env.W,y:(it.y??env.H/2)+(e.dy||0)*env.H};
  env={...env,fx:{...env.fx,motion:env.fx.motion*(e.motion??1)}};
 }
 return draw(env,it);
};
J.explorationBackgroundV13=(p,c,cfg)=>{
 const crop=J.isExplorationV13(p)&&c?.explorationParamsV13?.crop;if(!crop)return cfg;
 return {...cfg,zoom:C((cfg.zoom||1)*crop.zoom,.5,3),x:C((cfg.x??50)+crop.x,0,100),y:C((cfg.y??50)+crop.y,0,100)};
};
J.explorationCameraV13=(p,c,cam)=>{
 if(!cam||!J.isExplorationV13(p)||!c?.explorationParamsV13)return cam;
 const strength=c.explorationParamsV13.camera??1,out={...cam};
 for(const k of ['x','y','rot','skx'])if(Number.isFinite(out[k]))out[k]*=strength;
 for(const k of ['s','sx','sy'])if(Number.isFinite(out[k]))out[k]=1+(out[k]-1)*strength;
 return out;
};
})();
