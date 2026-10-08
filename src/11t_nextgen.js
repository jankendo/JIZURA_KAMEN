/* Next-generation direction, perceptual QA and offline Director Bridge. */
(() => {
'use strict';
const C=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(+n)?+n:a));
const avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const meanAbs=(a,b)=>{if(!Array.isArray(a)||!Array.isArray(b)||!a.length||a.length!==b.length)return 0;let s=0;for(let i=0;i<a.length;i++)s+=Math.abs(a[i]-b[i]);return s/a.length;};
const plain=(o)=>o&&typeof o==='object'&&!Array.isArray(o);
const FAMILY={
  technical:['blueprint','hud','mint','mono','vapor','synth80','acid'],
  aggressive:['acid','caution','crimson','mono','noir','rouge'],
  sports:['caution','transit','blueprint','acid','hud','crimson','rouge'],
  editorial:['paper','newsprint','kraft','transit','specimen'],
  organic:['forest','ocean','sunset','sakura','sumi','gold'],
  japanese:['sumi','sakura','gold','paper','forest']
};
J.STYLE_FAMILIES=FAMILY;
J.styleCompatibility=(a,b)=>{
  const fa=Object.keys(FAMILY).filter(f=>FAMILY[f].includes(a)),fb=Object.keys(FAMILY).filter(f=>FAMILY[f].includes(b));
  const shared=fa.filter(f=>fb.includes(f));
  if(a===b)return {score:1,shared};
  const x=J.buildStyleProfile?.(a),y=J.buildStyleProfile?.(b);
  let distance=0,n=0;for(const k of ['energy','rhythm','aggression','editorial','organicness','digitalness','typographyWeight','textureAmount'])if(x&&y){distance+=Math.abs(x[k]-y[k]);n++;}
  const profile=1-distance/Math.max(1,n);
  return {score:+C(shared.length?0.72+(1-0.72)*profile*0.66:profile*0.66).toFixed(3),shared};
};
J.STYLE_COMPATIBILITY_GRAPH=Object.fromEntries(J.STYLE_ORDER.map(a=>[a,J.STYLE_ORDER.filter(b=>a!==b).map(b=>({style:b,...J.styleCompatibility(a,b)})).sort((x,y)=>y.score-x.score||x.style.localeCompare(y.style))]));

/* Compare low-resolution raster and structural cues; event count alone cannot lift this score. */
J.measurePerceptualNovelty=observations=>{
  const frames=(observations||[]).filter(x=>Number.isFinite(x?.time)).sort((a,b)=>a.time-b.time),pairs=[];
  let stale=0,longest=0,previousTime=frames[0]?.time||0;
  for(let i=1;i<frames.length;i++){
    const a=frames[i-1],b=frames[i],delta=meanAbs(a.grid,b.grid),palette=meanAbs(a.palette,b.palette);
    const ac=a.grid||[],bc=b.grid||[],n=Math.min(ac.length,bc.length),cells=Math.floor(n/3);let changed=0;
    for(let k=0;k<n;k+=3)if(Math.abs(ac[k]-(bc[k]||0))+Math.abs((ac[k+1]||0)-(bc[k+1]||0))+Math.abs((ac[k+2]||0)-(bc[k+2]||0))>.18)changed++;
    const color=Math.min(100,delta*720+changed/Math.max(1,cells)*38),layout=+(!!a.layout&&!!b.layout&&a.layout!==b.layout),style=+(!!a.style&&!!b.style&&a.style!==b.style),lyric=+(!!a.line&&!!b.line&&a.line!==b.line);
    const box=a.box&&b.box?avg(['x0','y0','x1','y1'].map(k=>Math.abs((a.box[k]||0)-(b.box[k]||0)))):(a.box!==b.box?0.18:0);
    const edgeA=Array.isArray(a.grid)?a.grid:[],edgeB=Array.isArray(b.grid)?b.grid:[];let edge=0,ec=0;
    for(let k=0;k+3<Math.min(edgeA.length,edgeB.length);k+=3){edge+=Math.abs((edgeA[k]||0)-(edgeA[k+3]||0)-((edgeB[k]||0)-(edgeB[k+3]||0)));ec++;}
    const edgeScore=Math.min(100,edge/Math.max(1,ec)*420),score=Math.round(C(color*.55+edgeScore*.12+layout*25+style*22+lyric*14+box*85,0,100));
    const gap=Math.max(0,b.time-a.time),isStale=score<12;
    stale=isStale?stale+gap:0;longest=Math.max(longest,stale);
    pairs.push({from:a.time,to:b.time,score,stagnant:isStale});previousTime=b.time;
  }
  const scores=pairs.map(p=>p.score),opening=scores.filter((_,i)=>pairs[i].from<=(frames[0]?.time||0)+3),body=scores.filter((_,i)=>pairs[i].from>(frames[0]?.time||0)+3);
  const mean=avg(scores),variance=avg(scores.map(x=>(x-mean)**2));
  return {score:Math.round(mean),stagnationSeconds:+longest.toFixed(2),temporalContrast:Math.round(Math.sqrt(variance)*2.2),
    openingNovelty:Math.round(C(50+(avg(opening)-avg(body))*1.8,0,100)),pairs,interval:frames.length>1?+avg(pairs.map(p=>p.to-p.from)).toFixed(3):0};
};
J.attentionCost=(type,amp=1)=>{
  const key=String(type||'').toLowerCase(),base=key.includes('flash')||key.includes('strobe')?0.5:key.includes('zoom')||key.includes('shake')||key.includes('punch')?0.35:key.includes('chroma')||key.includes('rgb')?0.35:key.includes('decor')||key.includes('particle')?0.15:key.includes('texture')||key.includes('grain')?0.1:key.includes('trans')||key.includes('wipe')?0.8:0.25;
  return +C(base*Math.max(.35,Math.min(1.35,+amp||1)),0,1).toFixed(3);
};
J.auditAttentionBudget=plan=>{
  const events=[...(plan?.events||[]),...(plan?.hypeTimeline||[])].filter(e=>Number.isFinite(e.t)),max=1.25,windows=[];
  const times=[...new Set(events.flatMap(e=>[e.t,e.t+Math.max(.04,(e.dur||.15)*.5)]).map(t=>Math.round(t*20)/20))].sort((a,b)=>a-b);
  for(const t of times){const active=events.filter(e=>t>=e.t-.01&&t<e.t+Math.max(.04,e.dur||.15)),cut=J.cutAt(plan,t),decor=(cut?.decor||[]).length,kinetic=cut?.kineticGrouped?1:0;
    const layers={typography:kinetic*.14,background:0,decoration:decor*.07,camera:0,fullFX:0};
    for(const e of active){const key=/zoom|shake|camera|push/i.test(e.type)?'camera':/background|texture|grain|sweep/i.test(e.type)?'background':/decor|particle/i.test(e.type)?'decoration':'fullFX';layers[key]+=J.attentionCost(e.type,e.amp)*.65;}
    const cost=Object.values(layers).reduce((a,b)=>a+b,0);windows.push({t:+t.toFixed(2),cost:+cost.toFixed(3),layers});}
  const peak=windows.reduce((m,x)=>Math.max(m,x.cost),0);return {max,peak:+peak.toFixed(3),withinBudget:peak<=max,windows};
};
const FAMILY_SIZE={layout:[2,5],enter:[2,5],hold:[1,3],exit:[2,4],decor:[2,6],treat:[1,4],bg:[0,3],cam:[1,3],fx:[2,6],trans:[1,3]};
const SAFE_HYPER_FX=['speedLines','focusLines','zoomPunch','lightSweep','bloomFlash','rgbSplit','whiteFrame','heartbeat','echoFrames','whipBlur'];
/* atomOrbit triggers a native canvas panic in the Site-compatible renderer when layered. */
const SAFE_HYPER_DECOR=new Set(J.order('decor').filter(id=>id!=='atomOrbit'));
const textOf=(id,d)=>`${id} ${d?.name||''} ${(d?.tags||[]).join(' ')}`.toLowerCase();
const SEMANTIC={impact:/impact|huge|punch|flash|stamp|slam|burst|giant|bold|hit/u,sports:/sports|stadium|team|stripe|number|score|field|speed|rally|banner/u,digital:/digital|hud|rgb|glitch|scan|pixel|terminal|data|code/u,kinetic:/kinetic|motion|zoom|slice|scramble|diagonal|streak|wave|orbit/u,editorial:/editorial|paper|column|label|type|quote|news|signage/u,organic:/organic|grain|ink|wave|particle|bokeh|nature|light/u};
J.buildTechniquePalette=(styleKey,mood='graphic',tier='STANDARD')=>{
  const style=J.STYLES[styleKey]||J.STYLES.noir,score=(g,id,d)=>{
    const bias=style.bias?.[g]?.[id]||0,tags=(d.tags||[]).includes(mood)?1.3:0,words=textOf(id,d),semantic=Object.entries(SEMANTIC).reduce((s,[tag,re])=>s+(new RegExp(tag,'u').test(mood)?(re.test(words)?1.4:0):0),0);
    const extra=d.pack&&d.pack!=='core'?0.18:0,energy=['HIGH_ENERGY','HYPER'].includes(tier)&&/impact|sports|digital|kinetic/.test(words)?0.55:0;
    return bias+tags+semantic+extra+energy;
  };
  const palette={style:styleKey,mood,tier};
  for(const [g,[min,max]] of Object.entries(FAMILY_SIZE)){
    const reg=J.registry(g),ids=J.order(g).filter(id=>reg[id]&&!reg[id].special&&(g!=='fx'||SAFE_HYPER_FX.includes(id))&&(g!=='decor'||SAFE_HYPER_DECOR.has(id))).map(id=>({id,score:score(g,id,reg[id])})).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
    const target=ids.length?Math.max(min,Math.min(max,Math.round(min+(max-min)*(['HIGH_ENERGY','HYPER'].includes(tier)?0.6:0.35)))):0;
    palette[g]=ids.slice(0,target).map(x=>x.id);
  }
  return palette;
};
J.resolveTechniqueIntent=(group,intents=[],styleKey='blueprint',limit=3)=>{
  const reg=J.registry(group),wanted=(Array.isArray(intents)?intents:[intents]).map(x=>String(x).toLowerCase()),style=J.STYLES[styleKey]||J.STYLES.noir;
  return J.order(group).filter(id=>reg[id]&&!reg[id].special).map(id=>{
    const words=textOf(id,reg[id]),hit=wanted.reduce((n,w)=>n+(w===id?2:SEMANTIC[w]?.test(words)?1:wanted.some(x=>words.includes(x))?1:0),0),bias=style.bias?.[group]?.[id]||0;
    return {id,score:hit*3+bias+(reg[id].tags?.length||0)*.08};
  }).filter(x=>!wanted.length||x.score>0).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,Math.max(1,limit)).map(x=>x.id);
};

