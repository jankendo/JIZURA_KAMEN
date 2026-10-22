/* Song-causal composition search v7. Numerical starts, bounded local search,
   renderer trajectories and paired raster observations; no style recipes. */
(()=>{'use strict';
const J=window.J,C=J.clamp,F=Number.isFinite,copy=J.clonePhotoRenderPlan;
const active=p=>(p?.songNativeDirection||p?.artDirection?.songNativeDirection)?.version===7;
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const abort=s=>{if(s?.aborted)throw new DOMException('Aborted','AbortError');};
const hash=x=>{const s=J.canonicalJSON(x);let a=2166136261,b=3339675911;for(let i=0;i<s.length;i++){a=Math.imul(a^s.charCodeAt(i),16777619)>>>0;b=Math.imul(b^s.charCodeAt(i),2246822519)>>>0;}return `${s.length}:${a}:${b}`;};
// Generated decisions and diagnostics are not source inputs. Keep legacy hashes
// untouched; v7 also binds the measured spectral timeline (not the PCM buffer).
J.songNativeInputIdentityV7=(p,a)=>hash({
 project:Object.fromEntries(Object.entries(p).filter(([k])=>!['artDirection','songNativeDirection','schemaVersion','migratedFromSchema','audioAsset','renderFeedbackRequested','lastPixelQA','lastQualityTarget','exportValidation'].includes(k)&&!k.startsWith('_'))),
 manualArt:p.artDirection?.motionDNA??null,
 audio:{key:J.registrySelectionAudioKey(a),duration:a?.duration,bpm:a?.bpm,energy:Array.from(a?.energy||[]),onset:Array.from(a?.onset||[]),rms:Array.from(a?.rms||[]),rate:a?.energyRate,features:a?.features,source:a?.analysisSource}
});
const locked=(p,c)=>!!(p.songNativeManualPlan||c?.locked||Object.keys(p.directionOverrides7?.[c?.line]||{}).length||p.directorLyricDirectives7?.some(d=>d.line===c?.line)||c?.assetScene?.locked||p.directorSections7?.some(s=>c?.start>=s.from&&c?.start<s.to&&(s.typographyIntent||s.motionIntent)));
const ranges={x:[.28,.72],y:[.28,.72],width:[.5,.84],height:[.26,.5],cameraX:[.18,.82],cameraY:[.18,.82],zoom:[1,1.2],groupSpread:[.16,.44],groupAxis:[0,1],split:[.22,.78],regionMix:[0,.42],regionAxis:[0,1],cropRatio:[.5,1]};
const keys=Object.keys(ranges),norm=(a,b)=>Math.sqrt(mean(keys.map(k=>((a[k]-b[k])/(ranges[k][1]-ranges[k][0]))**2)));
const acoustic=(a,b)=>Math.sqrt(mean(a.map((x,i)=>(x-b[i])**2)));
const as6=d=>({...copy(d),version:6,schemaVersion:6,algorithm:'SONG_NATIVE_ACOUSTIC_TRAJECTORY_V6',rendererCompatibilityId:'kamen-song-grammar-renderer-6'});
const interpolate=(knots,t)=>{
 let lo=0,hi=knots.length-1;while(lo+1<hi){const m=(lo+hi)>>1;if(knots[m].time<=t)lo=m;else hi=m;}
 const a=knots[lo],b=knots[hi],u=C((t-a.time)/Math.max(1e-9,b.time-a.time)),e=u*u*(3-2*u);
 return Object.fromEntries(Object.keys(a.state).map(k=>[k,['groupCount','regionCount'].includes(k)?a.state[k]:J.lerp(a.state[k],b.state[k],e)]));
};
const baseDirection=(p,a,options={})=>{
 const d=J.buildSongVisualGrammarV6(p,a,options);
 Object.assign(d,{version:7,schemaVersion:7,algorithm:'SONG_CAUSAL_COMPOSITION_SEARCH_V7',rendererCompatibilityId:'kamen-song-grammar-renderer-7',sourceIdentity:J.songNativeInputIdentityV7(p,a),seed:p.seed??0});
 // Center a local transition on its measured acoustic time, rather than ending
 // interpolation at that time (v6's peak visual velocity preceded the onset).
 const ks=d.trajectory.knots;
 for(let i=1;i<ks.length-1;i++)if(ks[i].reason==='measured-local-change'&&ks[i-1].reason==='pre-change-hold'){
  const event=ks[i],pre=ks[i-1],half=Math.min((event.time-pre.time)*.5,(ks[i+1].time-event.time)*.45);
  if(half>1e-5){event.acousticTime=event.time;pre.time=event.time-half;event.time+=half;event.transitionStart=pre.time;}
 }
 d.grammar.contractVersion='KAMEN_SONG_CAUSAL_COMPOSITION_V7';return d;
};
const halton=(n,b)=>{let f=1,r=0;while(n>0){f/=b;r+=f*(n%b);n=Math.floor(n/b);}return r;};
const primes=[2,3,5,7,11,13,17,19,23,29,31,37,41];
const imageAt=(p,x,y)=>p.autoPalette?.localMap?J.sampleLocalLuma(p.autoPalette.localMap,x,y,2,2):null;
const costs=(d,targets,p)=>{
 const motion=mean(d.sections.map(s=>s.motionIntensity)),density=mean(d.sections.map(s=>s.lyricDensity)),recurrence=mean(d.structure.relations.map(r=>r.similarity));
 return {music:1+motion,coherence:1+d.grammar.continuity,readability:1+density,structure:1+recurrence};
};
const localCost=(d,targets,p,i,s,w)=>{
 const section=d.sections[i],target=targets[i];let value=norm(s,target)**2*w.music;
 for(const j of [i-1,i+1])if(d.sections[j]){
  const ad=acoustic(d.structure.sections[i].vector,d.structure.sections[j].vector);
  value+=norm(s,d.sections[j].state)**2*(1-ad)*w.coherence*.25;
 }
 for(const r of d.structure.relations)if(r.from===i||r.to===i)value+=norm(s,d.sections[r.from===i?r.to:r.from].state)**2*r.similarity*w.structure*.22;
 const image=imageAt(p,s.x,s.y),darkness=image?.luma??.5;
 // Actual local information/brightness, not split count, drives text placement.
 value+=((image?.detail||0)*w.readability+Math.abs(darkness-.18)*.08)*.8;
 const source=imageAt(p,s.cameraX,s.cameraY),cropEdge=imageAt(p,C(s.cameraX+(s.split-.5)*s.cropRatio),C(s.cameraY+(s.regionAxis-.5)*s.cropRatio));
 // Favor crops with useful information away from the lyric region. Dense source
 // edges under text increase the cost; splitting is charged for visible detail.
 value+=(source?.detail||0)*s.regionMix*s.width*w.readability*.15;
 value+=(cropEdge?.detail||0)*s.regionMix*(1-s.cropRatio)*.12;
 value+=s.regionMix**2*(image?.detail||0)*(1-section.motionIntensity)*.2;
 value+=Math.max(0,Math.abs(s.x-.5)+s.groupSpread*(1-s.groupAxis)*.18-.37)**2*40;
 value+=Math.max(0,Math.abs(s.y-.5)+s.groupSpread*.5-.38)**2*40;
 if(section.quietIntent)value+=s.regionMix**2+s.motion**2;
 return value;
};
const attachMotions=d=>{
 d.motions=d.lyrics.map(l=>{
  const s=d.sections.find(s=>l.start>=s.start&&l.start<s.end)||d.sections.at(-1),ks=d.trajectory.knots.filter(k=>k.time>=l.start&&k.time<=l.end),dur=l.end-l.start;
  const around=t=>{const k=d.trajectory.knots.reduce((best,k)=>Math.abs((k.acousticTime??k.time)-t)<Math.abs((best.acousticTime??best.time)-t)?k:best);return k.reason==='measured-local-change'?k.importance:0;};
  const entry=s.quietIntent?0:C(around(l.start)+s.transition.importance*.3),exit=s.quietIntent?0:C(around(l.end));
  const v=d.structure.sections[d.sections.indexOf(s)].vector,dx=(v[2]-v[3])*entry*.035,dy=(v[5]-v[0])*entry*.025;
  const inEnd=Math.min(l.end,l.start+Math.min(dur*.22,.12+entry*.3)),outStart=Math.max(inEnd,l.end-Math.min(dur*.18,.12+exit*.25));
  const points=[{time:l.start,state:{dx,dy,scale:1-entry*.035,opacity:1}},{time:inEnd,state:{dx:0,dy:0,scale:1,opacity:1}},{time:outStart,state:{dx:0,dy:0,scale:1,opacity:1}},{time:l.end,state:{dx:-dx*exit,dy:dy*exit,scale:1-exit*.025,opacity:1}}];
  const knots=points.filter((k,i)=>!i||k.time>points[i-1].time);
  return {version:7,line:l.line,start:l.start,end:l.end,knots,entryEnd:inEnd,exitStart:outStart,evidence:{sectionStart:s.start,quiet:s.quietIntent,entryImportance:entry,exitImportance:exit,acousticKnots:ks.filter(k=>k.reason==='measured-local-change').map(k=>k.acousticTime??k.time),repeatFrom:s.repeatFrom,source:'measured acoustic neighborhood + LRC duration + optimized section state'}};
 });return d;
};
const motionAt=(d,t)=>{const m=d.motions?.find(m=>m.start<=t&&m.end>t);return m?interpolate(m.knots,t):{dx:0,dy:0,scale:1,opacity:1};};
const objectives=(d,targets,p,w)=>{
 const errors=d.sections.map((s,i)=>localCost(d,targets,p,i,s.state,w)),changes=d.trajectory.knots.slice(1).map((k,i)=>({amount:norm(k.state,d.trajectory.knots[i].state),importance:k.importance,reason:k.reason}));
 const repetitions=d.structure.relations.map(r=>norm(d.sections[r.from].state,d.sections[r.to].state));
 return {musicFit:d.structure.status==='UNMEASURED'?null:1-C(mean(d.sections.map((s,i)=>norm(s.state,targets[i])))),structuralFit:repetitions.length?1-C(mean(repetitions)):null,visualCoherence:1-C(mean(changes.map(x=>x.amount))),compositionNovelty:null,readability:1-C(mean(d.sections.map(s=>imageAt(p,s.state.x,s.state.y)?.detail||0))),excessMotionPenalty:mean(changes.map(x=>Math.max(0,x.amount-x.importance))),cost:mean(errors)};
};
const signature=d=>d.trajectory.knots.map(k=>keys.map(key=>k.state[key]));
const separation=(a,b)=>Math.sqrt(mean(a.flatMap((row,i)=>row.map((x,j)=>((x-b[i][j])/(ranges[keys[j]][1]-ranges[keys[j]][0]))**2))));
J.distinctSongCompositionsV7=(candidates,minimum=.018)=>{const accepted=[];for(const c of candidates)if(!accepted.some(a=>separation(signature(a.direction),signature(c.direction))<minimum))accepted.push(c);return accepted;};
let poolCache=null;
const generatePool=(p,a,options={},source=null)=>{
 const identity=J.songNativeInputIdentityV7(p,a);
 if(!source&&poolCache?.identity===identity)return copy(poolCache.candidates);
 const base=source?copy(source):baseDirection(p,a,options),targets=base.sections.map(s=>copy(s.state)),w=costs(base,targets,p);
 const budget=Math.min(8,Math.max(3,Math.floor(1600/Math.max(200,base.trajectory.knots.length)))),candidates=[];
 const seed=Number.parseInt(hash(p.seed??base.seed??0).split(':')[1],10)%997;
 for(let n=0;n<budget;n++){
  abort(options.signal);const d=copy(base);delete d.optimization;
  for(let i=0;i<d.sections.length;i++)for(let j=0;j<keys.length;j++){
   const key=keys[j],[lo,hi]=ranges[key],v=d.structure.sections[i].vector;
   // Low-discrepancy points explore numeric space. Spectral variation controls
   // available displacement; these are never completed compositions or modes.
   const extent=.12+acoustic(v,Array(12).fill(mean(v)))*.3;
   d.sections[i].state[key]=C(targets[i][key]+(n?(halton(seed+n*17+i,primes[j])-.5)*(hi-lo)*extent*2:0),lo,hi);
  }
  for(let sweep=0;sweep<3;sweep++)for(let i=0;i<d.sections.length;i++){
   abort(options.signal);const s=d.sections[i].state;
   for(const key of keys){const [lo,hi]=ranges[key],old=s[key],step=(hi-lo)*.018/(sweep+1);let best=old,bestCost=localCost(d,targets,p,i,s,w);
    for(const sign of [-1,1]){s[key]=C(old+sign*step,lo,hi);const cost=localCost(d,targets,p,i,s,w);if(cost<bestCost){best=s[key];bestCost=cost;}}s[key]=best;
   }
  }
  for(const knot of d.trajectory.knots){const i=d.sections.findIndex(s=>knot.time>=s.start&&knot.time<s.end),index=i<0?d.sections.length-1:i;
   for(const key of keys)knot.state[key]=C(knot.state[key]+d.sections[index].state[key]-targets[index][key],...ranges[key]);
  }
  // Preserve a sustained hold across all knots in a silent section.
  for(const s of d.sections.filter(s=>s.quietIntent)){const k=d.trajectory.knots.find(k=>k.time>=s.start);for(const knot of d.trajectory.knots.filter(k=>k.time>=s.start&&k.time<=s.end))knot.state={...k.state,motion:0};}
  attachMotions(d);const o=objectives(d,targets,p,w),candidate={id:`v7-${n}-${hash(signature(d))}`,direction:d,objectives:o,numericSafe:J.validSongNativeDirection(d)};
  candidates.push(candidate);
 }
 const distinct=J.distinctSongCompositionsV7(candidates);
 for(const c of distinct)c.objectives.compositionNovelty=distinct.length>1?Math.min(...distinct.filter(x=>x!==c).map(x=>separation(signature(c.direction),signature(x.direction)))):null;
 for(const c of distinct)c.generation={attempted:budget,distinct:distinct.length,duplicates:budget-distinct.length,reason:distinct.length===1?'only one distinct feasible numeric basin':'distinct constrained numerical solutions',weights:w};
 if(!source)poolCache={identity,candidates:copy(distinct)};return distinct;
};
const valid=J.validSongNativeDirection;
J.validSongNativeDirection=d=>d?.version!==7?valid(d):!!(d.schemaVersion===7&&d.algorithm==='SONG_CAUSAL_COMPOSITION_SEARCH_V7'&&d.rendererCompatibilityId==='kamen-song-grammar-renderer-7'&&valid(as6(d))&&Array.isArray(d.motions)&&d.motions.length===d.lyrics.length&&d.motions.every((m,i)=>m.version===7&&m.line===d.lyrics[i].line&&m.start===d.lyrics[i].start&&m.end===d.lyrics[i].end&&m.knots.length>=2&&m.knots.length<=4&&m.knots[0].time===m.start&&m.knots.at(-1).time===m.end&&m.knots.every((k,i)=>F(k.time)&&(!i||k.time>m.knots[i-1].time)&&F(k.state.dx)&&Math.abs(k.state.dx)<=.05&&F(k.state.dy)&&Math.abs(k.state.dy)<=.05&&F(k.state.scale)&&k.state.scale>=.9&&k.state.scale<=1.1&&F(k.state.opacity)&&k.state.opacity>=.9&&k.state.opacity<=1)));
J.buildSongCausalCompositionV7=(p,a,options={})=>attachMotions(baseDirection(p,a,options));
const build=J.buildSongNativeDirection;J.buildSongNativeDirection=(p,a)=>active(p)?J.buildSongCausalCompositionV7(p,a):build(p,a);
const proposal=(p,d)=>({songNativeDirector:7,style:p.style,mood:p.mood,fx:{...p.fx,hud:'off'},enabled:copy(p.enabled),seed:p.seed,overrides:copy(p.overrides||{}),summary:'曲・歌詞・画像から探索した構図 v7',signals:{image:!!p.autoPalette?.analyzed,audio:true,lyricLines:d.lyrics.length},grammarDirection:d});
J.generateSongCausalCompositionV7=async(p,a,options={})=>{
 const identity=J.songNativeInputIdentityV7(p,a),pool=generatePool(p,a,options);await new Promise(r=>setTimeout(r,0));abort(options.signal);
 if(identity!==J.songNativeInputIdentityV7(p,a))throw Error('INPUT_CHANGED_DURING_GRAMMAR');
 const candidates=pool.filter(c=>c.numericSafe).sort((a,b)=>a.objectives.cost-b.objectives.cost).map(c=>({id:c.id,proposal:proposal(p,c.direction),objectives:c.objectives}));
 if(!candidates.length)throw Error('V7_NO_NUMERICALLY_SAFE_COMPOSITION');
 options.onProgress?.({label:`${pool.length}件の異なる数値構図を生成しました`});return {recommended:candidates[0],candidates};
};
const make=J.makeArtDirection;J.makeArtDirection=(p,a,pr)=>{
 if(pr.songNativeDirector!==7)return make(p,a,pr);
 const saved=pr.grammarDirection,d=J.validSongNativeDirection(saved)&&saved.sourceIdentity===J.songNativeInputIdentityV7(p,a)?copy(saved):J.buildSongCausalCompositionV7(p,a);
 const adapter=copy(p);if(adapter.artDirection?.songNativeDirection)adapter.artDirection.songNativeDirection=as6(d);
 const compatibility=as6(d);compatibility.sourceIdentity=J.songNativeInputIdentity(adapter,a);
 const art=make(adapter,a,{...pr,songNativeDirector:6,grammarDirection:compatibility});art.songNativeDirection=d;art.vocabulary.layout=art.layoutLanguage=['songGrammarV7'];return art;
};
const installMotions=p=>{for(const c of p.cuts||[])if(c.line>=0&&!locked(p,c)){c.layout='songGrammarV7';c.generatedMotionV7=copy(p.songNativeDirection.motions.find(m=>m.line===c.line));}return p;};
const plan=J.plan;J.plan=(p,a)=>{
 if(!active(p))return plan(p,a);
 const saved=p.artDirection.songNativeDirection,identity=J.songNativeInputIdentityV7(p,a),d=J.validSongNativeDirection(saved)&&saved.sourceIdentity===identity?copy(saved):J.buildSongCausalCompositionV7(p,a);
 const adapter=copy(p);adapter.artDirection.songNativeDirection=as6(d);delete adapter.artDirection.songNativeResolved;
 adapter.artDirection.songNativeDirection.sourceIdentity=J.songNativeInputIdentity(adapter,a);
 const result=plan(adapter,a);result.songNativeDirection=d;result.artDirection={...result.artDirection,...copy(p.artDirection),songNativeDirection:d};result.songNativePlanInputIdentity=identity;
 installMotions(result);return J.restoreSongNativeResolved(p,a,result);
};
const stateAt=J.songGrammarStateAt;J.songGrammarStateAt=(p,t)=>active(p)?interpolate(p.songNativeDirection.trajectory.knots,t):stateAt(p,t);
J.songCompositionStateV7=(p,t)=>{const s=J.songGrammarStateAt(p,t),m=motionAt(p.songNativeDirection,t);return {...s,x:s.x+m.dx,y:s.y+m.dy,width:s.width*m.scale,height:s.height*m.scale};};
J.LAYOUTS.songGrammarV7={name:'楽曲生成の時間構図 v7',plan:()=>({}),render:env=>{
 const {plan:p,cut:c,W,H}=env,s=J.songCompositionStateV7(p,env.t),motion=c.generatedMotionV7;
 if(!motion)return J.LAYOUTS.songGrammarV6.render(env);
 const groups=J.songGrammarV6Groups(c.lineText||c.text,s,p),font=c.params.font,m=interpolate(motion.knots,env.t);
 for(let i=0;i<groups.length;i++){
  const phase=groups.length===1?0:i/(groups.length-1)-.5,width=W*Math.min(.86,s.width+s.groupAxis*.12),height=groups.length>1?Math.min(H*s.height,H*s.groupSpread/(groups.length-1)*.85):H*s.height;
  const rows=J.semanticLyricLayout(groups[i],{font,size:H*.14,minSize:H*.038,maxWidth:width,maxHeight:height,lead:s.lead,track:s.track,ctx:env.ctx});
  const item={text:rows?.text??groups[i],font,size:Math.max(H*.038,Math.min(H*.16,rows?.size??J.fitSize(groups[i],font,width,height,{lead:s.lead,track:s.track}))*m.scale),x:(s.x+phase*s.groupSpread*(1-s.groupAxis)*.35)*W,y:(s.y+phase*s.groupSpread)*H,lead:s.lead,track:s.track,color:env.sc.fg,noHold:true};
  J.mainDraw(env,J.safeLyricItem(env,item));
 }
}};
// Search the actual plan, after preflight and fonts. Only the best three Stage A
// candidates reach Canvas; no intermediate encode and no image reanalysis.
const search=J.searchSongNativeCandidates;
J.searchSongNativeCandidates=async(p,range,a,options={})=>{
 if(!active(p))return search(p,range,a,options);abort(options.signal);
 const before=await J.cinemaV3.planHash(p),source=copy(p.songNativeDirection);
 // Generation may have preceded preflight settings. Reuse only exactly bound pools.
 const cached=poolCache?.identity===source.sourceIdentity?copy(poolCache.candidates):null;
 const pool=cached||generatePool(p,a,options,source),safe=pool.filter(c=>c.numericSafe),shortlist=safe.sort((a,b)=>a.objectives.cost-b.objectives.cost).slice(0,3);
 const R=new J.Renderer(),cv=document.createElement('canvas'),mask=document.createElement('canvas'),bg=document.createElement('canvas');cv.width=mask.width=bg.width=256;cv.height=mask.height=bg.height=Math.round(256*p.H/p.W);
 const ctx=cv.getContext('2d'),mc=mask.getContext('2d'),bc=bg.getContext('2d'),cuts=p.cuts.filter(c=>c.line>=0&&!locked(p,c)&&c.end>(range?.start??0)&&c.start<(range?.end??p.duration));
 const representatives=cuts.filter((_,i)=>i===0||i===Math.floor(cuts.length/2)||i===cuts.length-1);
 try{
  if(p.customBg?.enabled&&p.customBg.dataUrl)await R.loadCustomBackground(p.customBg.dataUrl);await R.loadAssetDeck?.(p);
  for(const candidate of shortlist){
   abort(options.signal);const trial=copy(p);trial.songNativeDirection=candidate.direction;trial.artDirection.songNativeDirection=candidate.direction;installMotions(trial);
   const observations=[];let safe=true;
   for(const c of representatives){
    const t=Math.max(range?.start??0,c.start)+Math.min(.2,(Math.min(range?.end??p.duration,c.end)-Math.max(range?.start??0,c.start))*.5),items=[],glyph=[],draw=J.drawItem;
    J.drawItem=(env,it)=>{if(env.pass==='main'&&env.cut.line>=0)glyph.push(J.selectionGlyphEvidence(env,it).readable);return draw(env,it);};
    try{R.frame(ctx,trial,t,{scale:cv.width/p.W,production:true,noHud:true,lyricAuditCtx:mc,lyricAuditItems:items});}finally{J.drawItem=draw;}
    const ink=mc.getImageData(0,0,cv.width,cv.height).data,pixels=ctx.getImageData(0,0,cv.width,cv.height).data,geometry=J.selectionPixelEvidence(pixels,ink,cv.width,cv.height,items.map(i=>i.bounds).filter(Boolean),p.W,p.H),features=J.observePixelFrame(pixels,cv.width,cv.height,ink);
    const readable=geometry.safe&&geometry.ink>0&&glyph.length>0&&glyph.every(Boolean);safe&&=readable;
    let backgroundObservation=null;
    if(R.customBgBitmap){bc.setTransform(1,0,0,1,0,0);bc.clearRect(0,0,bg.width,bg.height);bc.save();bc.scale(bg.width/p.W,bg.width/p.W);try{R.drawCustomBackground(bc,trial,t,t,0,{},bg.width/p.W,true);}finally{bc.restore();}const f=J.observePixelFrame(bc.getImageData(0,0,bg.width,bg.height).data,bg.width,bg.height);backgroundObservation={texture:f.texture,lumaMean:mean(f.luma),source:'ISOLATED_SOURCE_IMAGE_CANVAS'};}
    const s=J.songCompositionStateV7(trial,t);observations.push({time:t,readable,center:features.center,bbox:features.bbox,spread:features.spread,placementError:Math.hypot(features.center[0]-s.x,features.center[1]-s.y),background:backgroundObservation??{status:'NOT_APPLICABLE'},regions:J.songBackgroundRegionsV6(trial,s,R.customBgBitmap)});
   }
   candidate.canvas={status:observations.length?'OBSERVED_GLYPH_MASK':'NOT_APPLICABLE',safe,frames:observations,readability:observations.length?mean(observations.map(r=>Number(r.readable))):null,realization:observations.length?1-C(mean(observations.map(r=>r.placementError))/.25):null};
   options.onProgress?.({label:'候補の構図と文字の実Canvasを比較しています'});await new Promise(r=>setTimeout(r,0));
  }
 }finally{R.disposeAssets?.();cv.width=cv.height=mask.width=mask.height=bg.width=bg.height=1;}
 abort(options.signal);if(await J.cinemaV3.planHash(p)!==before)throw Error('INPUT_CHANGED_DURING_SEARCH');
 const feasible=shortlist.filter(c=>c.canvas?.safe),w=pool[0]?.generation.weights||{music:1,coherence:1,structure:1,readability:1};
 for(const c of feasible){const o=c.objectives;c.utility=o.musicFit*w.music+(o.structuralFit??0)*w.structure+o.visualCoherence*w.coherence+(c.canvas.realization??0)+(c.canvas.readability??0)*w.readability+Math.min(o.compositionNovelty??0,mean(source.structure.novelty.map(n=>n.value)))-o.excessMotionPenalty;}
 const chosen=feasible.sort((a,b)=>b.utility-a.utility||a.id.localeCompare(b.id))[0];if(!chosen)throw Error('V7_NO_READABLE_COMPOSITION');
 const optimization={method:'LOW_DISCREPANCY_MULTISTART_CONSTRAINED_COORDINATE_SEARCH',selectedId:chosen.id,candidateCount:pool.length,attemptedCount:pool[0]?.generation.attempted??pool.length,duplicateCount:pool[0]?.generation.duplicates??0,numericSafeCount:safe.length,canvasComparedCount:shortlist.filter(c=>c.canvas?.frames.length).length,canvasSafeCount:feasible.length,reason:pool[0]?.generation.reason,weights:w,objectives:chosen.objectives,canvas:chosen.canvas.frames.length?'OBSERVED_GLYPH_MASK':'NOT_APPLICABLE_LOCKED_OR_EMPTY',representativeFrames:shortlist.reduce((s,c)=>s+(c.canvas?.frames.length||0),0),candidates:pool.map(c=>({id:c.id,numericSafe:c.numericSafe,objectives:c.objectives,utility:c.utility??null,canvas:c.canvas??{status:'NOT_OBSERVED'}})),artisticQuality:'UNVERIFIED'};
 p.songNativeDirection=copy(chosen.direction);p.songNativeDirection.optimization=optimization;p.artDirection.songNativeDirection=p.songNativeDirection;installMotions(p);J.cinemaV3.invalidate(p);return p;
};
// Reference compositor evaluates the saved numeric contract independently of
// the production background dispatch. It measures plan realization, not taste.
J.referenceSongBackgroundV7=(image,p,t,ctx,w,h)=>{
 if(!active(p)||!image?.width||locked(p,J.cutAt(p,t)||{}))return null;
 const s=J.songGrammarStateAt(p,t),cfg=p.customBg||{},rect=J.customBgGeometry(image.width,image.height,p.W,p.H,cfg);if(!rect)return null;
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);ctx.save();ctx.scale(w/p.W,w/p.W);
 ctx.save();ctx.translate(p.W/2+(.5-s.cameraX)*p.W*.35,p.H/2+(.5-s.cameraY)*p.H*.35);ctx.scale(s.zoom,s.zoom);ctx.translate(-p.W/2,-p.H/2);
 if(rect.blur>0)ctx.filter=`blur(${(rect.blur*w/p.W).toFixed(1)}px)`;
 ctx.drawImage(image,rect.x,rect.y,rect.w,rect.h);ctx.restore();
 if(cfg.darkness){ctx.save();ctx.globalAlpha=C(+cfg.darkness||0,0,.8);ctx.fillStyle='#000';ctx.fillRect(0,0,p.W,p.H);ctx.restore();}
 for(const [i,[x,y,width,height]] of J.songBackgroundRegionsV6(p,s,image).entries()){
  const factor=Math.max(width/image.width,height/image.height)/s.cropRatio,sw=width/factor,sh=height/factor;
  const sx=C(s.cameraX+(i-.5)*s.layerX*4)*(image.width-sw),sy=C(s.cameraY+(i-.5)*s.layerY*4)*(image.height-sh);
  ctx.save();ctx.globalAlpha=s.regionMix;ctx.beginPath();ctx.rect(x,y,width,height);ctx.clip();ctx.drawImage(image,sx,sy,sw,sh,x,y,width,height);ctx.restore();
 }
 ctx.restore();return J.observePixelFrame(ctx.getImageData(0,0,w,h).data,w,h);
};
// Reserve complete event triplets. Never count a half-sampled event as covered.
J.selectSongGrammarObservationTimesV7=(p,range)=>{
 const from=range?.start??0,to=range?.end??p.duration,last=to-Math.min(1/(p.fps||30),(to-from)/10),selected=new Set();
 const add=t=>{if(F(t)&&t>=from&&t<=last)selected.add(t);};
 for(const t of [from,from+.04,last,last-.2,last-.5,Math.min(last,from+3)])add(t);
 const first=p.lines.find(l=>l.end>from&&l.start<to);if(first)for(const t of [Math.max(from,first.start)+.04,Math.max(from,first.start)+.18])add(t);
 const events=p.songNativeDirection.trajectory.knots.filter(k=>k.reason==='measured-local-change'&&k.transitionStart>=from&&k.time<=last).sort((a,b)=>b.importance-a.importance);
 for(const e of events){const group=[e.transitionStart,e.acousticTime,e.time];if(selected.size+group.filter(t=>!selected.has(t)).length>48)continue;group.forEach(add);}
 for(const s of p.songNativeDirection.sections.filter(s=>s.quietIntent))for(const u of [.25,.75])if(selected.size<56)add(s.start+(s.end-s.start)*u);
 for(const t of J.selectSongGrammarObservationTimesV6(p,range))if(selected.size<64)add(t);
 return [...selected].sort((a,b)=>a-b);
};
J.refineSongGrammarQualityV7=(p,rows,pairs,metrics,range)=>{
 J.refineSongGrammarQualityV6(p,rows,pairs,metrics,range);
 const measured=(values,evidence,source)=>({status:values.length?'MEASURED':'UNMEASURED',score:values.length?Math.round(100*C(mean(values))):null,evidence,source,contractVersion:'kamen-song-composition-quality-7'});
 const sameLine=(a,b)=>p.lines.find(l=>l.start<=a&&l.end>a)?.index===p.lines.find(l=>l.start<=b&&l.end>b)?.index;
 const geometry=s=>{const camera={scale:s.zoom,dx:(.5-s.cameraX)*.35,dy:(.5-s.cameraY)*.35};return [(s.x-.5)*camera.scale+.5+camera.dx,(s.y-.5)*camera.scale+.5+camera.dy];};
 const comparisons=pairs.map(r=>{
  const a=rows.find(f=>f.time===r.from),b=rows.find(f=>f.time===r.to),x=geometry(J.songCompositionStateV7(p,r.from)),y=geometry(J.songCompositionStateV7(p,r.to));
  const expected=[y[0]-x[0],y[1]-x[1]],observed=[b.features.center[0]-a.features.center[0],b.features.center[1]-a.features.center[1]],covered=sameLine(r.from,r.to)&&a.features.area>0&&b.features.area>0&&a.features.foregroundSource==='raster-mask'&&b.features.foregroundSource==='raster-mask';
  const error=Math.hypot(observed[0]-expected[0],observed[1]-expected[1]),magnitude=Math.hypot(...expected),actual=Math.hypot(...observed);
  return {...r,covered,expectedVector:expected,observedVector:observed,expected:magnitude,actual,error,score:magnitude>1e-5?C(1-error/magnitude)*C(actual/magnitude):C(1-actual/.025)};
 });
 const available=comparisons.filter(r=>r.covered);
 metrics.density=measured(available.filter(r=>r.duration<=.55).map(r=>r.score),available,'same-unit projected and observed geometry');
 metrics.continuity=measured(available.filter(r=>r.duration<=.55).map(r=>1-C(Math.max(0,r.actual-r.expected))),available,'observed excess projected displacement');
 metrics.world=metrics.realization=measured(available.map(r=>r.score),comparisons,'same-unit projected glyph centroid displacement; camera included');
 const from=range?.start??0,to=range?.end??p.duration;
 const events=p.songNativeDirection.trajectory.knots.filter(k=>k.reason==='measured-local-change'&&(k.acousticTime??k.time)>from&&(k.acousticTime??k.time)<to);
 const timing=events.map(e=>{
  const start=e.transitionStart,end=e.time,acoustic=e.acousticTime??e.time,local=available.filter(r=>r.from>=start-1e-7&&r.to<=end+1e-7),covered=local.length>0&&Math.abs(local[0].from-start)<1e-7&&Math.abs(local.at(-1).to-end)<1e-7;
  const strongest=[...local].sort((a,b)=>b.actual/Math.max(1e-9,b.duration)-a.actual/Math.max(1e-9,a.duration))[0],observedTime=strongest?(strongest.from+strongest.to)/2:null;
  return {acousticTime:acoustic,plannedTime:(start+end)/2,observationWindow:[start,end],observedTime,frameIntervals:local.map(r=>[r.from,r.to]),observedChange:local.reduce((s,r)=>s+r.actual,0),expectedChange:local.reduce((s,r)=>s+r.expected,0),covered,score:covered&&local.some(r=>r.expected>1e-5)?mean(local.filter(r=>r.expected>1e-5).map(r=>r.score)):null,classification:!covered?'INSUFFICIENT_PAIRED_COVERAGE':local.every(r=>r.expected<1e-5)?'GEOMETRY_HOLD_OTHER_OPERATORS_UNMEASURED':local.some(r=>r.actual>0)?'OBSERVED_GEOMETRY_RESPONSE':'MISSING_VISUAL_RESPONSE'};
 });
 metrics.temporal=measured(timing.filter(r=>r.covered&&r.expectedChange>1e-5).map(r=>r.score),[{coverage:events.length?timing.filter(r=>r.covered).length/events.length:null,events:timing}],'paired acoustic-centered Canvas windows; unobserved events excluded and reported');
 if(!events.length)metrics.temporal=measured(available.map(r=>r.score),comparisons,'measured acoustic hold and Canvas geometry');
 // Background composition is reference raster realization, independent of pixel
 // novelty and musical merit. No normalized coordinates/pixels ratio.
 const backgroundRows=rows.filter(r=>r.backgroundFeatures?.luma?.length&&r.backgroundReference?.luma?.length===r.backgroundFeatures.luma.length),bgEvidence=backgroundRows.map(r=>({time:r.time,sourceTexture:r.backgroundFeatures.texture,observedLuma:r.backgroundFeatures.luma,referenceLuma:r.backgroundReference.luma,error:mean(r.backgroundFeatures.luma.map((v,i)=>Math.abs(v-r.backgroundReference.luma[i]))),status:'RASTER_REFERENCE_COMPARISON'}));
 metrics.background=p.customBg?.enabled?measured(bgEvidence.map(r=>1-r.error),bgEvidence,'same-unit isolated background raster vs saved numeric region/crop contract; artistic merit unverified'): {status:'NOT_APPLICABLE',score:null,evidence:[]};
 const cameraRows=rows.filter(r=>F(r.cameraReferenceEffect)&&F(r.cameraEffect)&&(r.cameraExpected<=.0001||r.cameraReferenceEffect>0));
 metrics.camera=measured(cameraRows.map(r=>1-Math.abs(r.cameraEffect-r.cameraReferenceEffect)),cameraRows.map(r=>({time:r.time,actualCausalPixelDelta:r.cameraEffect,expectedCausalPixelDelta:r.cameraReferenceEffect})),'same-unit production and reference camera-only raster ablation');
 metrics.backgroundRelation=measured(rows.filter(r=>typeof r.readable==='boolean').map(r=>Number(r.readable)),rows.filter(r=>typeof r.readable==='boolean').map(r=>({time:r.time,readable:r.readable})),'actual glyph/background contrast and safe bounds');
 metrics.backgroundMusicFit=measured([],timing,'image-dependent raster displacement has no calibrated acoustic magnitude target');
 return {contractVersion:'kamen-song-composition-quality-7',comparisons};
};
const snapshot=J.songNativeFixSnapshot;J.songNativeFixSnapshot=(q,a,p)=>({...snapshot(q,a,p),compositionV7:active(p)?copy(p.songNativeDirection):null});
const reapply=J.reapplySongNativeSelection;J.reapplySongNativeSelection=(before,q,a,p,impact)=>{
 const reused=reapply(before,q,a,p,impact);if(reused&&active(p)&&before.compositionV7){const identity=p.songNativeDirection.sourceIdentity;p.songNativeDirection={...copy(before.compositionV7),sourceIdentity:identity};p.artDirection.songNativeDirection=p.songNativeDirection;installMotions(p);J.cinemaV3.invalidate(p);}return reused;
};
J.describeSongCompositionV7=(p,c)=>{
 if(!active(p)||!c?.generatedMotionV7)return null;
 const m=c.generatedMotionV7,d=p.songNativeDirection,o=d.optimization;
 const sampleTimes=[c.start,m.entryEnd,m.exitStart,c.end-1e-6,...d.trajectory.knots.filter(k=>k.time>c.start&&k.time<c.end).map(k=>k.time)];
 const states=sampleTimes.map(t=>J.songCompositionStateV7(p,t)),middle=J.songCompositionStateV7(p,(c.start+c.end)/2);
 const changing=(from,to)=>{const samples=[from,to,...sampleTimes.filter(t=>t>from&&t<to)].map(t=>J.songCompositionStateV7(p,Math.min(t,c.end-1e-6)));return samples.some(s=>norm(s,samples[0])>1e-5);};
 return {groups:J.songGrammarV6Groups(c.lineText||c.text,middle,p).length,entry:changing(m.start,m.entryEnd)?'数値軌道':'即時表示',hold:changing(m.entryEnd,m.exitStart)?'生成軌道':'静止',exit:changing(m.exitStart,m.end)?'数値軌道':'表示終了',camera:states.some(s=>Math.hypot(s.cameraX-states[0].cameraX,s.cameraY-states[0].cameraY)+Math.abs(s.zoom-states[0].zoom)>1e-6)?'生成軌道':'静止',background:p.customBg?.enabled?`${middle.regionCount}領域`:'画像なし',repeat:m.evidence.repeatFrom,selection:o?`${o.candidateCount}候補・採用 ${o.selectedId}・Canvas ${o.canvasComparedCount}案比較（${o.canvasSafeCount}案適合）・音楽/反復/可読性/過剰運動の比較`: '数値生成済み・Canvas比較前'};
};
})();
