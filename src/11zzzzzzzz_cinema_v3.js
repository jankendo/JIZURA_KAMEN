/* Cinema V3 contracts and adapters. Existing renderer and save formats stay authoritative. */
(()=>{
'use strict';
const J=window.J, V=J.cinemaV3={version:'3.0.1',enabled:true}, finite=Number.isFinite;
/** @typedef {'MEASURED'|'UNMEASURED'|'NOT_APPLICABLE'|'FAILED'} EvidenceStatus */
/** @typedef {{value:*,confidence:number,source:string,status:EvidenceStatus,limitations?:string[]}} Feature */
/** @typedef {{inputHash:string,audioHash:?string,imageHashes:string[],lyricsHash:string,projectHash:string,rendererVersion:string,outputProfile:Object,userLocks:Object}} ImmutableInputSnapshot */
/** @typedef {{from:number,to:number,energy:Feature,beatSalience:Feature,onsetDensity:Feature,lyricDensity:Feature,repetition:Feature,role:Feature}} SectionFeatures */
/** @typedef {{mode:string,stageRole:string,motionBudget:number,attentionBudget:number,typographyBudget:number,desiredChange:number,confidence:number,quietIntent:boolean}} DirectionPolicy */
/** @typedef {{line:number,from:number,to:number,role:string,grammarId:string,typographyId:string,motionId:string,safeArea:Object,minReadableFrames:number,maxOcclusionRatio:number,reasonCodes:string[],featureSources:string[],userLocked:boolean}} ShotContract */
/** @typedef {{id:string,value:?number,unit:string,source:string,status:EvidenceStatus,sampleCount:number,affectedLineIds:number[],confidence:number,profileId:string,thresholdId:string,method:string,planHash:string,inputHash:string,rendererVersion:string,outputProfile:Object}} MetricEvidence */
/** @typedef {{id:string,planHash:string,candidateSeed:number,hardFailures:string[],measurements:MetricEvidence[],objectives:Object,lowerTail:?number,constraintViolations:number,memoryBudgetBytes:number,timeCostMs:number}} CandidateEvaluation */
/** @typedef {{previousPlanHash:string,nextPlanHash:string,failuresAddressed:string[],operatorId:string,changedLines:number[],unchangedLines:number[],before:CandidateEvaluation,after:CandidateEvaluation,accepted:boolean,reason:string,artifacts:string[]}} RepairResult */
const statuses=['MEASURED','UNMEASURED','NOT_APPLICABLE','FAILED'], roles=['introduce','develop','contrast','resolve','sustain'];
const str=v=>typeof v==='string'&&v.length>0, number=v=>finite(v), nonnegative=v=>finite(v)&&v>=0, integer=v=>Number.isInteger(v)&&v>=0, unit=v=>finite(v)&&v>=0&&v<=1, bool=v=>typeof v==='boolean', arrayOf=f=>v=>Array.isArray(v)&&v.every(f), nullable=f=>v=>v===null||f(v), oneOf=a=>v=>a.includes(v), object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const profile=p=>object(p)&&oneOf(['FULL_MV','SHORT','LOOP_SHORT','SQUARE'])(p.purpose)&&str(p.aspect)&&number(p.fps)&&p.fps>0&&Array.isArray(p.range)&&p.range.length===2&&p.range.every(nonnegative)&&p.range[1]>p.range[0]&&bool(p.loopRequired);
const fields=(v,schema)=>object(v)&&Object.entries(schema).every(([k,f])=>f(v[k]));
const feature=v=>fields(v,{value:x=>x!==undefined,confidence:unit,source:str,status:oneOf(statuses)})&&(v.status==='MEASURED'?v.value!==null:v.value===null&&v.confidence===0)&&(v.limitations===undefined||arrayOf(str)(v.limitations));
const snapshot=v=>fields(v,{inputHash:str,audioHash:nullable(str),imageHashes:arrayOf(str),lyricsHash:str,projectHash:str,rendererVersion:str,outputProfile:profile,userLocks:x=>fields(x,{lockedLines:arrayOf(integer),manualTypography:arrayOf(integer),manualCamera:arrayOf(integer)})});
const metric=v=>fields(v,{id:str,value:nullable(number),unit:str,source:oneOf(['PLAN','CANVAS','ENCODED_MP4','HUMAN']),status:oneOf(statuses),sampleCount:integer,affectedLineIds:arrayOf(integer),confidence:unit,profileId:str,thresholdId:str,method:str,planHash:str,inputHash:str,rendererVersion:str,outputProfile:profile})&&(v.status==='MEASURED'?v.value!==null&&v.sampleCount>0&&v.confidence>0:v.value===null&&v.confidence===0)&&(v.status!=='NOT_APPLICABLE'||str(v.reason));
const evaluation=v=>fields(v,{id:str,planHash:str,candidateSeed:integer,hardFailures:arrayOf(str),measurements:arrayOf(metric),objectives:x=>object(x)&&Object.values(x).every(nullable(number)),lowerTail:nullable(number),constraintViolations:integer,memoryBudgetBytes:nonnegative,timeCostMs:nonnegative})&&new Set(v.measurements.map(m=>m.id)).size===v.measurements.length;
const validators={EvidenceStatus:oneOf(statuses),Feature:feature,ImmutableInputSnapshot:snapshot,SectionFeatures:v=>fields(v,{from:nonnegative,to:nonnegative,energy:feature,beatSalience:feature,onsetDensity:feature,lyricDensity:feature,repetition:feature,role:x=>feature(x)&&(x.value===null||oneOf(['intro','verse','chorus','bridge','climax','outro','unknown'])(x.value))})&&v.to>v.from,DirectionPolicy:v=>fields(v,{mode:oneOf(['cinematic','energetic','minimal','lyric_first','mixed']),stageRole:oneOf(roles),motionBudget:unit,attentionBudget:unit,typographyBudget:unit,desiredChange:unit,confidence:unit,quietIntent:bool}),ShotContract:v=>fields(v,{line:integer,from:nonnegative,to:nonnegative,role:oneOf(roles),grammarId:str,typographyId:str,motionId:str,safeArea:x=>fields(x,{left:unit,right:unit,top:unit,bottom:unit})&&x.left<x.right&&x.top<x.bottom,minReadableFrames:integer,maxOcclusionRatio:unit,reasonCodes:arrayOf(str),featureSources:arrayOf(str),userLocked:bool})&&v.to>v.from,MetricEvidence:metric,CandidateEvaluation:evaluation,RepairResult:v=>fields(v,{previousPlanHash:str,nextPlanHash:str,failuresAddressed:arrayOf(str),operatorId:str,changedLines:arrayOf(integer),unchangedLines:arrayOf(integer),before:evaluation,after:evaluation,accepted:bool,reason:str,artifacts:arrayOf(str)})};
V.validate=(type,value)=>{if(!validators[type])throw new TypeError('Unknown Cinema V3 contract: '+type);if(!validators[type](value))throw new TypeError('Invalid Cinema V3 '+type);return value;};
V.feature=(value,source,confidence=1,status=value===null?'UNMEASURED':'MEASURED')=>V.validate('Feature',{value,status,source,confidence:status==='MEASURED'?confidence:0});
V.clone=value=>J.clonePhotoRenderPlan(value);
// Freeze only owned JSON metadata; never freeze PCM buffers, DOM or codec objects.
V.freezeMetadata=value=>{if(value&&typeof value==='object'){Object.values(value).forEach(V.freezeMetadata);Object.freeze(value);}return value;};
V.outputProfile=(p,range=null)=>{const loop=p.exportSettings?.loopRequired===true,short=!!p.socialHook,aspect=(()=>{const gcd=(a,b)=>b?gcd(b,a%b):a,d=gcd(p.W,p.H);return p.W/d+':'+p.H/d;})();return V.validateProfile({purpose:loop?'LOOP_SHORT':short?'SHORT':aspect==='1:1'?'SQUARE':'FULL_MV',aspect,fps:p.fps,range:[range?.start??p.socialHook?.start??0,range?.end??p.socialHook?.end??p.duration],loopRequired:loop});};
V.validateProfile=p=>{if(!profile(p))throw new TypeError('Invalid Cinema V3 output profile');return p;};
V.profileId=p=>J.canonicalJSON(p);
V.audioHash=async audio=>{const b=audio?.buffer;if(!b?.getChannelData)return null;const parts=[];for(let c=0;c<b.numberOfChannels;c++){const pcm=b.getChannelData(c);parts.push(await J.sha256(new Uint8Array(pcm.buffer,pcm.byteOffset,pcm.byteLength)));}return J.sha256(J.canonicalJSON({sampleRate:b.sampleRate,channels:b.numberOfChannels,length:b.length,parts}));};
V.snapshot=async(project,audio,p,range=null)=>{
 const images=[project.customBg?.dataUrl,...(project.visualAssets||[]).map(a=>a.dataUrl)].filter(Boolean),outputProfile=V.outputProfile(p,range),locked=(p.cuts||[]).filter(c=>c.line>=0&&(c.locked||J.photoChoreographyLocked?.(p,c))).map(c=>c.line);
 const [audioHash,imageHashes,lyricsHash,projectHash]=await Promise.all([V.audioHash(audio),Promise.all(images.map(src=>J.sha256(src))),J.sha256(J.canonicalJSON({lyrics:project.lyrics,timing:project.timing,lines:p.lines})),J.sha256(J.canonicalJSON(project))]);
 const state={audioHash,imageHashes,lyricsHash,projectHash,rendererVersion:V.version,outputProfile,userLocks:{lockedLines:[...new Set(locked)].sort((a,b)=>a-b),manualTypography:locked.slice(),manualCamera:locked.slice()}};
 state.inputHash=await J.sha256(J.canonicalJSON(state));return V.freezeMetadata(V.validate('ImmutableInputSnapshot',state));
};
V.planHash=p=>J.sha256(J.canonicalJSON(p));
V.assertSnapshot=async(expected,project,audio,p,range)=>{const next=await V.snapshot(project,audio,p,range);if(next.inputHash!==expected.inputHash){V.invalidate(p);throw new Error('INPUT_CHANGED');}return next;};
V.invalidate=p=>{p.lastPixelQA=null;delete p.lastQualityTarget;delete p._provenancePlanHash;J.clearPhotoComposition?.(p);};
V.createPlan=async(project,audio,options={})=>{const workingProject=V.clone(project),working=J.plan(workingProject,audio),input=await V.snapshot(project,audio,working,options.range);return {input,working,confirmed:null,planHash:await V.planHash(working)};};
V.evaluate=(...args)=>J.checkMVQuality(...args);
V.repair=(p,acceptance,attempt=1)=>J.repairPhotoBottlenecks(p,acceptance,attempt);
V.confirm=async(session,project,audio,range)=>{await V.assertSnapshot(session.input,project,audio,session.working,range);session.confirmed=V.clone(session.working);session.planHash=await V.planHash(session.confirmed);return session.confirmed;};
})();
/* Hierarchical ranking: values retain their units and missing evidence remains null. */
(()=>{
'use strict';const J=window.J,V=J.cinemaV3,finite=Number.isFinite;
V.metric=(id,value,metadata={})=>{
 const status=metadata.status||(finite(value)&&metadata.sampleCount>0?'MEASURED':'UNMEASURED');
 return V.validate('MetricEvidence',{id,value:status==='MEASURED'?value:null,unit:'score/100',source:'CANVAS',sampleCount:0,affectedLineIds:[],confidence:status==='MEASURED'?1:0,profileId:V.profileId(metadata.outputProfile),thresholdId:'existing-kamen-v2.0.26',method:'existing renderer observation',planHash:'unbound',inputHash:'unbound',rendererVersion:V.version,...metadata,status,...(status==='MEASURED'?{}:{value:null,confidence:0})});
};
V.requiredMetrics=(stage,{allIntentionalHolds=false}={})=>stage==='A'?['rasterSafety']:stage==='B'?['rasterSafety',...allIntentionalHolds?[]:['holdMotion']]:stage==='C'?['rasterSafety','localContrast','lowerTail']:['rasterSafety','localContrast','lowerTail','videoStructure','audioEndpoint'];
V.comparable=(a,b)=>a.unit===b.unit&&a.source===b.source&&a.method===b.method&&a.profileId===b.profileId&&a.inputHash===b.inputHash&&a.rendererVersion===b.rendererVersion;
J.rankCinemaCandidateV2=(candidate,profile,baseline=null)=>{
 V.validate('CandidateEvaluation',candidate);const fail=(reason,extra={})=>({eligible:false,reason,...extra,rankVector:null});
 if(candidate.measurements.some(m=>m.planHash!==candidate.planHash)||new Set(candidate.measurements.map(m=>m.inputHash)).size>1||new Set(candidate.measurements.map(m=>m.rendererVersion)).size>1)return fail('STALE_EVIDENCE');
 if(candidate.measurements.some(m=>m.rendererVersion!==V.version))return fail('STALE_RENDERER');if(candidate.hardFailures.length)return fail('HARD_FAILURE',{failures:candidate.hardFailures});const technical=candidate.measurements.filter(m=>['rasterSafety','videoStructure','audioEndpoint'].includes(m.id)&&m.status==='MEASURED'&&m.value!==100);if(technical.length)return fail('HARD_FAILURE',{failures:technical.map(m=>m.id)});
 const measurements=new Map(candidate.measurements.map(m=>[m.id,m])),required=profile.requiredMetrics||V.requiredMetrics(profile.stage,profile),missing=required.filter(id=>{const m=measurements.get(id);return !m||m.status!=='MEASURED'||m.confidence<=0||m.sampleCount<=0;});
 const failed=required.filter(id=>measurements.get(id)?.status==='FAILED');if(failed.length)return fail('REQUIRED_FAILED',{failed});if(missing.length)return fail('REQUIRED_UNMEASURED',{missing});
 if(candidate.measurements.some(m=>m.profileId!==profile.profileId))return fail('PROFILE_MISMATCH');
 const regressions=[],incomparable=[];
 if(baseline)for(const prior of baseline.measurements){const m=measurements.get(prior.id),protectedMetric=prior.id==='rasterSafety'||prior.id==='localContrast'||(prior.status==='MEASURED'&&prior.value>=(profile.protectionThresholds?.[prior.id]??90));
  if(!protectedMetric||prior.status!=='MEASURED')continue;if(!m||m.status!=='MEASURED'){regressions.push(prior.id);continue;}if(!V.comparable(m,prior)){incomparable.push(prior.id);continue;}if(m.value<prior.value)regressions.push(prior.id);
 }
 if(incomparable.length)return fail('INCOMPARABLE_EVIDENCE',{incomparable});if(regressions.length)return fail('PROTECTED_REGRESSION',{regressions});
 const confidence=Math.min(...required.map(id=>measurements.get(id).confidence)),n=v=>finite(v)?v:-Infinity,o=candidate.objectives;
 return {eligible:true,reason:'MEASURED_COMPARABLE',missing:[],rankVector:[-candidate.constraintViolations,confidence,n(candidate.lowerTail),n(o.readability),n(o.musicFit),n(o.visualCoherence),n(o.contextualVariation),candidate.timeCostStatus==='UNMEASURED'?-Infinity:-candidate.timeCostMs],artistic100Established:false};
};
V.compareRanks=(a,b)=>{for(let i=0;i<a.length;i++)if(a[i]!==b[i])return a[i]>b[i]?-1:1;return 0;};
V.select=(candidates,profile,baseline=null)=>{
 const ranked=candidates.map(c=>({candidate:c,...J.rankCinemaCandidateV2(c,profile,baseline)}));
 const eligible=ranked.filter(c=>c.eligible),dominates=(a,b)=>a.rankVector.every((v,i)=>v>=b.rankVector[i])&&a.rankVector.some((v,i)=>v>b.rankVector[i]);
 const frontier=eligible.filter(b=>!eligible.some(a=>a!==b&&dominates(a,b))).sort((a,b)=>V.compareRanks(a.rankVector,b.rankVector)||(String(a.candidate.id)<String(b.candidate.id)?-1:String(a.candidate.id)>String(b.candidate.id)?1:0));
 return {selected:frontier[0]?.candidate??null,ranked,paretoIds:frontier.map(c=>c.candidate.id),status:frontier.length?'SELECTED':'NO_ELIGIBLE_CANDIDATE'};
};
V.searchEvaluation=(item,p,stage,inputHash='search-local',range=null)=>{
 const profile=V.outputProfile(p,range),r=item.raster,encoded=item.encoded,rows=r?.samples||[],d=encoded?.completed?encoded:null,holds=item.video?.samples||[],allIntentionalHolds=holds.length>0&&holds.every(s=>s.intentionalHold),hardFailures=[];
 if(rows.some(s=>!s.safe))hardFailures.push('RASTER_LYRIC_OR_SAFE_AREA');
 if(d?.layerPresence?.primaryText?.samples?.some(s=>s.visibleSamples<s.samples.length))hardFailures.push('ENCODED_LYRIC_MISSING');
 const base={outputProfile:profile,profileId:V.profileId(profile),planHash:item.planHash||'search-'+item.id,inputHash,sampleCount:rows.length,affectedLineIds:rows.map(s=>s.line),method:'128px production glyph presence and safe area'},measurements=[V.metric('rasterSafety',rows.length?(rows.every(s=>s.safe)?100:0):null,base)];
 measurements.push(V.metric('rasterRank',r?.rank??null,{...base,unit:'legacy-raster-rank'}));
 if(stage!=='A')measurements.push(V.metric('holdMotion',item.video?.score??null,{...base,sampleCount:holds.filter(s=>!s.intentionalHold).length,method:'320px 10fps production HOLD block-flow',...(allIntentionalHolds?{status:'NOT_APPLICABLE',reason:'Every sampled HOLD is intentional'}:{})}));
 if(stage==='C')for(const [id,value,count]of [['localContrast',d?.metrics?.localContrast??null,d?.readability?.sampleCount||0],['lowerTail',d?.lowerTailQuality??null,d?.sceneQuality?.length||0]])measurements.push(V.metric(id,value,{...base,source:'ENCODED_MP4',method:'640px 10fps H264 decode / '+id,sampleCount:count,status:finite(value)&&count?'MEASURED':encoded?.status==='FAILED'?'FAILED':'UNMEASURED'}));
 const lower=stage==='C'?d?.lowerTailQuality??null:stage==='B'?item.video?.score??null:null;
 return {evaluation:V.validate('CandidateEvaluation',{id:String(item.id),planHash:base.planHash,candidateSeed:J.cinemaContentSeed(p),hardFailures,measurements,objectives:{readability:stage==='C'?d?.metrics?.localContrast??null:rows.length?Math.min(...rows.map(s=>s.safe?100:0)):null,musicFit:d?.metrics?.impactBeatSync??null,visualCoherence:null,contextualVariation:null},lowerTail:lower,constraintViolations:hardFailures.length,memoryBudgetBytes:0,timeCostMs:item.timeCostMs??0,timeCostStatus:finite(item.timeCostMs)?'MEASURED':'UNMEASURED',memoryBudgetStatus:'UNMEASURED'}),profile:{stage,profileId:base.profileId,allIntentionalHolds,requiredMetrics:V.requiredMetrics(stage,{allIntentionalHolds}),protectionThresholds:{rasterRank:-Infinity}}};
};
V.searchInputHash=async(p,range,audio)=>J.sha256(J.canonicalJSON({audioHash:await V.audioHash(audio),lyrics:p.lines,image:p.customBg,assets:p.visualAssets,locks:p.directionOverrides7,directives:p.directorLyricDirectives7,profile:V.outputProfile(p,range),rendererVersion:V.version}));
V.selectSearch=(items,p,stage,range=null,inputHash='unbound')=>{const values=items.map(item=>({...V.searchEvaluation(item,p,stage,inputHash,range),item})),baseline=values.find(v=>v.item.id==='baseline'),profile=values[0]?.profile;if(!profile)return {item:null,status:'NO_CANDIDATES',ranked:[]};
 // Applicability is determined once for the output and shared by every candidate.
 profile.allIntentionalHolds=values.every(v=>v.profile.allIntentionalHolds);profile.requiredMetrics=V.requiredMetrics(stage,profile);
 const selection=V.select(values.map(v=>v.evaluation),profile,baseline?.evaluation);return {...selection,item:values.find(v=>v.evaluation===selection.selected)?.item??null};
};
})();

