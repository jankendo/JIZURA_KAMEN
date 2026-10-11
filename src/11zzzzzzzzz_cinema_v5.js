/* Cinema V5: safety is a constraint; creative utility is a disclosed partial comparison. */
(()=>{'use strict';
const J=window.J,V=J.cinemaV3,F=Number.isFinite;
const Q=J.cinemaV5={version:'5.0.0',humanStatus:'HUMAN_UNVERIFIED'};
V.version=Q.version;
Q.selectionPolicy=Object.freeze({version:'selection-v2.0',calibration:'PROVISIONAL_NOT_HUMAN_CALIBRATED',
 rationale:'Retain exact measured readability protection. Permit at most two score/100 points in non-safety creative domains, only with compatible observations and a larger measured utility gain. Validate synthetic counterexamples; independent human calibration pending.',
 minUtilityGain:.25,creativeSlack:2,weights:{readability:.20,lowerTail:.16,musicFit:.14,visualCoherence:.10,contextualVariation:.08,typographyQuality:.08,structuralDevelopment:.08,motionRealization:.06,regionalNovelty:.05,temporalContrast:.05}});
const ids={readability:['frameAlignedOutputReadability','localContrast','outputReadability'],lowerTail:['lowerTail','holdMotion'],musicFit:['musicFitV2','impactBeatSync'],visualCoherence:['visualCoherence'],contextualVariation:['contextualVariation'],typographyQuality:['typographyQuality'],structuralDevelopment:['structuralDevelopment'],motionRealization:['motionRealizationV2'],regionalNovelty:['regionalNoveltyV2'],temporalContrast:['temporalContrastV2']};
const safetyId=id=>/^(rasterSafety|videoStructure|audioEndpoint|audioIntegrity|lyricIntegrity|lyricTiming|localContrast|outputReadability|frameAlignedOutputReadability|decodedPhysicalContrast@|decodedFrameAlignedContrast@|decodedLocalContrast@)/.test(id);
const oldComparable=V.comparable;
V.comparable=(a,b)=>oldComparable(a,b)&&a.sampleCount===b.sampleCount&&Math.abs(a.confidence-b.confidence)<=.05&&J.canonicalJSON([...new Set(a.affectedLineIds)].sort((x,y)=>x-y))===J.canonicalJSON([...new Set(b.affectedLineIds)].sort((x,y)=>x-y));
Q.creativeEvidence=candidate=>{
 const map=new Map(candidate.measurements.map(m=>[m.id,m])),domains={},missing=[];let utility=0,coverage=0;
 for(const [domain,weight]of Object.entries(Q.selectionPolicy.weights)){
  const evidence=ids[domain].map(id=>map.get(id)).find(m=>m?.status==='MEASURED'&&['score/100','index/1'].includes(m.unit)&&F(m.value)&&m.confidence>0&&m.sampleCount>0);
  domains[domain]=evidence||null;
  if(evidence){utility+=weight*evidence.value*(evidence.unit==='index/1'?100:1);coverage+=weight;}else missing.push({domain,status:'UNMEASURED',weight,selectionImpact:'Excluded from measured utility; unresolved contribution retained in coverage and aggregate certification.'});
 }
 return {domains,measuredUtility:coverage?utility:null,coverage,missing,aggregateStatus:missing.length?'UNMEASURED':'MEASURED',calibration:Q.selectionPolicy.calibration,humanStatus:Q.humanStatus};
};
const safetyRank=J.rankCinemaCandidateV2;
J.rankCinemaCandidateV2=(candidate,profile,baseline=null)=>{
 const rank=safetyRank(candidate,profile,baseline);if(!rank.eligible)return {...rank,stage:'NON_NEGOTIABLE_SAFETY',policyVersion:Q.selectionPolicy.version};
 const creative=Q.creativeEvidence(candidate),prior=baseline?Q.creativeEvidence(baseline):null,tradeoffs=[],uncertain=[];
 if(prior)for(const [domain,previous]of Object.entries(prior.domains)){
  const next=creative.domains[domain];
  if(!previous){if(next)uncertain.push({domain,reason:'BASELINE_UNMEASURED; not an improvement claim'});continue;}
  if(!next||!V.comparable(next,previous))return {eligible:false,reason:next?'INCOMPARABLE_EVIDENCE':'REQUIRED_UNMEASURED',stage:'CREATIVE_COMPARISON',missing:[domain],rankVector:null,creative};
  const difference=next.value-previous.value;
  if(difference<0){tradeoffs.push({domain,before:previous.value,after:next.value,difference,policyVersion:Q.selectionPolicy.version});
   if(safetyId(next.id)||difference<-Q.selectionPolicy.creativeSlack*(next.unit==='index/1'?.01:1))return {eligible:false,reason:'PROTECTED_REGRESSION',stage:'CREATIVE_FLOOR',regressions:[domain],rankVector:null,tradeoffs};}
 }
 const vector=Object.values(creative.domains).map(m=>m?.value??null);
 return {...rank,stage:'CREATIVE_OPTIMIZATION',creative,tradeoffs,uncertain,policyVersion:Q.selectionPolicy.version,rankVector:vector,artistic100Established:false};
};
V.select=(candidates,profile,baseline=null)=>{
 const ranked=candidates.map(candidate=>({candidate,...J.rankCinemaCandidateV2(candidate,profile,baseline)})),eligible=ranked.filter(c=>c.eligible);
 const comparable=(a,b)=>Object.keys(a.creative.domains).every(k=>{const x=a.creative.domains[k],y=b.creative.domains[k];return x&&y?V.comparable(x,y):!x&&!y;});
 const dominates=(a,b)=>comparable(a,b)&&a.rankVector.every((v,i)=>v===null||v>=b.rankVector[i])&&a.rankVector.some((v,i)=>v!==null&&v>b.rankVector[i]);
 const frontier=eligible.filter(b=>!eligible.some(a=>a!==b&&dominates(a,b)));
 const cost=c=>c.candidate.timeCostStatus==='MEASURED'?c.candidate.timeCostMs:null;
 frontier.sort((a,b)=>{
  if(comparable(a,b)&&a.creative.measuredUtility!==b.creative.measuredUtility)return (b.creative.measuredUtility??-Infinity)-(a.creative.measuredUtility??-Infinity);
  if(!comparable(a,b)){if(a.candidate===baseline)return -1;if(b.candidate===baseline)return 1;}
  if(comparable(a,b)&&cost(a)!==null&&cost(b)!==null&&cost(a)!==cost(b))return cost(a)-cost(b);
  return String(a.candidate.id)<String(b.candidate.id)?-1:String(a.candidate.id)>String(b.candidate.id)?1:0;
 });
 return {selected:frontier[0]?.candidate??null,ranked,paretoIds:frontier.map(c=>c.candidate.id),status:frontier.length?'SELECTED':'NO_ELIGIBLE_CANDIDATE',policy:Q.selectionPolicy,humanStatus:Q.humanStatus};
};
J.acceptOrRevertRepair=({before,after,profile,sameInputs=true,sameLocks=true})=>{
 if(!sameInputs||!sameLocks)return {accepted:false,reason:!sameInputs?'INPUT_CHANGED':'LOCK_CHANGED'};
 const rank=J.rankCinemaCandidateV2(after,profile,before);if(!rank.eligible)return {accepted:false,reason:rank.reason,details:rank};
 const prior=Q.creativeEvidence(before),next=rank.creative,common=Object.keys(prior.domains).filter(k=>prior.domains[k]&&next.domains[k]);
 const gain=common.reduce((sum,k)=>sum+Q.selectionPolicy.weights[k]*(next.domains[k].value-prior.domains[k].value)*(next.domains[k].unit==='index/1'?100:1),0);
 const improved=common.filter(k=>next.domains[k].value>prior.domains[k].value);
 if(gain<=Q.selectionPolicy.minUtilityGain||!improved.length)return {accepted:false,reason:'NO_MEASURED_TARGET_IMPROVEMENT',gain,unmeasured:next.missing};
 return {accepted:true,reason:'VERIFIED_TARGET_IMPROVEMENT',gain,improved,tradeoffs:rank.tradeoffs,unmeasured:next.missing,policyVersion:Q.selectionPolicy.version,calibration:Q.selectionPolicy.calibration};
};
})();
