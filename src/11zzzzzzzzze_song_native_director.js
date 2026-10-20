/* Song-Native Director v2. Local analysis, explicit search, immutable observation. */
(()=>{
'use strict';
const J=window.J,C=J.clamp,finite=Number.isFinite;
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:null;
const norm=t=>String(t||'').normalize('NFC').replace(/\s/gu,'');
const locked=(p,c)=>!c||c.locked||J.photoChoreographyLocked?.(p,c);
const abort=signal=>{if(signal?.aborted)throw new DOMException('Aborted','AbortError');};
const copy=x=>J.clonePhotoRenderPlan(x);
const fingerprint=value=>{const s=J.canonicalJSON(value);let h=2166136261,g=3339675911;for(let i=0;i<s.length;i++){h=Math.imul(h^s.charCodeAt(i),16777619)>>>0;g=Math.imul(g^s.charCodeAt(i),2246822519)>>>0;}return s.length+':'+h+':'+g;};
const inputIdentity=(project,audio)=>fingerprint({audio:J.registrySelectionAudioKey(audio),envelope:Array.from(audio?.energy||[]),onset:Array.from(audio?.onset||[]),rms:Array.from(audio?.rms||[]),energyRate:audio?.energyRate,analysisSource:audio?.analysisSource,project:{...Object.fromEntries(Object.entries(project).filter(([k])=>!['schemaVersion','migratedFromSchema','audioAsset'].includes(k))),artDirection:project.artDirection?Object.fromEntries(Object.entries(project.artDirection).filter(([k])=>!['songNativeDirection','songNativeResolved'].includes(k))):null}});

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
  return {intent,intentStatus:e===null?'UNMEASURED':'INFERRED',start,end,measuredEnergy:e,energyStatus:status,onset:onsets,spectralFlux:flux,energyChange:delta,lyricDensity:density,repetition:repeat,rest,quietIntent:quiet,motionIntensity:motion,visualDensity:quiet?.08:C(.1+level*.4+change*.2-detail*.15-density*.15),cameraTravel:quiet?.025:C(.05+motion*.65+change*.15),negativeSpace:C(.35+space*.25+density*.25-level*.15),typographyScale:C(.35+level*.3+repeat*.1-density*.18),contrastIntent:C(.45+(1-contrast)*.25+detail*.15),transitionIntensity:quiet?.03:C(change*.6+rhythm*.15),entryDuration:Math.min(.16,Math.max(.06,.16-rhythm*.08)),emphasis:quiet?'quiet':change>.4?'change':repeat>.3?'return':'sustain'};
 });
 const known=sections.filter(s=>s.measuredEnergy!==null&&!s.rest),peak=known.reduce((best,s)=>!best||s.measuredEnergy>best.measuredEnergy?s:best,null);
 return {version:2,sourceIdentity:inputIdentity(project,audio),duration,sections,lyrics:lines,climax:peak?.start??null,commonLanguage:{palette:copy(project.autoPalette?.palette||null),font:project.fonts?.display||null,motion:'continuous phrase travel and complete readable lyric',imageStatus:imageMeasured?'MEASURED':'UNMEASURED'},evidence:{energy:status,sections:timeline.length?'INFERRED':'LRC_STRUCTURE_ONLY',coarseBlocks:coarse?'PROVIDED_NOT_FORMAL_SECTIONS':'NOT_USED',semantics:'UNKNOWN',image:imageMeasured?'MEASURED':'UNMEASURED'},limitations:'Heuristic structure and exact lyric repetition; keyword hints are not semantic understanding. No artistic quality claim.'};
};
J.validSongNativeDirection=d=>[1,2].includes(d?.version)&&typeof d.sourceIdentity==='string'&&finite(d.duration)&&d.duration>0&&Array.isArray(d.sections)&&d.sections.length>0&&d.sections.every((s,i)=>finite(s.start)&&finite(s.end)&&s.start>=0&&s.end>s.start&&s.end<=d.duration&&(!i||s.start===d.sections[i-1].end)&&['motionIntensity','visualDensity','cameraTravel','negativeSpace','typographyScale','contrastIntent','transitionIntensity'].every(k=>finite(s[k])&&s[k]>=0&&s[k]<=1))&&d.sections[0].start===0&&d.sections.at(-1).end===d.duration;
J.songNativeSectionAt=(p,t)=>{const a=p.songNativeDirection?.sections||[];if(!finite(t))return null;let lo=0,hi=a.length;while(lo<hi){const m=(lo+hi)>>>1;if(a[m].start<=t)lo=m+1;else hi=m;}const s=a[lo-1];return s&&t<s.end?s:null;};
J.applySongNativeDirection=p=>{
 const d=p.songNativeDirection;if(![1,2].includes(d?.version))return p;
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
const rendererVersion=()=>(window.KAMEN_BUILD_INFO?.sourceTreeSHA256||J.cinemaV3.version)+'/song-native-2';
J.captureSongNativeResolved=(project,audio,p,expectedIdentity=inputIdentity(project,audio))=>{
 if(expectedIdentity!==inputIdentity(project,audio))throw Error('INPUT_CHANGED_BEFORE_RESOLVED_COMMIT');
 if(!J.validSongNativeDirection(p.songNativeDirection)||p.songNativeDirection.sourceIdentity!==expectedIdentity)throw Error('STALE_SONG_NATIVE_PLAN');
 const source={...project,artDirection:{...project.artDirection}};delete source.artDirection.songNativeResolved;
 const baseline=J.plan(source,audio),base=J.songNativeRenderDecisions(baseline),final=J.songNativeRenderDecisions(p);
 if(!same(baseline.lines,p.lines)||J.cinemaV3.lockSignature(baseline)!==J.cinemaV3.lockSignature(p))throw Error('TIMING_OR_LOCK_CHANGED');
 const resolved={version:2,sourceIdentity:expectedIdentity,rendererVersion:rendererVersion(),baselineIdentity:fingerprint(base),decisionsIdentity:fingerprint(final),direction:copy(p.songNativeDirection),overrides:delta(base,final),locks:J.cinemaV3.lockSignature(p)};
 if(fingerprint(patch(base,resolved.overrides))!==resolved.decisionsIdentity)throw Error('UNREPRESENTABLE_RENDER_DECISIONS');
 // Commit atomically after all validation. A superseded async job cannot reach here.
 project.artDirection={...project.artDirection,songNativeDirection:copy(p.songNativeDirection),songNativeResolved:resolved};
 return resolved;
};
J.restoreSongNativeResolved=(project,audio,p)=>{
 const r=project.artDirection?.songNativeResolved;
 if(r?.version!==2||r.rendererVersion!==rendererVersion()||r.sourceIdentity!==inputIdentity(project,audio)||!J.validSongNativeDirection(r.direction)||!same(r.direction,p.songNativeDirection)||!Array.isArray(r.overrides))return p;
 if(r.baselineIdentity!==fingerprint(J.songNativeRenderDecisions(p))||r.locks!==J.cinemaV3.lockSignature(p))return p;
 try{
  // The planner deliberately shares some anchors between contracts. Patch the
  // dealiased JSON projection so a cut override cannot mutate an unchanged contract.
  const decisions=patch(J.songNativeRenderDecisions(p),r.overrides),candidate=copy(p);
  for(const k of renderRoots){delete candidate[k];if(decisions[k]!==undefined)candidate[k]=decisions[k];}
  if(fingerprint(J.songNativeRenderDecisions(candidate))!==r.decisionsIdentity||r.locks!==J.cinemaV3.lockSignature(candidate)||!same(candidate.lines,p.lines))return p;
  J.cinemaV3.restorePlan(p,candidate);J.cinemaV3.invalidate(p);
  // Restoration is last in J.plan; basic direction never runs after these decisions.
 }catch{/* Invalid/old payload safely falls back to the current deterministic plan. */}
 return p;
};

const propose=J.proposeDirection;J.proposeDirection=(...args)=>({...propose(...args),songNativeDirector:1});
const direction=J.makeArtDirection;J.makeArtDirection=(project,audio,proposal)=>{
 const d=direction(project,audio,proposal);if(proposal.songNativeDirector===1||[1,2].includes(project.artDirection?.songNativeDirection?.version)){const input={...project,style:d.style,mood:d.mood,fonts:d.typography,fx:proposal.fx||project.fx,overrides:proposal.overrides||project.overrides};d.songNativeDirection=J.buildSongNativeDirection(input,audio);}return d;
};
const plan=J.plan;J.plan=(project,audio)=>{
 const p=plan(project,audio),saved=project.artDirection?.songNativeDirection;
 if(![1,2].includes(saved?.version)||!p.artDirection||p.directorSections7?.length)return p;
 // Recompute stale input; never edit the saved project from this pure planner.
 p.songNativeDirection=J.validSongNativeDirection(saved)&&saved.sourceIdentity===inputIdentity(project,audio)?copy(saved):J.buildSongNativeDirection(project,audio);
 p.artDirection={...p.artDirection,songNativeDirection:p.songNativeDirection};J.applySongNativeDirection(p);return J.restoreSongNativeResolved(project,audio,p);
};
const architecture=J.applyCinemaArchitecture;J.applyCinemaArchitecture=(p,...args)=>{const r=architecture(p,...args);J.applySongNativeDirection(p);return r;};
// Runtime adapters also sample at render time, so a long cut can cross a section.
const temporal=J.cinemaTemporalState;J.cinemaTemporalState=(p,c,t)=>{const state=temporal(p,c,t),s=J.songNativeSectionAt(p,t);if(!state||!s||locked(p,c))return state;
 const hold=c.grammar?.intentionalHold||s.quietIntent,u=state.u,progress=s.intent==='release'?1-Math.pow(1-u,3):s.intent==='accumulation'?u*u:u*u*(3-2*u);
 return {...state,level:hold?Math.min(state.level,.08):C(state.level*(.65+s.motionIntensity*.55)+(c.songNativeRepair?.motionDelta||0)),travel:hold?state.travel:state.travel*.6+progress*.4,impact:state.impact*(.7+s.transitionIntensity*.6),entry:state.entry};};
const focus=J.temporalCinemaFocus;J.temporalCinemaFocus=(p,c,f,t)=>{
 const base=focus(p,c,f,t),s=J.songNativeSectionAt(p,t);if(!s||locked(p,c)||c.grammar?.intentionalHold)return base;
 const u=C((t-s.start)/Math.max(.1,s.end-s.start)),v=s.intent==='release'?1-Math.pow(1-u,3):s.intent==='accumulation'?u*u:u*u*(3-2*u),q={...base},space=p.autoPalette?.stats||{};
 q.zoom=Math.max(1,Math.min(2.8,(base.zoom??1)+s.cameraTravel*.025*v*(.8+s.transitionIntensity*.4)));
 q.x=C((base.x??.5)+((space.spaceRight??.5)-(space.spaceLeft??.5))*s.cameraTravel*.025*v,.03,.97);return q;
};
const camera=J.cameraAt;J.cameraAt=(p,t,range)=>{
 const s=J.songNativeSectionAt(p,t),c=J.cutAt(p,t);if(!s||locked(p,c)||c?.grammar)return camera(p,t,range);
 const base=camera(p,t,range),u=C((t-s.start)/Math.max(.1,s.end-s.start)),v=s.intent==='accumulation'?u*u:s.intent==='release'?1-Math.pow(1-u,3):u;return {...base,s:(base.s??1)+s.cameraTravel*.025*v};
};
const main=J.mainDraw;J.mainDraw=(env,it)=>{
 const s=J.songNativeSectionAt(env.plan,env.t),c=env.cut;
 if(s&&c?.line>=0&&!locked(env.plan,c)&&norm(it.text)===norm(c.lineText??c.text)&&finite(it.size))it={...it,size:it.size*(.82+.18*s.typographyScale)*(1-.08*s.negativeSpace)};
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
 return {status:count?'MEASURED':'UNMEASURED',score:count?matches/count:null,population:J.canonicalJSON(rows.map(r=>[r.line,r.time,r.target,r.quiet])),comparisons:count,samples:rows,formula:'agreeing acoustic-order / observed-mask-motion-order pairs and quiet holds divided by comparable observations; ordinal ties do not claim motion',semantics:'UNMEASURED',artisticQuality:'UNVERIFIED'};
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
