/* Motion Director 5: measured music boundaries, shared visual language, offline intents. */
(() => {
'use strict';
const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(+v)?+v:a));
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const q=(a,p)=>{const s=a.filter(Number.isFinite).sort((a,b)=>a-b);return s[Math.floor((s.length-1)*p)]||0;};
const stats=(a,confidence=.7)=>({mean:mean(a),p90:q(a,.9),peak:Math.max(0,...a),dynamicRange:q(a,.9)-q(a,.1),confidence});
const closest=(a,t)=>a.reduce((best,x)=>Math.abs(x.time-t)<Math.abs(best.time-t)?x:best,a[0]||{time:t});
const roleAt=(plan,t)=>plan.musicalStructure?.sections?.find(s=>t>=s.from&&t<s.to);
// A timeline is immutable during a planning call. Index only chronological,
// finite timestamps; legacy or malformed input retains the original traversal.
const timelineIndex=frames=>{
 const ordered=frames.every((f,i)=>Number.isFinite(f.time)&&(!i||f.time>=frames[i-1].time));
 const lower=value=>{let lo=0,hi=frames.length;while(lo<hi){const mid=(lo+hi)>>>1;if(frames[mid].time<value)lo=mid+1;else hi=mid;}return lo;};
 return {
  window:(from,to)=>ordered?frames.slice(lower(from),lower(to)):frames.filter(x=>x.time>=from&&x.time<to),
  nearest:time=>{
   if(!ordered||!Number.isFinite(time)||!frames.length)return closest(frames,time);
   const right=lower(time);if(!right)return frames[0];
   if(!Number.isFinite(Math.abs(frames[0].time-time))||!Number.isFinite(Math.abs(frames[frames.length-1].time-time)))return closest(frames,time);
   const left=right-1;
   // closest() keeps the first item on ties, including duplicate timestamps.
   const picked=right<frames.length&&Math.abs(frames[right].time-time)<Math.abs(frames[left].time-time)?right:left;
   return frames[lower(frames[picked].time)];
  }
 };
};
J.snapMusicalBoundary=(time,candidates,maxShift=.45)=>{
 const a=candidates.filter(x=>Number.isFinite(x.time)&&Math.abs(x.time-time)<=maxShift);
 const best=a.sort((x,y)=>(Math.abs(x.time-time)-.1*(x.priority||0))-(Math.abs(y.time-time)-.1*(y.priority||0)))[0];
 return {time:+(best?.time??time).toFixed(3),original:time,shift:+((best?.time??time)-time).toFixed(3),source:best?.source||'structure'};
};
J.analyzeMusicalStructure=(plan,audio,project={})=>{
 const duration=plan.duration,lines=plan.lines||[],timeline=audio?.features?.detailedTimeline?.length?audio.features.detailedTimeline:audio?.features?.timeline||[];
 const maxSections=duration<9?1:Math.min(7,Math.max(3,Math.round(duration/14))),minGap=Math.min(8,Math.max(2.5,duration/(maxSections*2)));
 const snap=[...lines.map(l=>({time:l.start,source:'lyric',priority:1})),...(audio?.beats||plan.beats||[]).map(time=>({time,source:'beat',priority:.3}))];
 const indexed=timelineIndex(timeline);
 const candidates=[];const add=(time,score,source)=>{if(time>minGap&&time<duration-minGap)candidates.push({time,score,source});};
 // Compare local windows, so a transient does not become a whole chapter.
 for(const f of timeline){const left=indexed.window(f.time-2.4,f.time),right=indexed.window(f.time,f.time+2.4);if(!left.length||!right.length)continue;
  const val=(a,k)=>mean(a.map(x=>+x[k]||0)),delta=mean(['energy','spectralFlux','bass','density'].map(k=>Math.abs(val(left,k)-val(right,k))));
  const valley=1-clamp(f.energy||0),score=delta*2.4+valley*.1+clamp(f.onset||0)*.12;
  add(f.time,score,'acoustic-change');if(valley>.75)snap.push({time:f.time,source:'valley',priority:.8});
 }
 for(let i=1;i<lines.length;i++){const l=lines[i],previous=lines[i-1],gap=l.start-previous.end,prevRepeat=lines.slice(Math.max(0,i-4),i).filter(x=>x.text===previous.text).length;
  const textChange=l.text!==previous.text,phraseChange=Math.abs([...l.text].length-[...previous.text].length)/Math.max(1,[...l.text].length);
  add(l.start,.12+Math.max(0,gap)*.16+(textChange&&prevRepeat>=2?.38:0)+phraseChange*.14,'lyric-pattern');
 }
 for(const p of plan.artDirection?.sectionProfiles||[])if(p.majorEvent)add(p.start,.5+clamp(p.intensity)*.2,'major-event');
 const director=project.directorPlan?.sections||project.directorPlan?.chapters||[];
 for(const s of director)add(s.from,2,'director');
 const selected=[];for(const c of candidates.sort((a,b)=>b.score-a.score||a.time-b.time)){
  const snapped=J.snapMusicalBoundary(c.time,snap,.45);if(snapped.time<minGap||snapped.time>duration-minGap)continue;
  if(selected.every(x=>Math.abs(x.time-snapped.time)>=minGap))selected.push({...c,...snapped,reason:c.source});if(selected.length>=maxSections-1)break;
 }
 let fallback=false;
 if(duration>=9&&selected.length<2){
  const support=candidates.filter(x=>x.source==='lyric-pattern').sort((a,b)=>b.score-a.score);for(const c of support)if(selected.every(x=>Math.abs(x.time-c.time)>=minGap)){selected.push({...c,reason:'phrase-support'});if(selected.length>=2)break;}
  if(selected.length<2){fallback=true;selected.splice(0);for(let i=1;i<3;i++)selected.push({time:duration*i/3,score:0,source:'fallback',reason:'insufficient-evidence'});}
 }
 const boundaries=[0,...selected.sort((a,b)=>a.time-b.time).map(x=>x.time),duration];
 const energy=(from,to)=>mean(timeline.filter(x=>x.time>=from&&x.time<to).map(x=>+x.energy||0));
 const sections=boundaries.slice(0,-1).map((from,i)=>({from:+from.toFixed(3),to:+boundaries[i+1].toFixed(3),energy:energy(from,boundaries[i+1]),role:i===0?'hook':i===boundaries.length-2?'finale':'verse',evidence:i?selected[i-1]:{source:'intro'},confidence:fallback?.25:clamp(.45+(selected[i-1]?.score||.3)*.4,.45,.95)}));
 const climax=sections.slice(1).sort((a,b)=>b.energy-a.energy||b.from-a.from)[0];if(climax)climax.role='climax';
 for(let i=1;i<sections.length-1;i++)if(sections[i]!==climax){const prev=sections[i-1];sections[i].role=sections[i].energy<prev.energy*.65?'break':sections[i].energy>prev.energy+.055?'build':'verse';}
 return {version:3,method:fallback?'fallback':'evidence-fusion',fallback,sections,candidates:candidates.slice(0,80),microSections:lines.map((l,i)=>({from:l.start,to:l.end,line:i,length:[...l.text].length})),maxSnapShift:.45};
};
J.buildBeatHierarchy=(plan,audio)=>{
 const beats=plan.beats||audio?.beats||[],frames=audio?.features?.detailedTimeline||audio?.features?.timeline||[],rate=audio?.energyRate||50;
 const indexed=timelineIndex(frames);
 const raw=beats.map((time,index)=>{const f=indexed.nearest(time),energy=audio?.energy?.[Math.round(time*rate)]??f.energy??0,onset=audio?.onset?.[Math.round(time*rate)]??f.onset??f.density??0;
  const lyricOnset=(plan.lines||[]).some(l=>Math.abs(l.start-time)<.14),sectionBoundary=(plan.musicalStructure?.sections||[]).some(s=>Math.abs(s.from-time)<.18);
  return {time,index,raw:.28*clamp(onset)+.22*clamp(energy)+.18*clamp(f.bass)+.16*clamp(f.spectralFlux)+.09*+lyricOnset+.07*+sectionBoundary,onset:+onset,energy:+energy,lyricOnset,sectionBoundary};});
 const lo=q(raw.map(x=>x.raw),.1),hi=q(raw.map(x=>x.raw),.95);
 return raw.map((x,i)=>{const localPeak=x.raw>=(raw[i-1]?.raw??0)&&x.raw>=(raw[i+1]?.raw??0),beatSalience=clamp(.15+.75*(x.raw-lo)/Math.max(.05,hi-lo)+.08*+localPeak);
  return {...x,beatSalience:+beatSalience.toFixed(3),localPeak,strength:beatSalience>.83?'strong':beatSalience>.6?'secondary':'weak',impact:beatSalience>.9?'macro':beatSalience>.73?'meso':beatSalience>.42?'micro':'maintain',downbeatConfidence:null,downbeat:null};});
};
J.measureVisualHitAlignment=plan=>{
 const beats=plan.beatHierarchy||[],hits=[...(plan.events||[]),...(plan.hypeTimeline||[])].filter(e=>e.amp>.18&&!/lyric|quiet/.test(e.reason||''));
 const observations=hits.map(e=>{const b=closest(beats,e.t),error=Math.abs(b.time-e.t),weight=clamp(e.amp,.1,1);return {time:e.t,beat:b.time,error,salience:b.beatSalience||0,weight,aligned:error<=.12};});
 const weights=observations.reduce((s,x)=>s+x.weight,0);return {score:Math.round(weights?observations.reduce((s,x)=>s+x.weight*(x.aligned?.5+.5*x.salience:0),0)/weights*100:0),alignedPercent:Math.round(observations.length?observations.filter(x=>x.aligned).length/observations.length*100:0),observations};
};
J.sceneDistinctness=(a,b)=>{
 const n=Math.min(a.grid?.length||0,b.grid?.length||0);let pixel=0,edge=0;for(let i=0;i<n;i++){pixel+=Math.abs(a.grid[i]-b.grid[i]);if(i>=3)edge+=Math.abs((a.grid[i]-a.grid[i-3])-(b.grid[i]-b.grid[i-3]));}
 const overlap=(a.zoom&&b.zoom)?Math.min(a.zoom,b.zoom)**2/Math.max(a.zoom,b.zoom)**2:1,focal=Math.hypot((a.x||50)-(b.x||50),(a.y||50)-(b.y||50))/100;
 const histogram=(a.histogram||[]).reduce((s,x,i)=>s+Math.abs(x-(b.histogram?.[i]||0)),0)/2;
 return {score:Math.round(clamp(pixel/Math.max(1,n)*2.4+edge/Math.max(1,n)*.8+histogram*.25)*100),pixelDistance:pixel/Math.max(1,n),edgeDistance:edge/Math.max(1,n),histogramDistance:histogram,cropIoU:overlap,focalDistance:focal,measured:n>0};
};
J.generateSceneCandidates=(imageFeatures={})=>{
 const x=clamp(imageFeatures.visualCenterX??.5)*100,y=clamp(imageFeatures.visualCenterY??.5)*100;
 const base=[{id:'WIDE',zoom:1,x:50,y:50,filter:'none',darkness:0},{id:'TIGHT',zoom:1.3,x,y,filter:'contrast(1.08)',darkness:.02},{id:'DETAIL',zoom:1.65,x:clamp(x+22,0,100),y:clamp(y-18,0,100),filter:'contrast(1.15)',darkness:.03},{id:'MONO',zoom:1.08,x:50,y:50,filter:'grayscale(1) contrast(1.15)',darkness:.03},{id:'HIGH_CONTRAST',zoom:1.2,x:50,y:50,filter:'contrast(1.3) saturate(.75)',darkness:.05},{id:'BLURRED_TYPE',zoom:1.15,x:50,y:50,filter:'saturate(.7)',blur:5,darkness:.13},{id:'GRAPHIC_HEAVY',zoom:1.25,x:clamp(100-x,0,100),y:50,filter:'saturate(.4) contrast(1.2)',darkness:.14}];
 if(Number.isFinite(imageFeatures.visualCenterX)&&imageFeatures.detail>.2)base.push({id:'SUBJECT',zoom:1.4,x,y,filter:'none',darkness:.02});
 return base.map((s,i)=>({...s,semantic:i===0?'establish':s.id==='DETAIL'?'break':s.id==='GRAPHIC_HEAVY'?'climax':'develop'}));
};
J.chooseMotifs=(features={},image={})=>features.percussive>.55?['stripe']:image.detail>.55?['grid']:['wave'];
J.motifStateAt=(plan,t)=>{const chapter=roleAt(plan,t),phase=chapter?clamp((t-chapter.from)/Math.max(.1,chapter.to-chapter.from)):0,i=Math.max(0,plan.musicalStructure?.sections.indexOf(chapter)||0),role=chapter?.role||'verse';return {id:plan.visualWorld?.motifs?.[0]||'stripe',state:role==='climax'?'field':role==='break'?'line':phase<.25?'line':phase<.6?'array':'wave',scale:role==='climax'?1.7:role==='break'?.45:.7+i*.16,density:role==='climax'?7:role==='break'?1:2+i+Math.floor(phase*2),intensity:role==='climax'?.23:role==='break'?.055:.095,phase:t*.12,role};};
J.auditMotifFatigue=plan=>{
 const history=[],penalties=[];for(const c of plan.cuts.filter(x=>x.line>=0)){const signature=[c.architecture,c.backgroundScene?.id,c.motifState?.state,c.cam].join('|'),recent=history.filter(x=>c.start-x.time<14),count=recent.filter(x=>x.signature===signature).length;
  const reprise=c.repetitionIndex>0&&roleAt(plan,c.start)?.role==='climax';if(count>=4&&!reprise)penalties.push({time:c.start,signature,count});history.push({time:c.start,signature});}
 return {penalties,score:Math.max(0,100-penalties.length*8)};
};
J.drawUnifiedMotif=(ctx,plan,t,mask=null)=>{
 if(!plan.visualWorld||plan.keyBg)return;const s=J.motifStateAt(plan,t),W=plan.W,H=plan.H,sc=J.cutAt(plan,t)?.style?.schemes?.[0]||plan.style.schemes[0];
 const draw=(c,audit=false)=>{c.save();c.globalAlpha=(audit?1:s.intensity)*(J.negativeSpaceAt?.(plan,t)?.graphicScale??1);c.strokeStyle=audit?'#fff':sc.accent;c.fillStyle=audit?'#fff':sc.accent;c.lineWidth=Math.max(2,H*.002*s.scale);
  // Keep the motif outside the central lyric field; its scale and rhythm form an arc.
  if(s.id==='wave'){for(let j=0;j<s.density;j++){c.beginPath();for(let k=0;k<=40;k++){const x=k/40*W,y=H*(.12+j*.012)+Math.sin(k*.2+s.phase+j*.3)*H*.025*s.scale;k?c.lineTo(x,y):c.moveTo(x,y);}c.stroke();}}
  else if(s.id==='grid'){for(let i=0;i<s.density;i++){const x=W*(.05+i*.024);c.beginPath();c.moveTo(x,H*.08);c.lineTo(x,H*.22);c.moveTo(W-x,H*.78);c.lineTo(W-x,H*.92);c.stroke();}c.strokeRect(W*.05,H*.08,W*.22,H*.14);}
  else if(s.id==='circle'){for(let i=0;i<s.density;i++){c.beginPath();c.arc(W*.88,H*.13,H*(.045+i*.016)*s.scale,0,Math.PI*2);c.stroke();}}
  else {for(let i=0;i<s.density;i++){const y=H*(.10+i*.012);c.beginPath();c.moveTo(W*.06,y);c.lineTo(W*.94,y+Math.sin(s.phase)*H*.018);c.stroke();if(s.state==='field'){c.beginPath();c.moveTo(W*.06,H-y);c.lineTo(W*.94,H-y);c.stroke();}}}
  c.restore();};draw(ctx);if(mask){mask.save();mask.setTransform(ctx.getTransform());draw(mask,true);mask.restore();}
};
const portraitMap={diag:'portraitDiag',split:'verticalSplit',marquee:'verticalMarquee',scatter:'portraitScatter',tile:'portraitStack',ring:'tallArc',stack:'portraitStack',huge:'portraitStack'};
J.resolvePortraitLayout=id=>portraitMap[id]||(['vcols','vtype','portraitDiag','verticalSplit','verticalMarquee','portraitScatter','portraitStack','tallArc'].includes(id)?id:'portraitStack');
const architectures={portraitDiag:{rot:-8,wrap:6,vertical:false},verticalSplit:{rot:0,wrap:5,vertical:false},verticalMarquee:{rot:0,wrap:10,vertical:true},portraitScatter:{rot:4,wrap:4,vertical:false},portraitStack:{rot:0,wrap:5,vertical:false},tallArc:{rot:0,wrap:6,vertical:false}};
for(const [id,cfg] of Object.entries(architectures))J.register('layout',id,{name:id,tags:['portrait','type'],w:0,fits:n=>n>0&&n<180,plan:(rng,cut,st)=>({font:st.fonts.display[0],...cfg}),render:env=>{
 const c=env.cut,p=c.params,text=String(c.text||c.lineText||''),wrapped=J.splitLines(text,p.wrap||cfg.wrap),size=Math.min(env.W*.115,env.H*.075);
 return J.mainDraw(env,{text:wrapped,font:p.font||'gothic_bold',size,x:env.W*.5,y:env.H*.49,vertical:p.vertical||false,rot:p.rot||0,track:.035,lead:1.35,color:env.sc.fg});
}},'portrait-native');
J.fontCapabilities=(key)=>{const bytes=J.userFontBytes?.get(key);if(!bytes)return {variable:false,axes:[],source:'static-or-unverified'};
 try{const v=new DataView(bytes),tables=v.getUint16(4),axes=[];for(let i=0;i<tables;i++){const off=12+i*16;const tag=String.fromCharCode(...[0,1,2,3].map(j=>v.getUint8(off+j)));if(tag!=='fvar')continue;const start=v.getUint32(off+8),axisOffset=v.getUint16(start+4),count=v.getUint16(start+8),size=v.getUint16(start+10);for(let j=0;j<count;j++){const a=start+axisOffset+j*size;axes.push({tag:String.fromCharCode(...[0,1,2,3].map(k=>v.getUint8(a+k))),min:v.getInt32(a+4)/65536,default:v.getInt32(a+8)/65536,max:v.getInt32(a+12)/65536});}return {variable:axes.length>0,axes,source:'sfnt-fvar'};}return {variable:false,axes,source:'sfnt-static'};}catch{return {variable:false,axes:[],source:'invalid-font'};}
};
J.typography5State=(plan,cut,t)=>{const b=closest(plan.beatHierarchy||[],t),hit=t>=b.time&&t-b.time<.28?Math.exp(-(t-b.time)*14)*(b.beatSalience||0):0,m=J.motifStateAt(plan,t),major=['climax','hook'].includes(m.role);
 return {scale:1+hit*(major?.055:.025),width:clamp(1-hit*.045,.85,1.1),weight:clamp(650+hit*120,500,850),slant:hit*(m.id==='stripe'?3:1),tracking:clamp(.025+hit*.018,0,.08),baseline:Math.sin(t*.8)*.004,rotation:m.id==='slash'?hit*-2:0,stroke:hit*.01,blur:0,distortion:major?hit*.006:0};};