J.buildStyleArc=(plan,project,audio)=>{
  const duration=Math.max(.1,plan?.duration||0),base=plan?.styleKey||project.style,profiles=plan?.artDirection?.sectionProfiles||[],tier=plan?.visualEnergyDensity?.tier||'STANDARD';
  const amount=({low:0,medium:.28,high:.52,maximum:.78})[project?.visualDirection?.styleDiversity]??(['HIGH_ENERGY','HYPER'].includes(tier)?0.62:0.42);
  let candidates=(plan.artDirection?.styleDecision?.candidates||[]).map(x=>x.style).filter(k=>k!==base&&J.STYLES[k]);
  if(!candidates.length&&plan.artDirection?.styleDecision?.input)candidates=J.scoreStyleProfiles(plan.artDirection.styleDecision.input,J.STYLE_ORDER).map(x=>x.style).filter(k=>k!==base);
  const compatible=candidates.filter(k=>J.styleCompatibility(base,k).score>=.5),accent=compatible[0]||candidates[0]||base;
  const peak=compatible.filter(k=>k!==accent&&J.styleCompatibility(accent,k).score>=.5)[1]||compatible.find(k=>k!==accent)||accent;
  const director=project?.directorPlan,manual=Array.isArray(director?.styleArc)&&director.styleArc.length;
  const source=manual?director.styleArc:profiles.map((p,i)=>{
    let style=base,role='base';
    if(amount>0&&p.start<3&&duration>8){style=accent;role='hook';}
    else if(amount>.2&&p.majorEvent&&p.intensity>.72){style=peak;role='peak';}
    else if(amount>.24&&p.intensity>.58&&i%3===1){style=accent;role='accent';}
    if(i===profiles.length-1&&p.type==='finalChorus'&&amount>.4){style=peak;role='finale';}
    return {from:p.start,to:p.end,role,styles:[style]};
  });
  const raw=source.map(s=>({from:C(+s.from,0,duration),to:C(+s.to,0,duration),role:String(s.role||'base'),styles:(s.styles||[]).filter(k=>J.STYLES[k]).slice(0,2)})).filter(s=>s.to>s.from&&s.styles.length);
  const segments=[];
  if(!raw.length&&!J.analyzeMusicalStructure)return {version:1,base,duration,segments:[{from:0,to:duration,style:base,role:'base'}],shares:{base:1,accent:0,peak:0},candidates:[base]};
  const musical=J.analyzeMusicalStructure?.(plan,audio,project);
  if(musical)plan.musicalStructure=musical;
  const boundaries=musical?.sections?.length?musical.sections.map(s=>s.from).concat([duration]):Array.from({length:(duration<9?1:Math.min(5,Math.max(3,Math.round(duration/13))))+1},(_,i,a)=>i*duration/(a.length-1));
  const count=boundaries.length-1;
  for(let i=0;i<count;i++){
    const from=boundaries[i],to=boundaries[i+1],p=profiles.find(x=>x.start<=from+(to-from)/2&&x.end>from+(to-from)/2)||profiles[Math.min(profiles.length-1,Math.floor(i*profiles.length/count))]||{},src=manual?raw.find(x=>from>=x.from-.001&&from<x.to+.001):raw[Math.min(raw.length-1,Math.floor(i*raw.length/count))];
    const defaultStyle=p.majorEvent&&p.intensity>.72?peak:base,style=src?.styles[0]||defaultStyle,role=src?.role||(style===base?'base':'accent');
    segments.push({from:+from.toFixed(3),to:+to.toFixed(3),style,role});
  }
  const seconds={base:0,accent:0,peak:0};for(const s of segments)seconds[s.role==='peak'||s.role==='finale'?'peak':s.style===base?'base':'accent']+=s.to-s.from;
  return {version:1,base,duration,segments,shares:Object.fromEntries(Object.entries(seconds).map(([k,v])=>[k,+(v/duration).toFixed(3)])),candidates:[...new Set(segments.map(s=>s.style))]};
};

J.buildBeatHierarchy=(plan,audio)=>{
  const beats=plan?.beats||audio?.beats||[],profiles=plan?.artDirection?.sectionProfiles||[],lines=plan?.lines||[];
  return beats.map((time,index)=>{const profile=profiles.find(p=>time>=p.start&&time<p.end),lyric=lines.find(l=>Math.abs(l.start-time)<.16),strength=index%4===0?'downbeat':index%4===2?'strong':index%2===0?'secondary':'weak';
    return {time,index,strength,onset:!!audio?.features?.timeline?.some(x=>Math.abs(x.time-time)<.07&&(x.onset||x.density>.72)),lyricOnset:!!lyric,sectionBoundary:profiles.some(p=>Math.abs(p.start-time)<.14),peak:!!profile?.majorEvent};});
};

