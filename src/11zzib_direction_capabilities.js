/* Capability evidence domains stay separate: registration is not verification. */
(()=>{'use strict';const J=window.J;
const unknown=reason=>({status:'UNMEASURED',value:null,confidence:null,source:null,reason});
J.capabilityCatalog=(audit=null,build=window.KAMEN_BUILD_INFO)=>{
 const current=!!build?.sourceTreeSHA256&&audit?.sourceTreeSHA256===build.sourceTreeSHA256&&audit?.sourceCommit===build.sourceCommit&&audit?.sourceDirty===false;
 const catalog={schema:1,sourceCommit:build?.sourceCommit??null,sourceTreeSHA256:build?.sourceTreeSHA256??null,entries:[]};
 for(const group of ['style',...J.GROUP_KEYS,'font']){
  const registry=group==='style'?J.STYLES:group==='font'?J.FONTS:J.registry(group);
  for(const [id,def] of Object.entries(registry)){
   const rows=(audit?.entries||[]).filter(x=>x.group===group&&x.id===id),credit=group==='layout'&&['title','interlude'].includes(id);
   const dispatch={status:credit?'NOT_APPLICABLE':audit&&!current?'STALE':!rows.length?'UNMEASURED':rows.some(x=>x.error||x.warnings?.length)?'FAILED':rows.every(x=>['EXECUTED','BUILTIN_IDENTITY','STYLE_PALETTE_RENDERED'].includes(x.dispatch))?'VERIFIED':'FAILED',reason:credit?'Title/instrumental layout; not a primary body lyric':!current?'No exact current build native dispatch evidence':null,source:current?'CURRENT_NATIVE_CANVAS_AUDIT':null,rows};
   const pixels=current&&rows.length>0&&rows.every(x=>Number.isFinite(x.pixelContribution))?{status:'VERIFIED',value:rows.map(x=>({aspect:x.aspect,difference:x.pixelContribution})),source:'Native renderer technique-on versus identical control; not encoded visibility'}:unknown('No current same-condition native counterfactual');
   catalog.entries.push({group,id,name:def.name||id,status:dispatch.status==='FAILED'?'FAILED':dispatch.status==='STALE'?'STALE':credit?'NOT_APPLICABLE':'UNMEASURED',
    aspects:current&&rows.length>0?{status:'VERIFIED',value:[...new Set(rows.map(x=>x.aspect))],source:'Native execution profiles only'}:unknown('Aspect execution not verified for current build'),
    languages:unknown('Requires actual requested glyph/font probes'),characterCounts:unknown('Input-specific geometry required'),lineCounts:unknown('Input-specific layout required'),requiredAssets:unknown('Registry declaration alone does not establish asset suitability'),musicalRoles:unknown('Requires song-conditioned observed comparison'),
    rendererRequirements:{status:'VERIFIED',value:Object.keys(def).filter(k=>typeof def[k]==='function'),source:'Dynamic registration; availability only'},readableTimeRange:unknown('Must verify entry/hold/exit at output profile'),nativePixelContribution:pixels,encodedSurvival:unknown('No per-technique MP4 on/off evidence'),creativeSuitability:unknown('Registration and dispatch cannot establish musical/aesthetic suitability'),
    conflicts:unknown('Manual locks and per-input render safety remain authoritative'),drawingCost:current&&rows.length>0&&rows.every(x=>Number.isFinite(x.renderWallMs))?{status:'VERIFIED',value:rows.map(x=>({aspect:x.aspect,wallMs:x.renderWallMs})),source:'Native render wall time, not browser/export cost'}:unknown('No current native timing'),nativeDispatch:dispatch,
    evidence:{sourceCommit:audit?.sourceCommit??null,sourceTreeSHA256:audit?.sourceTreeSHA256??null,currentBuildVerified:current,domains:['registration','nativeDispatch','nativePixels','browserFonts','encodedSurvival','creativeSuitability']}});
  }
 }
 return catalog;
};
})();
