/* Target-conditioned timing evidence. The observer remains pixel-only. */
(()=>{'use strict';const J=window.J,legacy=J.alignmentDomains8;
J.alignmentDomains8=(observer,targets={})=>{
 const old=legacy?.(observer,targets),toleranceMs=100;
 const peaks=(observer?.peaks||[]).filter(p=>['Hero','Major'].includes(p.tier)&&Number.isFinite(p.time));
 const normalize=(values,type)=>[...new Map((values||[]).map(v=>{
  const time=typeof v==='number'?v:v?.time;
  return [time,{time,type,confidence:typeof v==='object'&&Number.isFinite(v.confidence)?v.confidence:null}];
 }).filter(([time])=>Number.isFinite(time))).values()];
 const expectedBeats=normalize(targets.EXPECTED_BEAT||targets.REQUIRED_BEAT,'BEAT');
 const beats=normalize([...(targets.BEAT||[]),...expectedBeats],'BEAT'),lyrics=normalize(targets.LYRIC_ONSET,'LYRIC_ONSET');
 // Section accents compete for attribution, but are not lyric/beat failures.
 const sections=normalize(targets.SECTION,'SECTION');
 const candidates=[...lyrics,...beats,...sections],pairs=[];
 for(let pi=0;pi<peaks.length;pi++)for(let ti=0;ti<candidates.length;ti++){
  const errorMs=Math.abs(peaks[pi].time-candidates[ti].time)*1000;
  if(errorMs<=toleranceMs+1e-6)pairs.push({pi,ti,errorMs});
 }
 const rank={LYRIC_ONSET:0,BEAT:1,SECTION:2};
 pairs.sort((a,b)=>a.errorMs-b.errorMs||rank[candidates[a.ti].type]-rank[candidates[b.ti].type]||a.pi-b.pi);
 const usedPeaks=new Set(),usedTargets=new Set(),matches=[];
 for(const pair of pairs)if(!usedPeaks.has(pair.pi)&&!usedTargets.has(pair.ti)){
  usedPeaks.add(pair.pi);usedTargets.add(pair.ti);matches.push({...pair,targetType:candidates[pair.ti].type});
 }
 const nearest=p=>candidates.reduce((best,t,ti)=>{
  const errorMs=Math.abs(t.time-p.time)*1000;
  return !best||errorMs<best.errorMs?{ti,errorMs,targetType:t.type}:best;
 },null);
 const unmatched=peaks.flatMap((p,pi)=>usedPeaks.has(pi)?[]:[{pi,...nearest(p)}]);
 const domain=(type,list,required)=>{
  const matched=matches.filter(m=>m.targetType===type),late=unmatched.filter(m=>m.targetType===type);
  const samples=[...matched.map(m=>({time:peaks[m.pi].time,targetTime:candidates[m.ti].time,errorMs:m.errorMs,pass:true,uncertaintyMs:(observer?.sampleStep||.1)*500})),...late.map(m=>({time:peaks[m.pi].time,targetTime:candidates[m.ti]?.time??null,errorMs:m.errorMs,pass:false,uncertaintyMs:(observer?.sampleStep||.1)*500}))];
  const missing=list.filter(t=>!matched.some(m=>candidates[m.ti].time===t.time)).map(t=>({time:t.time,status:'NO_STRONG_PIXEL_PEAK',required}));
  // Lyrics have an expected onset per supplied line. Beat accents are selective:
  // no assumption that the director must make every metrical beat a strong hit.
  const denominator=required?Math.max(list.length,samples.length):samples.length;
  return {score:list.length&&observer?.sampleCount>0&&denominator?Math.round(100*matched.length/denominator):null,scoreMeaning:required?'expected-onset-coverage-with-unmatched-peak-penalty':'attributed-strong-peak-precision',samples,status:list.length&&observer?.sampleCount>0?'TARGET_CONDITIONED_PIXEL_PROXY':'UNMEASURED',toleranceMs,targetCount:list.length,matchedCount:matched.length,missingTargets:missing,coverage:list.length?Math.round(100*matched.length/list.length):null,coverageRequired:required,oneToOne:true};
 };
 const beatSync=domain('BEAT',beats,false),lyricSync=domain('LYRIC_ONSET',lyrics,true);
 beatSync.targetPeakPrecision=beatSync.score;
 beatSync.expectedTargets=expectedBeats.map(t=>t.time);
 beatSync.expectedMatchedCount=expectedBeats.filter(t=>matches.some(m=>m.targetType==='BEAT'&&candidates[m.ti].time===t.time)).length;
 beatSync.missingExpectedTargets=expectedBeats.filter(t=>!matches.some(m=>m.targetType==='BEAT'&&candidates[m.ti].time===t.time)).map(t=>({time:t.time,status:'NO_STRONG_PIXEL_PEAK',required:true}));
 beatSync.score=expectedBeats.length&&observer?.sampleCount>0?Math.round(100*beatSync.expectedMatchedCount/expectedBeats.length):null;
 beatSync.scoreMeaning='coverage-of-explicitly-intended-beat-cues';
 beatSync.status=expectedBeats.length&&observer?.sampleCount>0?'EXPECTED_BEAT_CUE_PIXEL_PROXY':'UNMEASURED_EXPECTED_BEAT_CUES';
 beatSync.confidenceStatus=beats.length&&beats.every(b=>b.confidence!==null)?'PROVIDED':'UNMEASURED';
 beatSync.tempoConfidence=Number.isFinite(targets.tempoConfidence)?targets.tempoConfidence:null;
 beatSync.confidentTargetCount=beats.filter(b=>b.confidence!==null&&b.confidence>=.6).length;
 return {beatSync,lyricSync,attribution:{matched:matches.map(m=>({time:peaks[m.pi].time,targetTime:candidates[m.ti].time,targetType:m.targetType,errorMs:m.errorMs})),unmatched:unmatched.map(m=>({time:peaks[m.pi].time,targetType:m.targetType||'FREE',errorMs:m.errorMs??null})),independentObserver:true},allPeakProximity:old?{beatSync:old.beatSync,lyricSync:old.lyricSync}:null,note:'独立した画素ピークを時刻の近さで一対一に割り当てた推定。原因や歌唱同期の証明ではない。歌詞開始の未対応を残し、全拍に強い演出を要求しない。ビート信頼性が未取得の場合は未測定。'};
};
})();
