/* Cinema V3 contracts and adapters. Existing renderer and save formats stay authoritative. */
(()=>{
'use strict';
const J=window.J, V=J.cinemaV3={version:'3.0.0',enabled:true}, finite=Number.isFinite;
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
V.outputProfile=(p,range=null)=>{const loop=p.exportSettings?.loopRequired===true,short=!!p.socialHook,aspect=p.W===p.H?'1:1':p.H>p.W?'9:16':'16:9';return V.validateProfile({purpose:loop?'LOOP_SHORT':short?'SHORT':aspect==='1:1'?'SQUARE':'FULL_MV',aspect,fps:p.fps,range:[range?.start??p.socialHook?.start??0,range?.end??p.socialHook?.end??p.duration],loopRequired:loop});};
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
 if(candidate.hardFailures.length)return fail('HARD_FAILURE',{failures:candidate.hardFailures});
 const measurements=new Map(candidate.measurements.map(m=>[m.id,m])),required=profile.requiredMetrics||V.requiredMetrics(profile.stage,profile),missing=required.filter(id=>{const m=measurements.get(id);return !m||m.status!=='MEASURED'||m.confidence<=0||m.sampleCount<=0;});
 if(missing.length)return fail('REQUIRED_UNMEASURED',{missing});
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
