/* Song-Native Director v3. Local analysis, explicit search, immutable observation. */
(()=>{
'use strict';
const J=window.J,C=J.clamp,finite=Number.isFinite;
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const norm=t=>String(t||'').normalize('NFC').replace(/\s/gu,'');
const locked=(p,c)=>!c||p.songNativeManualPlan||c.locked||J.photoChoreographyLocked?.(p,c);
const abort=signal=>{if(signal?.aborted)throw new DOMException('Aborted','AbortError');};
const copy=x=>J.clonePhotoRenderPlan(x);
const fingerprint=value=>{const s=J.canonicalJSON(value);let h=2166136261,g=3339675911;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;g=Math.imul(g^s.charCodeAt(i),2246822519)>>>0;}return s.length+':'+h+':'+g;};
const legacyInputIdentity=(project,audio)=>fingerprint({audio:J.registrySelectionAudioKey(audio),envelope:Array.from(audio?.energy||[]),onset:Array.from(audio?.onset||[]),rms:Array.from(audio?.rms||[]),energyRate:audio?.energyRate,analysisSource:audio?.analysisSource,project:{...Object.fromEntries(Object.entries(project).filter(([k])=>!['schemaVersion','migratedFromSchema','audioAsset','renderFeedbackRequested','lastPixelQA','lastQualityTarget','exportValidation'].includes(k))),artDirection:project.artDirection?Object.fromEntries(Object.entries(project.artDirection).filter(([k])=>!['songNativeDirection','songNativeResolved'].includes(k)).map(([k,v])=>[k,k==='registrySelection'&&v?Object.fromEntries(Object.entries(v).filter(([key])=>key!=='storySearch')):v])):null}});
const inputIdentity=(p,a)=>([7,8].includes((p?.songNativeDirection||p?.artDirection?.songNativeDirection)?.version)&&J.songNativeInputIdentityV7)?J.songNativeInputIdentityV7(p,a):legacyInputIdentity(p,a);

const lower=(a,t)=>{let lo=0,hi=a.length;while(lo<hi){const m=(lo+hi)>>>1;if(a[m].time<t)lo=m+1;else hi=m;}return lo;};
const between=(a,start,end)=>a.slice(lower(a,start),lower(a,end));
J.songNativeInputIdentity=inputIdentity;
J.buildSongNativeDirection=(project,audio)=>{
 const parsed=J.parseLyrics(project.lyrics),timing=J.computeTiming(project,parsed,audio),duration=timing.duration;
 const groups=new Map(),lines=parsed.lines.map((l,i)=>{
  const text=norm(l.text),prior=groups.get(text)||[],start=timing.starts[i],end=timing.ends[i];groups.set(text,[...prior,i]);
  return {line:i,start,end,length:J.graphemes(l.text).length,density:J.graphemes(l.text).length/Math.max(.1,end-start),repetition:prior.length,previous:prior.at(-1)??null,terminal:/[。！？!?…]$/.test(l.text.trim()),emphasisCount:l.emph?.length||0,semanticStatus:'UNKNOWN',keywordHint:J.lyricCinemaMeaning?.(l.text)||'read'};
 });
 const f=audio?.features||{},energy=Array.from(audio?.energy||[]),rate=audio?.energyRate||energy.length/Math.max(1,audio?.duration||duration);
 const raw=(f.detailedTimeline?.length?f.detailedTimeline:f.timeline)||[];
 const timeline=energy.length?energy.map((e,i)=>({time:i/rate,energy:C(e),onset:finite(audio.onset?.[i])?C(audio.onset[i]):null,rms:finite(audio.rms?.[i])?audio.rms[i]:null})):raw.filter(s=>finite(s.time)&&finite(s.energy)).map(s=>({...s,energy:C(s.energy)}));
 const coarse=!timeline.length&&(f.sections||[]).length>1&&(f.sections||[]).every(finite);
 if(coarse)f.sections.forEach((e,i)=>timeline.push({time:i*duration/f.sections.length,energy:C(e),onset:null,rms:null}));
 timeline.sort((a,b)=>a.time-b.time);const spectral=raw.filter(s=>finite(s.time)).slice().sort((a,b)=>a.time-b.time);
 const measured=audio?.analysisSource?.status==='MEASURED'&&audio?.analysisSource?.method==='PCM_AUDIO_FEATURES_V1';
 const status=timeline.length?(measured&&!coarse?'MEASURED':'PROVIDED'):'UNMEASURED';
 const lengths=lines.map(l=>l.end-l.start).filter(v=>v>0).sort((a,b)=>a-b),phrase=lengths.length?lengths[Math.floor(lengths.length/2)]:4;
 const gap=Math.max(.8,Math.min(6,phrase)),bounds=new Set([0,duration]);
 if(coarse){timeline.length=0;const step=Math.min(gap,duration/f.sections.length);for(let t=0;t<duration;t+=step)timeline.push({time:t,energy:C(f.sections[Math.min(f.sections.length-1,Math.floor(t/duration*f.sections.length))]),onset:null,rms:null});}
 // Keep real section boundaries; supplement missing coarse structure with phrase-scale
 // envelope changes, rests, lyric gaps and returning phrases. No seed decides a boundary.
 for(const s of f.sections||[])if(s&&typeof s==='object')for(const t of [s.from??s.start,s.to??s.end])if(finite(t)&&t>0&&t<duration)bounds.add(t);
 const envelope=[];for(let from=0;from<duration;from+=gap){const samples=between(timeline,from,from+gap),e=mean(samples.map(s=>s.energy));envelope.push({time:from,onset:mean(samples.map(s=>s.onset).filter(finite)),flux:mean(between(spectral,from,from+gap).map(s=>s.spectralFlux).filter(finite)),energy:e,rest:samples.length>0&&samples.every(s=>s.rms!==null&&finite(s.rms)&&s.rms<.001)});}
 for(let i=1;i<envelope.length;i++){const a=envelope[i-1],b=envelope[i];if(finite(a.energy)&&finite(b.energy)&&(Math.abs(b.energy-a.energy)>.12||b.rest!==a.rest||finite(a.onset)&&finite(b.onset)&&Math.abs(b.onset-a.onset)>.15||finite(a.flux)&&finite(b.flux)&&Math.abs(b.flux-a.flux)>.12))bounds.add(b.time);}
 for(const l of lines){const prior=lines[l.line-1];if(prior&&(l.start-prior.end>gap*.5||l.repetition&&l.previous!==l.line-1))bounds.add(l.start);}
 // When no acoustic changes are known, exact LRC phrase boundaries still give a
 // deterministic structural plan; the missing acoustic measurements stay missing.
 // Phrase boundaries remain lyric evidence, not asserted music sections.
 if(!timeline.length&&bounds.size===2)for(const l of lines)if(l.start>=gap)bounds.add(l.start);
 const times=[...bounds].filter(t=>finite(t)&&t>=0&&t<=duration).sort((a,b)=>a-b).filter((t,i,a)=>i===0||t===duration||t-a[i-1]>=.1);
 const image=project.autoPalette?.stats||{},imageMeasured=project.autoPalette?.analyzed===true;
 const detail=C(image.edgeDensity??image.detail??.5),space=C(image.negativeSpace??.5),contrast=C(image.contrast??.5);
 const sections=times.slice(0,-1).map((start,i)=>{
  const end=times[i+1],samples=between(timeline,start,end),e=mean(samples.map(s=>s.energy)),prior=between(timeline,Math.max(0,start-gap),start),delta=e===null?null:e-(mean(prior.map(s=>s.energy))??e);
  const onsets=mean(samples.map(s=>s.onset).filter(finite)),spectra=between(spectral,start,end),flux=mean(spectra.map(s=>s.spectralFlux).filter(finite));
  const lyrics=lines.filter(l=>l.start<end&&l.end>start),density=C((mean(lyrics.map(l=>l.density))||0)/12),repeat=C((mean(lyrics.map(l=>l.repetition))||0)/3);
  const rest=samples.length>0&&samples.every(s=>finite(s.rms)&&s.rms<.001),level=e??C(f.energy??.35),change=C(Math.abs(delta??0)*2+(flux??0)*.25),quiet=rest||e!==null&&level<.2;
  const rhythm=C((onsets??f.onsetDensity??.3)*.65+(f.beatStrength??.3)*.35),motion=quiet?.04:C(.08+level*.48+rhythm*.16+change*.18-density*.12);
  const intent=quiet?'silence':e===null?'unmeasured':delta>.12?'release':delta<-.12?'afterglow':repeat>.3?'repetition':change>.3?'transition':rhythm>.55?'accumulation':'sustain';
  return {intent,intentStatus:e===null?'UNMEASURED':'INFERRED',start,end,measuredEnergy:e,energyStatus:e===null?'UNMEASURED':status,onset:onsets,spectralFlux:flux,energyChange:delta,lyricDensity:density,repetition:repeat,rest,quietIntent:quiet,motionIntensity:motion,visualDensity:quiet?.08:C(.1+level*.4+change*.2-detail*.15-density*.15),cameraTravel:quiet?.025:C(.05+motion*.65+change*.15),negativeSpace:C(.35+space*.25+density*.25-level*.15),typographyScale:C(.35+level*.3+repeat*.1-density*.18),contrastIntent:C(.45+(1-contrast)*.25+detail*.15),transitionIntensity:quiet?.03:C(change*.6+rhythm*.15),entryDuration:Math.min(.16,Math.max(.06,.16-rhythm*.08)),emphasis:quiet?'quiet':change>.4?'change':repeat>.3?'return':'sustain'};
 });
 const known=sections.filter(s=>s.measuredEnergy!==null&&!s.rest),peak=known.reduce((best,s)=>!best||s.measuredEnergy>best.measuredEnergy?s:best,null);
 // Continuous trajectory derived from evidence, with a shared cumulative memory.
 let accumulated=0;
 for(const section of sections){
  const progress=section.start/Math.max(.1,duration),drive=section.energyChange??0;
  accumulated=C(accumulated+drive*.55+(section.onset??0)*.08-section.lyricDensity*.04);
  section.motif={progress,cohesion:C(.25+accumulated*.45+section.repetition*.3+progress*.18),
   spread:C(section.negativeSpace*.5+(section.spectralFlux??0)*.3+(1-section.repetition)*.15),
   axis:C(.5+drive*.5+(section.repetition-.3)*.2+(space-.5)*.2),
   lift:C(.5-drive*.35+section.lyricDensity*.15-progress*.1),accumulation:accumulated};
 }
 return {version:3,sourceIdentity:inputIdentity(project,audio),duration,sections,lyrics:lines,climax:peak?.start??null,commonLanguage:{palette:copy(project.autoPalette?.palette||null),font:project.fonts?.display||null,motion:'continuous phrase travel and complete readable lyric',imageStatus:imageMeasured?'MEASURED':'UNMEASURED'},evidence:{energy:status,sections:timeline.length?'INFERRED':'LRC_STRUCTURE_ONLY',coarseBlocks:coarse?'PROVIDED_NOT_FORMAL_SECTIONS':'NOT_USED',semantics:'UNKNOWN',image:imageMeasured?'MEASURED':'UNMEASURED'},limitations:'Heuristic structure and exact lyric repetition; keyword hints are not semantic understanding. No artistic quality claim.'};
};
J.validSongNativeDirection=d=>[1,2,3].includes(d?.version)&&typeof d.sourceIdentity==='string'&&finite(d.duration)&&d.duration>0&&Array.isArray(d.sections)&&d.sections.length>0&&d.sections.every((s,i)=>finite(s.start)&&finite(s.end)&&s.start>=0&&s.end>s.start&&s.end<=d.duration&&(!i||s.start===d.sections[i-1].end)&&['motionIntensity','visualDensity','cameraTravel','negativeSpace','typographyScale','contrastIntent','transitionIntensity'].every(k=>finite(s[k])&&s[k]>=0&&s[k]<=1))&&(d.version!==3||d.sections.every(s=>s.motif&&['progress','cohesion','spread','axis','lift','accumulation'].every(k=>finite(s.motif[k])&&s.motif[k]>=0&&s.motif[k]<=1)))&&d.sections[0].start===0&&d.sections.at(-1).end===d.duration;
J.songNativeSectionAt=(p,t)=>{const a=p.songNativeDirection?.sections||[];if(!finite(t))return null;let lo=0,hi=a.length;while(lo<hi){const m=(lo+hi)>>>1;if(a[m].start<=t)lo=m+1;else hi=m;}const s=a[lo-1];return s&&t<s.end?s:null;};
J.applySongNativeDirection=p=>{
 const d=p.songNativeDirection;if(p.songNativeManualPlan||![1,2,3].includes(d?.version))return p;
 for(const c of p.cuts||[]){if(c.line<0||locked(p,c))continue;const s=J.songNativeSectionAt(p,c.start);if(!s)continue;
  c.songNative={sectionStart:s.start,motionIntensity:s.motionIntensity,visualDensity:s.visualDensity,typographyScale:s.typographyScale,quietIntent:s.quietIntent};
  if(c.grammar){const g=c.grammar;g.quiet=g.quiet||s.quietIntent;g.intentionalHold=g.intentionalHold||s.quietIntent;g.layerStrength=s.visualDensity;g.directionPolicy={...g.directionPolicy,motionBudget:s.motionIntensity,attentionBudget:s.visualDensity,quietIntent:s.quietIntent};
   if(g.temporal)g.temporal={...g.temporal,climax:d.climax!==null&&s.start===d.climax,entry:s.entryDuration,source:'Song-Native measured envelope, onset, lyric density and repetition',motionPrinciple:g.intentionalHold?'weighted-hold':g.temporal.motionPrinciple,acousticIntent:s.intent};
  }
 }
 const cinema=p.musicalPhoto?.cinema;if(cinema){cinema.climax=d.climax;if(cinema.grammar)cinema.grammar.shots=p.cuts.filter(c=>c.grammar).map(c=>({line:c.line,from:c.start,to:c.end,...copy(c.grammar)}));}
 for(const s of p.storyboard||[]){const c=p.cuts.find(c=>c.start===s.from);if(c?.grammar&&!s.locked&&!locked(p,c))s.shotGrammar=copy(c.grammar);}
 return p;
};
// Persist only JSON rendering decisions that differ from the deterministic planner.
// Evidence, renderer caches, source images and PCM are never part of this payload.
const renderRoots=['cuts','storyboard','events','eventLayers','musicalPhoto','photoChoreography','photoCompositionPolicy','photoCompositionAlgorithm','cinemaLyricTemporalPolicy','cinemaV5World','cinemaV5Story','visualWorld','sceneVariants','layerStack','beatSync','creditChoreography'];
const transient=k=>k.startsWith('_')||/^(lastPixelQA|lastQualityTarget|architectureSearch|immutableSeedComparison|initialGrammarProtection|preparation|search|feedback|readability|quality|audit|cacheIdentity)$/i.test(k);
const clean=x=>Array.isArray(x)?x.map(clean):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).filter(([k,v])=>!transient(k)&&typeof v!=='function'&&v!==undefined).map(([k,v])=>[k,clean(v)])):x;
J.songNativeRenderDecisions=p=>clean(Object.fromEntries(renderRoots.filter(k=>p[k]!==undefined).map(k=>[k,p[k]])));
const same=(a,b)=>J.canonicalJSON(a??null)===J.canonicalJSON(b??null);
const delta=(a,b,path=[],out=[])=>{
 if(same(a,b))return out;
 if(a&&b&&typeof a==='object'&&typeof b==='object'&&Array.isArray(a)===Array.isArray(b)&&(!Array.isArray(a)||a.length===b.length)){
  for(const k of new Set([...Object.keys(a),...Object.keys(b)]))delta(a[k],b[k],[...path,k],out);
 }else out.push(b===undefined?{path,remove:true}:{path,value:copy(b)});
 return out;
};
const safePath=path=>Array.isArray(path)&&renderRoots.includes(path[0])&&path.every(k=>typeof k==='string'&&!['__proto__','prototype','constructor'].includes(k)&&!transient(k));
const patch=(target,ops)=>{for(const op of ops){if(!safePath(op.path))throw Error('INVALID_RESOLVED_PATH');let node=target;for(const k of op.path.slice(0,-1)){if(!node[k]||typeof node[k]!=='object')throw Error('INVALID_RESOLVED_PARENT');node=node[k];}const key=op.path.at(-1);if(op.remove)delete node[key];else node[key]=copy(op.value);}return target;};
// Bump only for incompatible rendering semantics. Build hashes are diagnostic.
J.songNativeRendererCompatibilityId='kamen-song-native-renderer-3';
const rendererVersion=p=>[4,5,6,7,8].includes(p?.songNativeDirection?.version)?'kamen-song-grammar-renderer-'+p.songNativeDirection.version:J.songNativeRendererCompatibilityId;
const buildId=()=>window.KAMEN_BUILD_INFO?.sourceTreeSHA256||window.KAMEN_BUILD_INFO?.sourceCommit||'development';
const renderContract=p=>fingerprint({lines:p.lines,W:p.W,H:p.H,duration:p.duration,locks:J.cinemaV3.lockSignature(p)});
const restoreState=(p,status,reason)=>{p.songNativeRestore={status,reason};return p;};
J.songNativePlanStatus=(project,audio,p,expectedIdentity=inputIdentity(project,audio))=>({
 validDirection:J.validSongNativeDirection(p.songNativeDirection),identityMatches:p.songNativeDirection?.sourceIdentity===expectedIdentity,
 inputMatches:inputIdentity(project,audio)===expectedIdentity,expectedIdentity,directionIdentity:p.songNativeDirection?.sourceIdentity??null,
 directionVersion:p.songNativeDirection?.version??null,sectionCount:p.songNativeDirection?.sections?.length??0});
