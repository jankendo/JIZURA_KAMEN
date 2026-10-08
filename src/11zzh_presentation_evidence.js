/* Repeated text masks, including a same-presentation render control. No aesthetic score. */
(()=>{'use strict';const J=window.J,cache=new WeakMap();
J.comparePresentationMasks=(a,b,w,h)=>{
 let union=0,intersection=0,diff=0,aa=0,bb=0,ay0=h,ay1=-1,by0=h,by1=-1;
 for(let i=0;i<w*h;i++){const A=(a[i*4+3]||0)/255,B=(b[i*4+3]||0)/255,x=A>.1,y=B>.1;diff+=Math.abs(A-B);if(x||y)union++;if(x&&y)intersection++;if(x){aa++;ay0=Math.min(ay0,Math.floor(i/w));ay1=Math.max(ay1,Math.floor(i/w));}if(y){bb++;by0=Math.min(by0,Math.floor(i/w));by1=Math.max(by1,Math.floor(i/w));}}
 const ah=ay1>=ay0?ay1-ay0+1:0,bh=by1>=by0?by1-by0+1:0;
 return {measured:aa>4&&bb>4,maskIoU:union?intersection/union:null,rasterDifference:union?diff/union:null,heightRatio:ah&&bh?bh/ah:null,firstHeight:ah,secondHeight:bh,firstInkPixels:aa,secondInkPixels:bb};
};
J.presentationRepeatPairs=(p,range)=>{
 const from=range?.start??0,to=range?.end??p.duration,groups=new Map(),pairs=[];
 for(const [i,l] of (p.lines||[]).entries()){const end=l.visEnd??l.end;if(!String(l.text||'').trim()||l.start>=to||end<=from)continue;const key=String(l.text).trim(),index=l.index??i,first=groups.get(key);if(first!==undefined){pairs.push({firstLine:first,secondLine:index,text:key});if(pairs.length>=6)break;}else groups.set(key,index);}
 return pairs;
};
const fields=['layout','params','enter','enterP','exit','exitP','hold','holdP','cam','camP','trans','transP','treat','treatP','style','styleKey','architecture','semanticIntent','semanticResolved','decor','inDur','outDur','stagger','font','seed','photoExit','photoChoreography'];
const signature=p=>JSON.stringify({W:p.W,H:p.H,duration:p.duration,style:p.style,fonts:p.fonts,lines:p.lines,cuts:(p.cuts||[]).map(c=>Object.fromEntries(['line','start','end','text','lineText',...fields].map(k=>[k,c[k]]))),world:p.visualWorld,sections:p.musicalStructure?.sections,photoPolicy:p.photoCompositionPolicy,musicalPhoto:p.musicalPhoto,fx:p.fx,events:p.events,hype:p.hypeTimeline,artDirection:p.artDirection,beats:p.beats,bg:p.customBg&&{...p.customBg,dataUrl:undefined}});
J.measurePresentationVariation=async(p,range)=>{
 const key=signature(p)+'|'+JSON.stringify(range||null),background=p.customBg?.dataUrl,cached=cache.get(p);if(cached?.key===key&&cached.background===background)return cached.promise;
 const promise=(async()=>{
  const pairs=J.presentationRepeatPairs(p,range);if(!pairs.length)return {measured:false,status:'NOT_APPLICABLE_NO_REPEATED_LYRIC',pairs:[],score:null};
  const w=192,h=Math.min(384,Math.max(48,Math.round(w*p.H/p.W))),canvas=document.createElement('canvas'),mask=document.createElement('canvas');canvas.width=mask.width=w;canvas.height=mask.height=h;
  const ctx=canvas.getContext('2d'),mc=mask.getContext('2d'),R=new J.Renderer(),results=[];
  const line=index=>p.lines.find((l,i)=>(l.index??i)===index),cut=index=>(p.cuts||[]).find(c=>c.line===index);
  const at=l=>{const a=Math.max(range?.start??0,l.start),b=Math.min(range?.end??p.duration,l.visEnd??l.end);return (a+b)/2;};
  const snap=(plan,t)=>{R.frame(ctx,plan,t,{scale:w/p.W,production:true,range,lyricAuditCtx:mc,lyricAuditItems:[]});return new Uint8ClampedArray(mc.getImageData(0,0,w,h).data);};
  try{
   if(background&&p.customBg?.enabled)await R.loadCustomBackground(background);await R.loadAssetDeck?.(p);
   for(const pair of pairs){const a=line(pair.firstLine),b=line(pair.secondLine),reference=cut(pair.firstLine);if(!a||!b||!reference)continue;
    const A=snap(p,at(a)),B=snap(p,at(b)),control={...p,cuts:(p.cuts||[]).map(c=>c.line===pair.secondLine?{...c,...Object.fromEntries(fields.map(k=>[k,reference[k]])),params:{...reference.params},line:c.line,text:c.text,lineText:c.lineText,start:c.start,end:c.end,dur:c.dur}:c)};
    const C=snap(control,at(b)),actual=J.comparePresentationMasks(A,B,w,h),baseline=J.comparePresentationMasks(A,C,w,h),extra=actual.measured&&baseline.measured?actual.rasterDifference-baseline.rasterDifference:null;
    results.push({...pair,firstTime:at(a),secondTime:at(b),actual,samePresentationControl:baseline,excessRasterDifference:extra,presentationChangeObserved:extra===null?null:extra>.025,manualStylingPresent:!!(Object.keys(p.directionOverrides7?.[pair.firstLine]||{}).length||Object.keys(p.directionOverrides7?.[pair.secondLine]||{}).length)});
    await new Promise(r=>setTimeout(r,0));
   }
   const measured=results.filter(r=>r.actual.measured&&r.samePresentationControl.measured);return {measured:measured.length>0,status:measured.length?'SAMPLED_REPEATED_LYRIC_MASKS':'INSUFFICIENT_GLYPH_PIXELS',width:w,height:h,maxPairs:6,phase:.5,pairs:results,observedChangedPairs:measured.filter(r=>r.presentationChangeObserved).length,measuredPairs:measured.length,score:null,method:'Actual repeated lyric alpha masks versus reference cut presentation transplanted into repeat timing; main plan/manual styling unchanged',limitations:['Midpoint sampling cannot establish entrance/exit motion variety','Camera and timeline differences can remain in control','Mask differences are not aesthetic or audience quality']};
  }catch(error){return {measured:false,status:'ANALYSIS_UNAVAILABLE',reason:error.message,pairs:results,score:null};}
  finally{R.customBgBitmap?.close?.();R.disposeAssets?.();canvas.width=canvas.height=mask.width=mask.height=1;}
 })();cache.set(p,{key,background,promise});return promise;
};
const analyze=J.analyzeRenderedFrames;J.analyzeRenderedFrames=async(p,range,audio,telemetry)=>{const r=await analyze(p,range,audio,telemetry);if(r.completed){r.metrics.presentationVariation=await J.measurePresentationVariation(p,range);p.lastPixelQA=r;}return r;};
J.getPresentationVariation=p=>p.lastPixelQA?.metrics?.presentationVariation??null;
const context=J.directorContext;J.directorContext=(project,p,...args)=>({...context(project,p,...args),presentationVariation:J.getPresentationVariation(p)});
const provenance=J.createExportProvenance;J.createExportProvenance=async(...args)=>({...await provenance(...args),presentationVariation:J.getPresentationVariation(args[0].plan)});
})();