const hashString=s=>{let h=2166136261;for(const c of String(s||''))h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h.toString(16).padStart(8,'0');};
J.directorProjectHash=(project,duration,audio=null)=>{const f=audio?.features||{},keys=['bpm','energy','beatStrength','onsetDensity','brightness','sectionContrast','bass','percussive','density'];const source={lyrics:String(project?.lyrics||'').trim(),title:String(project?.title||''),artist:String(project?.artist||''),duration:(+duration||0).toFixed(2),style:project?.style||'',audio:Object.fromEntries(keys.filter(k=>Number.isFinite(+f[k])).map(k=>[k,+(+f[k]).toFixed(3)])),image:project?.autoPalette?.stats||{}};return hashString(JSON.stringify(source));};
J.directorContext=(project,plan,audio,imageFeatures=null)=>{
  const duration=plan?.duration||audio?.duration||0,lyrics=(plan?.lines||J.parseLyrics(project?.lyrics||'').lines).slice(0,500).map((l,i)=>({line:i,text:String(l.text||'').slice(0,120),start:Number.isFinite(l.start)?+l.start.toFixed(3):null,end:Number.isFinite(l.end)?+l.end.toFixed(3):null}));
  const f=audio?.features||{},featureKeys=['bpm','energy','beatStrength','onsetDensity','brightness','smoothness','sectionContrast','bass','percussive','density'];
  const audioFeatures=Object.fromEntries(featureKeys.filter(k=>Number.isFinite(+f[k])).map(k=>[k,+f[k].toFixed(3)]));
  const sections=(plan?.artDirection?.sectionProfiles||[]).map(p=>({from:p.start,to:p.end,role:p.type,intensity:+p.intensity.toFixed(3),peak:!!p.majorEvent}));
  const semanticTags=Object.fromEntries(['layout','enter','hold','exit','decor','treat','bg','cam','fx','trans'].map(g=>[g,[...new Set(J.order(g).flatMap(id=>J.registry(g)[id]?.tags||[]))].slice(0,24)]));
  return {schema:'jizura-director-context-v1',projectHash:J.directorProjectHash(project,duration,audio),duration:+duration.toFixed(3),lyrics,beats:(plan?.beats||[]).slice(0,1800).map(x=>+x.toFixed(3)),audioFeatures,sections,imageFeatures:imageFeatures||project?.autoPalette?.stats||{},palette:project?.autoPalette?.palette||plan?.style?.schemes?.[0]||{},availableStyles:J.STYLE_ORDER.map(id=>({id,name:J.STYLES[id]?.name})),techniqueFamilies:semanticTags,constraints:{preserveLyrics:true,safeArea:true,maxAttention:.9,noCode:true,noExternalRequests:true}};
};
J.directorPrompt=()=>`あなたはJIZURAのCreative Directorです。添付した音源、背景、歌詞とDIRECTOR_CONTEXT.jsonを読み、最大3案のJSONのみ返してください。schemaはjizura-director-v2、各案にprojectHash、concept、styleArc、chaptersを含めます。styleArcのstylesには解析パックのStyle IDのみ指定し、chaptersにはfrom/to/roleとstyleIntent、sceneIntent、typographyIntent、motionIntent、fxIntent、cameraIntent、motif、hook、climax、socialHookを意味タグで指定します。曲全体の物語、冒頭3秒、展開、クライマックス、終端から冒頭へのループを考慮してください。歌詞の本文は変更せず、tokensを使うなら原文全文を保持します。constraintsのpreserveLyricsとsafeAreaはtrue。JavaScript、HTML、CSS、URL、具体Technique IDの列挙は禁止。形式: {"candidates":[案A,案B,案C]}。`;
J.directorWindows=duration=>{
  const d=Math.max(0,Number(duration)||0),width=Math.min(3,Math.max(.5,d/10));
  return [0,.16,.46,.76,Math.max(0,1-width/Math.max(d,.1))].map((fraction,i)=>({name:['hook','early','middle','climax','ending'][i],start:+Math.max(0,Math.min(d-width,d*fraction)).toFixed(3),end:+Math.min(d,Math.max(0,Math.min(d-width,d*fraction))+width).toFixed(3)})).filter(w=>w.end>w.start);
};
J.validateDirectorPlan=(input,project,plan,audio=null)=>{
  const errors=[],warnings=[],duration=plan?.duration||0,hash=J.directorProjectHash(project,duration,audio),known=key=>typeof key==='string'&&J.STYLE_ORDER.includes(key);
  if(!plain(input)){return {valid:false,errors:['JSONの最上位はオブジェクトにしてください'],warnings,candidates:[]};}
  const bundle=Array.isArray(input.candidates)?input.candidates:Array.isArray(input.variants)?input.variants:[input];
  if(bundle.length>3)errors.push('案は最大3つまでです');
  const candidates=[];
  for(const [index,raw] of bundle.slice(0,3).entries()){
    if(!plain(raw)||!['jizura-director-v1','jizura-director-v2','jizura-director-v3'].includes(raw.schema)){errors.push(`案${index+1}: Director schemaを確認できません`);continue;}
    if(raw.projectHash!==hash){errors.push(`案${index+1}: 素材のprojectHashが一致しません`);continue;}
    if(raw.constraints?.preserveLyrics===false||raw.constraints?.safeArea===false){errors.push(`案${index+1}: 歌詞保持と安全領域は必須です`);continue;}
    const safe={schema:raw.schema,projectHash:hash,concept:{},global:{},styleArc:[],sections:[],lyricDirectives:[],constraints:{preserveLyrics:true,safeArea:true,maxAttention:.9}};
    if(plain(raw.concept)){safe.concept.title=String(raw.concept.title||'').slice(0,100);safe.concept.energy=['CLEAN','STANDARD','HIGH_ENERGY','HYPER'].includes(raw.concept.energy)?raw.concept.energy:'STANDARD';safe.concept.keywords=(Array.isArray(raw.concept.keywords)?raw.concept.keywords:[]).filter(x=>typeof x==='string').slice(0,12).map(x=>x.slice(0,32));}
    if(plain(raw.global)){for(const k of ['styleDiversity','motionDensity','typographyEnergy','layerDepth'])if(Number.isFinite(+raw.global[k]))safe.global[k]=C(raw.global[k],0,1);if(typeof raw.global.basePalette==='string')safe.global.basePalette=raw.global.basePalette.slice(0,32);}
    for(const [i,s] of (Array.isArray(raw.styleArc)?raw.styleArc:[]).slice(0,24).entries()){
      if(!plain(s)||!Number.isFinite(+s.from)||!Number.isFinite(+s.to)||+s.from<0||+s.to>duration+.05||+s.to<=+s.from){warnings.push(`案${index+1}: Style Arc ${i+1} の時刻を無視しました`);continue;}
      let styles=(Array.isArray(s.styles)?s.styles:[]).filter(known).slice(0,2);if(!styles.length){warnings.push(`案${index+1}: Style Arc ${i+1} に有効なStyle IDがありません`);continue;}
      const previousStyle=safe.styleArc.at(-1)?.styles?.[0]||project?.style;if(previousStyle&&J.styleCompatibility(previousStyle,styles[0]).score<.5){warnings.push(`案${index+1}: Style Arc ${i+1} は互換Styleへ接続しました`);styles=[previousStyle];}
      safe.styleArc.push({from:+(+s.from).toFixed(3),to:+(+s.to).toFixed(3),role:['hook','establish','escalation','climax','break','finale','base','accent','peak'].includes(s.role)?s.role:'accent',styles});
    }
    const chapters=['jizura-director-v2','jizura-director-v3'].includes(raw.schema)&&Array.isArray(raw.chapters)?raw.chapters:raw.sections;
    for(const [i,s] of (Array.isArray(chapters)?chapters:[]).slice(0,64).entries()){
      if(!plain(s)||!Number.isFinite(+s.from)||!Number.isFinite(+s.to)||+s.from<0||+s.to>duration+.05||+s.to<=+s.from)continue;
      const item={from:+(+s.from).toFixed(3),to:+(+s.to).toFixed(3),intensity:C(s.intensity,.08,.98),role:String(s.role||'section').slice(0,32)};
      for(const [field,group] of [['layoutIntent','layout'],['motionIntent','cam'],['fxIntent','fx'],['cameraIntent','cam']])item[field]=(Array.isArray(s[field])?s[field]:typeof s[field]==='string'?[s[field]]:[]).filter(x=>typeof x==='string').slice(0,6).map(x=>x.toLowerCase().slice(0,32));
      item.notes=typeof s.notes==='string'?s.notes.slice(0,180):'';
      for(const field of ['styleIntent','sceneIntent','typographyIntent','motif','hook','climax','socialHook'])if(typeof s[field]==='string')item[field]=s[field].slice(0,80).replace(/[<>]/g,'');
      safe.sections.push(item);
    }
    for(const d of (Array.isArray(raw.lyricDirectives)?raw.lyricDirectives:[]).slice(0,500)){
      const line=Number.isInteger(d?.line)?d.line:-1,src=plan?.lines?.[line]?.text;
      if(!src||!Array.isArray(d.tokens)||d.tokens.length>16)continue;
      const tokens=d.tokens.filter(x=>typeof x==='string').map(x=>x.slice(0,48));
      if(tokens.join('')!==src){warnings.push(`案${index+1}: 歌詞${line+1}のtokenは原文全文と一致しないため無視しました`);continue;}
      safe.lyricDirectives.push({line,tokens,emphasis:(Array.isArray(d.emphasis)?d.emphasis:[]).filter(Number.isInteger).filter(x=>x>=0&&x<tokens.length).slice(0,16),behavior:['progressive-impact','beat-pop','stagger','split','still'].includes(d.behavior)?d.behavior:'beat-pop'});
    }
    if(plain(raw.constraints)&&Number.isFinite(+raw.constraints.maxAttention))safe.constraints.maxAttention=C(raw.constraints.maxAttention,.3,1);
    candidates.push({index,plan:safe});
  }
  if(!candidates.length&&!errors.length)errors.push('有効なDirector案がありません');
  return {valid:!errors.length,candidates,errors,warnings,unknownKeys:Object.keys(input).filter(k=>!['schema','projectHash','concept','global','styleArc','sections','lyricDirectives','constraints','candidates','variants'].includes(k))};
};
J.applyDirectorPlan=(project,director,audio)=>{
  if(!plain(project)||!plain(director)||!['jizura-director-v1','jizura-director-v2','jizura-director-v3'].includes(director.schema))throw new Error('Director Planを確認できません');
  const sourcePlan=J.plan(project,audio),validation=J.validateDirectorPlan(director,project,sourcePlan,audio),safe=validation.candidates?.[0]?.plan;if(!validation.valid||!safe)throw new Error('Director Planの素材IDまたは形式を確認できません');
  const copy=JSON.parse(JSON.stringify(project));copy.directorPlan=JSON.parse(JSON.stringify(safe));copy.autoDirection=true;
  if(copy.visualDirection&&Number.isFinite(+director.global?.styleDiversity))copy.visualDirection.styleDiversity=director.global.styleDiversity>.72?'maximum':director.global.styleDiversity>.48?'high':director.global.styleDiversity>.2?'medium':'low';
  if(audio?.features||copy.autoPalette?.stats){
    const proposal=J.proposeDirection(copy,audio,copy.autoPalette?.stats||null);Object.assign(copy,{style:proposal.style,mood:proposal.mood,fx:proposal.fx,enabled:proposal.enabled,seed:proposal.seed,overrides:proposal.overrides});
    copy.artDirection=J.makeArtDirection(copy,audio,proposal);
  }
  return copy;
};
J.compareDirectorCandidates=async(project,audio,candidates)=>{
  const out=[];for(const item of (candidates||[]).slice(0,3)){
    const candidate=item.plan||item,variant=J.applyDirectorPlan(project,candidate,audio),plan=J.plan(variant,audio),windows=J.directorWindows(plan.duration),samples=[];
    for(const range of windows){const pixel=await J.analyzeRenderedFrames(plan,range,audio),report=J.checkMVQuality(variant,plan,audio,range,pixel,null,null),q=report.quality||{};samples.push({name:range.name,pixel,technical:q.technicalScore||0,creative:q.creativeScore||0,social:q.socialScore||0,issues:report.warnings.map(x=>x.message)});}
    const reality=Math.round(avg(samples.map(x=>x.pixel?.metrics?.styleArcRealization||0))),quality={technical:Math.round(avg(samples.map(x=>x.technical))),creative:Math.round(avg(samples.map(x=>x.creative))),social:Math.round(avg(samples.map(x=>x.social))),directorReality:reality};quality.score=Math.round(.3*quality.technical+.35*quality.creative+.2*quality.social+.15*reality);
    out.push({index:item.index??out.length,plan:candidate,project:variant,renderPlan:plan,pixelQA:samples[0]?.pixel,quality,warnings:[...new Set(samples.flatMap(x=>x.issues))],windows:samples.map(x=>x.name)});
  }
  return out.sort((a,b)=>b.quality.score-a.quality.score||a.index-b.index);
};

