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
J.registryGeometryAlternativeCuts=p=>{
 const proposal=p.artDirection?.registrySelection?.geometryAlternative;if(proposal?.status!=='MEASURED_SAFE_SEQUENCE'||!proposal.picks?.length)return null;
 const base=p.registryMeasuredCuts||p.cuts,cuts=J.clonePhotoRenderPlan(base),trace=[];
 for(const pick of proposal.picks){const state=pick.fullState,target=cuts.find(c=>JSON.stringify([c.line,c.start,c.end,c.text??c.lineText])===pick.sourceUnitKey);
  if(!target||!state){trace.push({sourceUnitKey:pick.sourceUnitKey,status:'STALE_UNIT_MAPPING'});continue;}
  const live=p.cuts.find(c=>c.line===target.line&&c.start===target.start&&c.end===target.end);if(J.photoChoreographyLocked(p,live||target)){trace.push({sourceUnitKey:pick.sourceUnitKey,status:'NOT_APPLICABLE_MANUAL_LOCK'});continue;}
  if(String(state.text??state.lineText)!==String(target.text??target.lineText)){trace.push({sourceUnitKey:pick.sourceUnitKey,status:'STALE_TEXT_CONTRACT'});continue;}
  // Preserve input/unit identity while carrying every measured rendering field.
  const finalScene=live?.grammar?{grammar:J.clonePhotoRenderPlan(live.grammar),cinema:J.clonePhotoRenderPlan(live.cinema),story:J.clonePhotoRenderPlan(live.story),...(!state.virtualShot&&live.virtualShot?{virtualShot:J.clonePhotoRenderPlan(live.virtualShot)}:{})}:{};
  const identity={line:target.line,index:target.index,start:target.start,end:target.end,dur:target.dur,text:target.text,lineText:target.lineText,lyricUnitOrigin:target.lyricUnitOrigin};
  for(const key of Object.keys(target))delete target[key];Object.assign(target,J.clonePhotoRenderPlan(state),identity,finalScene,{registrySelected:true,cinemaV3LegacyFinalist:true});
  const selection=p.artDirection.registrySelection,contextChanged=proposal.style!==selection.style||proposal.font!==selection.font;
  if(contextChanged){target.styleKey=p.styleKey;target.style=p.style;target.params={...target.params,font:selection.font};}
  trace.push({sourceUnitKey:pick.sourceUnitKey,status:contextChanged?'STALE_STYLE_FONT_REQUIRES_FRESH_NATIVE_AND_ENCODED_EVALUATION':'FULL_STATE_RETAINED_AS_ALTERNATIVE',layout:target.layout,font:target.params?.font,anchor:target.params?.photoAnchor,earlierPhaseEvidenceReusable:!contextChanged&&!live?.grammar,finalSceneReevaluationRequired:!!live?.grammar});
 }
 return {cuts,trace,scope:'Separate candidate after directors; native and encoded reevaluation mandatory'};
};
const plan=J.plan;J.plan=(p,a)=>{const result=plan(p,a);result.musicDirectionProfile=J.createMusicDirectionProfile(a,p,result);result.globalStoryboardRealization=J.traceGlobalStoryboard(result);const alternative=J.registryGeometryAlternativeCuts(result);if(alternative){result.registryGeometryAlternativeCuts=alternative.cuts;result.registryGeometryAlternativeTrace=alternative.trace;}return result;};
const provenance=J.createExportProvenance;J.createExportProvenance=async(...args)=>{const result=await provenance(...args),p=args[0]?.plan,trace=J.traceGlobalStoryboard(p||{}),artifact=result.finalArtifactVerification;
 result.musicDirectionProfile=p?.musicDirectionProfile??null;result.globalStoryboardRealization={...trace,finalArtifactEvidenceId:artifact?.evidenceId??null,binding:artifact?.binding??null,lyricSafety:artifact?.status??'UNMEASURED',creativeImprovement:'UNMEASURED_REQUIRES_BASELINE_VIDEO_COMPARISON'};return result;};
})();