/* Verified repair orchestration around the existing encoder, observer and repair operators. */
(()=>{
'use strict';const J=window.J,V=J.cinemaV3;
const edges={CREATED:['PROXY_MEASURED'],PROXY_MEASURED:['SELECTED'],SELECTED:['FULL_ENCODED'],FULL_ENCODED:['DECODED_QA'],DECODED_QA:['ACCEPTED','REPAIRABLE','UNREPAIRABLE','BUDGET_EXHAUSTED'],REPAIRABLE:['CREATED','BUDGET_EXHAUSTED','UNREPAIRABLE'],ACCEPTED:[],UNREPAIRABLE:[],BUDGET_EXHAUSTED:[]};
V.createState=(inputHash,planHash)=>({state:'CREATED',inputHash,planHash,confirmedPlanHash:null,videoHash:null,history:[{state:'CREATED',planHash}],outcome:null});
V.transition=(state,next,data={})=>{if(!edges[state.state]?.includes(next))throw new Error('INVALID_TRANSITION:'+state.state+'→'+next);Object.assign(state,data,{state:next});state.history.push({state:next,planHash:state.planHash,videoHash:state.videoHash,outcome:state.outcome});return state;};
V.interruptState=(state,reason)=>{if(['ACCEPTED','UNREPAIRABLE','BUDGET_EXHAUSTED'].includes(state.state))return state;state.state='UNREPAIRABLE';state.outcome=reason;state.history.push({state:'UNREPAIRABLE',outcome:reason,planHash:state.confirmedPlanHash});return state;};
V.createResourceScope=()=>{const owned=[],closed={value:false};return {own(resource,dispose){if(closed.value)throw new Error('RESOURCE_SCOPE_CLOSED');owned.push(()=>dispose?dispose(resource):resource?.close?.());return resource;},async dispose(){if(closed.value)return;closed.value=true;const failures=[];for(const close of owned.splice(0).reverse())try{await close();}catch(error){failures.push(String(error));}return failures;}};};
V.restorePlan=(p,snapshot,provenanceHash)=>{for(const key of Object.keys(p))delete p[key];Object.assign(p,V.clone(snapshot));delete p._provenancePlanHash;if(provenanceHash!==undefined)Object.defineProperty(p,'_provenancePlanHash',{value:provenanceHash,configurable:true});J.clearPhotoComposition?.(p);};
V.lockSignature=p=>J.canonicalJSON((p.cuts||[]).filter(c=>c.line>=0&&(c.locked||J.photoChoreographyLocked?.(p,c))).map(c=>({line:c.line,start:c.start,end:c.end,lineText:c.lineText,layout:c.layout,params:c.params,enter:c.enter,exit:c.exit,hold:c.hold,cam:c.cam,decor:c.decor,grammar:c.grammar,assetScene:c.assetScene,semanticIntent:c.semanticIntent})));
V.budgetPolicy=(settings={},memoryGB=typeof navigator!=='undefined'?navigator.deviceMemory:null)=>{const low=Number.isFinite(memoryGB)&&memoryGB<=2;return {stageB:low?4:8,stageC:low?2:3,maxFullEncodes:low?2:5,budgetMs:low?120000:300000,memoryHintGB:memoryGB??null,memoryHintSource:memoryGB==null?'UNMEASURED':'browser coarse deviceMemory estimate',configuredMemoryBudgetBytes:low?134217728:268435456,hardProcessMemoryLimitEnforced:false};};
V.beginRepair=async args=>{if(args.project.exportSettings?.fpsMode==='auto'){const fps=J.chooseAdaptiveFPS(args.project).fps;if(args.plan.fps!==fps){args.plan.fps=fps;V.adaptGrammar?.(args.plan);V.invalidate(args.plan);await J.analyzeRenderedFrames(args.plan,args.range,args.audio,{signal:args.signal});}}const budgetPolicy=V.budgetPolicy(args.project.exportSettings);return {budgetPolicy,input:await V.snapshot(args.project,args.audio,args.plan,args.range),original:V.clone(args.plan),originalProvenanceHash:args.plan._provenancePlanHash,locks:V.lockSignature(args.plan),started:performance.now(),budgetMs:args.cinemaBudgetMs??Math.min(budgetPolicy.budgetMs,Math.max(120000,Math.min(300000,args.plan.duration*15000))),state:null,evaluations:[],resourceScope:V.createResourceScope()};};
V.finalEvaluation=async(result,p,args,session)=>{
 await V.assertSnapshot(session.input,args.project,args.audio,p,args.range);if(V.lockSignature(p)!==session.locks)throw Error('LOCK_CHANGED');
 const planHash=await V.planHash(p),videoHash=await J.sha256(await result.blob.arrayBuffer()),d=p.lastPixelQA?.metrics?.decodedCinema,r=p.lastPixelQA?.metrics?.cinemaFeedback,profile=V.outputProfile(p,args.range),base={outputProfile:profile,profileId:V.profileId(profile),planHash,inputHash:session.input.inputHash,source:'ENCODED_MP4',method:'final-resolution MP4 independent decode',sampleCount:d?.sceneQuality?.length||0},hardFailures=[];
 if(result.provenance?.videoSHA256&&result.provenance.videoSHA256!==videoHash)hardFailures.push('VIDEO_HASH_MISMATCH');
 if(result.validation?.certification?.passed===false)hardFailures.push('VIDEO_STRUCTURE');
 if(d?.loop?.lastFrameIncluded===false)hardFailures.push('MISSING_FINAL_FRAME');if(d?.endingClosure?.sourceAudioEndAligned===false)hardFailures.push('AUDIO_END_MISMATCH');
 if(r?.samples?.some(s=>!s.safe))hardFailures.push('LYRIC_OR_SAFE_AREA');
 if(d?.layerPresence?.primaryText?.samples?.some(s=>s.visibleSamples<s.samples.length))hardFailures.push('ENCODED_LYRIC_MISSING');
 const measurements=[V.metric('rasterSafety',r?.samples?.length?(r.samples.every(s=>s.safe)?100:0):null,{...base,source:'CANVAS',method:'128px production glyph presence and safe area',sampleCount:r?.samples?.length||0}),V.metric('localContrast',d?.metrics?.localContrast??null,{...base,sampleCount:d?.readability?.sampleCount||0}),V.metric('lowerTail',d?.lowerTailQuality??null,base),V.metric('videoStructure',result.validation?.certification?.passed===true?100:null,{...base,method:'MP4 track structure and frame count certification',sampleCount:result.validation?.certification?.passed?1:0,status:result.validation?.certification?.passed===false?'FAILED':undefined})];
 if(args.audio?.buffer)measurements.push(V.metric('audioEndpoint',d?.endingClosure?.sourceAudioEndAligned===true?100:d?.endingClosure?.sourceAudioEndAligned===false?0:null,{...base,method:'decoded AAC duration versus authoritative output range',sampleCount:Number.isFinite(d?.endingClosure?.encodedAudioDuration)?1:0}));
 for(const [id,value]of Object.entries(d?.metrics||{}))if(!measurements.some(m=>m.id===id)&&(Number.isFinite(value)||value===null))measurements.push(V.metric(id,value,base));
 const evaluation={id:videoHash,planHash,candidateSeed:J.cinemaContentSeed(p),hardFailures,measurements,objectives:{readability:d?.metrics?.localContrast??null,musicFit:d?.metrics?.impactBeatSync??null,visualCoherence:null,contextualVariation:null},lowerTail:d?.lowerTailQuality??null,constraintViolations:hardFailures.length,memoryBudgetBytes:V.budgetPolicy(p.exportSettings).configuredMemoryBudgetBytes,timeCostMs:0,timeCostStatus:'UNMEASURED',memoryBudgetStatus:'CONFIGURED_SOFT_BUDGET'};
 V.validate('CandidateEvaluation',evaluation);return {evaluation,videoHash,profile:{stage:'FINAL',profileId:base.profileId,requiredMetrics:['rasterSafety','localContrast','lowerTail','videoStructure',...args.audio?.buffer?['audioEndpoint']:[],...(profile.loopRequired?['loopQuality']:[])]},decodedCompleted:!!d?.completed};
};
J.acceptOrRevertRepair=({before,after,profile,targets=['lowerTail','localContrast'],sameInputs=true,sameLocks=true})=>{
 if(!sameInputs||!sameLocks)return {accepted:false,reason:!sameInputs?'INPUT_CHANGED':'LOCK_CHANGED'};
 const rank=J.rankCinemaCandidateV2(after,profile,before);if(!rank.eligible)return {accepted:false,reason:rank.reason,details:rank};
 const old=new Map(before.measurements.map(m=>[m.id,m]));const improved=after.measurements.filter(m=>targets.includes(m.id)&&m.status==='MEASURED'&&old.get(m.id)?.status==='MEASURED'&&V.comparable(m,old.get(m.id))&&m.value>old.get(m.id).value);
 // Readability and every previously verified high-quality metric are protected by the ranker.
 if(!improved.length)return {accepted:false,reason:'NO_MEASURED_TARGET_IMPROVEMENT'};return {accepted:true,reason:'VERIFIED_TARGET_IMPROVEMENT',improved:improved.map(m=>m.id)};
};
J.proposeTargetedRepairs=(p,acceptance)=>{
 if(!p.lastPixelQA?.metrics?.decodedCinema?.completed)return [];
 return (J.classifyCinemaRepairFailures(p,acceptance)||[]).map(task=>({...task,lines:task.lines.filter(line=>{const c=p.cuts.find(c=>c.line===line);return c&&!c.locked&&!J.photoChoreographyLocked(p,c)&&!(c.grammar?.intentionalHold&&/HOLD|STAGNATION|MOTION|NOVELTY|TYPOGRAPHY_DIVERSITY/.test(task.code));}),stage:(p.musicalPhoto?.cinema?.repairEscalation?.[task.code]?.occurrences||0)===0?'MICRO':(p.musicalPhoto?.cinema?.repairEscalation?.[task.code]?.occurrences||0)===1?'ARCHITECTURE':'GRAMMAR_RESET'})).filter(task=>task.lines.length);
};
V.rebuildAfterRepair=p=>{const f=p.musicalPhoto?.cinema;if(!f)return;const shifted=new Map((f.beatTimingRepair?.records||[]).map(r=>[r.line,p.cuts.find(c=>c.line===r.line)?.grammar?.temporal?.hit]));J.rebuildCinemaBeatIntent?.(p);for(const [line,hit]of shifted)if(Number.isFinite(hit))p.cuts.find(c=>c.line===line).grammar.temporal.hit=hit;if(f.grammar)f.grammar.shots=(p.cuts||[]).filter(c=>c.grammar).map(c=>({line:c.line,from:c.start,to:c.end,...V.clone(c.grammar)}));for(const s of p.storyboard||[]){const c=p.cuts.find(c=>c.start===s.from);if(c?.grammar&&!s.locked)s.shotGrammar=V.clone(c.grammar);}V.invalidate(p);};
V.applyRepair=(p,acceptance,attempt)=>{const tasks=J.proposeTargetedRepairs(p,acceptance),allowed=new Set(tasks.flatMap(t=>t.lines)),before=V.clone(p),hash=p._provenancePlanHash;if(!allowed.size)return {changes:[],reason:'NO_MEASURED_REPAIRABLE_LINES'};const locks=V.lockSignature(p),changes=J.repairPhotoBottlenecks(p,acceptance,attempt,{tasks}),changed=(p.cuts||[]).filter((c,i)=>J.canonicalJSON(c)!==J.canonicalJSON(before.cuts[i])).map(c=>c.line),master=J.canonicalJSON(before.musicalPhoto?.cinema?.visualDNA?.master??null);if(changed.some(line=>!allowed.has(line))||locks!==V.lockSignature(p)||master!==J.canonicalJSON(p.musicalPhoto?.cinema?.visualDNA?.master??null)){V.restorePlan(p,before,hash);return {changes:[],reason:'OUT_OF_SCOPE_OR_LOCKED_REPAIR_REVERTED'};}V.rebuildAfterRepair(p);return {changes,tasks,changedLines:changed,unchangedLines:(p.cuts||[]).map(c=>c.line).filter(line=>!changed.includes(line)),reason:'TARGETED_RENDER_CHANGE'};};
V.observeRepair=async(session,args,result,best)=>{
 const evidence=await V.finalEvaluation(result,args.plan,args,session),state=V.createState(session.input.inputHash,evidence.evaluation.planHash);
 if(args.plan.lastPixelQA?.completed)V.transition(state,'PROXY_MEASURED',{proxyStatus:'MEASURED'});else{V.interruptState(state,'PROXY_UNMEASURED');session.state=state;return {...evidence,accepted:false,reason:'PROXY_UNMEASURED'};}
 V.transition(state,'SELECTED');V.transition(state,'FULL_ENCODED',{videoHash:evidence.videoHash});
 if(!evidence.decodedCompleted){V.interruptState(state,'DECODED_QA_UNMEASURED');session.state=state;return {...evidence,accepted:false,reason:'DECODED_QA_UNMEASURED'};}
 V.transition(state,'DECODED_QA');const decision=best?J.acceptOrRevertRepair({before:best.v3.evaluation,after:evidence.evaluation,profile:evidence.profile}):{accepted:true,reason:'INITIAL_ARTIFACT_RETAINED_AS_DRAFT'};
 const eligible=J.rankCinemaCandidateV2(evidence.evaluation,evidence.profile).eligible;session.state=state;session.evaluations.push({planHash:state.planHash,videoHash:state.videoHash,eligible,decision,stateHistory:state.history});return {...evidence,...decision,eligible};
};
J.generateCinemaCandidates=(p)=>[{id:'baseline',plan:V.clone(p)},...(p.musicalPhoto?.cinema?.architecture?J.cinemaArchitectureCandidates(p).map(candidate=>{const plan=V.clone(p);J.applyCinemaArchitecture(plan,candidate);return {id:String(candidate.id),plan};}):[])];
J.assessCandidatePreview=async(candidate,range,signal)=>{const p=candidate.plan,raster=await J.measureCinemaSequence(p,range),video=await J.measureCinemaVideoProxy(p,range,signal);return {...candidate,raster,video};};
J.exportAndObserveCandidate=args=>J.exportMP4({...args,cinemaV3:true});
V.repair=args=>J.exportAndObserveCandidate(args);
})();