const staleDirectionError=status=>Object.assign(Error('STALE_SONG_NATIVE_PLAN'),{code:'STALE_SONG_NATIVE_PLAN',reason:status.validDirection?'SOURCE_IDENTITY_MISMATCH':'INVALID_DIRECTION',diagnostic:status});
J.ensureSongNativeDirection=(project,audio,p,expectedIdentity=inputIdentity(project,audio))=>{
 const status=J.songNativePlanStatus(project,audio,p,expectedIdentity);
 if(!status.inputMatches)throw Error('INPUT_CHANGED_BEFORE_RESOLVED_COMMIT');
 if(status.validDirection&&status.identityMatches)return {changed:false,requiresObservation:false};
 // Only an input-bound plan may reconstruct lost/stale direction metadata.
 // A real input change must go through replan/search, not identity replacement.
 if(p.songNativePlanInputIdentity!==expectedIdentity)throw staleDirectionError(status);
 const baseline=J.plan({...project,artDirection:{...project.artDirection,songNativeResolved:undefined}},audio);
 if(!same(p.lines,baseline.lines)||J.cinemaV3.lockSignature(p)!==J.cinemaV3.lockSignature(baseline))throw Error('TIMING_OR_LOCK_CHANGED');
 const fresh=J.buildSongNativeDirection(project,audio);if(!J.validSongNativeDirection(fresh))throw staleDirectionError({...status,validDirection:false});
 p.songNativeDirection=fresh;p.artDirection={...p.artDirection,songNativeDirection:fresh};
 // Do not reapply basic modulation over adopted repairs. The new runtime direction
 // is nevertheless a render dependency, so exact-plan QA must be observed again.
 J.cinemaV3.invalidate(p);return {changed:true,requiresObservation:true};
};
J.captureSongNativeResolved=(project,audio,p,expectedIdentity=inputIdentity(project,audio))=>{
 if(expectedIdentity!==inputIdentity(project,audio))throw Error('INPUT_CHANGED_BEFORE_RESOLVED_COMMIT');
 const status=J.songNativePlanStatus(project,audio,p,expectedIdentity);if(!status.validDirection||!status.identityMatches)throw staleDirectionError(status);
 const source={...project,artDirection:{...project.artDirection}};delete source.artDirection.songNativeResolved;
 source.artDirection.songNativeDirection=copy(p.songNativeDirection);
 const baseline=J.plan(source,audio),base=J.songNativeRenderDecisions(baseline),final=J.songNativeRenderDecisions(p);
 if(!same(baseline.lines,p.lines)||J.cinemaV3.lockSignature(baseline)!==J.cinemaV3.lockSignature(p))throw Error('TIMING_OR_LOCK_CHANGED');
 const schema=[4,5,6,7,8].includes(p.songNativeDirection.version)?p.songNativeDirection.version:3;
 const resolved={version:schema,songNativeSchemaVersion:schema,buildId:buildId(),rendererCompatibilityId:rendererVersion(p),renderContract:renderContract(baseline),sourceIdentity:expectedIdentity,baselineIdentity:fingerprint(base),decisionsIdentity:fingerprint(final),direction:copy(p.songNativeDirection),overrides:delta(base,final),locks:J.cinemaV3.lockSignature(p)};
 if(fingerprint(patch(base,resolved.overrides))!==resolved.decisionsIdentity)throw Error('UNREPRESENTABLE_RENDER_DECISIONS');
 // Commit atomically after all validation. A superseded async job cannot reach here.
 project.artDirection={...project.artDirection,songNativeDirection:copy(p.songNativeDirection),songNativeResolved:resolved};
 return resolved;
};
J.restoreSongNativeResolved=(project,audio,p)=>{
 const r=project.artDirection?.songNativeResolved;
 if(!r)return restoreState(p,'NOT_SAVED');
 if(!audio||!audio.duration)return restoreState(p,'PENDING_INPUT','AUDIO_NOT_READY');
 // No legacy hash is allowlisted without a verified equivalent rendering contract.
 const schema=[4,5,6,7,8].includes(p.songNativeDirection?.version)?p.songNativeDirection.version:3;
 if(r.version!==schema||r.songNativeSchemaVersion!==schema||r.rendererCompatibilityId!==rendererVersion(p))return restoreState(p,'REJECTED','RENDERER_OR_SCHEMA');
 if(r.sourceIdentity!==inputIdentity(project,audio)||!J.validSongNativeDirection(r.direction)||!same(r.direction,p.songNativeDirection)||!Array.isArray(r.overrides))return restoreState(p,'REJECTED','INPUT_OR_DIRECTION');
 if(r.renderContract!==renderContract(p)||r.baselineIdentity!==fingerprint(J.songNativeRenderDecisions(p))||r.locks!==J.cinemaV3.lockSignature(p))return restoreState(p,'REJECTED','BASELINE_OR_LOCK');
 try{
  // The planner deliberately shares some anchors between contracts. Patch the
  // dealiased JSON projection so a cut override cannot mutate an unchanged contract.
  const decisions=patch(J.songNativeRenderDecisions(p),r.overrides),candidate=copy(p);
  for(const k of renderRoots){delete candidate[k];if(decisions[k]!==undefined)candidate[k]=decisions[k];}
  if(fingerprint(J.songNativeRenderDecisions(candidate))!==r.decisionsIdentity||r.locks!==J.cinemaV3.lockSignature(candidate)||!same(candidate.lines,p.lines))return restoreState(p,'REJECTED','DECISIONS_OR_LOCK');
  J.cinemaV3.restorePlan(p,candidate);J.cinemaV3.invalidate(p);restoreState(p,'RESTORED');
  // Restoration is last in J.plan; basic direction never runs after these decisions.
 }catch{return restoreState(p,'REJECTED','INVALID_PATCH');}
 return p;
};