const oldPlan=J.plan;
J.plan=(project,audio)=>{
  const plan=oldPlan(project,audio),auto=!!project?.autoDirection&&!!plan?.artDirection;
  if(!auto)return plan;
  const arc=J.buildStyleArc(plan,project,audio),baseStyle=plan.style,baseScheme=baseStyle.schemes?.[0]||{},font=plan.artDirection.typography?.display||baseStyle.fonts?.display?.[0];
  plan.styleArc=arc;plan.styleCompatibility=J.STYLE_COMPATIBILITY_GRAPH;plan.layerStack=['backgroundImage','backgroundMotion','environmentGraphics','typography','typographyFX','decorations','camera','fullScreenFX','credits'];
  plan.beatHierarchy=J.buildBeatHierarchy(plan,audio);plan.eventLayers={ambient:[],micro:[],medium:[],meso:[],major:[],macro:[]};plan.attentionBudget={max:.9};
  const paletteByStyle=new Map();for(const style of arc.candidates)paletteByStyle.set(style,J.buildTechniquePalette(style,plan.artDirection.mood,plan.visualEnergyDensity?.tier));
  plan.techniquePalettes=Object.fromEntries(paletteByStyle);
  for(const segment of arc.segments){
    const st=segment.style,style=st===plan.styleKey?baseStyle:J.resolveStyle({...project,style:st,fonts:{...(project.fonts||{}),display:font||project.fonts?.display}}),palette=paletteByStyle.get(st);
    for(const scheme of style.schemes||[]){
      scheme.accent=J.fitContrast(baseScheme.accent||scheme.accent,scheme.bg,3);scheme.accent2=J.fitContrast(baseScheme.accent2||scheme.accent2,scheme.bg,3);
      scheme.ghostA=baseScheme.ghostA||scheme.ghostA;scheme.ghostB=baseScheme.ghostB||scheme.ghostB;
    }
    for(const cut of plan.cuts){if(cut.start<segment.from-.001||cut.start>=segment.to+.001)continue;
      const originalLayout=cut.layout;
      cut.styleKey=st;cut.style=style;cut.styleBridge={font:font||null,clubAccent:baseScheme.accent||null,camera:cut.cam||null,layoutAxis:plan.artDirection.visualDNA?.spatialBias||'center'};cut.techniquePalette=palette;
      if(font)cut.params.font=font;
      if(cut.layout!=='interlude'&&cut.line>=0&&['HIGH_ENERGY','HYPER'].includes(plan.visualEnergyDensity?.tier)){
        const length=[...(cut.lineText||cut.text||'')].length,impact=segment.role==='peak'||segment.role==='finale'||segment.role==='hook';
        if(!project.overrides?.[cut.line]?.layout&&impact&&length<=10&&plan.H<=plan.W){const alt=['huge','diag','stack'].find(k=>palette.layout.includes(k)&&J.LAYOUTS[k]&&!J.LAYOUTS[k].special);if(alt&&cut.layout!=='interlude'){cut.layout=alt;cut.params.maxWidth=Math.min(cut.params.maxWidth||.84,.88);}}
        const progress=Number(cut.repetitionProgress)||0,repeatLayout=progress>=.68?'huge':progress>=.46?'diag':null;
        if(!project.overrides?.[cut.line]?.layout&&repeatLayout&&length<=11&&plan.H<=plan.W&&J.LAYOUTS[repeatLayout]&&!J.LAYOUTS[repeatLayout].special){cut.layout=repeatLayout;cut.params.maxWidth=.88;cut.repetitionLayoutCue=repeatLayout;}
        if(impact&&cut.decor.length<2){const d=(palette.decor||[]).find(k=>J.DECOR[k]&&!cut.decor.some(x=>x.id===k));if(d){const D=J.DECOR[d],rng=J.rng(cut.seed);cut.decor.push({id:d,seed:cut.seed,n:1,right:false,low:true,accent:true,corner:true,big:false,mode:'count',from:0,to:99,v:0,rng:rng(),...(D.plan?D.plan(rng,style):{})});}}
        if(impact&&palette.treat?.length){const safe=palette.treat.find(k=>J.TREAT[k]?.safe&&['softShadow','glow','fauxBold'].includes(k));if(safe)cut.treat=safe;}
      }
      const sectionIntent=(project.directorPlan?.sections||[]).find(s=>cut.start>=s.from&&cut.start<s.to);
      if(sectionIntent&&cut.line>=0){
        const requested=J.resolveTechniqueIntent('layout',sectionIntent.layoutIntent,st,2).find(k=>['center','type','huge','diag','stack','split','vcols'].includes(k)&&J.LAYOUTS[k]&&!J.LAYOUTS[k].special);
        if(!project.overrides?.[cut.line]?.layout&&requested&&[...(cut.lineText||cut.text||'')].length<=12&&plan.H<=plan.W)cut.layout=requested;
        const intents=[...(sectionIntent.motionIntent||[]),...(sectionIntent.cameraIntent||[])];cut.directorMotionIntent=intents.slice(0,6);
        const decor=J.resolveTechniqueIntent('decor',intents,st,2).find(k=>SAFE_HYPER_DECOR.has(k)&&J.DECOR[k]&&!cut.decor.some(x=>x.id===k));
        if(decor&&['peak','climax','hook'].includes(sectionIntent.role)&&cut.decor.length<2){const D=J.DECOR[decor],rng=J.rng(cut.seed);cut.decor.push({id:decor,seed:cut.seed,n:1,right:false,low:true,accent:true,corner:true,big:false,mode:'count',from:0,to:99,v:0,rng:rng(),...(D.plan?D.plan(rng,style):{})});}
      }
      const lyricDirective=(project.directorPlan?.lyricDirectives||[]).find(d=>d.line===cut.line),lyricText=String(cut.lineText||cut.text||'');
      if(lyricDirective&&Array.isArray(lyricDirective.tokens)&&lyricDirective.tokens.join('')===lyricText){
        cut.kineticTokens=lyricDirective.tokens.slice();cut.kineticBehavior=lyricDirective.behavior||'beat-pop';cut.kineticEmphasis=(lyricDirective.emphasis||[]).slice();
        cut.kineticGrouped=cut.kineticBehavior!=='still'&&cut.kineticTokens.length>1;cut.words=cut.kineticTokens.slice();
        if(cut.kineticGrouped&&!['center','type'].includes(cut.layout))cut.layout=plan.H>plan.W?'center':'type';
      }
      if(cut.line>=0){
        const role=segment.role,sceneIx=arc.segments.indexOf(segment),variants=[
          {id:'full',zoom:1,x:0,y:0,filter:'none',darkness:0,blur:0},
          {id:'tight',zoom:1.18,x:sceneIx%2?4:-4,y:0,filter:'contrast(1.08) saturate(1.06)',darkness:.02,blur:0},
          {id:'contrast',zoom:1.04,x:0,y:0,filter:'contrast(1.22) saturate(1.12)',darkness:.035,blur:0},
          {id:'monochrome-accent',zoom:1.02,x:0,y:0,filter:'grayscale(.72) contrast(1.12)',tint:baseScheme.accent||'#176bb1',darkness:.02,blur:0},
          {id:'depth',zoom:1.12,x:sceneIx%2?3:-3,y:0,filter:'saturate(.82)',darkness:.04,blur:2,lightSweep:.055,phase:(sceneIx*.23)%1},
          {id:'detail-crop',zoom:1.28,x:sceneIx%2?7:-7,y:sceneIx%3?3:-3,filter:'contrast(1.12)',darkness:.05,blur:0},
          {id:'graphic',zoom:1.06,x:0,y:0,filter:'saturate(1.18) contrast(1.12)',darkness:.07,blur:0,tint:baseScheme.accent2||'#111827',lightSweep:.035,phase:(sceneIx*.37)%1}
        ];
        const idx=(sceneIx+(role==='peak'||role==='finale'?2:0))%variants.length;
        cut.backgroundScene={...variants[idx]};
        cut.chapter={index:sceneIx,role,style:st,backgroundVariant:cut.backgroundScene.id,typographyMode:role==='peak'||role==='finale'?'monumental':role==='hook'?'compressed':role==='accent'?'editorial':'classic',graphicMotif:palette.decor?.[0]||null,camera:cut.cam||'hold',layerDensity:role==='peak'?3:role==='hook'?2:1,transitionLanguage:cut.trans||'cut'};
        const motion=(cut.directorMotionIntent||[]).join(' ');if(/push|zoom|tight|rush/u.test(motion))cut.backgroundScene.zoom=Math.min(1.3,(cut.backgroundScene.zoom||1)+.045);if(/pan|drift|sweep/u.test(motion)){cut.backgroundScene.x+=(sceneIx%2?2.2:-2.2);cut.backgroundScene.lightSweep=Math.max(cut.backgroundScene.lightSweep||0,.025);}
      }
      if(cut.bg==='none'&&segment.role==='peak'){
        const bg=palette.bg?.find(k=>k!=='none'&&J.BG[k]&&typeof J.BG[k].draw==='function');if(bg){cut.bg=bg;cut.bgP=J.BG[bg].plan?J.BG[bg].plan(J.rng(cut.seed),style):{};}
      }
      if(cut.layout!==originalLayout&&J.LAYOUTS[cut.layout]?.plan){
        const old=cut.params,planned=J.LAYOUTS[cut.layout].plan(J.rng(cut.seed),cut,style)||{};
        cut.params={...planned,directionAngle:old.directionAngle,intensityScale:old.intensityScale,maxWidth:old.maxWidth,font:font||planned.font||old.font};
      }
      if(cut.transitionFromStyle&&cut.transitionFromStyle!==st)cut.trans='wipe';
    }
  }
  for(let i=1;i<arc.segments.length;i++)if(arc.segments[i].style!==arc.segments[i-1].style){
    const cut=plan.cuts.find(c=>c.start>=arc.segments[i].from&&c.line>=0);if(cut){cut.transitionFromStyle=arc.segments[i-1].style;cut.trans=paletteByStyle.get(cut.styleKey)?.trans?.includes('wipe')?'wipe':'diagonalWipe';cut.transDur=.28;cut.transP=J.TRANS[cut.trans]?.plan?J.TRANS[cut.trans].plan(J.rng(cut.seed),plan.style):{};}
  }
  // Registry-picked accents replace a fixed four-effect loop at the musical peaks.
  const fxUsed=new Set(),forbidden=/^(?:strobe|blackFrame|crtOff|tvStatic|pixelSort|mosaic|invert|block|slice|trackingNoise|vhsRoll)$/;
  for(const segment of arc.segments){
    if(!['peak','finale'].includes(segment.role)&&!(segment.role==='accent'&&/CHANT|TEAM_CALL/.test(plan.artDirection?.visualDNA?.type||'')))continue;
    const palette=paletteByStyle.get(segment.style),candidates=(palette?.fx||[]).filter(id=>J.FXE[id]&&!forbidden.test(id)&&!fxUsed.has(id));
    const preferred=segment.role==='peak'||segment.role==='finale'?['zoomPunch','speedLines','focusLines','whiteFrame','bloomFlash','lightSweep','rgbSplit']:['lightSweep','speedLines','focusLines','heartbeat','bloomFlash','zoomPunch','echoFrames'];
    const type=preferred.find(id=>candidates.includes(id)&&J.FXE[id]?.draw);
    const cut=plan.cuts.find(c=>c.line>=0&&c.start>=segment.from&&c.start<segment.to);if(!type||!cut)continue;
    const def=J.FXE[type],dur=Math.min(.28,Math.max(.12,def.dur||.2)),beats=(plan.beats||[]).filter(b=>b>=segment.from&&b<segment.to),preferredBeat=beats.length?beats[0]:cut.start,t=beats.concat([cut.start+.36]).sort((a,b)=>Math.abs(a-preferredBeat)-Math.abs(b-preferredBeat)).find(x=>!([...plan.events,...(plan.hypeTimeline||[])].some(e=>Math.abs(e.t-x)<((e.dur||.15)+dur)*.5+.08)));
    if(!Number.isFinite(t))continue;const amp=type==='whiteFrame'?0.28:type==='rgbSplit'?0.24:0.42;
    plan.events.push({t,type,amp,dur,registryDriven:true,layer:'macro',reason:`style-arc-${segment.role}`,attentionCost:J.attentionCost(type,amp)});fxUsed.add(type);
  }
  for(const section of project.directorPlan?.sections||[]){
    const intents=[...(section.fxIntent||[]),...(section.motionIntent||[])],type=J.resolveTechniqueIntent('fx',intents,plan.styleKey,4).find(id=>SAFE_HYPER_FX.includes(id)&&J.FXE[id]?.draw&&!fxUsed.has(id));
    if(!type)continue;const def=J.FXE[type],dur=Math.min(.24,Math.max(.12,def.dur||.2)),beats=(plan.beats||[]).filter(b=>b>=section.from&&b<section.to),preferred=beats[0]??(section.from+section.to)/2,t=beats.concat([(section.from+section.to)/2]).sort((a,b)=>Math.abs(a-preferred)-Math.abs(b-preferred)).find(x=>!([...plan.events,...(plan.hypeTimeline||[])].some(e=>Math.abs(e.t-x)<((e.dur||.15)+dur)*.5+.08)));
    if(!Number.isFinite(t))continue;plan.events.push({t,type,amp:.24,dur,registryDriven:true,directorIntent:true,layer:'medium',reason:'director-section-intent',attentionCost:J.attentionCost(type,.24)});fxUsed.add(type);
  }
  if(['HIGH_ENERGY','HYPER'].includes(plan.visualEnergyDensity?.tier))for(const boundary of arc.segments.slice(1)){
    const target=boundary.from;
    if(plan.events.some(e=>e.registryDriven&&Math.abs(e.t-target)<4.5))continue;
    const segment=arc.segments.find(x=>target>=x.from&&target<x.to),cut=plan.cuts.find(c=>c.line>=0&&c.start>=target&&c.start<target+2);if(!segment||!cut)continue;
    const palette=paletteByStyle.get(segment.style),type=(palette?.fx||[]).find(id=>SAFE_HYPER_FX.includes(id)&&J.FXE[id]?.draw&&!plan.events.some(e=>e.registryDriven&&e.type===id&&Math.abs(e.t-target)<8));if(!type)continue;
    const def=J.FXE[type],dur=Math.min(.22,Math.max(.12,def.dur||.18)),beats=(plan.beats||[]).filter(b=>Math.abs(b-target)<=1.1),times=[target,...beats].sort((a,b)=>Math.abs(a-target)-Math.abs(b-target)),t=times.find(x=>!([...plan.events,...(plan.hypeTimeline||[])].some(e=>Math.abs(e.t-x)<((e.dur||.15)+dur)*.5+.08)));if(!Number.isFinite(t))continue;
    const amp=type==='rgbSplit'?.2:.24;plan.events.push({t,type,amp,dur,registryDriven:true,layer:'major',reason:'scheduled-major-accent',attentionCost:J.attentionCost(type,amp)});fxUsed.add(type);cut.majorAccent=true;cut.params.intensityScale=C((cut.params.intensityScale||1)+.055,.82,1.27);
  }
  plan.styleArcAudit={coherent:arc.candidates.every((s,i)=>i===0||J.styleCompatibility(arc.candidates[i-1],s).score>=.5),baseShare:arc.shares.base||0,styles:arc.candidates,bridgeFeatures:['clubPalette','primaryFont','camera','layoutAxis']};
  plan.sceneVariants=[...new Map(plan.cuts.filter(c=>c.backgroundScene).map(c=>[c.backgroundScene.id,c.backgroundScene])).values()];
  const allEvents=[...(plan.events||[]),...(plan.hypeTimeline||[])],seenEvents=new Set();
  for(const e of allEvents){const key=`${e.t}|${e.type}|${e.reason||''}`;if(seenEvents.has(key))continue;seenEvents.add(key);const major=/hook-pattern|style-arc-(?:peak|finale)|director-section|scheduled-major/u.test(e.reason||''),layer=major?'major':(e.dur||0)<=.25?'micro':(e.dur||0)<=2?'medium':'ambient';plan.eventLayers[layer].push({...e,layer});if(layer==='medium')plan.eventLayers.meso.push({...e,layer:'meso'});if(major)plan.eventLayers.macro.push({...e,layer:'macro'});}
  for(const beat of plan.beatHierarchy.filter(b=>b.strength==='downbeat'||b.strength==='strong'))plan.eventLayers.micro.push({t:beat.time,type:'kinetic-beat-hit',dur:.12,layer:'micro',source:'beat-hierarchy'});
  for(const cut of plan.cuts.filter(c=>c.line>=0&&c.layout!=='interlude'))plan.eventLayers.medium.push({t:cut.start,type:'lyric-line-change',dur:.2,layer:'medium',source:'LRC'});
  for(const profile of (plan.artDirection?.sectionProfiles||[]).filter(p=>p.majorEvent))plan.eventLayers.major.push({t:profile.start,type:'section-peak',dur:.3,layer:'major',source:'section-profile'});
  const cadence=items=>{const times=items.map(x=>x.t).filter(Number.isFinite).sort((a,b)=>a-b),gaps=times.slice(1).map((t,i)=>t-times[i]).filter(x=>x>0);return {count:times.length,medianSeconds:gaps.length?+gaps.sort((a,b)=>a-b)[Math.floor(gaps.length/2)].toFixed(2):null};};
  plan.eventDensity={targets:{micro:[.3,1.2],medium:[2,4],major:[8,15]},observed:{micro:cadence(plan.eventLayers.micro),medium:cadence(plan.eventLayers.medium),major:cadence(plan.eventLayers.major)}};
  const profileIntensities=(plan.artDirection?.sectionProfiles||[]).map(p=>Number(p.intensity)||0),sectionMin=profileIntensities.length?Math.min(...profileIntensities):0,sectionMax=profileIntensities.length?Math.max(...profileIntensities):0,peakProfile=(plan.artDirection?.sectionProfiles||[]).filter(p=>p.majorEvent).sort((a,b)=>b.intensity-a.intensity)[0]||null;
  plan.sectionContrast={range:+(sectionMax-sectionMin).toFixed(3),sections:profileIntensities.length,quietSections:(plan.artDirection?.sectionProfiles||[]).filter(p=>p.intensity<.35).length,majorEvents:(plan.artDirection?.sectionProfiles||[]).filter(p=>p.majorEvent).length};
  plan.climax=peakProfile?{time:peakProfile.start,intensity:peakProfile.intensity,role:peakProfile.type,style:arc.segments.find(x=>peakProfile.start>=x.from&&peakProfile.start<x.to)?.style||plan.styleKey,cutLayout:plan.cuts.find(c=>c.line>=0&&c.start>=peakProfile.start&&c.start<peakProfile.end)?.layout||null,fx:plan.events.find(e=>e.t>=peakProfile.start&&e.t<peakProfile.end&&e.registryDriven)?.type||plan.hypeTimeline.find(e=>e.t>=peakProfile.start&&e.t<peakProfile.end)?.type||null}:null;
  for(const group of ['layout','enter','exit','hold','bg','cam','treat','trans']){
    const planned=plan.cuts.map(c=>c[group]).filter(x=>x&&x!=='none'&&x!=='cut');
    plan.artDirection.vocabulary[group]=[...new Set([...(plan.artDirection.vocabulary[group]||[]),...planned])];
  }
  plan.artDirection.styleArc=arc;
  plan.attentionBudget=J.auditAttentionBudget(plan);
  plan.quietMoments=[];for(const e of plan.eventLayers.major)if(e.t>.25&&!plan.quietMoments.some(q=>Math.abs(q.at-e.t)<6))plan.quietMoments.push({from:+Math.max(0,e.t-.18).toFixed(3),to:+e.t.toFixed(3),before:e.t,depth:.18});
  plan.hookEngine=plan.hookEngine||{};plan.hookEngine.patternInterrupt=plan.hookEngine.patternInterrupt||!!plan.hookEngine.firstCut;
  plan.hookNovelty={openingStyle:arc.segments.find(s=>s.from<3)?.style||plan.styleKey,baseStyle:plan.styleKey,changedWithin3s:arc.segments.some(s=>s.from>0&&s.from<3&&s.style!==plan.styleKey)};
  plan.hypeAudit=Object.assign({},plan.hypeAudit||{}, {attentionBudget:plan.attentionBudget.peak,attentionWithinBudget:plan.attentionBudget.withinBudget,registryPaletteCount:plan.techniquePalettes[plan.styleKey]?.fx?.length||0});
  return plan;
};

