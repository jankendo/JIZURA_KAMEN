/* Song-Native Director v1. Local analysis, explicit search, immutable observation. */
(()=>{
'use strict';
const J=window.J,C=J.clamp,finite=Number.isFinite;
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const norm=t=>String(t||'').normalize('NFC').replace(/\s/gu,'');
const locked=(p,c)=>!c||c.locked||J.photoChoreographyLocked?.(p,c);
const abort=signal=>{if(signal?.aborted)throw new DOMException('Aborted','AbortError');};
const copy=x=>J.clonePhotoRenderPlan(x);
const fingerprint=value=>{const s=J.canonicalJSON(value);let h=2166136261;for(let i=0;i<s.length;i++)h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;return s.length+':'+h;};
const inputIdentity=(project,audio)=>fingerprint({audio:J.registrySelectionAudioKey(audio),envelope:Array.from(audio?.energy||[]),onset:Array.from(audio?.onset||[]),rms:Array.from(audio?.rms||[]),energyRate:audio?.energyRate,lyrics:project.lyrics,timing:project.timing,image:J.registrySelectionBackgroundKey(project),imageAnalysis:project.autoPalette?.stats,imageAnalyzed:project.autoPalette?.analyzed,palette:project.autoPalette?.palette,assets:project.visualAssets,fonts:project.fonts,style:project.style,mood:project.mood,fx:project.fx,overrides:project.overrides,director:project.directorPlan,output:{aspect:project.aspect,res:project.res,fps:project.fps,settings:project.exportSettings}});

J.buildSongNativeDirection=(project,audio)=>{
 const parsed=J.parseLyrics(project.lyrics),timing=J.computeTiming(project,parsed,audio),duration=timing.duration;
 const groups=new Map(),lines=parsed.lines.map((l,i)=>{
  const text=norm(l.text),prior=groups.get(text)||[],start=timing.starts[i],end=timing.ends[i];groups.set(text,[...prior,i]);
  return {line:i,start,end,length:J.graphemes(l.text).length,density:J.graphemes(l.text).length/Math.max(.1,end-start),repetition:prior.length,previous:prior.at(-1)??null,terminal:/[。！？!?…]$/.test(l.text.trim()),emphasisCount:l.emph?.length||0,semanticStatus:'UNKNOWN',keywordHint:J.lyricCinemaMeaning?.(l.text)||'read'};
 });
 const f=audio?.features||{},energy=Array.from(audio?.energy||[]),rate=audio?.energyRate||energy.length/Math.max(1,audio?.duration||duration);
 const raw=(f.detailedTimeline?.length?f.detailedTimeline:f.timeline)||[];
 const timeline=energy.length?energy.map((e,i)=>({time:i/rate,energy:C(e),onset:finite(audio.onset?.[i])?C(audio.onset[i]):null,rms:finite(audio.rms?.[i])?audio.rms[i]:null})):raw.filter(s=>finite(s.time)&&finite(s.energy)).map(s=>({...s,energy:C(s.energy)}));
 const measured=audio?.analysisSource?.status==='MEASURED'&&audio?.analysisSource?.method==='PCM_AUDIO_FEATURES_V1';
 const status=timeline.length?(measured?'MEASURED':'PROVIDED'):'UNMEASURED';
 const lengths=lines.map(l=>l.end-l.start).filter(v=>v>0).sort((a,b)=>a-b),phrase=lengths.length?lengths[Math.floor(lengths.length/2)]:4;
 const gap=Math.max(.8,Math.min(6,phrase)),bounds=new Set([0,duration]);
 // Keep real section boundaries; supplement missing coarse structure with phrase-scale
 // envelope changes, rests, lyric gaps and returning phrases. No seed decides a boundary.
 for(const s of f.sections||[])if(s&&typeof s==='object')for(const t of [s.from??s.start,s.to??s.end])if(finite(t)&&t>0&&t<duration)bounds.add(t);
 const envelope=[];for(let from=0;from<duration;from+=gap){const samples=timeline.filter(s=>s.time>=from&&s.time<from+gap),e=mean(samples.map(s=>s.energy));envelope.push({time:from,energy:e,rest:samples.length>0&&samples.every(s=>s.rms!==null&&finite(s.rms)&&s.rms<.001)});}
 for(let i=1;i<envelope.length;i++){const a=envelope[i-1],b=envelope[i],next=envelope[i+1];if(finite(a.energy)&&finite(b.energy)&&(Math.abs(b.energy-a.energy)>.12||b.rest!==a.rest||next&&b.energy>a.energy&&b.energy>=next.energy))bounds.add(b.time);}
 for(const l of lines){const prior=lines[l.line-1];if(prior&&(l.start-prior.end>gap*.5||l.repetition&&l.previous!==l.line-1))bounds.add(l.start);}
 // When no acoustic changes are known, exact LRC phrase boundaries still give a
 // deterministic structural plan; the missing acoustic measurements stay missing.
 if(bounds.size===2)for(const l of lines)bounds.add(l.start);
 const times=[...bounds].filter(t=>finite(t)&&t>=0&&t<=duration).sort((a,b)=>a-b).filter((t,i,a)=>i===0||t===duration||t-a[i-1]>=.1);
 const image=project.autoPalette?.stats||{},imageMeasured=project.autoPalette?.analyzed===true;
 const detail=C(image.edgeDensity??image.detail??.5),space=C(image.negativeSpace??.5),contrast=C(image.contrast??.5);
 const sections=times.slice(0,-1).map((start,i)=>{
  const end=times[i+1],samples=timeline.filter(s=>s.time>=start&&s.time<end),e=mean(samples.map(s=>s.energy)),prior=timeline.filter(s=>s.time>=Math.max(0,start-gap)&&s.time<start),delta=e===null?null:e-(mean(prior.map(s=>s.energy))??e);
  const onsets=mean(samples.map(s=>s.onset).filter(finite)),spectra=raw.filter(s=>s.time>=start&&s.time<end),flux=mean(spectra.map(s=>s.spectralFlux).filter(finite));
  const lyrics=lines.filter(l=>l.start<end&&l.end>start),density=C((mean(lyrics.map(l=>l.density))||0)/12),repeat=C((mean(lyrics.map(l=>l.repetition))||0)/3);
  const rest=samples.length>0&&samples.every(s=>finite(s.rms)&&s.rms<.001),level=e??C(f.energy??.35),change=C(Math.abs(delta??0)*2+(flux??0)*.25),quiet=rest||e!==null&&level<.2;
  const rhythm=C((onsets??f.onsetDensity??.3)*.65+(f.beatStrength??.3)*.35),motion=quiet?.04:C(.08+level*.48+rhythm*.16+change*.18-density*.12);
  return {start,end,measuredEnergy:e,energyStatus:status,onset:onsets,spectralFlux:flux,energyChange:delta,lyricDensity:density,repetition:repeat,rest,quietIntent:quiet,motionIntensity:motion,visualDensity:quiet?.08:C(.1+level*.4+change*.2-detail*.15-density*.15),cameraTravel:quiet?.025:C(.05+motion*.65+change*.15),negativeSpace:C(.35+space*.25+density*.25-level*.15),typographyScale:C(.35+level*.3+repeat*.1-density*.18),contrastIntent:C(.45+(1-contrast)*.25+detail*.15),transitionIntensity:quiet?.03:C(change*.6+rhythm*.15),entryDuration:Math.min(.16,Math.max(.06,.16-rhythm*.08)),emphasis:quiet?'quiet':change>.4?'change':repeat>.3?'return':'sustain'};
 });
 const known=sections.filter(s=>s.measuredEnergy!==null&&!s.rest),peak=known.reduce((best,s)=>!best||s.measuredEnergy>best.measuredEnergy?s:best,null);
 return {version:1,sourceIdentity:inputIdentity(project,audio),duration,sections,lyrics:lines,climax:peak?.start??null,commonLanguage:{palette:copy(project.autoPalette?.palette||null),font:project.fonts?.display||null,motion:'continuous phrase travel and complete readable lyric',imageStatus:imageMeasured?'MEASURED':'UNMEASURED'},evidence:{energy:status,sections:timeline.length?'INFERRED':'LRC_STRUCTURE_ONLY',semantics:'UNKNOWN',image:imageMeasured?'MEASURED':'UNMEASURED'},limitations:'Heuristic structure and exact lyric repetition; keyword hints are not semantic understanding. No artistic quality claim.'};
};
J.validSongNativeDirection=d=>d?.version===1&&typeof d.sourceIdentity==='string'&&finite(d.duration)&&d.duration>0&&Array.isArray(d.sections)&&d.sections.length>0&&d.sections.every((s,i)=>finite(s.start)&&finite(s.end)&&s.start>=0&&s.end>s.start&&s.end<=d.duration&&(!i||s.start===d.sections[i-1].end)&&['motionIntensity','visualDensity','cameraTravel','negativeSpace','typographyScale','contrastIntent','transitionIntensity'].every(k=>finite(s[k])&&s[k]>=0&&s[k]<=1))&&d.sections[0].start===0&&d.sections.at(-1).end===d.duration;
J.songNativeSectionAt=(p,t)=>p.songNativeDirection?.sections?.find(s=>t>=s.start&&t<s.end)||null;
J.applySongNativeDirection=p=>{
 const d=p.songNativeDirection;if(d?.version!==1)return p;
 for(const c of p.cuts||[]){if(c.line<0||locked(p,c))continue;const s=J.songNativeSectionAt(p,c.start);if(!s)continue;
  c.songNative={sectionStart:s.start,motionIntensity:s.motionIntensity,visualDensity:s.visualDensity,typographyScale:s.typographyScale,quietIntent:s.quietIntent};
  if(c.grammar){const g=c.grammar;g.motion=s.motionIntensity;g.quiet=s.quietIntent;g.intentionalHold=s.quietIntent;g.layerStrength=s.visualDensity;g.directionPolicy={...g.directionPolicy,motionBudget:s.motionIntensity,attentionBudget:s.visualDensity,quietIntent:s.quietIntent};
   if(g.temporal)g.temporal={...g.temporal,level:s.motionIntensity,climax:d.climax!==null&&s.start===d.climax,entry:s.entryDuration,source:'Song-Native measured envelope, onset, lyric density and repetition',motionPrinciple:s.quietIntent?'weighted-hold':'stable-travel'};
  }
 }
 const cinema=p.musicalPhoto?.cinema;if(cinema){cinema.climax=d.climax;if(cinema.grammar)cinema.grammar.shots=p.cuts.filter(c=>c.grammar).map(c=>({line:c.line,from:c.start,to:c.end,...copy(c.grammar)}));}
 for(const s of p.storyboard||[]){const c=p.cuts.find(c=>c.start===s.from);if(c?.grammar&&!s.locked&&!locked(p,c))s.shotGrammar=copy(c.grammar);}
 return p;
};
const propose=J.proposeDirection;J.proposeDirection=(...args)=>({...propose(...args),songNativeDirector:1});
const direction=J.makeArtDirection;J.makeArtDirection=(project,audio,proposal)=>{
 const d=direction(project,audio,proposal);if(proposal.songNativeDirector===1||project.artDirection?.songNativeDirection?.version===1){const input={...project,style:d.style,mood:d.mood,fonts:d.typography,fx:proposal.fx||project.fx,overrides:proposal.overrides||project.overrides};d.songNativeDirection=J.buildSongNativeDirection(input,audio);}return d;
};
const plan=J.plan;J.plan=(project,audio)=>{
 const p=plan(project,audio),saved=project.artDirection?.songNativeDirection;
 if(saved?.version!==1||!p.artDirection||p.directorSections7?.length)return p;
 // Recompute stale input; never edit the saved project from this pure planner.
 p.songNativeDirection=J.validSongNativeDirection(saved)&&saved.sourceIdentity===inputIdentity(project,audio)?copy(saved):J.buildSongNativeDirection(project,audio);
 p.artDirection={...p.artDirection,songNativeDirection:p.songNativeDirection};return J.applySongNativeDirection(p);
};
const architecture=J.applyCinemaArchitecture;J.applyCinemaArchitecture=(p,...args)=>{const r=architecture(p,...args);J.applySongNativeDirection(p);return r;};
// Runtime adapters also sample at render time, so a long cut can cross a section.
const temporal=J.cinemaTemporalState;J.cinemaTemporalState=(p,c,t)=>{const state=temporal(p,c,t),s=J.songNativeSectionAt(p,t);return !state||!s||locked(p,c)?state:{...state,level:C(s.motionIntensity+(c.songNativeRepair?.motionDelta||0)),climax:p.songNativeDirection.climax===s.start,entry:state.entry*(s.quietIntent?0:1)};};
const focus=J.temporalCinemaFocus;J.temporalCinemaFocus=(p,c,f,t)=>{
 const s=J.songNativeSectionAt(p,t);if(!s||locked(p,c))return focus(p,c,f,t);
 const u=C((t-s.start)/Math.max(.1,s.end-s.start)),v=u*u*(3-2*u),q={...f},space=p.autoPalette?.stats||{};
 q.zoom=Math.max(1,Math.min(2.8,1+((f.zoom??1)-1)*(.25+s.visualDensity*.65)+s.cameraTravel*.1*v));q.push=0;
 q.x=C((f.x??.5)+((space.spaceRight??.5)-(space.spaceLeft??.5))*s.cameraTravel*.035*v,.05,.95);return q;
};
const camera=J.cameraAt;J.cameraAt=(p,t,range)=>{
 const s=J.songNativeSectionAt(p,t),c=J.cutAt(p,t);if(!s||locked(p,c)||c?.grammar)return camera(p,t,range);
 const u=C((t-s.start)/Math.max(.1,s.end-s.start));return {s:1.025+s.cameraTravel*.08*u,x:0,y:0,rot:0};
};
const main=J.mainDraw;J.mainDraw=(env,it)=>{
 const s=J.songNativeSectionAt(env.plan,env.t),c=env.cut;
 if(s&&c?.line>=0&&!locked(env.plan,c)&&norm(it.text)===norm(c.lineText??c.text)&&finite(it.size))it.size*=.82+.18*s.typographyScale;
 return main(env,it);
};

// The captured chain contains every existing glyph/contrast/onset observer.
// It runs on private data; renderer caches and lastPixelQA never touch the caller.
const analyze=J.analyzeRenderedFrames;
J.observeMVQuality=async(p,range,audio,telemetry={})=>{
 abort(telemetry.signal);const working=copy(p);
 const planHash=await J.cinemaV3.planHash(p);
 const result=await analyze(working,range,audio,{...telemetry,observationOnly:true});abort(telemetry.signal);
 if(await J.cinemaV3.planHash(p)!==planHash)throw Error('INPUT_CHANGED_DURING_OBSERVATION');
 result.observationBinding={planHash,rangeKey:J.canonicalJSON(range??null)};
 return result;
};
// Keep compatibility for callers that expect lastPixelQA, but never search here.
J.analyzeRenderedFrames=async(p,range,audio,telemetry={})=>{
 const r=await J.observeMVQuality(p,range,audio,telemetry);if(r.completed)p.lastPixelQA=r;return r;
};
J.searchSongNativeCandidates=async(p,range,audio,telemetry={})=>{
 abort(telemetry.signal);const originalHash=await J.cinemaV3.planHash(p),locks=J.cinemaV3.lockSignature(p),working=J.cinemaV3.clone(p);
 const inputHash=await J.cinemaV3.searchInputHash(working,range,audio);
 await J.repairCinemaSequence(working,range,{...telemetry,cinemaInputHash:inputHash});abort(telemetry.signal);
 if(await J.cinemaV3.planHash(p)!==originalHash)throw Error('INPUT_CHANGED_DURING_SEARCH');
 if(J.cinemaV3.lockSignature(working)!==locks)throw Error('LOCK_CHANGED_DURING_SEARCH');
 J.cinemaV3.restorePlan(p,working);J.cinemaV3.invalidate(p);return p;
};
// Bounded explicit repair: one observed weak phrase at a time, no architecture search.
J.repairWeakSections=async(p,evaluation,range,audio,telemetry={})=>{
 abort(telemetry.signal);const before=evaluation?.metrics?.cinemaFeedback;
 if(evaluation?.observationBinding?.planHash!==await J.cinemaV3.planHash(p)||evaluation?.observationBinding?.rangeKey!==J.canonicalJSON(range??null))return {accepted:false,status:'STALE_OBSERVATION',changedLines:[]};
 if(!evaluation?.completed||!before?.samples?.length)return {accepted:false,status:'UNMEASURED',changedLines:[]};
 const lines=before.samples.filter(s=>s.safe&&(s.stagnant||s.energyGap>0)).map(s=>s.line),trial=copy(p),changed=[];
 for(const c of trial.cuts||[]){if(!lines.includes(c.line)||locked(trial,c)||!c.grammar||c.grammar.intentionalHold)continue;
  c.songNativeRepair={motionDelta:C((c.songNativeRepair?.motionDelta||0)+.08,0,.24)};c.grammar.motion=C((c.grammar.motion??.3)+.08);if(c.grammar.temporal)c.grammar.temporal.level=C(c.grammar.temporal.level+.08);changed.push(c.line);
 }
 if(!changed.length)return {accepted:false,status:'NO_REPAIRABLE_LINES',changedLines:[]};
 const after=await J.measureCinemaSequence(trial,range,{signal:telemetry.signal});abort(telemetry.signal);
 if(!finite(after.rank)||after.rank<=before.rank||after.samples.some(s=>!s.safe))return {accepted:false,status:'KEPT_OBSERVED_PLAN',changedLines:[]};
 // The same native raster contrast guards used by composition promotion protect
 // the proposed motion change. Missing evidence cannot admit a repair.
 const prior=await J.measureCinemaOutputReadability(copy(p),range,telemetry.signal,{physicalOnly:true,backgroundConsistency:true});
 const next=await J.measureCinemaOutputReadability(trial,range,telemetry.signal,{physicalOnly:true,backgroundConsistency:true,inputHash:prior.cacheIdentity?.inputHash});
 abort(telemetry.signal);if(!J.cinemaV3.physicalReadabilityDominates(next,prior))return {accepted:false,status:'KEPT_NATIVE_READABILITY',changedLines:[]};
 if(await J.cinemaV3.planHash(p)!==evaluation.observationBinding.planHash)throw Error('INPUT_CHANGED_DURING_REPAIR');
 for(const c of p.cuts)if(changed.includes(c.line)&&!locked(p,c)){const other=trial.cuts.find(x=>x.line===c.line&&x.start===c.start);c.grammar=copy(other.grammar);c.songNativeRepair=copy(other.songNativeRepair);}
 const cinema=p.musicalPhoto?.cinema;if(cinema?.grammar)cinema.grammar.shots=p.cuts.filter(c=>c.grammar).map(c=>({line:c.line,from:c.start,to:c.end,...copy(c.grammar)}));
 for(const shot of p.storyboard||[]){const c=p.cuts.find(c=>c.start===shot.from&&changed.includes(c.line));if(c?.grammar&&!shot.locked&&!locked(p,c))shot.shotGrammar=copy(c.grammar);}
 J.cinemaV3.invalidate(p); // no timing/beat rebuild for a motion-only repair; observe again.
 return {accepted:true,status:'REQUIRES_REOBSERVATION',changedLines:changed};
};
})();
