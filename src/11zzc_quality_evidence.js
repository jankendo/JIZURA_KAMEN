/* Evidence classification; restrained editorial motion is not a frozen renderer. */
(()=>{'use strict';const J=window.J;
const novelty=J.measurePerceptualNovelty;
J.measurePerceptualNovelty=observations=>{
 const result=novelty(observations),frames=(observations||[]).filter(x=>Number.isFinite(x?.time)).sort((a,b)=>a.time-b.time);
 result.pairs=result.pairs.map((pair,i)=>{const a=frames[i],b=frames[i+1],n=Math.min(a?.grid?.length||0,b?.grid?.length||0);let delta=0;for(let k=0;k<n;k++)delta+=Math.abs(a.grid[k]-b.grid[k]);return {...pair,pixelDelta:n?delta/n:null,identicalSampleHash:Number.isFinite(a?.hash)&&Number.isFinite(b?.hash)?a.hash===b.hash:null};});
 return result;
};
const overlaps=(a,b,c,d)=>a<d&&b>c;
J.classifyTemporalEvidence=(plan,pairs,range)=>{
 const intervals=[],active=(plan.lines||[]).filter(l=>String(l.text||'').trim()).map(l=>({from:l.start,to:l.visEnd??l.end}));
 let activeRun=0,frozenRun=0,quietRun=0,unknownRun=0,maxActive=0,maxFrozen=0,maxQuiet=0,maxUnknown=0,prevTo=null;
 for(const p of pairs||[]){
  if(!Number.isFinite(p.from)||!Number.isFinite(p.to)||p.to<=p.from)continue;
  const from=Math.max(p.from,range?.start??0),to=Math.min(p.to,range?.end??plan.duration);if(to<=from)continue;
  if(prevTo!==null&&Math.abs(from-prevTo)>.01){activeRun=frozenRun=quietRun=unknownRun=0;}prevTo=to;
  const lyric=active.some(l=>overlaps(from,to,l.from,l.to)),section=plan.musicalStructure?.sections?.find(s=>from>=s.from&&to<=s.to+.001),quiet=!lyric&&['intro','outro','break'].includes(section?.role);
  const exact=p.identicalSampleHash===true&&p.pixelDelta!==null&&p.pixelDelta<=1e-9;
  const explicitHold=plan.directorSections7?.some(s=>overlaps(from,to,s.from,s.to)&&/still|lock|freeze|hold/.test([].concat(s.cameraIntent||[],s.motionIntent||[]).join(' ').toLowerCase()));
  const frozen=exact&&!explicitHold,kind=frozen?'FROZEN_SUSPECT':quiet?'INTENTIONAL_LYRIC_FREE_RESTRAINT':lyric&&p.stagnant?'LOW_ACTIVE_LYRIC_VARIATION':p.stagnant?'LOW_UNCLASSIFIED_VARIATION':'CHANGING';
  const gap=to-from;activeRun=lyric&&p.stagnant&&!frozen?activeRun+gap:0;frozenRun=frozen?frozenRun+gap:0;quietRun=quiet&&!frozen?quietRun+gap:0;unknownRun=!lyric&&!quiet&&p.stagnant&&!frozen?unknownRun+gap:0;
  maxActive=Math.max(maxActive,activeRun);maxFrozen=Math.max(maxFrozen,frozenRun);maxQuiet=Math.max(maxQuiet,quietRun);maxUnknown=Math.max(maxUnknown,unknownRun);
  intervals.push({from,to,classification:kind,noveltyScore:p.score,pixelDelta:p.pixelDelta??null,identicalSampleHash:p.identicalSampleHash??null,activeLyrics:lyric,sectionRole:section?.role??null});
 }
 return {method:'sampled raster delta/hash, active lyric intervals and planned section roles; frozen is a suspicion, not a decode proof',intervals,activeLyricLowVariationSeconds:+maxActive.toFixed(3),frozenSuspectSeconds:+maxFrozen.toFixed(3),intentionalLyricFreeRestraintSeconds:+maxQuiet.toFixed(3),unclassifiedLowVariationSeconds:+maxUnknown.toFixed(3),applicableStagnationSeconds:+Math.max(maxActive,maxFrozen,maxUnknown).toFixed(3)};
};
J.glyphInspectionEvidence=(plan,metrics,range)=>{
 const from=range?.start??0,to=range?.end??plan.duration,expectedLines=(plan.lines||[]).filter(l=>String(l.text||'').trim()&&l.start<to&&(l.visEnd??l.end)>from),points=(metrics?.lyricPoints||[]).filter(p=>Number.isFinite(p.time)&&p.time>=from&&p.time<to),represented=new Set(points.map(p=>p.line)),missing=points.filter(p=>p.missing).length,clipped=points.filter(p=>p.clipped).length;
 return {status:points.length?'SAMPLED_GLYPH_MASK_INSPECTION':'UNMEASURED',expectedLines:expectedLines.length,inspectedLines:expectedLines.filter(l=>represented.has(l.index)).length,sampledPoints:points.length,missingSamples:missing,clippedSamples:clipped,readabilityScore:null,localContrastStatus:'UNMEASURED',caveat:'Glyph presence and bounds do not establish readable contrast, correct lyric text, or perceptual singing sync.'};
};
const analyze=J.analyzeRenderedFrames;
J.analyzeRenderedFrames=async(plan,range,audio,telemetry)=>{
 const r=await analyze(plan,range,audio,telemetry);if(!r.completed)return r;
 const m=r.metrics;if(!m.temporalNovelty?.length){m.temporalEvidence={status:'UNMEASURED',intervals:[],method:'No raster pair evidence; existing stagnation result retained'};m.glyphInspection=J.glyphInspectionEvidence(plan,m,range);return r;}
 const e=J.classifyTemporalEvidence(plan,m.temporalNovelty,range);m.temporalEvidence=e;m.rawStagnationSeconds=m.stagnationSeconds;m.stagnationSeconds=e.applicableStagnationSeconds;m.glyphInspection=J.glyphInspectionEvidence(plan,m,range);
 if(e.applicableStagnationSeconds<8)r.issues=r.issues.filter(i=>!['visual_stagnation','VISUAL_STAGNATION'].includes(i.code));
 if(e.frozenSuspectSeconds>=8&&!r.issues.some(i=>i.code==='frozen_frame'))r.issues.push({code:'frozen_frame',severity:'WARNING',exportBlocking:false,message:'代表画素が8秒以上同じです。意図した静止か、描画停止かを確認してください'});
 plan.lastPixelQA=r;return r;
};
const quality=J.checkMVQuality;
J.checkMVQuality=(project,plan,audio,range,pixel,...rest)=>{
 const r=quality(project,plan,audio,range,pixel,...rest),q=r.quality;if(!q)return r;
 q.typographyEvidence={status:pixel?.completed?'LAYOUT_VARIETY_AND_TECHNICAL_PROXY':'UNMEASURED',legacyScore:q.typographyScore,distinctLayoutCount:pixel?.metrics?.distinctLayoutCount??null,formula:'35% capped layout count / 4 + 65% technical score; not a contrast/readability score',glyphInspection:pixel?.metrics?.glyphInspection??J.glyphInspectionEvidence(plan,{},range)};
 q.temporalEvidence=pixel?.metrics?.temporalEvidence??null;return r;
};
const provenance=J.createExportProvenance;
J.createExportProvenance=async(...args)=>{const result=await provenance(...args),metrics=args[0].plan.lastPixelQA?.metrics;return {...result,qualityEvidence:{typography:{measurement:'layout-variety-and-technical-proxy',readabilityScore:null,glyphInspection:metrics?.glyphInspection??null},temporal:metrics?.temporalEvidence??null},measurementSources:{...result.measurementSources,typography:'pre-export-layout-variety-and-technical-proxy'},measurementPolicy:{...result.measurementPolicy,typography:'文字組の種類数と技術点の代理指標。局所コントラストや読みやすさの実測ではない',stagnation:'歌詞表示中の低変化・意図した無歌詞の静かな区間・代表画素の静止疑いを区別'}};};
})();
