/* Bounded glyph-footprint evidence. This measures pixels; it does not certify legibility. */
(()=>{'use strict';const J=window.J,cache=new WeakMap();
const linear=v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;};
const luminance=(a,i)=>.2126*linear(a[i])+.7152*linear(a[i+1])+.0722*linear(a[i+2]);
const quantile=(a,p)=>{if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y);return s[Math.floor((s.length-1)*p)];};
J.glyphFootprintContrast=(background,rendered,mask,width,height)=>{
 const bg=[],fg=[],contrast=[],predicted=[],white=[];
 // A fully opaque centre plus its four neighbours excludes antialiased contours.
 for(let y=1;y<height-1;y++)for(let x=1;x<width-1;x++){
  const i=(y*width+x)*4;if([i,i-4,i+4,i-width*4,i+width*4].some(j=>mask[j+3]<230))continue;
  const b=luminance(background,i),f=luminance(rendered,i);bg.push(b);fg.push(f);contrast.push((Math.max(b,f)+.05)/(Math.min(b,f)+.05));predicted.push((.94+.05)/(b+.05));white.push(rendered[i]>=220&&rendered[i+1]>=220&&rendered[i+2]>=220?1:0);
 }
 const n=bg.length;if(n<8)return {measured:false,status:'INSUFFICIENT_INTERIOR_PIXELS',interiorPixels:n};
 return {measured:true,interiorPixels:n,backgroundLuminanceP90:quantile(bg,.9),renderedGlyphLuminanceP10:quantile(fg,.1),renderedVsBackgroundContrastP10:quantile(contrast,.1),predictedWhiteVsBackgroundContrastP10:quantile(predicted,.1),nearWhiteFraction:white.reduce((a,b)=>a+b,0)/n};
};
J.glyphContrastSamplePoints=(p,range)=>{
 const start=range?.start??0,end=range?.end??p.duration,sections=p.musicalStructure?.sections||[{from:start,to:end}],chosen=[];
 const nominalWidth=l=>{const c=p.cuts?.find(c=>c.line===(p.lines||[]).indexOf(l)),font=c?.params?.font||'gothic_bold';try{return J.measure({text:l.text,font,size:100}).w;}catch{return [...l.text].reduce((n,ch)=>n+(/[\x00-\x7f]/.test(ch)?.55:1),0);}};
 for(const s of sections){const lines=(p.lines||[]).filter(l=>l.end>Math.max(start,s.from)&&l.start<Math.min(end,s.to));const l=lines.slice().sort((a,b)=>nominalWidth(b)-nominalWidth(a)||a.start-b.start)[0];if(l&&!chosen.includes(l))chosen.push(l);}
 const lines=chosen.slice(0,4),points=[];for(const line of lines)for(const phase of [.2,.5,.8]){const from=Math.max(line.start,start),to=Math.min(line.end,end);if(to>from+.04)points.push({line:(p.lines||[]).indexOf(line),text:line.text,phase,time:from+(to-from)*phase});}return points;
};
J.measureGlyphContrastEvidence=async(p,range=null)=>{
 const points=J.glyphContrastSamplePoints(p,range),signature=JSON.stringify({range,points,W:p.W,H:p.H,bg:p.customBg&&{...p.customBg,dataUrl:undefined},cuts:p.cuts?.map(c=>({line:c.line,start:c.start,end:c.end,layout:c.layout,params:c.params,backgroundScene:c.backgroundScene,treat:c.treat,cam:c.cam})),world:p.visualWorld,musicalPhoto:p.musicalPhoto,fx:p.fx,events:p.events,hype:p.hypeTimeline,style:p.style,direction:p.artDirection,overrides:p.directionOverrides7,titleDisplay:p.titleDisplay});
 const previous=cache.get(p);if(previous?.signature===signature&&previous.background===p.customBg?.dataUrl)return previous.result;
 const result={measured:false,method:'rendered-main pixels / background-only pixels / eroded opaque lyric audit mask',backgroundDomain:'Background before lyric scrims and foreground overlays',width:192,maxSamples:12,samples:[],limitations:['Low resolution and erosion can miss thin glyphs.','Regional and glyph contrast are engineering evidence, not perceptual reading or artistic certification.','Background control omits lyric scrims; its contrast values are not final composite contrast.','Longest nominal glyph width per up to four sections; not exhaustive.']};
 const R=new J.Renderer(),w=192,h=Math.min(384,Math.max(48,Math.round(w*p.H/p.W))),canvas=document.createElement('canvas'),mask=document.createElement('canvas');canvas.width=mask.width=w;canvas.height=mask.height=h;const ctx=canvas.getContext('2d',{willReadFrequently:true}),mc=mask.getContext('2d',{willReadFrequently:true});result.height=h;
 try{
  if(p.customBg?.enabled&&p.customBg.dataUrl)await R.loadCustomBackground(p.customBg.dataUrl);await R.loadAssetDeck?.(p);
  for(const point of points){ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,w,h);R.frame(ctx,p,point.time,{scale:w/p.W,production:true,backgroundOnly:true,noPost:true,noHud:true});const background=ctx.getImageData(0,0,w,h).data;
   mc.setTransform(1,0,0,1,0,0);mc.clearRect(0,0,w,h);R.frame(ctx,p,point.time,{scale:w/p.W,production:true,lyricAuditCtx:mc,lyricAuditItems:[]});const rendered=ctx.getImageData(0,0,w,h).data,bytes=mc.getImageData(0,0,w,h).data;result.samples.push({...point,...J.glyphFootprintContrast(background,rendered,bytes,w,h)});
  }
  const measured=result.samples.filter(s=>s.measured);result.measured=measured.length>0;result.measuredSamples=measured.length;result.status=result.measured?'MEASURED':'NO_MEASURABLE_GLYPH_INTERIORS';
 }catch(error){result.status='ANALYSIS_UNAVAILABLE';result.reason=String(error?.message||error);}finally{R.customBgBitmap?.close?.();R.disposeAssets?.();canvas.width=mask.width=1;canvas.height=mask.height=1;}
 cache.set(p,{signature,background:p.customBg?.dataUrl,result});return result;
};
J.getGlyphContrastEvidence=p=>cache.get(p)?.result||{measured:false,status:'NOT_MEASURED'};
const analyze=J.analyzeRenderedFrames;J.analyzeRenderedFrames=async(p,range,audio,telemetry={})=>{const result=await analyze(p,range,audio,telemetry);if(!result?.completed)return result;try{const evidence=await J.measureGlyphContrastEvidence(p,range);result.metrics=result.metrics||{};result.metrics.glyphContrast=evidence;}catch(error){result.metrics=result.metrics||{};result.metrics.glyphContrast={measured:false,status:'ANALYSIS_UNAVAILABLE',reason:String(error?.message||error)};}return result;};
const provenance=J.createExportProvenance;if(provenance)J.createExportProvenance=async(...args)=>({...await provenance(...args),glyphContrastEvidence:J.getGlyphContrastEvidence(args[0]?.plan)});
const context=J.directorContext;if(context)J.directorContext=(project,p,...args)=>({...context(project,p,...args),glyphContrastEvidence:J.getGlyphContrastEvidence(p)});
})();
