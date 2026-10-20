/* v5 observation contract. Planned acoustic/composition targets never count as
   rendered evidence. Canvas proxies do not certify decoded MP4 or audience taste. */
(()=>{'use strict';
const J=window.J,F=Number.isFinite,C=J.clamp,active=p=>[5,6].includes(p?.songNativeDirection?.version);
const version='kamen-song-grammar-quality-5',mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const delta=(a,b)=>a?.length&&a.length===b?.length?mean(a.map((v,i)=>Math.abs(v-b[i]))):null;
const fontIds=new WeakMap();let nextFont=0;
const binding=(p,range)=>{
 const fonts=document.fonts,faces=fonts&&typeof fonts[Symbol.iterator]==='function'?Array.from(fonts,f=>{if(!fontIds.has(f))fontIds.set(f,++nextFont);return [fontIds.get(f),f.family,f.style,f.weight,f.status];}):[];
 const text=J.canonicalJSON({direction:p.songNativeDirection,decisions:J.songNativeRenderDecisions(p),W:p.W,H:p.H,fps:p.fps,lines:p.lines,bg:p.customBg,assets:p.assets,visualAssets:p.visualAssets,fonts:p.fonts,style:p.style,fx:p.fx,locks:p.directionOverrides7,renderer:p.songNativeDirection?.rendererCompatibilityId,fontStatus:fonts?.status,faces,range:range??null});let hash=2166136261;for(let i=0;i<text.length;i++)hash=Math.imul(hash^text.charCodeAt(i),16777619)>>>0;return text.length+':'+hash;
};
const metric=(status,score=null,evidence=[],source='actual Canvas raster')=>({status,score:F(score)?Math.round(C(score/100)*100):null,evidence,source,contractVersion:version});
const measured=(scores,evidence)=>scores.length?metric('MEASURED',100*mean(scores),evidence):metric('UNMEASURED',null,evidence);
const section=(p,t)=>p.songNativeDirection.sections.find(s=>t>=s.start&&t<s.end)||p.songNativeDirection.sections.at(-1);
const featureDistance=(a,b)=>!a||!b?null:C((delta(a.fg,b.fg)||0)*2+Math.hypot(a.center[0]-b.center[0],a.center[1]-b.center[1])+(delta(a.bbox,b.bbox)||0)+Math.abs(a.spread-b.spread));
const pixelDistance=(a,b)=>!a||!b?null:delta(a.luma,b.luma);
const fit=(actual,expected)=>F(actual)&&F(expected)?(expected>.0001?C(actual/expected):C(1-actual/.025)):null;
// Targets vary with acoustic boundaries, recurrence, lyric occupancy and the
// optimized state. Old projects without such targets explicitly stay unmeasured.
const expected=(p,a,b)=>{
 const sa=section(p,a.time),sb=section(p,b.time);if(!sa||!sb)return null;
 if(sa===sb){const x=J.songGrammarStateAt(p,a.time),y=J.songGrammarStateAt(p,b.time);return C(Math.hypot(y.x-x.x,y.y-x.y)+Math.abs(y.width-x.width)*.5+Math.abs(y.groupSpread-x.groupSpread||0));}
 return F(sb.expectedChange)?sb.expectedChange:null;
};
J.measureSongGrammarV5=(p,frames=[],range)=>{
 const from=range?.start??0,to=range?.end??p.duration;
 const malformed=frames.filter(f=>!f.features||!Array.isArray(f.features.luma)||!f.features.luma.length||!f.features.luma.every(F)||!['area','spread','texture'].every(k=>F(f.features[k]))||!['fg','bbox','center'].every(k=>Array.isArray(f.features[k])&&f.features[k].every(F)));
 const rows=frames.filter(f=>!malformed.includes(f)&&F(f.time)&&f.time>=from&&f.time<=to&&f.features?.luma?.length).sort((a,b)=>a.time-b.time);
 const pairs=rows.slice(1).map((b,i)=>{const a=rows[i],target=expected(p,a,b),actual=featureDistance(a.features,b.features),background=pixelDistance(a.backgroundFeatures,b.backgroundFeatures),sa=J.songGrammarStateAt(p,a.time),sb=J.songGrammarStateAt(p,b.time);return {from:a.time,to:b.time,sectionFrom:section(p,a.time)?.start,sectionTo:section(p,b.time)?.start,target,actual,background,cameraTarget:Math.hypot(sb.cameraX-sa.cameraX,sb.cameraY-sa.cameraY)+Math.abs(sb.zoom-sa.zoom),quiet:section(p,a.time)?.quietIntent&&section(p,b.time)?.quietIntent,observedCenters:[a.features.center,b.features.center],plannedCenters:[[sa.x,sa.y],[sb.x,sb.y]],stateDistance:Math.hypot(sb.x-sa.x,sb.y-sa.y)+Math.abs(sb.width-sa.width),duration:b.time-a.time};});
 const world=pairs.filter(r=>r.sectionFrom!==r.sectionTo&&F(r.target));
 const metrics={world:measured(world.map(r=>fit(r.actual,r.target)),world)};
 // Position correspondence is tested only where real glyph ink was isolated.
 const glyph=rows.filter(r=>r.features.foregroundSource==='raster-mask'&&r.features.area>0);
 const typeRows=glyph.map(r=>{const s=J.songGrammarStateAt(p,r.time),err=Math.hypot(r.features.center[0]-s.x,r.features.center[1]-s.y);return {time:r.time,plannedCenter:[s.x,s.y],observedCenter:r.features.center,area:r.features.area,bbox:r.features.bbox,spread:r.features.spread,placementError:err,groupBands:r.groupBands??null,groupRealization:r.groupRealization??null};});
 metrics.typography=measured(typeRows.map(r=>C(1-r.placementError/.25)*(r.groupRealization??1)),typeRows);
 const backgrounds=pairs.filter(r=>F(r.background));
 metrics.background=p.customBg?.enabled?measured(backgrounds.map(r=>fit(r.background,(r.cameraTarget+r.stateDistance+Math.abs(section(p,r.to)?.state?.split-section(p,r.from)?.state?.split||0))*.15)),backgrounds):metric('NOT_APPLICABLE',null,[],'no source image');
 // Camera ablation renders the same image/regions with only the camera frozen.
 // A flat source cannot establish a moving camera, and remains unmeasured.
 const camera=rows.filter(r=>F(r.cameraEffect)&&r.cameraExpected>.0001);
 metrics.camera=measured(camera.filter(r=>r.backgroundFeatures?.texture>.0001).map(r=>fit(r.cameraEffect,r.cameraExpected*.1)),camera.map(r=>({time:r.time,plannedMotion:r.cameraExpected,actualCausalPixelDelta:r.cameraEffect,texture:r.backgroundFeatures?.texture})));
 if(!camera.length&&rows.length>1){const stable=rows.filter(r=>F(r.cameraEffect));if(stable.length)metrics.camera=measured(stable.map(r=>C(1-r.cameraEffect/.01)),stable.map(r=>({time:r.time,actualCausalPixelDelta:r.cameraEffect,plannedMotion:r.cameraExpected})));}
 const transitions=p.songNativeDirection.sections.slice(1).filter(s=>s.start>from&&s.start<to),timing=[];
 for(const s of transitions){const tr=s.transition||{},start=F(tr.start)?tr.start:s.start,end=start+(tr.duration||.3),local=pairs.filter(r=>r.to>=start-.15&&r.from<=end+.15);if(!local.length)continue;const strongest=[...local].sort((a,b)=>b.actual-a.actual)[0];timing.push({boundary:s.start,window:[start,end],observedInterval:[strongest.from,strongest.to],actual:strongest.actual,expected:s.expectedChange,covered:local.some(r=>r.from<=start)&&local.some(r=>r.to>=end),score:strongest.actual<.00001&&s.expectedChange>.001?0:C(1-Math.max(0,start-strongest.to,strongest.from-end)/Math.max(.1,end-start))});}
 metrics.temporal=p.songNativeDirection.structure?.status==='UNMEASURED'?metric('UNMEASURED',null,timing,'acoustic evidence unavailable'):measured(timing.filter(t=>t.covered).map(t=>t.score),timing);
 const quiet=pairs.filter(r=>r.quiet&&r.sectionFrom===r.sectionTo);metrics.stillness=quiet.length?measured(quiet.map(r=>C(1-r.actual/.02)),quiet):p.songNativeDirection.sections.some(s=>s.quietIntent&&s.end>from&&s.start<to)?metric('UNMEASURED',null,[],'rest exists but was not sampled'):metric('NOT_APPLICABLE',null,[],'no rest interval');
 const repeats=[];
 for(const relation of p.songNativeDirection.structure?.relations||[]){const a=p.songNativeDirection.sections[relation.from],b=p.songNativeDirection.sections[relation.to],find=s=>rows.filter(r=>r.time>=s.start&&r.time<s.end).sort((x,y)=>Math.abs((x.time-s.start)/(s.end-s.start)-.5)-Math.abs((y.time-s.start)/(s.end-s.start)-.5))[0],x=find(a),y=find(b);if(x&&y)repeats.push({from:x.time,to:y.time,acousticSimilarity:relation.similarity,observedGeometryDistance:featureDistance(x.features,y.features),score:C(1-featureDistance(x.features,y.features))});}
 metrics.repetition=(p.songNativeDirection.structure?.relations||[]).length?measured(repeats.map(r=>r.score),repeats):metric('NOT_APPLICABLE',null,[],'no detected acoustic repetition');
 const densityRows=pairs.filter(r=>F(r.target)&&r.duration<=.55).map(r=>{const expectedRate=(r.target+r.cameraTarget*.15)/r.duration,actualRate=(r.actual+(r.background??0)*.5)/r.duration;return {from:r.from,to:r.to,expectedRate,actualRate,excessRate:Math.max(0,actualRate-expectedRate),score:C(1-Math.abs(actualRate-expectedRate)/Math.max(.025,expectedRate))};});
 metrics.density=measured(densityRows.map(r=>r.score),densityRows);
 const moving=pairs.filter(r=>!r.quiet&&F(r.target)&&r.target>.001&&r.duration<=.55),intendedRest=p.songNativeDirection.sections.some(s=>s.quietIntent&&s.end>from&&s.start<to);
 metrics.temporalContrast=!intendedRest?metric('NOT_APPLICABLE',null,[],'no static intention in range'):quiet.length&&moving.length?metric('MEASURED',100*C((mean(moving.map(r=>r.actual))-mean(quiet.map(r=>r.actual)))/Math.max(.001,mean(moving.map(r=>r.target)))),[{observedMoving:mean(moving.map(r=>r.actual)),observedRest:mean(quiet.map(r=>r.actual)),expectedMoving:mean(moving.map(r=>r.target)),movingFrames:moving.map(r=>[r.from,r.to]),restFrames:quiet.map(r=>[r.from,r.to])}]):metric('UNMEASURED',null,[],'both moving and resting Canvas intervals required');
 metrics.continuity=measured(pairs.filter(r=>r.duration<=.55).map(r=>C(1-Math.max(0,r.actual-(r.target??0))/.3)),pairs.filter(r=>r.duration<=.55));
 const opening=pairs.filter(r=>r.from<=from+3),visible=rows.filter(r=>r.features.area>0&&r.features.foregroundSource==='raster-mask'),firstLine=(p.lines||[]).find(l=>l.end>from&&l.start<to),anchor=firstLine?Math.max(from,firstLine.start):null;
 metrics.opening=measured(opening.filter(r=>F(r.target)).map(r=>fit(r.actual,r.target)),opening);
 metrics.lyricVisibility=anchor===null?metric('NOT_APPLICABLE',null,[],'no lyrics in range'):rows.some(r=>r.time>=anchor&&r.time<=anchor+.25)?metric('MEASURED',visible.some(r=>r.time>=anchor&&r.time<=anchor+.25)?100:0,[{plannedStart:anchor,firstObserved:visible[0]?.time??null}]):metric('UNMEASURED',null,[{plannedStart:anchor}]);
 const readable=rows.filter(r=>typeof r.readable==='boolean');metrics.readability=measured(readable.map(r=>Number(r.readable)),readable.map(r=>({time:r.time,readable:r.readable})));
 const ending=rows.filter(r=>r.time>=to-.6),lastLine=(p.lines||[]).filter(l=>l.start<to&&l.end>from).at(-1),endCovered=ending.some(r=>r.time>=to-.06);
 const endingPairs=pairs.filter(r=>r.from>=to-.6&&F(r.target)).map(r=>({...r,closingActual:r.actual+(r.background??0)*.5,closingExpected:r.target+r.cameraTarget*.15}));
 metrics.ending=endCovered&&ending.length>=2&&endingPairs.length?metric('MEASURED',lastLine&&lastLine.end>to+.05?0:100*mean(endingPairs.map(r=>C(1-Math.abs(r.closingActual-r.closingExpected)/Math.max(.01,r.closingExpected)))),[{lastFrame:ending.at(-1).time,lyricTruncated:!!lastLine&&lastLine.end>to+.05,observedProgression:endingPairs,scope:'Canvas endpoint and input-conditioned closing pixel progression; audio/MP4 closure unmeasured'}]):metric('UNMEASURED',null,[]);
 metrics.loop=p.socialHook?.loopRequired===true?metric('UNMEASURED',null,[{reason:'requires decoded visual, lyric and audio join'}]):metric('NOT_APPLICABLE',null,[],'output does not require looping');
 const refinement=p.songNativeDirection.version===6?J.refineSongGrammarQualityV6(p,rows,pairs,metrics,range):null;
 const required=['world','typography','camera','background','temporal','repetition','stillness','continuity','opening','lyricVisibility','readability','density','temporalContrast','ending','loop'];
 if(refinement)required.push('realization','perceptualNovelty','backgroundNovelty');
 if(malformed.length)for(const k of required)if(metrics[k].status!=='NOT_APPLICABLE')metrics[k]=metric('FAILED',null,[{reason:'INVALID_CANVAS_CHANNELS',frames:malformed.map(f=>f.time)}]);
 const requiredComplete=required.every(k=>['MEASURED','NOT_APPLICABLE'].includes(metrics[k].status));
 const socialKeys=['opening','lyricVisibility','readability','temporal','density','temporalContrast','stillness','continuity','ending','loop'],socialValues=socialKeys.filter(k=>metrics[k].status==='MEASURED').map(k=>metrics[k].score),social={scope:p.socialHook?.dedicatedReedit?'dedicated-short':'main-mv',status:socialValues.length?'MEASURED':'UNMEASURED',score:socialValues.length?Math.round(mean(socialValues)):null,shortScore:p.socialHook?.dedicatedReedit&&socialValues.length?Math.round(mean(socialValues)):null,loopRequired:p.socialHook?.loopRequired===true,metrics:Object.fromEntries(socialKeys.map(k=>[k,metrics[k]])),artisticQuality:'UNVERIFIED'};
 return {contractVersion:refinement?.contractVersion||version,range:range??null,status:malformed.length?'FAILED':rows.length?'MEASURED':'UNMEASURED',metrics,requiredComplete,samples:rows.map(r=>r.time),social,source:'bounded production Canvas + isolated glyph masks + camera-only raster ablation',planned:p.songNativeDirection.sections.map(s=>({start:s.start,end:s.end,expectedChange:s.expectedChange,transition:s.transition})),artisticQuality:'UNVERIFIED',encodedStatus:'UNMEASURED'};
};
const collect=async(p,range,telemetry={})=>{
 const inputBinding=binding(p,range);
 const from=range?.start??0,to=range?.end??p.duration,times=new Set(),add=t=>{if(times.size<64&&F(t)&&t>=from&&t<to)times.add(Math.round(t*10000)/10000);};
 for(const t of [from,from+.04,to-.5,to-.04])add(t);
 for(const s of p.songNativeDirection.sections){if(s.end<=from||s.start>=to)continue;const tr=s.transition||{},start=tr.start??s.start,end=start+(tr.duration||.3);for(const t of [s.start-.08,s.start+.04,start-.04,(start+end)/2,end+.04,(s.start+s.end)/2])add(t);}
 for(const l of (p.lines||[]).slice(0,6))for(const t of [l.start+.04,l.start+.18])add(t);
 for(let i=1;i<8;i++)add(from+(to-from)*i/8);
 if(p.songNativeDirection.version===6){times.clear();for(const t of J.selectSongGrammarObservationTimesV6(p,range))times.add(t);}
 const R=new J.Renderer(),cv=document.createElement('canvas'),mask=document.createElement('canvas'),bg=document.createElement('canvas'),w=160,h=Math.round(w*p.H/p.W);
 cv.width=mask.width=bg.width=w;cv.height=mask.height=bg.height=h;
 const ctx=cv.getContext('2d',{willReadFrequently:true}),mc=mask.getContext('2d',{willReadFrequently:true}),bc=bg.getContext('2d',{willReadFrequently:true}),frames=[];
 const frozen=J.clonePhotoRenderPlan(p),initial=J.songGrammarStateAt(p,from);frozen.songNativeDirection.sections.forEach(s=>{for(const k of ['cameraX','cameraY','zoom'])s.state[k]=initial[k];});
 if(frozen.songNativeDirection.trajectory)for(const knot of frozen.songNativeDirection.trajectory.knots)for(const k of ['cameraX','cameraY','zoom'])knot.state[k]=initial[k];
 const background=(q,t)=>{bc.setTransform(1,0,0,1,0,0);bc.clearRect(0,0,w,h);bc.save();bc.scale(w/p.W,w/p.W);try{R.drawCustomBackground(bc,q,t,t,0,p.style?.schemes?.[0]||{},w/p.W,true);}finally{bc.restore();}return J.observePixelFrame(bc.getImageData(0,0,w,h).data,w,h);};
 try{
  if(p.customBg?.enabled&&p.customBg.dataUrl)await R.loadCustomBackground(p.customBg.dataUrl);await R.loadAssetDeck?.(p);
  for(const t of [...times].sort((a,b)=>a-b)){
   if(telemetry.signal?.aborted)throw new DOMException('Aborted','AbortError');const items=[],glyphChecks=[],draw=J.drawItem;
   J.drawItem=(env,it)=>{if(env.pass==='main'&&env.cut.line>=0)glyphChecks.push(J.selectionGlyphEvidence(env,it).readable);return draw(env,it);};
   try{R.frame(ctx,p,t,{scale:w/p.W,production:true,noHud:true,range,lyricAuditCtx:mc,lyricAuditItems:items});}finally{J.drawItem=draw;}
   const pixels=ctx.getImageData(0,0,w,h).data,ink=mc.getImageData(0,0,w,h).data,features=J.observePixelFrame(pixels,w,h,ink),s=J.songGrammarStateAt(p,t),row={time:t,features};
   if(glyphChecks.length){const geometry=J.selectionPixelEvidence(pixels,ink,w,h,items.map(i=>i.bounds).filter(Boolean),p.W,p.H);row.readable=glyphChecks.every(Boolean)&&geometry.safe&&geometry.ink>0;}
   if(items.length&&features.area>0){const bands=items.map(item=>{const b=item.bounds;let inkCount=0;if(b)for(let y=Math.max(0,Math.floor(b.y0/p.H*h));y<Math.min(h,Math.ceil(b.y1/p.H*h));y++)for(let x=Math.max(0,Math.floor(b.x0/p.W*w));x<Math.min(w,Math.ceil(b.x1/p.W*w));x++)if(ink[(y*w+x)*4+3]>24)inkCount++;return {bounds:b,inkPixels:inkCount};});row.groupBands=bands;const cut=J.cutAt(p,t),count=(p.songNativeDirection.version===6?J.songGrammarV6Groups(cut?.lineText||cut?.text||'',s,p):J.songGrammarV5Groups(cut?.lineText||cut?.text||'',s)).length;row.groupRealization=C(bands.filter(b=>b.inkPixels>0).length/Math.max(1,count));}
   if(R.customBgBitmap){row.backgroundFeatures=background(p,t);const control=background(frozen,t);row.cameraEffect=pixelDistance(row.backgroundFeatures,control);row.cameraExpected=Math.hypot(s.cameraX-initial.cameraX,s.cameraY-initial.cameraY)+Math.abs(s.zoom-initial.zoom);}
   frames.push(row);
   if(frames.length%8===0){telemetry.onProgress?.({label:'構図・時間・背景の実画素を検査しています',current:frames.length,total:times.size});await new Promise(r=>setTimeout(r,0));}
  }
 }finally{R.customBgBitmap?.close?.();R.disposeAssets?.();cv.width=cv.height=mask.width=mask.height=bg.width=bg.height=1;}
 if(binding(p,range)!==inputBinding)throw Error('INPUT_CHANGED_DURING_V5_OBSERVATION');
 const contract=J.measureSongGrammarV5(p,frames,range);contract.observationBinding={renderKey:inputBinding};
 return {frames,observer:J.observeVisualPeaks(frames),width:w,height:h,contract};
};
J.collectSongGrammarEvidenceV5=async(p,range,telemetry={})=>(await collect(p,range,telemetry)).contract;
const canvas=J.collectCanvasObserver;J.collectCanvasObserver=(p,...args)=>active(p)?collect(p,...args):canvas(p,...args);
const world=J.measureWorldDistance7;J.measureWorldDistance7=(p,frames,range)=>{
 if(!active(p))return world(p,frames,range);const contract=J.measureSongGrammarV5(p,frames,range);contract.observationBinding={renderKey:binding(p,range)};const m=contract.metrics.world;
 return {...m,contract,measured:m.status==='MEASURED',pairs:m.evidence,weakChapters:m.evidence.filter(r=>F(r.target)&&r.target>.001&&r.actual<r.target*.65).map(r=>({...r,from:r.sectionTo,pass:false})),score:m.score};
};
const motif=J.measureMotifReality7;J.measureMotifReality7=(p,...args)=>active(p)?Promise.resolve({...metric('NOT_APPLICABLE',null,[],'v5 generated composition has no legacy motif'),applicable:false}):motif(p,...args);
const semantic=J.measureSemanticReality7;J.measureSemanticReality7=(p,...args)=>active(p)?Promise.resolve({...metric('NOT_APPLICABLE',null,[],'no semantic interpretation claimed'),weakLines:[]}):semantic(p,...args);
const impact=J.audienceImpact7;J.audienceImpact7=(observer,p)=>active(p)?{...metric('UNMEASURED',null,[],'audience impact requires audience validation'),climaxApplicable:false}:impact(observer,p);
const observe=J.observeMVQuality;J.observeMVQuality=async(p,...args)=>{const r=await observe(p,...args);if(active(p)){const contract=r.metrics?.worldRealization?.contract;if(contract)r.metrics.songGrammarV5=contract;}return r;};
const hype=J.hypeQuality;J.hypeQuality=(project,p,audio,range,pixel)=>{
 if(!active(p))return hype(project,p,audio,range,pixel);const candidate=pixel?.metrics?.songGrammarV5,e=candidate?.observationBinding?.renderKey===binding(p,range)?candidate:null,m=e?.metrics||{},get=k=>m[k]?.status==='MEASURED'?m[k].score:null;
 return {contractVersion:version,status:e?.social?.status||'UNMEASURED',hookStrength:get('opening'),scrollStopPower:get('lyricVisibility'),visualEnergyDensity:get('density'),socialShareability:e?.social?.score??null,eventRate:null,tier:'INPUT_GENERATED',hardFail:false,socialScope:e?.social?.scope||'main-mv',shortScore:e?.social?.shortScore??null,metrics:m};
};
const realization=J.auditDirectionRealization;J.auditDirectionRealization=(p,pixels)=>active(p)?{ok:J.validSongNativeDirection(p.songNativeDirection),errors:J.validSongNativeDirection(p.songNativeDirection)?[]:['INVALID_V5_GRAMMAR'],warnings:[],metrics:{contractVersion:version,pixelsVerified:!!pixels?.metrics?.songGrammarV5}}:realization(p,pixels);
const reality=J.auditDirectionReality;J.auditDirectionReality=(p,pixels)=>{
 if(!active(p))return reality(p,pixels);const candidate=pixels?.metrics?.songGrammarV5,e=candidate&&candidate.observationBinding?.renderKey===binding(p,candidate.range)?candidate:null,checks=['typography','camera','background','temporal','repetition'].map(k=>({intent:k,...(e?.metrics[k]||metric('UNMEASURED'))})),measured=checks.filter(c=>c.status==='MEASURED');
 return {checks,mismatches:measured.filter(c=>c.score<95),ok:J.validSongNativeDirection(p.songNativeDirection),score:measured.length?Math.round(mean(measured.map(c=>c.score))):null,styleRealizationScore:measured.length?Math.round(mean(measured.map(c=>c.score))):null,status:e?.status||'UNMEASURED',pixelsVerified:!!pixels?.completed&&!!e,contractVersion:version,artisticQuality:'UNVERIFIED'};
};
const check=J.checkMVQuality;J.checkMVQuality=(project,p,audio,range,pixel,caps,validation)=>{
 const r=check(project,p,audio,range,pixel,caps,validation);if(!active(p))return r;const candidate=pixel?.metrics?.songGrammarV5,e=candidate?.observationBinding?.renderKey===binding(p,range)?candidate:J.measureSongGrammarV5(p,[],range),q=r.quality,get=k=>e.metrics[k]?.status==='MEASURED'?e.metrics[k].score:null;
 q.songGrammarV5=e;q.socialScope={scope:e.social.scope,shortScore:e.social.shortScore};q.hype=J.hypeQuality(project,p,audio,range,{...pixel,metrics:{...pixel?.metrics,songGrammarV5:e}});q.socialScore=e.social.score;
 const creative=['world','typography','camera','background','temporal','repetition','stillness','continuity'].map(get).filter(F);q.creativeScore=creative.length?Math.round(mean(creative)):null;
 q.productionDomains={technical:q.technicalScore,musicalDirection:get('temporal'),semanticDirection:null,typography:get('typography'),visualWorld:get('world'),motionRealization:get('camera'),audienceImpact:null,social:q.socialScore};
 p.currentQualityScores=q.productionDomains;
 q.metrics={...q.metrics,styleSelection:null,styleRealization:J.auditDirectionReality(p,pixel).score,styleArcRealization:null,temporalContrast:get('temporalContrast')};
 q.categories=(q.categories||[]).filter(c=>!['styleSelection','styleRealization','hookStrength','scrollStopPower','visualEnergyDensity','socialShareability'].includes(c.key));
 q.unmeasuredRequired=Object.entries(e.metrics).filter(([,v])=>v.status==='UNMEASURED'||v.status==='FAILED').map(([k])=>k);
 q.certified100=q.perfectEligible=false;q.artistic100Established=false;
 const scores=[q.technicalScore,q.creativeScore,q.socialScore].filter(F);q.score=q.overallScore=scores.length?Math.round(mean(scores)):null;
 q.domains=[{key:'technical',score:q.technicalScore,max:100},{key:'creative',score:q.creativeScore,max:100},{key:'social',score:q.socialScore,max:100}];
 // Keep every inherited hard gate and threshold. This contract only replaces
 // legacy style/event proxies and cannot certify missing/undecoded evidence.
 if(p.songNativeDirection.version===6)q.songGrammarV6=e;
 if(q.targetAcceptance){q.targetAcceptance.certified100=false;if(!e.requiredComplete){q.targetAcceptance.minimumMet=false;q.targetAcceptance.unmeasured=[...new Set([...(q.targetAcceptance.unmeasured||[]),...q.unmeasuredRequired.map(k=>'v5.'+k)])];}}
 return r;
};
})();
