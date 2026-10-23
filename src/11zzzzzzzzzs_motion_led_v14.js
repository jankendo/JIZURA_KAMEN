/* v14 search policy. Saved v3–v13 cuts and the v9 renderer contract stay intact. */
(()=>{'use strict';
const J=window.J,C=J.clamp,copy=J.clonePhotoRenderPlan;
const roles=['enter','hold','exit','cam','treat','bg','decor','trans','fx'];
const neutral={enter:'cut',hold:'still',exit:'cut',cam:'stillCamera',treat:'none',bg:'none',decor:'none',trans:'cut',fx:null};
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const delta=(a,b)=>a?.length&&a.length===b?.length?mean(a.map((v,i)=>Math.abs(v-b[i]))):null;
const strip=({mask,raster,backgroundRasterV14,...e})=>e;
const abort=s=>{if(s?.aborted)throw new DOMException('Aborted','AbortError');};
const get=(c,g)=>g==='decor'?c.decor?.[0]?.id||'none':g==='fx'?c.registryFxV9||null:c[g];
const measured=(value,source)=>({status:value===null?'UNMEASURED':'MEASURED',value,source});
J.isMotionLedV14=p=>(p?.songNativeDirection||p?.artDirection?.songNativeDirection)?.explorationVersion===14;
// Reuse v13's stochastic proposals and cut-owned render parameters, not its arc.
const is13=J.isExplorationV13;J.isExplorationV13=p=>is13(p)||J.isMotionLedV14(p);
J.generateJizuraDirectionV14=async(p,a,o={})=>{
 const set=await J.generateJizuraDirectionV13(p,a,o);
 for(const x of set.candidates){x.proposal.grammarDirection.explorationVersion=14;x.proposal.summary='Motion-Led Creative Selection v14';}return set;
};
const make=J.makeArtDirection;J.makeArtDirection=(p,a,pr)=>{const art=make(p,a,pr);if(pr.grammarDirection?.explorationVersion===14){art.songNativeDirection.explorationVersion=14;art.songNativeDirection.searchAlgorithm='KAMEN_MOTION_LED_CREATIVE_SELECTION_V14';}return art;};
const build=J.buildJizuraDirectionV9;J.buildJizuraDirectionV9=(p,a)=>{const d=build(p,a);if(J.isMotionLedV14(p)){d.explorationVersion=14;d.searchAlgorithm='KAMEN_MOTION_LED_CREATIVE_SELECTION_V14';}return d;};
J.motionProposalV14=(...args)=>J.explorationProposalV13(...args);
// RGB cells from the already-rendered pre-primary backdrop. It includes any
// earlier decoration; it is never claimed to be isolated background RGBA.
J.motionRasterV14=(pixels,w,h)=>{
 if(!pixels)return null;const out=[];
 for(let gy=0;gy<12;gy++)for(let gx=0;gx<20;gx++){
  const sum=[0,0,0];let n=0;
  for(let y=Math.floor(gy*h/12);y<Math.floor((gy+1)*h/12);y++)for(let x=Math.floor(gx*w/20);x<Math.floor((gx+1)*w/20);x++){const k=(y*w+x)*4;for(let c=0;c<3;c++)sum[c]+=pixels[k+c]/255;n++;}
  out.push(...sum.map(x=>x/Math.max(1,n)));
 }return out;
};
J.motionDescriptorV14=(checks,p)=>{
 const old=J.explorationDescriptorV13(checks,p),w=256,h=Math.round(w*p.H/p.W),holds=checks.filter(e=>e.temporalStage==='HOLD'),rows=holds.length?holds:checks;
 const evolution=(list,key,dist=delta)=>{
  const pairs=list.slice(1).flatMap((e,i)=>{const a=list[i],dt=e.sampleOffset-a.sampleOffset,d=dist(a[key],e[key]);return Number.isFinite(d)&&dt>0?[{dt,d,rate:d/dt,start:a.sampleOffset,end:e.sampleOffset}]:[];});
  const start=pairs[0]?.start,end=pairs.at(-1)?.end;
  const bins=Array.from({length:4},(_,i)=>{const lo=start+(end-start)*i/4,hi=start+(end-start)*(i+1)/4;let sum=0,time=0;for(const x of pairs){const dt=Math.max(0,Math.min(hi,x.end)-Math.max(lo,x.start));sum+=dt*x.rate;time+=dt;}return time?sum/time:0;});
  return pairs.length?[mean(pairs.map(x=>x.d)),mean(pairs.map(x=>x.rate)),Math.max(...pairs.map(x=>x.rate)),pairs.filter(x=>x.d<=1e-6).reduce((s,x)=>s+x.dt,0)/pairs.reduce((s,x)=>s+x.dt,0),...bins]:null;
 };
 const primary=checks.map(e=>({...e,primary:e.mask?J.registryInkSignature(e.mask,w,h):null}));
 const camera=checks.map(e=>{
  const t=e.cameraSamples?.at(-1)?.transform;if(!t)return {...e,transformVector:null};
  const v=J.explorationCameraV13(p,{explorationParamsV13:checks.cutParamsV14},t);
  return {...e,transformVector:[(v.x||0)/p.W,(v.y||0)/p.H,(v.s??1)-1,(v.rot||0)/180,(v.sx??1)-1,(v.sy??1)-1]};
 });
 const channel=(v,s)=>measured(v,s);
 const spatial=[...old.vector.slice(0,4)],cameraMotion=evolution(camera,'transformVector');
 if(cameraMotion){const cs=camera.filter(e=>e.transformVector);cameraMotion.push(...Array.from({length:6},(_,i)=>mean(cs.map(e=>e.transformVector[i]))),...cs.at(-1).transformVector.map((v,i)=>v-cs[0].transformVector[i]));}
 const motion=primary.filter(e=>e.temporalStage==='HOLD');
 const stages=['ENTRY','HOLD','EXIT'].map(stage=>evolution(primary.filter(e=>e.temporalStage===stage),'primary',J.registryInkDistance));
 return {...old,channels:{
  spatial:channel(spatial,'primary position, occupancy, height; shape separately'),
  glyph:channel(evolution(motion,'primary',J.registryInkDistance),'successive HOLD primary masks; includes camera/layout'),
  entry:channel(stages[0],'bounded entry primary masks'),exit:channel(stages[2],'bounded exit primary masks'),
  camera:channel(cameraMotion,'production callback transforms over time'),
  backdropSpace:channel(rows.find(e=>e.backgroundRasterV14)?.backgroundRasterV14||null,'pre-primary Canvas backdrop RGB cells'),
  frameSpace:channel(rows.find(e=>e.raster)?.raster||null,'composed Canvas RGB cells'),
  backdrop:channel(evolution(checks,'backgroundRasterV14'),'pre-primary Canvas backdrop including earlier decoration'),
  frame:channel(evolution(checks,'raster'),'whole composed RGB temporal changes; includes FX, not isolated FX')
 },boundary:{first:checks[0]?.raster||null,last:checks.at(-1)?.raster||null},holdMotion:measured(evolution(motion,'primary',J.registryInkDistance)?.[0]??null,'sampled HOLD primary mask distance')};
};
const channelKeys=['spatial','glyph','entry','exit','camera','backdrop','frame','backdropSpace','frameSpace'];
J.motionDistancesV14=(a,b)=>Object.fromEntries(channelKeys.map(k=>[k,a?.channels?.[k]?.status==='MEASURED'&&b?.channels?.[k]?.status==='MEASURED'?delta(a.channels[k].value,b.channels[k].value):null]));
J.motionDistanceV14=(a,b)=>{
 const values=Object.values(J.motionDistancesV14(a,b)).filter(Number.isFinite);
 const shape=J.registryInkDistance(a?.typography,b?.typography);if(shape!==null)values.push(shape);
 return values.length?Math.max(...values):null;
};
const qualityKeys=['compositionQuality','musicFit','temporalAlignment'];
J.motionDominatesV14=(a,b)=>{
 const keys=qualityKeys.filter(k=>Number.isFinite(a.dimensions?.[k])&&Number.isFinite(b.dimensions?.[k]));
 // Unknown axes are incomparable, never converted to a zero observation.
 if(qualityKeys.some(k=>Number.isFinite(a.dimensions?.[k])!==Number.isFinite(b.dimensions?.[k])))return false;
 return keys.length>0&&keys.every(k=>a.dimensions[k]>=b.dimensions[k])&&keys.some(k=>a.dimensions[k]>b.dimensions[k]);
};
J.rankMotionPortfolioV14=rows=>{
 let pending=[...rows],rank=0;
 while(pending.length){const front=pending.filter(a=>!pending.some(b=>a!==b&&J.motionDominatesV14(b,a)));if(!front.length)throw Error('V14_INVALID_PARETO');
  for(const item of front){item.paretoRankV14=rank;const v=qualityKeys.map(k=>item.dimensions[k]).filter(Number.isFinite);item.score=mean(v.length?v:[.5])/(1+rank*.12);}pending=pending.filter(x=>!front.includes(x));rank++;
 }return rows;
};
J.createMotionArchiveV14=(capacity=12)=>{
 const rows=[];
 const near=(a,b)=>{
  const ds=J.motionDistancesV14(a.descriptor,b.descriptor);
  // Every measured channel must be similar. Motion cannot be averaged away.
  if(channelKeys.some(k=>a.descriptor.channels[k].status!==b.descriptor.channels[k].status))return false;
  return Object.values(ds).filter(Number.isFinite).every(d=>d<.025)&&(J.registryInkDistance(a.descriptor.typography,b.descriptor.typography)??0)<.055;
 };
 return {rows,insert(item){
  const closest=rows.find(x=>near(x,item));
  if(closest){if(!J.motionDominatesV14(item,closest))return false;rows.splice(rows.indexOf(closest),1);}
  rows.push(item);
  if(rows.length>capacity){
   J.rankMotionPortfolioV14(rows);
   // Round-robin channel novelty prevents one channel consuming all capacity.
   const keep=new Set();
   for(const k of channelKeys){const measuredRows=rows.filter(x=>x.descriptor.channels[k].status==='MEASURED');if(!measuredRows.length)continue;
    const novelty=x=>Math.min(...measuredRows.filter(y=>y!==x).map(y=>delta(x.descriptor.channels[k].value,y.descriptor.channels[k].value)),Infinity);
    keep.add([...measuredRows].sort((a,b)=>novelty(b)-novelty(a)||a.paretoRankV14-b.paretoRankV14)[0]);}
   const pool=rows.filter(x=>!keep.has(x));
   const crowd=x=>Math.min(...rows.filter(y=>y!==x).map(y=>J.motionDistanceV14(x.descriptor,y.descriptor)??0));
   const victim=(pool.length?pool:rows).sort((a,b)=>crowd(a)-crowd(b)||b.paretoRankV14-a.paretoRankV14)[0];rows.splice(rows.indexOf(victim),1);
  }return rows.includes(item);
 }};
};
J.motionFailureV14=(checks,cut={})=>{
 const bad=checks.filter(e=>!e.eligible),causes=[];
 if(bad.some(e=>e.renderErrors?.length))causes.push('RENDERER_ERROR');
 if(bad.some(e=>e.safe===false))causes.push('SAFE_AREA_OR_POSITION');
 const portrait=checks.planHeightV14>checks.planWidthV14,short=J.graphemes(String(checks.cutTextV14||'').replace(/\s/g,'')).length<=4,cap=portrait?(short?.25:.145):(short?.29:.195);
 if(bad.some(e=>e.height<=.035||checks.cutTextV14&&e.geometry?.some(g=>g.maxGlyphHeight>cap)))causes.push('SIZE');
 if(bad.some(e=>(e.compositedContrast?.renderedVsBackgroundContrastP10??e.contrast?.renderedVsBackgroundContrastP10??Infinity)<3))causes.push('CONTRAST');
 if(bad.some(e=>e.geometry?.some(g=>g.distortion)))causes.push('GLYPH_DEFORMATION');
 if(bad.some(e=>e.temporalStage==='HOLD'&&(e.full===false||e.advancedChecks?.some(x=>!x.complete))))causes.push('MISSING_HOLD_GLYPHS');
 if(bad.some(e=>e.temporalStage==='HOLD'&&e.readable===false))causes.push('HOLD_READABILITY');
 if(bad.some(e=>['ENTRY','EXIT'].includes(e.temporalStage)))causes.push('TRANSIENT');
 if(causes.includes('CONTRAST')&&cut.registryFxV9)causes.push('FX_CONTRAST');
 if(causes.includes('SAFE_AREA_OR_POSITION')&&checks.some(e=>e.cameraSamples?.some(x=>Math.abs(x.transform.x||0)>1||Math.abs(x.transform.y||0)>1||Math.abs((x.transform.s??1)-1)>.01)))causes.push('CAMERA_EXCURSION');
 return causes;
};
J.motionRepairsV14=(cut,checks)=>{
 const causes=J.motionFailureV14(checks,cut);if(causes.includes('RENDERER_ERROR'))return [];
 const e=cut.explorationParamsV13||{},out=[],edit=(patch,base=cut)=>({...copy(base),explorationParamsV13:{...e,...patch}});
 const bad=checks.filter(x=>!x.eligible),bounds=bad.filter(x=>x.bounds).map(x=>x.bounds);
 const position=()=>{
  const width=checks.planWidthV14,height=checks.planHeightV14;if(!bounds.length||!width||!height)return {};
  const x0=Math.min(...bounds.map(b=>b.x0))/width,x1=Math.max(...bounds.map(b=>b.x1))/width,y0=Math.min(...bounds.map(b=>b.y0))/height,y1=Math.max(...bounds.map(b=>b.y1))/height;
  return {dx:(e.dx||0)+Math.max(0,.11-x0)-Math.max(0,x1-.89),dy:(e.dy||0)+Math.max(0,.08-y0)-Math.max(0,y1-.92)};
 };
 let local=copy(cut);
 if(causes.includes('CONTRAST'))local.params={...copy(cut.params),cinemaReadabilityRepair:{shadow:2,scrim:.32}};
 if(causes.includes('TRANSIENT')){local.inDur=Math.min(local.inDur,.22,cut.dur*.15);local.outDur=Math.min(local.outDur,.12,cut.dur*.08);}
 if(causes.includes('SAFE_AREA_OR_POSITION'))local=edit(position(),local);
 out.push(local);
 if(causes.includes('SIZE')||causes.includes('SAFE_AREA_OR_POSITION')||causes.includes('HOLD_READABILITY')){
  const small=bad.some(x=>x.height<=.035),ratio=small?1.12:.88;
  out.push({...copy(local),explorationParamsV13:{...local.explorationParamsV13,size:(e.size??1)*ratio}});
 }
 if(causes.includes('FX_CONTRAST')){
  out.push({...copy(local),explorationTimingV14:{...local.explorationTimingV14,fxOffset:Math.min(.04,cut.dur*.02)}});
  out.push(edit({fx:(e.fx??1)*.85},local));
 }
 // Intensity edits follow geometry/contrast/timing; preserve every role ID.
 if(causes.includes('SAFE_AREA_OR_POSITION'))out.push(edit({camera:(e.camera??1)*.85,size:(e.size??1)*.94},local));
 if(causes.includes('GLYPH_DEFORMATION'))out.push(edit({motion:(e.motion??1)*.85},local));
 // Exchange only a causal role, moving alternatives before the final still.
 if(causes.includes('MISSING_HOLD_GLYPHS')||causes.includes('GLYPH_DEFORMATION')){
  const alternatives=Object.entries(J.HOLD).filter(([id,d])=>id!=='still'&&id!==cut.hold&&d.motionAmount>0).slice(0,1);
  for(const [id] of alternatives)out.push(J.changeDirectionRoleV11(local,'hold',id));
  out.push(J.changeDirectionRoleV11(local,'hold','still'));
 }
 return [...new Map(out.map(x=>[J.canonicalJSON(x),x])).values()];
};
J.motionRetentionV14=(a,b)=>({
 techniques:measured(mean(['styleKey','layout',...roles].map(k=>Number(k==='styleKey'||k==='layout'?a.cut[k]===b.cut[k]:get(a.cut,k)===get(b.cut,k)))),'fraction of identical role IDs; not visual similarity'),
 channels:Object.fromEntries(Object.entries(J.motionDistancesV14(a.descriptor,b.descriptor)).map(([k,v])=>[k,measured(v===null?null:1-C(v),'1 - measured descriptor change; not artistic quality')])),
 shape:measured((()=>{const v=J.registryInkDistance(a.descriptor.typography,b.descriptor.typography);return v===null?null:1-v;})(),'normalized primary glyph shape similarity')
});
J.optimizeExplorationLineV14=async({p,c,f,sample,phases,signal,audio,anchors=[],budget=108,initialCuts=[],initialPlan=null,randomOnly=false,preserveCurrent=false})=>{
 if(J.songNativeLockedV8(p,c))throw Error('V14_LOCKED_LINE');
 const intent=J.songVisualIntentV11(p,audio,c,f,anchors);f={...f,sectionIndex:intent.sectionIndex,sectionPhase:intent.sectionPhase,boundaryConfidence:intent.boundaryConfidence,localAudio:intent.events.map(e=>({time:e.time,activity:e.value}))};
 const catalog=J.explorationCatalogV13(p).map(x=>({...x,generated:false,probed:false,safe:false})),archive=J.createMotionArchiveV14(),seen=new Set(),nursery=[],repairs=[],discovered=[],discoveryStates=[],strengthTrials=[],exclusions=[],origins={fresh:0,mutation:0,crossover:0,repair:0,tune:0,initial:0};
 let compared=0,proposals=0,stalled=0,preservedReference=null;
 const originalCut=preserveCurrent&&initialPlan?.cuts.find(x=>x.line===c.line);
 const originalDescriptor=originalCut?J.motionDescriptorV14(phases(originalCut).map(t=>{abort(signal);return sample(initialPlan,originalCut,t);}),initialPlan):null;
 const evaluate=(cut,origin,retain=true,parent=null)=>{
  abort(signal);if(compared>=budget)return null;const key=J.canonicalJSON(cut);if(seen.has(key))return null;seen.add(key);compared++;origins[origin]++;
  for(const row of catalog)if(row.group==='style'?row.id===cut.styleKey:row.group==='layout'?row.id===cut.layout:row.id===get(cut,row.group))row.generated=true;
  const sp={...p,style:cut.style,styleKey:cut.styleKey},times=phases(cut),checks=times.map(t=>{abort(signal);try{return sample(sp,cut,t);}catch(error){if(error.name==='AbortError')throw error;return {eligible:false,readable:false,renderErrors:[error.message]};}});
  checks.planWidthV14=p.W;checks.planHeightV14=p.H;checks.cutParamsV14=cut.explorationParamsV13;checks.cutTextV14=cut.lineText;
  const safe=checks.every(e=>e.eligible)&&checks.some(e=>e.temporalStage==='HOLD'&&e.readable);
  for(const call of checks.flatMap(e=>e.registryDispatchV11||[])){const row=catalog.find(x=>x.group===call.group&&x.id===call.id);if(row){row.probed=true;if(safe)row.safe=true;}}
  if(checks.some(e=>e.renderErrors?.length)){exclusions.push({origin,layout:cut.layout,reason:'RENDERER_ERROR'});return null;}
  const fit=J.scoreExplorationV13(cut,f,intent,checks,p),descriptor=J.motionDescriptorV14(checks,p),hold=checks.find(e=>e.temporalStage==='HOLD'&&e.readable)||checks[Math.floor(checks.length/2)];
  const item={...fit,cut,layout:cut.layout,styleKey:cut.styleKey,font:cut.params.font,params:cut.params,checks,times,descriptor,features:f,intent,ablations:[],attempts:[],origin,evidence:strip(hold),phaseEvidence:checks.map(strip),signature:descriptor.signature,typographySignature:descriptor.typography,rasterSignature:hold.raster,musicFit:fit.dimensions.musicFit,safe};
  item.dimensions.visualIndividuality={status:'MEASURED',vector:descriptor.vector};item.dimensions.surprise={status:'UNVERIFIED'};item.dimensions.artisticQuality='UNVERIFIED';
  item.discoveryRootV14=parent?.discoveryRootV14||key;
  discoveryStates.push({root:item.discoveryRootV14,key,origin,safe,holdMotion:descriptor.holdMotion});
  if(origin==='initial'&&!preservedReference)preservedReference=item;
  if(preserveCurrent&&safe&&(originalDescriptor||preservedReference?.safe)&&J.motionDistanceV14(originalDescriptor||preservedReference.descriptor,descriptor)>.12){exclusions.push({origin,reason:'PRESERVED_IDENTITY_LOSS'});return null;}
  if(safe)discovered.push({origin,descriptor,cutKey:key});
  if(safe&&retain){const retained=archive.insert(item);stalled=retained?0:stalled+1;}
  else if(!safe){exclusions.push({origin,layout:cut.layout,reason:'TEMPORAL_GLYPH_GATE',failures:checks.filter(e=>!e.eligible).slice(0,1).map(e=>({stage:e.temporalStage,full:e.full,safe:e.safe,height:e.height,readable:e.readable,contrast:e.compositedContrast?.renderedVsBackgroundContrastP10??e.contrast?.renderedVsBackgroundContrastP10,geometry:e.geometry,advanced:e.advancedChecks}))});if(nursery.length<6)nursery.push(item);}
  return item;
 };
 const repair=item=>{
  if(!item||item.safe)return;
  for(const cut of J.motionRepairsV14(item.cut,item.checks).slice(0,4)){
   const fixed=evaluate(cut,'repair',true,item);if(!fixed)continue;
   const loss=J.motionDistanceV14(item.descriptor,fixed.descriptor);
   repairs.push({layout:item.cut.layout,safe:fixed.safe,loss,causes:J.motionFailureV14(item.checks,item.cut),retention:J.motionRetentionV14(item,fixed),idsPreserved:roles.every(g=>get(item.cut,g)===get(fixed.cut,g)),before:item.descriptor.vector,after:fixed.descriptor.vector});
   if(fixed.safe){fixed.repairEvidence=repairs.at(-1);break;}
  }
 };
 for(const cut of initialCuts){const item=evaluate(copy(cut),'initial');repair(item);}
 // 72% nominal exploration; observed failure rate draws from the repair reserve.
 // No fit sorting occurs before archive insertion. Stagnation restarts fresh.
 while(compared<Math.floor(budget*.76)&&proposals<budget){
  abort(signal);const parents=preserveCurrent?[...archive.rows,...initialCuts.map(cut=>({cut}))]:randomOnly||stalled>=5||!archive.rows.length?[]:[...archive.rows,...nursery.slice(-2)];
  let proposal;try{proposal=J.motionProposalV14(p,c,catalog,proposals++,parents,anchors,preserveCurrent);}catch(error){exclusions.push({reason:'PARAMETER_CONTRACT',message:error.message});continue;}if(!proposal)continue;
  if(preserveCurrent&&initialCuts.length&&roles.filter(g=>get(proposal.cut,g)!==get(initialCuts[0],g)).length>2)continue;
  const item=evaluate(proposal.cut,proposal.mode);
  if(item&&!item.safe&&compared<Math.floor(budget*.76)&&proposals%2===0)repair(item);
  if(proposals%4===0)await new Promise(r=>setTimeout(r,0));
 }
 for(const item of nursery){if(compared>=budget-12)break;repair(item);}
 // Small paired, technique-specific strength trials; no globally enlarged range.
 for(const item of [...archive.rows].slice(0,3)){
  if(compared>=budget-6)break;
  const observed=item.checks.flatMap(e=>e.cameraSamples||[]).map(e=>J.explorationCameraV13(p,item.cut,e.transform));
  const active=roles.filter(g=>get(item.cut,g)!==neutral[g]);
  const param=active.includes('cam')&&observed.length?'camera':active.includes('hold')?'motion':active.includes('fx')?'fx':null;
  if(!param)continue;
  // Current actual geometry and role contract bound a modest extrapolation.
  const margin=Math.min(...item.checks.filter(e=>e.bounds).map(e=>Math.min(e.bounds.x0/p.W-.105,.895-e.bounds.x1/p.W,e.bounds.y0/p.H-.075,.925-e.bounds.y1/p.H)));
  const base=item.cut.explorationParamsV13?.[param]??1;
  const contract=J.registry(param==='camera'?'cam':param==='motion'?'hold':'fx')[get(item.cut,param==='camera'?'cam':param==='motion'?'hold':'fx')];
  const upper=Number.isFinite(contract?.explorationStrengthMax)?contract.explorationStrengthMax:1+Math.max(0,Math.min(.18,margin));
  for(const value of [...new Set([1,Math.min(upper,Math.max(1,base)*1.12)])]){
   const trial=evaluate({...copy(item.cut),explorationParamsV13:{...item.cut.explorationParamsV13,[param]:value}},'tune',false,item);
   if(!trial)continue;
   trial.strengthEvidence={parameter:param,base,value,upper,safe:trial.safe,visibleChange:J.motionDistanceV14(item.descriptor,trial.descriptor),retention:J.motionRetentionV14(item,trial),musicBefore:item.dimensions.musicFit,musicAfter:trial.dimensions.musicFit,source:'same technique measured safe margin + full Canvas recheck; magnitude is not quality'};
   strengthTrials.push(trial.strengthEvidence);if(trial.safe)archive.insert(trial);
  }
 }
 // Acoustic timing edits retain the discovered spatial genome and are accepted
 // only after a measured identity check and a music-axis improvement.
 for(const item of [...archive.rows]){
  if(compared>=budget)break;
  const early=intent.events.filter(e=>e.time>0&&e.time<=Math.min(.22,c.dur*.15)).sort((a,b)=>b.value-a.value||a.time-b.time)[0];
  const cut={...copy(item.cut),inDur:item.cut.enter==='cut'?0:early?.time??item.cut.inDur,expressiveEnvelopeV12:J.directionHoldEnvelopeV12(intent,item.cut),expressiveEventsV12:J.directionEventsV12(intent,item.cut),explorationParamsV13:{...item.cut.explorationParamsV13,camera:item.cut.explorationParamsV13?.camera??1}};
  const tuned=evaluate(cut,'tune',false,item);if(!tuned)continue;
  const loss=J.motionDistanceV14(item.descriptor,tuned.descriptor),gain=(tuned.dimensions.musicFit??0)-(item.dimensions.musicFit??0);
  tuned.tuningEvidence={loss,gain,retention:J.motionRetentionV14(item,tuned),accepted:tuned.safe&&loss<=.12&&gain>=0};
  if(tuned.tuningEvidence.accepted)archive.insert(tuned);
 }
 if(!archive.rows.length)throw Object.assign(Error(preserveCurrent?'現在の演出を安全に保ったまま曲へ合わせられませんでした。元のMVを維持します。':'V14_NO_SAFE_EXPLORATION_LINE_'+c.line),{diagnostic:{compared,proposals,exclusions,repairs}});
 // A bounded arc portfolio keeps niches even when globally Pareto dominated.
 // The dedicated v14 selector consumes measured channels and Pareto axes.
 const results=[...archive.rows];let ablationSamples=0;
 for(const item of results){
  const sp={...p,style:item.cut.style,styleKey:item.styleKey};
  for(const g of roles.filter(g=>get(item.cut,g)!==neutral[g])){
   abort(signal);if(ablationSamples+item.times.length>240)break;ablationSamples+=item.times.length;const control=J.changeDirectionRoleV11(item.cut,g,neutral[g]),checks=item.times.map(t=>sample(sp,control,t));
   item.ablations.push({group:g,id:get(item.cut,g),status:checks.some(e=>e.renderErrors?.length)?'FAILED':checks.every(e=>e.raster)?'MEASURED':'UNMEASURED',controlSafe:checks.every(e=>e.eligible),pixelDifference:checks.every(e=>e.raster)?mean(checks.map((e,i)=>delta(e.raster,item.checks[i].raster))):null,fitGain:checks.every(e=>e.eligible)?J.scoreExplorationV13(item.cut,f,intent,item.checks,p).score-J.scoreExplorationV13(control,f,intent,checks,p).score:null,temporalContribution:J.temporalRoleContributionV112(c,item.times,item.checks,checks,intent)});
  }
  item.motionObservationV14=J.motionObservationV14(item,discovered);
  const raw=discoveryStates.filter(x=>['fresh','mutation','crossover'].includes(x.origin)&&x.holdMotion.status==='MEASURED'&&x.holdMotion.value>1e-6),roots=new Set(results.map(x=>x.discoveryRootV14));
  item.motionObservationV14.motionSurvival.randomDiscovery={moving:raw.length,safeBeforeRepair:raw.filter(x=>x.safe).length,rootsInArchive:raw.filter(x=>roots.has(x.root)).length,selectedRootWasMoving:raw.some(x=>x.root===item.discoveryRootV14),source:'actual initial random proposal masks; repaired/strength/timing descendants retain root identity'};
  item.layerEvidenceV111={typography:measured(item.descriptor.typography,'normalized primary Canvas glyph'),glyphMotion:item.descriptor.channels.glyph,camera:item.descriptor.channels.camera,background:item.descriptor.channels.backdrop,wholeFrame:item.descriptor.channels.frame,decorationFX:item.motionObservationV14.fxContribution};
  item.optimizerEvidence={motionV14:item.motionObservationV14,strengthTrials,strength:item.strengthEvidence||null,compared,budget,ablationSamples,ablationBudget:240,proposals,origins,exclusions,repairs,repair:item.repairEvidence||null,tuning:item.tuningEvidence||null,axes:item.dimensions,ablations:item.ablations,interactions:item.ablations.filter(x=>x.pixelDifference>1e-6).map(x=>({groups:[x.group,'composedState'],status:'MEASURED',source:'marginal contribution in actual combined state; not additive synergy'})),intent,primaryMusic:item.primaryMusicEvidence,catalog,counts:Object.fromEntries(['registered','callable','eligible','generated','probed','safe'].map(k=>[k,catalog.filter(x=>x[k]).length])),archive:{capacity:12,size:results.length,descriptors:results.map(x=>x.descriptor.channels),minDistance:results.length>1?Math.min(...results.flatMap((x,i)=>results.slice(i+1).map(y=>J.motionDistanceV14(x.descriptor,y.descriptor)))):null},seed:p.seed,originalAppearance:originalDescriptor?{status:'MEASURED',vector:originalDescriptor.vector}:null,explorationVersion:14,unmeasured:['artisticQuality','semantics','subjectRecognition','encodedSurvival']};
 }
 J.rankMotionPortfolioV14(results);
 for(const item of results){item.optimizerEvidence.paretoRank=item.paretoRankV14;item.optimizerEvidence.ablationSamples=ablationSamples;item.checks=item.checks.map(({mask,...e})=>e);}
 for(const item of results){const moving=discovered.filter(x=>x.descriptor.holdMotion.status==='MEASURED'&&x.descriptor.holdMotion.value>1e-6),keys=new Set(results.map(x=>J.canonicalJSON(x.cut)));item.optimizerEvidence.motionV14.motionSurvival.archiveRetained=moving.filter(x=>keys.has(x.cutKey)).length;item.optimizerEvidence.motionV14.motionSurvival.archiveRate=moving.length?moving.filter(x=>keys.has(x.cutKey)).length/moving.length:null;}
 return results;
};
// Observations are exported independently of quality axes. No amplitude bonus.
J.motionObservationV14=(item,discovered=[])=>{
 const d=item.descriptor,ab=group=>{
  const rows=item.ablations.filter(x=>group.includes(x.group)&&x.status==='MEASURED');
  return rows.length?{status:'MEASURED',roles:rows.map(x=>({group:x.group,id:x.id,difference:x.pixelDifference,temporal:x.temporalContribution})),source:'same-time role-removal controls; marginal composed contribution'}:{status:'UNMEASURED'};
 };
 const moving=discovered.filter(x=>x.descriptor.holdMotion.status==='MEASURED'&&x.descriptor.holdMotion.value>1e-6);
 return {holdMotion:d.holdMotion,cameraTransform:d.channels.camera,backgroundMotion:d.channels.backdrop,cameraRealization:ab(['cam']),fxContribution:ab(['fx','decor']),
 motionSurvival:{status:moving.length?'MEASURED':'UNMEASURED',discoveredSafe:moving.length,selectedMoving:d.holdMotion.status==='MEASURED'?d.holdMotion.value>1e-6:null,scope:'safe observed candidate states, including repaired/tuned states; no claim about unrendered space'},
 creativeRetention:item.repairEvidence?.retention||item.tuningEvidence?.retention||item.strengthEvidence?.retention||{status:'UNMEASURED'},temporalContrast:d.channels.glyph,artisticQuality:'UNVERIFIED'};
};
// Only observed loss of readable coverage or simultaneous boundary flashes
// contribute transition costs. No technique, style or layout name is inspected.
J.motionTransitionV14=(prev,c)=>{
 if(!prev)return {continuity:0,overload:0,status:'NOT_APPLICABLE'};
 const a=prev.descriptor?.boundary?.last,b=c.descriptor?.boundary?.first;
 const luma=v=>v?.length?mean(v):null,x=luma(a),y=luma(b);
 const overlap=(prev.cut?.outDur||0)+(c.cut?.inDur||0);
 const missing=overlap>Math.min(.34,((prev.cut?.dur||0)+(c.cut?.dur||0))*.15)?overlap:0;
 // A brightness jump alone is a valid cut; penalize only repeated bright flash
 // boundaries with high measured within-frame activity on both sides.
 const rate=item=>item.descriptor?.channels?.frame?.value?.[2]??null;
 const overload=x!==null&&y!==null&&x>.85&&y>.85&&rate(prev)>.8&&rate(c)>.8?Math.min(rate(prev),rate(c))*.05:0;
 return {continuity:missing,overload,status:a&&b?'MEASURED':'UNMEASURED',source:'sampled boundary coverage and repeated bright-flash activity; differences are not defects'};
};
const pathKeys=['music','composition','realization','coverage','development','continuity','restraint'];
const pathDominates=(a,b)=>!pathKeys.some(k=>Number.isFinite(a.axes[k])!==Number.isFinite(b.axes[k]))&&pathKeys.filter(k=>Number.isFinite(a.axes[k])).every(k=>a.axes[k]>=b.axes[k])&&pathKeys.some(k=>Number.isFinite(a.axes[k])&&a.axes[k]>b.axes[k]);
J.chooseMotionStoryboardV14=(p,portfolios)=>{
 if(!portfolios.length)return {status:'NOT_APPLICABLE_NO_LYRIC_STEPS',picks:[],score:null};
 const rng=J.rng(J.h(p.seed,14,701)),cap=12;
 let beam=[{picks:[],axes:Object.fromEntries(pathKeys.map(k=>[k,0])),transitions:[]}];
 for(const step of portfolios){
  const rows=step.candidates.filter(c=>c.safe!==false&&c.evidence?.eligible&&c.signature?.length);
  if(!rows.length)return {status:'NO_MEASURED_SAFE_PATH',picks:[],score:null};
  J.rankMotionPortfolioV14(rows);
  const next=[];
  for(const state of beam)for(const c of rows){
   const prev=state.picks.at(-1),transition=J.motionTransitionV14(prev,c),ds=prev?Object.values(J.motionDistancesV14(prev.descriptor,c.descriptor)).filter(Number.isFinite):[];
   const novelty=state.picks.length?Math.min(...state.picks.map(x=>J.motionDistanceV14(x.descriptor,c.descriptor)??0)):0;
   const variation=ds.length?Math.max(...ds):0;
   const acoustic=prev?Math.abs((prev.features?.onset??0)-(c.features?.onset??0))+Math.abs((prev.features?.energy??0)-(c.features?.energy??0)):0;
   // Repeated music can support either recurrence or variation. Variation is
   // considered in the path, never an instruction to change a named technique.
   const history=state.picks.filter(x=>String(p.lines?.[x.line]?.text||'').replace(/\s/g,'')===String(p.lines?.[step.line]?.text||'').replace(/\s/g,''));
   const repeatedVisual=history.filter(x=>(J.motionDistanceV14(x.descriptor,c.descriptor)??1)<.015).length;
   const axes={...state.axes};
   axes.music=Number.isFinite(state.axes.music)&&Number.isFinite(c.dimensions.musicFit)?state.axes.music+c.dimensions.musicFit:null;
   axes.composition=Number.isFinite(state.axes.composition)&&Number.isFinite(c.dimensions.compositionQuality)?state.axes.composition+c.dimensions.compositionQuality:null;
   const controls=c.ablations?.filter(x=>x.status==='MEASURED')||[];
   axes.realization=controls.length&&Number.isFinite(state.axes.realization)?state.axes.realization+mean(controls.map(x=>Number(x.pixelDifference>1e-6))):null;
   axes.coverage+=novelty;
   axes.development+=variation*Math.min(1,.25+acoustic)-Math.max(0,repeatedVisual-1)*.02;
   axes.continuity-=transition.continuity;axes.restraint-=transition.overload;
   // Random priority is fixed by this stream, independent of renderer calls.
   next.push({picks:[...state.picks,{...c,line:step.line,energy:step.energy,role:step.role}],axes,transitions:[...state.transitions,transition],priority:rng()});
  }
  // Pareto layers retain independent axes. One slot per measured last-cut niche
  // is allocated before extras, so a single early scalar cannot collapse QD.
  let pending=next,kept=[];
  while(pending.length&&kept.length<cap){
   const front=pending.filter(a=>!pending.some(b=>a!==b&&pathDominates(b,a)));
   front.sort((a,b)=>b.priority-a.priority);
   const unique=front.filter(a=>!kept.some(b=>J.motionDistanceV14(a.picks.at(-1).descriptor,b.picks.at(-1).descriptor)<.025));
   kept.push(...unique.slice(0,cap-kept.length));
   if(kept.length<cap)kept.push(...front.filter(x=>!kept.includes(x)).slice(0,cap-kept.length));
   pending=pending.filter(x=>!front.includes(x));
  }beam=kept;
 }
 const front=beam.filter(a=>!beam.some(b=>a!==b&&pathDominates(b,a))),chosen=front[Math.floor(rng()*front.length)];
 const contrast=chosen.picks.map(x=>({line:x.line,holdMotion:x.descriptor.holdMotion,audio:x.intent?.motion??null}));
 return {status:'MEASURED_SAFE_SEQUENCE',picks:chosen.picks,score:mean(pathKeys.map(k=>chosen.axes[k]).filter(Number.isFinite)),method:'v14 measured-channel QD / Pareto path beam / seeded safe-front sampling',beamWidth:cap,
 creativeArc:{status:'MEASURED',source:'sampled Canvas channels and acoustic features; no style-change cost',axes:chosen.axes,transitions:chosen.transitions,temporalContrast:contrast,safePaths:beam.length,paretoPaths:front.length,artisticQuality:'UNVERIFIED'}};
};
const phases=J.directionPhasesV11;J.directionPhasesV11=(p,c,a)=>{const times=phases(p,c,a);if(J.isMotionLedV14(p)&&c.registryFxV9){const t=c.explorationTimingV14?.fxOffset??0;times.push(t+.01,t+.06);}return [...new Set(times.filter(t=>t>=0&&t<c.dur))].sort((a,b)=>a-b);};
const optimize=J.optimizeCreativeLineV10;J.optimizeCreativeLineV10=args=>J.isMotionLedV14(args.p)?J.optimizeExplorationLineV14(args):optimize(args);
const arc=J.chooseCreativeArcV10;J.chooseCreativeArcV10=(p,portfolios,initial)=>J.isMotionLedV14(p)?J.chooseMotionStoryboardV14(p,portfolios):arc(p,portfolios,initial);
const attach=J.attachCreativeEvidenceV10;J.attachCreativeEvidenceV10=(selection,storyboard,portfolios)=>{
 attach(selection,storyboard,portfolios);if(!storyboard.picks.some(x=>x.optimizerEvidence?.explorationVersion===14))return;
 selection.explorationVersion=14;selection.optimizerContract='kamen-motion-led-14';selection.visualArc=copy(storyboard.creativeArc);
 for(const trace of selection.traces)trace.reason='seed付き自由探索 → 動き別Canvasアーカイブ → 原因別局所修復 → 音楽調整 → v14 Pareto全曲選択。芸術品質は未検証';
};
// Recovery after a 640px failure follows the same local, role-preserving policy.
const recover=J.recoverDirectionLineV112;J.recoverDirectionLineV112=async(p,pick,failures,options)=>{
 if(!J.isMotionLedV14(p))return recover(p,pick,failures,options);
 const checks=failures.map(x=>({eligible:false,temporalStage:x.stage,safe:x.observed.safe,height:x.observed.height,full:x.observed.full,geometry:x.observed.geometry,advancedChecks:x.observed.core,contrast:{renderedVsBackgroundContrastP10:x.observed.contrastP10}}));
 checks.planWidthV14=p.W;checks.planHeightV14=p.H;
 const initialCuts=J.motionRepairsV14(pick.cut,checks).slice(0,4);
 try{return await J.optimizeExplorationLineV14({p,c:pick.cut,f:pick.features,audio:options.audio,sample:options.sample,phases:options.phases,signal:options.signal,budget:options.budget,initialCuts});}
 catch(e){if(/^V14_NO_SAFE/.test(e.message))return [];throw e;}
};

})();