const originalAnalyze=J.analyzeRenderedFrames;
J.analyzeRenderedFrames=async(plan,range,audio,telemetry={})=>{
  const result=await originalAnalyze(plan,range,audio,telemetry),metrics=result.metrics||{};
  if(result.completed){
    metrics.styleArcRealization=plan.styleArc?.segments?.length?Math.round(Math.min(100,(metrics.distinctStyleCount||1)/Math.max(1,plan.styleArc.candidates?.length||1)*100)):100;
    metrics.structuralDiversity=Math.round(C((metrics.distinctLayoutCount||1)*12+(metrics.distinctStyleCount||1)*18+(plan.sceneVariants?.length||0)*8,0,100));
    metrics.layerDepth=Math.round(C((plan.layerStack?.length||1)*8+(plan.cuts||[]).filter(c=>(c.decor||[]).length>1).length/Math.max(1,(plan.cuts||[]).length)*30,0,100));
  const intensity=plan.artDirection?.intensityCurve||[];metrics.sectionContrast=Math.round(C((intensity.length?Math.max(...intensity)-Math.min(...intensity):0)*150,0,100));
    const peakCuts=(plan.cuts||[]).filter(c=>c.line>=0&&c.repetitionProgress>.65),baseCuts=(plan.cuts||[]).filter(c=>c.line>=0&&c.repetitionProgress<.25);
    metrics.peakImpact=Math.round(C((avg(peakCuts.map(c=>c.params?.intensityScale||1))-avg(baseCuts.map(c=>c.params?.intensityScale||1)))*180+50,0,100));
  }
  return result;
};

