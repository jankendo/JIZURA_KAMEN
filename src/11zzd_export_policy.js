/* Creative evidence remains visible; only actual output faults stop export. */
(()=>{'use strict';const J=window.J;
const creative=new Set(['SCENE_INDISTINCT','direction_realization','motion_excess','effect_soup','BROKEN_STYLE_ARC','EVENT_NOT_REALIZED','SUBJECT_CRITICAL_OVERLAP','BROKEN_DIRECTOR_INTENT','BROKEN_VISUAL_WORLD','SEMANTIC_NOT_REALIZED','CLIMAX_TOO_WEAK','VISUAL_STAGNATION','BROKEN_IMAGE_TRANSITION']);
const technical=new Set(['audio_missing','MISSING_AUDIO','lyrics_missing','duration','audio_range','timing_invalid','timing_reverse','lrc_outside','resolution','fps','frames','export_unsupported','export_validation','EXPORT_INVALID','PROVENANCE_MISMATCH','black_frame','BLACK_FRAME','render_failed','LYRIC_NOT_RENDERED','LYRIC_PARTIAL_CLIP','BROKEN_ASSET']);
J.finalizeExportReadiness=report=>{
 for(const issue of report.issues||[]){if(technical.has(issue.code)){issue.exportBlocking=issue.severity==='ERROR';issue.category='technical';}else if(creative.has(issue.code)){issue.exportBlocking=false;issue.category='creative';}}
 report.errors=(report.issues||[]).filter(i=>i.severity==='ERROR');report.warnings=(report.issues||[]).filter(i=>i.severity==='WARNING');report.exportErrors=report.errors.filter(i=>i.exportBlocking!==false);report.creativeFindings=(report.issues||[]).filter(i=>i.category==='creative');report.ready=report.exportErrors.length===0;
 if(report.quality){report.quality.exportGates={passed:report.ready,total:report.exportErrors.length,codes:report.exportErrors.map(i=>i.code)};report.quality.hardGates={...report.quality.hardGates,passed:!report.errors.length,total:report.errors.length};if(report.errors.length){report.quality.certified100=false;report.quality.perfectEligible=false;}}
 return report;
};
const fix=J.fixMVQuality;J.fixMVQuality=(project,report,audio)=>{const fingerprint=()=>JSON.stringify(project,(key,value)=>key==='dataUrl'?undefined:value),before=fingerprint(),count=fix(project,report,audio);return count&&before!==fingerprint()?count:0;};
const check=J.checkMVQuality;J.checkMVQuality=(...args)=>J.finalizeExportReadiness(check(...args));
// Creative evidence is separate from technical file certification.
J.creativeExportState=acceptance=>{
 if(acceptance?.status==='NOT_APPLICABLE')return 'NOT_APPLICABLE';
 if(acceptance?.minimumMet===true)return 'TARGET_MET';
 if(acceptance?.failures?.some(f=>Number.isFinite(f.score)))return 'BELOW_TARGET';
 if(acceptance?.status==='BELOW_TARGET')return 'BELOW_TARGET';
 return 'UNMEASURED';
};
const provenance=J.createExportProvenance;J.createExportProvenance=async(...args)=>{const result=await provenance(...args);return {...result,exportReadiness:args[2].quality.exportGates,creativeState:J.creativeExportState(args[2].quality.targetAcceptance),creativeFindings:args[2].creativeFindings?.map(i=>({code:i.code,message:i.message,severity:i.severity})),measurementPolicy:{...result.measurementPolicy,export:'創作上の不足は実測値とともに残す。歌詞欠落・描画失敗・MP4破損・音源や出所の不一致は書き出しを止める'}};};
})();
