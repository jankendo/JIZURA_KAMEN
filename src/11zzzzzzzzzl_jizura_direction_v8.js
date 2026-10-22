/* Song-native v8: registry components, input-bound phase probes and a bounded
   rendered storyboard. Older directions always use their original dispatch. */
(()=>{'use strict';
const J=window.J,C=J.clamp,copy=J.clonePhotoRenderPlan,F=Number.isFinite;
const active=p=>(p?.songNativeDirection||p?.artDirection?.songNativeDirection)?.version===8|| (p?.songNativeDirection||p?.artDirection?.songNativeDirection)?.version===9;
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const norm=s=>String(s||'').replace(/\s/g,'');
const abort=s=>{if(s?.aborted)throw new DOMException('Aborted','AbortError');};
const yieldUI=()=>new Promise(r=>setTimeout(r,0));
const locked=(p,c)=>!!(p.songNativeManualPlan||c?.locked||p.overrides?.[c.line]?.lock||Object.keys(p.directionOverrides7?.[c.line]||{}).length||p.directorLyricDirectives7?.some(d=>d.line===c.line)||c.assetScene?.locked||p.directorSections7?.some(s=>c.start>=s.from&&c.start<s.to&&(s.typographyIntent||s.motionIntent)));
J.songNativeLockedV8=locked;
const as7=d=>({...copy(d),version:7,schemaVersion:7,algorithm:'SONG_CAUSAL_COMPOSITION_SEARCH_V7',rendererCompatibilityId:'kamen-song-grammar-renderer-7'});
J.buildJizuraDirectionV8=(p,a,options={})=>{
 const d=J.buildSongCausalCompositionV7(p,a,options);
 Object.assign(d,{version:8,schemaVersion:8,algorithm:'SONG_NATIVE_REGISTRY_STORYBOARD_V8',rendererCompatibilityId:'kamen-song-grammar-renderer-8',sourceIdentity:J.songNativeInputIdentityV7(p,a),selection:null});
 // v7 motion is retained as analysis provenance; it is never attached to v8 cuts.
 return d;
};
const valid=J.validSongNativeDirection;
J.validSongNativeDirection=d=>d?.version!==8?valid(d):!!(d.schemaVersion===8&&d.algorithm==='SONG_NATIVE_REGISTRY_STORYBOARD_V8'&&d.rendererCompatibilityId==='kamen-song-grammar-renderer-8'&&valid(as7(d))&&(!d.selection||d.selection.version===8&&Array.isArray(d.selection.entries)&&d.selection.entries.every(e=>e.cut&&J.STYLES[e.cut.styleKey]&&['layout','enter','hold','exit','cam'].every(g=>J.registry(g)[e.cut[g]])&&e.cut.start>=0&&e.cut.end>e.cut.start&&e.cut.end<=d.duration)));
const build=J.buildSongNativeDirection;J.buildSongNativeDirection=(p,a)=>active(p)?J.buildJizuraDirectionV8(p,a):build(p,a);
J.generateJizuraDirectionV8=async(p,a,options={})=>{
 abort(options.signal);const identity=J.songNativeInputIdentityV7(p,a),d=J.buildJizuraDirectionV8(p,a,options);await yieldUI();abort(options.signal);
 if(identity!==J.songNativeInputIdentityV7(p,a))throw Error('INPUT_CHANGED_DURING_GRAMMAR');
 const proposal={songNativeDirector:8,style:p.style,mood:p.mood,fx:{...p.fx,hud:'off'},enabled:copy(p.enabled),seed:p.seed,overrides:copy(p.overrides||{}),summary:'楽曲・歌詞・背景からJIZURA演出を実描画選択 v8',signals:{image:!!p.autoPalette?.analyzed,audio:true,lyricLines:d.lyrics.length},grammarDirection:d};
 return {recommended:{proposal},candidates:[{proposal}]};
};
const make=J.makeArtDirection;J.makeArtDirection=(p,a,pr)=>{
 if(pr.songNativeDirector!==8)return make(p,a,pr);
 const d=pr.grammarDirection?.version===8&&J.validSongNativeDirection(pr.grammarDirection)&&pr.grammarDirection.sourceIdentity===J.songNativeInputIdentityV7(p,a)?copy(pr.grammarDirection):J.buildJizuraDirectionV8(p,a);
 const adapter=copy(p);delete adapter.songNativeDirection;if(adapter.artDirection)delete adapter.artDirection.songNativeDirection;
 const art=make(adapter,a,{...pr,songNativeDirector:7,grammarDirection:as7(d)});
 art.songNativeDirection=d;art.vocabulary.layout=art.layoutLanguage=Object.keys(J.LAYOUTS).filter(id=>!/^songGrammar|^(title|interlude)$/.test(id));return art;
};
const baselineCut=(p,c)=>{
 const cut=J.registryCandidateCut(p,c,'center',c.params.font||'embedded_bold','cut','still');
 delete cut.generatedMotionV7;delete cut.grammar;delete cut.photoChoreography;
 return {...cut,cam:'stillCamera',bg:'none',decor:[],treat:'none',stagger:0,registrySelectedV8:true};
};
const install=(p,entries)=>{
 const byLine=new Map(entries.map(e=>[e.line,e.cut])),seen=new Set();
 p.cuts=p.cuts.flatMap(c=>{if(c.line<0||locked(p,c))return [c];if(seen.has(c.line))return [];seen.add(c.line);return [copy(byLine.get(c.line)||baselineCut(p,{...c,start:p.lines[c.line].start,end:p.lines[c.line].end,dur:p.lines[c.line].end-p.lines[c.line].start}))];});
 p.cuts.forEach((c,i)=>c.index=i);return p;
};
const plan=J.plan;J.plan=(p,a)=>{
 if(!active(p))return plan(p,a);
 const identity=J.songNativeInputIdentityV7(p,a),saved=p.artDirection.songNativeDirection,d=J.validSongNativeDirection(saved)&&saved.sourceIdentity===identity?copy(saved):(saved?.version===9?J.buildJizuraDirectionV9:J.buildJizuraDirectionV8)(p,a);
 const adapter=copy(p);delete adapter.songNativeDirection;adapter.artDirection.songNativeDirection=as7(d);delete adapter.artDirection.songNativeResolved;
 adapter.artDirection.songNativeDirection.sourceIdentity=J.songNativeInputIdentityV7(adapter,a);
 const result=plan(adapter,a);result.songNativeDirection=d;result.artDirection={...result.artDirection,...copy(p.artDirection),songNativeDirection:d};result.songNativePlanInputIdentity=identity;
 install(result,d.selection?.entries||[]);return J.restoreSongNativeResolved(p,a,result);
};
// One animation owner per role. Registry hold owns local letters; no legacy
// typography/camera modulation or trajectory is layered over an automatic cut.
const typography=J.applyTypography5;J.applyTypography5=(env,it)=>active(env.plan)&&!locked(env.plan,env.cut)?undefined:typography(env,it);
for(const key of ['cameraAt','lyricsCameraAt']){const previous=J[key];J[key]=(p,t,...args)=>active(p)&&!locked(p,J.cutAt(p,t)||{})?null:previous?.(p,t,...args);}
const center=J.centerPhotoLyricItem;J.centerPhotoLyricItem=(env,it)=>active(env.plan)&&!locked(env.plan,env.cut)&&!(env.plan.songNativeDirection.version===9&&env.cut.params.photoAnchor)?it:center(env,it);
// C1 monotone cubic interpolation for consumers of analysis trajectories. Unlike
// smoothstep at every knot, adjacent non-flat spans share their tangent.
J.interpolateSongTrajectoryV8=(knots,t)=>{
 let i=0;while(i<knots.length-2&&knots[i+1].time<t)i++;
 const a=knots[i],b=knots[i+1],h=b.time-a.time,u=C((t-a.time)/h),out={};
 for(const k of Object.keys(a.state)){
  if(['groupCount','regionCount'].includes(k)){out[k]=a.state[k];continue;}
  const slope=j=>(knots[j+1].state[k]-knots[j].state[k])/(knots[j+1].time-knots[j].time);
  const tangent=j=>{if(!j)return slope(0);if(j===knots.length-1)return slope(j-1);const x=slope(j-1),y=slope(j);return x*y<=0?0:2*x*y/(x+y);};
  out[k]=(2*u**3-3*u*u+1)*a.state[k]+(u**3-2*u*u+u)*h*tangent(i)+(-2*u**3+3*u*u)*b.state[k]+(u**3-u*u)*h*tangent(i+1);
 }return out;
};
const state=J.songGrammarStateAt;J.songGrammarStateAt=(p,t)=>active(p)?J.interpolateSongTrajectoryV8(p.songNativeDirection.trajectory.knots,t):state(p,t);
const lineFeatures=(p,a,c)=>{
 const raw=a?.features?.detailedTimeline?.length?a.features.detailedTimeline:a?.features?.timeline||[],rows=raw.filter(r=>r.time>=c.start&&r.time<c.end);
 const values=k=>rows.map(r=>r[k]).filter(F),energyAt=(array)=>{const rate=a?.energyRate||50;return Array.from(array||[]).slice(Math.floor(c.start*rate),Math.ceil(c.end*rate));};
 const energy=values('energy'),onset=values('onset'),flux=values('spectralFlux'),bright=values('brightness');
 const e=energy.length?mean(energy):mean(energyAt(a?.energy)),o=onset.length?mean(onset):mean(energyAt(a?.onset));
 const changes=rows.slice(1).map((r,i)=>mean(['energy','onset','brightness','bass','spectralFlux'].filter(k=>F(r[k])&&F(rows[i][k])).map(k=>Math.abs(r[k]-rows[i][k]))));
 return {energy:C(e),onset:C(o),brightness:bright.length?C(mean(bright)):.5,flux:flux.length?C(mean(flux)):null,change:changes.length?C(Math.max(...changes)):0,status:rows.length?'MEASURED':'UNMEASURED',duration:c.dur,length:J.graphemes(norm(c.lineText)).length};
};
J.songLineFeaturesV8=lineFeatures;
// Capability declarations describe independent existing components, never full
// storyboards. Unknown components remain registered but unmeasured. Final safety
// always comes from this input's complete composed production Canvas frames.
const motion={enter:{cut:0,photoSettle:.14,photoResolve:.20},hold:{still:0,drift:.12,float:.24,sway:.3,breathe:.38,pulse:.6},exit:{cut:0,shrink:.24},cam:{stillCamera:0,push:.1,panL:.18,panR:.18},treat:{none:0,softShadow:.1,outline:.3}};
J.jizuraCatalogV8=()=>Object.fromEntries(['style',...J.GROUP_KEYS].map(g=>[g,Object.entries(g==='style'?J.STYLES:J.registry(g)).map(([id,d])=>({id,registered:true,callable:g==='style'?!!d.schemes?.length:typeof d[g==='layout'?'render':g==='cam'?'get':['bg','decor','trans','fx'].includes(g)?'draw':'apply']==='function'||!!d.builtin,verification:'UNMEASURED',sourceTreeSHA256:window.KAMEN_BUILD_INFO?.sourceTreeSHA256??null}))]));
const effectCandidates=(p,g,target)=>Object.entries(motion[g]).filter(([id])=>J.registry(g)[id]&&J.randomOk(p,g,id)).map(([id,amount])=>({id,amount,score:1-Math.abs(target-amount)})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
const styleCandidates=(p,a,f)=>{
 const lyric={japaneseRatio:/[\u3000-\u9fff]/.test(p.lyrics)?1:0,longRatio:C(f.length/32)},music={...a?.features,bpm:a?.bpm,energy:f.energy,onsetDensity:f.onset,brightness:f.brightness,sectionContrast:f.change};
 const input=J.styleInputProfile(music,p.autoPalette?.stats,lyric);
 return J.scoreStyleProfiles(input,Object.keys(J.STYLES).filter(id=>J.randomOk(p,'style',id))).slice(0,3);
};
const phases=c=>[.001,Math.min(c.dur*.35,Math.max(.2,c.inDur+.08)),c.dur*.7,Math.max(.001,c.dur-.015)].filter((t,i,a)=>t<c.dur&&a.indexOf(t)===i);
const evidence=({mask,raster,...e})=>e;
const selectedEntries=p=>p.cuts.filter(c=>c.registrySelectedV8&&!locked(p,c)).map(c=>({line:c.line,cut:copy(c)}));
J.searchJizuraDirectionV8=async(p,range,a,options={})=>{
 abort(options.signal);const before=await J.cinemaV3.planHash(p),trial=copy(p),cv=document.createElement('canvas'),mask=document.createElement('canvas'),R=new J.Renderer();
 cv.width=mask.width=256;cv.height=mask.height=Math.round(256*p.H/p.W);
 let frames=0;const rawSample=J.createRegistryRenderProbe(trial,R,cv,mask,{production:true,onFrame:()=>frames++}),sample=J.isCreativeOptimizerV10?.(p)?J.createCreativeProbeV10(rawSample,cv):rawSample,portfolios=[],traces=[],styleComparisons=[];
 const cuts=trial.cuts.filter(c=>c.line>=0&&!locked(p,c));
 try{
  if(p.customBg?.enabled&&p.customBg.dataUrl)await R.loadCustomBackground(p.customBg.dataUrl);await R.loadAssetDeck?.(p);
  for(const c of cuts){
   abort(options.signal);sample.clear?.();const f=lineFeatures(p,a,c),target=C(f.onset*.45+f.change*.35+(f.flux??0)*.2),styles=styleCandidates(p,a,f),ranked=[],exclusions=[],layoutsSeen=new Set();
   for(const st of styles){
    const style=J.STYLES[st.style],fonts=[...new Set([...(style.fonts?.display||[]),'embedded_bold'])].filter(id=>J.FONTS[id]).slice(0,2);
    if(options.ensureFonts!==false)await J.ensureFonts(c.lineText,fonts);abort(options.signal);
    const loaded=fonts.filter(id=>options.ensureFonts===false||id==='embedded_bold'||J.fontLoadEvidence?.get(id)?.status==='LOADED');
    for(const font of loaded){
     const sp={...trial,style,styleKey:st.style},layouts=Object.entries(J.LAYOUTS).filter(([id,d])=>typeof d.render==='function'&&!/noHold\s*:\s*true/.test(d.render.toString())&&!/^songGrammar|^(title|interlude)$/.test(id)&&J.randomOk(p,'layout',id));
     layouts.sort(([x],[y])=>(style.bias?.layout?.[y]||0)-(style.bias?.layout?.[x]||0)||x.localeCompare(y));
     const shortlist=p.songNativeDirection.version===9?J.registryLayoutCandidatesV9(p,c,f,style,layouts):[...new Set([...layouts.slice(0,5).map(([id])=>id),...['center','condensed','photoPhrase','photoStatement'].filter(id=>layouts.some(([x])=>x===id))])];
     for(const id of shortlist){
      layoutsSeen.add(id);let cut;
      try{cut={...J.registryCandidateCut(sp,c,id,font,'cut','still'),style,styleKey:st.style,cam:'stillCamera',bg:'none',decor:[],treat:'none',stagger:0,registrySelectedV8:true};delete cut.generatedMotionV7;delete cut.grammar;delete cut.photoChoreography;
       let ev=sample(sp,cut,c.dur*.5);if(!ev.eligible&&ev.full&&!ev.extra&&!ev.unstable){const repaired=J.registryPhaseSafeAnchorState(cut,[.6],[],(x,dt)=>sample(sp,x,Math.min(dt,c.dur*.5)));if(repaired.cut){cut=repaired.cut;ev=sample(sp,cut,c.dur*.5);}}if(!ev.eligible){exclusions.push({style:st.style,font,layout:id,reason:'ACTUAL_GLYPH_HARD_GATE',full:ev.full,safe:ev.safe,glyphReadable:ev.geometry.every(g=>g.readable),contrast:ev.contrast.renderedVsBackgroundContrastP10??null});continue;}
       const occupancy=C(ev.height/(p.H>p.W?.24:.30)),targetSize=C(.35+f.energy*.25+f.brightness*.15-f.length/180),geometryFit=1-Math.abs(occupancy-targetSize);
       const score=st.score*.42+(ev.contrastFit??0)*.3+geometryFit*.28;
       ranked.push({layout:id,styleKey:st.style,font,score,evidence:evidence(ev),signature:J.registryInkSignature(ev.mask,cv.width,cv.height),typographySignature:J.registryTypographySignature(ev.mask,cv.width,cv.height),cut,params:cut.params,musicFit:geometryFit,features:f});
      }catch(e){exclusions.push({layout:id,style:st.style,reason:e.message});}
     }
    }
    styleComparisons.push({line:c.line,style:st.style,profileFit:st.score,safeRendered:ranked.filter(r=>r.styleKey===st.style).length});
   }
   ranked.sort((x,y)=>y.score-x.score||x.layout.localeCompare(y.layout)||x.styleKey.localeCompare(y.styleKey));
   const distinct=J.registryGeometryRepresentatives(ranked,.25).candidates.slice(0,3),safe=[];
   if(J.isCreativeOptimizerV10?.(p)){safe.push(...await J.optimizeCreativeLineV10({p:trial,c,f,ranked,distinct,sample,phases,signal:options.signal,audio:a,anchors:R.customBgBitmap?J.photoAnchorCandidates(R.customBgBitmap):[]}));}
   else
   for(const candidate of distinct){
    abort(options.signal);let cut=copy(candidate.cut),sp={...trial,style:cut.style,styleKey:cut.styleKey};
    // Coordinate search rather than a Cartesian product: bounded alternatives
    // in each local role; keep only phase-safe changes with a musical benefit.
    const attempts=[];
    if(p.songNativeDirection.version===9&&R.customBgBitmap)cut=J.registryAnchorV9(cut,J.photoAnchorCandidates(R.customBgBitmap),x=>sample(sp,x,c.dur*.5));
    for(const group of (p.songNativeDirection.version===9?['enter','hold','cam','treat','exit','bg','decor','trans','fx']:['enter','hold','cam','treat','exit'])){
     const roleTarget=['bg','decor','trans','fx'].includes(group)?target*.25:group==='hold'?target:group==='cam'?target*.3:group==='enter'?target*.35:group==='exit'?target*.25:group==='treat'?C((p.autoPalette?.stats?.detail??0)*.4):0;
     const optionsForRole=(p.songNativeDirection.version===9?J.registryRoleCandidatesV9(p,group,roleTarget):effectCandidates(p,group,roleTarget).slice(0,1)).filter(x=>x.id!==cut[group]);let winner=null,bestFit=p.songNativeDirection.version===9?J.registryCurrentRoleScoreV9(group,cut,roleTarget):-Infinity;
     for(const option of optionsForRole){
      const proposed={...copy(cut),...(group==='fx'?{registryFxV9:option.id}:{[group]:group==='decor'?(option.id==='none'?[]:[{id:option.id}]):option.id}),...(group==='trans'?{transDur:option.id==='cut'?0:Math.min(.10,c.dur*.08)}:{}),inDur:Math.min(.22,c.dur*.15),outDur:group==='exit'&&option.id!=='cut'?Math.min(.12,c.dur*.08):cut.outDur},checks=phases(proposed).map(dt=>sample(sp,proposed,dt)),eligible=checks.every(e=>e.eligible);
      const delta=checks.length>2?J.registryInkDistance(J.registryInkSignature(checks[2].mask,cv.width,cv.height),J.registryInkSignature(checks.at(-1).mask,cv.width,cv.height)):0;
      const fit=option.score-(Math.max(0,(delta??0)-target)*.15);
      attempts.push({group,id:option.id,eligible,musicFit:option.score,observedChange:delta});
      if(eligible&&fit>bestFit){winner={cut:proposed,fit};bestFit=fit;}
     }
     if(winner)cut=winner.cut;
    }
    const checks=phases(cut).map(dt=>sample(sp,cut,dt));if(!checks.every(e=>e.eligible))continue;
    const ev=checks[Math.floor(checks.length/2)],score=candidate.score+mean(attempts.filter(x=>x.eligible).map(x=>x.musicFit))*.12;
    safe.push({...candidate,cut,params:cut.params,score,evidence:evidence(ev),signature:J.registryInkSignature(ev.mask,cv.width,cv.height),typographySignature:J.registryTypographySignature(ev.mask,cv.width,cv.height),phaseEvidence:checks.map(evidence),attempts});
   }
   if(!safe.length)throw Error(`V8_NO_READABLE_REGISTRY_CANDIDATE_LINE_${c.line}`);
   portfolios.push({line:c.line,role:null,energy:f.energy,candidates:safe});
   traces.push({...J.registryCandidateTrace(c,safe[0].styleKey,safe[0].font,null,f.energy,safe,exclusions),reason:'音響の局所変化・歌詞寸法・実コントラスト・前後構図を比較',fitRanking:safe.map(x=>({layout:x.layout,style:x.styleKey,font:x.font,musicFit:x.musicFit,score:x.score})),candidateCount:ranked.length,layoutCandidates:[...layoutsSeen],safeCount:safe.length,acoustics:f,motionAttempts:safe.flatMap(s=>s.attempts)});
   options.onProgress?.({label:'歌詞ごとのJIZURA演出を実Canvasで比較しています',current:portfolios.length,total:cuts.length});await yieldUI();
  }
  let storyboard=J.chooseRegistryStoryboard(portfolios,8,{transitionScore:(state,c,step)=>{
   const prev=state.last,delta=prev?Math.abs(step.energy-prev.energy):0;
   const styleCost=prev&&prev.styleKey!==c.styleKey?.14*(1-delta):0;
   const text=norm(p.lines[step.line].text),repeat=state.picks.find(x=>norm(p.lines[x.line].text)===text);
   const repeatCost=repeat?(J.registryInkDistance(repeat.typographySignature,c.typographySignature)??0)*.08*(1-delta):0;
   return -styleCost-repeatCost;
  }});
  if(J.isCreativeOptimizerV10?.(p))storyboard=J.chooseCreativeArcV10(p,portfolios,storyboard);
  if(cuts.length&&storyboard.status!=='MEASURED_SAFE_SEQUENCE')throw Error('V8_NO_SAFE_STORYBOARD');
  // Validate the composed winner before committing any mutation to the input.
  install(trial,storyboard.picks.map(x=>({line:x.line,cut:x.cut})));
  const finalEvidence=new Map();for(const c of trial.cuts.filter(c=>c.registrySelectedV8&&!locked(trial,c))){const checks=phases(c).map(dt=>sample(trial,c,dt));if(!checks.every(e=>e.eligible))throw Error('V8_FINAL_STORYBOARD_HARD_GATE');finalEvidence.set(c.line,checks.map(evidence));}
  abort(options.signal);if(await J.cinemaV3.planHash(p)!==before)throw Error('INPUT_CHANGED_DURING_SEARCH');
  const selection={version:p.songNativeDirection.version,sourceIdentity:p.songNativeDirection.sourceIdentity,rendererCompatibilityId:p.songNativeDirection.rendererCompatibilityId,sourceTreeSHA256:window.KAMEN_BUILD_INFO?.sourceTreeSHA256??null,entries:selectedEntries(trial),traces,styleComparisons,storyboard:{method:storyboard.method,status:storyboard.status,score:storyboard.score,beamWidth:8},framesCompared:frames,artisticQuality:'UNVERIFIED'};
  if(J.isCreativeOptimizerV10?.(p))J.attachCreativeEvidenceV10(selection,storyboard,portfolios);
  if(p.songNativeDirection.version===9)for(const e of selection.entries){e.phaseEvidence=finalEvidence.get(e.line);e.validation='MEASURED_SAFE_SEQUENCE';}
  if(p.songNativeDirection.version===9)selection.alternatives=await J.registryAlternativesV9(trial,portfolios,storyboard,sample,phases,selection);
  abort(options.signal);if(await J.cinemaV3.planHash(p)!==before)throw Error('INPUT_CHANGED_DURING_SEARCH');
  const d=copy(p.songNativeDirection);d.selection=selection;if(d.version===9){d.status='SELECTED';selection.locks=J.cinemaV3.lockSignature(p);}p.songNativeDirection=d;p.artDirection.songNativeDirection=d;install(p,selection.entries);J.cinemaV3.invalidate(p);return p;
 }finally{R.disposeAssets?.();cv.width=cv.height=mask.width=mask.height=1;}
};
const search=J.searchSongNativeCandidates;J.searchSongNativeCandidates=(p,range,a,options={})=>active(p)?J.searchJizuraDirectionV8(p,range,a,options):search(p,range,a,options);
const snapshot=J.songNativeFixSnapshot;J.songNativeFixSnapshot=(q,a,p)=>({...snapshot(q,a,p),registryV8:active(p)?copy(p.songNativeDirection):null});
const reapply=J.reapplySongNativeSelection;J.reapplySongNativeSelection=(before,q,a,p,impact)=>{
 const reused=reapply(before,q,a,p,impact);if(reused&&active(p)&&before.registryV8){const identity=p.songNativeDirection.sourceIdentity;p.songNativeDirection={...copy(before.registryV8),sourceIdentity:identity};p.artDirection.songNativeDirection=p.songNativeDirection;/* inherited reapply preserves repaired cuts */J.cinemaV3.invalidate(p);}return reused;
};
J.describeJizuraDirectionV8=(p,c)=>{
 if(!active(p)||!c?.registrySelectedV8)return null;const trace=p.songNativeDirection.selection?.traces.find(t=>t.line===c.line),name=(g,id)=>J.registry(g)[id]?.name||id||'なし';
 return {style:J.STYLES[c.styleKey]?.name||c.styleKey||'未選択',layout:name('layout',c.layout),enter:name('enter',c.enter),hold:name('hold',c.hold),exit:name('exit',c.exit),camera:name('cam',c.cam),treat:name('treat',c.treat),decor:c.decor?.map(d=>name('decor',d.id)).join('・')||'なし',background:name('bg',c.bg),selection:trace?`${trace.candidateCount}候補・安全 ${trace.safeCount}案・実Canvas確認済み・音響/字形/背景/連続性で採用`:'実Canvas比較前'};
};
// Independent observations: IDs never earn visual novelty or artistry points.
J.measureJizuraDirectionV8=(p,frames=[],range)=>{
 const metric=(values,evidence=[],status='UNMEASURED')=>({status:values.length?'MEASURED':status,score:values.length?Math.round(mean(values)*100):null,evidence,source:'production Canvas complete glyph and contrast gates'});
 const readable=frames.filter(r=>typeof r.readable==='boolean'),pairs=frames.slice(1).map((b,i)=>({from:frames[i].time,to:b.time,distance:J.registryInkDistance(frames[i].signature,b.signature)})).filter(r=>F(r.distance));
 const metrics=Object.fromEntries(['world','typography','camera','background','temporal','repetition','stillness','continuity','density','opening','lyricVisibility','temporalContrast'].map(k=>[k,metric([])]));
 metrics.typography=metrics.lyricVisibility=metric(readable.map(r=>Number(r.readable)),readable.map(({features,...r})=>r));
 metrics.visualDifference=metric([],pairs);metrics.visualDifference.status=pairs.length?'MEASURED':'UNMEASURED';metrics.visualDifference.value=pairs.length?mean(pairs.map(r=>r.distance)):null;
 if(!p.customBg?.enabled)metrics.background=metric([],[],'NOT_APPLICABLE');
 return {contractVersion:'kamen-jizura-direction-quality-8',status:readable.length?'MEASURED':'UNMEASURED',metrics,requiredComplete:false,range:range??null,artisticQuality:'UNVERIFIED',social:{status:'UNMEASURED',score:null,shortScore:null,scope:'main-mv'}};
};
J.collectJizuraDirectionV8=async(p,range,options={})=>{
 const cv=document.createElement('canvas'),mask=document.createElement('canvas'),R=new J.Renderer(),frames=[],before=await J.cinemaV3.planHash(p);cv.width=mask.width=p.songNativeDirection.version===9?256:160;cv.height=mask.height=Math.round(cv.width*p.H/p.W);
 const sample=J.createRegistryRenderProbe(p,R,cv,mask,{production:true});
 try{
  if(p.customBg?.enabled&&p.customBg.dataUrl)await R.loadCustomBackground(p.customBg.dataUrl);await R.loadAssetDeck?.(p);
  for(const c of p.cuts.filter(c=>c.line>=0&&c.end>(range?.start??0)&&c.start<(range?.end??p.duration)))for(const dt of phases(c)){
   const time=c.start+dt;if(time<(range?.start??0)||time>=(range?.end??p.duration))continue;abort(options.signal);
   const e=sample(p,c,dt),pixels=cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data;
   const row={time,features:J.observePixelFrame(pixels,cv.width,cv.height,e.mask),readable:e.eligible,signature:J.registryInkSignature(e.mask,cv.width,cv.height),line:c.line};
   if(p.songNativeDirection.version===9){R.frame(cv.getContext('2d'),p,time,{scale:cv.width/p.W,production:true,backgroundOnly:true,noHud:true});row.background=J.observePixelFrame(cv.getContext('2d').getImageData(0,0,cv.width,cv.height).data,cv.width,cv.height);}
   frames.push(row);
   if(frames.length%10===0){options.onProgress?.({label:'採用演出の全文・安全域・コントラストを確認しています'});await yieldUI();}
  }
  if(await J.cinemaV3.planHash(p)!==before)throw Error('INPUT_CHANGED_DURING_V8_OBSERVATION');
  return {frames,observer:J.observeVisualPeaks(frames),width:cv.width,height:cv.height,contract:J.measureJizuraDirectionV8(p,frames,range)};
 }finally{R.disposeAssets?.();cv.width=cv.height=mask.width=mask.height=1;}
};
})();