const drawCreditBase=J.Renderer?.prototype?.drawTitleCredit;
if(drawCreditBase)J.Renderer.prototype.drawTitleCredit=function(ctx,plan,t,scale){
  const cut=plan?.cuts?.find(c=>c.line>=0&&t>=c.start&&t<c.end);
  const first=plan?.hookEngine?.firstCut;
  if(plan?.visualEnergyDensity?.tier==='HYPER'&&!plan.socialHook&&first&&t<first.start-.005&&plan.titleDisplay){
    const d=plan.titleDisplay;
    return drawCreditBase.call(this,ctx,{...plan,titleDisplay:{...d,position:'bl',titleSize:Math.min(d.titleSize,84),maxWidth:Math.min(d.maxWidth,plan.W*.78),marginX:plan.W*.07,marginY:plan.H*.06,opacity:1}},.66,scale);
  }
  if(plan?.visualEnergyDensity?.tier==='HYPER'&&cut?.layout==='huge'&&plan.titleDisplay){
    const d=plan.titleDisplay;
    return drawCreditBase.call(this,ctx,{...plan,titleDisplay:{...d,position:'tr',titleSize:Math.min(d.titleSize,42),maxWidth:Math.min(d.maxWidth,plan.W*.34),marginX:plan.W*.035,marginY:plan.H*.04}},t,scale);
  }
  return drawCreditBase.call(this,ctx,plan,t,scale);
};