J.songNativeFixSnapshot=(project,audio,p)=>({project:copy(project),identity:inputIdentity(project,audio),audioIdentity:fingerprint({key:J.registrySelectionAudioKey(audio),energy:Array.from(audio?.energy||[]),onset:Array.from(audio?.onset||[])}),base:J.songNativeRenderDecisions(J.plan({...project,artDirection:{...project.artDirection,songNativeResolved:undefined}},audio)),chosen:J.songNativeRenderDecisions(p),lines:copy(p.lines),locks:J.cinemaV3.lockSignature(p)});
const overlap=(a,b)=>a.every((v,i)=>b[i]===v)||b.every((v,i)=>a[i]===v);
J.classifySongNativeFix=(before,project,p,audio)=>{
 const expand=op=>op.path[0]==='overrides'&&op.path.length===2&&op.value&&typeof op.value==='object'?Object.entries(op.value).map(([k,value])=>({path:[...op.path,k],value})):[op];
 const ops=delta(before.project,project).flatMap(expand),planOps=delta(before.base,J.songNativeRenderDecisions(J.plan({...project,artDirection:{...project.artDirection,songNativeResolved:undefined}},audio)));
 if((!ops.length||before.identity===inputIdentity(project,audio))&&!planOps.length)return 'OBSERVATION_ONLY';
 if(ops.some(o=>['lyrics','timing','aspect','customBg','audioAsset','visualAssets'].includes(o.path[0])))return 'INPUT_OR_ASPECT_CHANGE';
 const read=o=>o.path[0]==='lyricPlacementWide'||o.path[0]==='titleDisplay'||o.path[0]==='autoPalette'&&o.path[1]==='options'||o.path[0]==='overrides'&&['size','color','stroke','strokeColor'].includes(o.path[2]);
 const motion=o=>o.path[0]==='overrides'&&['hold','enter','exit','inDur','outDur'].includes(o.path[2])||o.path[0]==='fx'&&['motion','glitch'].includes(o.path[1])||o.path[0]==='artDirection'&&o.path[1]==='motionDNA'&&['transitionDuration','cameraSpeed','beatResponse'].includes(o.path[2]);
 if(!ops.length)return 'UNKNOWN';
 if(ops.every(read))return 'LOCAL_READABILITY';
 if(ops.every(o=>read(o)||motion(o)))return 'LOCAL_MOTION';
 if(ops.some(o=>['style','mood','enabled','seed','artDirection','fx'].includes(o.path[0])))return 'GLOBAL_COMPOSITION';
 return 'UNKNOWN';
};
J.reapplySongNativeSelection=(before,project,audio,p,impact)=>{
 if(before.identity!==inputIdentity(before.project,audio)||impact!==J.classifySongNativeFix(before,project,p,audio)||p.songNativeDirection?.sourceIdentity!==inputIdentity(project,audio))return false;
 if(before.audioIdentity!==fingerprint({key:J.registrySelectionAudioKey(audio),energy:Array.from(audio?.energy||[]),onset:Array.from(audio?.onset||[])}))return false;
 if(!['OBSERVATION_ONLY','LOCAL_READABILITY','LOCAL_MOTION'].includes(impact)||!same(before.lines,p.lines)||before.locks!==J.cinemaV3.lockSignature(p))return false;
 // Rebase only non-conflicting decisions. Never restore stale caches or QA.
 const current=J.songNativeRenderDecisions(J.plan({...project,artDirection:{...project.artDirection,songNativeResolved:undefined}},audio)),repairs=delta(before.base,current),selected=delta(before.base,before.chosen);
 if(selected.some(o=>!safePath(o.path)))return false;
 const applicable=selected.filter(o=>!repairs.some(r=>overlap(o.path,r.path)));
 try{const decisions=patch(current,applicable),candidate=copy(p);for(const k of renderRoots){delete candidate[k];if(decisions[k]!==undefined)candidate[k]=decisions[k];}
  if(before.locks!==J.cinemaV3.lockSignature(candidate)||!same(before.lines,candidate.lines))return false;
  J.cinemaV3.restorePlan(p,candidate);delete p.lastPixelQA;J.cinemaV3.invalidate(p);return true;
 }catch{return false;}
};
J.runSongNativeFixSearch=async(before,project,audio,p,range,telemetry={})=>{
 const impact=J.classifySongNativeFix(before,project,p,audio),reused=J.reapplySongNativeSelection(before,project,audio,p,impact);
 if(!reused)await J.searchSongNativeCandidates(p,range,audio,telemetry);
 return {impact,reused,requiresObservation:true};
};

