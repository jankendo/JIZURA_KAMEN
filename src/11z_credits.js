/* Shared metadata compositor. Generator decisions and source plans remain immutable. */
(()=>{'use strict';
const U=window.JIZURAUpstream;
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o||{},k);
const modes=['legacy','hybrid','ends','always','none'],positions=['auto','br','bl','tr','tl'];
J.normalizeCredits=value=>({version:1,mode:modes.includes(value?.mode)?value.mode:'hybrid',position:positions.includes(value?.position)?value.position:'auto',size:['small','standard','large'].includes(value?.size)?value.size:'standard'});
J.creditDefaults=()=>J.normalizeCredits({});
J.creditFontCSS=(role,size)=>(role==='title'?700:400)+' '+size+'px "JIZURA Noto CJK JP",sans-serif';
const ensureFonts=J.ensureFonts;
J.ensureFonts=async(text,keys,...rest)=>{await ensureFonts(text,keys,...rest);if(keys?.includes('embedded_bold')&&document.fonts?.load)await Promise.all(['title','artist'].map(role=>document.fonts.load(J.creditFontCSS(role,20),text||'曲名')));};
const defaults=J.defaultProject,migrate=J.migrateProject,plan=J.plan,fonts=J.fontsOfPlan;
J.defaultProject=()=>{const p=defaults();if(J.upstreamDefaultEnabled)p.credits=J.creditDefaults();return p;};
J.migrateProject=input=>{const p=migrate(input);if(p.sourceImport?.requiresGeneration&&!J.isUpstream(input))p.credits=J.creditDefaults();else if(own(input,'credits')&&input.credits)p.credits=J.normalizeCredits(input.credits);else delete p.credits;return p;};
J.plan=(p,a)=>{const result=plan(p,a);if(own(p,'credits')&&p.credits)result.credits={...J.normalizeCredits(p.credits),title:String(p.title||'').trim(),artist:String(p.artist||'').trim()};return result;};
J.fontsOfPlan=p=>[...new Set([...fonts(p),...(p.credits&&p.credits.mode!=='legacy'&&p.credits.mode!=='none'?['embedded_bold']:[])])];
J.historyFields.push('credits');
const facades=new WeakMap(),models=new WeakMap(),textBoxes=new WeakMap();
J.creditStats={measurements:0,textLayouts:0,draws:0};
J.creditRenderPlan=p=>{
 if(!p.credits||p.credits.mode==='legacy'||p.creditMetadataSuppressed)return p;
 let copy=facades.get(p);if(copy)return copy;
 copy={...p,title:' ',artist:'',titleDisplay:null,creditMetadataSuppressed:true,cuts:p.cuts.map(c=>{
  if(c.layout==='title'&&c.line<0)return {...c,creditSuppressed:true};
  if(c.layout==='interlude')return {...c,text:'',note:'',params:{...c.params,showTitle:false,titleText:''}};
  return c;
 })};facades.set(p,copy);return copy;
};
// Keep array indices and native transition/morph relationships intact.
for(const proto of [J.Renderer.prototype,U?.Renderer.prototype].filter(Boolean)){
 const draw=proto.drawCut;proto.drawCut=function(env,...rest){if(env.cut?.creditSuppressed)return;return draw.call(this,env,...rest);};
}
const graphemes=s=>typeof Intl.Segmenter==='function'?[...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(s)].map(x=>x.segment):Array.from(s);
function lines(ctx,text,width,maxLines){
 if(!text)return [];const units=graphemes(text.replace(/\s+/gu,' ')),out=[];let line='';
 while(units.length){const next=units.shift();if(line&&ctx.measureText(line+next).width>width){out.push(line);line='';if(out.length===maxLines){let last=out.pop();while(last&&ctx.measureText(last+'…').width>width)last=graphemes(last).slice(0,-1).join('');out.push(last+'…');return out;}}line+=next;}
 if(line)out.push(line);return out;
}
function textBox(ctx,p,large){
 const c=p.credits,fontReady=['title','artist'].map(role=>document.fonts?.check?document.fonts.check(J.creditFontCSS(role,20)):true).join(',');
 let cache=textBoxes.get(p);if(!cache){cache=new Map();textBoxes.set(p,cache);}const old=cache.get(large);
 if(old&&old.title===c.title&&old.artist===c.artist&&old.size===c.size&&old.fontReady===fontReady)return old.box;
 J.creditStats.textLayouts++;ctx.save();try{
 const unit=Math.min(p.W,p.H)/1080*(p.H>p.W?1.25:1),factor={small:.8,standard:1,large:1.25}[c.size],titleSize=(large?48:28)*unit*factor,artistSize=(large?28:20)*unit*factor;
 const pad=12*unit,gap=8*unit,maxWidth=p.W*(p.H>p.W?.76:large?.58:.38);
 ctx.font=J.creditFontCSS('title',titleSize);const title=lines(ctx,c.title,maxWidth-pad*2,2),titleWidth=Math.max(0,...title.map(s=>ctx.measureText(s).width));
 ctx.font=J.creditFontCSS('artist',artistSize);const artist=lines(ctx,c.artist,maxWidth-pad*2,1),artistWidth=Math.max(0,...artist.map(s=>ctx.measureText(s).width));
 const box={title,artist,titleSize,artistSize,pad,gap,width:Math.min(maxWidth,Math.max(titleWidth,artistWidth)+pad*2),height:title.length*titleSize*1.25+artist.length*artistSize*1.3+(title.length&&artist.length?gap:0)+pad*2};cache.set(large,{title:c.title,artist:c.artist,size:c.size,fontReady,box});return box;}finally{ctx.restore();}
}
function sites(p,box){const mx=p.W*.05,my=p.H*.05;return ['br','bl','tr','tl'].map(position=>({position,x:position[1]==='r'?p.W-mx-box.width:mx,y:position[0]==='b'?p.H-my-box.height:my,width:box.width,height:box.height}));}
const area=(a,b)=>Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
function glyphBounds(ctx,g,ratio){
 ctx.font=g.font;ctx.textAlign='center';ctx.textBaseline='middle';const m=ctx.measureText(g.ch),x=-(m.actualBoundingBoxLeft||0),y=-(m.actualBoundingBoxAscent||g.px),w=(m.actualBoundingBoxLeft||0)+(m.actualBoundingBoxRight||m.width),h=(m.actualBoundingBoxAscent||g.px)+(m.actualBoundingBoxDescent||0),t=g.m;
 const corners=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([a,b])=>[(t[0]*a+t[2]*b+t[4])/ratio,(t[1]*a+t[3]*b+t[5])/ratio]);
 const xs=corners.map(a=>a[0]),ys=corners.map(a=>a[1]);return {x:Math.min(...xs),y:Math.min(...ys),width:Math.max(...xs)-Math.min(...xs),height:Math.max(...ys)-Math.min(...ys)};
}
function placement(owner,ctx,p,cut,range){
 let cache=models.get(p);if(!cache){cache=new Map();models.set(p,cache);}
 const fontState=[...J.fontsOfPlan(p).map(k=>J.fontCSS(k,20)),J.creditFontCSS('artist',20)].map(f=>document.fonts?.check?document.fonts.check(f):true).join(',');
 const key=[cut?.index??'empty',range.start,range.end,p.credits.position,p.credits.size,fontState].join('|');if(cache.has(key))return cache.get(key);
 // Select against the largest state used in this cut, keeping its corner stable.
 const big=p.credits.mode!=='always'&&(!cut||cut.start<range.start+3||cut.end>range.end-3),box=textBox(ctx,p,big),candidates=sites(p,box);
 let bounds=[],measured=true;
 if(p.credits.position==='auto'&&cut?.line>=0){
  const cv=owner.creditMeasureCanvas??=document.createElement('canvas');cv.width=320;cv.height=Math.max(1,Math.round(320*p.H/p.W));const mx=cv.getContext('2d'),ratio=320/p.W,copy=J.creditRenderPlan(p);
  const sample=owner.creditMeasureRenderer??=new U.Renderer();
  for(const part of [.2,.5,.8]){const at=cut.start+(cut.end-cut.start)*part;J.creditStats.measurements++;
   try{
    const log=[];sample.frame(mx,copy,at,{scale:ratio,transparent:true,noPost:true,noHud:true,noGhost:true,noTrans:true,glyphLog:log,noCredits:true});bounds.push(...log.filter(g=>g.a>.1).map(g=>glyphBounds(mx,g,ratio)));

   }catch{measured=false;}
  }
 }
 const picked=p.credits.position==='auto'?candidates.map((s,index)=>({...s,index,overlap:bounds.reduce((n,b)=>n+area(s,b),0)})).sort((a,b)=>a.overlap-b.overlap||a.index-b.index)[0]:candidates.find(s=>s.position===p.credits.position);
 const result={position:picked.position,measured:measured&&(cut?.line<0||bounds.length>0||p.credits.position!=='auto'),measuredBounds:bounds.length,overlap:picked.overlap??null};cache.set(key,result);return result;
}
J.creditFrameModel=(owner,ctx,p,t,range=null)=>{
 const c=p.credits;if(!c||['legacy','none'].includes(c.mode)||(!c.title&&!c.artist))return null;
 const start=range?.start??0,end=range?.end??p.duration,duration=end-start;if(duration<=0||t<start||t>end)return null;
 const edge=Math.min(3,duration/2),local=t-start;
 let weight=c.mode==='always'?0:duration<=6?1:Math.max(Math.min(1,Math.max(0,(edge-local)/.25)),Math.min(1,Math.max(0,(local-(duration-edge))/.25)));
 if(c.mode==='ends'&&!weight)return null;
 const cut=J.cutAt(p,t),where=placement(owner,ctx,p,cut,{start,end}),baseAlpha=Math.max(0,Math.min(1,local/.25,(end-t)/.25));
 const model=(large,alpha)=>{const box=textBox(ctx,p,large),site=sites(p,box).find(s=>s.position===where.position);return {...box,...site,alpha:alpha*baseAlpha,large,measured:where.measured,measuredBounds:where.measuredBounds,overlap:where.overlap};};
 if(c.mode==='ends')return model(true,weight);
 const large=weight>=.5,result=model(large,large?weight:1-weight);
 if(weight>0&&weight<1)result.secondary=model(!large,large?1-weight:weight);
 return result;
};
J.drawCredits=(owner,ctx,p,t,opt={})=>{
 const m=J.creditFrameModel(owner,ctx,p,t,opt.range);owner.lastCreditModel=m;if(!m||!m.alpha)return;
 const scale=opt.scale||ctx.canvas.width/p.W;
 for(const layer of [m,m.secondary].filter(Boolean)){
  ctx.save();ctx.setTransform(scale,0,0,scale,0,0);ctx.globalCompositeOperation='source-over';ctx.filter='none';ctx.shadowBlur=0;ctx.globalAlpha=layer.alpha;
  ctx.fillStyle='rgba(6,8,12,.72)';const radius=Math.min(layer.pad,layer.height/4);ctx.beginPath();if(ctx.roundRect)ctx.roundRect(layer.x,layer.y,layer.width,layer.height,radius);else ctx.rect(layer.x,layer.y,layer.width,layer.height);ctx.fill();
  ctx.fillStyle='#FFFFFF';ctx.textAlign='left';ctx.textBaseline='top';let y=layer.y+layer.pad;
  ctx.font=J.creditFontCSS('title',layer.titleSize);for(const line of layer.title){ctx.fillText(line,layer.x+layer.pad,y);y+=layer.titleSize*1.25;}
  if(layer.title.length&&layer.artist.length)y+=layer.gap;ctx.font=J.creditFontCSS('artist',layer.artistSize);for(const line of layer.artist){ctx.fillText(line,layer.x+layer.pad,y);y+=layer.artistSize*1.3;}
  ctx.restore();
 }
 J.creditStats.draws++;owner.lastCreditModel=m;
};
const frame=J.Renderer.prototype.frame,dispose=J.Renderer.prototype.disposeAssets;
J.Renderer.prototype.frame=function(ctx,p,t,opt={}){const rendered=frame.call(this,ctx,J.creditRenderPlan(p),t,opt);if(!opt.noCredits&&!opt.noHud&&!opt.backgroundOnly&&!opt.glyphLog)J.drawCredits(this,ctx,p,t,opt);return rendered;};
J.Renderer.prototype.disposeAssets=function(...args){this.creditMeasureRenderer?.disposeAssets?.();this.creditMeasureRenderer=null;if(this.creditMeasureCanvas)this.creditMeasureCanvas.width=this.creditMeasureCanvas.height=1;this.creditMeasureCanvas=null;return dispose?.apply(this,args);};
const verify=J.verifyTechnicalExport;J.verifyTechnicalExport=async(r,args)=>{const result=await verify(r,args);if(args.project.credits){result.provenance.credits=J.normalizeCredits(args.project.credits);result.sidecar=new Blob([JSON.stringify(result.provenance,null,2)],{type:'application/json'});}return result;};
})();
