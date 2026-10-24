/* Random-first finishing. Technique identity is not an optimization variable.
   v9 persistence/rendering and the unchanged 640px criteria remain authoritative. */
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
 // Preserve a high-energy random mix without stacking every glyph/frame effect
 // on almost every trial. Role identities and native technique strengths stay
 // random; unsafe pairings are still decided only by the real Canvas gate.
 const activation=intense?{enter:.45,hold:.86,exit:.45,cam:.64,bg:.8,treat:.62,decor:.5,fx:.6,trans:.45}:{};
 for(const g of roles){const active=available(g).filter(id=>id!==neutral[g]),prob=intense?activation[g]:.4;cut=J.changeDirectionRoleV11(cut,g,rng()<prob?pick(active)??neutral[g]:neutral[g]);}
 if(intense&&c.dur<=2.4&&cut.enter!=='cut'&&cut.exit!=='cut')cut=J.changeDirectionRoleV11(cut,rng()<.5?'enter':'exit','cut');
 if(intense){const overlays=['bg','treat','decor','fx'].filter(g=>J.canonicalJSON(get(cut,g))!==J.canonicalJSON(g==='decor'?[]:neutral[g]));while(overlays.length>2){const role=rng.pick(overlays);cut=J.changeDirectionRoleV11(cut,role,neutral[role]);overlays.splice(overlays.indexOf(role),1);}}
 if(intense&&J.graphemes(c.lineText||'').length<=8&&cut.hold!=='still'&&cut.cam!=='stillCamera'&&rng()<.35){const role=rng()<.5?'hold':'cam';cut=J.changeDirectionRoleV11(cut,role,neutral[role]);}
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
 // Leave short Japanese phrases room at both canvas ratios; long lines keep
 // the existing fit cap. The renderer's measured bounds still drive repairs.
 const aspectCap=p.H>p.W&&n>4?.9:1,lengthCap=n>12?.85:n>8?.94:1;
 c.explorationParamsV13={...e,size:Math.min(e.size??1,aspectCap,lengthCap),dx:e.dx??0,dy:e.dy??0};
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
// Recovery constructs a verified prefix instead of mutating an unsafe complete
// recipe. Each rejected addition is isolated by the preceding safe state.
J.composeSafeRandomV15=async({p,c,index,evaluate,remaining,signal,diagnostic})=>{
 const rng=J.rng(J.h(p.seed,c.line+1,15,9107)),shuffle=a=>a.map(x=>({x,k:rng()})).sort((a,b)=>a.k-b.k).map(x=>x.x);
 const available=g=>index.filter(x=>x.group===g&&x.eligible&&!flashRisk(x)).map(x=>x.id);
 const layouts=shuffle(available('layout').filter(id=>!J.LAYOUTS[id].fits||J.LAYOUTS[id].fits(J.graphemes(c.lineText).length))),styles=shuffle(available('style'));
 // Include registered whole-phrase layouts within a bounded, shuffled shortlist;
 // styles still come from the complete eligible catalog, without genre recipes.
 const phrase=['center','mixed','vcols','huge','photoPhrase'].filter(id=>layouts.includes(id));
 const shortlist=shuffle([...new Set([...layouts.slice(0,5),...phrase])]);
 diagnostic.safetyAnchor.attempted=true;let safe=null;const anchorBudget=Math.min(16,Math.max(1,Math.floor(remaining()*.4)));
 for(let i=0;i<shortlist.length&&diagnostic.safetyAnchor.examined<anchorBudget&&remaining()>0;i++){
  abort(signal);const styleKey=styles[i%styles.length],style=J.STYLES[styleKey];
  let cut={...J.registryCandidateCut({...p,style,styleKey},c,shortlist[i],c.params.font||'embedded_bold','cut','still'),style,styleKey,registrySelectedV8:true,stagger:0};
  delete cut.generatedMotionV7;delete cut.grammar;delete cut.photoChoreography;
  for(const role of roles)cut=J.changeDirectionRoleV11(cut,role,neutral[role]);
  cut=J.initialFinishV15(p,cut);cut.explorationParamsV13={size:1,dx:0,dy:0,motion:1,camera:1,fx:1};
  let row=evaluate(cut,'anchor');if(!row)continue;diagnostic.safetyAnchor.examined++;
  if(!row.safe){diagnostic.safetyAnchor.failureReasons.push(...J.motionFailureV14(row.checks,row.cut));
   for(const repaired of J.finishRepairsV15(p,row.cut,row.checks).slice(0,2)){
    if(diagnostic.safetyAnchor.examined>=anchorBudget||remaining()<=0)break;const fixed=evaluate(repaired,'anchorRepair');if(fixed)diagnostic.safetyAnchor.examined++;if(fixed?.safe){row=fixed;break;}
   }
  }
  if(row.safe){safe=row;break;}
  await new Promise(r=>setTimeout(r,0));
 }
 diagnostic.safetyAnchor.failureReasons=[...new Set(diagnostic.safetyAnchor.failureReasons)];
 diagnostic.safetyAnchor.found=!!safe;if(!safe)return null;
 diagnostic.safetyAnchor.genome=J.creativeGenomeV15(safe.cut);
 for(const role of shuffle(roles)){
  abort(signal);if(remaining()<=0)break;
  const ids=shuffle(available(role).filter(id=>id!==neutral[role]));if(!ids.length)continue;
  const before=safe;let accepted=null;
  // At most two alternatives for this role, retaining all previously safe roles.
  for(const id of ids.slice(0,2)){
   if(remaining()<=0)break;
   const proposed=J.changeDirectionRoleV11(before.cut,role,id),row=evaluate(proposed,'composition');if(!row)continue;
   diagnostic.randomCompositions.attempted++;
   if(row.safe){accepted=row;diagnostic.randomCompositions.safe++;break;}
   diagnostic.randomCompositions.rejected++;
   const causes=J.motionFailureV14(row.checks,row.cut);let repaired=false;
   for(const cut of J.finishRepairsV15(p,row.cut,row.checks).slice(0,2)){
    if(remaining()<=roles.length)break;
    const fixed=evaluate(cut,'compositionRepair');if(fixed?.safe){accepted=fixed;repaired=true;diagnostic.randomCompositions.safe++;break;}
   }
   diagnostic.randomCompositions.failures.push({role,id,causes,repaired});if(accepted)break;
  }
  if(accepted){if(J.genomeChangesV15(J.creativeGenomeV15(before.cut),J.creativeGenomeV15(accepted.cut)).some(g=>g!==role))throw Error('V15_NONLOCAL_COMPOSITION');safe=accepted;}
  diagnostic.randomCompositions.roles.push({role,accepted:!!accepted,retainedPrior:!accepted});
  await new Promise(r=>setTimeout(r,0));
 }
 // An internal static anchor alone is never a completed random composition.
 if(!diagnostic.randomCompositions.roles.some(x=>x.accepted))return null;
 diagnostic.recovery.safe=true;return safe;
};
J.checkRandomLightV15=(p,cut,sample,signal)=>{
 const light=[],window=Math.min(2,cut.dur),sp={...p,style:cut.style,styleKey:cut.styleKey};
 for(let i=0;i<Math.ceil(window*30);i++){abort(signal);const t=i/30,e=sample(sp,cut,t);if(e.renderErrors?.length)throw Error('V15_RENDERER_ERROR');if(e.raster)light.push({time:t,luma:e.raster.reduce((s,v,k)=>s+v*[.2126,.7152,.0722][k%3],0)/(e.raster.length/3)});}
 const jumps=light.slice(1).flatMap((x,i)=>Math.abs(x.luma-light[i].luma)>.2?[x.time]:[]),unsafe=jumps.some(t=>jumps.filter(x=>x>=t&&x<t+1).length>=6);
 if(unsafe)throw Object.assign(Error('V15_TEMPORAL_LIGHT_CHANGE_REJECTED'),{diagnostic:{line:cut.line,jumps,window}});
 return {status:'MEASURED',sampleRate:30,window,jumps,criterion:'fewer than six >.2 mean weighted-RGB brightness jumps in any sampled second'};
};
J.optimizeRandomLineV15=async({p,c,f,sample,phases,signal,audio,budget=108,initialCuts=[],preserveCurrent=false,initialPlan=null})=>{
 if(J.songNativeLockedV8(p,c))throw Error('V15_LOCKED_LINE');
 const totalBudget=Math.max(1,Math.floor(Number.isFinite(budget)?budget:108)),fallbackReserve=preserveCurrent?0:Math.min(totalBudget-1,Math.min(48,Math.max(3,Math.floor(totalBudget*.45)))),frontierBudget=totalBudget-fallbackReserve,perGenomeBudget=Math.min(28,Math.max(1,Math.floor(frontierBudget/3)));
 const catalog=J.explorationCatalogV13(p),intent=J.songVisualIntentV11(p,audio,c,f),seen=new Set(),repairs=[],exclusions=[],origins={fresh:0,initial:0,repair:0,control:0,reroll:0,fallback:0,tune:0,anchor:0,anchorRepair:0,composition:0,compositionRepair:0};const repairStats={attempted:0,succeeded:0,local:0,causalRerolls:0};let roleRetries={},compared=0,ordinal=0,genomeTrials=0,genomeSwitches=0,fallbackAttempted=false,fallbackExamined=0,safeFallbackUsed=false,safeCandidateFound=false,genomeStart=0,localRounds=0,passes=0,stagnantRerolls=0,current=null,lastCandidate=null,bestSafe=null,generated=null;
 const staged={safetyAnchor:{attempted:false,found:false,examined:0,failureReasons:[]},randomCompositions:{attempted:0,safe:0,rejected:0,roles:[],failures:[]},recovery:{attempted:false,safe:false}};
 const failureReasons={},phaseFailureReasons={},failureCombinations={};let fallbackChanges=[];
 const deficit=item=>item.checks.reduce((sum,e)=>{
  const contrast=e.compositedContrast?.renderedVsBackgroundContrastP10??e.contrast?.renderedVsBackgroundContrastP10;
  const b=e.bounds,overflow=b?Math.max(0,.105-b.x0/p.W)+Math.max(0,b.x1/p.W-.895)+Math.max(0,.075-b.y0/p.H)+Math.max(0,b.y1/p.H-.925):0;
  return sum+(e.eligible?0:(e.sampleOffset>Math.min(.22,c.dur*.15)&&e.sampleOffset<c.dur-Math.min(.12,c.dur*.08)?20:2))+(e.safe===false?3:0)+overflow*10+(e.geometry||[]).reduce((v,g)=>v+Number(!g.readable)+Math.max(0,g.maxGlyphHeight-(p.H>p.W?.145:.195))*10,0)+(e.advancedChecks||[]).filter(x=>!x.complete).length*3+Math.max(0,.04-(e.height||0))*20+(Number.isFinite(contrast)?Math.max(0,3-contrast):3);
 },0);
 const evaluate=(cut,kind,allowFallback=false)=>{
  abort(signal);if(compared>=(allowFallback?totalBudget:frontierBudget))return null;const key=J.canonicalJSON(cut);if(seen.has(key))return null;seen.add(key);compared++;origins[kind]++;
  const times=phases(cut),sp={...p,style:cut.style,styleKey:cut.styleKey,motionObservationV14:true},checks=times.map(t=>{abort(signal);const low=sample(sp,cut,t);if(!allowFallback||!sample.verifyScale)return low;const high=sample.verifyScale(sp,cut,t);return {...low,...high,eligible:low.eligible&&high.eligible,renderErrors:[...(low.renderErrors||[]),...(high.renderErrors||[])],mask:low.mask,raster:low.raster,backgroundRasterV14:low.backgroundRasterV14,sampleOffset:t};});
  if(checks.some(e=>e.renderErrors?.length))throw Object.assign(Error('V15_RENDERER_ERROR'),{code:'RENDERER_ERROR',diagnostic:{line:c.line,displayLine:c.line+1,candidate:compared,renderErrors:checks.flatMap(e=>e.renderErrors||[]).slice(0,4)}});
  Object.assign(checks,{planWidthV14:p.W,planHeightV14:p.H,cutTextV14:cut.lineText,cutParamsV14:cut.explorationParamsV13});
  const safe=checks.every(e=>e.eligible)&&checks.some(e=>e.temporalStage==='HOLD'&&e.readable),descriptor=J.motionDescriptorV14(checks,p),fit=J.scoreExplorationV13(cut,f,intent,checks,p),hold=checks.find(e=>e.temporalStage==='HOLD'&&e.readable)||checks[Math.floor(checks.length/2)];
  if(kind==='repair'){repairStats.attempted++;repairStats.succeeded+=Number(safe);repairStats.local++;}
  const causes=safe?[]:J.motionFailureV14(checks,cut);for(const cause of causes)failureReasons[cause]=(failureReasons[cause]||0)+1;
  if(!safe)for(const e of checks.filter(x=>!x.eligible)){const phase=[e];Object.assign(phase,{planWidthV14:p.W,planHeightV14:p.H,cutTextV14:cut.lineText});for(const cause of J.motionFailureV14(phase,cut)){const key=e.temporalStage+':'+cause;phaseFailureReasons[key]=(phaseFailureReasons[key]||0)+1;}}
  if(!safe)exclusions.push({origin:kind,causes});
  if(!safe){const active=roles.filter(g=>J.canonicalJSON(get(cut,g))!==J.canonicalJSON(g==='decor'?[]:neutral[g])).map(g=>g+':'+String(get(cut,g))).join('|');failureCombinations[active]=(failureCombinations[active]||0)+1;}
  const item={...fit,cut,checks,times,descriptor,safe,features:f,intent,ablations:[],attempts:[],layout:cut.layout,styleKey:cut.styleKey,font:cut.params.font,params:cut.params,evidence:strip(hold),phaseEvidence:checks.map(strip),signature:descriptor.signature,typographySignature:descriptor.typography,rasterSignature:hold.raster};lastCandidate=item;return item;
 };
 const raw=initialCuts[0]||(preserveCurrent?initialPlan?.cuts.find(x=>x.line===c.line):J.randomProposalV15(p,c,catalog,ordinal++));
 if(!raw)throw Error('V15_MISSING_CURRENT_GENOME');
 const seenGenomes=new Set();let freshProposalAttempts=0;
 generated=raw.creativeGenomeV15||J.creativeGenomeV15(raw);genomeStart=compared;current=evaluate(J.initialFinishV15(p,raw),preserveCurrent?'initial':'fresh');
 seenGenomes.add(J.canonicalJSON(generated));
 if(!preserveCurrent&&current)genomeTrials++;
 const tryFreshGenome=()=>{
  for(let attempts=0;attempts<totalBudget&&compared<frontierBudget;attempts++){
   if(freshProposalAttempts>=totalBudget)return false;
   const next=J.randomProposalV15(p,c,catalog,ordinal++),candidateGenome=J.creativeGenomeV15(next),key=J.canonicalJSON(candidateGenome);freshProposalAttempts++;
   if(seenGenomes.has(key))continue;seenGenomes.add(key);genomeSwitches++;generated=candidateGenome;genomeStart=compared;localRounds=0;passes=0;stagnantRerolls=0;roleRetries={};current=evaluate(J.initialFinishV15(p,next),'fresh');if(current)genomeTrials++;return true;
  }
  return false;
 };
 // First give four independently generated genomes one real Canvas trial each.
 // Only then spend the per-genome repair allowance on the most promising seed.
 if(!preserveCurrent){let sampled=1,bestSeed=current,bestSeedGenome=generated,bestSeedDeficit=current?deficit(current):Infinity;
  if(current?.safe){current.generatedGenomeV15=generated;bestSafe=current;safeCandidateFound=true;}
  while(sampled<Math.min(4,frontierBudget)&&compared<frontierBudget&&!bestSafe){if(!tryFreshGenome())break;sampled++;const candidate=current,candidateGenome=generated;if(!candidate)continue;
   if(candidate.safe){candidate.generatedGenomeV15=candidateGenome;bestSafe=candidate;safeCandidateFound=true;break;}
   const score=deficit(candidate);if(!candidate.safe&&score<bestSeedDeficit){bestSeed=candidate;bestSeedGenome=candidateGenome;bestSeedDeficit=score;}
  }
  if(bestSafe){current=bestSafe;generated=bestSafe.generatedGenomeV15;}else{current=bestSeed;generated=bestSeedGenome;}
  genomeStart=compared;localRounds=0;passes=0;stagnantRerolls=0;roleRetries={};
 }
 let frontierDone=false;
 while(!frontierDone){
  abort(signal);
  if((!current||compared>=frontierBudget||compared-genomeStart>=perGenomeBudget||passes>=perGenomeBudget*2)&&!preserveCurrent&&compared<frontierBudget){
   if(tryFreshGenome())continue;frontierDone=true;break;
  }
  if(!current||compared>=frontierBudget||compared-genomeStart>=perGenomeBudget||passes++>=perGenomeBudget*2){frontierDone=true;break;}
  if(current.safe){
   current.generatedGenomeV15=generated;safeCandidateFound=true;if(!bestSafe||current.descriptor.holdMotion.value>bestSafe.descriptor.holdMotion.value)bestSafe=current;
   // Keep the first production-safe random candidate and avoid wasting the
   // remaining search budget after safety has already been established.
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
  fallbackAttempted=true;staged.recovery.attempted=true;const start=compared;
  const fixed=await J.composeSafeRandomV15({p,c,index:catalog,evaluate:(cut,kind)=>evaluate(cut,kind,true),remaining:()=>totalBudget-compared,signal,diagnostic:staged});
  fallbackExamined=compared-start;
  if(fixed){bestSafe=fixed;generated=J.creativeGenomeV15(fixed.cut);fixed.generatedGenomeV15=generated;safeCandidateFound=true;safeFallbackUsed=true;}
 }

 if(bestSafe)generated=bestSafe.generatedGenomeV15||generated;
 const failureSummary=Object.entries(failureReasons).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([reason,count])=>({reason,count})),phaseFailureSummary=Object.entries(phaseFailureReasons).sort((a,b)=>b[1]-a[1]).slice(0,8).map(([reason,count])=>({reason,count}));
 const searchSummary={line:c.line,lyric:c.lineText,...staged,displayLine:c.line+1,fullRandomGenomeTrials:genomeTrials,localRepairCount:repairStats.local,causalRerollCount:repairStats.causalRerolls,evaluatedCandidates:compared,budget:totalBudget,frontierBudget,fallbackBudget:fallbackReserve,perGenomeBudget,primaryFailureReasons:failureSummary,phaseFailureReasons:phaseFailureSummary,failedTechniqueCombinations:Object.entries(failureCombinations).sort((a,b)=>b[1]-a[1]).slice(0,4).map(([combination,count])=>({combination,count})),newGenomeSwitches:genomeSwitches,fallbackAttempted,fallbackCandidatesExamined:fallbackExamined,safeCandidateFound};
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
 item.lightSafetyV15=J.checkRandomLightV15(p,item.cut,sample,signal);
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
 const repairSummary={attempted:repairs.length,localEvaluations:repairStats.local,causalRerolls:repairStats.causalRerolls,changedRoles:[...new Set(repairs.filter(x=>x.role).map(x=>x.role))],recoveryChangedRoles:fallbackChanges};
 item.optimizerEvidence={explorationVersion:15,compared,budget:totalBudget,origins,search:searchSummary,repairSummary,repairStats,exclusions:failureSummary,axes:item.dimensions,ablations:item.ablations,catalog:observed,counts:Object.fromEntries(['registered','callable','eligible','generated','probed','safe'].map(k=>[k,observed.filter(x=>x[k]).length])),genome:{generated,final,changedRoles:changes,retention:1-changes.length/Object.keys(generated).length},...(safeFallbackUsed?{recoveryMode:'STAGED_SAFE_COMPOSITION',reason:'RANDOM_FRONTIER_EXHAUSTED',recovery:{mode:'SAFE_FALLBACK',reason:'RANDOM_FRONTIER_EXHAUSTED',changedRoles:fallbackChanges,candidatesExamined:fallbackExamined,scaleGate:'MEASURED_640PX'}}:{}),intensity:{requested:'かなり激しい',nativeStrength:true,status:activeMotion?'OBSERVED_MOTION':'UNMET',scope:'sampled primary motion; subjective intensity UNVERIFIED'},lightSafety:item.lightSafetyV15,motionV14:J.motionObservationV14(item),seed:p.seed,artisticQuality:'UNVERIFIED'};
 item.checks=item.checks.map(strip);return [item];
};
J.chooseRandomStoryboardV15=(p,portfolios)=>{
 const picks=portfolios.map(step=>{const c=step.candidates.find(x=>x.safe&&x.evidence?.eligible);if(!c)throw Error('V15_NO_SAFE_SEQUENCE');return {...c,line:step.line,energy:step.energy,role:step.role};});
 return {status:picks.length?'MEASURED_SAFE_SEQUENCE':'NOT_APPLICABLE_NO_LYRIC_STEPS',picks,score:null,method:'v15 first safe random genome; no score ordering',creativeArc:{status:'MEASURED',artisticQuality:'UNVERIFIED'}};
};
// Final v15 confirmation never reselects successful lines or borrows 256px
// eligibility. Cache only scalar/geometry evidence, bound to the whole sequence.
J.confirmRandomDirectionScaleV15=async(p,portfolios,initial,sample,phases,signal)=>{
 abort(signal);
 if(typeof sample.verifyScale!=='function')throw Error('V15_MISSING_DETAIL_PROBE');
 const picks=[...initial.picks],rejected=[],recovery=[],expanded=new Set(),cache=new Map(),queues=new Map(),recoveryBudget=24;
 for(const step of portfolios)queues.set(step.line,[...step.candidates]);
 const safe=checks=>checks.every(e=>e.eligible)&&checks.some(e=>e.temporalStage==='HOLD'&&e.readable);
 const exhausted=line=>Object.assign(Error('V15_NO_MULTISCALE_SAFE_CANDIDATE_LINE_'+line),{code:'V15_SCALE_FRONTIER_EXHAUSTED',diagnostic:{line,scaleSafety:{status:'FAILED',width:640,rejected,recovery}}});
 const measure=(trial,cut,context)=>{
  const times=phases(cut),checks=times.map(t=>{
   abort(signal);const key=context+'|'+cut.line+'|'+t;
   if(cache.has(key))return cache.get(key);
   const e=strip(sample.verifyScale(trial,cut,t));
   if(e.renderErrors?.length)throw Object.assign(Error('V15_RENDERER_ERROR'),{code:'RENDERER_ERROR',diagnostic:{line:cut.line,renderErrors:e.renderErrors}});
   cache.set(key,e);if(cache.size>192)cache.delete(cache.keys().next().value);return e;
  });
  return {times,checks};
 };
 // One bounded recovery expansion per failed line; each later rejection
 // consumes a distinct candidate. No all-song random search is reachable here.
 let remaining=portfolios.reduce((n,s)=>n+s.candidates.length,0)+picks.length*recoveryBudget+1;
 while(remaining-->0){
  abort(signal);const trial=copy(p);J.installRegistryStoryboardV8(trial,picks.map(x=>({line:x.line,cut:x.cut})));
  const context=J.canonicalJSON({cuts:trial.cuts,style:trial.styleKey,events:trial.events}),entries=[],bad=[];
  for(const pick of picks){
   const cut=trial.cuts.find(c=>c.line===pick.line);if(!cut)throw Error('V15_CORRUPT_STORYBOARD');
   const {times,checks}=measure(trial,cut,context);entries.push({line:cut.line,checks});
   if(!safe(checks)){
    const hasHold=checks.some(e=>e.temporalStage==='HOLD'&&e.readable);
    const failures=checks.flatMap((e,i)=>!e.eligible||!hasHold?[{...J.scaleFailureV112(cut,times[i],e,p),check:e}]:[]);
    bad.push({pick,cut,checks,failures});
   }
  }
  if(!bad.length){for(const r of rejected)r.recovered=recovery.some(x=>x.line===r.line&&x.added>0);return {...initial,picks,scaleSafety:{status:picks.length?'MEASURED_SAFE_SEQUENCE':'NOT_APPLICABLE',width:640,entries,rejected,recovery:recovery.map(r=>({...r,recovered:true,safeCandidateRemains:true}))}};}
  for(const {pick,cut,checks,failures} of bad){
   const key=J.canonicalJSON(pick.cut),queue=queues.get(pick.line);if(!queue)throw Error('V15_CORRUPT_PORTFOLIO');
   queues.set(pick.line,queue.filter(x=>J.canonicalJSON(x.cut)!==key));
   const diagnostic={line:pick.line,text:cut.lineText,resolution:640,reproduction:{projectSeed:p.seed,cutSeed:cut.seed,layoutParams:copy(cut.params),inDur:cut.inDur,outDur:cut.outDur,width:p.W,height:p.H},techniques:J.creativeGenomeV15(cut),finish:copy(cut.explorationParamsV13||{}),failures:failures.map(f=>({time:f.time,stage:f.stage,eligible:f.check.eligible,full:f.check.full??null,readable:f.check.readable??null,contrastP10:f.observed.contrastP10,glyphComplete:f.check.advancedChecks?.length?f.check.advancedChecks.every(g=>g.complete):f.check.full??null,safeArea:f.check.safe??null,reason:f.reasons})),recoveryAttempted:false,recoveryCandidates:0,recovered:false};
   rejected.push(diagnostic);
   if(!queues.get(pick.line).length&&!expanded.has(pick.line)){
    expanded.add(pick.line);diagnostic.recoveryAttempted=typeof sample.recoverLine==='function';
    const added=sample.recoverLine?await sample.recoverLine(trial,{...pick,cut,checks},failures,recoveryBudget):[];abort(signal);
    if(!Array.isArray(added))throw Error('V15_INVALID_RECOVERY_RESULT');
    const rows=added.filter(x=>x.cut?.line===pick.line&&J.canonicalJSON(x.cut)!==key).slice(0,recoveryBudget);
    diagnostic.recoveryCandidates=rows.length;
    const record={line:pick.line,attempted:diagnostic.recoveryAttempted,added:rows.length,examined:added.examined??rows.length,budget:recoveryBudget,recovered:false,diagnostic:added.diagnostic||null,techniques:rows.map(x=>({layout:x.cut.layout,...J.creativeGenomeV15(x.cut)}))};recovery.push(record);
    queues.set(pick.line,rows);portfolios.find(x=>x.line===pick.line).candidates.push(...rows);
   }
   const next=queues.get(pick.line)[0];if(!next)throw exhausted(pick.line);
   picks[picks.findIndex(x=>x.line===pick.line)]={...next,line:pick.line,energy:pick.energy,role:pick.role};
  }
  await new Promise(r=>setTimeout(r,0));
 }
 throw Object.assign(Error('V15_SCALE_BUDGET_EXHAUSTED'),{diagnostic:{rejected,recovery}});
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
 if(J.songNativeLockedV8(p,pick.cut))throw Error('V15_LOCKED_LINE');
 // The final gate supplies actual 640px phase checks. Try numeric/color edits
 // first, then reroll only roles implicated by those failed phases.
 if(typeof o.sample.verifyScale!=='function')throw Error('V15_MISSING_DETAIL_PROBE');
 const budget=Math.min(48,Math.max(1,o.budget||12)),index=J.explorationCatalogV13(p),seen=new Set([J.canonicalJSON(pick.cut)]),attempts=[];let examined=0;
 const decorate=checks=>Object.assign(checks,{planWidthV14:p.W,planHeightV14:p.H,cutTextV14:pick.cut.lineText});
 const evaluate=(cut,kind,role=null)=>{
  abort(o.signal);const key=J.canonicalJSON(cut);if(examined>=budget||seen.has(key))return null;seen.add(key);examined++;
  // Match the installed final sequence, including previous-cut transitions.
  const times=o.phases(cut),trial={...p,cuts:p.cuts.map(c=>c.line===cut.line?cut:c),motionObservationV14:true},plan={...trial,style:cut.style,styleKey:cut.styleKey};
  const checks=decorate(times.map(t=>{
   abort(o.signal);const low=o.sample(plan,cut,t),high=o.sample.verifyScale(trial,cut,t);
   if(low.renderErrors?.length||high.renderErrors?.length)throw Object.assign(Error('V15_RENDERER_ERROR'),{code:'RENDERER_ERROR',diagnostic:{line:cut.line,renderErrors:[...(low.renderErrors||[]),...(high.renderErrors||[])]}});
   const failed=!high.eligible?high:!low.eligible?low:high;
   return {...low,...high,...failed,compositedContrast:failed.compositedContrast,eligible:low.eligible&&high.eligible,mask:low.mask,raster:low.raster,backgroundRasterV14:low.backgroundRasterV14,sampleOffset:t,lowEligible:low.eligible,detailEligible:high.eligible};
  }));
  const row={cut,times,checks,safe:checks.every(e=>e.eligible)&&checks.some(e=>e.temporalStage==='HOLD'&&e.readable)};
  attempts.push({kind,role,safe:row.safe,failures:checks.flatMap(e=>e.eligible?[]:[{offset:e.sampleOffset,stage:e.temporalStage,lowEligible:e.lowEligible,detailEligible:e.detailEligible,reasons:J.motionFailureV14(decorate([e]),cut),contrastP10:e.compositedContrast?.renderedVsBackgroundContrastP10??e.contrast?.renderedVsBackgroundContrastP10??null}])});return row;
 };
 // Compare full schedules on both sides. Eligible bounded entry/exit frames
 // contribute no deficit, even when their intentionally partial cores differ.
 const deficit=row=>row.checks.reduce((sum,e)=>{
  if(e.eligible)return sum;
  const contrast=e.compositedContrast?.renderedVsBackgroundContrastP10??e.contrast?.renderedVsBackgroundContrastP10??3,b=e.bounds;
  const overflow=b?Math.max(0,.105-b.x0/p.W)+Math.max(0,b.x1/p.W-.895)+Math.max(0,.075-b.y0/p.H)+Math.max(0,b.y1/p.H-.925):0;
  return sum+20+Math.max(0,3-contrast)+overflow*10+(e.advancedChecks||[]).reduce((s,g)=>s+Math.max(0,1-(g.coverage??Number(g.complete))),0);
 },0)/Math.max(1,row.checks.length);
 const supplied=pick.checks?.length?pick.checks:failures.map(f=>f.check||{eligible:false,temporalStage:f.stage,safe:f.observed?.safe,height:f.observed?.height,full:f.observed?.full,geometry:f.observed?.geometry,advancedChecks:f.observed?.core,contrast:{renderedVsBackgroundContrastP10:f.observed?.contrastP10}});
 let current={cut:pick.cut,checks:decorate(supplied)},winner=null;
 const adopt=row=>{if(!row)return false;if(row.safe){winner=row;return true;}if(deficit(row)<deficit(current)-1e-8){current=row;return true;}return false;};
 const finish=(limit)=>{
  const stop=Math.min(budget,examined+limit);
  while(!winner&&examined<stop){let improved=false;
   const numeric=J.finishRepairsV15(p,current.cut,current.checks);
   if(o.finishSelectedDraft&&current.cut.cam!=='stillCamera'&&current.checks.some(e=>!e.eligible&&!e.geometry?.length))numeric.unshift(...[.65,.35,.1].map(k=>({...copy(current.cut),explorationParamsV13:{...current.cut.explorationParamsV13,camera:(current.cut.explorationParamsV13?.camera??1)*k}})));
   for(const cut of numeric){
    if(examined>=stop)break;
    if(adopt(evaluate(cut,'numeric'))){improved=true;if(winner)break;}
   }
   if(!improved)break;
  }
 };
 finish(Math.min(3,Math.max(1,budget-6)));
 const reasons=J.motionFailureV14(current.checks,current.cut),stages=new Set(current.checks.filter(e=>!e.eligible).map(e=>e.temporalStage)),causes=[];
 // A layout may paint opaque panels AFTER the glyph. No amount of pre-glyph
 // scrim/color can repair that occlusion; include layout in contrast recovery.
 // ENTRY/EXIT causes must be reached before spending states on unrelated FX.
 // With no primary geometry, offscreen camera/occluding FX cannot report bounds.
 // Selected-mode removal/reroll trials still require measured deficit improvement.
 if(o.finishSelectedDraft&&current.checks.some(e=>!e.eligible&&!e.geometry?.length)){if(current.cut.cam!=='stillCamera')causes.push('cam');if(current.cut.registryFxV9)causes.push('fx');}
 if(o.finishSelectedDraft&&current.cut.trans!=='cut'&&current.checks.some(e=>!e.eligible&&e.sampleOffset<=Math.max(.12,current.cut.transDur||0)))causes.push('trans');
 const covered=failures.some(f=>{const e=f.check;return e?.full&&e.safe&&e.geometry?.length&&e.geometry.every(g=>g.readable)&&e.advancedChecks?.length&&e.advancedChecks.every(g=>g.complete)&&(f.observed?.contrastP10??3)<1.5;});
 if(covered&&!current.cut.registryFxV9)causes.push('layout');
 if(stages.has('ENTRY'))causes.push('enter');if(stages.has('EXIT'))causes.push('exit');
 if(reasons.some(x=>/CONTRAST/.test(x))){if(current.cut.registryFxV9)causes.push('fx');if(current.cut.treat!=='none')causes.push('treat');causes.push('layout');if(current.cut.bg!=='none')causes.push('bg');}
 if(reasons.some(x=>/SAFE_AREA|CAMERA/.test(x)))causes.push('cam','layout');
 if(reasons.some(x=>/GLYPH|SIZE|READABILITY/.test(x)))causes.push('hold','layout');
 for(const role of [...new Set(causes)]){
  if(winner||examined>=budget)break;
  if(role!=='layout'&&J.canonicalJSON(get(current.cut,role))===J.canonicalJSON(role==='decor'?[]:neutral[role]))continue;
  const base=copy(current.cut);
  const tryCandidate=(cut,kind)=>{
   const row=evaluate(cut,kind,role);if(!row)return;
   if(row.safe){winner=row;return;}
   // A new layout often needs fitting before it can beat the old candidate.
   // Fit that candidate on its own measurements, then keep only a real gain.
   const previous=current;current=row;finish(kind==='control'&&role==='layout'?4:2);const fitted=current;
   current=previous;if(!winner)adopt(fitted);
   // A repaired entry can expose a second, previously masked post-FX failure.
   // Explore that measured pair only in selected mode, within the same budget.
   if(o.finishSelectedDraft&&!winner&&kind==='control'&&role!=='fx'&&fitted.cut.registryFxV9&&fitted.checks.some(e=>!e.eligible&&(e.compositedContrast?.renderedVsBackgroundContrastP10??Infinity)<3)){
    for(let i=0;i<3&&!winner&&examined<budget;i++){
     const pair=i<2?J.rerollRoleV15(p,fitted.cut,index,'fx',620+i):J.changeDirectionRoleV11(fitted.cut,'fx',null);
     if(pair)adopt(evaluate(pair,'measured-causal-pair','fx'));
    }
   }
  };
  for(let attempt=0;attempt<2&&examined<budget&&!winner;attempt++){
   const cut=J.rerollRoleV15(p,base,index,role,600+attempt);if(cut)tryCandidate(cut,'reroll');
  }
  if(!winner&&examined<budget){
   if(role==='layout'&&base.layout!=='center'&&index.some(x=>x.group==='layout'&&x.id==='center'&&x.eligible)){
    // Existing center layout is the no-panel removal control. It changes this
    // layout only; it is never a new style/genome or an all-lines fallback.
    const fresh=J.registryCandidateCut({...p,style:base.style,styleKey:base.styleKey},base,'center',base.params.font||'embedded_bold',base.enter,base.hold);
    tryCandidate({...copy(base),layout:'center',explorationParamsV13:{...base.explorationParamsV13,size:1,dx:0,dy:0},params:{...fresh.params,cinemaReadabilityRepair:copy(base.params.cinemaReadabilityRepair)}},'control');
   }else if(role!=='layout')tryCandidate(J.changeDirectionRoleV11(base,role,neutral[role]),'control');
  }
 }
 const rows=[];
 if(winner){
  const {cut,checks,times}=winner,hold=checks.find(e=>e.temporalStage==='HOLD'&&e.readable),descriptor=J.motionDescriptorV14(checks,p);
  const generated=pick.optimizerEvidence?.genome?.generated||pick.cut.creativeGenomeV15||J.creativeGenomeV15(pick.cut),final=J.creativeGenomeV15(cut),changedRoles=J.genomeChangesV15(generated,final);
  cut.creativeGenomeV15=copy(generated);cut.creativeFinalGenomeV15=final;
  const lightSafety=J.checkRandomLightV15(p,cut,o.sample,o.signal),catalog=copy(pick.optimizerEvidence?.catalog||index);
  for(const row of catalog){const selected=row.group==='style'?row.id===cut.styleKey:row.group==='layout'?row.id===cut.layout:row.group==='decor'?get(cut,'decor').includes(row.id):row.id===get(cut,row.group);row.probed=checks.some(e=>e.registryDispatchV11?.some(d=>d.group===row.group&&d.id===row.id));row.safe=selected&&row.probed;row.generated=selected;}
  const counts=Object.fromEntries(['registered','callable','eligible','generated','probed','safe'].map(k=>[k,catalog.filter(row=>row[k]).length]));
  rows.push({...pick,cut,safe:true,checks:checks.map(strip),times,params:cut.params,font:cut.params.font,styleKey:cut.styleKey,layout:cut.layout,evidence:strip(hold),phaseEvidence:checks.map(strip),descriptor,signature:descriptor.signature,typographySignature:descriptor.typography,rasterSignature:hold.raster,ablations:[],lightSafetyV15:lightSafety,optimizerEvidence:{...copy(pick.optimizerEvidence),catalog,counts,intensity:{...copy(pick.optimizerEvidence?.intensity),status:descriptor.holdMotion.value>1e-6?'OBSERVED_MOTION':'UNMET'},ablations:[],motionV14:J.motionObservationV14({...winner,descriptor,ablations:[]}),lightSafety,repairSummary:{...copy(pick.optimizerEvidence?.repairSummary),changedRoles:[...new Set([...(pick.optimizerEvidence?.repairSummary?.changedRoles||[]),...changedRoles])]},genome:{generated:copy(generated),final,changedRoles,retention:1-changedRoles.length/Object.keys(generated).length},recovery:{mode:changedRoles.length?'CAUSAL_ROLE_REPAIR':'LOCAL_FINISH',examined,scaleGate:'MEASURED_640PX'},unmeasured:['recoveryRoleAblations','artisticQuality']}});
 }
 if(o.finishSelectedDraft&&!winner)rows.continuationV16={cut:copy(current.cut),checks:current.checks};
 rows.examined=examined;rows.diagnostic={attempts,budget,exhausted:!winner};return rows;
};
})();