J.songNativeSpatialObservation=(mask,w,h)=>{let weight=0,x=0,y=0,second=0;for(let i=3;i<mask.length;i+=4){const a=mask[i]/255,px=((i-3)/4%w)/w,py=Math.floor((i-3)/4/w)/h;weight+=a;x+=a*px;y+=a*py;second+=a*(px*px+py*py);}return weight?{centroidX:x/weight,centroidY:y/weight,spread:Math.sqrt(Math.max(0,second/weight-(x*x+y*y)/(weight*weight)))}:{};};
J.songNativeCandidateKey=p=>{const render=J.songNativeRenderDecisions(p);if(render.musicalPhoto?.cinema?.architecture)delete render.musicalPhoto.cinema.architecture.candidate;return J.canonicalJSON({render,motif:p.songNativeDirection,profile:[p.W,p.H,p.fps]});};
J.songNativeDistinctCandidates=(items,minimum=3)=>{
 const ordered=[...items.filter(item=>item.id==='baseline'),...items.filter(item=>item.id!=='baseline')],seen=new Set(),distinct=ordered.filter(item=>{const key=J.songNativeCandidateKey(item.plan);if(seen.has(key))return false;seen.add(key);return true;});
 return {items:distinct.length>=Math.min(minimum,items.length)?distinct:items,fallback:distinct.length<Math.min(minimum,items.length)};
};

