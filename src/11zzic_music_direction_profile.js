/* Known measurements, provided priors and missing signals are not interchangeable. */
(()=>{'use strict';const J=window.J,finite=x=>Number.isFinite(x),list=x=>x?Array.from(x):[],mean=x=>x.length?x.reduce((s,v)=>s+v,0)/x.length:null;
const feature=(value,confidence,source,status='MEASURED',reason=null)=>({value,confidence:finite(confidence)?J.clamp(confidence):null,source,status,reason});
const missing=reason=>feature(null,null,null,'UNMEASURED',reason);
J.createMusicDirectionProfile=(audio,project={},plan=null)=>{
 const f=audio?.features||{},rate=audio?.energyRate,energy=list(audio?.energy),onset=list(audio?.onset),rms=list(audio?.rms),frames=list(f.detailedTimeline),stats=f.statistics||{},valid=x=>x.length>0&&x.every(finite);
 const measured=typeof audio?.buffer?.getChannelData==='function'&&audio?.analysisSource?.method==='PCM_AUDIO_FEATURES_V1'&&audio.analysisSource.status==='MEASURED'&&valid(energy)&&finite(rate)&&rate>0;
 const scalar=(key,value)=>measured&&stats[key]&&frames.length&&finite(value)?feature(value,stats[key].confidence,'FFT_1024_PCM_TIMELINE'):missing('No independently analysed spectral timeline for '+key);
 const lines=plan?.lines||[],sections=plan?.musicalStructure?.sections||[],repetitions=new Map();
 const lyrics=lines.map((line,index)=>{const text=String(line.text??''),key=text.normalize('NFC').replace(/\s/g,''),seen=repetitions.get(key)||[];repetitions.set(key,[...seen,index]);return {index,text,start:line.start,end:line.end,graphemes:J.graphemes(text).length,density:finite(line.end-line.start)&&line.end>line.start?J.graphemes(text).length/(line.end-line.start):null,previousExactRepetitions:seen};});
 const timeline=measured?energy.map((value,i)=>({time:i/rate,energy:value,onset:finite(onset[i])?onset[i]:null,rms:finite(rms[i])?rms[i]:null})):null;
 const rests=measured&&valid(rms)?rms.flatMap((value,i)=>value<.001?[{time:i/rate,duration:1/rate,rms:value}]:[]):null;
 return {schema:1,source:'Existing PCM/BPM/onset/FFT analysis; exact lyric/LRC contract',duration:finite(audio?.duration)?audio.duration:null,
  bpm:measured&&finite(audio?.bpm)&&audio.bpm>0&&finite(audio.tempoConfidence)?feature(audio.bpm,audio.tempoConfidence,'PCM_ONSET_AUTOCORRELATION'):missing('No measured tempo confidence'),
  beats:measured&&finite(audio.tempoConfidence)&&audio.tempoConfidence>0?feature(list(audio.beats),audio.tempoConfidence,'INFERRED_BEAT_GRID_FROM_PCM_ONSETS'):missing('No credible beat grid'),
  beatStrength:measured&&finite(f.beatStrength)?feature(f.beatStrength,audio.tempoConfidence,'PCM_ONSET_GRID'):missing('Beat strength unavailable'),
  onset:measured&&valid(onset)?feature(onset,null,'PCM_HIGH_PASS_LOG_ENERGY_ONSET'):missing('Onset samples unavailable'),
  loudness:measured&&valid(rms)?feature({rms:mean(rms),timeline:rms},null,'PCM_WINDOW_RMS_NOT_PERCEPTUAL_LUFS'):missing('Absolute RMS unavailable; normalized energy is not loudness'),
  normalizedEnergy:measured?feature({mean:mean(energy),timeline},null,'PCM_NORMALIZED_ENERGY'):missing('Normalized PCM energy unavailable'),
  rests:rests?feature(rests,null,'PCM_RMS_BELOW_0.001'):missing('No absolute RMS silence observations'),
  brightness:scalar('brightness',f.brightness),bass:scalar('bass',f.bass),high:scalar('high',f.high),timbreChange:scalar('spectralFlux',f.spectralFlux),
  sections:sections.length&&measured?feature(sections.map(s=>({from:s.from,to:s.to,role:s.role,energy:s.energy})),null,'EXISTING_HEURISTIC_MUSICAL_STRUCTURE_NOT_GROUND_TRUTH','INFERRED','Section confidence is not calibrated'):missing('Section boundaries not independently known'),
  lyricStructure:feature(lyrics,1,'EXACT_INPUT_LRC_AND_GRAPHEMES'),singingTiming:missing('LRC cues are not measured phoneme/syllable singing alignment'),lyricSemantics:missing('No validated semantic model'),keyChange:missing('Spectral change is not proof of modulation'),
  providedPriors:Object.fromEntries(Object.entries(f).filter(([k,v])=>finite(v)).map(([k,v])=>[k,feature(v,null,'EXISTING_PROVIDED_DESCRIPTOR','PROVIDED')])),
  limitations:['No genre label controls the optimizer','Missing measurements remain null','Energy is normalized; perceived loudness and song semantics are separate','Section roles are heuristic and confidence-labelled']};
};
})();
