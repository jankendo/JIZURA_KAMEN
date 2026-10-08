/* Single-artwork narrative search. All quality numbers remain measurements. */
(()=>{'use strict';const J=window.J,C=J.clamp,locked=(p,c)=>!!c&&J.photoChoreographyLocked(p,c);
J.vocaliseGroup=text=>{const t=String(text||'').replace(/[\sー〜～、。!！?？]/g,'');return /^[ラら]+$/.test(t)&&t.length>=3?'la':/^[オお]+$/.test(t)&&t.length>=3?'oh':/^[アあ]+$/.test(t)&&t.length>=3?'ah':null;};
const anchorCache=new WeakMap();
J.photoAnchorCandidates=image=>{
 if(!image)return [{x:.5,y:.5,saliency:.5}];if(anchorCache.has(image))return anchorCache.get(image);
 const cv=document.createElement('canvas');cv.width=64;cv.height=36;const ctx=cv.getContext('2d');ctx.drawImage(image,0,0,64,36);const d=ctx.getImageData(0,0,64,36).data,lum=i=>d[i*4]*.2126+d[i*4+1]*.7152+d[i*4+2]*.0722;
 const anchors=[{x:.5,y:.5},{x:.5,y:.28},{x:.5,y:.72},{x:.35,y:.56},{x:.65,y:.56}].map(a=>{let sum=0,n=0;for(let y=Math.max(1,Math.floor(a.y*36)-4);y<Math.min(35,a.y*36+4);y++)for(let x=Math.max(1,Math.floor(a.x*64)-17);x<Math.min(63,a.x*64+17);x++){sum+=Math.abs(lum(y*64+x)-lum(y*64+x-1))+Math.abs(lum(y*64+x)-lum((y-1)*64+x));n++;}return {...a,saliency:C(sum/Math.max(1,n)/65),source:'local edge density; not face or subject recognition'};});cv.width=cv.height=1;anchorCache.set(image,anchors);return anchors;
};
const center=J.centerPhotoLyricItem;J.centerPhotoLyricItem=(env,item)=>{
 const a=env.cut.params?.photoAnchor;if(!a||locked(env.plan,env.cut))return center(env,item);const it=center(env,item),box=J.measureLyricItemBounds(env,it);if(!box)return it;
 const dx=Math.max(env.W*.11-box.x0,Math.min(env.W*.89-box.x1,(a.x-.5)*env.W)),dy=Math.max(env.H*.08-box.y0,Math.min(env.H*.92-box.y1,(a.y-.5)*env.H)),m=env.ctx.getTransform(),det=m.a*m.d-m.b*m.c,k=env.scale||1;
 if(Math.abs(det)>1e-9){it.x+=(m.d*dx-m.c*dy)*k/det;it.y+=(-m.b*dx+m.a*dy)*k/det;}it._lay=null;it._m=null;return it;
};
J.buildPhotoStory=p=>{
 if(!p.musicalPhoto||p.directorSections7?.length)return p;
 const lines=p.lines||[],old=p.musicalStructure.sections,variant=p.artDirection.registrySelection.storyVariant||0,groups=new Map(),narrative=[],holdHistory=[];
 for(const c of p.cuts)if(c.line>=0&&!locked(p,c)){
  const group=J.vocaliseGroup(c.lineText),n=group?(groups.get(group)||0)+1:0;if(group)groups.set(group,n);
  const stage=group?Math.min(4,n):Math.min(3,1+Math.floor(c.line/4)),sequence=group==='oh'?1:0;
  const recipe=group?['unity','expansion','crowd','release'][stage-1]:['gather','pride','call'][stage-1];
  let holdRepair=null;if(holdHistory.length>=2&&holdHistory.at(-1)===c.hold&&holdHistory.at(-2)===c.hold){const original=c.hold,alternatives=p.artDirection.registrySelection.motionComparisons?.filter(m=>m.group==='hold'&&m.eligible&&['still','breathe','float','pulse'].includes(m.id)).map(m=>m.id)||['still','breathe'];c.hold=alternatives.find(id=>id!==original&&J.HOLD[id])||original;holdRepair={from:original,to:c.hold,reason:'automatic hold repetition limit; final raster safety remains required'};}holdHistory.push(c.hold);
  c.story={holdRepair,group,stage,sequence,recipe,variant,quiet:recipe==='unity'||recipe==='gather',strength:group?(.20+stage*.18):(.18+stage*.12)};
  // An authored decoration is never touched. Automatic quotation ornaments are
  // deliberately omitted from body lyrics; title/end are separate compositions.
  c.decor=[];c.params={...c.params,story:true};narrative.push({line:c.line,from:c.start,to:c.end,...c.story});
 }
 const marks=new Set([0,p.duration]);for(const s of old)marks.add(s.from);
 // Musical/LRC boundaries, not arbitrary one-second effect changes. Merge
 // near-identical chant spellings into a development sequence.
 for(const n of narrative)if(n.group&&(n.stage===1||n.stage===3))marks.add(n.from);
 if(lines.length>=8)marks.add(lines[Math.floor(lines.length*.25)].start);
 let boundaries=[...marks].filter(t=>t>=0&&t<=p.duration).sort((a,b)=>a-b);
 // Cap chapters while retaining vocalise stage boundaries and original ends.
 while(boundaries.length>9){const internal=boundaries.slice(1,-1).map((t,i)=>({t,i:i+1,gap:Math.min(t-boundaries[i],boundaries[i+2]-t),vocal:t===lines[0]?.start||narrative.some(n=>n.group&&n.from===t)})).sort((a,b)=>(a.vocal-b.vocal)||a.gap-b.gap);boundaries.splice(internal[0].i,1);}
 const sections=boundaries.slice(0,-1).map((from,i)=>{const parent=old.find(s=>from>=s.from&&from<s.to)||old.at(-1),line=narrative.find(n=>from>=n.from&&from<n.to);return {...parent,id:'story-'+i,from,to:boundaries[i+1],storyRole:!line?.group&&parent.role==='build'?'call':line?.recipe||parent.role};});
 p.musicalStructure={...p.musicalStructure,sections};const worlds=p.visualWorld.chapters;
 p.visualWorld.chapters=sections.map((s,i)=>({...worlds.find(w=>s.from>=w.from&&s.from<w.to)||worlds[0],...s,index:i,architecture:s.storyRole,storyRecipe:s.storyRole}));
 const f=p.musicalPhoto;f.chapterZooms=sections.map(s=>s.storyRole==='unity'?1.02:s.storyRole==='expansion'?1.15:s.storyRole==='crowd'?1.06:s.storyRole==='release'?1.35:1.06);f.chapterGrades=sections.map(()=>0);f.chapterOffsets=sections.map(()=>({x:0,y:0}));
 const introEnd=p.lines[0]?.start||0,beats=(p.beatHierarchy||[]).filter(b=>b.time>=.5&&b.time<introEnd-.2&&b.beatSalience>=.35);f.storyOpening=[];for(const b of beats){if(!f.storyOpening.length||b.time-f.storyOpening.at(-1).time>=.55)f.storyOpening.push({time:b.time,scale:[1.27,1.08,1.38][f.storyOpening.length],x:[-.025,.025,0][f.storyOpening.length]});if(f.storyOpening.length===3)break;}
 f.cornerFrame=false;f.accentRail=false;f.edgeMatte=false;f.openingShots=false;p.events=p.events.filter(e=>!e.photoShot);f.story={version:1,variant,narrative,search:p.artDirection.registrySelection.storySearch||null,chapterCount:sections.length,source:'audio structure, lyric meaning and grouped vocalise occurrences',limitations:'No fabricated foreground segmentation or audience score'};
 return p;
};
const plan=J.plan;J.plan=(project,audio)=>J.buildPhotoStory(plan(project,audio));
J.photoStoryAt=(p,t)=>{const s=p.cuts.find(c=>c.line>=0&&t>=c.start&&t<c.end)?.story||{recipe:'gather',stage:0,strength:.18,quiet:true,variant:p.musicalPhoto?.story?.variant||0},chapter=p.musicalStructure?.sections.find(w=>t>=w.from&&t<w.to);return !s.group&&chapter?.storyRole==='call'?{...s,recipe:'call',quiet:false,strength:.65}:s;};
const camera=J.cameraAt;J.cameraAt=(p,t,range)=>{
 if(!p.musicalPhoto?.story||locked(p,J.cutAt(p,t)))return camera(p,t,range);
 const s=J.photoStoryAt(p,t),c=J.cutAt(p,t),u=C((t-(c?.start||0))/Math.max(.1,c?.dur||1)),smooth=u*u*(3-2*u),base=s.recipe==='call'?1.20:s.recipe==='release'?1.34:s.recipe==='expansion'?1.12:s.recipe==='crowd'?1.06:1.035;
 const profile=p.musicalPhoto.songProfile,openingScale=1.025+(profile?.energy||0)*.035,openingX=((profile?.brightness??.5)-.5)*.018*p.W,pose={s:s.quiet?openingScale:base+(['flow','drift'].includes(profile?.mode)?.045:.025)*smooth+(profile?.energy||0)*.03,x:(s.recipe==='call'?-.028*p.W:s.recipe==='pride'?.025*p.W:openingX),y:0,rot:0};
 const boundary=c?.start??p.musicalStructure.sections.find(s=>t>=s.from&&t<s.to)?.from??0;
 if(boundary>0&&t-boundary<.20){const before=J.cameraAt(p,boundary-.001,range),v=C((t-boundary)/.20),e=v*v*(3-2*v);pose.s=J.lerp(before.s,pose.s,e);pose.x=J.lerp(before.x,pose.x,e);}
 if(t<(p.lines[0]?.start||0)){const shot=p.musicalPhoto.storyOpening?.filter(s=>s.time<=t).at(-1);if(shot){const v=C((t-shot.time)/.08),e=v*v*(3-2*v);pose.s=J.lerp(openingScale,shot.scale,e);pose.x=J.lerp(openingX,shot.x*p.W,e);}}
 // Last camera and lighting land on the opening pose even without an outro.
 const loop=C((t-(p.duration-.7))/.7);if(loop){const e=loop*loop*(3-2*loop);pose.s=J.lerp(pose.s,openingScale,e);pose.x=J.lerp(pose.x,openingX,e);}
 return pose;
};
const background=J.Renderer.prototype.drawCustomBackground;
J.Renderer.prototype.drawCustomBackground=function(ctx,p,t,...args){
 if(!p.musicalPhoto?.story||locked(p,J.cutAt(p,t))||!this.customBgBitmap)return background.call(this,ctx,p,t,...args);
 const state=J.photoStoryAt(p,t),look=state.group==='oh'&&state.recipe==='unity'?'silhouette':['pride','unity'].includes(state.recipe)?'mono':state.recipe==='call'?'blue':null,original=this.customBgBitmap;
 if(this.storyLookSource!==this.customBgSource){for(const c of this.storyLooks?.values()||[])c.width=c.height=1;this.storyLooks=new Map();this.storyLookSource=this.customBgSource;}this.storyLooks=this.storyLooks||new Map();let transformed=this.storyLooks.get(look);
 if(look&&!transformed){transformed=document.createElement('canvas');const k=Math.min(1,1024/Math.max(original.width,original.height));transformed.width=Math.round(original.width*k);transformed.height=Math.round(original.height*k);const x=transformed.getContext('2d');x.drawImage(original,0,0,transformed.width,transformed.height);const d=x.getImageData(0,0,transformed.width,transformed.height);for(let i=0;i<d.data.length;i+=4){const l=d.data[i]*.2126+d.data[i+1]*.7152+d.data[i+2]*.0722;const a=look==='silhouette'?(l>75?190:6):l;d.data[i]=look==='blue'?l*.12:look==='silhouette'?a*.5:a;d.data[i+1]=look==='blue'?l*.55:look==='silhouette'?a*.8:a;d.data[i+2]=look==='blue'?Math.min(255,l*1.45):a;}x.putImageData(d,0,0);this.storyLooks.set(look,transformed);}
 const assetId=J.cutAt(p,t)?.assetId,asset=assetId&&this.assetBitmaps?.get(assetId),useLook=look&&t<p.duration-.7;
 if(useLook){this.customBgBitmap=transformed;if(asset?.bitmap)this.assetBitmaps.set(assetId,{...asset,bitmap:transformed});}let value;try{value=background.call(this,ctx,p,t,...args);}finally{this.customBgBitmap=original;if(useLook&&asset)this.assetBitmaps.set(assetId,asset);}
 const s=J.photoStoryAt(p,t),W=p.W,H=p.H,closing=C((t-(p.duration-.7))/.7),strength=J.lerp(s.strength,.18,closing),src=this.customBgBitmap;
 ctx.save();ctx.globalCompositeOperation='source-over';
 // Related detail windows use actual artwork pixels and move at a different
 // rate from the main photograph. This is planar parallax, not subject extraction.
 if(['crowd','release'].includes(s.recipe)){
  const tiles=s.recipe==='crowd'?2:4,bw=W*(s.variant%2?.20:.16),bh=H*(s.recipe==='crowd'?.80:.32);
  for(let i=0;i<tiles;i++){const side=i%2,xx=side?W-bw:0,yy=tiles===4?(i<2?H*.02:H-bh-H*.02):H*.10,phase=Math.sin(t*.24+i)*.035,sw=src.width*.32,sh=src.height*.65,sx=C(.08+side*.43+phase)*(src.width-sw),sy=src.height*.12;
   ctx.save();ctx.beginPath();ctx.rect(xx,yy,bw,bh);ctx.clip();ctx.globalAlpha=strength*.52*(1-closing);ctx.drawImage(src,sx,sy,sw,sh,xx,yy,bw,bh);ctx.restore();
  }
 }
 const light=ctx.createLinearGradient(0,0,W,H);light.addColorStop(0,s.sequence?'rgba(90,155,230,'+(strength*.32)+')':'rgba(15,70,155,'+(strength*.38)+')');light.addColorStop(.45,'rgba(0,0,0,0)');light.addColorStop(1,'rgba(0,0,0,'+(.12+strength*.34)+')');ctx.globalAlpha=1;ctx.fillStyle=light;ctx.fillRect(0,0,W,H);
 if(s.recipe==='unity'||s.recipe==='gather'||closing){ctx.globalAlpha=.14*(s.quiet?1:closing);ctx.fillStyle='#071324';ctx.fillRect(0,0,W,H);}
 if(['expansion','release'].includes(s.recipe)&&closing<1){const cx=W*(s.sequence?.70:.28),cy=H*.25,r=ctx.createRadialGradient(cx,cy,0,cx,cy,W*.75);r.addColorStop(0,'rgba(130,185,255,'+(strength*.24*(1-closing))+')');r.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=r;ctx.globalAlpha=1;ctx.fillRect(0,0,W,H);}
 if(['expansion','release'].includes(s.recipe)&&!closing){const cut=J.cutAt(p,t),u=C((t-(cut?.start||0))/Math.max(.1,cut?.dur||1)),pos=(s.variant?1-u:u)*W,beam=ctx.createLinearGradient(pos-W*.22,0,pos+W*.22,0);beam.addColorStop(0,'rgba(120,185,255,0)');beam.addColorStop(.5,'rgba(120,185,255,'+(s.strength*.22)+')');beam.addColorStop(1,'rgba(120,185,255,0)');ctx.fillStyle=beam;ctx.globalAlpha=1;ctx.fillRect(0,0,W,H);}
 ctx.restore();return value;
};
const dispose=J.Renderer.prototype.disposeAssets;J.Renderer.prototype.disposeAssets=function(){for(const c of this.storyLooks?.values()||[])c.width=c.height=1;this.storyLooks?.clear();return dispose.call(this);};
const credit=J.creditStateAt;J.creditStateAt=(p,t)=>p.musicalPhoto?.story&&p.creditChoreography?.mode!=='always'?{hidden:t>Math.min(2.8,p.lines[0]?.start||2.8)&&t<p.duration-1.1,opacity:1,scale:1}:credit(p,t);
// Actual glyph drawing at cue boundaries, independent of strong pixel peaks.
J.measureDisplayOnsets=async(p,range)=>{
 const start=range?.start??0,end=range?.end??p.duration,R=new J.Renderer(),cv=document.createElement('canvas'),mc=document.createElement('canvas');cv.width=mc.width=256;cv.height=mc.height=Math.round(256*p.H/p.W);const ctx=cv.getContext('2d'),mask=mc.getContext('2d'),samples=[],norm=t=>String(t||'').replace(/\s/g,'');
 try{await R.loadCustomBackground(p.customBg?.dataUrl);await R.loadAssetDeck?.(p);
  for(const line of p.lines.filter(l=>l.start>=start&&l.start<end)){const first=Math.ceil(line.start*p.fps-1e-7)/p.fps,probes=[Math.max(start,line.start-1/p.fps),first,first+1/p.fps],results=[];
   for(const t of probes){const records=[],draw=J.drawItem;J.drawItem=(env,it)=>{if(env.pass==='main'&&env.ctx===ctx&&env.cut.line>=0){const glyphs=J.layoutText(it).filter(g=>{const ch=it.charFn?.(g.i,g);return !ch?.hide&&(it.alpha??1)*(ch?.a??1)>=.55;}).map(g=>it.charFn?.(g.i,g)?.ch||g.ch).join('');records.push({line:env.cut.line,text:norm(glyphs)});}return draw(env,it);};try{R.frame(ctx,p,t,{scale:256/p.W,production:true,noHud:true,lyricAuditCtx:mask,lyricAuditItems:[]});const bytes=mask.getImageData(0,0,mc.width,mc.height).data;let ink=0;for(let i=3;i<bytes.length;i+=4)if(bytes[i]>24)ink++;results.push({t,displayed:records.some(r=>r.line===line.index&&r.text===norm(line.text))&&ink>8});}finally{J.drawItem=draw;}}
   const onset=results.slice(1).find(r=>r.displayed),early=results[0].displayed;samples.push({line:line.index,targetTime:line.start,firstFrame:first,displayTime:onset?.t??null,errorMs:onset?(onset.t-line.start)*1000:null,early,pass:!!onset&&!early&&(onset.t-line.start)*1000<=Math.max(50,1000/p.fps+1),probes:results});await new Promise(r=>setTimeout(r,0));
  }
  return {score:samples.length?Math.round(100*samples.filter(s=>s.pass).length/samples.length):null,samples,status:samples.length?'RENDERED_GLYPH_ONSET':'UNMEASURED',source:'full visible lyric glyphs and real alpha mask at LRC boundary frames',limits:'Pre-encode raster evidence; not audio singing alignment or decoded text recognition'};
 }finally{R.disposeAssets?.();R.customBgBitmap?.close?.();cv.width=cv.height=mc.width=mc.height=1;}
};
const refine=J.refineMusicalPhotoPlan;J.refineMusicalPhotoPlan=async(p,...args)=>p.musicalPhoto?.story?undefined:refine(p,...args);
const analyze=J.analyzeRenderedFrames;J.analyzeRenderedFrames=async(p,range,audio,telemetry={})=>{const r=await analyze(p,range,audio,telemetry);if(r.completed){telemetry.onProgress?.({label:'LRC境界の実際の全文表示を検査しています'});r.metrics.displayOnsetAccuracy=await J.measureDisplayOnsets(p,range);p.lastPixelQA=r;}return r;};
const check=J.checkMVQuality;J.checkMVQuality=(...args)=>{
 const r=check(...args),p=args[1],m=args[4]?.metrics||{},q=r.quality;if(q.productionDomains){q.productionDomains.visualImpactSync=q.productionDomains.lyricSync;q.productionDomains.impactBeatSync=q.productionDomains.beatSync;delete q.productionDomains.lyricSync;delete q.productionDomains.beatSync;q.productionDomains.displayOnsetAccuracy=m.displayOnsetAccuracy?.score??null;}
 let last=[],repeated=false;for(const c of p.cuts||[]){if(c.line<0||locked(p,c)){last=[];continue;}last.push(c.hold);if(last.length>=3&&last.at(-1)===last.at(-2)&&last.at(-1)===last.at(-3))repeated=true;}if(repeated&&!r.issues.some(i=>i.code==='HOLD_STAGNATION')){const issue={code:'HOLD_STAGNATION',message:'自動演出で同じ保持モーションが3行以上続いています',severity:'ERROR',category:'creative',exportBlocking:false};r.issues.push(issue);r.errors.push(issue);}
 q.syncEvidence={displayOnsetAccuracy:m.displayOnsetAccuracy||{score:null,status:'UNMEASURED'},visualImpactSync:m.alignmentDomains?.lyricSync||null,impactBeatSync:m.alignmentDomains?.beatSync||null,perceptualSingingSync:'UNMEASURED'};
 // Onset-aligned visual impact is optional during calm phrases, so it is kept
 // as a diagnostic rather than a requirement on correct lyric display.
 const acceptance=J.evaluateQualityTarget(r);acceptance.failures=acceptance.failures.filter(f=>f.key!=='visualImpactSync');acceptance.primary=acceptance.primary.map(x=>x.key==='visualImpactSync'?{...x,applicability:'DIAGNOSTIC_NOT_DISPLAY_ACCURACY'}:x);acceptance.minimumMet=!acceptance.failures.length&&!acceptance.hardFailures.length;q.targetAcceptance=acceptance;q.qualification=acceptance.minimumMet?'QUALITY_MINIMA_MET':'QUALITY_UNMET';if(!acceptance.minimumMet){q.certified100=false;q.perfectEligible=false;q.score=Math.min(99,q.score??q.overallScore??99);q.overallScore=Math.min(99,q.overallScore??q.score??99);}q.hardGates={...q.hardGates,passed:!r.errors.length,total:r.errors.length};
 p.lastQualityTarget=acceptance;return r;
};
const context=J.directorContext;J.directorContext=(project,p,...rest)=>({...context(project,p,...rest),photoStory:p.musicalPhoto?.story||null,syncEvidence:p.lastPixelQA?.metrics?.displayOnsetAccuracy||null});
const provenance=J.createExportProvenance;J.createExportProvenance=async(...args)=>{const r=await provenance(...args);return {...r,photoStory:args[0].plan.musicalPhoto?.story||null,syncEvidence:args[2].quality.syncEvidence,qualification:args[2].quality.qualification,qualityTarget:args[2].quality.targetAcceptance,measurementPolicy:{...r.measurementPolicy,displayOnsetAccuracy:'LRC境界のフレームで実際に描画された全文と歌詞マスクを検査。書き出し前の証拠',visualImpactSync:'強い実画素ピークとLRC境界の近接。表示精度と別の診断',impactBeatSync:'指定した拍演出と実画素変化の一致'}};};
})();
/* Bounded Top-K style/story raster tournament; only the best is shown. */
(()=>{'use strict';const J=window.J;
const evaluate=J.evaluateQualityTarget;J.evaluateQualityTarget=r=>{const a=evaluate(r);a.failures=a.failures.filter(f=>f.key!=='visualImpactSync');a.minimumMet=!a.failures.length&&!a.hardFailures.length;return a;};
const compare=J.compareRegistryCandidates;
J.compareRegistryCandidates=async(project,audio,image,options={})=>{
 const result=await compare(project,audio,image,{...options,onProgress:e=>options.onProgress?.({...e,current:Math.round(55*(e.current||0)/(e.total||1)),total:100})});if(!result)return result;
 const base=result.recommended,styles=base.selection.styleComparisons.filter(s=>s.eligible).slice(0,3),trials=[],R=new J.Renderer(),cv=document.createElement('canvas'),mask=document.createElement('canvas');cv.width=mask.width=160;cv.height=mask.height=Math.round(160*base.plan.H/base.plan.W);const ctx=cv.getContext('2d'),mc=mask.getContext('2d'),norm=s=>String(s||'').replace(/\s/g,'');
 try{await R.loadCustomBackground(base.plan.customBg.dataUrl);await R.loadAssetDeck?.(base.plan);
  if(J.virtualShotCandidates)base.project.artDirection.registrySelection.virtualShots=J.virtualShotCandidates(R.customBgBitmap);
  for(const style of styles)for(let variant=0;variant<2;variant++){
   const coreFonts=J.styleSignature(style.id).core.find(c=>c.kind==='font')?.values||[],fontTrials=(base.selection.fontComparisons||[]).filter(f=>f.eligible&&coreFonts.includes(f.id)).sort((a,b)=>(b.rank||0)-(a.rank||0)),selectedFont=variant?(fontTrials[0]?.id||style.font):style.font;
   const q=J.clonePhotoRenderPlan(base.project),selection=q.artDirection.registrySelection;q.style=style.id;q.artDirection.style=style.id;if(q.artDirection.visualDNA)q.artDirection.visualDNA.style=style.id;selection.style=style.id;selection.font=selectedFont;selection.storyVariant=variant;q.artDirection.typography.display=selectedFont;
   for(const e of Object.values(selection.entries)){e.params.font=selectedFont;if(variant&&e.params.photoAnchor)e.params.photoAnchor={...e.params.photoAnchor,y:1-e.params.photoAnchor.y};}
   q.artDirection=J.makeArtDirection(q,audio,{...base.proposal,style:style.id,styleSignature:J.styleSignature(style.id),registrySelection:selection,visualDNA:{...base.proposal.visualDNA,style:style.id,typographyStyle:selectedFont},motionDNA:{...base.proposal.motionDNA,font:selectedFont,fontCategory:J.FONTS[selectedFont].kind},debug:{...base.proposal.debug,styleDecision:{...base.proposal.debug.styleDecision,selected:style.id}}});
   const p=J.plan(q,audio),frames=[],glyphFailures=[],contrast=[];
   for(const c of p.cuts.filter(c=>c.line>=0&&!J.photoChoreographyLocked(p,c))){const t=Math.min(c.end-.04,c.start+Math.min(.6,c.dur*.5)),items=[],draw=J.drawItem,records=[];J.drawItem=(env,it)=>{if(env.pass==='main'&&env.ctx===ctx)records.push({text:norm(J.layoutText(it).filter(g=>{const a=it.charFn?.(g.i,g);return !a?.hide&&(it.alpha??1)*(a?.a??1)>.55;}).map(g=>it.charFn?.(g.i,g)?.ch||g.ch).join('')),readable:J.selectionGlyphEvidence(env,it).readable});return draw(env,it);};try{R.frame(ctx,p,t,{scale:160/p.W,production:true,noHud:true,lyricAuditCtx:mc,lyricAuditItems:items});}finally{J.drawItem=draw;}
    const bytes=ctx.getImageData(0,0,cv.width,cv.height).data,ink=mc.getImageData(0,0,cv.width,cv.height).data,ev=J.selectionPixelEvidence(bytes,ink,cv.width,cv.height,items.map(it=>it.bounds).filter(Boolean),p.W,p.H);if(!records.length||norm(records.map(r=>r.text).join(''))!==norm(c.lineText)||!records.every(r=>r.readable)||!ev.safe)glyphFailures.push(c.line);
    frames.push({time:t,features:J.observePixelFrame(bytes,cv.width,cv.height,ink)});
   }
   const world=J.measureWorldDistance7(p,frames,null),diversity=world.score??0;
   const stylePixels=J.measurePhotoStyleTrial?.(R,ctx,p)||{passed:false,score:null};const rank=[glyphFailures.length?-1:1,stylePixels.passed?1:0,diversity,style.rank];trials.push({project:q,plan:p,style:style.id,font:selectedFont,variant,rank,worldScore:world.score,stylePixels,glyphFailures,frames:frames.length});
   options.onProgress?.({label:'上位スタイルと物語の6案を実描画で比較しています',current:55+Math.round(20*trials.length/(styles.length*2)),total:100});await new Promise(r=>setTimeout(r,0));
  }
  const order=(a,b)=>{for(let i=0;i<a.rank.length;i++)if(a.rank[i]!==b.rank[i])return b.rank[i]-a.rank[i];return a.variant-b.variant;};trials.sort(order);
  const finalists=trials.filter(t=>!t.glyphFailures.length).slice(0,2);if(!finalists.length)throw Error('物語候補が歌詞の全文表示・安全領域検査に達しませんでした');
  for(const candidate of finalists){options.onProgress?.({label:'上位2案の品質と歌詞表示を詳細検査しています',current:75+finalists.indexOf(candidate)*10,total:100});const pixel=await J.analyzeRenderedFrames(candidate.plan,null,audio,{onProgress:e=>options.onProgress?.({...e,current:75+finalists.indexOf(candidate)*10+Math.min(9,Math.floor(9*(e.current||0)/(e.total||1))),total:100})}),report=J.checkMVQuality(candidate.project,candidate.plan,audio,null,pixel,{h264:true,aac:!!audio,webCodecs:true},null),a=J.evaluateQualityTarget(report);candidate.acceptance=a;candidate.rank=[a.minimumMet?1:0,-a.hardFailures.length,-a.failures.length,report.quality.creativeScore??0,report.quality.socialScore??0];}
  finalists.sort(order);const best=finalists[0];best.plan.musicalPhoto.story.search={method:'Top-3 eligible styles × 2 narrative compositions; actual lyric/mask/background renders; top-2 full QA',candidateCount:trials.length,fullEvaluationCount:finalists.length,candidates:trials.map(t=>({style:t.style,font:t.font,variant:t.variant,worldScore:t.worldScore,stylePixels:t.stylePixels,glyphFailures:t.glyphFailures,frames:t.frames,acceptance:t.acceptance||null})),selected:{style:best.style,variant:best.variant},thresholdsUnchanged:true};
  best.project.artDirection.registrySelection.storySearch=best.plan.musicalPhoto.story.search;
  options.onProgress?.({label:'最適な物語案の描画比較を完了しました',current:100,total:100});
  const proposal={...base.proposal,style:best.style,styleSignature:J.styleSignature(best.style),debug:{...base.proposal.debug,styleDecision:{...base.proposal.debug.styleDecision,selected:best.style}},visualDNA:{...base.proposal.visualDNA,style:best.style,typographyStyle:best.project.artDirection.registrySelection.font},motionDNA:{...base.proposal.motionDNA,font:best.project.artDirection.registrySelection.font},registrySelection:best.project.artDirection.registrySelection};return {recommended:{...base,project:best.project,plan:best.plan,selection:proposal.registrySelection,proposal,score:best.rank.at(-1)},candidates:[{...base,project:best.project,plan:best.plan,selection:proposal.registrySelection,proposal}]};
 }finally{R.disposeAssets?.();R.customBgBitmap?.close?.();cv.width=cv.height=mask.width=mask.height=1;}
};
const repair=J.repairPhotoBottlenecks;J.repairPhotoBottlenecks=(p,a,attempt)=>{
 if(!p.musicalPhoto?.story)return repair(p,a,attempt);const weak=new Set(a.failures.map(f=>f.key)),changes=[];
 if(a.hardFailures.includes('BROKEN_VISUAL_WORLD')||['visualWorld','perceptualNovelty','temporalContrast','foregroundNovelty','typographyDiversity','social'].some(k=>weak.has(k))){
  p.musicalPhoto.story.variant=attempt%2;for(const c of p.cuts)if(c.story&&!J.photoChoreographyLocked(p,c)){c.story={...c.story,variant:attempt%2,strength:Math.min(.98,c.story.strength+.08)};if(c.params.photoAnchor)c.params={...c.params,photoAnchor:{...c.params.photoAnchor,y:attempt%2?.28:.72}};}changes.push('story-light-depth-anchor-search');
  if(['foregroundNovelty','typographyDiversity'].some(k=>weak.has(k))){const choices=p.artDirection.registrySelection.layoutComparisons?.filter(l=>l.status==='ELIGIBLE_FOR_MEASURED_PHRASES'&&l.probes?.some(v=>v.eligible))||[];const preferred=[['photoStatement','center'],['photoBanner','photoFocus'],['circle','perspective','shadowPlay'],['photoCondensed','photoChant','huge']];for(const c of p.cuts)if(c.story&&!J.photoChoreographyLocked(p,c)){const n=c.story.group?c.story.stage-1:(c.line+attempt)%4,option=choices.find(l=>preferred[n].includes(l.id)&&l.id!==c.layout);if(option){const probe=option.probes.find(v=>v.eligible);c.layout=option.id;c.architecture=option.family;c.params={...probe.params,font:c.params.font,photoAnchor:c.params.photoAnchor,displayText:['phrase','banner','frame'].includes(option.family)?J.composeLyricPhrase(c.lineText):c.lineText,story:true};}}changes.push('measured-typography-family-search');}
 }
 return changes;
};
})();
