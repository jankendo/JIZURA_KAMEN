/* Preserve lyric phrases and supplied photography in automatic direction. */
(()=>{'use strict';const J=window.J;
const structure=J.analyzeMusicalStructure;
J.analyzeMusicalStructure=(p,a,project={})=>{
 const base=structure(p,a,project),ls=p.lines||[];
 if(project.directorPlan?.sections?.length||project.directorPlan?.chapters?.length||ls.length<4)return base;
 // Only accept complete adjacent repeated phrases with compatible timing.
 let block=0;
 for(let n=2;n<=ls.length/2;n++){
  if(ls.length%n)continue;
  if(ls.every((l,i)=>l.text.trim()===ls[i%n].text.trim())&&ls.slice(n).every((l,i)=>Math.abs((l.start-ls[i].start)-(ls[n].start-ls[0].start))<.8)){block=n;break;}
 }
 if(!block)return base;
 const end=Math.min(p.duration,ls.at(-1).end),starts=ls.filter((_,i)=>i%block===0).map(l=>l.start);
 if(starts.length>5)return base;
 const timeline=a?.features?.detailedTimeline||a?.features?.timeline||[];
 const sections=[];
 const add=(from,to,role,source)=>{if(to-from>.05)sections.push({from,to,role,energy:(()=>{const frames=timeline.filter(f=>f.time>=from&&f.time<to);return frames.length?frames.reduce((s,f)=>s+(+f.energy||0),0)/frames.length:(a?.features?.energy||.5);})(),confidence:source==='estimated-display-end'?.45:.9,evidence:{source}});};
 add(0,starts[0],'intro','first-lyric-onset');
 starts.forEach((from,i)=>add(from,starts[i+1]??end,i===starts.length-1?'reprise':'verse','repeated-lyric-block'));
 const repeated=sections.filter(s=>s.evidence.source==='repeated-lyric-block');
 for(const [i,s] of repeated.entries()){s.boundaryConfidence=.9;s.roleConfidence=.5;s.roleEvidence='repetition-only';if(i===repeated.length-1&&i>0){const previous=repeated[i-1],rise=s.energy-previous.energy;if(rise>.06&&s.energy>previous.energy*1.15){s.role='climax';s.roleConfidence=.65;s.roleEvidence='repetition-and-energy-rise';}else{s.role='reprise';s.roleConfidence=.6;s.roleEvidence='repetition-without-strong-energy-rise';}}s.confidence=s.roleConfidence;}
 add(end,p.duration,'outro','estimated-display-end');
 return {...base,method:'repeated-lyric-blocks',fallback:false,sections,lyricEndStatus:'DISPLAY_DURATION_HEURISTIC_NOT_VOCAL_DETECTION'};
};
const chapterIntent=J.chapterIntent;J.chapterIntent=(s,...args)=>s.role==='reprise'?'reprise':chapterIntent(s,...args);
const impact=J.audienceImpact7;J.audienceImpact7=(observer,p)=>{if(!p.musicalStructure?.sections?.some(s=>s.role==='climax'))return {score:null,climaxApplicable:false,climaxPass:null,status:'NOT_APPLICABLE_NO_SUPPORTED_CLIMAX',method:'クライマックス未検出。反復の画素ピークを観客評価に換算しない'};return {...impact(observer,p),climaxApplicable:true};};
const motifReality=J.measureMotifReality7;J.measureMotifReality7=async(p,range)=>{const chapters=p.visualWorld?.chapters?.filter(w=>w.to>(range?.start??0)&&w.from<(range?.end??p.duration))||[],explicit=p.directorSections7?.some(s=>s.motif&&s.to>(range?.start??0)&&s.from<(range?.end??p.duration));if(p.singleBackground&&p.customBg?.enabled&&chapters.length&&chapters.every(w=>!w.photoExit)&&!explicit)return {score:null,measured:false,applicable:false,status:'NOT_APPLICABLE_PHOTOGRAPHIC_WORLD',method:'背景イラストを維持する方針。省略した装飾モチーフは因果検査の対象外'};return {...await motifReality(p,range),applicable:true};};
const manual=(p,c)=>!!(p.directionOverrides7?.[c.line]?.layout||p.directionOverrides7?.[c.line]?.treat||p.directionOverrides7?.[c.line]?.lock||p.directorLyricDirectives7?.some(d=>d.line===c.line)||c.assetScene?.locked);
const apply=J.applyAssetStoryboard;
J.applyAssetStoryboard=p=>{
 if(J.singleBackgroundMode&&p.customBg?.enabled){
  const asset=p.visualAssets?.find(a=>a.dataUrl);
  if(asset)for(const s of p.storyboard||[]){
   const w=p.visualWorld?.chapters?.find(w=>s.from>=w.from&&s.from<w.to);
   if(w?.directorConstraints?.scene&&w.scene==='GRAPHIC_HEAVY'&&!s.locked){s.assetId=null;s.variant='TYPE_ONLY';continue;}
   if(s.locked||w?.directorConstraints?.scene)continue;
   s.assetId=asset.id;s.variant=s.role==='climax'?'HERO':'WIDE';s.reason='自動構成：指定背景を保持';s.crop={...s.crop,zoom:Math.min(1.15,s.crop?.zoom||1)};
  }
 }
 apply(p);
 for(const c of p.cuts){if(manual(p,c))continue;if(J.singleBackgroundMode&&p.customBg?.enabled&&!c.photoExit){if(c.layout==='stack'){c.layout='type';c.params={...c.params,...J.LAYOUTS.type.plan(J.rng(c.seed),c,c.style||p.style),font:c.params.font,align:'center',prompt:false};}c.params={...c.params,readablePhoto:true,font:c.params.font==='gothic_black'?'gothic_bold':c.params.font};}if(c.layout==='huge')c.params={...c.params,readableHero:true,label:false};if(J.singleBackgroundMode&&p.customBg?.enabled&&!c.photoExit&&['outline','dotted'].includes(c.treat)){c.treat=null;c.autoPhotoFilled=true;}}
};
const readability=J.adjustLocalReadability;
J.adjustLocalReadability=(env,it)=>{
 const world=env.plan?.visualWorld?.chapters?.find(w=>env.t>=w.from&&env.t<w.to);
 const photo=env.pass==='main'&&env.cut?.line>=0&&env.plan?.customBg?.enabled&&!world?.photoExit&&!env.plan.manualLyricColor&&!it.plain&&it.ghost!==false&&it.fill!==false&&!manual(env.plan,env.cut);
 const fn=it.charFn;
 const input=photo?{...it,color:'#f8f8f2',gradient:null,charFn:fn?(...a)=>{const c=fn(...a);return c?{...c,color:'#f8f8f2'}:c;}:fn}:it;
 const next=readability(env,input);
 if(env.pass==='main'&&env.cut?.line>=0&&it.fill!==false&&it.ghost!==false&&!manual(env.plan,env.cut)){
  const cap=Math.min(3*(env.H||1080)/1080,Math.max(1,(next.size||24)*.008));
  return {...next,stroke:Math.min(next.stroke||0,cap)};
 }
 return next;
};
const prompt=J.directorPrompt;
J.directorPrompt=()=>prompt().replaceAll('JIZURA','KAMEN').replace('最大3案','最適な1案').replace('案A,案B,案C','案A').replace('冒頭3秒','実際の歌詞開始時刻を尊重した導入')+' 反復フレーズの途中で章を分割しない。最後の歌詞を音源末尾まで引き延ばさない。歌唱終了は未検出なら推定と明記。指定背景を自動で文字だけの画面に置換しない。歌詞の重複ラベルを避け、文字内部の空間と安全領域を保つ。';
// Photographic worlds use the existing artwork as their visual motif.
 const motif=J.drawUnifiedMotif;
 J.drawUnifiedMotif=(ctx,p,t,...rest)=>{const explicit=p.directorSections7?.some(s=>t>=s.from&&t<s.to&&s.motif);const world=p.visualWorld?.chapters?.find(w=>t>=w.from&&t<w.to);if(p.singleBackground&&p.customBg?.enabled&&!world?.photoExit&&!explicit)return;return motif(ctx,p,t,...rest);};
 const camera=J.cameraAt;
 J.cameraAt=(p,t,range)=>{const s=p.musicalStructure?.sections?.find(s=>t>=s.from&&t<s.to),cut=J.cutAt(p,t),explicit=p.directorSections7?.some(s=>t>=s.from&&t<s.to&&(s.cameraIntent||s.motionIntent));if(p.singleBackground&&p.customBg?.enabled&&(!cut||cut.line<0)&&['intro','outro'].includes(s?.role)&&!explicit){const u=J.clamp((t-s.from)/Math.max(.1,s.to-s.from)),e=u*u*(3-2*u);return {s:s.role==='intro'?1.015+.045*e:1.06-.045*e,x:0,y:0,rot:0};}return camera(p,t,range);};
 const make=J.plan;
 J.plan=(p,a)=>{const plan=make(p,a);plan.manualLyricColor=!!(p.colors?.enabled&&!(p.autoPalette?.analyzed&&p.autoPalette?.enabled&&!p.autoPalette?.userModified&&p.autoPalette?.options?.palette!==false));plan.photoReadablePolicy=!!(p.autoDirection&&plan.singleBackground&&plan.customBg?.enabled&&!plan.directorSections7?.some(s=>s.fxIntent));return plan;};
 const provenance=J.createExportProvenance;
J.createExportProvenance=async(...args)=>({...await provenance(...args),applicationVersion:window.KAMEN_APP_INFO?.version||'2.0.10',artistic100Established:false,measurementApplicability:{climax:args[0].plan.musicalStructure?.sections?.some(s=>s.role==='climax')?'PIXEL_PROXY':'NOT_APPLICABLE_NO_SUPPORTED_CLIMAX',decorativeMotif:args[0].plan.lastPixelQA?.metrics?.motifReality?.status||'PIXEL_PROXY'},measurementSources:{beatSync:'decoded-export-pixels',lyricSync:'decoded-export-pixels',audienceImpact:'decoded-export-pixels',typography:'pre-export-canvas-and-plan',musicalDirection:'decoded-export-pixels-and-audio-targets',visualWorld:'pre-export-canvas',social:'automatic-proxy'},measurementPolicy:{structureRole:'反復境界の確信度と音楽的役割の確信度を分離。歌詞反復だけではclimaxと判定しない',beatSync:'音声ビートと実画素ピークの近接推定',lyricSync:'LRC開始と実画素ピークの近接推定。歌唱同期ではない',audienceImpact:'画素変化の推定。観客評価ではない',unmeasured:['歌唱との知覚的同期','観客評価','芸術的完全性'],certified100Meaning:'内部の自動検査基準への適合。作品の芸術的100点を保証しない'},lyricEndStatus:args[0].plan.musicalStructure?.lyricEndStatus||'DISPLAY_DURATION_HEURISTIC_NOT_VOCAL_DETECTION'});
})();
