/* One background analysis per plan. Chapter anchors are stable, not frame-driven. */
(()=>{'use strict';const J=window.J,C=J.clamp,cache=new WeakMap();
const locked=(p,c)=>!!(Object.keys(p.directionOverrides7?.[c?.line]||{}).length||p.directorLyricDirectives7?.some(d=>d.line===c?.line)||c?.assetScene?.locked);
J.photoRegionEvidence=(rgba,w,h,box)=>{
 const xs=Math.max(1,Math.floor(box.x0*w)),xe=Math.min(w-1,Math.ceil(box.x1*w)),ys=Math.max(1,Math.floor(box.y0*h)),ye=Math.min(h-1,Math.ceil(box.y1*h));let n=0,sum=0,edge=0;const values=[];
 const lum=i=>{const f=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;return .2126*f(rgba[i]/255)+.7152*f(rgba[i+1]/255)+.0722*f(rgba[i+2]/255);};
 for(let y=ys;y<ye;y++)for(let x=xs;x<xe;x++){const i=(y*w+x)*4,v=lum(i);values.push(v);sum+=v;edge+=Math.abs(v-lum(i-4))+Math.abs(v-lum(i-w*4));n++;}
 if(!n)return {mean:0,p90:0,edge:0,cost:1};values.sort((a,b)=>a-b);const mean=sum/n,p90=values[Math.floor((n-1)*.9)],detail=edge/n;
 return {mean,p90,edge:detail,cost:mean*.55+p90*.25+Math.min(1,detail*5)*.2};
};
J.choosePhotoAnchor=(candidates,previous)=>{const rank=candidates.map(c=>({...c,selectionCost:c.cost+(previous&&Math.abs(previous.y-c.y)<.08?.025:0)})).sort((a,b)=>a.selectionCost-b.selectionCost||a.y-b.y);return rank[0];};
for(const name of ['applyVisualWorld7','applyAssetStoryboard']){const original=J[name];if(original)J[name]=function(p,...args){cache.delete(p);return original.call(this,p,...args);};}
J.getPhotoComposition=p=>cache.get(p)?.scenes||[];J.getPhotoCompositionStatus=p=>cache.get(p);J.clearPhotoComposition=p=>cache.delete(p);
// Foreground-only comparison plans share the same measured background geometry.
J.sharePhotoComposition=(source,target)=>{const state=cache.get(source);if(state&&source.W===target.W&&source.H===target.H&&source.styleKey===target.styleKey&&source.customBg?.dataUrl===target.customBg?.dataUrl)cache.set(target,state);};
const camera=J.cameraAt;
J.cameraAt=(p,t,range)=>{
 if(!p.photoCompositionPolicy||p.directorSections7?.some(s=>t>=s.from&&t<s.to&&(s.cameraIntent||s.motionIntent))||locked(p,J.cutAt(p,t)))return camera(p,t,range);
 const ss=p.musicalStructure?.sections||[],i=ss.findIndex(s=>t>=s.from&&t<s.to),s=ss[i];if(!s)return camera(p,t,range);
 // Continuous section knots develop the supplied image without switching its identity.
 // Reprises earn a closer view; quiet verses retain room around the artwork.
 const measured=!!p.artDirection?.registrySelection,knots=[{s:1.03,x:0,y:0},...ss.map((s,i)=>({s:s.role==='outro'?1.03:s.role==='intro'?1.085:measured?(s.role==='climax'?1.28:s.role==='reprise'?1.24:1.12):i%2?1.115:1.085,x:s.role==='outro'?0:(i%2?-.018:.018)*p.W,y:s.role==='outro'?0:(i%2?.009:-.009)*p.H}))];
 const a=knots[i],b=knots[i+1],u=C((t-s.from)/Math.max(.1,s.to-s.from)),e=u*u*(3-2*u);return {s:J.lerp(a.s,b.s,e),x:J.lerp(a.x,b.x,e),y:J.lerp(a.y,b.y,e),rot:0};
};
const make=J.plan;J.plan=(p,a)=>{const plan=make(p,a);plan.photoCompositionPolicy=!!plan.photoReadablePolicy;plan.photoCompositionAlgorithm='centered-glyph-readability-v2';if(plan.photoCompositionPolicy)for(const c of plan.cuts||[])if(c.line>=0&&!locked(plan,c)&&!c.photoExit){c.decor=[];if(c.layout==='type')c.params={...c.params,align:'center',prompt:false};c.inDur=Math.min(c.inDur,.16);c.stagger=Math.min(c.stagger||0,.015);}return plan;};
const frame=J.Renderer.prototype.frame;
J.Renderer.prototype.frame=function(ctx,p,t,opt){
 if(p.photoCompositionPolicy&&this.customBgBitmap&&!cache.has(p)){
  const sample=document.createElement('canvas');sample.width=192;sample.height=Math.max(48,Math.round(192*p.H/p.W));const sc=sample.getContext('2d',{willReadFrequently:true}),scenes=[];
  try{for(const section of p.musicalStructure?.sections||[]){const cuts=p.cuts.filter(c=>c.line>=0&&c.start<section.to&&c.end>section.from&&!locked(p,c));if(!cuts.length)continue;
   const candidates=[.50].map(y=>({x:.5,y,box:{x0:.11,x1:.89,y0:y-(p.H>p.W?.16:.12),y1:y+(p.H>p.W?.16:.12)},cost:0,p90:0,edge:0}));
   for(const u of [.15,.5,.85]){const time=section.from+(section.to-section.from)*u;sc.setTransform(sample.width/p.W,0,0,sample.height/p.H,0,0);sc.clearRect(0,0,p.W,p.H);this.drawCustomBackground(sc,p,time,time,0,(J.cutAt(p,time)?.style||p.style).schemes[0],sample.width/p.W,false);const bytes=sc.getImageData(0,0,sample.width,sample.height).data;for(const c of candidates){const ev=J.photoRegionEvidence(bytes,sample.width,sample.height,c.box);c.cost+=ev.cost/3;c.p90=Math.max(c.p90,ev.p90);c.edge=Math.max(c.edge,ev.edge);}}
   const credit=p.titleDisplay;if(credit&&(credit.title||credit.artist)){const height=(credit.titleSize*2.9+(credit.marginY||0))/p.H,bottom=credit.position?.[0]==='b';for(const c of candidates){const overlap=bottom?Math.max(0,c.box.y1-(1-height)):Math.max(0,height-c.box.y0);c.creditOverlap=overlap;c.cost+=overlap*4;}}
   const chosen=J.choosePhotoAnchor(candidates,scenes.at(-1));const encode=v=>v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055,decode=v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4;const target=.17,alpha=C(1-encode(target)/Math.max(encode(target),encode(chosen.p90)),0,.62),darkened=decode(encode(chosen.p90)*(1-alpha));scenes.push({from:section.from,to:section.to,role:section.role,...chosen,scrim:alpha,predictedContrast:(.94+.05)/(darkened+.05),measurement:'background-region luminance percentile; not glyph contrast',candidateCount:candidates.length});
  }cache.set(p,{scenes});}catch(error){cache.set(p,{scenes:[],status:'ANALYSIS_UNAVAILABLE',reason:error.message});}finally{sample.width=sample.height=1;}
 }
 const state=cache.get(p);if(state)state.paintedBands=new Set();
 return frame.call(this,ctx,p,t,opt);
};
J.centerPhotoLyricItem=(env,item)=>{const it={...item},box=J.measureLyricItemBounds(env,it);if(!box)return it;const dx=env.W*.5-(box.x0+box.x1)*.5,dy=env.H*.5-(box.y0+box.y1)*.5,m=env.ctx?.getTransform?.(),det=m?m.a*m.d-m.b*m.c:0,k=env.scale||1;if(Math.abs(det)>1e-9){it.x+=(m.d*dx-m.c*dy)*k/det;it.y+=(-m.b*dx+m.a*dy)*k/det;}else{it.x+=dx;it.y+=dy;}it._lay=null;it._m=null;return it;};
const readability=J.adjustLocalReadability;
J.adjustLocalReadability=(env,it)=>{
 const c=env.cut,p=env.plan,label=String(it.text||'').replace(/\s/g,''),text=String(c?.lineText||c?.text||'').replace(/\s/g,''),scene=J.getPhotoComposition(p).find(s=>env.t>=s.from&&env.t<s.to);
 if(!scene||env.pass!=='main'||c?.line<0||locked(p,c)||!label||!text.includes(label)||it.ghost===false||it.fill===false)return readability(env,it);
 const readable=J.safeLyricItem(env,readability(env,it)),next=label===text&&(c.registrySelected||env.pIn>=1)&&!(env.pOut>0)?J.centerPhotoLyricItem(env,readable):readable;
 if(scene.scrim>0&&env.ctx){const box=J.measureLyricItemBounds(env,next),ctx=env.ctx;if(box){const band=c.line+':'+Math.round((box.y0+box.y1)/2/env.H*8),state=cache.get(p);if(state.paintedBands?.has(band))return next;state.paintedBands?.add(band);const k=env.scale||1;ctx.save();ctx.setTransform(k,0,0,k,0,0);const cy=(box.y0+box.y1)/2,hh=Math.max(env.H*.10,(box.y1-box.y0)*.9),gradient=ctx.createLinearGradient(0,cy-hh,0,cy+hh);gradient.addColorStop(0,'rgba(0,0,0,0)');gradient.addColorStop(.28,`rgba(0,0,0,${scene.scrim})`);gradient.addColorStop(.72,`rgba(0,0,0,${scene.scrim})`);gradient.addColorStop(1,'rgba(0,0,0,0)');ctx.globalCompositeOperation='source-over';ctx.globalAlpha=C(next.alpha??next.a??1)*C(env.pIn??1);ctx.fillStyle=gradient;ctx.fillRect(0,cy-hh,env.W,hh*2);ctx.restore();}}
 return next;
};
const provenance=J.createExportProvenance;J.createExportProvenance=async(...args)=>({...await provenance(...args),photoComposition:{algorithm:args[0].plan.photoCompositionAlgorithm,scenes:J.getPhotoComposition(args[0].plan),measurement:'region-based background sampling; artistic judgment and subject recognition unmeasured'}});
const context=J.directorContext;J.directorContext=(project,p,...args)=>({...context(project,p,...args),photoComposition:{algorithm:p.photoCompositionAlgorithm,scenes:J.getPhotoComposition(p),limitations:['No subject recognition','Regional predicted contrast is not measured glyph contrast']}});
})();