const originalScore=J.scoreMVQuality;
J.scoreMVQuality=(report,project,plan,audio,range,pixel,capabilities,validation)=>{
  report=originalScore(report,project,plan,audio,range,pixel,capabilities,validation);
  const q=report.quality||{},legacyScore=q.score,cat=Object.fromEntries((q.categories||[]).map(x=>[x.key,x.score/Math.max(1,x.max)])),m=pixel?.metrics||{},hype=q.hype||J.hypeQuality?.(project,plan,audio,range,pixel)||{};
  const pct=x=>Math.round(C(x,0,1)*100),techPenalty=report.issues.filter(i=>['ERROR','WARNING'].includes(i.severity)&&['lyrics_missing','timing_invalid','timing_reverse','lrc_outside','lyric_small','lyrics_clipped','LYRIC_NOT_RENDERED','LYRIC_PARTIAL_CLIP','contrast','title_contrast','resolution','fps','frames','export_validation','export_unsupported','black_frame','render_failed','audio_missing','audio_range'].includes(i.code));
  let technical=pct(.29*(cat.lyrics??.78)+.22*(cat.composition??.82)+.29*(cat.export??.78)+.1*(cat.title??.82)+.1*(cat.motion??.8));
  technical=Math.max(0,technical-techPenalty.reduce((s,i)=>s+(i.severity==='ERROR'?8:3),0));if(!pixel?.completed)technical=Math.min(technical,88);if(!validation)technical=Math.min(technical,92);
  const curve=plan?.artDirection?.intensityCurve||[],curveRange=curve.length?Math.max(...curve)-Math.min(...curve):0;
  const realization=q.styleRealizationScore??report.directionReality?.styleRealizationScore??(plan?.artDirection?72:65),novelty=pixel?.completed?Math.round((m.visualNovelty??0)*.4+(m.foregroundNovelty??0)*.6):52,structure=pixel?.completed?m.structuralDiversity??0:Math.min(68,(plan?.styleArc?.candidates?.length||1)*20),contrast=pixel?.completed?m.temporalContrast??0:Math.round(C(curveRange*110,0,85)),layer=pixel?.completed?m.layerDepth??0:Math.min(70,(plan?.layerStack?.length||1)*8),peak=pixel?.completed?m.peakImpact??0:60;
  const consistency=(J.inspectDirection?.(plan)?.coherent!==false?100:64)*(plan?.hypeAudit?.bounded===false?0.72:1),budget=plan?.attentionBudget||J.auditAttentionBudget(plan);
  let creative=pct(.25*realization/100+.2*novelty/100+.15*structure/100+.12*contrast/100+.1*layer/100+.08*peak/100+.1*consistency/100);
  if(budget&&!budget.withinBudget)creative=Math.min(creative,74);
  const stagnant=Number(m.stagnationSeconds)||0,tier=plan?.visualEnergyDensity?.tier||'STANDARD';
  if(pixel?.completed&&tier==='HYPER'&&stagnant>=8)creative=Math.min(creative,72);
  else if(pixel?.completed&&tier==='HIGH_ENERGY'&&stagnant>=12)creative=Math.min(creative,78);
  if(!pixel?.completed)creative=Math.min(creative,74);
  const hook=hype.hookStrength??0,scroll=hype.scrollStopPower??0,density=hype.visualEnergyDensity??0,share=hype.socialShareability??0;
  const loop=J.loopQuality?Math.round(C(J.loopQuality(plan,audio,range).score,0,1)*100):null,mobile=report.issues.some(i=>['lyric_small','credit_small','lyrics_clipped'].includes(i.code))?52:88,hookNovelty=pixel?.completed?m.openingNovelty??0:55;
  let social=pct(.23*hook/100+.2*scroll/100+.18*share/100+.15*hookNovelty/100+.12*loop/100+.12*mobile/100);
  if(!pixel?.completed)social=Math.min(social,72);
  const overall=Math.round(.35*technical+.4*creative+.25*social),hard=report.issues.some(i=>i.severity==='ERROR'),requiredSocial=plan?.socialHook?95:90;
  const lyricSamples=pixel?.metrics?.lyricPoints||[],needed=(plan?.lines||[]).filter(l=>l.start>=(range?.start??0)&&l.start<(range?.end??plan.duration)).length*3;
  const perfect=!hard&&pixel?.completed&&lyricSamples.length>=needed&&!!validation&&technical>=98&&creative>=95&&social>=requiredSocial&&!(pixel?.metrics?.lyricNotRendered||pixel?.metrics?.lyricPartialClip)&&stagnant<8&&!!plan?.climax;
  report.quality=Object.assign(q,{score:perfect?legacyScore:Math.min(99,legacyScore),overallScore:perfect?Math.max(0,overall):Math.min(99,Math.max(0,overall)),technicalScore:technical,creativeScore:creative,socialScore:social,
    domains:[{key:'technical',score:technical,max:100},{key:'creative',score:creative,max:100},{key:'social',score:social,max:100}],
    metrics:{perceptualNovelty:pixel?.completed?Math.round(novelty):null,foregroundNovelty:pixel?.completed?m.foregroundNovelty:null,backgroundShotDiversity:pixel?.completed?m.backgroundShotDiversity:null,visualStagnationSeconds:pixel?.completed?+stagnant.toFixed(1):null,structuralDiversity:Math.round(structure),styleArcRealization:Math.round(m.styleArcRealization??realization),typographyDiversity:Math.min(100,Math.round((m.distinctLayoutCount||1)*16)),layerDepth:Math.round(layer),temporalContrast:Math.round(contrast),peakImpact:Math.round(peak),hookNovelty:Math.round(hookNovelty),loopQuality:loop},
    scoreFormula:{technical:.35,creative:.4,social:.25},confidence:pixel?.completed&&validation?'HIGH':pixel?.completed?'MEDIUM':'LOW',hardGates:Object.assign({},q.hardGates,{passed:!hard,visualStagnationCap:pixel?.completed&&tier==='HYPER'&&stagnant>=8})});
  if(pixel?.completed&&stagnant>8&&['HIGH_ENERGY','HYPER'].includes(tier)&&!report.issues.some(i=>i.code==='visual_stagnation'))report.issues.push({code:'visual_stagnation',severity:'WARNING',message:'画面の変化が長く止まり、創作スコアの上限を適用しました'});
  if(plan?.styleArc)report.styleArc=plan.styleArc;
  report.errors=report.issues.filter(i=>i.severity==='ERROR');report.warnings=report.issues.filter(i=>i.severity==='WARNING');report.ready=!hard;
  return report;
};

