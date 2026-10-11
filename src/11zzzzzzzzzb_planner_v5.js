/* Music-led, confidence-labelled roles. This does not invent image subjects or impose an arc. */
(()=>{'use strict';const J=window.J,V=J.cinemaV3,Q=J.cinemaV5,C=J.clamp;
const cache=new Map();
J.cinemaSemanticLyricLayout=(p,c,ctx)=>{
 const W=p.W,H=p.H,single=!c.grammar&&/^cinema(Response|Converge|Wave|Expand|Read|Impact)$/.test(c.layout||''),mode=single?c.layout.slice(6).toLowerCase():c.grammar?.mode||'read',stage=c.grammar?.stage||0,font=c.params?.font||'embedded_bold';
 let width=W*(mode==='voice'?.62:stage?.50+.075*stage:mode==='ground'?.78:.72),height=H*(stage===3?.60:mode==='openSky'?.35:.45),lead=stage===3?1.15:mode==='ground'?1.10:1.26,cap=H*(H>W?(stage===4?.13:.105):stage===4?.22:mode==='ground'?.20:mode==='voice'?.15:.175);
 if(single){width=W*(c.cinema?.development?.occupancy||.70);height=H*.48;lead=mode==='wave'?1.5:mode==='impact'||mode==='expand'?1.22:1.32;cap=H*(H>W?(mode==='read'?.09:.11):mode==='read'?.135:mode==='expand'?.195:mode==='impact'?.185:.155);}
 try{ctx??=document.createElement('canvas').getContext('2d');}catch{}
 const text=String(c.lineText??c.text??'');let probe=null;if(typeof ctx?.measureText==='function'){const previousFont=ctx.font;ctx.font=J.fontCSS(font,48);try{probe=ctx.measureText('Hgあ').width;}finally{ctx.font=previousFont;}}
 const key=JSON.stringify([text,font,W,H,mode,stage,width,height,lead,cap,probe,!!c.locked,!!J.photoChoreographyLocked?.(p,c)]);
 if(cache.has(key))return J.clonePhotoRenderPlan(cache.get(key));
 const result={...J.semanticLyricLayout(text,{font,size:cap,maxWidth:width,maxHeight:height,lead,track:single?(mode==='expand'?.025:.012):.015,ctx,manual:!!c.locked||!!J.photoChoreographyLocked?.(p,c)}),font,lead,track:single?(mode==='expand'?.025:.012):.015};
 if(probe!==null){if(cache.size>=128)cache.clear();cache.set(key,J.clonePhotoRenderPlan(result));}return result;
};
const preflight=V.typographyPreflight;
V.typographyPreflight=(p,c)=>{
 const old=preflight(p,c),r=J.cinemaSemanticLyricLayout(p,c);
 return {...old,text:r.text,size:r.size,lineCount:r.rows.length,widths:r.status==='MEASURED'?r.widths:null,widthStatus:r.status,semanticLayout:r,source:'shared semantic renderer/QA layout; actual font probe invalidates cache',constraintFailures:[...old.constraintFailures.filter(id=>id!=='TEXT_WIDTH'),...r.status==='MEASURED'&&!r.fits?['TEXT_WIDTH']:[]]};
};
Q.planVisualGrammar=p=>{
 if(p.cinemaCandidateMode==='legacy'||!p.cinemaV3Features)return p;
 const sections=p.cinemaV3Features.sections||[],energies=sections.map(s=>s.energy.value).filter(Number.isFinite),peak=energies.length?Math.max(...energies):null,median=energies.length?[...energies].sort((a,b)=>a-b)[Math.floor(energies.length/2)]:null;let previous=null;const repeats=new Map(),shots=[];
 const inputMode=p.cinemaV3Features.inputMode,segmentation=p.verifiedSubjectSegmentation;
 const subjectTrusted=segmentation?.status==='MEASURED'&&segmentation.confidence>=.8&&segmentation.maskValidated===true;
 p.cinemaV5World={inputMode,mode:inputMode==='no-image'?'existing-non-image':inputMode==='multi-image'?'image-sequence-composition':subjectTrusted?'verified-subject-layer':'composition-and-typography',subjectSegmentation:subjectTrusted?{status:'MEASURED',confidence:segmentation.confidence}:{status:'UNMEASURED',confidence:0,reason:'Connected edges/regions are not subject recognition'},layerPermission:subjectTrusted,depth:{status:'UNMEASURED',reason:'No measured depth'},limits:'Focus anchors are composition heuristics. No guaranteed face, person, subject or depth.'};
 for(const c of p.cuts||[]){
  if(c.line<0||c.locked||c.cinemaV3LegacyFinalist||J.photoChoreographyLocked?.(p,c))continue;
  const s=sections.find(s=>c.start>=s.from&&c.start<s.to),e=s?.energy?.value,confidence=s?.energy?.confidence??0,density=s?.lyricDensity?.value??null,text=String(c.lineText??c.text??''),repeat=repeats.get(text)||0,quiet=e!==null&&e!==undefined&&e<.3&&density!==null&&density<8;
  let role='sustain',reasons=['musical-context'];
  if(confidence>=.35&&e!==null){
   if(quiet){role='sustain';reasons.push('measured-low-energy; deliberate-space');}
   else if(peak!==null&&median!==null&&peak>median+.1&&e>=peak-.02&&e>.65){role='peak';reasons.push('relative-song-energy-peak');}
   else if(previous!==null&&e<previous-.2){role='contrast';reasons.push('measured-energy-drop');}
   else if(previous!==null&&e>previous+.12){role='develop';reasons.push('measured-energy-build');}
   else if(s?.role?.value==='intro')role='introduce';
   else if(s?.role?.value==='outro')role='resolve';
   else role='sustain';
  }else reasons.push('low-confidence; lyric-first fallback');
  if(repeat){reasons.push(quiet?'intentional-repetition-preserved':'repeated-phrase-in-current-musical-role');}
  const grammar=c.grammar||{},type=grammar.motionContract?.type||(/^(converge|expand|reveal|settle|impact)$/.test(c.cinema?.mode)?c.cinema.mode:null),contract=type?{type,time:type==='impact'?grammar.temporal?.hit??c.start:null,fps:p.fps,source:'existing renderer operator'}:null;
  const direction={role,intention:quiet?'hold-and-read':role==='peak'?'musical-emphasis':role==='contrast'?'space-after-energy':'phrase-development',confidence,grammar:grammar.mode||c.layout,typography:{font:c.params?.font,semanticLayout:'shared-v2',status:'MEASURED_GEOMETRY; HUMAN_UNVERIFIED'},spatialComposition:{anchor:c.params?.photoAnchor??{x:.5,y:.5},source:'existing constrained composition',subjectClaim:false},motion:{operator:type||'existing-motion',contract},transition:{source:'existing transition',musicalBoundary:s?.from??null},quietIntent:quiet,repetitionIndex:repeat,reasons,semanticMeaning:{status:'UNMEASURED',reason:'No calibrated semantic model; musical features lead'}};
  c.cinemaV5Direction=direction;if(c.cinemaV3Shot)c.cinemaV3Shot.role=role;
  direction.repetitionDevelopment={applied:repeat>0&&confidence>=.35&&Number.isFinite(previous)&&Number.isFinite(e)&&e>previous+.12,reason:repeat?'Measured energy development permits stronger composition; otherwise preserve phrase continuity':'First occurrence'};
  if(c.grammar){c.grammar.stage=quiet?0:direction.repetitionDevelopment.applied?2:role==='peak'?4:role==='contrast'?0:role==='resolve'?2:role==='develop'?1:0;c.grammar.intentionalHold=quiet||c.grammar.intentionalHold===true;c.grammar.directionPolicy={...c.grammar.directionPolicy,quietIntent:quiet};}
  shots.push({line:c.line,from:c.start,to:c.end,...direction});repeats.set(text,repeat+1);if(Number.isFinite(e))previous=e;
 }
 p.cinemaV5Story={version:Q.version,shots,humanStatus:Q.humanStatus,arcForced:false,randomEffectCombination:false,manualSettingsPriority:true};return p;
};
const adaptPlan=V.adaptPlan;V.adaptPlan=(p,audio,project)=>{const confidence=audio?.tempoConfidence??audio?.features?.tempoConfidence;p.cinemaV5MusicalEvidence={tempo:{status:Number.isFinite(confidence)?'MEASURED':'UNMEASURED',confidence:Number.isFinite(confidence)?C(confidence):null,source:'source PCM tempo autocorrelation confidence'}};return adaptPlan(p,audio,project);};
const adapt=V.adaptGrammar;
V.adaptGrammar=p=>{const out=adapt(p);Q.planVisualGrammar(out);for(const c of out.cuts||[])if(c.cinemaV5Direction)c.cinemaV3Typography=V.typographyPreflight(out,c);return out;};
const layered=J.drawLayeredCinema;
J.drawLayeredCinema=(R,ctx,p,...args)=>{
 const c=J.cutAt(p,args[0]),manual=!!c&&(c.locked||J.photoChoreographyLocked?.(p,c));if(p.cinemaV5World&&!p.cinemaV5World.layerPermission&&!manual)return false;
 return layered(R,ctx,p,...args);
};
const proposals=J.proposeTargetedRepairs;
J.proposeTargetedRepairs=(p,acceptance)=>{
 const tasks=proposals(p,acceptance),rank=t=>Number(/READ|CONTRAST|CLIP|MISSING/.test(t.code||''))*10+(t.severity??0);
 return tasks.map((t,i)=>({...t,v5:{policy:'cause-specific-minimal-repair-v2',priority:rank(t),order:i,cause:t.code,affectedLines:[...t.lines],observationSource:'decoded failure classification',stage:t.stage,lockPolicy:'untouched',additionalEncodeBudget:0}})).sort((a,b)=>b.v5.priority-a.v5.priority||a.v5.order-b.v5.order);
};
const observe=V.observeRepair;
V.observeRepair=async(session,args,result,best)=>{
 const r=await observe(session,args,result,best),rank=J.rankCinemaCandidateV2(r.evaluation,r.profile);
 const safetyStatus=rank.eligible&&r.decodedCompleted?'PASS':['HARD_FAILURE','REQUIRED_FAILED'].includes(rank.reason)?'FAIL':'UNVERIFIED';r.safetyStatus=safetyStatus;
 const ledger={policy:Q.selectionPolicy.version,before:best?.v3?.evaluation??null,after:r.evaluation,accepted:r.accepted===true&&safetyStatus!=='FAIL',reason:r.reason,safetyStatus,videoHash:r.videoHash,planHash:r.evaluation.planHash,unmeasured:Q.creativeEvidence(r.evaluation).missing,humanStatus:Q.humanStatus};
 const record=session.evaluations.at(-1);if(record?.videoHash===r.videoHash)record.cinemaV5=ledger;else session.evaluations.push({planHash:r.evaluation.planHash,videoHash:r.videoHash,eligible:false,decision:{accepted:false,reason:r.reason},stateHistory:session.state?.history||[],cinemaV5:ledger});r.repairEvidence=ledger;
 if(safetyStatus==='FAIL'&&best){r.accepted=false;r.reason=rank.reason;ledger.accepted=false;ledger.reason=rank.reason;return r;}
 if(safetyStatus==='FAIL')throw Object.assign(Error('CINEMA_V5_UNSAFE_ARTIFACT'),{code:'CINEMA_V5_UNSAFE_ARTIFACT',evidence:ledger});
 return r;
};
Q.guardExport=async(result,args)=>{
 const videoHash=result.provenance?.videoSHA256,history=result.provenance?.cinemaV3?.history||[],selected=history.find(h=>h.videoHash===videoHash),audit=selected?.cinemaV5?.after?.audioEvidence??await Q.auditDecodedAudio(result.blob,args.audio,args.range,args.signal);
 if(result.validation?.certification?.passed===false||audit.status==='FAILED')throw Object.assign(Error('CINEMA_V5_UNSAFE_EXPORT'),{code:'CINEMA_V5_UNSAFE_EXPORT',audioEvidence:audit});
 const measurements=selected?.cinemaV5?.after?.measurements||[],required=['lyricIntegrity','lyricTiming'],missing=required.filter(id=>!measurements.some(m=>m.id===id&&m.status==='MEASURED'&&m.value===100));
 result.provenance.cinemaV5={version:Q.version,videoHash,audioEvidence:audit,lyricSafety:missing.length?'UNMEASURED':'MEASURED',missingSafetyEvidence:missing,humanStatus:Q.humanStatus,creativeCalibration:Q.selectionPolicy.calibration,limits:'Legacy/non-image or incomplete registered lyric observations do not certify lyric safety. A technically valid draft remains savable; known failed AAC/MP4 is rejected.'};
 const creative=selected?.cinemaV5?.after?Q.creativeEvidence(selected.cinemaV5.after):null,complete=missing.length===0&&creative?.aggregateStatus==='MEASURED';result.provenance.cinemaV5.creativeEvidenceStatus=creative?.aggregateStatus??'UNMEASURED';for(const acceptance of [result.provenance.qualityTarget,result.provenance.machineRefinement?.acceptance].filter(Boolean)){acceptance.v5EvidenceComplete=complete;acceptance.v5MissingSafety=[...missing];acceptance.v5MissingCreative=creative?.missing.map(m=>m.domain)??Object.keys(Q.selectionPolicy.weights);}if(!result.provenance.qualityTarget)result.provenance.qualityTarget={status:'UNMEASURED',v5EvidenceComplete:complete,v5MissingSafety:[...missing]};result.provenance.creativeState=J.creativeExportState(result.provenance.machineRefinement?.acceptance||result.provenance.qualityTarget);
 result.sidecar=new Blob([JSON.stringify(result.provenance,null,2)],{type:'application/json'});return result;
};
const creativeState=J.creativeExportState;J.creativeExportState=acceptance=>{const state=creativeState(acceptance);return state==='TARGET_MET'&&acceptance?.v5EvidenceComplete===false?'UNMEASURED':state;};
const exportMP4=J.exportMP4;J.exportMP4=async args=>Q.guardExport(await exportMP4(args),args);

})();