const propose=J.proposeDirection;J.proposeDirection=(...args)=>({...propose(...args),songNativeDirector:1});
const direction=J.makeArtDirection;J.makeArtDirection=(project,audio,proposal)=>{
 const d=direction(project,audio,proposal);if(proposal.songNativeDirector===1||[1,2,3].includes(project.artDirection?.songNativeDirection?.version)){const input={...project,style:d.style,mood:d.mood,fonts:d.typography,fx:proposal.fx||project.fx,overrides:proposal.overrides||project.overrides};d.songNativeDirection=J.buildSongNativeDirection(input,audio);}return d;
};
const plan=J.plan;J.plan=(project,audio)=>{
 const p=plan(copy(project),audio),saved=project.artDirection?.songNativeDirection;
 if(![1,2,3].includes(saved?.version)||!p.artDirection)return p;
 // Authored section plans keep v1's opt-out from native modulation, while their
 // selected render decisions still receive the versioned save/restore contract.
 p.songNativeManualPlan=!!p.directorSections7?.length;
 // Recompute stale input; never edit the saved project from this pure planner.
 p.songNativeDirection=J.validSongNativeDirection(saved)&&saved.sourceIdentity===inputIdentity(project,audio)?copy(saved):J.buildSongNativeDirection(project,audio);
 p.songNativePlanInputIdentity=inputIdentity(project,audio);
 p.artDirection={...p.artDirection,songNativeDirection:p.songNativeDirection};J.applySongNativeDirection(p);return J.restoreSongNativeResolved(project,audio,p);
};
const architecture=J.applyCinemaArchitecture;J.applyCinemaArchitecture=(p,...args)=>{const r=architecture(p,...args);J.applySongNativeDirection(p);return r;};
J.songNativeMotifAt=(p,t)=>{
 const d=p.songNativeDirection,s=J.songNativeSectionAt(p,t);if(d?.version!==3||!s?.motif)return null;
 const next=d.sections[d.sections.indexOf(s)+1]?.motif||s.motif,u=C((t-s.start)/Math.max(.1,s.end-s.start)),v=u*u*(3-2*u);
 return Object.fromEntries(Object.keys(s.motif).map(k=>[k,s.motif[k]*(1-v)+next[k]*v]));
};
// Runtime adapters also sample at render time, so a long cut can cross a section.
const temporal=J.cinemaTemporalState;J.cinemaTemporalState=(p,c,t)=>{const state=temporal(p,c,t),s=J.songNativeSectionAt(p,t);if(!state||!s||locked(p,c))return state;
 const hold=c.grammar?.intentionalHold||s.quietIntent,u=state.u,progress=s.intent==='release'?1-Math.pow(1-u,3):s.intent==='accumulation'?u*u:u*u*(3-2*u);
 return {...state,level:hold?Math.min(state.level,.08):C(state.level*(.65+s.motionIntensity*.55)+(c.songNativeRepair?.motionDelta||0)),travel:hold?state.travel:state.travel*.6+progress*.4,impact:state.impact*(.7+s.transitionIntensity*.6),entry:state.entry};};