/* Confidence-aware grammar extension. The authoritative lyric/audio ranges never move. */
(()=>{
'use strict';const J=window.J,V=J.cinemaV3,C=J.clamp,mean=a=>a.length?a.reduce((x,y)=>x+y,0)/a.length:null;
V.sectionFeatures=(p,audio)=>{
 const energy=Array.from(audio?.energy||[]),peak=energy.length?energy.reduce((m,v)=>Number.isFinite(v)?Math.max(m,v):m,0):0,rate=audio?.energyRate||energy.length/(audio?.duration||p.duration),tempo=audio?.tempoConfidence??audio?.features?.tempoConfidence,energyConfidence=audio?.features?.statistics?.energy?.confidence;
 const sections=p.musicalStructure?.sections?.length?p.musicalStructure.sections:[{from:0,to:p.duration}];
 return sections.map(s=>{const values=rate?energy.slice(Math.floor(s.from*rate),Math.ceil(s.to*rate)).filter(Number.isFinite):[],beats=(p.beatHierarchy||[]).filter(b=>b.time>=s.from&&b.time<s.to),lyrics=(p.lines||[]).filter(l=>l.start>=s.from&&l.start<s.to),texts=lyrics.map(l=>String(l.text).trim()),duration=s.to-s.from,onsets=Array.from(audio?.onset||[]).slice(Math.floor(s.from*rate),Math.ceil(s.to*rate)),confidence=values.length?(Number.isFinite(energyConfidence)?C(energyConfidence):Math.min(.85,values.length/(values.length+20))):0;
 const result={from:s.from,to:s.to,energy:V.feature(values.length?(peak?mean(values)/peak:0):null,'decodedPCM normalized envelope',confidence),beatSalience:V.feature(beats.length&&Number.isFinite(tempo)&&tempo>0?mean(beats.map(b=>b.beatSalience).filter(Number.isFinite)):null,'existing beat hierarchy; tempo autocorrelation confidence',Number.isFinite(tempo)?C(tempo):0),onsetDensity:V.feature(onsets.length?onsets.filter(x=>x>0).length/Math.max(.001,duration):null,'decodedPCM positive onset bins / seconds',onsets.length?confidence:0),lyricDensity:V.feature(texts.reduce((n,t)=>n+Array.from(t).length,0)/Math.max(.001,duration),'authoritative lyric characters / seconds',1),repetition:V.feature(texts.length?1-new Set(texts).size/texts.length:0,'exact authoritative phrase repetition',1),role:V.feature(Number.isFinite(s.confidence)&&s.confidence>0&&['intro','verse','chorus','bridge','climax','outro'].includes(s.role)?s.role:null,'existing section analysis; uncertain role remains unknown',Number.isFinite(s.confidence)?C(s.confidence):0)};
 result.energy.limitations=['Envelope confidence is sampling coverage / existing analysis confidence, not genre or perceptual certainty'];return V.validate('SectionFeatures',result);
 });
};
V.directionPolicy=(features,index,count)=>{
 const e=features.energy.value,beat=features.beatSalience,density=features.lyricDensity.value,quiet=e!==null&&e<.3&&density<8,confidence=features.energy.confidence,knownBeat=beat.status==='MEASURED'&&beat.confidence>=.35;
 const stageRole=quiet?'sustain':index===0?'introduce':index===count-1?'resolve':features.role.value==='bridge'?'contrast':'develop';
 return V.validate('DirectionPolicy',{mode:e===null||!knownBeat?'lyric_first':quiet?'minimal':e>.7?'energetic':'cinematic',stageRole,motionBudget:C((e??.25)*.65*(knownBeat?1:.5)),attentionBudget:C(1-density/30),typographyBudget:C(1-density/40),desiredChange:quiet?0:C((e??.25)*.5),confidence,quietIntent:quiet});
};
V.phases=(c,fps)=>{const from=c.start,to=c.end,dur=Math.max(0,to-from),frame=1/fps,enter=Math.min(dur*.12,.12),settle=Math.min(dur*.15,Math.max(frame,.05+Array.from(c.lineText||'').length*.002)),release=Math.min(dur*.12,.2),exit=Math.min(dur*.06,frame);return {PREPARE:[Math.max(0,from-Math.min(.15,dur*.1)),from],ENTER:[from,from+enter],SETTLE:[from+enter,Math.min(to-release-exit,from+enter+settle)],HOLD:[Math.min(to-release-exit,from+enter+settle),to-release-exit],RELEASE:[to-release-exit,to-exit],EXIT:[to-exit,to]};};
V.phaseAt=(phases,t)=>Object.keys(phases).find(key=>t>=phases[key][0]&&t<phases[key][1])||(t<phases.ENTER[0]?'PREPARE':'EXIT');
V.typographyPreflight=(p,c)=>{
 const text=J.composeLyricPhrase(String(c.lineText||c.text||'')),font=c.params?.font||'embedded_bold',cv=document.createElement('canvas'),ctx=cv.getContext?.('2d');
 try{if(typeof ctx?.measureText!=='function')return {text,font,size:null,lineCount:text.split('\n').length,widths:null,widthStatus:'UNMEASURED',safeArea:{left:.11,right:.89,top:.08,bottom:.92},minReadableFrames:Math.ceil(Math.min(2,Math.max(.15,Array.from(text).length/20))*p.fps),availableFrames:Math.max(0,Math.floor((c.end-c.start)*p.fps)),constraintFailures:['CANVAS_TEXT_MEASUREMENT_UNAVAILABLE'],fontCoverage:V.feature(null,'Canvas text measurement unavailable',0),rubyPresent:/[《》｜]|<ruby\b/i.test(text),source:'UNMEASURED: no Canvas text measurement capability'};const safeArea={left:.11,right:.89,top:.08,bottom:.92},width=p.W*(safeArea.right-safeArea.left),height=p.H*(safeArea.bottom-safeArea.top),size=J.fitSize(text,font,width,height,{lead:1.12,track:.015});ctx.font=J.fontCSS(font,size);const rows=text.split('\n'),widths=rows.map(row=>ctx.measureText(row).width),chars=Array.from(text.replace(/\s/g,'')).length,minSeconds=Math.min(2,Math.max(.15,chars/20)),minReadableFrames=Math.ceil(minSeconds*p.fps),availableFrames=Math.max(0,Math.floor((c.end-c.start)*p.fps)),fontKnown=!!J.FONTS[font];
 return {text,font,size,lineCount:rows.length,widths,safeArea,minReadableFrames,availableFrames,constraintFailures:[...widths.some(w=>w>width+1)?['TEXT_WIDTH']:[],...availableFrames<minReadableFrames?['READ_DURATION_UNMET']:[],...!fontKnown?['FONT_UNKNOWN']:[]],fontCoverage:V.feature(null,'Font availability is not per-character cmap coverage; final glyph raster required',0),rubyPresent:/[《》｜]|<ruby\b/i.test(text),source:'existing composeLyricPhrase / fitSize / browser text measurement; no input rewrite'};
 }finally{cv.width=cv.height=1;}
};
V.adaptPlan=(p,audio,project)=>{if(!V.enabled)return p;const features=V.sectionFeatures(p,audio);p.cinemaV3Features={sections:features,imageSaliency:V.feature(null,'No verified subject segmentation or calibrated saliency confidence',0),inputMode:!project.customBg?.enabled?'no-image':(p.visualAssets||[]).filter(a=>a.dataUrl).length>1?'multi-image':'single-image',vocalSynchronization:V.feature(null,'No vocal separation or sung onset detector',0)};return V.adaptGrammar(p);};
V.adaptGrammar=p=>{
 if(!V.enabled||!p.cinemaV3Features)return p;const sections=p.cinemaV3Features.sections,policies=sections.map((s,i)=>V.directionPolicy(s,i,sections.length));
 for(const c of p.cuts||[]){if(c.line<0||c.locked||J.photoChoreographyLocked?.(p,c))continue;const i=Math.max(0,sections.findIndex(s=>c.start>=s.from&&c.start<s.to)),policy=policies[i],preflight=V.typographyPreflight(p,c),g=c.grammar;
 c.cinemaV3Shot=V.validate('ShotContract',{line:c.line,from:c.start,to:c.end,role:policy.stageRole,grammarId:g?.field||c.layout||'legacy',typographyId:preflight.font,motionId:g?.temporal?.motionPrinciple||c.hold||'still',safeArea:preflight.safeArea,minReadableFrames:preflight.minReadableFrames,maxOcclusionRatio:0,reasonCodes:[policy.mode,...preflight.constraintFailures],featureSources:['authoritative LRC','normalized PCM envelope'],userLocked:false});c.cinemaV3Typography=preflight;
 if(!g)continue;g.directionPolicy=policy;g.scenePhases=V.phases(c,p.fps);g.intentionalHold=g.intentionalHold===true||g.quiet===true||g.temporal?.motionPrinciple==='weighted-hold'||policy.quietIntent;
 if(g.temporal&&policy.mode==='lyric_first'){g.temporal.level=Math.min(g.temporal.level,Math.max(.15,policy.motionBudget));g.motion=g.temporal.level;}
 }
 const f=p.musicalPhoto?.cinema;if(f?.grammar)f.grammar.shots=p.cuts.filter(c=>c.grammar).map(c=>({line:c.line,from:c.start,to:c.end,...V.clone(c.grammar)}));for(const s of p.storyboard||[]){const c=p.cuts.find(c=>c.start===s.from);if(c?.grammar&&!s.locked)s.shotGrammar=V.clone(c.grammar);}return p;
};
})();