J.applyTypography5=(env,it)=>{
 if(!env.plan.motionDirector5)return;const state=J.typography5State(env.plan,env.cut,env.t),cap=J.fontCapabilities(it.font);
 it.size*=state.scale;it.sx=(it.sx||1)*state.width;it.track=clamp((it.track||0)+state.tracking, -.04,.10);it.skew=(it.skew||0)+state.slant;it.rot=(it.rot||0)+state.rotation;it.y+=env.H*state.baseline;it.stroke=Math.max(it.stroke||0,it.size*state.stroke);
 it.fontWeight=cap.variable&&cap.axes.some(a=>a.tag==='wght')?state.weight:null;it.fontAxes=cap.variable?{wght:state.weight,wdth:state.width*100,slnt:-state.slant}:null;
 const tokens=env.cut.kineticTokens||[],beat=closest(env.plan.beatHierarchy||[],env.t),active=beat.index%Math.max(1,tokens.length),ranges=[];let offset=0;for(const token of tokens){ranges.push([offset,offset+[...token].length]);offset+=[...token].length;}
 it.charFns.push((i)=>({dy:Math.sin(i*.65+env.t*2)*it.size*state.distortion,s:1+(state.scale-1)*.5*(ranges[active]&&i>=ranges[active][0]&&i<ranges[active][1]?1:0)}));
};
J.creditStateAt=(plan,t)=>{if(!plan.creditChoreography||plan.creditChoreography.mode==='always')return {hidden:false,opacity:1};const range=plan.socialHook||{start:0,end:plan.duration},rel=t-range.start,d=range.end-range.start,cut=J.cutAt(plan,t),role=roleAt(plan,t)?.role;
 if(rel<2.5||rel>d-2.3)return {hidden:false,opacity:1};return {hidden:role==='climax'||['giant','vertical','layered'].includes(cut?.architecture),opacity:.85,scale:.68};};