const focus=J.temporalCinemaFocus;J.temporalCinemaFocus=(p,c,f,t)=>{
 const base=focus(p,c,f,t),s=J.songNativeSectionAt(p,t);if(!s||s.quietIntent||locked(p,c)||c.grammar?.intentionalHold)return base;
 const u=C((t-s.start)/Math.max(.1,s.end-s.start)),v=s.intent==='release'?1-Math.pow(1-u,3):s.intent==='accumulation'?u*u:u*u*(3-2*u),q={...base},space=p.autoPalette?.stats||{};
 q.zoom=Math.max(1,Math.min(2.8,(base.zoom??1)+s.cameraTravel*.025*v*(.8+s.transitionIntensity*.4)));
 const motif=J.songNativeMotifAt(p,t);
 if(motif&&!s.quietIntent){q.x=C((base.x??.5)+(motif.axis-.5)*.09,.03,.97);q.y=C((base.y??.5)+(motif.lift-.5)*.07,.03,.97);}
 q.x=C((q.x??base.x??.5)+((space.spaceRight??.5)-(space.spaceLeft??.5))*s.cameraTravel*.025*v,.03,.97);return q;
};
const camera=J.cameraAt;J.cameraAt=(p,t,range)=>{
 const s=J.songNativeSectionAt(p,t),c=J.cutAt(p,t);if(!s||s.quietIntent||locked(p,c)||c?.grammar)return camera(p,t,range);
 const base=camera(p,t,range),u=C((t-s.start)/Math.max(.1,s.end-s.start)),v=s.intent==='accumulation'?u*u:s.intent==='release'?1-Math.pow(1-u,3):u;return {...base,s:(base.s??1)+s.cameraTravel*.025*v};
};
const main=J.mainDraw;J.mainDraw=(env,it)=>{
 const s=J.songNativeSectionAt(env.plan,env.t),c=env.cut;
 if(![4,5,6,7,8].includes(env.plan.songNativeDirection?.version)&&s&&c?.line>=0&&!locked(env.plan,c)&&norm(it.text)===norm(c.lineText??c.text)&&finite(it.size))it={...it,size:it.size*(.82+.18*s.typographyScale)*(1-.08*s.negativeSpace)};
 const motif=J.songNativeMotifAt(env.plan,env.t);
 if(motif&&s&&!s.quietIntent&&c?.line>=0&&!locked(env.plan,c)&&norm(it.text)===norm(c.lineText??c.text)){
  it=J.safeLyricItem(env,{...it,x:finite(it.x)?it.x+(motif.axis-.5)*env.W*.035:it.x,y:finite(it.y)?it.y+(motif.lift-.5)*env.H*.025:it.y,
   size:finite(it.size)?it.size*(.96+.04*motif.cohesion-.025*motif.spread):it.size});
 }
 return main(env,it);
};

