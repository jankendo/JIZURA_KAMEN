/* Single-image editing. Pixel evidence, lyric fidelity and authored overrides
   remain authoritative; no subject/depth recognition is claimed. */
(()=>{'use strict';const J=window.J,C=J.clamp,ease=u=>{u=C(u);return u*u*(3-2*u);};
const locked=(p,c)=>!!c&&J.photoChoreographyLocked(p,c),active=p=>!!p.musicalPhoto?.cinema;
const endingCut=(p,end)=>p.cuts.filter(c=>c.line>=0&&c.start<end).at(-1)||J.cutAt(p,end-1/p.fps);
const loopWindow=(p,end)=>{const c=endingCut(p,end);return Math.min(.65,Math.max(0,end-(c?.end??end))+Math.max(0,c?.dur||0)*.15);};
const shotCache=new WeakMap();
const proposals=()=>[
 {id:'WIDE',x:.5,y:.5,zoom:1.03}, {id:'MEDIUM',x:.5,y:.53,zoom:1.4},
 {id:'HERO',x:.5,y:.44,zoom:1.85}, {id:'LEFT_DETAIL',x:.24,y:.42,zoom:2.3},
 {id:'RIGHT_DETAIL',x:.76,y:.48,zoom:2.3}, {id:'CROWD',x:.5,y:.77,zoom:1.65},
 {id:'LIGHT',x:.58,y:.23,zoom:1.8}, {id:'ENSEMBLE',x:.44,y:.59,zoom:1.22},
 {id:'CLOSE',x:.52,y:.47,zoom:2.6}];
J.virtualShotCandidates=image=>{
 if(!image)return proposals().map(s=>({...s,evidence:'geometric proposal; image not sampled'}));
 if(shotCache.has(image))return shotCache.get(image);
 const cv=document.createElement('canvas');cv.width=96;cv.height=64;const x=cv.getContext('2d');x.drawImage(image,0,0,96,64);
 const d=x.getImageData(0,0,96,64).data,lum=i=>d[i*4]*.2126+d[i*4+1]*.7152+d[i*4+2]*.0722;
 const shots=proposals().map(s=>{let best=null;
  for(const dx of [-.045,0,.045])for(const dy of [-.045,0,.045]){const cx=C(s.x+dx,.12,.88),cy=C(s.y+dy,.12,.88);let edge=0,n=0;
   for(let yy=Math.max(1,Math.floor(cy*64)-6);yy<Math.min(63,cy*64+6);yy++)for(let xx=Math.max(1,Math.floor(cx*96)-8);xx<Math.min(95,cx*96+8);xx++){const i=yy*96+xx;edge+=Math.abs(lum(i)-lum(i-1))+Math.abs(lum(i)-lum(i-96));n++;}
   const score=edge/Math.max(1,n)-Math.abs(dx)*30-Math.abs(dy)*30;if(!best||score>best.score)best={x:cx,y:cy,score};
  }return {...s,x:best.x,y:best.y,edgeDensity:+best.score.toFixed(3),sourceWidth:image.width,sourceHeight:image.height,evidence:'local edge density around geometric region; not object recognition'};
 });cv.width=cv.height=1;shotCache.set(image,shots);return shots;
};
J.lyricCinemaMeaning=text=>{
 const t=String(text||'');if(/集|仲間|共に|皆|一緒|ひとつ/.test(t))return /誇|輝/.test(t)?'pride':'gather';
 if(/誇|輝|光|青と黒|青黒/.test(t))return /戦士/.test(t)?'hero':'pride';
 if(/荒|狂|暴|闘|戦え|奪|燃/.test(t))return 'rage';if(/声|聞こ|歌声|響/.test(t))return 'call';
 if(/ここにいる|いつも|守|信じ/.test(t))return 'unity';if(/戦士|男たち|選手/.test(t))return 'hero';return 'read';
};
J.vocaliseUnits=text=>{
 // Retain every original code point. The extra newline is layout only.
 const s=String(text||''),units=s.match(/[ラらオおアあウォうぉー〜～]+?[ー〜～]+|[^ー〜～]+(?:[ー〜～]+)?/gu)||[s];
 return units.join('')===s?units:[s];
};
const build=J.buildPhotoStory;J.buildPhotoStory=p=>{
 build(p);if(!p.musicalPhoto?.story||p.directorSections7?.length)return p;
 const pool=p.artDirection.registrySelection.virtualShots||J.virtualShotCandidates(null),auto=p.cuts.filter(c=>c.line>=0&&!locked(p,c)),oh=auto.filter(c=>c.story?.group==='oh');
 const climax=oh.length&&(p.musicalPhoto.songProfile?.energy??.5)>.45?oh[0].start:p.musicalStructure.sections.find(s=>s.role==='climax')?.from;
 const variant=p.musicalPhoto.story.variant||0,byId=id=>pool.find(s=>s.id===id)||pool[0];
 let previous=null;for(const c of auto){const meaning=J.lyricCinemaMeaning(c.lineText),s=c.story,group=s?.group,stage=s?.stage||1;
  const role=group?'CROWD':['hero','pride','rage'].includes(meaning)?'IMPACT':'READ';
  let id=group?['LEFT_DETAIL','RIGHT_DETAIL','CROWD','HERO'][Math.min(3,stage-1)]:({gather:'WIDE',hero:'HERO',pride:'LIGHT',rage:'RIGHT_DETAIL',call:'MEDIUM',unity:'ENSEMBLE',read:c.line%2?'MEDIUM':'WIDE'})[meaning];
  if(group==='oh')id=['HERO','LEFT_DETAIL','RIGHT_DETAIL','CLOSE'][Math.min(3,stage-1)];
  if(id===previous&&meaning!=='call')id=variant?'LEFT_DETAIL':'CROWD';previous=id;
  c.virtualShot={...byId(id),semanticIntent:meaning,role,source:'same supplied image'};
  c.cinema={meaning,role,quiet:meaning==='call'||meaning==='gather'||meaning==='unity'&&/いつも/.test(c.lineText),energy:group==='oh'?.64+.1*Math.min(3,stage-1):group?.24+.17*stage:meaning==='rage'?.85:meaning==='call'?.06:meaning==='gather'?.10:meaning==='unity'?.32:.4};
  c.layout=group?['cinemaResponse','cinemaConverge','cinemaWave','cinemaExpand'][Math.min(3,stage-1)]:role==='IMPACT'?'cinemaImpact':'cinemaRead';c.architecture=c.layout;c.params={...c.params,composition:group?'crowd':role.toLowerCase(),displayText:c.lineText};
  const y=role==='CROWD'?.5:meaning==='gather'?.64:meaning==='call'?.5:meaning==='pride'?.60:role==='IMPACT'?.44:.52;
  c.params={...c.params,photoAnchor:{x:.5,y},cinemaRole:role};
  c.backgroundScene={...c.backgroundScene,id,zoom:1,x:0,y:0,lightSweep:0,filter:null};
 }
 const introEnd=Math.min(3,p.lines[0]?.start??3),beats=(p.beatHierarchy||[]).filter(b=>b.time>=.45&&b.time<introEnd-.15);
 const hook=[{time:0,shot:byId('WIDE'),phase:'title'}];
 for(const target of [.8,1.5,2.2]){if(target>=introEnd-.1)continue;const nearest=beats.slice().sort((a,b)=>Math.abs(a.time-target)-Math.abs(b.time-target))[0],time=nearest&&Math.abs(nearest.time-target)<.22?nearest.time:target;if(time>hook.at(-1).time+.25)hook.push({time,shot:byId(['MEDIUM','LEFT_DETAIL','HERO'][hook.length-1]),phase:hook.length===1?'anticipation':'lyric-entry',timing:nearest&&time===nearest.time?'audio-accent':'fallback visual beat'});}
 const end=p.duration,window=loopWindow(p,end);
 const peak=auto.filter(c=>c.start>=(climax??Infinity)).at(-1),climaxPeak=peak?Math.min(end-window,peak.start+Math.min(.2,peak.dur*.15)):end-window;
 p.musicalPhoto.cinema={version:1,pool,hook,introEnd,climax,climaxPeak,loop:{from:end-window,end,window,mode:'rendered-opening-blend',audioEdited:false},source:'single supplied artwork; geometric/edge candidates, lyric meaning and audio accents',limits:'No depth, masks, face/flag/fist recognition or synthesized assets'};
 p.musicalPhoto.phraseSettle={duration:.18,initialScale:.92,fullPhraseVisible:true};
 // Peaks are reserved for semantic emphasis, not every LRC onset.
 for(const c of auto)if(['rage','hero','pride'].includes(c.cinema.meaning)||c.story?.group==='oh'){
  const b=(p.beatHierarchy||[]).filter(b=>Math.abs(b.time-c.start)<=.10&&b.beatSalience>=.4).sort((a,b)=>b.beatSalience-a.beatSalience)[0];
  if(b&&!p.events.some(e=>e.cinemaCue&&e.t===b.time))p.events.push({type:'zoom',t:b.time,dur:.10,amp:c.cinema.energy*.28,targetType:'BEAT',musicalPhotoCue:true,cinemaCue:true,reason:'lyric importance × audio salience × section energy'});
 }p.events.sort((a,b)=>a.t-b.t);
 if(p.artDirection.vocabulary)p.artDirection.vocabulary.layout=[...new Set(p.cuts.map(c=>c.layout))];
 p.photoChoreography={...p.photoChoreography,algorithm:'semantic-role-and-vocalise-development-v2',presentations:auto.map(c=>({line:c.line,start:c.start,end:c.end,mode:c.cinema.role,layout:c.layout,text:c.lineText,shot:c.virtualShot.id}))};
 return p;
};
const social=J.createSocialHookPlan;J.createSocialHookPlan=(source,candidate)=>{
 const p=social(source,candidate);if(!active(source)||!active(p))return p;
 for(const c of p.cuts)if(c.line>=0&&!locked(p,c)){
  const original=source.cuts.find(v=>v.line===c.line&&v.cinema);if(!original)continue;
  c.virtualShot={...original.virtualShot};c.cinema={...original.cinema};c.layout=original.layout;c.architecture=original.architecture;c.params={...c.params,...original.params};
 }
 const peak=p.musicalStructure.sections.find(s=>s.role==='climax');
 p.musicalPhoto={...p.musicalPhoto,cinema:{...p.musicalPhoto.cinema,climax:peak?.from??p.musicalPhoto.cinema.climax,climaxPeak:Math.min(candidate.end-loopWindow(p,candidate.end),peak?.to??candidate.end),loop:{from:candidate.end-loopWindow(p,candidate.end),end:candidate.end,window:loopWindow(p,candidate.end),mode:'rendered-opening-blend',audioEdited:false}}};
 return p;
};
const camera=J.cameraAt;
const pose=(p,shot,energy,t,c)=>{
 const geo=shot.sourceWidth?J.customBgGeometry(shot.sourceWidth,shot.sourceHeight,p.W,p.H,p.customBg):{x:0,y:0,w:p.W,h:p.H};
 const progress=c?C((t-c.start)/Math.max(.1,c.dur)):0,climax=Number.isFinite(p.musicalPhoto.cinema.climax)&&t>=p.musicalPhoto.cinema.climax;
 // During the climax focal region may change, but scale and travel never fall.
 const ramp=climax?C((t-p.musicalPhoto.cinema.climax)/Math.max(.1,p.musicalPhoto.cinema.climaxPeak-p.musicalPhoto.cinema.climax)):0;
 const profile=p.musicalPhoto.songProfile,cap=profile?.mode==='drift'?1.14:profile?.mode==='flow'?1.65:2.65;
 const musicScale=profile?.mode==='flow'?.85:profile?.mode==='drive'?1.08:1;
 const preceding=p.cuts.filter(v=>v.virtualShot&&v.start<p.musicalPhoto.cinema.climax).at(-1),floor=Math.max(1.9,Math.min(cap,1+((preceding?.virtualShot?.zoom||1.9)-1)*musicScale+.12*(preceding?.cinema?.energy||0)));
 const s=climax?floor+(Math.max(floor,2.65)-floor)*ramp:Math.min(cap,1+(shot.zoom-1)*musicScale+(energy>.3?.12*energy*ease(progress):0)),travel=c?.cinema?.quiet?0:energy*.022*Math.sin(progress*Math.PI);
 const targetX=(p.W/2-(geo.x+geo.w*shot.x))*s+travel*p.W*(c?.line%2?1:-1),targetY=(p.H/2-(geo.y+geo.h*shot.y))*s;
 const xx=C(targetX,p.W/2-s*(geo.x+geo.w-p.W/2),s*(p.W/2-geo.x)-p.W/2),yy=C(targetY,p.H/2-s*(geo.y+geo.h-p.H/2),s*(p.H/2-geo.y)-p.H/2);
 return {s,x:xx,y:yy,rot:0};
};
J.cinemaShotAt=(p,t)=>{const f=p.musicalPhoto.cinema,c=J.cutAt(p,t);if(t<f.introEnd)return f.hook.filter(h=>h.time<=t).at(-1)?.shot||f.pool[0];return c?.virtualShot||f.pool[0];};
J.cameraAt=(p,t,range)=>{
 if(!active(p)||locked(p,J.cutAt(p,t)))return camera(p,t,range);
 const f=p.musicalPhoto.cinema,c=J.cutAt(p,t),shot=J.cinemaShotAt(p,t),energy=c?.cinema?.energy||.1,out=pose(p,shot,energy,t,c),end=range?.end??p.duration,start=range?.start??0;
 const opening=f.hook.filter(h=>h.time<=t).at(-1),section=p.musicalStructure.sections.find(s=>t>=s.from&&t<s.to),boundary=t<f.introEnd?opening?.time:c?.start??section?.from;
 const transition=p.musicalPhoto.songProfile?.mode==='drift'?.6:p.musicalPhoto.songProfile?.mode==='flow'?.3:.08;
 if(boundary>start&&t-boundary<transition){const prev=J.cutAt(p,boundary-.001),before=pose(p,J.cinemaShotAt(p,boundary-.001),prev?.cinema?.energy||.1,boundary-.001,prev),u=ease((t-boundary)/transition);out.s=J.lerp(before.s,out.s,u);out.x=J.lerp(before.x,out.x,u);out.y=J.lerp(before.y,out.y,u);}
 const window=range?loopWindow(p,end):f.loop.window,from=end-window,lastFrame=Math.floor((end-1e-7)*p.fps)/p.fps;
 if(window>0&&t>=from){const first=pose(p,J.cinemaShotAt(p,start),J.cutAt(p,start)?.cinema?.energy||.1,start,J.cutAt(p,start)),u=ease((t-from)/Math.max(1/p.fps,lastFrame-from));return {s:J.lerp(out.s,first.s,u),x:J.lerp(out.x,first.x,u),y:J.lerp(out.y,first.y,u),rot:0};}return out;
};
// The background renderer reads cinema shots through cameraAt; isolate its
// treatment from old chapter/look wrappers to avoid resetting a climax.
const background=J.Renderer.prototype.drawCustomBackground;
J.Renderer.prototype.drawCustomBackground=function(ctx,p,t,...args){
 if(!active(p)||locked(p,J.cutAt(p,t))||!this.customBgBitmap)return background.call(this,ctx,p,t,...args);
 // The same switch is used by the independent photo-on / type-only audit.
 // Rendering a photograph in its counterfactual would falsely hide its effect.
 if(J.cutAt(p,t)?.photoExit)return false;
 const source=this.customBgBitmap,c=J.cutAt(p,t),f=p.musicalPhoto.cinema,cin=c?.cinema,climax=Number.isFinite(f.climax)&&t>=f.climax,energy=cin?.energy||.1;
 const look=climax||(t>=.48&&t<.72&&f.introEnd>.75)?'silhouette':cin?.meaning==='call'||cin?.meaning==='hero'?'mono':cin?.meaning==='pride'||cin?.meaning==='rage'?'blue':'color';
 if(this.cinemaSource!==this.customBgSource){for(const v of this.cinemaLooks?.values()||[])v.width=v.height=1;this.cinemaLooks=new Map();this.cinemaSource=this.customBgSource;}
 this.cinemaLooks=this.cinemaLooks||new Map();let image=source;
 if(look!=='color'){image=this.cinemaLooks.get(look);if(!image){const cv=document.createElement('canvas'),k=Math.min(1,1536/Math.max(source.width,source.height));cv.width=Math.round(source.width*k);cv.height=Math.round(source.height*k);const x=cv.getContext('2d');x.drawImage(source,0,0,cv.width,cv.height);const d=x.getImageData(0,0,cv.width,cv.height);for(let i=0;i<d.data.length;i+=4){const l=d.data[i]*.2126+d.data[i+1]*.7152+d.data[i+2]*.0722,v=look==='silhouette'?(l>75?210:8):l;d.data[i]=look==='mono'?v:v*.12;d.data[i+1]=look==='mono'?v:v*.43;d.data[i+2]=look==='mono'?v:Math.min(255,v*1.35);}x.putImageData(d,0,0);this.cinemaLooks.set(look,cv);image=cv;}}
 const rect=J.customBgGeometry(image.width,image.height,p.W,p.H,p.customBg),cam=J.cameraAt(p,t,this.renderRange);
 ctx.save();ctx.translate(p.W/2+cam.x,p.H/2+cam.y);ctx.scale(cam.s,cam.s);ctx.translate(-p.W/2,-p.H/2);ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';if(cin?.stage)ctx.filter='contrast('+( .85+.15*cin.stage)+')';if(args.at(-1)&&rect.blur>0)ctx.filter='blur('+(rect.blur*(args.at(-2)||1))+'px)';if(!J.drawLayeredCinema?.(this,ctx,p,t,source,rect,look))ctx.drawImage(image,rect.x,rect.y,rect.w,rect.h);ctx.restore();
 ctx.save();ctx.fillStyle='#020814';ctx.globalAlpha=C(Math.max(p.customBg.darkness||0,.22)+(cin?.quiet?.12:0),0,.65);ctx.fillRect(0,0,p.W,p.H);
 if(climax){const u=C((t-f.climax)/Math.max(.1,f.climaxPeak-f.climax));ctx.globalCompositeOperation='screen';ctx.globalAlpha=.05+.10*u;ctx.fillStyle='#167bff';ctx.fillRect(0,0,p.W,p.H);}
 const near=(p.events||[]).find(e=>e.cinemaCue&&t>=e.t&&t<e.t+.06);if(near){ctx.globalCompositeOperation='screen';ctx.fillStyle='#86bfff';ctx.globalAlpha=energy*.08*(1-(t-near.t)/.06);ctx.fillRect(0,0,p.W,p.H);}ctx.restore();J.drawCinemaAccent?.(ctx,p,t);return true;
};
for(const [id,name,mode]of [['cinemaResponse','チャントの左右呼応','response'],['cinemaConverge','チャントの合流','converge'],['cinemaWave','チャントの波','wave'],['cinemaExpand','チャントの拡張','expand'],['cinemaRead','歌詞の語り','read'],['cinemaImpact','重要歌詞の強調','impact']])J.LAYOUTS[id]={name,special:true,plan:()=>({font:'embedded_bold'}),render(env){
 const {W,H,cut}=env,source=String(cut.lineText||cut.text),units=J.vocaliseUnits(source),rows=mode==='response'?units.join('\n'):mode==='converge'||mode==='impact'||mode==='expand'||mode==='read'&&(H>W||source.length>12)?J.composeLyricPhrase(source):mode==='wave'?units.join('\n'):source;
 const font=cut.params.font||'embedded_bold',lead=mode==='wave'?1.5:mode==='impact'||mode==='expand'?1.22:1.32,track=mode==='expand'?.025:.012,cap=H*(H>W?(mode==='read'?.09:.11):mode==='read'?.135:mode==='expand'?.195:mode==='impact'?.185:.155),size=Math.min(cap,J.fitSize(rows,font,W*(cut.cinema?.development?.occupancy||.70),H*.48,{lead,track}));
 return J.mainDraw(env,{text:rows,font,size,x:W/2,y:H/2,lead,track,color:'#fff',noHold:!!cut.cinema?.quiet,enter:cut.enter,exit:cut.exit,cinemaMotion:mode});
}};
const typo=J.applyTypography5;J.applyTypography5=(env,it)=>{
 typo(env,it);if(!active(env.plan)||locked(env.plan,env.cut)||!it.cinemaMotion||['read','impact'].includes(it.cinemaMotion))return;
 const mode=it.cinemaMotion,u=C(env.lt/Math.max(.1,env.cut.dur)),quiet=env.cut.cinema?.quiet,amp=quiet?0:.04*env.W;
 it.charFns.push((i,g)=>{const sign=g.li%2?1:-1,settle=ease(C(u*2));
  return mode==='response'?{dx:sign*amp*(.45+.55*(1-settle))}:mode==='converge'?{dx:sign*amp*(1-settle)}:mode==='wave'?{dx:sign*amp*Math.sin(u*Math.PI*2+g.li),dy:env.H*.008*Math.sin(u*Math.PI*2+i*.35)}:{dx:g.x*.06*ease(u)};
 });
};
// Use the existing measured centering and safety pipeline for role placement.
const creditState=J.creditStateAt;J.creditStateAt=(p,t)=>active(p)&&p.creditChoreography?.mode!=='always'?{hidden:t>Math.min(p.musicalPhoto.cinema.introEnd,2.8)&&t<p.musicalPhoto.cinema.loop.from,opacity:1,scale:t<1.5?1:.78}:creditState(p,t);
const credit=J.Renderer.prototype.drawTitleCredit;J.Renderer.prototype.drawTitleCredit=function(ctx,p,t,scale){
 if(!active(p)||locked(p,J.cutAt(p,t)))return credit.call(this,ctx,p,t,scale);
 const d=p.titleDisplay;if(!d)return;return credit.call(this,ctx,{...p,musicalPhoto:{...p.musicalPhoto,titleOpening:false},titleDisplay:{...d,position:'tl',marginX:p.W*.09,marginY:p.H*.10,maxWidth:p.W*.82,titleSize:Math.min(p.H*.10,J.fitSize(d.title||d.artist,d.font,p.W*.76,p.H*.13)),scrim:.28}},t,scale);
};
const frame=J.Renderer.prototype.frame;J.Renderer.prototype.frame=function(ctx,p,t,opt={}){
 let renderPlan=p;const loopEnd=opt.range?.end??p.duration;if(active(p)&&p.musicalPhoto.cinema.loop.mode==='background-only-text-cut'&&t>=loopEnd-loopWindow(p,loopEnd)&&J.cutAt(p,t)?.line<0){const last=endingCut(p,loopEnd);if(last&&!locked(p,last))renderPlan={...p,cuts:p.cuts.filter(c=>c.start<last.end).map(c=>c===last?{...c,end:loopEnd,dur:loopEnd-c.start}:c)};}const value=frame.call(this,ctx,renderPlan,t,opt);if(active(p)&&p.musicalPhoto.cinema.loop.mode==='background-only-text-cut')return value;if(!active(p)||opt.transparent||opt._cinemaOpening||locked(p,J.cutAt(p,t)))return value;
 const start=opt.range?.start??0,end=opt.range?.end??p.duration,lastFrame=Math.floor((end-1e-7)*p.fps)/p.fps,window=loopWindow(p,end),from=end-window;
 if(window<=0||t<from||p.cuts.some(c=>locked(p,c)&&c.start<end&&c.end>from))return value;
 const a=ease((t-from)/Math.max(1/p.fps,lastFrame-from)),cv=this.ensure(this.cinemaOpening||(this.cinemaOpening=document.createElement('canvas')),ctx.canvas.width,ctx.canvas.height),cx=cv.getContext('2d');
 // Render the complete opening, not an approximation of its camera/title.
 // One extra frame is rendered only in the final transition window.
 const saved={range:this.renderRange,audit:this.lyricAuditCtx,items:this.lyricAuditItems},openingMask=opt.lyricAuditCtx?this.ensure(this.cinemaOpeningMask||(this.cinemaOpeningMask=document.createElement('canvas')),opt.lyricAuditCtx.canvas.width,opt.lyricAuditCtx.canvas.height):null;
 try{frame.call(this,cx,p,start,{...opt,_cinemaOpening:true,lyricAuditCtx:openingMask?.getContext('2d')||null,lyricAuditItems:null});}finally{this.renderRange=saved.range;this.lyricAuditCtx=saved.audit;this.lyricAuditItems=saved.items;}
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=a;ctx.drawImage(cv,0,0);ctx.restore();
 if(opt.lyricAuditCtx){const x=opt.lyricAuditCtx;x.save();x.setTransform(1,0,0,1,0,0);x.globalCompositeOperation='destination-out';x.globalAlpha=a;x.fillStyle='#000';x.fillRect(0,0,x.canvas.width,x.canvas.height);x.globalCompositeOperation='source-over';x.drawImage(openingMask,0,0);x.restore();}
 return value;
};
const dispose=J.Renderer.prototype.disposeAssets;J.Renderer.prototype.disposeAssets=function(){for(const v of this.cinemaLooks?.values()||[])v.width=v.height=1;this.cinemaLooks?.clear();for(const v of [this.cinemaOpening,this.cinemaOpeningMask])if(v)v.width=v.height=1;return dispose.call(this);};
J.measureCinemaEvidence=async(p,range,audio)=>{
 const R=new J.Renderer(),cv=document.createElement('canvas'),mc=document.createElement('canvas');cv.width=mc.width=192;cv.height=mc.height=Math.max(48,Math.round(192*p.H/p.W));const x=cv.getContext('2d'),mask=mc.getContext('2d'),start=range?.start??0,end=range?.end??p.duration,last=Math.floor((end-1e-7)*p.fps)/p.fps;
 const sample=t=>{R.frame(x,p,t,{scale:192/p.W,range,production:true,lyricAuditCtx:mask,lyricAuditItems:[]});return {time:t,pixels:x.getImageData(0,0,cv.width,cv.height).data,mask:mask.getImageData(0,0,cv.width,cv.height).data};};
 const delta=(a,b)=>{let color=0,edge=0,ink=0,n=0;const w=cv.width;for(let i=w*4;i<a.pixels.length;i+=4){const lum=d=>d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722,prev=d=>d[i-4]*.2126+d[i-3]*.7152+d[i-2]*.0722;for(let k=0;k<3;k++)color+=Math.abs(a.pixels[i+k]-b.pixels[i+k])/765;edge+=Math.abs((lum(a.pixels)-prev(a.pixels))-(lum(b.pixels)-prev(b.pixels)))/255;ink+=Math.abs(a.mask[i+3]-b.mask[i+3])/255;n++;}return {color:color/n,edge:edge/n,text:ink/n};};
 try{await R.loadCustomBackground(p.customBg.dataUrl);await R.loadAssetDeck?.(p);const fullFirst=sample(start),fullFinal=sample(last),fullSeam=delta(fullFirst,fullFinal),sampleBackground=t=>{x.setTransform(192/p.W,0,0,192/p.W,0,0);x.clearRect(0,0,p.W,p.H);R.renderRange=range;R.drawCustomBackground(x,p,t);return {time:t,pixels:x.getImageData(0,0,cv.width,cv.height).data,mask:new Uint8ClampedArray(mc.width*mc.height*4)};},backgroundOnly=p.musicalPhoto.cinema.loop.mode==='background-only-text-cut',first=backgroundOnly?sampleBackground(start):fullFirst,final=backgroundOnly?sampleBackground(last):fullFinal,seam=delta(first,final),take=backgroundOnly?sampleBackground:sample,motionA=delta(first,take(Math.min(end,start+1/p.fps))),motionB=delta(take(Math.max(start,last-1/p.fps)),final),velocity=Math.abs(motionA.color-motionB.color);
  const visual=Math.round(100*C(1-seam.color*.4*5-seam.edge*.25*5-seam.text*.25*5-velocity*.1*5));
  let audioSeam=null;const buf=audio?.buffer;if(buf?.getChannelData){const a=buf.getChannelData(0),sr=buf.sampleRate,n=Math.max(1,Math.floor(sr*.02)),i=Math.floor(start*sr),j=Math.min(a.length-1,Math.floor(end*sr)-1);let ra=0,rb=0;for(let k=0;k<n;k++){ra+=(a[Math.min(a.length-1,i+k)]||0)**2;rb+=(a[Math.max(0,j-k)]||0)**2;}const rmsDelta=Math.abs(Math.sqrt(ra/n)-Math.sqrt(rb/n)),sampleJump=Math.abs((a[i]||0)-(a[j]||0));audioSeam={rmsDelta,sampleJump,score:Math.round(100*C(1-rmsDelta*2-sampleJump)),source:'20 ms endpoint RMS and boundary samples; musical phrase compatibility not measured'};}
  const hooks=[start,...[.5,1.5,3].map(d=>Math.min(end-1/p.fps,start+d))].filter((t,i,a)=>a.indexOf(t)===i),frames=hooks.map(sample),changes=frames.slice(1).map((f,i)=>({from:frames[i].time,to:f.time,...delta(frames[i],f)}));
  return {status:'PRE_ENCODE_RENDERED_EVIDENCE',loop:{firstTime:start,lastTime:last,visualScore:visual,channels:seam,fullFrameChannels:fullSeam,textBoundary:backgroundOnly?'intentional hard exchange; last lyric then opening title':'blended',titleLyricCrossfade:!backgroundOnly,cameraVelocityDifference:velocity,audio:audioSeam,score:audioSeam?Math.round(visual*.85+audioSeam.score*.15):null,audioEdited:false,method:backgroundOnly?'production background RGB, edges and velocity; intentional text cut reported separately; audio endpoint proxy':'complete production frames: RGB, edges, lyric occupancy, velocity; audio endpoint proxy'},hook:{samples:hooks,changes,hasNewInformation:changes.map(c=>c.color>.01||c.edge>.01||c.text>.01),viralityMeasured:false},roles:p.cuts.filter(c=>c.cinema).map(c=>({line:c.line,from:c.start,to:c.end,role:c.cinema.role,meaning:c.cinema.meaning,energy:c.cinema.energy,shot:c.virtualShot.id})),limits:'Pre-encode raster; no audience, object-recognition or perfect musical-loop claim'};
 }finally{R.disposeAssets?.();R.customBgBitmap?.close?.();cv.width=cv.height=mc.width=mc.height=1;}
};
const analyze=J.analyzeRenderedFrames;J.analyzeRenderedFrames=async(p,range,audio,telemetry={})=>{const r=await analyze(p,range,audio,telemetry);if(r.completed&&active(p)){r.metrics.singleImageCinema=await J.measureCinemaEvidence(p,range,audio);p.lastPixelQA=r;}return r;};
const loopQuality=J.loopQuality;J.loopQuality=(p,audio,range)=>{
 const base=loopQuality(p,audio,range),e=p.lastPixelQA?.metrics?.singleImageCinema?.loop;
 if(!active(p)||!e||Math.abs(e.firstTime-(range?.start??0))>.001||Math.abs(e.lastTime-Math.floor(((range?.end??p.duration)-1e-7)*p.fps)/p.fps)>.001)return base;
 return {...base,score:Number.isFinite(e.score)?e.score/100:Math.min(base.score,e.visualScore/100),renderedVisualScore:e.visualScore,audioScore:e.audio?.score??null,measurement:e.method};
};
const repair=J.repairPhotoBottlenecks;J.repairPhotoBottlenecks=(p,a,attempt)=>{
 const changes=repair(p,a,attempt);if(!active(p))return changes;
 // Reapply role-specific chant layouts after generic repair; never let a
 // text-layout search erase the staged response/wave/expansion direction.
 for(const c of p.cuts)if(c.cinema&&!locked(p,c)){c.layout=c.story?.group?['cinemaResponse','cinemaConverge','cinemaWave','cinemaExpand'][Math.min(3,c.story.stage-1)]:c.cinema.role==='IMPACT'?'cinemaImpact':'cinemaRead';c.architecture=c.layout;if(c.story?.group)c.params={...c.params,photoAnchor:{x:.5,y:.5}};}
 return changes;
};
const check=J.checkMVQuality;J.checkMVQuality=(...args)=>{
 const r=check(...args),q=r.quality;if(!active(args[1]))return r;
 q.singleImageCinemaEvidence=args[4]?.metrics?.singleImageCinema||null;
 for(const [key,code]of [['perceptualNovelty','LOW_PERCEPTUAL_NOVELTY'],['foregroundNovelty','LOW_FOREGROUND_NOVELTY']]){
  const score=q.metrics?.[key];if(!Number.isFinite(score)||score<80){if(!r.issues.some(i=>i.code===code))r.issues.push({code,severity:'ERROR',exportBlocking:false,message:(key==='perceptualNovelty'?'画面の新規性':'前景の新規性')+'が100点認定の基準80に達していません',score:Number.isFinite(score)?score:null,minimum:80});q.certified100=false;q.perfectEligible=false;}
 }
 r.errors=r.issues.filter(i=>i.severity==='ERROR');q.targetAcceptance=J.evaluateQualityTarget(r);if(!q.targetAcceptance.minimumMet){q.certified100=false;q.perfectEligible=false;q.qualification='QUALITY_UNMET';q.score=q.overallScore=Math.min(99,q.overallScore);}
 q.hardGates={...q.hardGates,total:r.errors.length,passed:r.errors.length===0};return r;
};
const context=J.directorContext;J.directorContext=(project,p,...args)=>({...context(project,p,...args),singleImageCinema:p.musicalPhoto?.cinema||null});
})();