J.createSocialHookPlan=(source,candidate)=>{
  const plan=JSON.parse(JSON.stringify(source)),start=C(candidate?.start,0,Math.max(0,plan.duration-.1)),end=C(candidate?.end,start,plan.duration),duration=Math.max(.1,end-start);
  const rhythmEnd=Math.min(7,duration*.48),escalateEnd=Math.min(11,duration*.74),loopStart=Math.max(escalateEnd+.4,duration-.85);
  const phases=[{name:'shock',from:0,to:Math.min(1,duration),energy:1},{name:'identity',from:1,to:Math.min(3,duration),energy:.6},{name:'rhythm',from:3,to:rhythmEnd,energy:.72},{name:'escalate',from:rhythmEnd,to:escalateEnd,energy:.82},{name:'peak',from:escalateEnd,to:loopStart,energy:1},{name:'loop',from:loopStart,to:duration,energy:.68}].filter(p=>p.to>p.from);
  const firstCut=plan.cuts.find(c=>c.line>=0&&c.start>=start&&c.start<end),firstStyle=firstCut?.styleKey||plan.styleKey;
  plan.socialHook={version:2,start,end,duration,phases,loopStyle:firstStyle,dedicatedReedit:true,portraitComposition:plan.H>plan.W};
  const matching=plan.cuts.filter(c=>c.line>=0&&c.start>=start&&c.start<end);for(const c of matching){const rel=c.start-start,p=phases.find(x=>rel>=x.from&&rel<x.to);if(!p)continue;const originalLayout=c.layout;
    c.params.intensityScale=C((c.params.intensityScale||1)*(.92+p.energy*.18),.82,1.3);c.socialHookPhase=p.name;
    if(plan.H>plan.W){c.portraitSourceLayout=c.layout;c.params.maxWidth=Math.min(c.params.maxWidth||.82,.78);if(['marquee','scatter','ring','tile','diag','split'].includes(c.layout))c.layout='center';c.params.y=p.name==='shock'||p.name==='peak'?.53:.58;}
    if(p.name==='peak'){const alt=['huge','diag','stack'].find(x=>J.LAYOUTS[x]&&!J.LAYOUTS[x].special&&[...(c.lineText||c.text||'')].length<=11);if(alt&&plan.H<=plan.W)c.layout=alt;}
    if(p.name==='loop'&&firstCut){c.styleKey=firstStyle;c.style=firstCut.style;}
    if(c.layout!==originalLayout&&J.LAYOUTS[c.layout]?.plan){const old=c.params,planned=J.LAYOUTS[c.layout].plan(J.rng(c.seed),c,c.style||plan.style)||{};c.params={...planned,maxWidth:old.maxWidth,directionAngle:old.directionAngle,intensityScale:old.intensityScale,font:old.font||planned.font};}
  }
  for(const p of phases){if(!['shock','peak'].includes(p.name))continue;const t=start+(p.from+p.to)/2,cut=matching.find(c=>c.start>=start+p.from&&c.start<start+p.to);if(!cut)continue;
    const type=p.name==='peak'?'flash':'zoom';plan.events.push({t,type,amp:p.name==='peak'?0.78:0.58,dur:.13,socialHook:true,hype:true,attentionCost:J.attentionCost(type,p.energy)});
  }
  const socialOpening=[
    {t:start,type:'flash',amp:.62,dur:.04,hype:true,reason:'hook-social-opening-flash'},
    {t:start+.045,type:'zoom',amp:.92,dur:.19,hype:true,reason:'hook-social-opening-scale'},
    {t:start+.31,type:'chroma',amp:.55,dur:.18,hype:true,reason:'hook-social-opening-color'}];
  plan.hypeTimeline=[...(plan.hypeTimeline||[]),...socialOpening.filter(e=>!(plan.hypeTimeline||[]).some(x=>x.type===e.type&&Math.abs(x.t-e.t)<.02))];
  if(plan.artDirection?.vocabulary?.layout){plan.artDirection.vocabulary.layout=[...new Set([...(plan.artDirection.vocabulary.layout||[]),...matching.map(c=>c.layout).filter(Boolean)])];}
  const lastCut=matching.at(-1);if(lastCut&&firstCut&&duration>=12){lastCut.styleKey=firstStyle;lastCut.style=firstCut.style;lastCut.backgroundScene=firstCut.backgroundScene?{...firstCut.backgroundScene}:lastCut.backgroundScene;}
  plan.events.sort((a,b)=>a.t-b.t);plan.attentionBudget=J.auditAttentionBudget(plan);plan.socialHook.loopQuality=J.loopQuality?.(plan,null,{start,end})?.score??null;
  plan.socialHookAudit={dedicated:true,phases:phases.map(x=>x.name),cuts:matching.length,loopStyle:firstStyle,loopStyleMatched:lastCut?.styleKey===firstStyle,attentionWithinBudget:plan.attentionBudget.withinBudget};return plan;
};
})();
