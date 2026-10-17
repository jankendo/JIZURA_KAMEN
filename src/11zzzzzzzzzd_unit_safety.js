/* Observe automatic legacy units before export; preserve source text/time/locks. */
(()=>{'use strict';const J=window.J,plain=s=>String(s??'').replace(/\s/gu,'');
J.LAYOUTS.globalReadableUnit={name:'読みやすさを保つ歌詞',special:true,plan:()=>({font:'embedded_bold'}),render(env){
 const {W,H,cut}=env,font=cut.params?.font||'embedded_bold',text=cut.text??cut.lineText,short=J.graphemes(plain(text)).length<=4,cap=H>W?(short?.15:.09):(short?.18:.12),size=Math.min(H*cap,J.fitSize(text,font,W*.72,H*.3,{track:.02,lead:1.2}));
 return J.mainDraw(env,{text,font,size,x:W/2,y:H/2,track:.02,lead:1.2,color:cut.params?.unitSafetyColor||env.sc.fg,noHold:true});
}};
// An in-place alternative preserves the existing composition and motion.
// It remains a measured proposal; the safe shipping fallback is not replaced.
J.unitSafetyItemKey=it=>JSON.stringify([it.text,it.font,it.mi??0,it.seed??null]);
const adjust=J.adjustLocalReadability;
J.adjustLocalReadability=(env,it)=>{
 let out=adjust(env,it),c=env.cut;
 if(env.pass!=='main'||!c?.params?.unitSafetyFitItems||c.locked||J.photoChoreographyLocked(env.plan,c)||!J.cinemaV5.isPrimaryInternalLyric(env,out))return out;
 const fit=c.params.unitSafetyFitItems.find(f=>f.itemKey===J.unitSafetyItemKey(out));
 if(fit&&Number.isFinite(fit.factor)&&fit.factor>0&&fit.factor<=1)out={...out,size:out.size*fit.factor};
 if(c.params.unitSafetyColor&&!env.plan.manualLyricColor){const fn=out.charFn,color=c.params.unitSafetyColor;out={...out,color,gradient:null,charFn:fn?(...args)=>{const v=fn(...args);return v?{...v,color}:v;}:fn};}
 return out;
};
// SNS reediting runs through several legacy directors. Preserve every source
// unit of a user-controlled line after the complete stack, before any export.
const makeSocial=J.createSocialHookPlan;
if(makeSocial)J.createSocialHookPlan=(source,candidate)=>{
 const lines=new Set((source.cuts||[]).filter(c=>c.locked||J.photoChoreographyLocked(source,c)).map(c=>c.line));
 const originals=J.clonePhotoRenderPlan(source).cuts.filter(c=>lines.has(c.line)),p=makeSocial(source,candidate);
 if(lines.size){p.cuts=[...p.cuts.filter(c=>!lines.has(c.line)),...originals].sort((a,b)=>a.start-b.start);p.cuts.forEach((c,i)=>c.index=i);p.socialLockProtection={status:'SOURCE_UNITS_RESTORED',lines:[...lines],unitCount:originals.length,indexPolicy:'Only renderer array indices reassigned; source text, times and manual render properties preserved'};}
 return p;
};
J.prepareAutomaticUnitSafety=async args=>{
 const p=args.plan;if(p.musicalPhoto)return;
 const cuts=p.cuts.filter(c=>c.line>=0&&!J.cinemaV5.isInstrumentalGap(c,p)&&!c.grammar&&!c.locked&&!J.photoChoreographyLocked(p,c));if(!cuts.length)return;
 const R=new J.Renderer(),cv=document.createElement('canvas'),mask=document.createElement('canvas');cv.width=mask.width=p.cinemaDelivery?.width||p.W;cv.height=mask.height=p.cinemaDelivery?.height||p.H;const ctx=cv.getContext('2d'),mc=mask.getContext('2d'),bg=document.createElement('canvas');bg.width=cv.width;bg.height=cv.height;const bx=bg.getContext('2d'),decisions=[],preserving=[];
 const holdRange=c=>J.validLyricUnitOrigin(c)?[Math.max(c.start,c.lyricUnitOrigin.start+c.lyricUnitOrigin.inDur,c.lyricUnitOrigin.start+c.lyricUnitOrigin.transition),Math.min(c.end,c.lyricUnitOrigin.end-c.lyricUnitOrigin.outDur)]:[c.start+(c.inDur||0),c.end-(c.outDur||0)];
 const observe=c=>{const [from,to]=holdRange(c),span=Math.max(.01,to-from),times=[.2,.5,.8].map(u=>Math.min(c.end-.001,from+span*u));
  return times.map(time=>{let actual=[],geometry=[];const original=J.drawItem;J.drawItem=(env,it)=>{if(env.ctx===ctx&&env.pass==='main'&&env.cut.index===c.index&&J.cinemaV5.isPrimaryInternalLyric(env,it)){actual.push(J.layoutText(it).filter(g=>{const x=it.charFn?.(g.i,g);return !x?.hide&&(it.alpha??1)*(x?.a??1)>=.55;}).map(g=>it.charFn?.(g.i,g)?.ch||g.ch).join(''));geometry.push({...J.cinemaV5.nativeGlyphSafety(env,it),itemKey:J.unitSafetyItemKey(it)});}return original(env,it);};let items=[];try{R.frame(ctx,p,time,{scale:cv.width/p.W,production:true,noHud:true,lyricAuditCtx:mc,lyricAuditItems:items});}finally{J.drawItem=original;}
   const on=J.cinemaReferenceLuma(ctx.getImageData(0,0,cv.width,cv.height).data),alpha=J.cinemaPrimaryAlpha(mc.getImageData(0,0,cv.width,cv.height).data);const drawBackground=J.drawItem;J.drawItem=(env,it)=>env.cut?.line>=0&&J.cinemaV5.isPrimaryInternalLyric(env,it)?null:drawBackground(env,it);try{R.frame(bx,p,time,{scale:cv.width/p.W,production:true,noHud:true});}finally{J.drawItem=drawBackground;}const off=J.cinemaReferenceLuma(bx.getImageData(0,0,cv.width,cv.height).data),contrast=J.decodedGlyphContrast(on,off,alpha,cv.width,cv.height);
   return {time,contrast,complete:actual.some(text=>plain(text)===plain(c.text??c.lineText))||plain(actual.join(''))===plain(c.text??c.lineText),geometry,safe:items.every(({bounds:b})=>!b||(b.x0>=p.W*.075&&b.x1<=p.W*.925&&b.y0>=p.H*.06&&b.y1<=p.H*.94))};});};
 try{if(p.customBg?.enabled)await R.loadCustomBackground(p.customBg.dataUrl);await R.loadAssetDeck?.(p);
  for(const c of cuts){if(args.signal?.aborted)throw new DOMException('Aborted','AbortError');if(J.validLyricUnitOrigin(c)&&holdRange(c)[1]<=holdRange(c)[0])continue;const before=observe(c),passes=x=>x.every(s=>s.complete&&s.safe&&s.contrast.contrastRatio>=3&&s.contrast.score>=95&&s.geometry.length&&s.geometry.every(g=>g.readable));if(passes(before))continue;
   const previous={layout:c.layout,enter:c.enter,hold:c.hold,exit:c.exit,cam:c.cam,trans:c.trans,treat:c.treat,params:{...c.params},inDur:c.inDur,outDur:c.outDur,transDur:c.transDur,decor:c.decor};
   Object.assign(c,{layout:'globalReadableUnit',enter:'cut',hold:'still',exit:'cut',cam:'stillCamera',trans:'cut',treat:'none',decor:[],inDur:0,outDur:0,transDur:0,params:{...c.params,font:c.params?.font||'embedded_bold',sub:false}});let after=observe(c);for(const color of ['#111111','#ffffff']){if(passes(after))break;c.params.unitSafetyColor=color;after=observe(c);}if(!passes(after))Object.assign(c,previous);
   const shipping=J.clonePhotoRenderPlan(c),fits=new Map();
   for(const g of before.flatMap(s=>s.geometry))if(g.maxGlyphHeight>g.sizeCap){const factor=g.sizeCap/g.maxGlyphHeight*.97,old=fits.get(g.itemKey);if(!old||factor<old.factor)fits.set(g.itemKey,{itemKey:g.itemKey,factor});}
   const inPlaceTrials=[];
   if(fits.size){
    Object.assign(c,previous);c.params={...previous.params,unitSafetyFitItems:[...fits.values()]};
    let measured=observe(c);inPlaceTrials.push({color:null,evidence:measured});
    for(const color of p.manualLyricColor?[]:['#111111','#ffffff']){if(passes(measured))break;c.params.unitSafetyColor=color;measured=observe(c);inPlaceTrials.push({color,evidence:measured});}
    if(passes(measured))preserving.push({index:c.index,previousState:J.clonePhotoRenderPlan(previous),fullState:J.clonePhotoRenderPlan(c),nativeEvidence:measured,requiresFinalEncodedComparison:true});
    for(const key of Object.keys(c))delete c[key];Object.assign(c,shipping);
   }
   decisions.push({index:c.index,line:c.line,text:c.text,start:c.start,end:c.end,before,after,inPlaceTrials,previousState:J.clonePhotoRenderPlan(previous),adopted:passes(after),reason:'Actual automatic primary unit was incomplete, too large, colliding, low-contrast or outside safe area; thresholds unchanged'});
  }
  p.unitSafetyPreservingCandidates=preserving;p.automaticUnitSafety={status:decisions.some(d=>!d.adopted)?'UNRESOLVED':'NATIVE_PROBED',decisions,finalPixelVerification:'Required independently on the actual adopted MP4',manualLocksUntouched:true,textAndTimingUnchanged:true};
 }finally{R.disposeAssets?.();R.customBgBitmap?.close?.();cv.width=mask.width=bg.width=1;}
};
for(const key of ['exportMP4','exportMP4Fallback']){const exportVideo=J[key];if(exportVideo)J[key]=async args=>{await J.prepareAutomaticUnitSafety(args);const result=await exportVideo(args);result.provenance.automaticUnitSafety=args.plan.automaticUnitSafety??null;result.sidecar=new Blob([JSON.stringify(result.provenance,null,2)],{type:'application/json'});return result;};}
})();
