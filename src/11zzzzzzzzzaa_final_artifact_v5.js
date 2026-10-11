/* Independent final Blob verification. No candidate history, plan repair or score rewriting. */
(()=>{'use strict';const J=window.J,Q=J.cinemaV5,V=J.cinemaV3,F=Number.isFinite;
const hash=x=>J.sha256(J.canonicalJSON(x)),clean=s=>String(s??'').replace(/\s/gu,'');
Q.sameFinalInput=(a,b)=>['audioHash','imageHashes','lyricsHash','projectHash','userLocks','rendererVersion'].every(k=>J.canonicalJSON(a[k])===J.canonicalJSON(b[k]));
Q.originalUnitTextIntegrity=(p,lineIds)=>lineIds.every(line=>{
 const raw=clean(p.lines?.[line]?.text),texts=(p.cuts||[]).filter(c=>c.line===line).map(c=>clean(c.grammar?c.lineText??c.text:c.text??c.lineText));
 return !!raw&&texts.length>0&&(texts.every(t=>t===raw)||texts.join('')===raw);
});
Q.isPrimaryInternalLyric=(env,it)=>!(env.cut.layout==='center'&&env.cut.params?.sub&&clean(env.cut.text)!==clean(env.cut.lineText)&&clean(it.text)===clean(env.cut.lineText));
Q.nativeGlyphSafety=(env,it)=>{
 const g=J.selectionGlyphEvidence(env,it),text=env.cut.grammar?env.cut.lineText:env.cut.text??env.cut.lineText,short=(J.graphemes?J.graphemes(clean(text)):typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(clean(text))]:Array.from(clean(text))).length<=4,cap=env.H>env.W?(short?.25:.145):(short?.29:.195);
 return {...g,readable:!g.distortion&&!g.collisions&&g.maxGlyphHeight<=cap&&g.minAlpha>=.55,sizeCap:cap,thresholdPolicy:'Existing native glyph thresholds applied to the actual internal display unit; identical verification for baseline and V5'};
};
Q.finalGlyphPresence=(on,off,actual,alpha,w,h,bounds,scale)=>{
 if(!bounds||[on,off,actual,alpha].some(a=>a.length!==w*h))return {status:'UNMEASURED',reason:'MISSING_NATIVE_GLYPH_GEOMETRY'};
 let expected=0,present=0,ex=0,ey=0,ax=0,ay=0,nativeInkBounds={x0:Infinity,y0:Infinity,x1:-Infinity,y1:-Infinity},decodedInkBounds={...nativeInkBounds};const extend=(b,x,y)=>{b.x0=Math.min(b.x0,x);b.x1=Math.max(b.x1,x);b.y0=Math.min(b.y0,y);b.y1=Math.max(b.y1,y);};for(let y=Math.max(0,Math.floor(bounds.y0*scale));y<Math.min(h,Math.ceil(bounds.y1*scale));y++)for(let x=Math.max(0,Math.floor(bounds.x0*scale));x<Math.min(w,Math.ceil(bounds.x1*scale));x++){const i=y*w+x;if(alpha[i]>.5&&Math.abs(on[i]-off[i])>=.25){expected++;ex+=x;ey+=y;extend(nativeInkBounds,x,y);if((actual[i]-off[i])/(on[i]-off[i])>.30&&(actual[i]-off[i])/(on[i]-off[i])<1.8){present++;ax+=x;ay+=y;extend(decodedInkBounds,x,y);}}}
 return {status:expected<3?'UNMEASURED':present/expected>=.95?'MEASURED':'FAILED',expectedInkPixels:expected,decodedInkFraction:expected?present/expected:null,nativeInkBounds:expected?nativeInkBounds:null,decodedInkBounds:present?decodedInkBounds:null,nativeCentroid:expected?[ex/expected,ey/expected]:null,decodedCentroid:present?[ax/present,ay/present]:null,reason:expected<3?'NO_MEASURABLE_CONTRAST_BEARING_GLYPH_INK':present/expected>=.95?null:'DECODED_GLYPH_INK_MISSING',method:'Native glyph box / registered expected contrast-bearing ink versus actual decoded pixels; not OCR'};
};
Q.finalArtifactUnits=async(p,range,planHash)=>{
 const start=range?.start??p.socialHook?.start??0,end=range?.end??p.socialHook?.end??p.duration,out=[];
 for(const [index,c]of (p.cuts||[]).entries())if(c.line>=0&&c.start<end&&c.end>start){
  const from=Math.max(start,c.start),to=Math.min(end,J.cinemaActiveCutEnd(p,c,end));if(to<=from)continue;
  const transition=c.trans?(F(c.transDur)?Math.max(0,c.transDur):.35):0,phases=c.grammar?.scenePhases,entry=Math.max(from,c.start+(c.inDur||0),c.start+transition,phases?.SETTLE?.[1]??from);let exit=Math.min(to,c.end-(c.outDur||0),phases?.RELEASE?.[0]??to);
  const loop=p.musicalPhoto?.cinema?.loop,window=J.cinemaLoopWindow?.(p,end)??0,closureStart=end-window;
  if(loop&&loop.mode!=='background-only-text-cut'&&window>0&&!(p.cuts||[]).some(k=>(k.locked||J.photoChoreographyLocked?.(p,k))&&k.start<end&&k.end>closureStart))exit=Math.min(exit,closureStart);
  if(c.grammar?.temporal&&/^cinemaGrammar/.test(c.layout||'')&&!c.locked&&!J.photoChoreographyLocked?.(p,c))exit=Math.min(exit,end-(J.cinemaTypographyClosingWindow?.(p,c,end)??0));
  out.push({id:await hash({planHash,index,line:c.line,start:c.start,end:c.end,text:c.lineText??c.text}),index,line:c.line,text:String(c.grammar?c.lineText??c.text:c.text??c.lineText??''),from,to,hold:[entry,exit],locked:!!c.locked||!!J.photoChoreographyLocked?.(p,c)});
 }return out;
};
Q.finalUnitSummary=(unit,frames,fps)=>{
 const own=frames.filter(f=>f.unitId===unit.id&&F(f.actualDecodedTimestamp)&&f.actualDecodedTimestamp>=unit.from&&f.actualDecodedTimestamp<unit.to),hold=own.filter(f=>f.phase==='hold'),expected=Math.max(0,Math.ceil(unit.hold[1]*fps-1e-7)-Math.ceil(unit.hold[0]*fps-1e-7));
 const full=own.length>1&&own.every((f,i)=>!i||f.actualDecodedTimestamp-own[i-1].actualDecodedTimestamp<=1.01/fps),complete=expected>1&&hold.length>=expected&&hold.every(f=>f.nativeComplete&&f.safeArea&&f.pixelPresence);
 const failed=hold.some(f=>f.nativeComplete===false||f.safeArea===false||f.pixelPresence===false);
 return {unitId:unit.id,line:unit.line,timeRange:[unit.from,unit.to],holdRange:unit.hold,status:failed?'FAILED':full&&complete?'MEASURED':'UNMEASURED',frameCount:own.length,holdFrameCount:hold.length,expectedHoldFrames:expected,readableHoldSeconds:hold.filter(f=>f.nativeComplete&&f.safeArea&&f.pixelPresence).length/fps,minimumContrast:hold.length&&hold.every(f=>F(f.localContrast))?Math.min(...hold.map(f=>f.localContrast)):null,reason:failed?'NATIVE_OR_DECODED_GLYPH_FAILURE':full&&complete?null:expected<=1?'NO_COMPLETE_HOLD_INTERVAL':'INCOMPLETE_ACTUAL_FRAME_COVERAGE',phaseCounts:Object.fromEntries(['entry','hold','exit'].map(k=>[k,own.filter(f=>f.phase===k).length]))};
};
Q.finalCandidateIdentity=async(history,planHash,videoSHA256)=>history.find(h=>h.videoHash===videoSHA256&&h.planHash===planHash)?.candidateId??await hash({planHash,videoSHA256});
Q.validateFinalArtifactBinding=async(e,binding)=>{
 if(!e||!e.evidenceId)return false;const {evidenceId,...payload}=e;
 return evidenceId===await hash(payload)&&J.canonicalJSON(e.binding)===J.canonicalJSON(binding);
};
Q.selectedMotionContract=(p,c,automatic=true)=>{
 const manual=!!c.locked||!!J.photoChoreographyLocked?.(p,c),mode=c.grammar?.mode??c.cinema?.mode??c.layout;
 const operator=manual?null:c.grammar?({gather:'converge',duo:c.grammar.stage===2?null:'settle',stadium:'expand',voice:'expand',ground:'hold',solo:'hold'})[mode]??null:({converge:'converge',expand:'expand',read:'hold',response:'settle',type:'reveal'})[mode]??(['wipe','assemble','type'].includes(c.enter)?'reveal':null);
 return {intent:c.cinemaV5Direction?.intention??'existing selected renderer motion',operator:operator??mode,target:'registered primary glyph identities',expectedMotion:operator??null,timeRange:[c.start,c.end],confidence:c.cinemaV5Direction?.confidence??null,measurable:!!operator,naturalSelection:!manual&&automatic,source:manual?'USER_LOCK':automatic?'SHIPPING_RENDERER_CONTRACT':'PROJECT_NOT_AUTOMATIC_DIRECTION',mode,failureReason:manual?'USER_LOCK_NOT_AUTOMATIC_SELECTION':!automatic?'PROJECT_NOT_AUTOMATIC_DIRECTION':operator?null:'NO_EXPLICIT_SUPPORTED_MOTION_CONTRACT'};
};
Q.measureFinalOperatorIntent=(contract,frames)=>{
 if(!contract.naturalSelection)return {status:'NOT_APPLICABLE',realization:null,failureReason:contract.failureReason??'USER_LOCK_NOT_AUTOMATIC_SELECTION'};
 const valid=frames.filter(f=>f.pixelPresence&&f.nativeComplete&&f.glyphEvidence?.length),first=valid[0],last=valid.at(-1),geometry=(f,key)=>{const glyphs=f.glyphEvidence.filter(g=>g[key]);return {area:glyphs.reduce((n,g)=>n+g.expectedInkPixels*(key==='decodedCentroid'?g.decodedInkFraction:1),0),center:glyphs.length?[0,1].map(k=>glyphs.reduce((n,g)=>n+g[key][k],0)/glyphs.length):null,rows:[...new Set(glyphs.map(g=>g.row))].map(row=>{const group=glyphs.filter(g=>g.row===row);return [0,1].map(k=>group.reduce((n,g)=>n+g[key][k],0)/group.length);})};};
 if(!contract.measurable||!first||valid.length<3)return {status:'UNMEASURED',realization:null,failureReason:contract.failureReason??'INSUFFICIENT_REGISTERED_ACTUAL_GLYPHS'};
 const a=geometry(first,'decodedCentroid'),b=geometry(last,'decodedCentroid'),na=geometry(first,'nativeCentroid'),nb=geometry(last,'nativeCentroid');let observed=null,expected=null;
 if(contract.operator==='expand'){const extent=(f,native)=>{const boxes=f.glyphEvidence.map(g=>native?g.nativeInkBounds:g.decodedInkBounds).filter(Boolean);return boxes.length?(Math.max(...boxes.map(b=>b.x1))-Math.min(...boxes.map(b=>b.x0))+1)*(Math.max(...boxes.map(b=>b.y1))-Math.min(...boxes.map(b=>b.y0))+1):null;},ea=extent(first,true),eb=extent(last,true),oa=extent(first,false),ob=extent(last,false);expected=ea&&eb?eb/ea-1:null;observed=oa&&ob?ob/oa-1:null;if(!(expected>.02))return {status:'UNMEASURED',realization:null,failureReason:'NO_RESOLVED_NATIVE_EXPANSION',expected,observed};}
 if(contract.operator==='converge'){const distance=x=>x.rows.length>1?Math.hypot(...x.rows[0].map((v,k)=>v-x.rows.at(-1)[k])):null,from=distance(a),to=distance(b),nf=distance(na),nt=distance(nb);if(from===null||nf===null)return {status:'UNMEASURED',realization:null,failureReason:'NO_SEPARATELY_IDENTIFIED_ROW_GROUPS'};expected=nf-nt;observed=from-to;if(expected<2)return {status:'UNMEASURED',realization:null,failureReason:'CONVERGENCE_BELOW_NATIVE_PIXEL_RESOLUTION',expected,observed};}
 if(contract.operator==='settle'){const stride=Math.max(1,Math.round(valid.length/8)),velocities=key=>valid.filter((_,i)=>i%stride===0).slice(1).map((f,i)=>{const prev=valid[i*stride],dt=f.actualDecodedTimestamp-prev.actualDecodedTimestamp,speeds=f.glyphEvidence.map((g,j)=>{const h=prev.glyphEvidence[j];return h?.index===g.index&&h.character===g.character&&g[key]&&h[key]?Math.hypot(...g[key].map((v,k)=>v-h[key][k]))/Math.max(.001,dt):null;}).filter(F);return speeds.length?speeds.reduce((n,x)=>n+x,0)/speeds.length:null;}).filter(F),deceleration=v=>v.length>=4&&v[0]>1?1-(v.slice(-2).reduce((n,x)=>n+x,0)/2)/(v.slice(0,2).reduce((n,x)=>n+x,0)/2):null;expected=deceleration(velocities('nativeCentroid'));observed=deceleration(velocities('decodedCentroid'));if(expected===null)return {status:'UNMEASURED',realization:null,failureReason:'NO_RESOLVED_EXPECTED_SETTLING'};}
 if(contract.operator==='hold'){const drift=key=>Math.max(...valid.flatMap(f=>f.glyphEvidence.map((g,j)=>{const h=first.glyphEvidence[j];return h?.index===g.index&&h.character===g.character&&g[key]&&h[key]?Math.hypot(...g[key].map((v,k)=>v-h[key][k])):Infinity;})));expected=drift('nativeCentroid');observed=drift('decodedCentroid');if(expected>1)return {status:'UNMEASURED',realization:null,failureReason:'NATIVE_RENDERER_IS_NOT_AN_EXPLICIT_STILL_HOLD',expected,observed};return {status:'MEASURED',realization:observed<=1?1:0,passed:observed<=1,expected,observed,failureReason:observed<=1?null:'HOLD_GLYPHS_MOVED',actualDecodedTimestamps:valid.map(f=>f.actualDecodedTimestamp)};}
 if(contract.operator==='reveal'){const entry=frames.filter(f=>f.phase==='entry'&&f.glyphEvidence?.some(g=>g.status==='MEASURED')),area=(f,native=false)=>f.glyphEvidence?.reduce((n,g)=>n+(g.expectedInkPixels||0)*(native?1:g.decodedInkFraction??0),0)??0;if(!entry.length)return {status:'UNMEASURED',realization:null,failureReason:'NO_MEASURED_PARTIAL_REVEAL_GLYPHS'};const peak=Math.max(...valid.map(f=>area(f))),nativePeak=Math.max(...valid.map(f=>area(f,true))),early=area(entry[0]);if(!peak||!nativePeak)return {status:'UNMEASURED',realization:null,failureReason:'NO_DECODED_REVEALED_GLYPH_INK'};observed=1-early/peak;expected=1-area(entry[0],true)/nativePeak;if(expected<=.02)return {status:'UNMEASURED',realization:null,failureReason:'NO_RESOLVED_EXPECTED_REVEAL_GROWTH',expected,observed};}
 if(!F(expected)||!F(observed))return {status:'UNMEASURED',realization:null,failureReason:'UNSUPPORTED_OPERATOR_SPECIFIC_MEASUREMENT'};
 const realization=Math.max(0,Math.min(1,observed/Math.max(.001,expected))),passed=realization>=.9;
 return {status:'MEASURED',realization,passed,expected,observed,failureReason:passed?null:'SELECTED_OPERATOR_PHYSICAL_INTENT_NOT_REALIZED',actualDecodedTimestamps:valid.map(f=>f.actualDecodedTimestamp),method:'Operator-specific decoded registered glyph ink geometry; native target retained separately; no aesthetic score'};
};
Q.finalMotionObservation=(contract,frames)=>{
 const usable=frames.filter(f=>f.phase==='hold'&&f.pixelPresence&&f.glyphEvidence?.length),changes=[];
 for(let i=1;i<usable.length;i++){const a=usable[i-1],b=usable[i],dt=b.actualDecodedTimestamp-a.actualDecodedTimestamp;if(dt<=0)continue;
  for(const [j,g]of b.glyphEvidence.entries()){const prev=a.glyphEvidence[j];if(!prev||prev.index!==g.index||prev.character!==g.character||!prev.nativeCentroid||!g.nativeCentroid||!prev.decodedCentroid||!g.decodedCentroid)continue;
   const e=g.nativeCentroid.map((v,k)=>v-prev.nativeCentroid[k]),o=g.decodedCentroid.map((v,k)=>v-prev.decodedCentroid[k]),expected=Math.hypot(...e),observed=Math.hypot(...o),error=Math.hypot(...e.map((v,k)=>v-o[k]));changes.push({time:b.actualDecodedTimestamp,expected,observed,error,dt});
  }
 }
 if(!contract.naturalSelection)return {...contract,status:'NOT_APPLICABLE',observed:null,realization:null};
 if(!contract.measurable||usable.length<3)return {...contract,status:'UNMEASURED',observed:null,realization:null,failureReason:contract.failureReason??'INSUFFICIENT_DECODED_GLYPH_TRACKS'};
 const moving=changes.filter(x=>x.expected>=.5),hold=contract.operator==='hold',relevant=hold?changes:moving;
 if(!relevant.length)return {...contract,status:'UNMEASURED',observed:null,realization:null,failureReason:'EXPECTED_MOTION_BELOW_NATIVE_PIXEL_RESOLUTION'};
 const matched=relevant.filter(x=>hold?x.observed<=.5:x.error<=Math.max(.5,x.expected*.1)),realization=matched.length/relevant.length;
 return {...contract,status:'MEASURED',observed:{sampleCount:relevant.length,matched:matched.length,meanExpectedPixels:relevant.reduce((n,x)=>n+x.expected,0)/relevant.length,meanObservedPixels:relevant.reduce((n,x)=>n+x.observed,0)/relevant.length,actualDecodedTimestamps:usable.map(f=>f.actualDecodedTimestamp)},realization,passed:realization>=.9,failureReason:realization>=.9?null:'ACTUAL_GLYPH_TRAJECTORY_DISAGREES_WITH_SELECTED_RENDERER',intentRealization:'UNMEASURED',limits:'Registered trajectory proves renderer agreement only. Operator-specific expansion, convergence distance or musical-event realization must also be measured before intent is certified.'};
};
Q.verifyFinalArtifact=async(result,args,input)=>{
 if(args.signal?.aborted)throw new DOMException('Aborted','AbortError');
 const selectedInput=await V.snapshot(args.project,args.audio,args.plan,args.range);
 if(!Q.sameFinalInput(input,selectedInput))throw Error('FINAL_ARTIFACT_INPUT_CHANGED');input=selectedInput;
 const p=args.plan,planHash=await V.planHash(p),videoSHA256=await J.sha256(await result.blob.arrayBuffer()),profile=V.outputProfile(p,args.range),validation=result.validation||{},build=window.KAMEN_BUILD_INFO||{};
 const binding={inputHash:input.inputHash,planHash,outputProfile:{...profile,resolution:[validation.width??p.W,validation.height??p.H]},rendererVersion:build.sourceTreeSHA256??build.sourceCommit??V.version,selectedCandidateId:await Q.finalCandidateIdentity(result.provenance?.cinemaV3?.history||[],planHash,videoSHA256),videoSHA256,sourceCommit:build.sourceCommit??null,sourceTreeSHA256:build.sourceTreeSHA256??null,sourceDirty:build.sourceDirty??null};
 if(result.provenance?.videoSHA256&&result.provenance.videoSHA256!==videoSHA256)throw Error('FINAL_ARTIFACT_VIDEO_HASH_MISMATCH');
 const units=await Q.finalArtifactUnits(p,args.range,planHash),frames=[],failures=[];
 if(validation.certification?.passed===false)failures.push('MP4_CERTIFICATION_FAILED');
 const contract={status:'MEASURED',method:'Immutable input snapshot and selected renderer plan contract; not decoded OCR',inputHash:input.inputHash,lyricsHash:input.lyricsHash,unitTexts:units.map(u=>({unitId:u.id,line:u.line,text:u.text})),timingStatus:Q.lyricTimingInvariant(p,units.map(u=>p.cuts[u.index]))?'MEASURED':'FAILED'};
 if(contract.timingStatus==='FAILED')failures.push('LRC_UNIT_TIMING');
 contract.originalUnitTextStatus=Q.originalUnitTextIntegrity(p,[...new Set(units.map(u=>u.line))])?'MEASURED':'FAILED';if(contract.originalUnitTextStatus==='FAILED')failures.push('ORIGINAL_UNIT_TEXT_INTEGRITY');
 let unavailable=null;const decoder=window.JIZURAMedia?.sampleMP4;
 if(!decoder||typeof document==='undefined')unavailable='NATIVE_DECODER_OR_CANVAS_UNAVAILABLE';
 else {
  const width=validation.width??p.W,height=validation.height??p.H,rangeStart=profile.range[0],rangeEnd=profile.range[1],R=new J.Renderer(),cv=document.createElement('canvas'),bg=document.createElement('canvas'),mask=document.createElement('canvas');
  cv.width=bg.width=mask.width=width;cv.height=bg.height=mask.height=height;const x=cv.getContext('2d',{willReadFrequently:true}),bx=bg.getContext('2d',{willReadFrequently:true}),mx=mask.getContext('2d',{willReadFrequently:true});
  const previousGlyphResolution=J.glyphs.maxRes;J.glyphs.maxRes=height>=1000?768:512;
  const renderPlan=J.clonePhotoRenderPlan(p),times=Array.from({length:validation.videoSamples??Math.max(0,Math.ceil((rangeEnd-rangeStart)*p.fps))},(_,i)=>i/p.fps);
  try {
   if(renderPlan.customBg?.dataUrl)await R.loadCustomBackground(renderPlan.customBg.dataUrl);await R.loadAssetDeck?.(renderPlan);
   await decoder(result.blob,times,{width,height,signal:args.signal,onSample:(requested,pixels,meta)=>{
    if(args.signal?.aborted)throw new DOMException('Aborted','AbortError');const actual=F(meta?.timestamp)?rangeStart+meta.timestamp:null;
    if(meta?.width!==width||meta?.height!==height||meta?.videoCodec!=='avc'||(args.audio?.buffer&&meta?.audioCodec!=='aac')||(F(meta?.duration)&&Math.abs(meta.duration-1/p.fps)>1e-5)){failures.push('ACTUAL_MP4_PROFILE_MISMATCH');throw Error('ACTUAL_MP4_PROFILE_MISMATCH');}
    if(actual===null){unavailable='MISSING_ACTUAL_DECODED_TIMESTAMP';return;}
    const unit=units.find(u=>actual>=u.from&&actual<u.to);if(!unit)return;
    const c=renderPlan.cuts[unit.index],records=[],draw=J.drawItem;
    J.drawItem=(env,it)=>{if(env.ctx===mx&&env.pass==='main'&&env.cut?.line===unit.line&&env.cut.start===c.start&&env.cut.end===c.end&&Q.isPrimaryInternalLyric(env,it)){const lay=J.layoutText(it),text=lay.filter(g=>!it.charFn?.(g.i,g,lay.N)?.hide).map(g=>it.charFn?.(g.i,g,lay.N)?.ch??g.ch).join('');const glyphBounds=lay.filter(g=>g.ch.trim()).map(g=>({index:g.i,row:g.li,character:it.charFn?.(g.i,g,lay.N)?.ch??g.ch,bounds:J.measureLyricItemBounds(env,{...it,charFn:(i,a,n)=>({...it.charFn?.(i,a,n),hide:i!==g.i||!!it.charFn?.(i,a,n)?.hide})})}));records.push({text,bounds:J.measureLyricItemBounds(env,it),glyph:Q.nativeGlyphSafety(env,it),glyphBounds});}return draw(env,it);};
    const phase=actual<unit.hold[0]?'entry':actual>=unit.hold[1]?'exit':'hold';
    try{R.frame(x,renderPlan,actual,{scale:width/p.W,production:true,range:args.range,lyricAuditCtx:mx,noTrans:phase==='hold'});}finally{J.drawItem=draw;}
    J.renderCinemaBackgroundAudit(R,bx,renderPlan,actual,{scale:width/p.W,production:true,range:args.range});
    const on=J.cinemaReferenceLuma(x.getImageData(0,0,width,height).data),off=J.cinemaReferenceLuma(bx.getImageData(0,0,width,height).data),alpha=J.cinemaPrimaryAlpha(mx.getImageData(0,0,width,height).data),actualLuma=J.cinemaReferenceLuma(pixels);
    let expected=0,present=0;for(let i=0;i<alpha.length;i++)if(alpha[i]>.5&&Math.abs(on[i]-off[i])>=.25){expected++;if((actualLuma[i]-off[i])/(on[i]-off[i])>.30&&(actualLuma[i]-off[i])/(on[i]-off[i])<1.8)present++;}
    const glyphEvidence=records.flatMap(r=>r.glyphBounds.map(g=>({...g,...Q.finalGlyphPresence(on,off,actualLuma,alpha,width,height,g.bounds,width/p.W)})));
    const contrast=J.decodedGlyphContrast(actualLuma,off,alpha,width,height),safeArea=records.length>0&&records.every(r=>r.bounds&&r.bounds.x0>=p.W*.02&&r.bounds.x1<=p.W*.98&&r.bounds.y0>=p.H*.025&&r.bounds.y1<=p.H*.975);
    frames.push({unitId:unit.id,requestedTimestamp:rangeStart+requested,actualDecodedTimestamp:actual,frameDuration:meta.duration,phase,nativeTexts:records.map(r=>r.text),nativeGlyphChecks:records.map(r=>r.glyph),nativeComplete:records.length>0&&clean(records.map(r=>r.text).join(''))===clean(unit.text)&&records.every(r=>r.glyph.readable),safeArea,pixelPresence:glyphEvidence.some(g=>g.status==='FAILED')?false:glyphEvidence.length&&glyphEvidence.every(g=>g.status==='MEASURED')?true:null,glyphEvidence,expectedInkPixels:expected,decodedInkFraction:expected?present/expected:null,localContrast:contrast.score??null,dimensions:[meta.width,meta.height],videoCodec:meta.videoCodec,audioCodec:meta.audioCodec});
    if(frames.length%p.fps===0)args.onProgress?.(.995,'完成MP4の全歌詞と実フレームを検証しています');
   }});
  }catch(e){if(args.signal?.aborted)throw e;unavailable=String(e.message);}finally{J.glyphs.maxRes=previousGlyphResolution;R.customBgBitmap?.close?.();R.disposeAssets?.();cv.width=bg.width=mask.width=cv.height=bg.height=mask.height=1;}
 }
 const motionObservations=units.map(u=>({unitId:u.id,...Q.finalMotionObservation(Q.selectedMotionContract(p,p.cuts[u.index],args.project.autoDirection===true),frames.filter(f=>f.unitId===u.id))})),natural=motionObservations.filter(m=>m.naturalSelection),measured=natural.filter(m=>m.status==='MEASURED'),motionSummary={population:natural.length,measured:measured.length,rendererAgreementSuccess:measured.filter(m=>m.passed).length,measurableRate:natural.length?measured.length/natural.length:null,rendererAgreementRate:measured.length?measured.filter(m=>m.passed).length/measured.length:null,intentRealizationSuccessRate:null,manualExcluded:motionObservations.filter(m=>m.source==='USER_LOCK').length,nonAutomaticExcluded:motionObservations.filter(m=>m.source==='PROJECT_NOT_AUTOMATIC_DIRECTION').length};
 for(const m of motionObservations)m.intentObservation=Q.measureFinalOperatorIntent(m,frames.filter(f=>f.unitId===m.unitId));const intentMeasured=natural.filter(m=>m.intentObservation.status==='MEASURED');Object.assign(motionSummary,{intentMeasured:intentMeasured.length,intentMeasurableRate:natural.length?intentMeasured.length/natural.length:null,intentSuccessful:intentMeasured.filter(m=>m.intentObservation.passed).length,intentRealizationSuccessRate:intentMeasured.length?intentMeasured.filter(m=>m.intentObservation.passed).length/intentMeasured.length:null});
 const summaries=units.map(u=>Q.finalUnitSummary(u,frames,p.fps)),audio=await Q.auditDecodedAudio(result.blob,args.audio,args.range,args.signal);
 if(audio.status==='FAILED')failures.push('AAC_SOURCE_MISMATCH');
 await V.assertSnapshot(input,args.project,args.audio,p,args.range);if(await V.planHash(p)!==planHash)throw Error('FINAL_VERIFICATION_MUTATED_PLAN');
 const status=failures.length||summaries.some(s=>s.status==='FAILED')?'FAILED':!unavailable&&validation.certification?.passed===true&&['MEASURED','NOT_APPLICABLE'].includes(audio.status)&&summaries.length&&summaries.every(s=>s.status==='MEASURED')?'MEASURED':'UNMEASURED';
 const payload={version:'final-artifact-v1',verifierVersion:Q.version,verifierIdentity:Q.finalArtifactVerifierIdentity??{sourceCommit:build.sourceCommit??null,sourceTreeSHA256:build.sourceTreeSHA256??null},binding,status,inputContract:contract,units:summaries,frames,motionObservations,motionSummary,audioEvidence:audio,failures,unavailable,limits:'Native expected glyph geometry and actual decoded compositing/contrast; no OCR, sung syllable recognition or aesthetic certification. Entry/exit effects are separately observed and do not certify hold readability. Every nonspace native glyph box requires decoded contrast-bearing ink, with actual pixel presence recorded separately from raw fill contrast. Expected glyph projection is not independent OCR.',perGlyphDecodedIdentity:'REGISTERED_PIXEL_PROJECTION_NOT_OCR',humanStatus:Q.humanStatus};
 return V.freezeMetadata({...payload,evidenceId:await hash(payload)});
};
const provenance=J.createExportProvenance;J.createExportProvenance=async(...args)=>{const result=await provenance(...args),p=args[0].plan;return {...result,plannedOperatorContracts:{planHash:await V.planHash(p),sourceCommit:window.KAMEN_BUILD_INFO?.sourceCommit??null,method:'Selected renderer plan contract recorded before final artifact observation',units:(p.cuts||[]).filter(c=>c.line>=0).map((c,index)=>({index,line:c.line,start:c.start,end:c.end,...Q.selectedMotionContract(p,c,args[0].project?.autoDirection===true)}))}};};
})();