J.validateAssetDeck=assets=>{
 if(!Array.isArray(assets))return [];return assets.slice(0,5).filter(a=>a&&/^(data:image\/(png|jpeg|webp);base64,|data:video\/(mp4|webm);base64,)/.test(a.dataUrl||'')&&(a.dataUrl||'').length<28e6).map((a,i)=>({id:String(a.id||`asset-${i}`),name:String(a.name||'素材').slice(0,80),dataUrl:a.dataUrl,role:['hero','support','detail','texture','logo','video'].includes(a.role)?a.role:/data:video/.test(a.dataUrl)?'video':'support'}));
};
const previousPlan=J.plan;
J.plan=(project,audio)=>{
 const plan=previousPlan(project,audio);if(!project.autoDirection||!plan.artDirection)return plan;
 plan.motionDirector5=true;plan.musicalStructure=plan.musicalStructure||J.analyzeMusicalStructure(plan,audio,project);plan.beatHierarchy=J.buildBeatHierarchy(plan,audio);plan.sceneCandidates=J.generateSceneCandidates(project.autoPalette?.stats||{});
 const sections=plan.musicalStructure.sections;plan.visualWorld={version:2,motifs:J.chooseMotifs(audio?.features||{},project.autoPalette?.stats||{}),identity:['primary-font','accent-palette'],chapters:[]};const requestedMotif=(project.directorPlan?.sections||[]).map(s=>s.motif).find(s=>['stripe','grid','wave','circle'].includes(s));if(requestedMotif)plan.visualWorld.motifs=[requestedMotif];plan.assetDeck=J.validateAssetDeck(project.proAssets);
 for(let i=0;i<sections.length;i++){const s=sections[i],styleSegment=plan.styleArc.segments[i];if(styleSegment)s.style=styleSegment.style;
  const directorIntent=(project.directorPlan?.sections||[]).find(d=>s.from>=d.from-.01&&s.from<d.to),sceneIntent=String(directorIntent?.sceneIntent||'').toLowerCase(),typeIntent=String(directorIntent?.typographyIntent||'').toLowerCase();
  const sceneId=/detail/.test(sceneIntent)?'DETAIL':/mono/.test(sceneIntent)?'MONO':/tight|subject/.test(sceneIntent)?'TIGHT':/blur/.test(sceneIntent)?'BLURRED_TYPE':/wide/.test(sceneIntent)?'WIDE':s.role==='climax'?'GRAPHIC_HEAVY':s.role==='break'?'DETAIL':i===0?'TIGHT':i===sections.length-1?'MONO':i%2?'WIDE':'HIGH_CONTRAST',scene=plan.sceneCandidates.find(x=>x.id===sceneId)||plan.sceneCandidates[0];
  const architecture=/vertical/.test(typeIntent)?'vertical':/giant|hero|impact/.test(typeIntent)?'giant':/split/.test(typeIntent)?'split':/diag/.test(typeIntent)?'diagonal':/stack/.test(typeIntent)?'stacked':s.role==='climax'?'giant':s.role==='break'?'vertical':s.role==='build'?'diagonal':i===0?'stacked':i%2?'signage':'split';
  const camera=s.role==='break'?'drift':s.role==='climax'?'pulse':i%2?'push':'drift';
  const world={...s,scene:scene.id,architecture,camera,motif:plan.visualWorld.motifs[0],motifState:J.motifStateAt(plan,s.from+.1).state,transition:s.role==='break'?'cut':'wipe',identity:plan.visualWorld.identity};plan.visualWorld.chapters.push(world);
  for(const c of plan.cuts){if(c.start<s.from-.001||c.start>=s.to||c.line<0)continue;const override=project.overrides?.[c.line]?.layout;
   c.architecture=architecture;c.backgroundScene={...scene,x:scene.x-50,y:scene.y-50,sceneFocal:{x:scene.x,y:scene.y},tint:s.role==='climax'?plan.style.schemes[0].accent:null};c.motifState=J.motifStateAt(plan,c.start);c.chapter={...c.chapter,role:s.role,typographyMode:architecture,camera,backgroundVariant:scene.id,graphicMotif:world.motif};
   let layout=s.role==='break'?'vcols':architecture==='giant'?'huge':architecture==='diagonal'?'diag':architecture==='stacked'?'stack':architecture==='split'?'splitScreen':'type';
   if(c.repetitionProgress>=.68&&plan.H<=plan.W)layout='huge';else if(c.repetitionProgress>=.46&&plan.H<=plan.W)layout='diag';
   if(plan.H>plan.W)layout=J.resolvePortraitLayout(layout);if(!override&&!(project.directorPlan?.lyricDirectives||[]).some(d=>d.line===c.line)&&J.LAYOUTS[layout]){c.layout=layout;const keep=c.params;c.params={...keep,...J.LAYOUTS[layout].plan(J.rng(c.seed),c,c.style||plan.style),font:keep.font,directionAngle:keep.directionAngle,intensityScale:keep.intensityScale,maxWidth:plan.H>plan.W?.78:.88};c.kineticGrouped=false;}
   c.cam=camera;if(directorIntent?.restraint>.6){c.params.intensityScale=Math.min(c.params.intensityScale||1,1);c.decor=c.decor.slice(0,1);}
   c.camP=J.CAMERA[camera]?.plan?.(J.rng(c.seed),c.style||plan.style)||{};c.trans=world.transition;c.transP=J.TRANS[c.trans]?.plan?.(J.rng(c.seed),c.style||plan.style)||{};
   c.assetRole=s.role==='break'?'detail':s.role==='climax'?'hero':'support';c.assetId=(s.role==='build'?plan.assetDeck.find(a=>a.role==='video'):null)?.id||plan.assetDeck.find(a=>a.role===c.assetRole)?.id||null;
  }
 }
 // Apply stronger events to measured salient beats, keeping a quiet layer on weak beats.
 const nearestImpact=(t,amp)=>{const nearby=plan.beatHierarchy.filter(b=>Math.abs(b.time-t)<=.24);return nearby.sort((a,b)=>(Math.abs(a.time-t)-.13*a.beatSalience)-(Math.abs(b.time-t)-.13*b.beatSalience))[0];};
 for(const e of [...plan.events,...(plan.hypeTimeline||[])]){if(e.t<.32||e.socialHook)continue;const b=nearestImpact(e.t,e.amp);if(b){e.originalTime=e.t;e.t=b.time;e.beatSalience=b.beatSalience;e.amp=Math.min(e.amp,b.beatSalience>.73?.68:b.beatSalience>.42?.34:.12);e.impactLayer=b.impact;}}
 plan.events.sort((a,b)=>a.t-b.t);plan.hypeTimeline?.sort((a,b)=>a.t-b.t);plan.beatSync=J.measureVisualHitAlignment(plan);plan.motifFatigue=J.auditMotifFatigue(plan);plan.sceneVariants=[...new Map(plan.cuts.filter(c=>c.backgroundScene).map(c=>[c.backgroundScene.id,c.backgroundScene])).values()];
 const musicalPeak=sections.find(s=>s.role==='climax');if(musicalPeak){const cut=plan.cuts.find(c=>c.line>=0&&c.start>=musicalPeak.from&&c.start<musicalPeak.to);plan.climax={time:musicalPeak.from,intensity:musicalPeak.energy,role:'climax',style:cut?.styleKey||plan.styleKey,cutLayout:cut?.layout||null,fx:plan.events.find(e=>e.t>=musicalPeak.from&&e.t<musicalPeak.to)?.type||plan.climax?.fx||null};}
 plan.creditChoreography={mode:project.titleDisplay?.mode==='always'?'always':'scene-aware'};plan.titleDisplay&&(plan.titleDisplay.mode=plan.creditChoreography.mode);
 const distances=sections.slice(1).map(s=>Math.min(...plan.musicalStructure.candidates.map(c=>Math.abs(c.time-s.from)),durationOr(plan)));plan.musicalAlignment={score:plan.musicalStructure.fallback?35:Math.round(clamp(1-mean(distances)/.6)*100),fallback:plan.musicalStructure.fallback,distances};
 for(const group of ['layout','cam','trans'])plan.artDirection.vocabulary[group]=[...new Set([...(plan.artDirection.vocabulary[group]||[]),...plan.cuts.map(c=>c[group]).filter(Boolean)])];
 plan.attentionBudget=J.auditAttentionBudget(plan);return plan;
};
const durationOr=p=>p.duration||1;
const oldSocial=J.createSocialHookPlan;
J.createSocialHookPlan=(source,candidate)=>{
 const p=oldSocial(source,candidate);p.socialHook.version=3;const phases=p.socialHook.phases,phaseStyles={shock:'TIGHT',identity:'WIDE',rhythm:'MONO',escalate:'DETAIL',peak:'GRAPHIC_HEAVY',loop:'TIGHT'},portraitLayouts={shock:'portraitDiag',identity:'portraitStack',rhythm:'verticalSplit',escalate:'portraitScatter',peak:'portraitStack',loop:'portraitDiag'},wideLayouts={shock:'diag',identity:'stack',rhythm:'type',escalate:'splitScreen',peak:'huge',loop:'diag'};
 const chapters=phases.map(s=>({...s,from:candidate.start+s.from,to:candidate.start+s.to,role:s.name==='peak'?'climax':s.name==='escalate'?'build':s.name==='loop'?'finale':s.name==='shock'?'hook':'verse'}));p.musicalStructure={...p.musicalStructure,sections:chapters,method:'social-reedit'};
 const cuts=[];for(const cut of p.cuts){if(cut.end<=candidate.start||cut.start>=candidate.end||cut.line<0){cuts.push(cut);continue;}
  const boundaries=[cut.start,...chapters.flatMap(s=>[s.from,s.to]).filter(t=>t>cut.start+.001&&t<cut.end-.001),cut.end].filter((x,i,a)=>a.indexOf(x)===i).sort((a,b)=>a-b);
  for(let i=0;i<boundaries.length-1;i++){const c={...cut,params:{...cut.params},start:boundaries[i],end:boundaries[i+1],dur:boundaries[i+1]-boundaries[i],enter:'cut',exit:'cut',inDur:0,outDur:0};const phase=chapters.find(s=>c.start>=s.from-.001&&c.start<s.to);if(!phase){cuts.push(c);continue;}
   const id=p.H>p.W?portraitLayouts[phase.name]:wideLayouts[phase.name];c.layout=id;c.params={...J.LAYOUTS[id].plan(J.rng(c.seed),c,c.style||p.style),font:cut.params.font,directionAngle:cut.params.directionAngle,maxWidth:p.H>p.W?.78:.88,intensityScale:cut.params.intensityScale};c.kineticGrouped=false;c.socialHookPhase=phase.name;c.architecture=phase.name==='peak'?'giant':phase.name==='escalate'?'split':'stacked';
   const scene=p.sceneCandidates.find(s=>s.id===phaseStyles[phase.name])||p.sceneCandidates[0];c.backgroundScene={...scene,x:scene.x-50,y:scene.y-50,sceneFocal:{x:scene.x,y:scene.y}};c.cam=phase.name==='shock'||phase.name==='loop'?'drift':phase.name==='peak'?'pulse':'push';c.camP=J.CAMERA[c.cam]?.plan?.(J.rng(c.seed),c.style||p.style)||{};c.motifState=J.motifStateAt(p,c.start);c.chapter={...c.chapter,role:phase.role,typographyMode:c.architecture,backgroundVariant:scene.id,camera:c.cam};cuts.push(c);
  }
 }
 p.cuts=cuts.sort((a,b)=>a.start-b.start);const visible=p.cuts.filter(c=>c.line>=0&&c.start<candidate.end&&c.end>candidate.start),first=visible[0],last=visible.at(-1);if(first&&last){last.backgroundScene={...first.backgroundScene};last.cam=first.cam;last.motifState={...first.motifState};last.style=first.style;last.styleKey=first.styleKey;}
 p.styleArc.segments=chapters.map(c=>({from:c.from,to:c.to,role:c.role,style:J.cutAt(p,c.from+.03)?.styleKey||p.styleKey}));p.visualWorld.chapters=chapters.map(c=>({...c,scene:phaseStyles[c.name],architecture:portraitLayouts[c.name],motif:p.visualWorld.motifs[0]}));p.sceneVariants=[...new Map(visible.map(c=>[c.backgroundScene.id,c.backgroundScene])).values()];
 for(const group of ['layout','cam','trans'])p.artDirection.vocabulary[group]=[...new Set([...(p.artDirection.vocabulary[group]||[]),...p.cuts.map(c=>c[group]).filter(Boolean)])];
 p.socialHookAudit.cuts=visible.length;p.socialHookAudit.nativeArchitectures=[...new Set(visible.map(c=>c.layout))];p.socialHookAudit.sceneIds=[...new Set(visible.map(c=>c.backgroundScene.id))];p.socialHook.loop=J.measureSocialLoop(p,null,null);p.beatSync=J.measureVisualHitAlignment(p);p.attentionBudget=J.auditAttentionBudget(p);p.motifFatigue=J.auditMotifFatigue(p);return p;
};
J.measureSocialLoop=(plan,firstPixels,lastPixels,audio=null)=>{
 const range=plan.socialHook||{start:0,end:plan.duration},first=J.cutAt(plan,range.start+.1),last=J.cutAt(plan,range.end-.1);const pixels=firstPixels&&lastPixels?J.sceneDistinctness({grid:firstPixels},{grid:lastPixels}):null;
 const palette=first?.styleKey===last?.styleKey?1:.45,motion=first?.cam===last?.cam?1:.4,scene=first?.backgroundScene?.id===last?.backgroundScene?.id?1:.5;
 const envelope=audio?.energy,rate=audio?.energyRate||50,a=envelope?.[Math.round(range.start*rate)],b=envelope?.[Math.round((range.end-.05)*rate)],audioCompatibility=Number.isFinite(a)&&Number.isFinite(b)?clamp(1-Math.abs(a-b)):null;
 return {score:Math.round(100*(palette*.25+motion*.2+scene*.2+(pixels?1-pixels.score/100:.5)*.2+(audioCompatibility??.5)*.15)),pixelContinuity:pixels?100-pixels.score:null,audioCompatibility:audioCompatibility===null?null:Math.round(audioCompatibility*100),measured:!!pixels&&audioCompatibility!==null};
};
const oldContext=J.directorContext;
J.directorContext=(project,plan,audio,image)=>{
 const c=oldContext(project,plan,audio,image),f=audio?.features||{},timeline=f.detailedTimeline||f.timeline||[];
 return {...c,schema:'jizura-director-context-v3',macroSections:plan.musicalStructure?.sections||[],microSections:plan.musicalStructure?.microSections||[],sceneCandidates:plan.sceneCandidates||[],motifCandidates:plan.visualWorld?.motifs||[],styleCompatibility:plan.styleCompatibility,beatSalienceSummary:stats((plan.beatHierarchy||[]).map(b=>b.beatSalience)),audioStatistics:f.statistics||Object.fromEntries(['energy','bass','spectralFlux','density'].map(k=>[k,stats(timeline.map(t=>+t[k]||0),.5)])),currentQAFailures:plan.lastQAFailures||[],socialTarget:{duration:[12,15],aspect:'9:16',dedicatedReedit:true},visualWorldState:plan.visualWorld};
};
const oldPrompt=J.directorPrompt;
J.directorPrompt=()=>oldPrompt().replace('jizura-director-v2','jizura-director-v3')+' macroSectionsの3〜7章を中心にconcept/story/role/styleIntent/sceneIntent/motif/typographyIntent/motionIntent/restraint/climax/socialHook/loopを指定。境界の精密同期とTechnique選択はJIZURAが行います。';
const oldValidate=J.validateDirectorPlan;
J.validateDirectorPlan=(input,project,plan,audio)=>{const result=oldValidate(input,project,plan,audio);
 try{const serialized=JSON.stringify(input);if(/<\/?[a-z][^>]*>|https?:\/\/|javascript:|\beval\s*\(|=>|\bfunction\s*\(/i.test(serialized)){result.errors.push('Director JSONにコード・HTML・URLを含めることはできません');result.valid=false;}}catch{result.errors.push('JSONのみ指定してください');result.valid=false;}for(const [i,raw] of (input?.candidates||[input]).entries())if(raw?.schema==='jizura-director-v3'){
 const c=result.candidates.find(x=>x.index===i);if(!c)continue;if(!Array.isArray(raw.chapters)||raw.chapters.length<(plan.duration<9?1:3)||raw.chapters.length>7){result.errors.push('Director v3は最大7 Macro Chapterにしてください');result.valid=false;}
 if(raw.constraints?.preserveLyrics!==true||raw.constraints?.safeArea!==true){result.errors.push('Director v3には歌詞保持と安全領域をtrueで指定してください');result.valid=false;}
 if(Array.isArray(raw.chapters)&&raw.chapters.some((s,i)=>!Number.isFinite(s.from)||!Number.isFinite(s.to)||s.to<=s.from||s.from<0||s.to>plan.duration+.05||i&&s.from<raw.chapters[i-1].to-.05)){result.errors.push('Macro Chapterの時刻・重なりを確認してください');result.valid=false;}
 if(!c.plan.styleArc.length)c.plan.styleArc=c.plan.sections.map(s=>{const family=Object.keys(J.STYLE_FAMILIES).find(k=>String(s.styleIntent||'').toLowerCase().includes(k)),compatible=(J.STYLE_FAMILIES[family]||[]).find(id=>J.styleCompatibility(project.style,id).score>=.5);return {from:s.from,to:s.to,role:s.role,styles:[compatible||project.style]};});
 c.plan.chapters=c.plan.sections.map(s=>({...s}));c.plan.story=String(raw.story||'').slice(0,500);for(const s of c.plan.sections){const original=raw.chapters.find(x=>Math.abs(x.from-s.from)<.01);s.restraint=clamp(original?.restraint??.3);s.loop=String(original?.loop||'').slice(0,80);}
 }return result;};
const oldCompare=J.compareDirectorCandidates;
J.compareDirectorCandidates=async(...args)=>{const result=await oldCompare(...args);for(const c of result){c.quality.direction=c.renderPlan.musicalAlignment?.score||0;c.quality.score=Math.round(c.quality.score*.8+c.quality.direction*.2);c.recommended=false;}result.sort((a,b)=>b.quality.score-a.quality.score);if(result[0])result[0].recommended=true;return result;};
const oldQuality=J.checkMVQuality;
J.checkMVQuality=(project,plan,audio,range,pixel,...rest)=>{
 const r=oldQuality(project,plan,audio,range,pixel,...rest);if(!plan.motionDirector5)return r;const quality=r.quality,metrics=pixel?.metrics||{},direction=Math.round((plan.musicalAlignment.score*.6+(metrics.visualHitAlignment?.score??plan.beatSync.score)*.4)),typography=Math.round(clamp((metrics.distinctLayoutCount||1)/4)*35+(quality.technicalScore||0)*.65),visualWorld=Math.round((metrics.visualNovelty||40)*.35+plan.motifFatigue.score*.25+(metrics.sceneDistinctness??40)*.4);
 quality.directionScore=direction;quality.typographyScore=typography;quality.visualWorldScore=visualWorld;quality.creativeScore=Math.round((direction+typography+visualWorld)/3);quality.domains=[{key:'technical',score:quality.technicalScore,max:100},{key:'creative',score:quality.creativeScore,max:100},{key:'social',score:quality.socialScore,max:100}];
 quality.productionDomains={technical:quality.technicalScore,direction,typography,visualWorld,social:quality.socialScore};quality.overallScore=Math.round(quality.technicalScore*.3+direction*.2+typography*.18+visualWorld*.2+quality.socialScore*.12);
 quality.musicalAlignment=plan.musicalAlignment;quality.beatAlignment=metrics.visualHitAlignment?.alignedPercent??plan.beatSync.alignedPercent;quality.motifFatigue=plan.motifFatigue;
 if(pixel?.completed&&metrics.sceneDistinctnessMeasured&&!metrics.sceneDistinctnessPass){const issue={code:'SCENE_INDISTINCT',severity:plan.singleBackground&&plan.customBg?.enabled?'WARNING':'ERROR',exportBlocking:false,category:'creative',message:plan.singleBackground&&plan.customBg?.enabled?'同じ背景を保持しています。背景の画素差は参考情報です':'背景Shotの実画素差が不足しています（演出の改善情報）'};r.issues.push(issue);r.errors.push(issue);quality.hardGates.passed=false;}
 if(plan.musicalAlignment.fallback){quality.directionScore=Math.min(quality.directionScore,60);}
 const evidenceReady=pixel?.completed&&metrics.sceneDistinctnessMeasured&&quality.exportValidation==='checked';quality.perfectEligible=!!evidenceReady&&quality.technicalScore>=99&&direction>=95&&typography>=95&&visualWorld>=95&&quality.creativeScore>=95&&quality.socialScore>=95&&quality.hardGates?.passed;
 plan.lastQAFailures=r.errors.map(x=>({code:x.code,message:x.message}));
 if(!quality.perfectEligible){quality.score=Math.min(99,quality.score);quality.overallScore=Math.min(99,quality.overallScore);}return r;
};
/* Measure separate background and graphic rasters; names and registry counts are not pixel evidence. */
const oldAnalyze5=J.analyzeRenderedFrames;
J.analyzeRenderedFrames=async(plan,range,audio,telemetry={})=>{
 const result=await oldAnalyze5(plan,range,audio,telemetry);if(!result.completed||!plan.motionDirector5)return result;
 telemetry.onProgress?.({label:'シーンの違い・背景・映像効果を検査しています'});await new Promise(r=>setTimeout(r,0));
 const R=new J.Renderer(),W=96,H=Math.max(54,Math.round(W*plan.H/plan.W)),canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');
 if(plan.customBg?.enabled&&plan.customBg.dataUrl)await R.loadCustomBackground(plan.customBg.dataUrl);await R.loadAssetDeck?.(plan);
 const observe=(time)=>{R.frame(ctx,plan,time,{scale:W/plan.W,production:true,backgroundOnly:true,noPost:true,noHud:true});const pixels=ctx.getImageData(0,0,W,H).data,grid=[],histogram=Array(12).fill(0);for(let i=0;i<pixels.length;i+=16){grid.push(pixels[i]/255,pixels[i+1]/255,pixels[i+2]/255);histogram[Math.min(11,Math.floor((pixels[i]+pixels[i+1]+pixels[i+2])/765*12))]++;}const total=histogram.reduce((s,x)=>s+x,0);return {time,grid,histogram:histogram.map(x=>x/total)};};
 const from=range?.start||0,to=range?.end||plan.duration;
 const hitObservations=[];const events=[...(plan.events||[]),...(plan.hypeTimeline||[])].filter(e=>e.t>=from&&e.t<to&&e.amp>.18).sort((a,b)=>b.amp-a.amp).slice(0,6);
 for(const e of events){if(telemetry.onProgress)await new Promise(r=>setTimeout(r,0));const control={...plan,events:(plan.events||[]).filter(x=>x!==e),hypeTimeline:(plan.hypeTimeline||[]).filter(x=>x!==e)},samples=[];
  for(const delay of [0,.035,.07,.105]){const t=Math.min(to-.02,e.t+delay);R.frame(ctx,plan,t,{scale:W/plan.W,range,production:true});const real=ctx.getImageData(0,0,W,H).data;R.frame(ctx,control,t,{scale:W/plan.W,range,production:true});const without=ctx.getImageData(0,0,W,H).data;let d=0;for(let i=0;i<real.length;i+=16)d+=(Math.abs(real[i]-without[i])+Math.abs(real[i+1]-without[i+1])+Math.abs(real[i+2]-without[i+2]))/765;samples.push({time:t,difference:d/(real.length/16)});}
  const peak=samples.sort((a,b)=>b.difference-a.difference)[0],beat=closest(plan.beatHierarchy||[],peak.time),visible=peak.difference>.0005;hitObservations.push({type:e.type,time:e.t,peakTime:peak.time,difference:peak.difference,visible,error:Math.abs(peak.time-beat.time),salience:beat.beatSalience||0,aligned:visible&&Math.abs(peak.time-beat.time)<=.13});
 }
 result.metrics.visualHitAlignment={measured:true,samples:hitObservations,alignedPercent:Math.round(hitObservations.length?100*hitObservations.filter(x=>x.aligned).length/hitObservations.length:0),score:Math.round(mean(hitObservations.map(x=>x.aligned?50+50*x.salience:0)))};
 const sections=(plan.musicalStructure?.sections||[]).filter(s=>s.to>from&&s.from<to),shots=sections.map(s=>{const time=Math.min(to-.1,Math.max(from+.1,(s.from+s.to)/2)),scene=J.cutAt(plan,time)?.backgroundScene||{};return {...observe(time),zoom:scene.zoom,x:scene.sceneFocal?.x||50,y:scene.sceneFocal?.y||50,id:scene.id};});
 const comparisons=shots.slice(1).map((b,i)=>({from:shots[i].id,to:b.id,...J.sceneDistinctness(shots[i],b)}));result.metrics.sceneDistinctness=Math.round(mean(comparisons.map(x=>x.score)));result.metrics.sceneDistinctnessMeasured=comparisons.length>0;result.metrics.sceneComparisons=comparisons;result.metrics.sceneDistinctnessPass=comparisons.length>0&&comparisons.every(c=>c.score>=8);
 // Scene pool is audited against real pixels; low distance variants are exposed as duplicates.
 result.metrics.duplicateScenePairs=comparisons.filter(c=>c.score<8).map(c=>[c.from,c.to]);
 const distinctShots=[];for(const shot of shots)if(distinctShots.every(a=>J.sceneDistinctness(a,shot).score>=8))distinctShots.push(shot);result.metrics.effectiveSceneVariants=distinctShots.map(s=>s.id);plan.resolvedSceneVariants=result.metrics.effectiveSceneVariants;
 const graphics=document.createElement('canvas');graphics.width=W;graphics.height=H;const gx=graphics.getContext('2d'),graphicObs=[];
 for(const s of sections){if(telemetry.onProgress)await new Promise(r=>setTimeout(r,0));const time=Math.max(from,Math.min(to-.1,(s.from+s.to)/2));gx.setTransform(1,0,0,1,0,0);gx.clearRect(0,0,W,H);gx.setTransform(W/plan.W,0,0,W/plan.W,0,0);J.drawUnifiedMotif(gx,plan,time);const p=gx.getImageData(0,0,W,H).data;graphicObs.push({time,grid:Array.from({length:p.length/4},(_,i)=>p[i*4+3]/255)});}
 result.metrics.graphicNovelty=J.measurePerceptualNovelty(graphicObs).score;result.metrics.foregroundChannels={textMask:result.metrics.foregroundNovelty||0,graphicMask:result.metrics.graphicNovelty,background:result.metrics.sceneDistinctness};
 if(plan.socialHook){const first=observe(from+.1),last=observe(to-.1);plan.socialHook.loop=J.measureSocialLoop(plan,first.grid,last.grid,audio);result.metrics.loopQuality=plan.socialHook.loop.score;}
 R.customBgBitmap?.close?.();R.disposeAssets?.();return result;
};

J.Renderer.prototype.loadAssetDeck=async function(plan){
 this.assetBitmaps=this.assetBitmaps||new Map();const wanted=new Set((plan.assetDeck||[]).map(a=>a.id));for(const [id,b] of this.assetBitmaps)if(!wanted.has(id)){b.bitmap?.close?.();b.video?.pause?.();this.assetBitmaps.delete(id);}
 for(const a of plan.assetDeck||[]){if(this.assetBitmaps.get(a.id)?.source===a.dataUrl)continue;
  if(a.role==='video'){
   const video=document.createElement('video');if(!video.addEventListener)throw Error('この環境では動画素材を描画できません');video.muted=true;video.playsInline=true;video.preload='auto';video.src=a.dataUrl;
   try{await J.waitMediaEvent(video,'loadeddata');}catch(error){video.pause?.();video.removeAttribute?.('src');video.load?.();throw error;}const old=this.assetBitmaps.get(a.id);old?.bitmap?.close?.();old?.video?.pause?.();this.assetBitmaps.set(a.id,{source:a.dataUrl,video,role:a.role});
  }else{const response=await fetch(a.dataUrl),blob=await response.blob(),bitmap=await createImageBitmap(blob);const old=this.assetBitmaps.get(a.id);old?.bitmap?.close?.();old?.video?.pause?.();this.assetBitmaps.set(a.id,{source:a.dataUrl,bitmap,role:a.role});}
 }
};
J.Renderer.prototype.prepareAssetFrame=async function(plan,t){
 const cut=J.cutAt(plan,t),a=this.assetBitmaps?.get(cut?.assetId);if(!a?.video)return;const v=a.video,target=(t-cut.start)%Math.max(.1,v.duration||1);
 if(Math.abs(v.currentTime-target)<.02)return;const seek=J.waitMediaEvent(v,'seeked',{timeout:5000});v.currentTime=target;await seek;
};
const originalBackground=J.Renderer.prototype.drawCustomBackground;
J.Renderer.prototype.drawCustomBackground=function(ctx,plan,t,...args){
 const cut=J.cutAt(plan,t),asset=this.assetBitmaps?.get(cut?.assetId),original=this.customBgBitmap;
 if(asset?.bitmap||asset?.video){const bitmap=asset.bitmap||asset.video;this.customBgBitmap=asset.video?{width:bitmap.videoWidth,height:bitmap.videoHeight,_video:bitmap}:bitmap;}
 // The base geometry uses width/height; video dimensions are assigned on the element.
 if(asset?.video){asset.video.width=asset.video.videoWidth;asset.video.height=asset.video.videoHeight;this.customBgBitmap=asset.video;}
 let result;try{result=originalBackground.call(this,ctx,plan,t,...args);}finally{this.customBgBitmap=original;}
 const W=plan.W,H=plan.H;for(const a of plan.assetDeck||[]){const b=this.assetBitmaps?.get(a.id)?.bitmap;if(!b||!['logo','texture'].includes(a.role))continue;ctx.save();
  if(a.role==='texture'){ctx.globalAlpha=.065;ctx.globalCompositeOperation='soft-light';ctx.drawImage(b,0,0,W,H);}else{const width=Math.min(W*.12,H*.095),height=width*b.height/b.width;ctx.globalAlpha=.7;ctx.drawImage(b,W*.075,H*.10,width,height);}ctx.restore();}
 return result;
};

})();