// Strengthen the existing readability treatment after its local colour decision.
// Paint the edge under the fill and rerun the established geometry guard.
const readability=J.adjustLocalReadability;J.adjustLocalReadability=(env,it)=>{
 const out=readability(env,it),s=J.songNativeSectionAt(env.plan,env.t),c=env.cut;
 if(!s||!c||c.line<0||locked(env.plan,c)||norm(out.text)!==norm(c.lineText??c.text))return out;
 return J.safeLyricItem(env,{...out,stroke:(out.stroke||0)+Math.min(1.5,env.H*.001)*s.contrastIntent,strokeColor:out.strokeColor||(out.fill===false?out.color:'#000'),strokeUnder:true});
};

// Ordinal agreement uses real within-phrase mask motion, not maximum pixel change.
// It measures acoustic/render correspondence only; semantics and artistic quality stay unknown.
J.measureSongNativeFit=(p,samples)=>{
 const rows=samples.map(r=>{const s=J.songNativeSectionAt(p,r.time);return {...r,target:s?.motionIntensity??null,quiet:!!s?.quietIntent,source:s?.energyStatus};}).filter(r=>finite(r.target)&&finite(r.motion)&&['MEASURED','PROVIDED'].includes(r.source));
 let matches=0,count=0;
 for(let i=0;i<rows.length;i++)for(let j=i+1;j<rows.length;j++){const a=rows[i],b=rows[j];if(Math.abs(a.target-b.target)<.12)continue;count++;if(Math.abs(a.motion-b.motion)>.0001&&Math.sign(a.target-b.target)===Math.sign(a.motion-b.motion))matches++;}
 for(const r of rows)if(r.quiet){count++;if(r.motion<=.003)matches++;}
 const components={ordinal:count?matches/count:null,transitionTiming:null,accumulationRelease:null,intentionalSilence:null,motifProgression:null};
 const ordered=[...rows].sort((a,b)=>a.time-b.time),pairs=ordered.slice(1).map((r,i)=>({a:ordered[i],b:r})).filter(x=>x.a.line!==x.b.line);
 const transitions=(p.songNativeDirection?.sections||[]).filter(s=>Math.abs(s.energyChange??0)>.12);
 const observed=pairs.filter(x=>Math.abs(x.b.motion-x.a.motion)>.0001);
 if(transitions.length&&observed.length)components.transitionTiming=mean(transitions.map(s=>1-C(Math.min(...observed.map(x=>Math.abs((x.a.time+x.b.time)/2-s.start)))/Math.max(.1,s.end-s.start))));
 const changes=pairs.filter(x=>Math.abs(x.b.target-x.a.target)>.05);
 if(changes.length)components.accumulationRelease=mean(changes.map(x=>Math.abs(x.b.motion-x.a.motion)<=.0001?0:Number(Math.sign(x.b.target-x.a.target)===Math.sign(x.b.motion-x.a.motion))));
 const quiet=rows.filter(r=>r.quiet&&finite(r.cameraMotion));
 if(quiet.length)components.intentionalSilence=mean(quiet.map(r=>1-C(Math.max(r.motion/.003,r.cameraMotion/.003))));
 const spatial=rows.filter(r=>finite(r.centroidX)&&finite(r.spread)&&J.songNativeMotifAt(p,r.time));
 if(spatial.length>1)components.motifProgression=mean(spatial.slice(1).map((r,i)=>{const prior=spatial[i],a=J.songNativeMotifAt(p,prior.time),b=J.songNativeMotifAt(p,r.time),expected=b.axis-a.axis,actual=r.centroidX-prior.centroidX;return Math.abs(expected)<.01?1-C(Math.abs(actual)*4):Math.abs(actual)<.001?0:Number(Math.sign(expected)===Math.sign(actual));}));
 const measured=Object.values(components).filter(finite),complete=finite(components.ordinal)&&finite(components.transitionTiming)&&finite(components.accumulationRelease)&&(!rows.some(r=>r.quiet)||finite(components.intentionalSilence))&&(p.songNativeDirection?.version!==3||finite(components.motifProgression)),score=complete?mean(measured):components.ordinal,profile=J.canonicalJSON(Object.entries(components).filter(([,v])=>finite(v)).map(([k])=>k));
 return {status:finite(score)?'MEASURED':'UNMEASURED',score,fallback:complete?null:'ORDINAL_INCOMPLETE_TEMPORAL_EVIDENCE',components,profile,population:J.canonicalJSON(rows.map(r=>[r.line,r.time,r.target,r.quiet,finite(r.cameraMotion),finite(r.centroidX)])),comparisons:count,samples:rows,formula:'Comparable Canvas ordinal motion, normalized transition distance, accumulation/release, observed camera and glyph quietness, spatial motif progression; missing components excluded',semantics:'UNMEASURED',artisticQuality:'UNVERIFIED'};
};

