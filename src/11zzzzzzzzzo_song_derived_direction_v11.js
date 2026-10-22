/* Song-derived direction: input objectives, live capability discovery and bounded
   counterfactual search. The v9 renderer/save contract remains authoritative. */
(()=>{'use strict';
const J=window.J,C=J.clamp,copy=J.clonePhotoRenderPlan;
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const roles=['enter','hold','exit','cam','treat','bg','decor','trans','fx'];
const neutral={enter:'cut',hold:'still',exit:'cut',cam:'stillCamera',treat:'none',bg:'none',decor:'none',trans:'cut',fx:null};
const get=(c,g)=>g==='decor'?c.decor?.[0]?.id||'none':g==='fx'?c.registryFxV9||null:c[g];
const norm=s=>String(s||'').replace(/\s/g,'');
const distance=(a,b)=>a?.length&&a.length===b?.length?mean(a.map((v,i)=>Math.abs(v-b[i]))):null;
const strip=({mask,raster,...e})=>e;
const abort=s=>{if(s?.aborted)throw new DOMException('Aborted','AbortError');};
J.isSongDerivedV11=p=>(p?.songNativeDirection||p?.artDirection?.songNativeDirection)?.optimizerVersion===11;
const is10=J.isCreativeOptimizerV10;J.isCreativeOptimizerV10=p=>J.isSongDerivedV11(p)||is10(p);
J.generateJizuraDirectionV11=async(p,a,o={})=>{
 const set=await J.generateJizuraDirectionV9(p,a,o);
 for(const x of set.candidates){x.proposal.grammarDirection.optimizerVersion=11;x.proposal.summary='曲固有の表現意図から実Canvasで技法を探索・共同選択 v11';}
 return set;
};
// v12 changes search policy, not the v9 renderer/persistence schema.
J.isExpressiveV12=p=>(p?.songNativeDirection||p?.artDirection?.songNativeDirection)?.expressiveVersion===12;
J.generateJizuraDirectionV12=async(p,a,o={})=>{
 const set=await J.generateJizuraDirectionV11(p,a,o);
 for(const x of set.candidates){x.proposal.grammarDirection.expressiveVersion=12;x.proposal.summary='曲固有の空間・保持時間・反復から実Canvasで共同選択 v12';}
 return set;
};
// Select spatially different *observed* layouts before dividing the finite raster
// budget. An input requesting stillness still compares an active alternative.
J.directionSeedsV12=(rows,f)=>{
 const demand=C((f.change||0)*.4+(f.onset||0)*.3+(f.flux||0)*.3);
 const count=Math.min(rows.length,2+Math.ceil(demand*4)),pending=[...rows],kept=[];
 while(pending.length&&kept.length<count){
  const utility=x=>x.score+(kept.length?Math.min(...kept.map(y=>J.registryInkDistance(x.signature,y.signature)??0)):0)*(.2+demand*.3);
  pending.sort((a,b)=>utility(b)-utility(a)||a.layout.localeCompare(b.layout)||a.styleKey.localeCompare(b.styleKey));kept.push(pending.shift());
 }return kept;
};
// Sparse input-derived envelope is part of the selected cut and therefore travels
// through preview, save/restore and both MP4 paths. No new animation vocabulary.
J.directionHoldEnvelopeV12=(intent,c)=>{
 const events=intent.events.filter(e=>e.time>=c.inDur&&e.time<c.dur-c.outDur);
 if(events.length<2)return null;
 const lo=Math.min(...events.map(e=>e.value)),hi=Math.max(...events.map(e=>e.value));
 if(hi-lo<.02)return null;
 const selected=[events[0],events.at(-1)];
 for(let bin=0;bin<3;bin++){
  const slice=events.slice(Math.floor(bin*events.length/3),Math.ceil((bin+1)*events.length/3));
  if(slice.length){selected.push([...slice].sort((a,b)=>a.value-b.value||a.time-b.time)[0]);selected.push([...slice].sort((a,b)=>b.value-a.value||a.time-b.time)[0]);}
 }
 const unique=[...new Map(selected.map(e=>[e.time,e])).values()];
 return {version:12,source:'measured local onset/flux/energy',knots:unique.sort((a,b)=>a.time-b.time).map(e=>({time:e.time,value:C(e.value/hi)}))};
};
// Local transient maxima propose additional executions of an existing FX.
// The boundary-only candidate remains a control; no longer entrance/exit window.
J.directionEventsV12=(intent,c)=>{
 if(intent.status!=='MEASURED')return [];
 const average=mean(intent.events.map(e=>e.value)),maxima=intent.events.filter((e,i,all)=>e.value>average&&e.time>Math.max(.12,c.inDur)&&e.time<c.dur-Math.max(.12,c.outDur)&&e.value>(all[i-1]?.value??-Infinity)&&e.value>=(all[i+1]?.value??-Infinity));
 const chosen=[];for(const e of maxima.sort((a,b)=>b.value-a.value||a.time-b.time)){if(chosen.every(x=>Math.abs(x.offset-e.time)>.12))chosen.push({offset:e.time,strength:e.value});if(chosen.length===2)break;}
 return chosen.sort((a,b)=>a.offset-b.offset);
};
J.directionHoldAtV12=(cut,t)=>{
 const knots=cut.expressiveEnvelopeV12?.knots;if(!knots?.length)return 1;
 let i=0;while(i<knots.length-2&&knots[i+1].time<t)i++;
 const a=knots[i],b=knots[i+1]||a,u=C((t-a.time)/Math.max(1e-6,b.time-a.time));return a.value+(b.value-a.value)*u*u*(3-2*u);
};
const make=J.makeArtDirection;J.makeArtDirection=(p,a,pr)=>{const art=make(p,a,pr);if(pr.grammarDirection?.optimizerVersion===11)art.songNativeDirection.optimizerVersion=11;if(pr.grammarDirection?.expressiveVersion===12)art.songNativeDirection.expressiveVersion=12;return art;};
const build=J.buildJizuraDirectionV9;J.buildJizuraDirectionV9=(p,a)=>{const d=build(p,a);if(J.isSongDerivedV11(p))d.optimizerVersion=11;if(J.isExpressiveV12(p))d.expressiveVersion=12;return d;};
// No keyword-to-effect table. Reuse measured acoustic structure and exact/near
// phrase relations. Japanese emotional/action semantics stay explicitly unknown.
J.songVisualIntentV11=(p,a,c,f=J.songLineFeaturesV8(p,a,c),anchors=[])=>{
 const timeline=a?.features?.detailedTimeline?.length?a.features.detailedTimeline:a?.features?.timeline||[];
 const rows=timeline.filter(r=>r.time>=c.start&&r.time<c.end);
 const activity=r=>C((r.onset??0)*.5+(r.spectralFlux??0)*.3+(r.energy??r.rms??0)*.2);
 const events=rows.map(r=>({time:r.time-c.start,value:activity(r)}));
 const change=mean(rows.slice(1).map((r,i)=>Math.abs(activity(r)-activity(rows[i]))));
 const pressure=C(f.onset*.38+(f.flux??0)*.22+f.change*.25+change*.15);
 const text=norm(c.lineText),glyphs=J.graphemes(text),density=glyphs.length/Math.max(.1,c.dur);
 const repeat=(p.lines||[]).map((l,i)=>({line:i,text:norm(l.text),start:l.start})).filter(l=>l.line!==c.line&&l.text===text).map(({text,...l})=>l);
 const similar=(p.lines||[]).map((l,i)=>{const other=new Set(J.graphemes(norm(l.text))),own=new Set(glyphs),overlap=[...own].filter(x=>other.has(x)).length;return {line:i,similarity:overlap/Math.max(1,new Set([...own,...other]).size)};}).filter(l=>l.line!==c.line&&l.similarity>.5&&l.similarity<1);
 const sections=p.songNativeDirection?.structure?.sections||[],sectionIndex=sections.findIndex(s=>c.start>=s.start&&c.start<s.end),section=sections[sectionIndex];
 const previous=(p.lines||[])[c.line-1],before=previous?timeline.filter(r=>r.time>=previous.start&&r.time<c.start):[];
 const contrastDemand=C(Math.abs(mean(events.map(r=>r.value))-mean(before.map(activity)))+f.change*.4);
 const whitespace=anchors.length?[...anchors].sort((x,y)=>(x.saliency??.5)-(y.saliency??.5)||x.x-y.x||x.y-y.y)[0]:null;
 return {status:rows.length?'MEASURED':'UNMEASURED',...(J.isExpressiveV12(p)?{expressiveVersion:12,objectives:{spatialChange:contrastDemand,temporalChange:change,tension:pressure,release:C(1-pressure),variation:repeat.length?contrastDemand:null,negativeSpace:C(1-density/16)}}:{}),line:c.line,pressure,changeDemand:contrastDemand,
  density:C(density/12),space:C(1-density/16),motion:pressure*(1-C(density/24)),emphasis:events.filter(r=>r.value>mean(events.map(x=>x.value))).sort((x,y)=>y.value-x.value||x.time-y.time).slice(0,3),
  continuity:1-contrastDemand,excessTolerance:C(pressure*(1-density/32)),duration:c.dur,glyphCount:glyphs.length,japaneseRatio:mean(glyphs.map(x=>/[\u3000-\u9fff]/.test(x)?1:0)),
  events,repeat,similar,sectionIndex,sectionPhase:section?C((c.start-section.start)/(section.end-section.start)):null,boundaryConfidence:section?.boundaryConfidence??null,
  image:{status:anchors.length?'MEASURED':'UNMEASURED',whitespace:copy(whitespace),stats:copy(p.autoPalette?.stats||null),subject:'UNMEASURED',safeCrop:{status:'UNMEASURED',reason:'Production geometry reused; subject-aware crop range unavailable'}},
  semantics:{status:'UNMEASURED',confidence:null,emphasisCount:p.songNativeDirection?.lyrics?.[c.line]?.emphasisCount??0},artisticQuality:'UNVERIFIED'};
};
const method=g=>g==='style'?null:g==='layout'?'render':g==='cam'?'get':['bg','decor','trans','fx'].includes(g)?'draw':'apply';
J.directionCapabilityIndexV11=p=>['style',...J.GROUP_KEYS].flatMap(group=>Object.entries(group==='style'?J.STYLES:J.registry(group)).map(([id,d])=>{
 const source=method(group)?String(d[method(group)]||''):'';
 const callable=group==='style'?!!d.schemes?.length:typeof d[method(group)]==='function'||!!d.builtin;
 const amount=Number.isFinite(d.motionAmount)?d.motionAmount:null;
 const temporal=group==='enter'?'entry':group==='exit'?'exit':group==='trans'||group==='fx'?'boundary':'sustained';
 // Implementation tokens describe mechanisms only. They do not certify safety,
 // musical roles, or the magnitude of a technique's eventual rendered effect.
 const mechanisms=['clip','blur','echo','charFn','pieceFn','rotate','translate','scale','fillRect','stroke','gradient'].filter(k=>source.includes(k));
 return {group,id,registered:true,callable,eligible:callable&&!d.requiresAsset&&(group==='style'?J.randomOk(p,'style',id):J.randomOk(p,group,id))&&!(group==='layout'&&(/^songGrammar|^(title|interlude)$/.test(id)||/noHold\s*:\s*true/.test(source))),
  amount:{status:amount===null?'UNMEASURED':'MEASURED',value:amount,source:amount===null?null:'REGISTRY_DECLARATION_NOT_PIXELS'},tags:copy(d.tags||[]),temporal,mechanisms,
  region:['bg','cam','fx','trans'].includes(group)?'frame':group==='decor'?'decoration':'glyph',requiresAsset:copy(d.requiresAsset||null),inputConditions:typeof d.fits==='function'?'LIVE_FITS_PREDICATE':'UNMEASURED',renderVerification:'UNMEASURED'};
}));
// Dispatch observations are distinct from a technique merely being present in
// a candidate cut. Wrappers live only for the synchronous production frame.
const probeFactory=J.createRegistryRenderProbe;J.createRegistryRenderProbe=(...args)=>{
 const sample=probeFactory(...args);let detail=null;const probe=(p,c,t)=>{
  if(!J.isSongDerivedV11(p))return sample(p,c,t);
  const called=new Map(),restores=[],mark=(group,id)=>called.set(group+':'+id,{group,id});
  const cuts=[c,...(c.trans!=='cut'?p.cuts:[])];
  for(const group of ['layout',...roles])for(const id of new Set(cuts.map(cut=>group==='layout'?cut.layout:get(cut,group)))){
   const definition=J.registry(group)[id],key=method(group),fn=definition?.[key];if(typeof fn!=='function')continue;
   definition[key]=function(...input){mark(group,id);return fn.apply(this,input);};restores.push(()=>definition[key]=fn);
  }
  const builtin=J.directionBuiltinProbeV11;J.directionBuiltinProbeV11=id=>mark('fx',id);
  try{const e=sample(p,c,t);if(e.geometry?.length)mark('style',c.styleKey);return {...e,registryDispatchV11:[...called.values()]};}
  finally{restores.reverse().forEach(fn=>fn());J.directionBuiltinProbeV11=builtin;}
 };
 probe.verifyScale=(p,c,t)=>{
  if(!detail){const cv=document.createElement('canvas'),mask=document.createElement('canvas');cv.width=mask.width=640;cv.height=mask.height=Math.round(640*p.H/p.W);detail={cv,sample:J.createRegistryRenderProbe(p,args[1],cv,mask,{production:true,onFrame:args[4]?.onFrame})};}
  const e=detail.sample(p,c,t);if(!e.eligible)return e;
  // Apply the same FX to the no-primary-glyph control as to the actual frame.
  // A post-effect wash must not borrow contrast from the pre-effect background.
  const cv=detail.cv,ctx=cv.getContext('2d',{willReadFrequently:true}),actual=ctx.getImageData(0,0,cv.width,cv.height).data,draw=J.drawItem;
  const cp={...p,cuts:p.cuts.map(old=>old.line===c.line?c:old),titleDisplay:null};J.sharePhotoComposition?.(p,cp);
  J.drawItem=(env,it)=>env.cut?.line>=0&&it.lyricRole!=='decorative'?null:draw(env,it);
  try{args[1].frame(ctx,cp,Math.min(c.end-.000001,c.start+t),{scale:cv.width/p.W,production:true,noHud:true});args[4]?.onFrame?.();}finally{J.drawItem=draw;}
  const contrast=J.glyphFootprintContrast(ctx.getImageData(0,0,cv.width,cv.height).data,actual,e.mask,cv.width,cv.height),readable=contrast.measured&&contrast.renderedVsBackgroundContrastP10>=3;
  return {...e,compositedContrast:contrast,readable:e.readable&&readable,eligible:e.eligible&&(!e.ink||readable)};
 };return probe;
};
J.directionRoleCandidatesV11=(p,g,intent,index=J.directionCapabilityIndexV11(p))=>index.filter(x=>x.group===g&&x.eligible&&x.id!==neutral[g]).map(x=>{
 const amount=x.amount.value??J.registryRoleAmountV9(g,x.id);
 const temporalFit=x.temporal==='sustained'?1-intent.changeDemand:intent.changeDemand;
 const densityFit=x.mechanisms.includes('charFn')?1-intent.density:1-Math.abs(intent.space-.5);
 return {...x,prior:(1-Math.abs(intent.motion-amount))*.55+temporalFit*.25+densityFit*.20,
  priorSource:x.amount.value===null?'UNMEASURED_TAG_PRIOR_AND_IMPLEMENTATION':'DECLARED_PRIOR_AND_IMPLEMENTATION'};
}).sort((a,b)=>b.prior-a.prior||a.id.localeCompare(b.id));
// A capability-distance traversal preserves different mechanisms before raster
// evidence exists; no fixed list of favoured ids and no two-candidate cutoff.
J.directionRepresentativesV11=(rows,budget,seeds=[])=>{
 const kept=[];const diff=(a,b)=>Number(a.temporal!==b.temporal)+Number(a.region!==b.region)+Math.abs((a.amount.value??.35)-(b.amount.value??.35))+new Set([...a.mechanisms,...b.mechanisms].filter(k=>a.mechanisms.includes(k)!==b.mechanisms.includes(k))).size*.3;
 const pending=[...rows];while(pending.length&&kept.length<budget){pending.sort((a,b)=>(b.prior+Math.min(2,...[...seeds,...kept].map(k=>diff(b,k)))*.25)-(a.prior+Math.min(2,...[...seeds,...kept].map(k=>diff(a,k)))*.25)||a.id.localeCompare(b.id));kept.push(pending.shift());}return kept;
};
// Style/layout retrieval uses the live catalogs and continuous input features.
J.directionStyleCandidatesV11=(p,a,f,expand=false)=>{
 const input=J.styleInputProfile({...a?.features,bpm:a?.bpm,energy:f.energy,onsetDensity:f.onset,brightness:f.brightness,sectionContrast:f.change},p.autoPalette?.stats,{japaneseRatio:/[\u3000-\u9fff]/.test(p.lyrics)?1:0,longRatio:C(f.length/32)});
 const ranked=J.scoreStyleProfiles(input,Object.keys(J.STYLES).filter(id=>J.randomOk(p,'style',id)));
 const count=Math.min(ranked.length,3+Math.ceil(f.change*2));
 return expand?ranked:ranked.slice(0,count);
};
const layouts=J.registryLayoutCandidatesV9;J.registryLayoutCandidatesV9=(p,c,f,style,available)=>{
 if(!J.isSongDerivedV11(p))return layouts(p,c,f,style,available);
 const allowed=new Set(available.filter(([id,d])=>!d.fits||d.fits(f.length)).map(([id])=>id));
 const rows=J.directionCapabilityIndexV11(p).filter(x=>x.group==='layout'&&x.eligible&&allowed.has(x.id)).map(x=>({...x,prior:(1-C(f.length/60))*.15+(style.bias?.layout?.[x.id]?Math.log1p(style.bias.layout[x.id])*.12:0)+(x.mechanisms.includes('charFn')?1-C(f.length/24):C(f.length/24))*.25}));
 return J.directionRepresentativesV11(rows,Math.ceil(7+f.change*5+C(f.length/32)*2)).map(x=>x.id);
};
J.directionLayoutSequenceV11=function*(initial,available,hasSafe,context){
 yield*initial;
 // Expand only after the initial capability frontier cannot retain a temporal
 // safe baseline. Live registry order/bias remains a prior, never a certificate.
 if(!hasSafe()){for(const [id] of available){if(initial.includes(id))continue;yield id;if(hasSafe())break;}return;}
 if(!context)return;
 const rows=context.rows(),demand=C(context.f.change*.65+context.f.onset*.35),measured=rows.map(r=>r.dimensions?.acousticFit).filter(Number.isFinite),best=measured.length?Math.max(...measured):null;
 const diversity=Math.max(0,...rows.flatMap((a,i)=>rows.slice(i+1).map(b=>J.registryInkDistance(a.signature,b.signature)||0)));
 // Expand a deficient, visually converged frontier only when the input asks
 // for contrast. The caller tests every yielded layout through real Canvas.
 if(demand>.25&&(best===null||best<.9)&&diversity<demand*.5){
  const allowed=new Set(available.map(([id])=>id));
  const index=J.directionCapabilityIndexV11(context.p),rest=index.filter(x=>x.group==='layout'&&x.eligible&&allowed.has(x.id)&&!initial.includes(x.id));
  for(const row of J.directionRepresentativesV11(rest.map(x=>({...x,prior:0})),Math.ceil(1+demand*3),index.filter(x=>x.group==='layout'&&initial.includes(x.id))))yield row.id;
 }
};
// Feature-aware schedules include the actual effect windows, a long readable
// hold, and local onsets. Final checks reuse the same schedule in composed order.
J.directionPhasesV11=(p,c,a)=>{
 const events=(a?.features?.detailedTimeline||a?.features?.timeline||[]).filter(r=>r.time>=c.start&&r.time<c.end).sort((x,y)=>(y.onset??0)+(y.spectralFlux??0)-(x.onset??0)-(x.spectralFlux??0));
 const t=[.001,c.dur*.5,c.dur*.72,c.dur-.001];
 if(c.enter!=='cut'&&c.inDur>0)t.push(c.inDur*.45,c.inDur+.015);
 if(c.exit!=='cut'&&c.outDur>0)t.push(c.dur-c.outDur*.5);
 if(c.registryFxV9||c.trans!=='cut')t.push(Math.min(.045,c.dur*.04));
 if(events[0])t.push(events[0].time-c.start);
 if(J.isExpressiveV12(p)&&c.registryFxV9)for(const e of c.expressiveEventsV12||[])t.push(e.offset+.01,e.offset+.06);
 if(J.isExpressiveV12(p)){const hold=events.filter(e=>e.time-c.start>c.inDur&&e.time-c.start<c.dur-c.outDur);if(hold.length){const quiet=[...hold].sort((a,b)=>(a.onset??0)+(a.spectralFlux??0)-(b.onset??0)-(b.spectralFlux??0))[0];t.push(quiet.time-c.start);if(hold[0])t.push(Math.min(c.dur-.001,hold[0].time-c.start+.08));}}
 return [...new Set(t.filter(v=>v>=0&&v<c.dur).map(v=>+v.toFixed(6)))].sort((x,y)=>x-y);
};
// Reusable scratch canvases, scoped to this synchronous glyph observation. Compare
// the core's actual clipping/pieces against an unclipped reference at the exact
// production transform. Echo never fills in a missing primary glyph.
let glyphCanvases=null;
J.inspectDirectionGlyphV11=(env,it,draw,w,h)=>{
 if(!glyphCanvases)glyphCanvases=[document.createElement('canvas'),document.createElement('canvas')];
 const data=glyphCanvases.map((cv,i)=>{
  if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h;}
  const ctx=cv.getContext('2d',{willReadFrequently:true});ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);
  const m=env.ctx.getTransform();ctx.setTransform(m.a,m.b,m.c,m.d,m.e,m.f);
  const core={...it,echo:null,streak:null,shadow:null,blur:0,pre:null,post:null,blend:null};
  if(i){for(const k of ['clip','clipY','clipFn','bands','vbands','pieceFn'])delete core[k];const fn=it.charFn;core.alpha=1;core.charFn=fn?(...args)=>{const v={...fn(...args)};for(const k of ['hide','clipX','clipY','a'])delete v[k];return v;}:null;}
  // drawFx owns outer clipping, band reconstruction and per-glyph pieces.
  // Scratch draws bypass the observational hook, preserving one logical item.
  const previous=J.drawItem;J.drawItem=draw;try{J.drawFx({...env,ctx,inLayer:true,allowFilter:false,lyricAuditCtx:null},core);}finally{J.drawItem=previous;}
  return ctx.getImageData(0,0,w,h).data;
 });
 let reference=0,covered=0;
 for(let k=3;k<data[1].length;k+=4){if(data[1][k]<80)continue;reference++;covered+=Number(data[0][k]>=Math.min(80,data[1][k]*.8));}
 return {status:reference?'MEASURED':'FAILED',referencePixels:reference,coverage:reference?covered/reference:0,complete:reference>8&&covered===reference,source:'actual primary core versus unclipped same-transform glyph raster'};
};
J.directionSafetyV11=(c,dt,e)=>{
 const entry=c.enter!=='cut'&&dt<c.inDur,exit=c.exit!=='cut'&&dt>c.dur-c.outDur;
 const transient=entry||exit;
 const exact=e.full&&!e.extra,core=e.advancedChecks.length>0&&e.advancedChecks.every(x=>x.complete);
 const strict=exact&&core&&e.contrast.measured&&e.contrast.renderedVsBackgroundContrastP10>=3&&e.geometry.length>0&&e.geometry.every(g=>g.readable)&&e.ink>8&&e.safe&&e.height>.035;
 // Transient partial display is bounded in time, with unchanged safe bounds and
 // no extra/substituted text. Hold samples must satisfy every original threshold.
 const bounded=c.inDur<=Math.min(.22,c.dur*.15)+1e-6&&c.outDur<=Math.min(.12,c.dur*.08)+1e-6;
 const partial=transient&&bounded&&e.sourceFull&&!e.directLabels.length&&e.safe&&e.geometry.length>0&&e.geometry.every(g=>!g.distortion&&!g.collisions)&&e.advancedChecks.every(x=>x.referencePixels>8)&&(!e.ink||(e.contrast.measured&&e.contrast.renderedVsBackgroundContrastP10>=3));
 return {eligible:strict||partial,readable:strict,temporalStage:entry?'ENTRY':exit?'EXIT':'HOLD',safetyStatus:strict?'MEASURED_READABLE':partial?'MEASURED_BOUNDED_TRANSIENT':'FAILED'};
};
const changeRole=(cut,g,k)=>{
 const c=copy(cut),definition=J.registry(g)[k],rng=J.rng(J.h(c.seed,J.sid(g),J.sid(String(k))));
 if(['treat','bg','cam','trans'].includes(g))c[g+'P']=definition?.plan?definition.plan(rng,c.style):{};
 if(g==='fx'){if(k)c.registryFxV9=k;else{delete c.registryFxV9;delete c.expressiveEventsV12;}}else if(g==='decor')c.decor=k==='none'?[]:[J.registryDecorParams(rng,k)];else c[g]=k;
 if(g==='enter')c.inDur=k==='cut'?0:Math.min(.22,c.dur*.15);
 if(g==='exit')c.outDur=k==='cut'?0:Math.min(.12,c.dur*.08);
 if(g==='trans')c.transDur=k==='cut'?0:Math.min(.10,c.dur*.08);return c;
};
J.changeDirectionRoleV11=changeRole;
J.scoreDirectionV11=(cut,f,intent,checks,baseScore)=>{
 const out=J.scoreCreativeCandidateV10(cut,f,checks.filter(e=>e.readable!==false),baseScore);
 const pairs=checks.slice(1).map((e,i)=>({a:checks[i],b:e,visual:distance(e.raster,checks[i].raster)})).filter(x=>Number.isFinite(x.visual));
 // Compare the shape of acoustic/rendered activity rather than rewarding larger
// pixel differences. A flat raster cannot claim aligned expressive movement.
 const audio=pairs.map(x=>mean(intent.events.filter(e=>e.time>=x.a.sampleOffset&&e.time<x.b.sampleOffset).map(e=>e.value)));
 const maxV=Math.max(0,...pairs.map(x=>x.visual)),maxA=Math.max(0,...audio);
 const alignment=pairs.length>1&&maxA>0&&maxV>1e-6?1-mean(pairs.map((x,i)=>Math.abs(x.visual/maxV-audio[i]/maxA))):null;
 const observedMotion=maxV>1e-6?C(maxV*5):0;
 const targetFit=1-Math.abs(intent.motion-observedMotion);
 out.dimensions.intentFit=targetFit;out.dimensions.onsetAlignment=alignment;
 out.dimensions.visualImpact=pairs.length?mean(pairs.map(x=>x.visual)):null;
 if(!intent.expressiveVersion){out.score=out.score*.75+targetFit*.15+(alignment??.5)*.10;return out;}
 const holds=checks.filter(e=>e.temporalStage==='HOLD'),holdPairs=holds.slice(1).map((b,i)=>({a:holds[i],b,visual:distance(b.raster,holds[i].raster)})).filter(x=>Number.isFinite(x.visual)&&x.b.sampleOffset>x.a.sampleOffset);
 const rate=p=>p.visual/(p.b.sampleOffset-p.a.sampleOffset);
 const activity=p=>{const rows=intent.events.filter(e=>e.time>=p.a.sampleOffset&&e.time<p.b.sampleOffset);return rows.length?mean(rows.map(e=>e.value)):null;};
 const aligned=holdPairs.filter(p=>Number.isFinite(activity(p))),rates=aligned.map(rate),audioRates=aligned.map(activity),maxRate=Math.max(0,...rates),maxAudio=Math.max(0,...audioRates);
 const temporal=aligned.length>1&&maxRate>1e-6&&maxAudio-Math.min(...audioRates)>.02?1-mean(rates.map((r,i)=>Math.abs(r/maxRate-audioRates[i]/maxAudio))):null;
 const observed=holdPairs.length?C(holdPairs.reduce((sum,p)=>sum+p.visual,0)/holdPairs.reduce((sum,p)=>sum+p.b.sampleOffset-p.a.sampleOffset,0)*5):null;
 const acousticFit=intent.status==='MEASURED'&&observed!==null?1-Math.abs(intent.motion-observed):null;
 const geometryFit=checks.length?mean(checks.map(e=>1-Math.abs(C(e.height/.3)-(.35+f.energy*.25+f.brightness*.15-f.length/180)))):null;
 const coherence=aligned.length>1?1-C(mean(rates.slice(1).map((v,i)=>Math.max(0,Math.abs(v-rates[i])-Math.abs(audioRates[i+1]-audioRates[i]))))):null;
 const excess=observed===null?null:Math.max(0,observed-intent.motion-intent.excessTolerance);
 Object.assign(out.dimensions,{visualCoherence:coherence,excessPenalty:excess,onsetAlignment:temporal,geometryFit,readability:holds.length?Number(holds.every(e=>e.readable===true)):null,acousticFit,temporalAlignment:temporal,musicFit:acousticFit,expressiveRealization:holdPairs.length?mean(holdPairs.map(p=>p.visual)):null});
 out.holdEvidence={status:holdPairs.length?'MEASURED':'UNMEASURED',sampledStagnationSeconds:holdPairs.filter(p=>p.visual<=1e-6).reduce((sum,p)=>sum+p.b.sampleOffset-p.a.sampleOffset,0),samples:holds.map(e=>e.sampleOffset),scope:'sampled intervals; not continuous frame coverage'};
 const terms=[[out.dimensions.compositionQuality,.28],[out.dimensions.temporalContinuity,.12],[out.dimensions.visualCoherence,.08],[acousticFit,.30],[temporal,.10],[baseScore,.12]].filter(([v])=>Number.isFinite(v));
 out.score=terms.reduce((sum,[v,w])=>sum+v*w,0)/terms.reduce((sum,[,w])=>sum+w,0)-(excess??0)*.35;
 return out;
};
const optimize=J.optimizeCreativeLineV10;
J.optimizeCreativeLineV10=async args=>{
 if(!J.isSongDerivedV11(args.p))return optimize(args);
 const {p,c,ranked,distinct,sample:rawSample,phases,signal,audio,anchors=[]}=args;
 const sample=(...input)=>{abort(signal);try{return rawSample(...input);}catch(error){if(error.name==='AbortError')throw error;return {eligible:false,readable:false,renderErrors:[String(error.message)],mask:null,raster:null};}};
 const intent=J.songVisualIntentV11(p,audio,c,args.f,anchors),f={...args.f,...(intent.expressiveVersion?{rhythmicProfile:Array.from({length:4},(_,i)=>{const events=intent.events.filter(e=>e.time>=c.dur*i/4&&e.time<c.dur*(i+1)/4);return events.length?mean(events.map(e=>e.value)):null;}),density:intent.density}:{}),sectionIndex:intent.sectionIndex,sectionPhase:intent.sectionPhase,boundaryConfidence:intent.boundaryConfidence,localAudio:intent.events.map(e=>({time:e.time,activity:e.value}))};
 const index=J.directionCapabilityIndexV11(p),discover=Object.fromEntries(roles.map(g=>[g,J.directionRoleCandidatesV11(p,g,intent,index)]));
 const budget=Math.ceil(78+intent.pressure*24+intent.changeDemand*24+Math.log2(1+index.length));
 const catalog=index.map(x=>({...x,probed:false,safe:false,selected:false})),observed=new Map(),results=[],interactions=[],exclusions=[];let compared=0;
 const record=(cut,checks)=>{for(const call of checks.flatMap(e=>e.registryDispatchV11||[])){const row=catalog.find(x=>x.group===call.group&&x.id===call.id);if(row){row.probed=true;if(checks.every(e=>e.eligible)&&checks.some(e=>e.readable))row.safe=true;}}};
 const starts=[],preflight=new Set();
 // A layout can own its own reveal even with a cut entrance. Test its actual
 // time windows before allowing midpoint geometry to monopolize the search.
 for(const row of [...distinct,...ranked]){
  const key=J.canonicalJSON(row.cut);if(preflight.has(key))continue;preflight.add(key);
  const sp={...p,style:row.cut.style,styleKey:row.cut.styleKey},checks=phases(row.cut).map(t=>sample(sp,row.cut,t));record(row.cut,checks);
  if(checks.every(e=>e.eligible)&&checks.some(e=>e.readable))starts.push(row);
  if(starts.length>=(J.isExpressiveV12(p)?distinct.length:2))break;
 }
 // Unsafe individual states may still be rescued by joint treatment/background
 // search. They are never committed without final full temporal validation.
 if(!starts.length)starts.push(...(J.isExpressiveV12(p)?distinct:distinct.slice(0,2)));
 for(const start of starts){
  const base=copy(start.cut),sp={...p,style:base.style,styleKey:base.styleKey},local=[],limit=Math.ceil(budget/Math.max(1,starts.length));let used=0;
  const evaluate=cut=>{
   abort(signal);const key=J.canonicalJSON(cut);if(observed.has(key))return observed.get(key);if(used>=limit)return null;
   used++;compared++;
   // Entry, readable hold and exit precede any ranking; no midpoint hard gate.
   const times=phases(cut),early=times.filter(t=>t<c.inDur||t<c.dur*.12),late=times.filter(t=>t>c.dur-c.outDur||t>c.dur*.9);
   const initial=[...new Set([early[Math.floor(early.length/2)]??.001,c.dur*.5,...(J.isExpressiveV12(p)?times.filter(t=>t>cut.inDur&&t<cut.dur-cut.outDur):[]),late[0]??c.dur-.001])].sort((x,y)=>x-y),checks=initial.map(t=>sample(sp,cut,t));record(cut,checks);
   if(!checks.every(e=>e.eligible)||!checks.some(e=>e.readable)){exclusions.push({layout:cut.layout,reason:'TEMPORAL_CORE_CONTRAST_OR_GEOMETRY',roles:roles.map(g=>[g,get(cut,g)])});observed.set(key,null);return null;}
   const fit=J.scoreDirectionV11(cut,f,intent,checks,start.score),item={...start,cut,checks,times:initial,...fit};local.push(item);observed.set(key,item);return item;
  };
  const control=evaluate(base),singles=[];
  const envelope=J.isExpressiveV12(p)?J.directionHoldEnvelopeV12(intent,c):null,localEvents=J.isExpressiveV12(p)?J.directionEventsV12(intent,c):[];
  // Image saliency supplies placement hypotheses, not recognized subjects or a
  // mandatory off-center quota. Keep only actual safe/composed improvements.
  const baseAnchor=base.params.photoAnchor||{x:.5,y:.5};
  const placements=anchors.filter(a=>Math.hypot(a.x-baseAnchor.x,a.y-baseAnchor.y)>1e-6).sort((a,b)=>(a.saliency??.5)-(b.saliency??.5)||a.x-b.x||a.y-b.y);
  for(const anchor of placements.slice(0,Math.ceil(1+intent.changeDemand*2))){
   if(used>=limit)break;evaluate({...copy(base),params:{...copy(base.params),photoAnchor:copy(anchor)}});
  }
  // All eligible entries participate in retrieval. The raster budget expands
  // with acoustic demand and capability diversity, rather than a top-two list.
  const queues=Object.fromEntries(roles.map(g=>[g,J.directionRepresentativesV11(discover[g],Math.ceil(3+intent.changeDemand*3))]));
  let cursor=0;while(used<Math.ceil(limit*.65)&&roles.some(g=>queues[g][cursor])){
   for(const g of roles){const entry=queues[g][cursor];if(entry){const cut=changeRole(base,g,entry.id),item=evaluate(cut);singles.push({g,entry,item:item||{cut,score:control?.score??entry.prior},safe:!!item});if(g==='hold'&&envelope)evaluate({...copy(cut),expressiveEnvelopeV12:copy(envelope)});if(g==='fx'&&localEvents.length)evaluate({...copy(cut),expressiveEventsV12:copy(localEvents)});}if(used>=Math.ceil(limit*.65)&&(!J.isExpressiveV12(p)||cursor>0))break;}cursor++;
  }
  // Every role pair is eligible. Spatial overlap, simultaneous activity and
  // measured single-state residuals rank interactions, never a fixed pair table.
  const edges=[];for(let i=0;i<singles.length;i++)for(let j=i+1;j<singles.length;j++){
   const a=singles[i],b=singles[j];if(a.g===b.g)continue;
   const overlap=Number(a.entry.region===b.entry.region||a.entry.region==='frame'||b.entry.region==='frame');
   const timing=Number(a.entry.temporal===b.entry.temporal||a.entry.temporal==='sustained'||b.entry.temporal==='sustained');
   edges.push({a,b,priority:(a.item.score+b.item.score)/2+overlap*.05+timing*.05+intent.changeDemand*.05});
  }
  edges.sort((a,b)=>b.priority-a.priority||a.a.g.localeCompare(b.a.g)||a.b.g.localeCompare(b.b.g));
  let plateau=0,bestFit=Math.max(-Infinity,...local.map(x=>x.score)),settled=false;
  for(const {a,b} of edges){if(used>=limit-2)break;const joint=evaluate(changeRole(a.item.cut,b.g,b.entry.id));if(joint&&control){const controls=[base,a.item.cut,b.item.cut].map(cut=>{const checks=joint.times.map(t=>sample(sp,cut,t));return checks.every(e=>e.eligible)?J.scoreDirectionV11(cut,f,intent,checks,start.score).score:null;});interactions.push({groups:[a.g,b.g],ids:[a.entry.id,b.entry.id],status:'MEASURED',controlSafe:controls.map(Number.isFinite),rescuedUnsafeSingle:!a.safe||!b.safe,baseline:controls[0],one:controls[1],two:controls[2],joint:joint.score,gain:controls.every(Number.isFinite)?joint.score-Math.max(controls[1],controls[2]):null,times:joint.times,scope:'entry/hold/exit production Canvas; identical input/times'});}
   if(joint&&joint.score>bestFit+1e-5){bestFit=joint.score;plateau=0;}else plateau++;
   if(plateau>=4&&local.length>=4&&local.some(x=>x.dimensions.intentFit>.8&&x.dimensions.musicFit>.65)){settled=true;break;}
  }
  // If the first portfolio converges in pixels despite acoustic demand, spend
  // the residual budget on the least represented capability direction.
  const spread=Math.max(0,...local.map(x=>distance(x.checks[1]?.raster,control?.checks[1]?.raster)??0));
  if(spread<intent.changeDemand*.05){for(const g of roles){if(used>=limit)break;const rest=discover[g].filter(x=>!queues[g].some(y=>y.id===x.id));const candidate=J.directionRepresentativesV11(rest,1)[0];if(candidate)evaluate(changeRole(base,g,candidate.id));}}
  // Local refinement can form more than two interacting components.
  local.sort((a,b)=>b.score-a.score);if(local[0]&&!settled)for(const g of roles){if(used>=limit)break;const best=singles.filter(x=>x.g===g&&x.safe).sort((a,b)=>b.item.score-a.item.score)[0];if(best)evaluate(changeRole(local[0].cut,g,best.entry.id));}
  local.sort((a,b)=>b.score-a.score);
  const arcReserve=[...local].sort((a,b)=>Math.abs((distance(a.checks[1]?.raster,control?.checks[1]?.raster)??0)-intent.changeDemand*.3)-Math.abs((distance(b.checks[1]?.raster,control?.checks[1]?.raster)??0)-intent.changeDemand*.3))[0];
  const finalists=[...(arcReserve?[arcReserve]:[]),...J.creativeParetoV10(local).slice(0,3),...local.slice(0,2),...(control?[control]:[])],seen=new Set();
  for(const item of finalists){
   const key=J.canonicalJSON(item.cut);if(seen.has(key))continue;seen.add(key);abort(signal);
   item.times=phases(item.cut);item.checks=item.times.map(t=>sample(sp,item.cut,t));record(item.cut,item.checks);
   if(!item.checks.every(e=>e.eligible)||!item.checks.some(e=>e.temporalStage==='HOLD'&&e.readable))continue;
   Object.assign(item,J.scoreDirectionV11(item.cut,f,intent,item.checks,start.score));
   const ablations=[];
   if(item.cut.expressiveEnvelopeV12){
    const controlCut=copy(item.cut);delete controlCut.expressiveEnvelopeV12;
    const controls=item.times.map(t=>sample(sp,controlCut,t)),safe=controls.every(e=>e.eligible),fit=safe?J.scoreDirectionV11(controlCut,f,intent,controls,start.score):null;
    const differences=controls.map((e,i)=>distance(e.raster,item.checks[i].raster)),observed=differences.every(Number.isFinite)?mean(differences):null;
    item.envelopeEvidence={status:observed===null?'UNMEASURED':'MEASURED',pixelDifference:observed,fitGain:fit?item.score-fit.score:null,source:'identical hold technique and times, acoustic modulation removed'};
    if(safe&&(observed<=1e-6||fit.score>item.score)){item.cut=controlCut;item.checks=controls;Object.assign(item,fit);}
   }
   for(const g of roles.filter(g=>get(item.cut,g)!==neutral[g])){
    const cc=changeRole(item.cut,g,neutral[g]),checks=item.times.map(t=>sample(sp,cc,t)),safe=checks.every(e=>e.eligible)&&checks.some(e=>e.readable),fit=safe?J.scoreDirectionV11(cc,f,intent,checks,start.score):null;
    const differences=checks.map((e,i)=>distance(e.raster,item.checks[i].raster)),difference=differences.every(Number.isFinite)?mean(differences):null;
    ablations.push({group:g,id:get(item.cut,g),status:checks.some(e=>e.renderErrors?.length)?'FAILED':differences.every(Number.isFinite)?'MEASURED':'UNMEASURED',controlSafe:safe,pixelDifference:difference,fitGain:fit?item.score-fit.score:null,times:item.times.map(t=>c.start+t),...(J.temporalRoleContributionV112?{temporalContribution:J.temporalRoleContributionV112(c,item.times,item.checks,checks,intent)}:{})});
    if(safe&&difference<=1e-6){item.cut=cc;item.checks=checks;Object.assign(item,fit);}
   }
   const positive=ablations.filter(x=>x.controlSafe&&x.pixelDifference>1e-6&&Number.isFinite(x.fitGain));
   item.dimensions.expressiveContribution=positive.length?mean(positive.map(x=>x.fitGain)):null;
   const temporal=ablations.map(x=>x.temporalContribution?.acousticFitGain).filter(Number.isFinite);item.dimensions.temporalRoleFitGain=temporal.length?mean(temporal):null;if(temporal.length)item.score+=C(mean(temporal)*.03,-.03,.03);
   const hold=item.checks.find(e=>e.temporalStage==='HOLD'&&e.readable),w=256,h=Math.round(w*p.H/p.W);
   results.push({...item,params:item.cut.params,evidence:strip(hold),phaseEvidence:item.checks.map(strip),signature:J.registryInkSignature(hold.mask,w,h),typographySignature:J.registryTypographySignature(hold.mask,w,h),rasterSignature:hold.raster,features:f,intent,ablations,holdEvidence:item.holdEvidence,attempts:[],musicFit:item.dimensions.musicFit});
  }
  await new Promise(r=>setTimeout(r,0));
 }
 if(!results.length)throw Object.assign(Error('V11_NO_TEMPORAL_SAFE_CANDIDATE_LINE_'+c.line),{diagnostic:{compared,exclusions,baselines:starts.map(start=>({layout:start.cut.layout,style:start.cut.styleKey,checks:phases(start.cut).map(t=>({time:t,...strip(sample({...p,style:start.cut.style,styleKey:start.cut.styleKey},start.cut,t))}))}))}});
 results.sort((a,b)=>b.score-a.score||J.canonicalJSON(a.cut).localeCompare(J.canonicalJSON(b.cut)));
 for(const x of results)x.optimizerEvidence={compared,budget,exclusions,interactions,axes:x.dimensions,hold:x.holdEvidence,envelope:x.envelopeEvidence||null,seedCount:starts.length,ablations:x.ablations,intent,catalog,counts:Object.fromEntries(['registered','callable','eligible','probed','safe'].map(k=>[k,catalog.filter(x=>x[k]).length])),searchTermination:compared>=budget?'ADAPTIVE_BUDGET':'LOCAL_CAPABILITY_FRONTIER',unmeasured:['artisticQuality','semantics','encodedSurvival']};
 return results;
};
// Each vector names its actual observation source. Background and decoration
// isolation are unavailable here; never relabel complete RGB as separate layers.
J.directionLayersV111=(item,p)=>{
 const checks=item.checks||[],w=256,h=Math.round(w*p.H/p.W),holds=checks.filter(e=>e.temporalStage==='HOLD'&&e.mask);
 const primary=holds.map(e=>J.registryInkSignature(e.mask,w,h));
 const movement=primary.slice(1).map((s,i)=>J.registryInkDistance(s,primary[i]));
 const camera=checks.flatMap(e=>e.cameraSamples||[]).map(e=>e.transform);
 const cameraVector=camera.length?['x','y','s','rot'].flatMap(k=>{const v=camera.map(t=>Number.isFinite(t[k])?t[k]:k==='s'?1:0);const scale=k==='x'?p.W:k==='y'?p.H:k==='rot'?180:1;return [mean(v)/scale,(Math.max(...v)-Math.min(...v))/scale];}):null;
 const measured=(value,source)=>({status:value===null?'UNMEASURED':'MEASURED',value,source});
 const rgb=item.rasterSignature||holds[0]?.raster;
 const color=rgb?.length?[0,1,2].map(k=>mean(rgb.filter((_,i)=>i%3===k))):null;
 return {typography:measured(primary[0]||null,'readable hold primary glyph mask'),glyphMotion:measured(movement.length?[mean(movement)]:null,'successive primary hold masks; includes layout/camera motion'),camera:measured(cameraVector,'production camera callback transforms'),color:measured(color,'complete RGB cell means'),background:{status:'UNMEASURED'},decorationFX:{status:'UNMEASURED'},wholeFrame:measured(rgb||null,'complete RGB raster')};
};
const layerDistance=(a,b)=>{
 const values=[];
 for(const k of ['typography','glyphMotion','camera','color','background','decoration','fx']){const x=a?.[k],y=b?.[k];if(x?.status!=='MEASURED'||y?.status!=='MEASURED')continue;const d=k==='typography'?J.registryInkDistance(x.value,y.value):distance(x.value,y.value);if(Number.isFinite(d))values.push(C(d));}
 return values.length?mean(values):null;
};
const acoustic=(a,b)=>{
 const values=['energy','onset','brightness','change','flux','density'].filter(k=>Number.isFinite(a?.[k])&&Number.isFinite(b?.[k])).map(k=>Math.abs(a[k]-b[k]));
 if(a?.rhythmicProfile&&b?.rhythmicProfile){const bins=a.rhythmicProfile.map((v,i)=>Number.isFinite(v)&&Number.isFinite(b.rhythmicProfile[i])?Math.abs(v-b.rhythmicProfile[i]):null).filter(Number.isFinite);if(bins.length)values.push(mean(bins));}
 return mean(values);
};
const visual=(a,b)=>Math.max(J.registryInkDistance(a.signature,b.signature)??0,(distance(a.rasterSignature,b.rasterSignature)??0)*3);
const arc=J.chooseCreativeArcV10;J.chooseCreativeArcV10=(p,portfolios,initial)=>{
 if(!J.isSongDerivedV11(p))return arc(p,portfolios,initial);
 for(const step of portfolios)for(const item of step.candidates)if(item.checks)item.layerEvidenceV111=J.directionLayersV111(item,p);
 const relations=p.songNativeDirection.structure?.relations||[];
 const chosen=J.chooseRegistryStoryboard(portfolios,Math.min(14,8+Math.ceil(mean(portfolios.flatMap(x=>x.candidates.map(c=>c.intent?.changeDemand??0)))*6)),{acousticPacingOnly:true,transitionScore:(state,c,step)=>{
  const prev=state.last;if(!prev)return 0;const delta=acoustic(prev.features,c.features),vd=visual(prev,c),boundary=prev.features.sectionIndex!==c.features.sectionIndex?(c.features.boundaryConfidence??0):0,target=C(delta*(2.5+boundary*.5),0,.8);
  const repeat=state.picks.find(x=>norm(p.lines[x.line]?.text)===norm(p.lines[step.line]?.text));
  const relation=state.picks.find(x=>relations.some(r=>r.from===x.features.sectionIndex&&r.to===c.features.sectionIndex||r.to===x.features.sectionIndex&&r.from===c.features.sectionIndex)&&Math.abs((x.features.sectionPhase??0)-(c.features.sectionPhase??0))<.2);
  const previous=repeat||relation,recurrence=previous?Math.abs(visual(previous,c)-C(acoustic(previous.features,c.features)*2.5,0,.8))*.12:0;
  const layers=layerDistance(prev.layerEvidenceV111,c.layerEvidenceV111),repeatLayers=previous?layerDistance(previous.layerEvidenceV111,c.layerEvidenceV111):null;
  const motionRelation=previous&&c.intent?.expressiveVersion&&previous.dimensions?.expressiveRealization!==null&&Number.isFinite(previous.dimensions?.expressiveRealization)&&Number.isFinite(c.dimensions?.expressiveRealization)?Math.abs(Math.abs(previous.dimensions.expressiveRealization-c.dimensions.expressiveRealization)-acoustic(previous.features,c.features))*.08:0;
  return -.28*Math.abs(vd-target)-recurrence-motionRelation-(repeatLayers===null?0:.05*Math.abs(repeatLayers-C(acoustic(previous.features,c.features)*1.5,0,.6)))-(layers===null?0:.08*Math.abs(layers-C(delta*1.5,0,.6)))-(prev.styleKey!==c.styleKey?.10*(1-delta):0);
 }});
 const audit=J.auditCreativeArcV10(portfolios,chosen.picks);
 return {...chosen,creativeArc:{...audit,source:'primary glyph + complete RGB raster + acoustic recurrence/phase + measured hold progression',repeatRelations:copy(relations),unresolvedMonotony:audit.requiresReevaluation?'NO_BETTER_GLOBAL_SAFE_PATH':null},method:'input-derived capability/temporal Pareto and multilevel raster beam v11'};
};
// Only the composed shortlist is checked at a larger raster. A failed state is
// removed and the existing beam selects from remaining safe alternatives; the
// verification budget decreases on every rejection, without threshold changes.
J.confirmDirectionScaleV11=async(p,portfolios,initial,sample,phases,signal)=>{
 if(!initial.picks.length)return {...initial,scaleSafety:{status:'NOT_APPLICABLE',width:640,entries:[],rejected:[]}};
 if(!sample.verifyScale)throw Error('V11_MISSING_DETAIL_PROBE');
 const candidates=portfolios.map(step=>({...step,candidates:[...step.candidates]})),rejected=[];
 let selected=initial;
 for(let remaining=candidates.reduce((n,s)=>n+s.candidates.length,0);remaining>0;remaining--){
  abort(signal);const trial=copy(p);J.installRegistryStoryboardV8(trial,selected.picks.map(x=>({line:x.line,cut:x.cut})));
  const evidence=[],bad=[];
  for(const pick of selected.picks){
   const cut=trial.cuts.find(c=>c.line===pick.line),checks=phases(cut).map(t=>sample.verifyScale(trial,cut,t));
   evidence.push({line:cut.line,checks:checks.map(strip)});
   if(!checks.every(e=>e.eligible)||!checks.some(e=>e.temporalStage==='HOLD'&&e.readable))bad.push(pick);
  }
  if(!bad.length)return {...selected,scaleSafety:{status:'MEASURED_SAFE_SEQUENCE',width:640,entries:evidence,rejected}};
  for(const pick of bad){const step=candidates.find(s=>s.line===pick.line),key=J.canonicalJSON(pick.cut);step.candidates=step.candidates.filter(x=>J.canonicalJSON(x.cut)!==key);rejected.push({line:pick.line,reason:'LARGER_RASTER_GLYPH_CONTRAST_OR_GEOMETRY',roles:roles.map(g=>[g,get(pick.cut,g)])});if(!step.candidates.length)throw Error('V11_NO_MULTISCALE_SAFE_CANDIDATE_LINE_'+pick.line);}
  selected=J.chooseCreativeArcV10(p,candidates,selected);await new Promise(r=>setTimeout(r,0));
 }
 throw Error('V11_DETAIL_FRONTIER_EXHAUSTED');
};
const alternative=J.creativeAlternativeEvidenceV10;J.creativeAlternativeEvidenceV10=(s,b,p)=>({...alternative(s,b,p),...(b.scaleSafety?{multiScaleEvidence:copy(b.scaleSafety)}:{})});
const attach=J.attachCreativeEvidenceV10;J.attachCreativeEvidenceV10=(selection,storyboard,portfolios)=>{
 const active=selection.optimizerVersion===11||storyboard.picks.some(x=>x.intent);attach(selection,storyboard,portfolios);if(!active)return;
 selection.optimizerVersion=11;selection.optimizerContract='jizura-song-derived-direction-11';selection.multiScaleEvidence=copy(storyboard.scaleSafety||null);
 for(const trace of selection.traces){const chosen=storyboard.picks.find(x=>x.line===trace.line);if(!chosen)continue;
  trace.creative=copy(chosen.optimizerEvidence);trace.creative.axes=copy(chosen.dimensions);trace.creative.layers=copy(chosen.layerEvidenceV111||{status:'UNMEASURED'});trace.creative.catalog.forEach(row=>row.selected=row.group==='style'?row.id===chosen.cut.styleKey:row.group==='layout'?row.id===chosen.cut.layout:row.id===get(chosen.cut,row.group));
  trace.creative.catalog.forEach(row=>{row.states=['REGISTERED',...(row.callable?['CALLABLE']:[]),...(row.eligible?['ELIGIBLE']:[]),...(row.probed?['PROBED']:[]),...(row.safe?['SAFE']:[]),...(row.selected?['SELECTED']:[])];row.renderVerification=row.probed?'MEASURED_INPUT_COMPOSITION':'UNMEASURED';});
  if(chosen.intent.expressiveVersion){
   trace.creative.expressiveVersion=12;
   trace.creative.realization=trace.creative.catalog.filter(row=>row.selected).map(row=>{
    const ab=chosen.ablations.find(a=>a.group===row.group&&a.id===row.id);
    const executed=chosen.checks.some(e=>e.registryDispatchV11?.some(d=>d.group===row.group&&d.id===row.id));
    return {group:row.group,id:row.id,registered:true,candidate:row.eligible,canvasCompared:row.probed,selected:true,rendererExecuted:executed,visible:ab?.status==='MEASURED'?ab.pixelDifference>1e-6:null,acousticFit:chosen.dimensions.acousticFit??null,mp4:'UNVERIFIED',source:ab?'same-time role removal':'UNMEASURED'};
   });
  }
  trace.creative.counts.selected=trace.creative.catalog.filter(x=>x.selected).length;
  trace.reason=`曲固有の変化要求 ${chosen.intent.changeDemand.toFixed(2)}・文字密度 ${chosen.intent.density.toFixed(2)}・反復 ${chosen.intent.repeat.length}件を根拠に探索。実Canvasの登場／保持／退場と除去対照で確認。意味理解は未測定・芸術評価は未検証`;
 }
};
const integrity=J.selectionIntegrityV9;J.selectionIntegrityV9=(p,a)=>{
 const result=integrity(p,a);if(!J.isSongDerivedV11(p)||p.songNativeDirection?.status!=='SELECTED')return result;
 for(const e of p.songNativeDirection.selection?.entries||[])if(!e.phaseEvidence?.some(v=>v.temporalStage==='HOLD'&&v.readable===true))result.errors.push('V11_MISSING_READABLE_HOLD_'+e.line);
 return {...result,ok:result.errors.length===0,status:result.errors.length?'STALE':result.status};
};
const measure=J.measureJizuraDirectionV8;J.measureJizuraDirectionV8=(p,frames=[],range)=>{
 const result=measure(p,frames,range);if(!J.isSongDerivedV11(p))return result;
 result.optimizerVersion=11;
 const holds=frames.filter(f=>f.temporalStage==='HOLD');
 const readable=holds.map(f=>({...f,readable:f.fullReadable}));
 const holdMetrics=measure(p,readable,range).metrics;
 result.metrics.typography=holdMetrics.typography;result.metrics.lyricVisibility=holdMetrics.lyricVisibility;
 result.metrics.temporalSafety={status:frames.length?'MEASURED':'UNMEASURED',score:null,evidence:frames.map(f=>({time:f.time,line:f.line,stage:f.temporalStage,safe:f.readable,fullReadable:f.fullReadable})),source:'bounded entry/exit safety and strictly readable holds are separate'};
 result.artisticQuality='UNVERIFIED';return result;
};
const describe=J.describeJizuraDirectionV8;J.describeJizuraDirectionV8=(p,c)=>{
 const d=describe(p,c);if(!d||!J.isSongDerivedV11(p))return d;const t=p.songNativeDirection.selection?.traces.find(x=>x.line===c.line),e=t?.creative;
 return {...d,reason:t?.reason||'未測定',comparison:e?`登録 ${e.counts.registered}／実行可能 ${e.counts.callable}／入力適合 ${e.counts.eligible}／描画 ${e.counts.probed}／安全観測 ${e.counts.safe}、複合 ${e.compared}案`:'未測定',canvas:e?`${e.ablations.length}除去対照・時間軸Canvas確認。芸術品質／意味理解／符号化後の技法別効果は未検証`:'未測定'};
};
})();
