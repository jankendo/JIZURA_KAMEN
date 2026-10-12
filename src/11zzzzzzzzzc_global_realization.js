/* Final configuration adoption is distinct from pixel safety and creative merit. */
(()=>{'use strict';const J=window.J;
J.traceGlobalStoryboard=p=>{
 const selection=p.artDirection?.registrySelection,story=selection?.globalStoryboard;if(!story)return {status:'NOT_APPLICABLE_NO_GLOBAL_SELECTION',decisions:[]};
 const decisions=(story.decisions||[]).map(d=>{
  const chosen=selection.entries?.[d.line],cuts=(p.cuts||[]).filter(c=>c.line===d.line),locked=cuts.some(c=>J.photoChoreographyLocked(p,c));
  if(locked)return {...d,status:'NOT_APPLICABLE_MANUAL_LOCK',actual:cuts.map(c=>({layout:c.layout,font:c.params?.font,start:c.start,end:c.end}))};
  const match=chosen&&cuts.length>0&&cuts.every(c=>c.registrySelected&&c.layout===chosen.layout&&c.params?.font===chosen.params?.font&&JSON.stringify(c.params?.photoAnchor??null)===JSON.stringify(chosen.params?.photoAnchor??null));
  return {...d,status:match?'FINAL_CONFIGURATION_MATCH':'OVERRIDDEN_OR_UNRESOLVED',selected:{layout:chosen?.layout,font:chosen?.params?.font,anchor:chosen?.params?.photoAnchor??null},actual:cuts.map(c=>({layout:c.layout,font:c.params?.font,anchor:c.params?.photoAnchor??null,start:c.start,end:c.end})),pixelSafety:'Requires independent adopted MP4 final artifact verification'};
 });
 return {status:decisions.some(d=>d.status==='OVERRIDDEN_OR_UNRESOLVED')?'UNVERIFIED':'FINAL_CONFIGURATION_TRACED',decisions,meaning:'Configuration trace only; not encoded creative quality'};
};
const plan=J.plan;J.plan=(p,a)=>{const result=plan(p,a);result.musicDirectionProfile=J.createMusicDirectionProfile(a,p,result);result.globalStoryboardRealization=J.traceGlobalStoryboard(result);return result;};
const provenance=J.createExportProvenance;J.createExportProvenance=async(...args)=>{const result=await provenance(...args),p=args[0]?.plan,trace=J.traceGlobalStoryboard(p||{}),artifact=result.finalArtifactVerification;
 result.musicDirectionProfile=p?.musicDirectionProfile??null;result.globalStoryboardRealization={...trace,finalArtifactEvidenceId:artifact?.evidenceId??null,binding:artifact?.binding??null,lyricSafety:artifact?.status??'UNMEASURED',creativeImprovement:'UNMEASURED_REQUIRES_BASELINE_VIDEO_COMPARISON'};return result;};
})();
