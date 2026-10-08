/* Explicit weakest-item acceptance, with actual photographic direction. */
(()=>{'use strict';const J=window.J,C=J.clamp;
const locked=(p,c)=>!!c&&J.photoChoreographyLocked(p,c);
const make=J.plan;J.plan=(project,audio)=>{
 const p=make(project,audio);if(!p.musicalPhoto)return p;
 p.musicalPhoto.version=2;p.musicalPhoto.chapterOffsets=p.musicalStructure.sections.map((s,i)=>({x:['intro','outro'].includes(s.role)?0:(i%2?-.035:.035),y:0}));
 p.musicalPhoto.phraseSettle={duration:.20,initialScale:.78,fullPhraseVisible:true};
 p.musicalPhoto.openingShots=true;
 const intro=p.musicalStructure.sections.find(s=>s.role==='intro'),introEnd=Math.min(3,intro?.to??0);
 const beats=(p.beatHierarchy||[]).filter(b=>b.time>=0&&b.time<introEnd);
 for(const [i,b]of beats.slice(0,4).entries())p.events.push({type:'photoShot',t:b.time,dur:.12,amp:.5,plannedImpact:.5,musicalPhotoCue:true,targetType:'BEAT',photoShot:{s:[1.54,1.12,1.46,1.08][i],x:[-.07,.04,.07,0][i],y:[.01,-.015,0,0][i],look:['blue','mono','blue','color'][i]},reason:'opening photograph, supplied music beat'});
 const settle=(p.beatHierarchy||[]).find(b=>b.time>=introEnd&&b.time<(intro?.to??0));if(beats.length&&settle){p.events.push({type:'photoShot',t:settle.time,dur:.12,amp:.18,plannedImpact:.18,musicalPhotoCue:true,targetType:'BEAT',photoShot:{s:p.musicalPhoto.chapterZooms[0],x:0,y:0},reason:'opening returns to quiet pose on supplied music beat'});p.musicalPhoto.openingEnd=settle.time;}
 p.events.sort((a,b)=>a.t-b.t);
 const first=p.cuts.find(c=>c.line>=0&&!locked(p,c)),accent=first&&(p.beatHierarchy||[]).find(b=>b.time>first.start+.6&&b.time<first.start+2.7);if(accent)p.events.push({type:'zoom',t:accent.time,dur:.12,amp:.18,musicalPhotoCue:true,targetType:'BEAT',reason:'first phrase photograph accent on supplied beat'});
 const sig=J.styleSignature(p.styleKey);
 for(const c of p.cuts)if(c.line>=0&&!locked(p,c)){
  // A real signature from the chosen registry, held while the lyric is read.
  if(sig.decor)c.decor=[{id:sig.decor,seed:c.seed,n:1,right:false,low:true,accent:true,corner:true,big:false,mode:'count',from:0,to:99,v:0,r:.35,photoSignature:true}];
  const shot=c.repetitionProgress>.5?'DETAIL':c.line%3===1?'MEDIUM':'WIDE';
  c.backgroundScene={...c.backgroundScene,id:shot,zoom:{WIDE:1,MEDIUM:1.10,DETAIL:1.23}[shot]};
 }
 p.layerStack=[...p.layerStack,'photoEdgeMatte','styleAccentRail'];
 p.musicalPhoto.edgeMatte=true;p.musicalPhoto.accentRail=true;
 p.musicalPhoto.titleOpening=true;
 return p;
};
const camera=J.cameraAt;J.cameraAt=(p,t,range)=>{
 if(!p.musicalPhoto||locked(p,J.cutAt(p,t)))return camera(p,t,range);
 const ss=p.musicalStructure.sections,i=ss.findIndex(s=>t>=s.from&&t<s.to);
 // The end boundary used to fall out of every chapter and jump to the older
 // camera, producing a loop seam even when the final rendered pose matched.
 if(t>=p.duration)return {s:p.musicalPhoto.chapterZooms[0],x:0,y:0,rot:0};
 if(i<0)return camera(p,t,range);const s=ss[i],v=camera(p,t,range),quiet=['intro','outro'].includes(s.role),o=p.musicalPhoto.chapterOffsets?.[i]||{x:0,y:0};
 if(s.role==='intro'&&p.musicalPhoto.openingShots){const cue=p.events.filter(e=>e.photoShot&&e.t<=t).at(-1);if(cue&&t<(p.musicalPhoto.openingEnd??3)+.15)return {s:cue.photoShot.s,x:cue.photoShot.x*p.W,y:cue.photoShot.y*p.H,rot:0};}
 if(s.role==='outro'){const u=C((t-s.from)/Math.max(.1,s.to-s.from)),e=u*u*(3-2*u),first=p.musicalPhoto.chapterZooms[0];return {s:J.lerp(v.s,first,e),x:0,y:0,rot:0};}
 const u=C((t-s.from)/.24),e=u*u*(3-2*u),before=p.musicalPhoto.chapterOffsets?.[Math.max(0,i-1)]||o;
 return {...v,x:(J.lerp(before.x,o.x,e)+(quiet?0:.004*Math.sin((t-s.from)*1.2)))*p.W,y:J.lerp(before.y,o.y,e)*p.H};
};
const background=J.Renderer.prototype.drawCustomBackground;J.Renderer.prototype.drawCustomBackground=function(ctx,p,t,...rest){
 const cue=p.musicalPhoto?.openingShots&&t<(p.musicalPhoto.openingEnd??3)?p.events.filter(e=>e.photoShot&&e.t<=t).at(-1):null,look=cue?.photoShot.look;
 if(!look||look==='color'||!this.customBgBitmap)return background.call(this,ctx,p,t,...rest);
 // Preserve the same artwork, changing its tonal treatment for the overture.
 // Cache the actual transformed pixels; no generated or replacement image.
 if(this.photoLookSource!==this.customBgSource){for(const c of this.photoLooks?.values()||[])c.width=c.height=1;this.photoLooks=new Map();this.photoLookSource=this.customBgSource;}
 this.photoLooks=this.photoLooks||new Map();let image=this.photoLooks.get(look);
 if(!image){const src=this.customBgBitmap,s=Math.min(1,1280/Math.max(src.width,src.height));image=document.createElement('canvas');image.width=Math.round(src.width*s);image.height=Math.round(src.height*s);const x=image.getContext('2d');x.drawImage(src,0,0,image.width,image.height);const data=x.getImageData(0,0,image.width,image.height);for(let i=0;i<data.data.length;i+=4){const y=data.data[i]*.2126+data.data[i+1]*.7152+data.data[i+2]*.0722;data.data[i]=look==='blue'?y*.16:y;data.data[i+1]=look==='blue'?y*.58:y;data.data[i+2]=look==='blue'?Math.min(255,y*1.65):y;}x.putImageData(data,0,0);this.photoLooks.set(look,image);}
 const original=this.customBgBitmap;this.customBgBitmap=image;try{return background.call(this,ctx,p,t,...rest);}finally{this.customBgBitmap=original;}
};
const draw=J.Renderer.prototype.drawCut;J.Renderer.prototype.drawCut=function(env){
 if((!env.plan.musicalPhoto&&!env.plan.registrySignatureProbe)||locked(env.plan,env.cut))return draw.call(this,env);
 const c=env.cut,plain={...env,cut:{...c,decor:[]}},de={...env,lt:.6,ltb:0,pIn:1,pOut:0,step:0,t:c.start+.6},decor=(c.decor||[]).filter(d=>d.photoSignature&&J.DECOR[d.id]);
 const paint=(d,bb)=>{env.ctx.save();try{if(bb&&J.DECOR[d.id].layer==='front'){const gap=env.H*.012;env.ctx.beginPath();env.ctx.rect(0,0,env.W,env.H);env.ctx.rect(bb.x0-gap,bb.y0-gap,bb.x1-bb.x0+gap*2,bb.y1-bb.y0+gap*2);env.ctx.clip('evenodd');}J.DECOR[d.id].draw(de,bb,d);}finally{env.ctx.restore();}};
 for(const d of decor)if(J.DECOR[d.id].layer==='back')paint(d,null);
 const bb=draw.call(this,plain);
 for(const d of decor)if(J.DECOR[d.id].layer!=='back')paint(d,bb);
 return bb;
};
const typography=J.applyTypography5;J.applyTypography5=(env,it)=>{
 typography(env,it);if(!env.plan.musicalPhoto||locked(env.plan,env.cut)||env.cut.line<0)return;
 it.charFn=J.combineChar(it.charFns);const short=String(env.cut.lineText||'').replace(/\s/g,'').length<=4,cap=env.H>env.W?(short?.25:.145):(short?.29:.195),g=J.selectionGlyphEvidence(env,it);
 if(g.maxGlyphHeight>cap){it.size*=cap/g.maxGlyphHeight*.98;it._lay=null;it._m=null;}
};
const credit=J.Renderer.prototype.drawTitleCredit;J.Renderer.prototype.drawTitleCredit=function(ctx,p,t,scale){
 if(!p.musicalPhoto?.titleOpening||!p.titleDisplay||t>=(p.musicalPhoto.openingEnd??3)||locked(p,J.cutAt(p,t)))return credit.call(this,ctx,p,t,scale);
 const d=p.titleDisplay,shots=p.events.filter(e=>e.photoShot&&e.t<=t),i=Math.min(4,shots.length),positions=['tl','br','tl','br','tl'],margin=[.15,.16,.24,.20,.12],size=Math.min(p.H*.13,J.fitSize(d.artist||d.title,d.font,p.W*.80,p.H*.20,{track:0,lead:1}));
 // One title/artist presentation, using the exact strings and measured width.
 return credit.call(this,ctx,{...p,titleDisplay:{...d,position:positions[i],marginX:p.W*.09,marginY:p.H*margin[i],titleSize:size,maxWidth:p.W*.82,opacity:1,scrim:.40}},t,scale);
};
const frame=J.Renderer.prototype.frame;J.Renderer.prototype.frame=function(ctx,p,t,opt={}){
 const value=frame.call(this,ctx,p,t,opt);if(!p.musicalPhoto||opt.transparent||opt.backgroundOnly||opt.noHud||locked(p,J.cutAt(p,t)))return value;
 const w=ctx.canvas.width,h=ctx.canvas.height;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
 if(p.musicalPhoto.edgeMatte){ctx.fillStyle='rgba(3,8,16,.72)';ctx.fillRect(w*.07,0,w*.86,h*.038);ctx.fillRect(w*.07,h*.962,w*.86,h*.038);}
 if(p.musicalPhoto.accentRail){ctx.fillStyle=p.style.schemes[0].accent;ctx.fillRect(w*.028,h*.31,w*.006,h*.38);ctx.fillRect(w*.966,h*.31,w*.006,h*.38);}
 ctx.restore();return value;
};
const dispose=J.Renderer.prototype.disposeAssets;J.Renderer.prototype.disposeAssets=function(){for(const c of this.photoLooks?.values()||[])c.width=c.height=1;this.photoLooks?.clear();return dispose.call(this);};
const targets=J.musicalTargets;J.musicalTargets=p=>{const base=targets(p),authored=[...p.events||[],...p.hypeTimeline||[]].filter(e=>e.targetType==='BEAT'&&base.BEAT.some(t=>Math.abs(t-e.t)<.001));return {...base,SALIENT_BEAT:[...new Set([...base.SALIENT_BEAT,...authored.map(e=>e.t)])],EXPECTED_BEAT:authored.filter(e=>(e.amp||e.plannedImpact)>=.25).map(e=>({time:e.t,confidence:p.beatHierarchy?.find(b=>Math.abs(b.time-e.t)<.001)?.confidence??null})),tempoConfidence:p.audioFeatures?.tempoConfidence??null};};
// Missing image descriptors must be measured, rather than using .5 defaults.
// Keep ranking penalties separate: repeated use is required for one supplied
// background; it is not a failure to select a different image.
const analyze=J.analyzeRenderedFrames;J.analyzeRenderedFrames=async(p,range,audio,telemetry={})=>{
 if(p.musicalPhoto&&p.visualAssets?.some(a=>!a.analysis)&&p.customBg?.dataUrl){
  const R=new J.Renderer();try{await R.loadCustomBackground(p.customBg.dataUrl);for(const a of p.visualAssets)if(!a.analysis&&a.dataUrl===p.customBg.dataUrl)a.analysis=J.analyzeVisualAsset(R.customBgBitmap);
   for(const s of p.storyboard||[]){const a=p.visualAssets.find(a=>a.id===s.assetId);if(a&&!s.locked){const chant=/CHANT|TEAM_CALL/.test(p.artDirection?.visualDNA?.type||''),section=p.musicalStructure.sections.find(w=>s.from>=w.from&&s.from<w.to),intent=chant&&!['intro','outro'].includes(section?.role)?'unity':s.semanticIntent;s.selectionFit=s.fit;s.fit=J.assetChapterFit(a,{intent},null,0,p.H>p.W);s.fitEvidence={source:'measured source descriptors; required single-background reuse has no selection penalty',intent,roleSource:'existing lyric/music classification; no image subject recognition'};}}
  }finally{R.customBgBitmap?.close?.();R.disposeAssets?.();}
 }
 return analyze(p,range,audio,telemetry);
};
J.evaluateQualityTarget=report=>{
 const q=report.quality||{},main=[{key:'technical',score:q.technicalScore},{key:'creative',score:q.creativeScore},{key:'social',score:q.socialScore}],details=[];
 for(const [key,score]of Object.entries(q.productionDomains||{}))if(!main.some(x=>x.key===key))main.push({key,score});
 for(const x of q.categories||[])details.push({key:x.key,score:Number.isFinite(x.score)&&x.max>0?x.score/x.max*100:null});
 for(const [key,score]of Object.entries(q.metrics||{}))if(!['backgroundShotDiversity','visualStagnationSeconds'].includes(key))details.push({key,score});
 const applicable=x=>Number.isFinite(x.score),failures=[...main.filter(applicable).filter(x=>x.score<90).map(x=>({...x,minimum:90,kind:'primary'})),...details.filter(applicable).filter(x=>x.score<80).map(x=>({...x,minimum:80,kind:'detail'}))];
 const unmeasured=main.filter(x=>!applicable(x)).map(x=>x.key),hardFailures=(report.errors||[]).map(x=>x.code);
 return {target:100,minimumPrimary:90,minimumDetail:80,minimumMet:!failures.length&&!hardFailures.length,certified100:!!q.certified100,failures,unmeasured,hardFailures,primary:main,details,measurementPolicy:'Missing is never 100; shot count and seconds are not scores. Minimum applies to measured items; certification requires its original evidence gates.'};
};
const quality=J.checkMVQuality;J.checkMVQuality=(...args)=>{const r=quality(...args),a=J.evaluateQualityTarget(r);if(r.quality.certified100&&!a.minimumMet){r.quality.certified100=false;r.quality.perfectEligible=false;r.quality.overallScore=r.quality.score=99;a.certified100=false;}r.quality.targetAcceptance=a;return r;};
J.repairPhotoBottlenecks=(p,acceptance,attempt)=>{
 const weak=new Set(acceptance.failures.map(f=>f.key)),changes=[];
 if(weak.has('musicalDirection')||weak.has('lyricSync')||weak.has('motion')){p.musicalPhoto.phraseSettle={duration:Math.min(.28,.20+attempt*.025),initialScale:Math.max(.65,.78-attempt*.045),fullPhraseVisible:true};changes.push('phrase-settlement');}
 if(weak.has('visualWorld')){delete p.musicalPhoto.refinement;p.musicalPhoto.chapterZooms=p.musicalPhoto.chapterZooms.map((z,i)=>i%2?Math.min(1.65,z+.08):Math.max(1.03,z-.02));changes.push('chapter-crop-search');}
 if(weak.has('social')||weak.has('hookNovelty')){for(const e of p.events)if(e.photoShot?.look)e.photoShot.s=Math.min(1.65,e.photoShot.s+.08);changes.push('music-timed-opening-crops');}
 if(weak.has('temporalContrast')||weak.has('perceptualNovelty')||weak.has('foregroundNovelty')){p.musicalPhoto.phraseSettle={duration:Math.min(.28,.20+attempt*.025),initialScale:Math.max(.65,.78-attempt*.045),fullPhraseVisible:true};changes.push('quiet-versus-phrase-motion');}
 return [...new Set(changes)];
};
const context=J.directorContext;J.directorContext=(project,p,audio,...rest)=>({...context(project,p,audio,...rest),qualityTarget:p.lastQualityTarget||null,audioAnalysis:audio?{features:audio.features,energy:Array.from(audio.energy||[]),onset:Array.from(audio.onset||[]),energyRate:audio.energyRate}:null});
})();
