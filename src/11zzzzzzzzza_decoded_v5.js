/* Physical creative observations, not an aesthetic score. All clock/segmentation limits survive export. */
(()=>{'use strict';const J=window.J,Q=J.cinemaV5,V=J.cinemaV3,C=J.clamp,F=Number.isFinite;
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:null;
const quantile=(a,q)=>a.length?[...a].sort((x,y)=>x-y)[Math.floor((a.length-1)*q)]:null;
const evidence=(value,method,sampleCount,extra={})=>({status:F(value)&&sampleCount>0?'MEASURED':'UNMEASURED',value:F(value)&&sampleCount>0?value:null,unit:'index/1',source:'ENCODED_MP4',confidence:F(value)&&sampleCount>0?.7:0,sampleCount,method,score:null,calibration:'UNSCORED_PHYSICAL_INDEX',humanStatus:Q.humanStatus,...extra});
const grid=(data,w,h,mask=null)=>{
 const sums=Array(144).fill(0),count=Array(144).fill(0),occluded=Array(144).fill(false);
 for(let y=0;y<h;y++)for(let x=0;x<w;x++){const k=y*w+x,t=Math.min(7,Math.floor(y/h*8))*18+Math.min(17,Math.floor(x/w*18));sums[t]+=data[k];count[t]++;if(mask?.[k]>.01)occluded[t]=true;}
 return {values:sums.map((s,i)=>s/Math.max(1,count[i])),valid:occluded.map(v=>!v)};
};
const normalize=a=>{const m=mean(a)||0,s=Math.sqrt(mean(a.map(x=>(x-m)**2))||0);return a.map(x=>s>1/255?(x-m)/s:0);};
const difference=(a,b)=>mean(a.map((x,i)=>Math.abs(x-b[i])))??0;
Q.regionObservation=(actual,background,mask,w,h,visible)=>{
 if(actual.length!==w*h||background.length!==actual.length||mask.length!==actual.length)return {status:'UNMEASURED',reason:'REGION_SHAPE_MISMATCH'};
 const ink=Array.from(actual,(v,i)=>mask[i]>.01?Math.abs(v-background[i]):0),mass=ink.reduce((s,v)=>s+v,0);let sx=0,sy=0,spread=0,area=0;
 for(let i=0;i<ink.length;i++){sx+=ink[i]*(i%w)/w;sy+=ink[i]*Math.floor(i/w)/h;if(ink[i]>2/255)area++;}
 const centroid=mass?[sx/mass,sy/mass]:null;
 if(centroid)for(let i=0;i<ink.length;i++)spread+=ink[i]*((i%w/w-centroid[0])**2+(Math.floor(i/w)/h-centroid[1])**2)/mass;
 return {status:visible&&mass>0?'MEASURED':'UNMEASURED',foreground:{signature:grid(ink,w,h).values,centroid,spread,area:area/(w*h),mass},background:grid(actual,w,h,mask),decoration:{status:'UNMEASURED',reason:'No independently verified decoration segmentation'},subject:{status:'UNMEASURED',reason:'No verified subject segmentation'},limits:'Foreground is decoded ink projected onto a same-clock registered glyph mask; background comparisons exclude union glyph tiles. Non-primary decoration may remain in background. No object recognition.'};
};
Q.regionalDistance=(a,b)=>{
 if(a?.status!=='MEASURED'||b?.status!=='MEASURED')return null;
 let best=Infinity;
 // Compensate small translation/zoom and luma offset/gain; do not reward colour changes as structure.
 for(const zoom of [.9,1,1.1])for(const dx of [-1,0,1])for(const dy of [-1,0,1]){
  const left=[],right=[];
  for(let y=0;y<8;y++)for(let x=0;x<18;x++){const bx=Math.round((x-8.5)*zoom+8.5+dx),by=Math.round((y-3.5)*zoom+3.5+dy),i=y*18+x,j=by*18+bx;if(bx<0||bx>=18||by<0||by>=8||!a.background.valid[i]||!b.background.valid[j])continue;left.push(a.background.values[i]);right.push(b.background.values[j]);}
  if(left.length>=36)best=Math.min(best,difference(normalize(left),normalize(right))/2);
 }
 return F(best)?C(best):null;
};
Q.measureDecodedCreative=(frames,p,range,w,h)=>{
 const actual=frames.map(f=>({...f,time:f.actualTime??f.decodedTimestamp??f.time})).filter(f=>F(f.time)&&f.features?.luma?.length===w*h).sort((a,b)=>a.time-b.time);
 const knownClock=actual.length>1&&actual.every(f=>f.clock==='DECODED_TIMESTAMP'),steps=[];
 for(let i=1;i<actual.length;i++){
  const a=actual[i-1],b=actual[i],dt=b.time-a.time;if(dt<=0)continue;
  const ga=grid(a.features.luma,w,h),gb=grid(b.features.luma,w,h),energy=difference(normalize(ga.values),normalize(gb.values))/dt,brightness=mean(b.features.luma)-mean(a.features.luma);
  steps.push({time:b.time,dt,energy,brightness});
 }
 const energies=steps.map(s=>s.energy),spread=energies.length?(quantile(energies,.9)-quantile(energies,.1))/Math.max(.01,mean(energies)):null;
 const flashes=steps.filter((s,i)=>i>0&&Math.abs(s.brightness)>.25&&Math.abs(steps[i-1].brightness)>.25&&Math.sign(s.brightness)!==Math.sign(steps[i-1].brightness));
 const bands=energies.map(e=>e<.02?'still':e<(quantile(energies,.5)||0)?'low':'high'),changes=bands.reduce((n,b,i)=>n+Number(i>0&&b!==bands[i-1]),0);
 const index=knownClock&&steps.length>=6?C((spread??0)/2)*Math.min(1,changes/3)*(1-flashes.length/Math.max(1,steps.length)):null;
 const stillRuns=[];let run=null;
 for(let i=0;i<steps.length;i++){const s=steps[i];if(bands[i]==='still'){run??={from:s.time-s.dt,to:s.time};run.to=s.time;}else if(run){stillRuns.push(run);run=null;}}if(run)stillRuns.push(run);
 const pauses=stillRuns.map(s=>({...s,intentional:(p.cuts||[]).some(c=>s.from>=c.start&&s.to<=c.end&&(c.grammar?.intentionalHold||c.cinemaV5Direction?.quietIntent)),intentSource:'plan intention; observation only proves physical stillness'}));
 const out={clockStatus:knownClock?'DECODED_TIMESTAMP':'UNVERIFIED_CLOCK',temporalContrast:evidence(index,'decoded normalized regional-energy distribution; repeated modulation, brightness-flash penalty',knownClock?steps.length:0,{distribution:{q10:quantile(energies,.1),q50:quantile(energies,.5),q90:quantile(energies,.9)},modulationChanges:changes,flashCount:flashes.length,stillRuns:pauses}),steps,regionalNovelty:evidence(null,'union-mask excluded stabilized background structure',0),motionRealization:evidence(null,'tracked actual glyph ink geometry vs explicit operator',0),musicSync:evidence(null,'one-to-one musical/visual event matching',0)};
 const visual=[];
 for(let i=1;i<steps.length-1;i++)if(steps[i].energy>steps[i-1].energy&&steps[i].energy>=steps[i+1].energy&&steps[i].energy>.02)visual.push({time:steps[i].time,strength:steps[i].energy});
 const categories={lyricOnset:(p.lines||[]).map(l=>({time:l.start,confidence:1})),beat:(p.beatHierarchy||[]).map(b=>({time:b.time,confidence:b.confidence??p.cinemaV5MusicalEvidence?.tempo?.confidence??0})),accent:(Array.isArray(p.musicalTargets7)?p.musicalTargets7:[]).filter(t=>F(t.time)).map(t=>({time:t.time,confidence:t.confidence??0}))};
 categories.strongBeat=(p.beatHierarchy||[]).filter(b=>b.strong===true||b.level==='bar'||b.salience>=.8||b.beatSalience>=.8||b.strength==='strong'||b.strength==='downbeat').map(b=>({time:b.time,confidence:b.confidence??p.cinemaV5MusicalEvidence?.tempo?.confidence??0}));
 out.musicEvents={};
 for(const [category,events]of Object.entries(categories)){
  const valid=events.filter(e=>F(e.time)&&e.confidence>=.35),used=new Set(),errors=[];const tolerance=Math.max(1/(p.fps||24),steps.length?Math.max(...steps.map(s=>s.dt)):.1);
  for(const e of valid){let best=-1,distance=Infinity;visual.forEach((v,i)=>{const d=Math.abs(v.time-e.time);if(!used.has(i)&&d<distance){best=i;distance=d;}});if(best>=0&&distance<=tolerance){used.add(best);errors.push(distance);}}
  out.musicEvents[category]={status:knownClock&&valid.length?'MEASURED':'UNMEASURED',precision:knownClock&&visual.length&&valid.length?errors.length/visual.length:null,recall:knownClock&&valid.length?errors.length/valid.length:null,errorSeconds:errors,confidence:valid.length?Math.min(...valid.map(e=>e.confidence)):0,toleranceSeconds:tolerance,targetCount:valid.length,visualPeakCount:visual.length,method:'one-to-one frame-energy peak matching; lyric onset matching is not beat/accent or sung-syllable synchronization'};
 }
 const beat=out.musicEvents.beat;if(beat.status==='MEASURED'&&beat.precision!==null&&beat.recall!==null)out.musicSync=evidence(beat.precision+beat.recall?2*beat.precision*beat.recall/(beat.precision+beat.recall):0,'actual frame peak vs confidence-qualified beat precision/recall F1',beat.targetCount,{confidence:Math.min(.7,beat.confidence),categories:out.musicEvents});
 out.syllableSync={status:'UNMEASURED',reason:'No measured vocal/syllable onsets'};return out;
};
const measure=J.measureDecodedCinemaFrames;
J.measureDecodedCinemaFrames=(frames,p,range,w=96,h=Math.round(w*p.H/p.W))=>{const d=measure(frames,p,range,w,h);if(d?.completed)d.cinemaV5=Q.measureDecodedCreative(frames,p,range,w,h);return d;};
const apply=J.applyDecodedCinemaEvidence;
J.applyDecodedCinemaEvidence=d=>{
 apply(d);const q=d?.cinemaV5;if(!q)return d;
 const phrases=d.layerPresence?.primaryText?.samples||[],regions=phrases.map(s=>({line:s.line,regions:(s.samples||[]).map(x=>x.regions).filter(r=>r?.status==='MEASURED')})),novel=[];let history=[];
 for(const row of regions){const current=row.regions[Math.floor(row.regions.length/2)];if(!current)continue;const distances=history.map(prior=>Q.regionalDistance(current,prior)).filter(F);if(distances.length)novel.push(Math.min(...distances));history=[...history,current].slice(-16);}
 q.regionalNovelty=evidence(novel.length?mean(novel):null,'decoded background structure excluding union primary glyph tiles; minimized over small translation/zoom and existing compositions',novel.length,{affectedLineIds:regions.map(r=>r.line),limits:'Non-primary decoration is not separately segmented; subject and decoration novelty remain UNMEASURED.'});
 const motion=[];
 for(const phrase of phrases){const samples=(phrase.samples||[]).filter(s=>s.regions?.status==='MEASURED'),contract=phrase.motionContract;if(samples.length<3||!contract){motion.push({line:phrase.line,status:'UNMEASURED',reason:'No explicit supported operator or sufficient actual ink samples'});continue;}
  const first=samples[0].regions.foreground,last=samples.at(-1).regions.foreground;let value=null;
  if(contract.type==='expand'&&first.area>0)value=C((last.area/first.area-1)/.2);
  if(contract.type==='reveal'&&first.mass>0)value=C((last.mass/first.mass-1)/.2);
  // Spread alone cannot prove convergence of independently identified elements.
  if(contract.type==='settle'&&samples.length>=5){const velocity=samples.slice(1).map((s,i)=>{const a=samples[i].regions.foreground.centroid,b=s.regions.foreground.centroid;return a&&b?Math.hypot(a[0]-b[0],a[1]-b[1])/Math.max(.001,s.time-samples[i].time):null;}).filter(F);if(velocity.length>=4&&velocity[0]>.001)value=C(1-mean(velocity.slice(-2))/mean(velocity.slice(0,2)));}
  if(contract.type==='impact'&&F(contract.time)){const changes=samples.slice(1).map((s,i)=>({time:s.time,energy:Math.abs(s.regions.foreground.mass-samples[i].regions.foreground.mass)/Math.max(1,samples[i].regions.foreground.mass)})),nearby=changes.filter(s=>Math.abs(s.time-contract.time)<=Math.max(.1,2/(contract.fps||24)));if(nearby.length&&changes.some(s=>s.energy>.02))value=C(Math.max(...nearby.map(s=>s.energy))/Math.max(...changes.map(s=>s.energy)));}
  motion.push({line:phrase.line,...evidence(q.clockStatus==='DECODED_TIMESTAMP'?value:null,'actual registered foreground ink '+contract.type,samples.length),contract});
 }
 const measured=motion.filter(m=>m.status==='MEASURED');q.motionObservations=motion;q.motionRealization=evidence(measured.length?mean(measured.map(m=>m.value)):null,'supported operator realized in same-clock decoded foreground ink; unsupported converge/element tracking stays unmeasured',measured.length,{measurableIntentCount:measured.length,totalIntentCount:motion.length,coverage:motion.length?measured.length/motion.length:null});
 return d;
};
Q.audioSignalCorrelation=(source,observed,from,to,sourceRate,decodedRate)=>{
 const n=Math.min(2000,to-from,observed.length),indices=Int32Array.from({length:n},(_,j)=>Math.floor((j+(j*.6180339887498949+.37)%1)*(to-from)/n));let best=-1,bestLag=null;
 // Deterministic nonuniform positions within the same2000 strata avoid
 // exact frequency aliases of the former regular sampling grid.
 // Every integer lag in the ORIGINAL±2048 bound. A32-sample coarse grid can
 // miss valid AAC delay and reject an otherwise identical high-frequency mix.
 for(let lag=-2048;lag<=2048;lag++){
  let xy=0,xx=0,yy=0,count=0;
  for(let j=0;j<n;j++){const i=indices[j],k=Math.round(i*decodedRate/sourceRate)+lag;if(k<0||k>=observed.length)continue;const x=source[from+i],y=observed[k];xy+=x*y;xx+=x*x;yy+=y*y;count++;}
  if(count>=n*.8&&xx>0&&yy>0){const value=xy/Math.sqrt(xx*yy);if(value>best){best=value;bestLag=lag;}}
 }
 return {correlation:best,lagSamples:bestLag,sampleCount:n,lagStepSamples:1,delaySearchSamples:2048};
};
Q.auditDecodedAudio=async(blob,audio,range,signal)=>{
 if(!audio?.buffer)return {status:'NOT_APPLICABLE',value:null,confidence:0,sampleCount:0,reason:'No source audio'};
 const Audio=window.OfflineAudioContext||window.webkitOfflineAudioContext;
 if(!Audio)return {status:'UNMEASURED',value:null,confidence:0,sampleCount:0,reason:'AAC audio decoder unavailable'};
 const context=new Audio(1,1,audio.buffer.sampleRate),start=range?.start??0,end=range?.end??audio.duration??audio.buffer.duration;
 try{
  const decoded=await J.waitExportStep(async()=>context.decodeAudioData(await blob.arrayBuffer()),{signal,timeout:30000,label:'完成MP4の音声検査'}).catch(async e=>{throw e;});
  const source=audio.buffer.getChannelData(0),observed=decoded.getChannelData(0),sourceFrom=Math.floor(start*audio.buffer.sampleRate),sourceTo=Math.min(source.length,Math.ceil(end*audio.buffer.sampleRate));
  const energy=(values,from,to)=>{let sum=0;for(let i=from;i<to;i++)sum+=values[i]*values[i];return sum/Math.max(1,to-from);};
  const expected=energy(source,sourceFrom,sourceTo),actual=energy(observed,0,observed.length),durationError=Math.abs(decoded.duration-(end-start));
  // Sample source and AAC signal with a bounded encoder-delay search. No claim of perceptual identity.
  const aligned=expected>=1e-8?Q.audioSignalCorrelation(source,observed,sourceFrom,sourceTo,audio.buffer.sampleRate,decoded.sampleRate):null,correlation=aligned?.correlation??null;
  const passed=durationError<=2048/decoded.sampleRate+.05&&(expected<1e-8?actual<1e-6:actual>expected*.01&&correlation>=.6);
  return {status:passed?'MEASURED':'FAILED',value:passed?100:null,confidence:passed?.8:0,sampleCount:observed.length,method:'decoded AAC duration, source/decoded energy and bounded AAC-delay signal correlation guard',sourceEnergy:expected,decodedEnergy:actual,signalCorrelation:correlation,selectedLagSamples:aligned?.lagSamples??null,lagStepSamples:1,correlationSamplePattern:'DETERMINISTIC_STRATIFIED_GOLDEN_FRACTION',correlationSampleLimit:2000,delaySearchSamples:2048,durationErrorSeconds:durationError,limits:'Signal preservation guard, not perceptual identity or syllable synchronization'};
 }catch(e){if(signal?.aborted)throw e;return {status:'UNMEASURED',value:null,confidence:0,sampleCount:0,reason:String(e.message)};}
};
// A phrase may have several manual/legacy units. Only its first unit owns the LRC onset.
Q.lyricTimingInvariant=(p,cuts)=>{
 const tolerance=1/(p.fps||24),lines=new Set(cuts.map(c=>c.line));
 if(cuts.some(c=>!F(c.start)||!F(c.end)||c.end<=c.start))return false;
 for(const id of lines){const line=p.lines?.[id],units=(p.cuts||cuts).filter(c=>c.line===id);
  if(!line||!F(line.start)||!units.length||units.some(c=>!F(c.start)||c.start<line.start-tolerance))return false;
  if(Math.abs(Math.min(...units.map(c=>c.start))-line.start)>tolerance)return false;
 }
 return true;
};
// Each internal lyric unit needs its own visible actual-time samples. A shared line ID
// cannot certify later units using observations from the first unit of the phrase.
Q.decodedLyricCoverage=(cuts,primary)=>cuts.length>0&&cuts.every(c=>primary.some(s=>s.line===c.line&&s.samples?.length&&s.visibleSamples===s.samples.length&&s.samples.every(x=>{const t=x.actualTime;return F(t)&&t>=c.start&&t<c.end;})));
const final=V.finalEvaluation;
V.finalEvaluation=async(result,p,args,session)=>{
 const r=await final(result,p,args,session),base={outputProfile:V.outputProfile(p,args.range),profileId:r.profile.profileId,planHash:r.evaluation.planHash,inputHash:session.input.inputHash,rendererVersion:V.version,source:'ENCODED_MP4'},d=p.lastPixelQA?.metrics?.decodedCinema,q=d?.cinemaV5;
 const add=(id,value,meta)=>{r.evaluation.measurements=r.evaluation.measurements.filter(m=>m.id!==id);r.evaluation.measurements.push(V.metric(id,value,{...base,...meta}));};
 for(const [id,key]of Object.entries({temporalContrastV2:'temporalContrast',regionalNoveltyV2:'regionalNovelty',motionRealizationV2:'motionRealization',musicFitV2:'musicSync'})){const m=q?.[key];add(id,m?.value??null,{...(m||{}),unit:'index/1',method:m?.method||'decoded V5 observation unavailable',sampleCount:m?.sampleCount||0,confidence:m?.confidence??0});}
 const primary=d?.layerPresence?.primaryText?.samples||[],cuts=(p.cuts||[]).filter(c=>c.line>=0&&c.start<(args.range?.end??p.duration)&&c.end>(args.range?.start??0)),covered=Q.decodedLyricCoverage(cuts,primary),original=cuts.every(c=>String(c.lineText??c.text??'')===String(p.lines?.[c.line]?.text??c.lineText??c.text??''));
 add('lyricIntegrity',covered&&original?100:null,{status:!original?'FAILED':covered?'MEASURED':'UNMEASURED',sampleCount:covered?primary.length:0,method:'input snapshot + original plan strings + decoded registered primary presence; not OCR'});r.profile.requiredMetrics.push('lyricIntegrity');
 const timing=Q.lyricTimingInvariant(p,cuts),clock=q?.clockStatus==='DECODED_TIMESTAMP';add('lyricTiming',timing&&clock&&covered?100:null,{status:!timing?'FAILED':clock&&covered?'MEASURED':'UNMEASURED',sampleCount:clock&&covered?primary.length:0,method:'original phrase onset / valid internal unit times + decoded clock/presence coverage; not sung-syllable synchronization'});r.profile.requiredMetrics.push('lyricTiming');
 const audit=await Q.auditDecodedAudio(result.blob,args.audio,args.range,args.signal);if(audit.status!=='NOT_APPLICABLE'){add('audioIntegrity',audit.value,{...audit,method:audit.method||'decoded AAC unavailable'});r.profile.requiredMetrics.push('audioIntegrity');}
 r.evaluation.creativePhysicalEvidence=q||{status:'UNMEASURED'};r.evaluation.audioEvidence=audit;r.evaluation.humanStatus=Q.humanStatus;return r;
};
})();
