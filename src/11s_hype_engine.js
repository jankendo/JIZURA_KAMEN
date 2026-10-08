/* Controlled maximalism: reuse the installed style, layout and FX registries. */
(() => {
'use strict';
const C=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(+n)?+n:a));
const C100=n=>Math.max(0,Math.min(100,Number.isFinite(+n)?+n:0));
const avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const norm=s=>String(s||'').replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase();
const CHANT=/CHANT|TEAM_CALL/.source;
const tierScale={CLEAN:.86,STANDARD:1,HIGH_ENERGY:1.09,HYPER:1.15};
J.resolveVisualEnergy=(project,audio)=>{
 const lyrics=J.parseLyrics(project?.lyrics||'').lines.map(x=>norm(x.text)),counts=new Map();lyrics.forEach(x=>counts.set(x,(counts.get(x)||0)+1));
 const repeated=lyrics.length?lyrics.filter(x=>(counts.get(x)||0)>1).length/lyrics.length:0,m=audio?.features||{};
 const chant=new RegExp(CHANT).test(project?.artDirection?.visualDNA?.type||'')||lyrics.some(x=>/^(?:アレ){1,3}(?:ガンバ|アレー)/.test(x));
 const image=!!(project?.customBg?.enabled&&project?.customBg?.dataUrl),purpose=String(project?.purpose||project?.exportSettings?.purpose||'x').toLowerCase();
 const score=C(.28*C(m.energy??.42)+.22*C(m.beatStrength??.4)+.18*C(m.onsetDensity??m.density??.3)+.18*repeated+.08*chant+.06*image+.05*(/x|social|sns|hook/.test(purpose)));
 const forced=String(project?.visualEnergyDensity||'auto').toUpperCase();
 const automatic=chant&&score>=.48?'HYPER':score>=.56?'HYPER':score>=.39?'HIGH_ENERGY':score>=.23?'STANDARD':'CLEAN';
 const tier=['CLEAN','STANDARD','HIGH_ENERGY','HYPER'].includes(forced)?forced:automatic;
 return {tier,score:+score.toFixed(3),automatic,chant,repetition:+repeated.toFixed(3),image,purpose,scale:tierScale[tier]};
};
J.tokenizeKinetic=(text)=>{
 const raw=String(text||''),clean=norm(raw),chant=clean.match(/^((?:アレ){1,3})(ガンバ(?:エー|ーレ|ー)?|アレー)$/u);
 if(chant&&!/[\s\p{P}\p{S}]/u.test(raw)){const first=chant[1].match(/アレ/g)||[];return [...first,chant[2]];}
 const parts=raw.match(/[\s\p{P}\p{S}]+|[^\s\p{P}\p{S}]+/gu)||[];
 return parts.flatMap(part=>/^[\s\p{P}\p{S}]+$/u.test(part)?[part]:/[\p{Script=Han}ぁ-んァ-ヶ]/u.test(part)?[...part]:[part]);
};
const nearestBeat=(beats,t)=>{
 if(!beats?.length)return t;
 let best=t,dist=.16;
 for(const b of beats){const d=Math.abs(b-t);if(d<dist){best=b;dist=d;}if(b>t+.16)break;}
 return best;
};
J.socialHookCandidates=(plan,audio,minSeconds=12,maxSeconds=15)=>{
 if(!audio?.duration||!plan?.lines?.length||!plan.hasTimedLyrics)throw new Error('15秒版には時刻付きLRCと音源が必要です');
 minSeconds=C(minSeconds,12,15);maxSeconds=C(maxSeconds,minSeconds,15);
 const duration=Math.min(audio.duration,plan.duration||audio.duration),lines=plan.lines.filter(l=>Number.isFinite(l.start)&&l.start>=0&&l.start<duration-.1);
 if(!lines.length)throw new Error('LRCの時刻を読み取れません');
 const bounds=[...new Set([...lines.map(l=>+l.start.toFixed(3)),+duration.toFixed(3)])].sort((a,b)=>a-b),timeline=audio.features?.timeline||[],beats=audio.beats||plan.beats||[];
 const sample=(from,to)=>timeline.filter(v=>v.time>=from&&v.time<to),meanKey=(items,key)=>avg(items.map(v=>C(v[key]||0)));
 const normalized=lines.map(l=>norm(l.text)),freq=new Map();normalized.forEach(s=>freq.set(s,(freq.get(s)||0)+1));
 const candidates=[];
 for(const start of bounds.slice(0,-1)){
  if(start+minSeconds>duration)continue;
  const ends=bounds.filter(e=>e-start>=minSeconds-.02&&e-start<=maxSeconds+.05);
  for(const end of ends){
   const selected=lines.filter(l=>l.start>=start-.01&&l.start<end-.01);if(selected.length<3)continue;
   const all=sample(start,end),first=sample(start,Math.min(end,start+3)),before=sample(Math.max(0,start-6),start);
   const energy=meanKey(all,'energy'),early=meanKey(first,'energy'),density=meanKey(all,'density'),rise=C((early-meanKey(before,'energy'))*1.5+.45);
   const repeats=avg(selected.map(l=>C(((freq.get(norm(l.text))||1)-1)/2))),memorable=avg(selected.map(l=>C(1-[...l.text].length/24)));
   const chant=selected.filter(l=>/ガンバ|アレー|フォルツァ|アレ/u.test(l.text)).length/selected.length;
   const beat=beats.length?Math.min(...beats.map(b=>Math.abs(b-start))):.2;
   const firstStrong=C(early*.7+density*.3),score=.29*energy+.19*firstStrong+.12*rise+.14*repeats+.10*memorable+.11*chant+.05*(1-C(beat/.25))-.025*Math.abs((end-start)-13.5);
   candidates.push({start:+start.toFixed(2),end:+end.toFixed(2),duration:+(end-start).toFixed(2),score:+score.toFixed(4),reason:'冒頭3秒の強さ・チャントの反復・LRC区切り',complete:true,first3Energy:+early.toFixed(3)});
  }
 }
 candidates.sort((a,b)=>b.score-a.score||a.start-b.start);
 const picks=[];for(const c of candidates){if(picks.every(p=>Math.abs(p.start-c.start)>=10)){picks.push(c);if(picks.length===3)break;}}
 if(!picks.length)throw new Error('12〜15秒に収まる自然なLRC区間がありません');
 return picks;
};
const basePlan=J.plan;
J.plan=(project,audio)=>{
 const plan=basePlan(project,audio);if(!project?.autoDirection||!plan.artDirection?.visualDNA)return plan;
 const energy=J.resolveVisualEnergy(project,audio),d=plan.artDirection,chants=new Map(),cuts=plan.cuts.filter(c=>c.line>=0&&c.layout!=='interlude');
 plan.visualEnergyDensity=energy;plan.hypeTimeline=[];
 plan.hookEngine={version:1,window:3,patternInterrupt:false,openingPunch:false,openingAt:null,firstCut:null,kineticTypography:'word-and-beat'};
 const normalizedCuts=cuts.map(c=>norm(c.lineText||c.text));
 for(let i=0;i<cuts.length;i++){
  const c=cuts[i],key=normalizedCuts[i],rep=chants.get(key)||0;chants.set(key,rep+1);
  const target=/^(?:アレ){1,3}(?:ガンバ(?:エー|ーレ|ー)?|アレー)$/.test(key);
  const base=Number(c.params?.intensityScale)||1,progress=C((c.repetitionProgress??Math.min(1,rep/3))),prev=chants.get(key+'\u0000scale');
  c.kineticGrouped=target;c.kineticTokens=target?J.tokenizeKinetic(c.lineText||c.text):(c.words?.length>1?c.words.slice():[]);
  if(target)c.words=c.kineticTokens.slice();
  let hypeScale=C(base*(.91+energy.scale*.09)+.15*progress,.82,1.27);
  if(rep>0&&Number.isFinite(prev))hypeScale=Math.max(hypeScale,Math.min(1.27,prev+.012));
  c.params.intensityScale=hypeScale;chants.set(key+'\u0000scale',hypeScale);
  c.params.hypeProgress=progress;c.params.hypeTier=energy.tier;
  if(plan.hookEngine.firstCut==null)plan.hookEngine.firstCut=c;
  if(rep>0)c.hypeAccent=['chroma','zoom','shake'][Math.min(2,rep-1)];
 }
 const add=(t,type,amp,dur,reason)=>{
  const previous=[...(plan.events||[]),...plan.hypeTimeline];
  if(!J.FXE?.[type]||previous.some(e=>e.type===type&&Math.abs(e.t-t)<.34))return false;
  if(previous.filter(e=>Math.abs(e.t-t)<.8&&['flash','zoom','shake','chroma'].includes(e.type)).length>=2)return false;
  plan.hypeTimeline.push({t:+Math.max(0,t).toFixed(4),type,amp,dur,hype:true,reason});return true;
 };
 const first=plan.hookEngine.firstCut,hookMode=String(project.hookStrength||'auto').toLowerCase();
 if(first){
  if(first.start>.24&&first.start<3){
   const openingAt=(plan.beats||[]).find(b=>b>=0&&b<Math.min(first.start,.45))??nearestBeat(plan.beats,Math.min(first.start,.12));
   plan.hookEngine.openingAt=openingAt;
   // Make the soundtrack's first moment register before the first lyric arrives.
   add(openingAt,'flash',.34,.035,'hook-opening-punch');
   add(openingAt+.04,'zoom',.58,.14,'hook-opening-scale');
   add(openingAt+.27,'chroma',.4,.13,'hook-opening-chroma');
   plan.hookEngine.openingPunch=plan.hypeTimeline.some(e=>e.reason.startsWith('hook-opening'));
  }
  const hookAt=nearestBeat(plan.beats,first.start),hookAmp=hookMode==='maximum'?1.16:.92;
  // One short whole-frame punch plus a zoom/chroma accent; avoid repeated strobing.
  const flash=add(hookAt,'flash',.62,.04,'hook-pattern-interrupt');
  add(hookAt+.045,'zoom',hookAmp,.19,'hook-scale-punch');
  add(hookAt+.31,'chroma',.72,.18,'hook-color-hit');
  plan.hookEngine.patternInterrupt=!!first;
  const mobileWeight=/x|social|sns|hook/i.test(String(project.purpose||project.exportSettings?.purpose||'x'));
  first.params.intensityScale=C(first.params.intensityScale*(mobileWeight?1.08:1.04),.9,1.27);
  first.params.hookScale=hookMode==='maximum'?1.18:1.12;
 }
 // Repeats keep their selected layout/font and build a deliberate, bounded accent ladder.
 const added=[];
 for(const c of cuts){
  if(!c.hypeAccent||c.repetitionIndex<1)continue;
  const t=nearestBeat(plan.beats,c.start),amp=c.hypeAccent==='shake'?.38:c.hypeAccent==='zoom'?.64:.55;
  if(add(t,c.hypeAccent,amp,c.hypeAccent==='zoom'?.16:.21,'repetition-'+c.repetitionIndex))added.push({t,type:c.hypeAccent,rep:c.repetitionIndex});
 }
 // One medium/major accent at roughly 10-second structural peaks, never on every beat.
 const major=(d.sectionProfiles||[]).filter(p=>p.majorEvent&&p.start>=3).map(p=>nearestBeat(plan.beats,p.start));
 for(const t of major){if(added.every(x=>Math.abs(x.t-t)>1.8))add(t,'zoom',.46,.17,'section-major');}
 plan.events.sort((a,b)=>a.t-b.t);
 plan.hypeAudit=J.auditHypePlan(plan);
 return plan;
};
const renderKineticGroups=env=>{
 const c=env.cut,tokens=c?.kineticGrouped?c.kineticTokens:null;
 if(!tokens||tokens.length<2||tokens.join('')!==String(c.text||'').trim())return null;
 const P=c.params||{},W=env.W,H=env.H,center=c.layout==='center',font=P.font||env.st.fonts.display[0],track=P.track??.04,lead=1.2,sx=P.sx||1;
 const maxW=W*(center?(P.maxWidth||.84)*.91:.68),full=tokens.join('');
 let size=Math.min(J.fitSize(full,font,maxW,H*(center?.5:.36),{sx,track,lead}),H*(center?.33:.22))*(P.intensityScale||1);
 const measure=()=>tokens.map(text=>J.measure({text,font,size,track,lead}));
 let metrics=measure(),gap=size*.055,total=metrics.reduce((n,m)=>n+m.w*Math.abs(sx),0)+gap*(tokens.length-1);
 const fit=Math.min(1,maxW/Math.max(1,total));size*=fit;gap*=fit;metrics=measure();total=metrics.reduce((n,m)=>n+m.w*Math.abs(sx),0)+gap*(tokens.length-1);
 const beats=env.plan.beats||[];let first=-1;for(let i=0;i<beats.length;i++)if(beats[i]>=c.start-.045){first=i;break;}
 const beatIndex=env.beat?.index,beatStep=beatIndex!=null&&first>=0&&beatIndex>=first?beatIndex-first:Math.floor(env.lt/Math.max(.32,c.dur/tokens.length));
 const active=Math.min(tokens.length-1,Math.max(0,beatStep%tokens.length)),pulse=env.beat?Math.exp(-Math.max(0,env.beat.since)*11):.6,emphasis=c.kineticEmphasis||[],behavior=c.kineticBehavior||'beat-pop';
 const startX=center?W/2-total/2:W*.13,cx=startX+(P.ox||0)*W,y=H/2+(P.oy||0)*H,sc=env.sc;
 let cursor=cx,bb=null;
 for(let i=0;i<tokens.length;i++){
  const hit=i===active&&(!emphasis.length||emphasis.includes(i)),scale=hit?C(1+.22*pulse+.045*(c.repetitionProgress||0),1,1.27):.96,fs=size*scale,w=metrics[i].w*Math.abs(sx);
  const item={text:tokens[i],font,size:fs,align:'left',x:cursor,y,sx,track,lead,color:hit?J.fitContrast(sc.accent,sc.bg,3):sc.fg,
   stroke:hit?Math.max(1.5,fs*.035):0,strokeColor:sc.bg,strokeUnder:hit,mi:i,ghost:false};
  const rect=J.mainDraw(env,item);if(rect){bb=J.unionBB(bb,rect);if(hit&&Number.isFinite(rect.x0)&&Number.isFinite(rect.x1)&&Number.isFinite(rect.y1)){const ctx=env.ctx;ctx.save();ctx.globalAlpha=.88;ctx.globalCompositeOperation='source-over';ctx.strokeStyle='#0787E8';ctx.lineWidth=Math.max(2,fs*.032);ctx.lineCap='square';ctx.beginPath();const markY=Math.min(H*.94,rect.y1+fs*.075);ctx.moveTo(rect.x0,markY);ctx.lineTo(rect.x1,markY);ctx.stroke();ctx.restore();}}cursor+=w+gap;
 }
 c.kineticRuntime={activeToken:active,tokenCount:tokens.length,beatAligned:beatIndex!=null,behavior};return bb;
};
for(const name of ['center','type'])if(J.LAYOUTS?.[name]?.render){
 const layout=J.LAYOUTS[name],render=layout.render;
 layout.render=function(env){return env.cut?.kineticGrouped?renderKineticGroups(env):render(env);};
}
J.hasKineticTypography=!!renderKineticGroups;
J.auditHypePlan=plan=>{
 const cuts=(plan?.cuts||[]).filter(c=>c.line>=0&&c.layout!=='interlude'),tokens=cuts.filter(c=>c.kineticTokens?.length>1),repeated=cuts.filter(c=>c.repetitionIndex>0),events=plan?.hypeTimeline||[];
 const groups=new Map();for(const c of cuts){const key=norm(c.lineText||c.text);if(c.repetitionIndex>0){const list=groups.get(key)||[];list.push(c);groups.set(key,list);}}
 const ladder=[...groups.values()].every(list=>list.length<2||list.every((c,i)=>i===0||c.params.intensityScale>=list[i-1].params.intensityScale-.035));
 const within=events.every(e=>['chroma','zoom','shake','flash'].includes(e.type)&&e.dur<=.25&&e.amp<=1.2);
 return {hook:!!plan?.hookEngine?.patternInterrupt,kineticTokens:tokens.length,kineticRender:!!J.hasKineticTypography,repetitionLadder:ladder,eventCount:events.length,eventRate:+(events.length/Math.max(1,plan.duration)).toFixed(3),bounded:within,ok:!!plan?.hookEngine?.patternInterrupt&&ladder&&within&&!!J.hasKineticTypography};
};
J.hypeQuality=(project,plan,audio,range,pixel)=>{
 const from=range?.start??0,to=range?.end??plan?.duration??0,dur=Math.max(.1,to-from);
 // Evaluate the first visible lyric in this export range, including mid-line trims.
 const firstCut=(plan?.cuts||[]).find(c=>c.line>=0&&c.layout!=='interlude'&&c.end>from&&c.start<to),anchor=firstCut?Math.max(from,firstCut.start):from;
 const events=[...(plan?.events||[]),...(plan?.hypeTimeline||[])].filter(e=>e.t>=anchor&&e.t<Math.min(to,anchor+3));
 const hasPunch=events.some(e=>e.hype&&['zoom','flash','chroma'].includes(e.type)),beat=audio?.beats?.length||plan?.beats?.length||0;
 const firstScale=!!(firstCut&&(firstCut.params?.hookScale>=1.1||firstCut.socialHookPhase==='hook'));
 const hook=C100(26*!!plan?.hookEngine?.patternInterrupt+22*hasPunch+18*firstScale+14*(beat>0)+10*!!plan?.visualEnergyDensity+10*(events.length>=2));
 const scroll=C100(.62*hook+.2*C((firstCut?.params?.intensityScale||1)-.8,0,.5)*200+.18*(plan?.visualEnergyDensity?.chant?100:65));
 const cutRate=(plan?.cuts||[]).filter(c=>c.line>=0&&c.start>=from&&c.start<to).length/dur,beatGrid=audio?.beats||plan?.beats||[],beatRate=beatGrid.filter(b=>b>=from&&b<to).length/(2*dur),visualRate=Math.max(cutRate,beatRate),frameMotion=pixel?.metrics?.motionEnergy??0;
 const tier=plan?.visualEnergyDensity?.tier||'STANDARD',target=({CLEAN:.2,STANDARD:.38,HIGH_ENERGY:.72,HYPER:.95})[tier],cadence=visualRate<.83?100-(.83-visualRate)*100:visualRate>3.33?100-(visualRate-3.33)*20:100-Math.abs(visualRate-target)*12,rateScore=C100(cadence-Math.max(0,frameMotion-.28)*130);
 const density=C100(.62*rateScore+.2*(plan?.hypeAudit?.bounded?100:35)+.18*(plan?.hypeAudit?.repetitionLadder?100:45));
 const share=C100(.48*scroll+.24*hook+.18*(dur>=12&&dur<=15?100:70)+.1*(plan?.artDirection?.visualDNA?.type?90:55));
 return {hookStrength:Math.round(hook),scrollStopPower:Math.round(scroll),visualEnergyDensity:Math.round(density),socialShareability:Math.round(share),eventRate:+visualRate.toFixed(3),tier,hardFail:frameMotion>.42||!plan?.hypeAudit?.bounded};
};
const baseScore=J.scoreMVQuality;
J.scoreMVQuality=(report,project,plan,audio,range,pixel,capabilities,validation)=>{
 report=baseScore(report,project,plan,audio,range,pixel,capabilities,validation);
 if(!project?.autoDirection||!plan?.visualEnergyDensity)return report;
 const hype=J.hypeQuality(project,plan,audio,range,pixel);report.quality.hype=hype;
 if((pixel?.metrics?.motionEnergy??0)>.42&&!report.issues.some(x=>x.code==='motion_excess'))report.issues.push({code:'motion_excess',severity:'ERROR',message:'画面変化が強すぎるため、動きを抑えてください'});
 if(!plan.hypeAudit.bounded&&!report.issues.some(x=>x.code==='effect_soup'))report.issues.push({code:'effect_soup',severity:'ERROR',message:'効果の密度または強度が一貫性の基準を超えています'});
 const weights={hookStrength:3,scrollStopPower:3,visualEnergyDensity:2,socialShareability:2};
 const old=report.quality.categories.map(c=>({...c,max:+(c.max*.9).toFixed(2),score:+(c.score*.9).toFixed(2)}));
 const extra=Object.entries(weights).map(([key,max])=>({key,max,score:+(max*hype[key]/100).toFixed(1)}));
 report.quality.categories=[...old,...extra];
 const gates=report.issues.filter(i=>i.severity==='ERROR');report.quality.hardGates={passed:!gates.length,total:gates.length};
 report.errors=report.issues.filter(i=>i.severity==='ERROR');report.warnings=report.issues.filter(i=>i.severity==='WARNING');report.ready=!gates.length;
 report.quality.score=Math.min(gates.length?84:100,Math.round(report.quality.categories.reduce((s,c)=>s+c.score,0)));
 return report;
};
const baseFrame=J.Renderer?.prototype?.frame;
if(baseFrame)J.Renderer.prototype.frame=function(ctx,plan,t,opt={}){
 const hype=plan?.visualEnergyDensity,rangeStart=opt.range?.start,anchor=Number.isFinite(rangeStart)?rangeStart:(plan?.hookEngine?.firstCut?.start||0);
 const c=plan?.cuts?.find(x=>x.line>=0&&x.layout!=='interlude'&&x.start>=anchor-.02&&x.start<anchor+.1),priorScale=c?.params?.intensityScale,priorHookScale=c?.params?.hookScale;
 if(c&&t>=anchor&&t<anchor+.68){c.params.intensityScale=C(priorScale*1.1,.82,1.27);c.params.hookScale=Math.max(c.params.hookScale||1,1.1);}
 const transient=[];
 if(hype){
  const entries=(plan.hypeTimeline||[]).filter(e=>t>=e.t-.02&&t<e.t+e.dur+.03);
  if(!plan.motionDirector6&&Number.isFinite(rangeStart)&&t>=anchor&&t<anchor+.5)entries.push(...[{t:anchor,type:'flash',amp:.62,dur:.04},{t:anchor+.045,type:'zoom',amp:.92,dur:.19},{t:anchor+.31,type:'chroma',amp:.55,dur:.18}].filter(e=>!(plan.hypeTimeline||[]).some(x=>x.reason?.startsWith('hook-')&&Math.abs(x.t-e.t)<.02)));
  for(const e of entries){const x={...e,hype:true,reason:e.reason||'hype-transient'};plan.events.push(x);transient.push(x);}
  if(transient.length)plan.events.sort((a,b)=>a.t-b.t);
 }
 let value;
 try{value=baseFrame.call(this,ctx,plan,t,opt);}
 finally{
  if(c&&priorScale!=null){c.params.intensityScale=priorScale;if(priorHookScale===undefined)delete c.params.hookScale;else c.params.hookScale=priorHookScale;}
  if(transient.length)for(const e of transient){const i=plan.events.indexOf(e);if(i>=0)plan.events.splice(i,1);}
 }
 if(opt.transparent||opt.noHype||!hype||!['HIGH_ENERGY','HYPER'].includes(hype.tier))return value;
 const W=ctx.canvas.width,H=ctx.canvas.height;if(!W||!H)return value;
 const beats=plan.beats||[],idx=beats.length?beats.reduce((n,b,i)=>b<=t?i:n,-1):-1,beatTime=idx>=0?beats[idx]:-1,dt=t-beatTime;
 const kick=beatTime>=0&&dt>=0&&dt<.16&&idx%2===0?Math.exp(-dt*18):0;
 const hook=C(1-Math.max(0,t-anchor)/.8)*.45,alpha=Math.min(.28,kick*.22+hook);
 if(alpha<=.008)return value;
 const sc=plan.style?.schemes?.[0]||{},blue=hype.chant?'#0086d6':(sc.accent||'#168de2'),second=sc.accent2||'#edf5ff';
 ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=alpha;ctx.globalCompositeOperation='screen';ctx.lineCap='square';
 const tick=Math.max(1,H*.006),sweep=((t*H*.7)%H);
 ctx.strokeStyle=blue;ctx.lineWidth=tick;
 // Narrow edge-only streaks frame the lyrics; the center remains clear and legible.
 ctx.beginPath();ctx.moveTo(0,H*.18+sweep*.04);ctx.lineTo(W*.055,H*.18+sweep*.04+H*.045);ctx.moveTo(W,H*.78-sweep*.025);ctx.lineTo(W*.94,H*.78-sweep*.025-H*.045);ctx.stroke();
 if(kick>.18){ctx.strokeStyle=second;ctx.globalAlpha=alpha*.72;ctx.lineWidth=Math.max(1,H*.0025);ctx.beginPath();ctx.moveTo(W*.02,H*.09);ctx.lineTo(W*.09,H*.09);ctx.moveTo(W*.98,H*.91);ctx.lineTo(W*.91,H*.91);ctx.stroke();}
 ctx.restore();return value;
};
})();
