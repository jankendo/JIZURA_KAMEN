/* Random-first finishing. Technique identity is not an optimization variable.
   v9 persistence/rendering and v11.2's 640px gate remain authoritative. */
(()=>{'use strict';
const J=window.J,copy=J.clonePhotoRenderPlan,roles=['enter','hold','exit','cam','bg','treat','decor','fx','trans'];
const neutral={enter:'cut',hold:'still',exit:'cut',cam:'stillCamera',bg:'none',treat:'none',decor:'none',fx:null,trans:'cut'};
const get=(c,g)=>g==='fx'?c.registryFxV9??null:g==='decor'?(c.decor||[]).map(x=>x.id):c[g]??null;
const readability=J.adjustLocalReadability;J.adjustLocalReadability=(env,it)=>{
 const out=readability(env,it),color=J.isRandomFinisherV15?.(env.plan)&&env.cut.explorationParamsV13?.color;
 return color&&env.pass==='main'&&out.lyricRole!=='decorative'&&out.ghost!==false?{...out,color}:out;
};
const strip=({mask,raster,backgroundRasterV14,...e})=>e;
const abort=s=>{if(s?.aborted)throw new DOMException('Aborted','AbortError');};
J.isRandomFinisherV15=p=>(p?.songNativeDirection||p?.artDirection?.songNativeDirection)?.explorationVersion===15;
const is13=J.isExplorationV13;J.isExplorationV13=p=>is13(p)||J.isRandomFinisherV15(p);
J.creativeGenomeV15=c=>Object.fromEntries(['styleKey','layout',...roles].map(g=>[g,copy(get(c,g))]));
J.genomeChangesV15=(a,b)=>Object.keys(a).filter(g=>J.canonicalJSON(a[g])!==J.canonicalJSON(b[g]));
const assertGenome=(a,c)=>{if(J.genomeChangesV15(a,J.creativeGenomeV15(c)).length)throw Error('V15_FINISHER_CHANGED_GENOME');};
J.generateJizuraDirectionV15=async(p,a,o={})=>{
 const set=await J.generateJizuraDirectionV13(p,a,o);
 for(const x of set.candidates){x.proposal.grammarDirection.explorationVersion=15;x.proposal.grammarDirection.intensityV15='extreme';x.proposal.summary='ランダム演出を活かしてMVを仕上げる v15';}return set;
};
const make=J.makeArtDirection;J.makeArtDirection=(p,a,pr)=>{const art=make(p,a,pr);if(pr.grammarDirection?.explorationVersion===15)Object.assign(art.songNativeDirection,{explorationVersion:15,intensityV15:pr.grammarDirection.intensityV15||'extreme'});return art;};
const build=J.buildJizuraDirectionV9;J.buildJizuraDirectionV9=(p,a)=>{const d=build(p,a);if(J.isRandomFinisherV15(p))Object.assign(d,{explorationVersion:15,intensityV15:(p.songNativeDirection||p.artDirection.songNativeDirection).intensityV15||'extreme',searchAlgorithm:'KAMEN_RANDOM_FIRST_FINISHER_V15'});return d;};
// Audited bounds: drift at 1.4 travels <5% W and grows <7%; push
// at 1.3 adds <3.9% zoom. Other techniques retain their native limit (1).
J.strengthLimitsV15={motion:{drift:1.4},camera:{push:1.3},fx:{}};
// Flash/inversion mechanisms: omit strobe/inversion mechanisms from new random
// proposals; numeric strength never exceeds the original implementation unless
// the registry explicitly supplies a strength limit. No universal multiplier.
const flashRisk=d=>/flash|flicker|strobe|invert/i.test([d.id,...(d.tags||[])].join(' '));
J.randomProposalV15=(p,c,index,ordinal=0)=>{
 const rng=J.rng(J.h(p.seed,c.line+1,15,ordinal)),pick=a=>a.length?rng.pick(a):null;
 const available=g=>index.filter(x=>x.group===g&&x.eligible&&!flashRisk(x)).map(x=>x.id);
 const styleKey=pick(available('style')),style=J.STYLES[styleKey],layout=pick(available('layout').filter(id=>!J.LAYOUTS[id].fits||J.LAYOUTS[id].fits(J.graphemes(c.lineText).length)));
 if(!style||!layout)throw Error('V15_NO_CALLABLE_REGISTRY');
 let cut={...J.registryCandidateCut({...p,style,styleKey},c,layout,c.params.font||'embedded_bold','cut','still'),style,styleKey,registrySelectedV8:true,stagger:0};
 delete cut.generatedMotionV7;delete cut.grammar;delete cut.photoChoreography;
 const intense=(p.songNativeDirection||{}).intensityV15!=='normal';
 for(const g of roles){const active=available(g).filter(id=>id!==neutral[g]),prob=intense?({hold:.92,cam:.92,bg:.85,fx:.6,decor:.7,trans:.65}[g]??.8):.4;cut=J.changeDirectionRoleV11(cut,g,rng()<prob?pick(active)??neutral[g]:neutral[g]);}
 // Native strength retains bold original motions. Weaker strengths are a
 // separate safety repair, not the default distribution of every proposal.
 cut.explorationParamsV13={size:1,dx:0,dy:0,motion:intense?1:rng.range(.55,1),camera:intense?1:rng.range(.55,1),fx:1};
 for(const [parameter,group] of [['motion','hold'],['camera','cam']]){const cap=J.strengthLimitsV15[parameter][cut[group]]||1;if(intense&&cap>1)cut.explorationParamsV13[parameter]=rng.range(1,cap);}
 cut.creativeGenomeV15=J.creativeGenomeV15(cut);return cut;
};
// Initial fit uses text length/aspect and existing layout parameters. Geometry
// is subsequently corrected using actual glyph bounds, never by replacing IDs.
J.initialFinishV15=(p,source)=>{
 const c=copy(source),e=c.explorationParamsV13||{},n=J.graphemes(c.lineText||'').length;
 c.explorationParamsV13={...e,size:Math.min(e.size??1,n>12?.85:1),dx:e.dx||0,dy:e.dy||0};
 c.inDur=c.enter==='cut'?0:Math.min(c.inDur||.2,.22,c.dur*.15);
 c.outDur=c.exit==='cut'?0:Math.min(c.outDur||.1,.12,c.dur*.08);
 c.params={...c.params,cinemaReadabilityRepair:{shadow:2,scrim:.32,...copy(c.params.cinemaReadabilityRepair||{})}};
 return c;
};
J.finishRepairsV15=(p,c,checks)=>{
 const genome=J.creativeGenomeV15(c),causes=J.motionFailureV14(checks,c);
 const out=J.motionRepairsV14(c,checks).filter(x=>!J.genomeChangesV15(genome,J.creativeGenomeV15(x)).length);
 if(causes.includes('CONTRAST'))out.unshift({...copy(c),explorationParamsV13:{...c.explorationParamsV13,color:'#ffffff'},params:{...copy(c.params),cinemaReadabilityRepair:{shadow:2,scrim:Math.min(.9,Math.max(.65,(c.params.cinemaReadabilityRepair?.scrim||0)+.12))}}});
 if(checks.some(e=>!e.eligible&&e.ink>8&&e.contrast?.measured===false)&&Math.max(...checks.flatMap(e=>e.geometry||[]).map(g=>g.maxGlyphHeight||0))<.12)out.unshift({...copy(c),explorationParamsV13:{...c.explorationParamsV13,size:Math.min(2,(c.explorationParamsV13?.size??1)*1.25)}});
 // Derive a size correction from actual primary bounds and glyph height.
 const bounds=checks.filter(e=>!e.eligible&&e.bounds).map(e=>e.bounds),e=c.explorationParamsV13||{};
 if(bounds.length&&causes.some(x=>/SIZE|SAFE_AREA|READABILITY/.test(x))){
  const x0=Math.min(...bounds.map(b=>b.x0))/p.W,x1=Math.max(...bounds.map(b=>b.x1))/p.W,y0=Math.min(...bounds.map(b=>b.y0))/p.H,y1=Math.max(...bounds.map(b=>b.y1))/p.H;
  const maxGlyph=Math.max(0,...checks.flatMap(e=>e.geometry||[]).map(g=>g.maxGlyphHeight||0)),cap=p.H>p.W?.14:.19;
  const ratio=Math.min(.94,.76/Math.max(.01,x1-x0),.8/Math.max(.01,y1-y0),maxGlyph?cap/maxGlyph:1);
  out.splice(1,0,{...copy(c),explorationParamsV13:{...e,size:(e.size??1)*ratio,dx:(e.dx||0)+.5-(x0+x1)/2,dy:(e.dy||0)+.5-(y0+y1)/2}});
 }
 for(const x of out)assertGenome(genome,x);return out;
};
J.rerollRoleV15=(p,c,index,role,ordinal)=>{
 if(!['layout',...roles].includes(role))throw Error('V15_INVALID_CAUSAL_ROLE');
 const rng=J.rng(J.h(p.seed,c.line+1,15,ordinal,J.sid(role))),ids=index.filter(x=>x.group===role&&x.eligible&&!flashRisk(x)&&J.canonicalJSON(x.id)!==J.canonicalJSON(get(c,role))&&(role!=='layout'||!J.LAYOUTS[x.id].fits||J.LAYOUTS[x.id].fits(J.graphemes(c.lineText).length))).map(x=>x.id);
 if(!ids.length)return null;const id=rng.pick(ids);let cut;
 if(role==='layout'){
  const fresh=J.registryCandidateCut({...p,style:c.style,styleKey:c.styleKey},c,id,c.params.font||'embedded_bold',c.enter,c.hold);
  cut={...copy(c),layout:id,explorationParamsV13:{...c.explorationParamsV13,size:1,dx:0,dy:0},params:{...fresh.params,cinemaReadabilityRepair:copy(c.params.cinemaReadabilityRepair)}};
 }else cut=J.changeDirectionRoleV11(c,role,id);
 const changes=J.genomeChangesV15(J.creativeGenomeV15(c),J.creativeGenomeV15(cut));if(changes.some(g=>g!==role))throw Error('V15_NONLOCAL_REROLL');return cut;
};
J.optimizeRandomLineV15=async({p,c,f,sample,phases,signal,audio,budget=108,initialCuts=[],preserveCurrent=false,initialPlan=null})=>{
 if(J.songNativeLockedV8(p,c))throw Error('V15_LOCKED_LINE');
 const totalBudget=Math.max(1,Math.floor(Number.isFinite(budget)?budget:108)),fallbackReserve=preserveCurrent?0:totalBudget<=48?Math.min(12,Math.max(3,Math.floor(totalBudget*.12))):2,frontierBudget=Math.max(1,totalBudget-fallbackReserve),perGenomeBudget=frontierBudget<=48?Math.max(8,Math.floor(frontierBudget/2)):frontierBudget-1;
 const catalog=J.explorationCatalogV13(p),intent=J.songVisualIntentV11(p,audio,c,f),seen=new Set(),stateCache=new Map(),repairs=[],exclusions=[],origins={fresh:0,initial:0,repair:0,control:0,reroll:0,fallback:0,tune:0};const repairStats={attempted:0,succeeded:0,local:0,causalRerolls:0};let roleRetries={},compared=0,ordinal=0,genomeTrials=0,genomeSwitches=0,fallbackAttempted=false,fallbackExamined=0,safeFallbackUsed=false,safeCandidateFound=false,genomeStart=0,localRounds=0,passes=0,stagnantRerolls=0,current=null,lastCandidate=null,bestSafe=null,generated=null;
 const failureReasons={};
 const deficit=item=>item.checks.reduce((sum,e)=>{
  const contrast=e.compositedContrast?.renderedVsBackgroundContrastP10??e.contrast?.renderedVsBackgroundContrastP10;
  const b=e.bounds,overflow=b?Math.max(0,.105-b.x0/p.W)+Math.max(0,b.x1/p.W-.895)+Math.max(0,.075-b.y0/p.H)+Math.max(0,b.y1/p.H-.925):0;
  return sum+(e.eligible?0:(e.sampleOffset>Math.min(.22,c.dur*.15)&&e.sampleOffset<c.dur-Math.min(.12,c.dur*.08)?20:2))+(e.safe===false?3:0)+overflow*10+(e.geometry||[]).reduce((v,g)=>v+Number(!g.readable)+Math.max(0,g.maxGlyphHeight-(p.H>p.W?.145:.195))*10,0)+(e.advancedChecks||[]).filter(x=>!x.complete).length*3+Math.max(0,.04-(e.height||0))*20+(Number.isFinite(contrast)?Math.max(0,3-contrast):3);
 },0);
 const evaluate=(cut,kind,allowFallback=false)=>{
  abort(signal);if(compared>=(allowFallback?totalBudget:frontierBudget))return null;const key=J.canonicalJSON(cut);if(seen.has(key))return null;seen.add(key);compared++;origins[kind]++;
  const times=phases(cut),sp={...p,style:cut.style,styleKey:cut.styleKey,motionObservationV14:true},checks=times.map(t=>{abort(signal);return sample(sp,cut,t);});stateCache.set(key,new Map(times.map((t,i)=>[t,checks[i]])));
  Object.assign(checks,{planWidthV14:p.W,planHeightV14:p.H,cutTextV14:cut.lineText,cutParamsV14:cut.explorationParamsV13});
  const safe=checks.every(e=>e.eligible)&&checks.some(e=>e.temporalStage==='HOLD'&&e.readable),descriptor=J.motionDescriptorV14(checks,p),fit=J.scoreExplorationV13(cut,f,intent,checks,p),hold=checks.find(e=>e.temporalStage==='HOLD'&&e.readable)||checks[Math.floor(checks.length/2)];
  if(kind==='repair'){repairStats.attempted++;repairStats.succeeded+=Number(safe);repairStats.local++;}
  const causes=safe?[]:J.motionFailureV14(checks,cut);for(const cause of causes)failureReasons[cause]=(failureReasons[cause]||0)+1;
  if(!safe)exclusions.push({origin:kind,causes});
  const item={...fit,cut,checks,times,descriptor,safe,features:f,intent,ablations:[],attempts:[],layout:cut.layout,styleKey:cut.styleKey,font:cut.params.font,params:cut.params,evidence:strip(hold),phaseEvidence:checks.map(strip),signature:descriptor.signature,typographySignature:descriptor.typography,rasterSignature:hold.raster};lastCandidate=item;return item;
 };
 const raw=initialCuts[0]||(preserveCurrent?initialPlan?.cuts.find(x=>x.line===c.line):J.randomProposalV15(p,c,catalog,ordinal++));
 if(!raw)throw Error('V15_MISSING_CURRENT_GENOME');
 const seenGenomes=new Set();let freshProposalAttempts=0;
 if(!preserveCurrent)genomeTrials++;
 generated=raw.creativeGenomeV15||J.creativeGenomeV15(raw);genomeStart=compared;current=evaluate(J.initialFinishV15(p,raw),preserveCurrent?'initial':'fresh');
 seenGenomes.add(J.canonicalJSON(generated));
 if(!preserveCurrent&&!initialCuts[0])genomeTrials=1;
 const tryFreshGenome=()=>{
  for(let attempts=0;attempts<totalBudget&&compared<frontierBudget;attempts++){
   if(freshProposalAttempts>=totalBudget)return false;
   const next=J.randomProposalV15(p,c,catalog,ordinal++),candidateGenome=J.creativeGenomeV15(next),key=J.canonicalJSON(candidateGenome);freshProposalAttempts++;genomeTrials++;
   if(seenGenomes.has(key))continue;seenGenomes.add(key);genomeSwitches++;generated=candidateGenome;genomeStart=compared;localRounds=0;passes=0;stagnantRerolls=0;roleRetries={};current=evaluate(J.initialFinishV15(p,next),'fresh');return true;
  }
  return false;
 };
 let frontierDone=false;
 while(!frontierDone){
  abort(signal);
  if((!current||compared>=frontierBudget||compared-genomeStart>=perGenomeBudget||passes>=perGenomeBudget*2)&&!preserveCurrent&&compared<frontierBudget){
   if(tryFreshGenome())continue;frontierDone=true;break;
  }
  if(!current||compared>=frontierBudget||compared-genomeStart>=perGenomeBudget||passes++>=perGenomeBudget*2){frontierDone=true;break;}
  if(current.safe){
   current.generatedGenomeV15=generated;safeCandidateFound=true;if(!bestSafe||current.descriptor.holdMotion.value>bestSafe.descriptor.holdMotion.value)bestSafe=current;
   if(preserveCurrent||current.descriptor.holdMotion.value>1e-6){bestSafe=current;frontierDone=true;break;}
   // A safe static candidate remains available while a fresh genome is tried.
   if(compared<frontierBudget&&tryFreshGenome())continue;
   frontierDone=true;break;
  }
  let improved=false;
  // Cumulative edits in priority order. Keep a repaired state only if it loses
  // fewer hard failures; no musical/beauty score participates.
  for(const cut of (localRounds++<5?J.finishRepairsV15(p,current.cut,current.checks):[])){
   if(compared-genomeStart>=perGenomeBudget||compared>=frontierBudget)break;
   const fixed=evaluate(cut,'repair');if(!fixed)continue;
   repairs.push({safe:fixed.safe,idsPreserved:true,causes:J.motionFailureV14(current.checks,current.cut)});
   if(fixed.safe){current=fixed;stagnantRerolls=0;improved=true;break;}
   if(deficit(fixed)<deficit(current)){current=fixed;stagnantRerolls=0;improved=true;break;}
  }
  if(current.safe)continue;
  if(improved)continue;
  if(preserveCurrent){frontierDone=true;break;}
  const causes=J.motionFailureV14(current.checks,current.cut);
  // Removal controls diagnose a role causally. After two failed random
  // alternatives, only that proven failing role may use its neutral control.
  let causal=null,causalGain=0,causalControl=null;const missing=current.checks.filter(e=>!e.eligible&&!e.geometry?.length).map(e=>e.sampleOffset);let restoredMissing=false;
  const stages=new Set(current.checks.filter(e=>!e.eligible).map(e=>e.temporalStage)),priority=stages.size===1&&stages.has('EXIT')?'exit':stages.size===1&&stages.has('ENTRY')?'enter':null;
  for(const role of [...roles].sort((a,b)=>Number(b===priority)-Number(a===priority)).filter(g=>get(current.cut,g)&&J.canonicalJSON(get(current.cut,g))!==J.canonicalJSON(g==='decor'?[]:neutral[g]))){
   if(compared-genomeStart>=perGenomeBudget||compared>=frontierBudget)break;
   const control=evaluate(J.changeDirectionRoleV11(current.cut,role,neutral[role]),'control');if(!control)continue;
   if(control.safe){causal=role;causalGain=Infinity;causalControl=control;restoredMissing=true;break;}
   if(missing.length&&missing.every(t=>control.checks.find(e=>e.sampleOffset===t)?.geometry?.length))restoredMissing=true;
   const gain=deficit(current)-deficit(control);if(gain>causalGain){causal=role;causalGain=gain;causalControl=control;}
  }
  if(missing.length&&!restoredMissing)causal='layout';
  if(!causal&&causes.some(x=>/SIZE|SAFE_AREA|GLYPH|READABILITY|TRANSIENT/.test(x)))causal='layout';
  if(!causal){current=null;continue;}
  if(causalControl&&causalGain>0&&(roleRetries[causal]||0)>=2){
   repairs.push({safe:causalControl.safe,role:causal,reason:causes,from:get(current.cut,causal),to:get(causalControl.cut,causal),idsPreserved:false,policy:'two random causal alternatives failed; removal reduces observed safety failures for this role only'});
   if(deficit(causalControl)<deficit(current))stagnantRerolls=0;current=causalControl;continue;
  }
  roleRetries[causal]=(roleRetries[causal]||0)+1;repairStats.causalRerolls++;
  const replacement=J.rerollRoleV15(p,current.cut,catalog,causal,ordinal++);if(!replacement){current=null;continue;}
  localRounds=0;repairs.push({safe:false,role:causal,reason:causes,from:get(current.cut,causal),to:get(replacement,causal),idsPreserved:false});
  const priorDeficit=deficit(current),rerolled=evaluate(J.initialFinishV15(p,replacement),'reroll');
  if(!rerolled)current=null;else{current=rerolled;if(current.safe||deficit(current)<priorDeficit)stagnantRerolls=0;else if(++stagnantRerolls>=8)current=null;}
  await new Promise(r=>setTimeout(r,0));
 }
 if(!bestSafe&&current?.safe){current.generatedGenomeV15=generated;bestSafe=current;safeCandidateFound=true;}
 if(!bestSafe&&!preserveCurrent){
  fallbackAttempted=true;const remaining=totalBudget-compared,fallbackBudget=Math.min(fallbackReserve,remaining);
  if(fallbackBudget>1){
   const base=current?.cut||lastCandidate?.cut||raw,failed=current?.checks||lastCandidate?.checks||[],scaleFailures=failed.filter(e=>!e.eligible).map(e=>({stage:e.temporalStage,reasons:J.motionFailureV14([e],base),observed:{safe:e.safe,full:e.full,height:e.height,ink:e.ink,contrastP10:e.compositedContrast?.renderedVsBackgroundContrastP10??e.contrast?.renderedVsBackgroundContrastP10,geometry:e.geometry||[],core:e.advancedChecks||[]}}));
   const pick={cut:base,features:f,intent,score:0,optimizerEvidence:{catalog:copy(catalog)}},fallbackStates=new Set(),fallbackSample=(plan,cut,time)=>{const key=J.canonicalJSON(cut),cached=stateCache.get(key)?.get(time);if(cached)return cached;fallbackStates.add(key);return sample(plan,cut,time);};
   const recovered=await recover(p,pick,scaleFailures,{sample:fallbackSample,phases,audio,signal,budget:fallbackBudget,frontier:[]});fallbackExamined=fallbackStates.size;compared+=fallbackExamined;origins.fallback+=fallbackExamined;
   for(const row of recovered){abort(signal);const key=J.canonicalJSON(row.cut),checks=row.checks||[];if(seen.has(key)||!checks.every(e=>e.eligible)||!checks.some(e=>e.temporalStage==='HOLD'&&e.readable))continue;seen.add(key);Object.assign(checks,{planWidthV14:p.W,planHeightV14:p.H,cutTextV14:row.cut.lineText,cutParamsV14:row.cut.explorationParamsV13});const descriptor=J.motionDescriptorV14(checks,p),fit=J.scoreExplorationV13(row.cut,f,intent,checks,p),hold=checks.find(e=>e.temporalStage==='HOLD'&&e.readable)||checks[Math.floor(checks.length/2)],fixed={...row,...fit,cut:row.cut,checks,times:row.times||phases(row.cut),descriptor,safe:true,features:f,intent,ablations:[],attempts:[],layout:row.cut.layout,styleKey:row.cut.styleKey,font:row.cut.params.font,params:row.cut.params,evidence:strip(hold),phaseEvidence:checks.map(strip),signature:descriptor.signature,typographySignature:descriptor.typography,rasterSignature:hold.raster};bestSafe=fixed;generated=J.creativeGenomeV15(fixed.cut);fixed.generatedGenomeV15=generated;safeCandidateFound=true;safeFallbackUsed=true;break;}
  }
 }
 if(bestSafe)generated=bestSafe.generatedGenomeV15||generated;
 const failureSummary=Object.entries(failureReasons).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([reason,count])=>({reason,count}));
 const searchSummary={line:c.line,displayLine:c.line+1,fullRandomGenomeTrials:genomeTrials,localRepairCount:repairStats.local,causalRerollCount:repairStats.causalRerolls,evaluatedCandidates:compared,budget:totalBudget,primaryFailureReasons:failureSummary,newGenomeSwitches:genomeSwitches,fallbackAttempted,fallbackCandidatesExamined:fallbackExamined,safeCandidateFound};
 if(!bestSafe)throw Object.assign(Error('V15_NO_SAFE_RANDOM_LINE_'+c.line),{diagnostic:searchSummary});
 // Timing follows discovery; retain original expressive progression and never
 // add repeated flash events. A failed timing edit simply keeps the safe cut.
 const early=intent.events.filter(e=>e.time>0&&e.time<=Math.min(.22,c.dur*.15)).sort((a,b)=>b.value-a.value||a.time-b.time)[0];
 if(early&&bestSafe.cut.enter!=='cut'){
  const cut={...copy(bestSafe.cut),inDur:early.time};assertGenome(J.creativeGenomeV15(bestSafe.cut),cut);
  const tuned=evaluate(cut,'tune');if(tuned?.safe)bestSafe=tuned;
 }
 const item=bestSafe;
 // A bounded 30fps light-change screen supplements the unchanged glyph gate.
 // It is an observation, not a medical photosensitivity certification.
 const light=[],window=Math.min(2,item.cut.dur),sp={...p,style:item.cut.style,styleKey:item.cut.styleKey};
 for(let i=0;i<Math.ceil(window*30);i++){abort(signal);const t=i/30,e=sample(sp,item.cut,t);if(e.renderErrors?.length)throw Error('V15_RENDERER_ERROR');if(e.raster)light.push({time:t,luma:e.raster.reduce((s,v,k)=>s+v*[.2126,.7152,.0722][k%3],0)/(e.raster.length/3)});}
 const jumps=light.slice(1).flatMap((x,i)=>Math.abs(x.luma-light[i].luma)>.2?[x.time]:[]),unsafe=jumps.some(t=>jumps.filter(x=>x>=t&&x<t+1).length>=6);
 if(unsafe)throw Object.assign(Error('V15_TEMPORAL_LIGHT_CHANGE_REJECTED'),{diagnostic:{line:c.line,jumps,window}});
 item.lightSafetyV15={status:'MEASURED',sampleRate:30,window,jumps,criterion:'fewer than six >.2 mean weighted-RGB brightness jumps in any sampled second'};
 const final=J.creativeGenomeV15(item.cut);item.cut.creativeGenomeV15=generated;item.cut.creativeFinalGenomeV15=final;
 // Same-time removal evidence observes actual production contribution; IDs
 // alone cannot establish camera, background or FX realization.
 for(const g of roles.filter(g=>get(item.cut,g)&&J.canonicalJSON(get(item.cut,g))!==J.canonicalJSON(g==='decor'?[]:neutral[g]))){
  const control=J.changeDirectionRoleV11(item.cut,g,neutral[g]),checks=item.times.map(t=>{abort(signal);return sample({...p,style:item.cut.style,styleKey:item.cut.styleKey,motionObservationV14:true},control,t);});
  const contribution=J.temporalRoleContributionV112(c,item.times,item.checks,checks,intent);
  item.ablations.push({group:g,id:get(item.cut,g),status:contribution.status,controlSafe:checks.every(e=>e.eligible),pixelDifference:contribution.samples.reduce((s,e)=>s+(e.spatialDifference||0),0)/checks.length,temporalContribution:contribution});
 }
 const activeMotion=item.descriptor.holdMotion.value>1e-6,changes=J.genomeChangesV15(generated,final);
 const observed=catalog.map(row=>({...row,generated:row.group==='style'?row.id===final.styleKey:row.group==='layout'?row.id===final.layout:row.group==='decor'?final.decor.includes(row.id):row.id===final[row.group],probed:item.checks.some(e=>e.registryDispatchV11?.some(x=>x.group===row.group&&x.id===row.id)),safe:item.checks.some(e=>e.registryDispatchV11?.some(x=>x.group===row.group&&x.id===row.id))}));
 const repairSummary={attempted:repairs.length,localEvaluations:repairStats.local,causalRerolls:repairStats.causalRerolls,changedRoles:[...new Set(repairs.filter(x=>x.role).map(x=>x.role))]};
 item.optimizerEvidence={explorationVersion:15,compared,budget:totalBudget,origins,search:searchSummary,repairSummary,repairStats,exclusions:failureSummary,axes:item.dimensions,ablations:item.ablations,catalog:observed,counts:Object.fromEntries(['registered','callable','eligible','generated','probed','safe'].map(k=>[k,observed.filter(x=>x[k]).length])),genome:{generated,final,changedRoles:changes,retention:1-changes.length/Object.keys(generated).length},...(safeFallbackUsed?{recoveryMode:'SAFE_FALLBACK',reason:'RANDOM_FRONTIER_EXHAUSTED'}:{}),intensity:{requested:'かなり激しい',nativeStrength:true,status:activeMotion?'OBSERVED_MOTION':'UNMET',scope:'sampled primary motion; subjective intensity UNVERIFIED'},lightSafety:item.lightSafetyV15,motionV14:J.motionObservationV14(item),seed:p.seed,artisticQuality:'UNVERIFIED'};
 item.checks=item.checks.map(strip);return [item];
};
J.chooseRandomStoryboardV15=(p,portfolios)=>{
 const picks=portfolios.map(step=>{const c=step.candidates.find(x=>x.safe&&x.evidence?.eligible);if(!c)throw Error('V15_NO_SAFE_SEQUENCE');return {...c,line:step.line,energy:step.energy,role:step.role};});
 return {status:picks.length?'MEASURED_SAFE_SEQUENCE':'NOT_APPLICABLE_NO_LYRIC_STEPS',picks,score:null,method:'v15 first safe random genome; no score ordering',creativeArc:{status:'MEASURED',artisticQuality:'UNVERIFIED'}};
};
const optimize=J.optimizeCreativeLineV10;J.optimizeCreativeLineV10=args=>J.isRandomFinisherV15(args.p)?J.optimizeRandomLineV15(args):optimize(args);
const arc=J.chooseCreativeArcV10;J.chooseCreativeArcV10=(p,rows,initial)=>J.isRandomFinisherV15(p)?J.chooseRandomStoryboardV15(p,rows):arc(p,rows,initial);
const motifs=J.explorationMotifSeedsV13;J.explorationMotifSeedsV13=(p,...args)=>J.isRandomFinisherV15(p)?[]:motifs(p,...args);
const attach=J.attachCreativeEvidenceV10;J.attachCreativeEvidenceV10=(s,b,rows)=>{attach(s,b,rows);if(!b.picks.some(x=>x.optimizerEvidence?.explorationVersion===15))return;s.explorationVersion=15;s.optimizerContract='kamen-random-finisher-15';for(const t of s.traces)t.reason='seed付きランダム生成 → 演出の種類を保持 → 可読性と時間の調整 → 640px安全確認。芸術品質は未検証';};
const fix=J.runSongNativeFixSearch;J.runSongNativeFixSearch=(before,q,a,p,range,options={})=>{
 if(!J.isRandomFinisherV15(p))return fix(before,q,a,p,range,options);
 const cuts=before.registryV8?.selection?.entries?.map(x=>copy(x.cut));
 if(!cuts?.length)throw Error('V15_MISSING_FINISH_SOURCE');
 return fix(before,q,a,p,range,{...options,preserveCurrent:true,initialCuts:cuts});
};
const recover=J.recoverDirectionLineV112;J.recoverDirectionLineV112=async(p,pick,failures,o)=>{
 if(!J.isRandomFinisherV15(p))return recover(p,pick,failures,o);
 // Final-scale failures cannot restart discovery or silently use a v14 arc.
 const detail=(plan,cut,t)=>{const low=o.sample(plan,cut,t),high=o.sample.verifyScale(plan,cut,t);return {...low,...high,mask:low.mask,raster:low.raster,backgroundRasterV14:low.backgroundRasterV14,sampleOffset:t};};
 try{const rows=await J.optimizeRandomLineV15({...o,sample:detail,p,c:pick.cut,f:pick.features,initialCuts:[pick.cut],preserveCurrent:true});for(const row of rows){row.optimizerEvidence.repairSummary.priorScaleRepairCount=pick.optimizerEvidence?.repairSummary?.attempted||0;row.optimizerEvidence.repairStats.priorScaleRepairSuccesses=pick.optimizerEvidence?.repairStats?.succeeded||0;}return rows;}catch(e){if(e.message.startsWith('V15_NO_SAFE'))return [];throw e;}
};
})();
