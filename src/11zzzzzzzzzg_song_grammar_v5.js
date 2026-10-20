/* Song-generated visual grammar v5. Numerical geometry, not shot recipes.
   The bounded v4 acoustic analysis and legacy renderer remain available. */
(()=>{
'use strict';
const J=window.J,C=J.clamp,F=Number.isFinite,copy=J.clonePhotoRenderPlan;
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const distance=(a,b)=>Math.sqrt(mean(a.map((v,i)=>(v-b[i])**2)));
const active=p=>(p?.songNativeDirection||p?.artDirection?.songNativeDirection)?.version===5;
const locked=(p,c)=>!!(p.songNativeManualPlan||c?.locked||Object.keys(p.directionOverrides7?.[c?.line]||{}).length||p.directorLyricDirectives7?.some(d=>d.line===c?.line)||c?.assetScene?.locked||p.directorSections7?.some(s=>c?.start>=s.from&&c?.start<s.to&&(s.typographyIntent||s.motionIntent)));
const abort=s=>{if(s?.aborted)throw new DOMException('Aborted','AbortError');};
const baseKeys=['x','y','width','height','track','lead','cameraX','cameraY','zoom','layerX','layerY','alpha','contrast','motion'];
const extraKeys=['groupSpread','groupAxis','groupCount','split','regionMix','regionAxis','cropRatio'];
const keys=[...baseKeys,...extraKeys];
const bounds={x:[.26,.74],y:[.25,.75],width:[.48,.86],height:[.24,.52],cameraX:[.12,.88],cameraY:[.12,.88],zoom:[1,1.25],groupSpread:[.14,.48],groupAxis:[0,1],split:[.2,.8],regionMix:[0,.48],regionAxis:[0,1],cropRatio:[.45,1]};
const local=(p,x,y)=>p.autoPalette?.localMap?J.sampleLocalLuma(p.autoPalette.localMap,x,y,2,2):{detail:0};
const proposal=p=>({songNativeDirector:5,style:p.style,mood:p.mood,fx:{...p.fx,hud:'off'},enabled:copy(p.enabled),seed:p.seed,overrides:copy(p.overrides||{}),summary:'楽曲から最適化した構図進行 v5',signals:{image:!!p.autoPalette?.analyzed,audio:true,lyricLines:J.parseLyrics(p.lyrics).lines.length}});
// All coordinates are derived from spectral relationships and the complete
// recurrence graph. Six coordinate sweeps have a song-length independent cap.
J.buildSongVisualGrammarV5=(project,audio,options={})=>{
 abort(options.signal);
 const d=J.buildSongVisualGrammarV4(project,audio,{...options,regularization:0});
 d.version=5;d.algorithm='SONG_GENERATED_VISUAL_GRAMMAR_V5';d.rendererCompatibilityId='kamen-song-grammar-renderer-5';
 // SSM bins straddle rest edges. Verify sustained silence against the original
 // measured RMS samples rather than requiring every coarse bin to be silent.
 const rms=audio?.rms,rate=audio?.energyRate||rms?.length/Math.max(.01,audio?.duration||d.duration);
 if(rms?.length&&F(rate)&&rate>0)for(let i=0;i<d.sections.length;i++){
  const s=d.sections[i],lo=Math.max(0,Math.ceil(s.start*rate)),hi=Math.min(rms.length,Math.floor(s.end*rate));let silent=0,measured=0;
  for(let k=lo;k<hi;k++)if(F(rms[k])){measured++;if(rms[k]<.001)silent++;}
  if(measured>=2&&silent/measured>=.85){s.quietIntent=true;s.motionIntensity=s.cameraTravel=s.state.motion=0;d.structure.sections[i].silence=true;}
 }

 const desired=d.sections.map((s,i)=>{
  const v=d.structure.sections[i].vector,previous=d.structure.sections[i-1],delta=previous?distance(v,previous.vector):0;
  const lyrics=d.lyrics.filter(l=>l.start<s.end&&l.end>s.start),length=mean(lyrics.map(l=>l.length)),time=mean(lyrics.map(l=>l.end-l.start));
  const detail=local(project,s.state.x,s.state.y).detail||0,axis=C(.5+(v[3]-v[2])*.42+(v[6]-v[11])*.24),spread=C(.18+s.lyricDensity*.17+delta*.12,.14,.48);
  Object.assign(s.state,{groupSpread:spread,groupAxis:axis,groupCount:Math.min(3,Math.max(1,Math.ceil(length/(9+time*1.3)))),split:C(.5+(v[2]-v[3])*.23),regionMix:s.quietIntent?0:C((delta*.35+v[5]*.18)*(1-detail*.5),0,.48),regionAxis:C(.5+(v[6]-v[11])*.45),cropRatio:C(1-(delta+v[5])*.24,.45,1)});
  s.imageDetail=detail;s.backgroundReason={acousticDistance:delta,localDetail:detail,lyricDensity:s.lyricDensity,quietIntent:s.quietIntent,semanticRecognition:'UNMEASURED'};
  return {...s.state};
 });
 const editable=Object.keys(bounds),repeatNeighbors=d.sections.map(()=>[]);
 for(const r of d.structure.relations){repeatNeighbors[r.from].push({other:r.to,similarity:r.similarity});repeatNeighbors[r.to].push({other:r.from,similarity:r.similarity});}
 const cost=(i,state)=>{
  const s=d.sections[i],target=desired[i];let value=0;
  for(const k of editable){const range=bounds[k][1]-bounds[k][0];value+=((state[k]-target[k])/range)**2;}
  for(const j of [i-1,i+1])if(d.sections[j]){
   const acoustic=distance(d.structure.sections[i].vector,d.structure.sections[j].vector),weight=.20*(1-acoustic);
   for(const k of editable){const range=bounds[k][1]-bounds[k][0];value+=weight*((state[k]-d.sections[j].state[k])/range)**2;}
  }
  for(const r of repeatNeighbors[i]){const j=r.other;
   for(const k of editable){const range=bounds[k][1]-bounds[k][0];value+=r.similarity*.35*((state[k]-d.sections[j].state[k])/range)**2;}
  }
  value+=(local(project,state.x,state.y).detail||0)*.13;
  // Keep group extents inside the available region before costly Canvas fitting.
  value+=Math.max(0,Math.abs(state.x-.5)+state.groupSpread*(1-state.groupAxis)*.5-.39)**2*30;
  value+=Math.max(0,Math.abs(state.y-.5)+state.groupSpread*state.groupAxis*.5-.39)**2*30;
  return value;
 };
 for(let sweep=0;sweep<6;sweep++)for(let i=0;i<d.sections.length;i++){
  abort(options.signal);const state=d.sections[i].state;
  for(const k of editable){const old=state[k],step=(bounds[k][1]-bounds[k][0])*.08/(1+sweep),baseline=cost(i,state);let best=old,bestCost=baseline;
   for(const sign of [-1,1]){state[k]=C(old+sign*step,...bounds[k]);const value=cost(i,state);if(value<bestCost){bestCost=value;best=state[k];}}
   state[k]=best;
  }
 }
 d.sections.forEach((s,i)=>{
  const prev=d.sections[i-1],next=d.sections[i+1],acoustic=prev?distance(d.structure.sections[i-1].vector,d.structure.sections[i].vector):0;
  const neighborhood=next?distance(d.structure.sections[i].vector,d.structure.sections[i+1].vector):acoustic;
  const duration=Math.min((s.end-s.start)*.42,Math.max(.12,(1-s.boundaryConfidence*.65)*(s.end-s.start)*.28));
  s.transition={start:s.start,duration:s.quietIntent||!prev?0:duration,importance:C(acoustic*.6+s.boundaryConfidence*.4)};
  s.expectedChange=prev?C((acoustic*.5+s.boundaryConfidence*acoustic*.2+neighborhood*.1+s.lyricDensity*.1)*(1-s.imageDetail*.15)*(1-(s.repeatSimilarity||0)*.25)*(s.quietIntent?0:1)):0;
  s.expectedChangeBasis={acousticDistance:acoustic,boundaryStrength:s.boundaryConfidence,repeatSimilarity:s.repeatSimilarity,lyricDensity:s.lyricDensity,imageDetail:s.imageDetail,stillIntent:s.quietIntent,neighborDistance:neighborhood};
 });
 d.grammar={...d.grammar,contractVersion:'KAMEN_VISUAL_GRAMMAR_V5',coordinates:'optimized glyph groups, continuous camera and source-image regions',operators:['glyph-groups','camera','source-region','alpha','safe-area'],optimization:{method:'BOUNDED_COORDINATE_DESCENT',sweeps:6,variables:editable.length,objective:'acoustic target + neighbors + recurrence + local image detail + safe bounds'}};
 return d;
};
const valid=J.validSongNativeDirection;
J.validSongNativeDirection=d=>{
 if(d?.version!==5)return valid(d);
 const base={...d,version:4,algorithm:'SONG_GENERATED_VISUAL_GRAMMAR_V4',rendererCompatibilityId:'kamen-song-grammar-renderer-4'};
 return d.algorithm==='SONG_GENERATED_VISUAL_GRAMMAR_V5'&&d.rendererCompatibilityId==='kamen-song-grammar-renderer-5'&&valid(base)&&d.sections.every(s=>extraKeys.every(k=>F(s.state[k]))&&s.state.groupCount>=1&&s.state.groupCount<=3&&Number.isInteger(s.state.groupCount)&&Object.entries(bounds).every(([k,[lo,hi]])=>s.state[k]>=lo&&s.state[k]<=hi)&&F(s.expectedChange)&&F(s.transition?.duration)&&s.transition.duration>=0);
};
const build=J.buildSongNativeDirection;J.buildSongNativeDirection=(p,a)=>active(p)?J.buildSongVisualGrammarV5(p,a):build(p,a);
J.generateSongVisualGrammarV5=async(p,a,options={})=>{
 const identity=J.songNativeInputIdentity(p,a),d=J.buildSongVisualGrammarV5(p,a,options);await new Promise(r=>setTimeout(r,0));abort(options.signal);
 if(identity!==J.songNativeInputIdentity(p,a))throw Error('INPUT_CHANGED_DURING_GRAMMAR');
 const candidate={proposal:{...proposal(p),grammarDirection:d}};options.onProgress?.({label:'反復・前後関係・画像領域から構図を最適化しました'});
 return {recommended:candidate,candidates:[candidate]};
};
const propose=J.proposeDirection;J.proposeDirection=(p,...args)=>active(p)?proposal(p):propose(p,...args);
const make=J.makeArtDirection;J.makeArtDirection=(p,a,pr)=>{
 if(pr.songNativeDirector!==5&&!active(p))return make(p,a,pr);
 const d=pr.grammarDirection?.sourceIdentity===J.songNativeInputIdentity(p,a)&&J.validSongNativeDirection(pr.grammarDirection)?copy(pr.grammarDirection):J.buildSongVisualGrammarV5(p,a);
 const font=p.fonts?.display||'embedded_bold',vocabulary={layout:['songGrammarV5'],enter:['cut'],exit:['cut'],hold:['still'],cam:['stillCamera'],bg:['none'],treat:[],trans:['cut'],decor:[],fx:[]};
 return {version:5,style:p.style,mood:p.mood,typography:{display:font,body:font,serif:font},vocabulary,layoutLanguage:vocabulary.layout,motionLanguage:{base:0,enters:['cut'],exits:['cut']},cameraLanguage:['stillCamera'],fxLanguage:{allowed:[],budget:0},decorationLanguage:{allowed:[],budget:0},transitionLanguage:['cut'],intensityCurve:d.sections.map(s=>s.motionIntensity),sectionProfiles:d.sections.map(s=>({start:s.start,end:s.end,intensity:s.motionIntensity,majorEvent:false})),duration:d.duration,songNativeDirection:d};
};
const story=J.buildPhotoStory;J.buildPhotoStory=p=>active(p)?p:story(p);
const plan=J.plan;J.plan=(project,audio)=>{
 if(!active(project))return plan(project,audio);
 const saved=project.artDirection.songNativeDirection,identity=J.songNativeInputIdentity(project,audio),d=J.validSongNativeDirection(saved)&&saved.sourceIdentity===identity?copy(saved):J.buildSongVisualGrammarV5(project,audio);
 // Reuse v4's proven legacy bypass, complete-phrase timing and lock handling.
 const adapter=copy(project);adapter.artDirection.songNativeDirection={...copy(d),version:4,algorithm:'SONG_GENERATED_VISUAL_GRAMMAR_V4',rendererCompatibilityId:'kamen-song-grammar-renderer-4'};delete adapter.artDirection.songNativeResolved;
 const p=plan(adapter,audio);p.songNativeDirection=d;p.artDirection={...p.artDirection,...copy(project.artDirection),songNativeDirection:d};p.songNativePlanInputIdentity=identity;
 for(const c of p.cuts||[])if(c.line>=0&&!locked(p,c))c.layout='songGrammarV5';
 if(p.visualWorld&&!p.songNativeManualPlan)p.visualWorld.chapters=d.sections.map((s,i)=>({index:i,from:s.start,to:s.end,targetWorldDistance:s.expectedChange,expectedChangeBasis:s.expectedChangeBasis,intent:s.quietIntent?'intentional-hold':'generated-structure',backgroundWorld:'source-image',paletteTreatment:'source-image'}));
 return J.restoreSongNativeResolved(project,audio,p);
};
const oldState=J.songGrammarStateAt;
J.songGrammarStateAt=(p,t)=>{
 if(!active(p))return oldState(p,t);
 const s=J.songNativeSectionAt(p,t);if(!s)return null;
 const i=p.songNativeDirection.sections.indexOf(s),prev=p.songNativeDirection.sections[i-1]||s;
 const u=s.transition.duration?C((t-s.start)/s.transition.duration):1,ease=u*u*(3-2*u);
 return Object.fromEntries(keys.map(k=>[k,k==='groupCount'?s.state[k]:J.lerp(prev.state[k],s.state[k],ease)]));
};
J.songGrammarV5Groups=(text,state)=>{
 const glyphs=J.graphemes(text),n=Math.min(state.groupCount,Math.max(1,Math.floor(glyphs.length/4)));
 if(n===1)return [text];
 const boundaries=J.lyricBreaks(text).boundaries,offsets=[0];
 for(let i=1;i<n;i++){
  const target=text.length*i/n,candidates=boundaries.filter(b=>b.offset>offsets.at(-1)&&b.offset<text.length);
  candidates.sort((a,b)=>Math.abs(a.offset-target)-Math.abs(b.offset-target)||a.cost-b.cost);
  if(candidates.length)offsets.push(candidates[0].offset);
 }
 offsets.push(text.length);return offsets.slice(0,-1).map((offset,i)=>text.slice(offset,offsets[i+1]));
};
J.LAYOUTS.songGrammarV5={name:'Song-optimized glyph groups',plan:()=>({}),render:env=>{
 const {plan:p,cut:c,W,H}=env,s=J.songGrammarStateAt(p,env.t);if(!s)return null;
 const groups=J.songGrammarV5Groups(c.lineText||c.text,s),vertical=s.groupAxis;
 for(let i=0;i<groups.length;i++){
  const phase=groups.length===1?0:i/(groups.length-1)-.5;
  let width=W*s.width/(1+(groups.length-1)*(1-vertical)),height=H*s.height/(1+(groups.length-1)*vertical*.65);
  if(groups.length>1){if(vertical>=.5)height=Math.min(height,H*s.groupSpread*vertical/(groups.length-1)*.84);else width=Math.min(width,W*s.groupSpread*(1-vertical)/(groups.length-1)*.86);}
  const font=c.params.font,text=groups[i],rows=J.semanticLyricLayout?.(text,{font,size:H*.14,maxWidth:width,maxHeight:height,lead:s.lead,track:s.track,ctx:env.ctx});
  const item={text:rows?.text??text,font,size:Math.min(H*.16,rows?.size??J.fitSize(text,font,width,height,{lead:s.lead,track:s.track})),x:(s.x+phase*s.groupSpread*(1-vertical))*W,y:(s.y+phase*s.groupSpread*vertical)*H,lead:s.lead,track:s.track,color:env.sc.fg,noHold:true};
  J.mainDraw(env,J.safeLyricItem(env,item));
 }
}};
const typography=J.applyTypography5;J.applyTypography5=(env,it)=>active(env.plan)&&!locked(env.plan,env.cut)?undefined:typography(env,it);
const center=J.centerPhotoLyricItem;J.centerPhotoLyricItem=(env,it)=>active(env.plan)&&!locked(env.plan,env.cut)?it:center(env,it);
const camera=J.cameraAt;J.cameraAt=(p,t,range)=>{
 if(!active(p)||locked(p,J.cutAt(p,t)||{}))return camera(p,t,range);
 const s=J.songGrammarStateAt(p,t);return s?{s:s.zoom,x:(.5-s.cameraX)*p.W*.35,y:(.5-s.cameraY)*p.H*.35,rot:0}:camera(p,t,range);
};
// Keep the full source as the base. Additional clipped regions use aspect-correct
// source crops; there is no segmentation, invented subject, depth or new bitmap.
const background=J.Renderer.prototype.drawCustomBackground;
J.Renderer.prototype.drawCustomBackground=function(ctx,p,t,...args){
 if(!active(p)||locked(p,J.cutAt(p,t)||{}))return background.call(this,ctx,p,t,...args);
 const s=J.songGrammarStateAt(p,t),image=this.customBgBitmap;if(!s||!image?.width)return background.call(this,ctx,p,t,...args);
 const W=p.W,H=p.H,cfg=p.customBg||{},rect=J.customBgGeometry(image.width,image.height,W,H,cfg);
 if(!rect)return false;
 // Do not call the old chapter-phase camera: quiet v5 states must remain still.
 ctx.save();ctx.translate(W/2+(.5-s.cameraX)*W*.35,H/2+(.5-s.cameraY)*H*.35);ctx.scale(s.zoom,s.zoom);ctx.translate(-W/2,-H/2);
 if(this.filterOK&&rect.blur>0&&args[4])ctx.filter=`blur(${(rect.blur*(args[3]||1)).toFixed(1)}px)`;
 ctx.drawImage(image,rect.x,rect.y,rect.w,rect.h);ctx.restore();
 const darkness=C(+cfg.darkness||0,0,.8);
 if(darkness){ctx.save();ctx.globalAlpha*=darkness;ctx.fillStyle='#000';ctx.fillRect(0,0,W,H);ctx.restore();}
 const result=true;
 const horizontal=s.regionAxis,split=s.split;
 const rectangles=[[0,0,W*(horizontal+(1-horizontal)*split),H*((1-horizontal)+horizontal*split)],[(1-horizontal)*W*split,horizontal*H*split,W*(horizontal+(1-horizontal)*(1-split)),H*((1-horizontal)+horizontal*(1-split))]];
 for(let i=0;i<rectangles.length;i++){
  const [x,y,w,h]=rectangles[i],scale=Math.max(w/image.width,h/image.height)/s.cropRatio,sw=w/scale,sh=h/scale;
  const sx=C(s.cameraX+(i-.5)*s.layerX*4)*(image.width-sw),sy=C(s.cameraY+(i-.5)*s.layerY*4)*(image.height-sh);
  ctx.save();ctx.beginPath();ctx.rect(x,y,w,h);ctx.clip();ctx.globalAlpha*=s.regionMix;ctx.drawImage(image,sx,sy,sw,sh,x,y,w,h);ctx.restore();
 }
 return result;
};
// A single optimized numeric solution is observed once. No seed/style tournament
// or three-regularization surrogate can replace the multi-variable objective.
const search=J.searchSongNativeCandidates;J.searchSongNativeCandidates=async(p,range,audio,telemetry={})=>{
 if(!active(p))return search(p,range,audio,telemetry);abort(telemetry.signal);
 const before=await J.cinemaV3.planHash(p),trial=copy(p),renderer=new J.Renderer(),cv=document.createElement('canvas');cv.width=256;cv.height=Math.round(256*p.H/p.W);const ctx=cv.getContext('2d');
 let count=0;
 try{
  if(p.customBg?.enabled&&p.customBg.dataUrl)await renderer.loadCustomBackground(p.customBg.dataUrl);
  const cuts=p.cuts.filter(c=>c.line>=0&&!locked(p,c)),chosen=cuts.filter((_,i)=>i===0||i===Math.floor(cuts.length/2)||i===cuts.length-1);
  for(const c of chosen){abort(telemetry.signal);const mask=document.createElement('canvas');mask.width=cv.width;mask.height=cv.height;const mc=mask.getContext('2d'),items=[];
   renderer.frame(ctx,trial,c.start+Math.min(.2,c.dur*.5),{scale:cv.width/p.W,production:true,noHud:true,lyricAuditCtx:mc,lyricAuditItems:items});
   const ink=mc.getImageData(0,0,mask.width,mask.height).data,evidence=J.selectionPixelEvidence(ctx.getImageData(0,0,cv.width,cv.height).data,ink,cv.width,cv.height,items.map(i=>i.bounds).filter(Boolean),p.W,p.H);
   if(!evidence.safe||!ink.some((v,i)=>i%4===3&&v>0))throw Error('V5_NO_READABLE_GRAMMAR');count++;mask.width=mask.height=1;
  }
 }finally{renderer.disposeAssets?.();cv.width=cv.height=1;}
 if(await J.cinemaV3.planHash(p)!==before)throw Error('INPUT_CHANGED_DURING_SEARCH');
 p.songNativeDirection.optimization={method:'BOUNDED_COORDINATE_DESCENT',candidateCount:1,representativeFrames:count,canvas:'OBSERVED_GLYPH_MASK',artisticQuality:'UNVERIFIED'};
 p.artDirection.songNativeDirection=p.songNativeDirection;J.cinemaV3.invalidate(p);return p;
};
const fixSnapshot=J.songNativeFixSnapshot;J.songNativeFixSnapshot=(project,audio,p)=>({...fixSnapshot(project,audio,p),grammarV5:active(p)?copy(p.songNativeDirection):null});
const reapply=J.reapplySongNativeSelection;J.reapplySongNativeSelection=(before,project,audio,p,impact)=>{
 const reused=reapply(before,project,audio,p,impact);if(reused&&before.grammarV5&&active(p)){const sourceIdentity=p.songNativeDirection.sourceIdentity;p.songNativeDirection={...copy(before.grammarV5),sourceIdentity};p.artDirection.songNativeDirection=p.songNativeDirection;J.cinemaV3.invalidate(p);}return reused;
};
const repair=J.repairWeakSections;J.repairWeakSections=(p,...args)=>active(p)?Promise.resolve({accepted:false,status:'V5_RETAINS_OBSERVED_GEOMETRY',changedLines:[]}):repair(p,...args);
})();