// The captured chain contains every existing glyph/contrast/onset observer.
// It runs on private data; renderer caches and lastPixelQA never touch the caller.
const observationFontIds=new WeakMap();let observationFontSerial=0;
J.songNativeObservationKey=async(p,range,audio=null)=>{
 const fonts=document.fonts,faces=fonts&&typeof fonts[Symbol.iterator]==='function'?Array.from(fonts,f=>{if(!observationFontIds.has(f))observationFontIds.set(f,++observationFontSerial);return [observationFontIds.get(f),f.family,f.style,f.weight,f.stretch,f.status];}):[];
 if(fonts?.status==='loading'||faces.some(f=>f.at(-1)!=='loaded'))return null;
 return J.sha256(J.canonicalJSON({plan:p,range:range??null,audio:inputIdentity({},audio),renderer:rendererVersion(p),build:buildId(),fontStatus:fonts?.status??null,faces}));
};
const analyze=J.analyzeRenderedFrames;
J.observeMVQuality=async(p,range,audio,telemetry={})=>{
 abort(telemetry.signal);
 const planHash=await J.cinemaV3.planHash(p),key=telemetry.observationCache?await J.songNativeObservationKey(p,range,audio):null,cached=key&&telemetry.observationCache.get('quality:'+key);
 if(cached?.completed){abort(telemetry.signal);if(await J.cinemaV3.planHash(p)!==planHash||await J.songNativeObservationKey(p,range,audio)!==key)throw Error('INPUT_CHANGED_DURING_OBSERVATION');return {...copy(cached),observationBinding:{planHash,rangeKey:J.canonicalJSON(range??null)}};}
 const working=copy(p),result=await analyze(working,range,audio,{...telemetry,observationOnly:true});abort(telemetry.signal);
 if(await J.cinemaV3.planHash(p)!==planHash||key&&await J.songNativeObservationKey(p,range,audio)!==key)throw Error('INPUT_CHANGED_DURING_OBSERVATION');
 result.observationBinding={planHash,rangeKey:J.canonicalJSON(range??null)};
 if(key&&result.completed){if(telemetry.observationCache.size>=8)telemetry.observationCache.delete(telemetry.observationCache.keys().next().value);telemetry.observationCache.set('quality:'+key,copy(result));}
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
