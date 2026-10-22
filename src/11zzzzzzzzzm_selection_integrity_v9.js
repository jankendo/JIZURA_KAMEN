/* v9 commits are complete, input-bound registry storyboards. Legacy dispatch and
   legacy saved payloads retain their renderer contracts. */
(()=>{'use strict';
const J=window.J,copy=J.clonePhotoRenderPlan,same=(a,b)=>J.canonicalJSON(a)===J.canonicalJSON(b);
const active=p=>(p?.songNativeDirection||p?.artDirection?.songNativeDirection)?.version===9;
const promote=d=>({...d,version:9,schemaVersion:9,algorithm:'SONG_NATIVE_REGISTRY_STORYBOARD_V9',rendererCompatibilityId:'kamen-song-grammar-renderer-9',status:'DRAFT',selection:null});
const as8=d=>({...copy(d),version:8,schemaVersion:8,algorithm:'SONG_NATIVE_REGISTRY_STORYBOARD_V8',rendererCompatibilityId:'kamen-song-grammar-renderer-8',selection:d.selection?{...copy(d.selection),version:8}:null});
J.buildJizuraDirectionV9=(p,a)=>promote(J.buildJizuraDirectionV8(p,a));
const valid=J.validSongNativeDirection;
J.validSongNativeDirection=d=>d?.version!==9?valid(d):['DRAFT','SELECTED','STALE','FAILED'].includes(d.status)&&valid(as8(d));
const build=J.buildSongNativeDirection;J.buildSongNativeDirection=(p,a)=>active(p)?J.buildJizuraDirectionV9(p,a):build(p,a);
J.generateJizuraDirectionV9=async(p,a,options={})=>{const set=await J.generateJizuraDirectionV8(p,a,options);for(const item of set.candidates){item.proposal.songNativeDirector=9;item.proposal.grammarDirection=promote(item.proposal.grammarDirection);item.proposal.summary='楽曲・歌詞・背景からJIZURA演出を実描画選択 v9';}return set;};
const make=J.makeArtDirection;J.makeArtDirection=(p,a,pr)=>{
 if(pr.songNativeDirector!==9)return make(p,a,pr);
 const art=make(p,a,{...pr,songNativeDirector:8,grammarDirection:as8(pr.grammarDirection)});
 art.songNativeDirection=promote(art.songNativeDirection);return art;
};
const selectedCuts=p=>p.cuts.filter(c=>c.line>=0&&!J.songNativeLockedV8(p,c));
J.selectionIntegrityV9=(p,a)=>{
 const d=p.songNativeDirection,s=d?.selection,errors=[];
 if(d?.version!==9)return {ok:false,status:'STALE',errors:['VERSION']};
 if(!J.validSongNativeDirection(d))errors.push('INVALID_DIRECTION');
 if(d.status!=='SELECTED'||!s?.entries?.length&&selectedCuts(p).length)errors.push('SELECTION_NOT_COMMITTED');
 if(!s||s.version!==9||s.sourceIdentity!==d.sourceIdentity||s.rendererCompatibilityId!==d.rendererCompatibilityId)errors.push('SELECTION_BINDING');
 if(d.sourceIdentity!==p.songNativePlanInputIdentity)errors.push('INPUT_CHANGED');
 if(s?.locks!==J.cinemaV3.lockSignature(p))errors.push('LOCKS_CHANGED');
 const cuts=selectedCuts(p),entries=s?.entries||[],lines=[...new Set(cuts.map(c=>c.line))];
 if(entries.length!==lines.length||cuts.length!==lines.length||p.lines.some((l,i)=>!p.cuts.some(c=>c.line===i)))errors.push('LINE_COVERAGE');
 for(const c of cuts){const e=entries.find(e=>e.line===c.line);
  if(!e||e.validation!=='MEASURED_SAFE_SEQUENCE'||!e.phaseEvidence?.length||e.phaseEvidence.some(v=>!v.eligible)||!J.STYLES[c.styleKey]||!['layout','enter','hold','exit','cam','treat','bg'].every(g=>J.registry(g)[c[g]])||c.trans!=='cut'&&!J.TRANS[c.trans]||c.registryFxV9&&!J.FXE[c.registryFxV9]||!same({...c,index:0},{...e?.cut,index:0}))errors.push('CUT_MISMATCH_'+c.line);
  const t=s?.traces?.find(t=>t.line===c.line);if(!t?.safeCount||!t?.candidateCount)errors.push('MISSING_CANVAS_EVIDENCE_'+c.line);
 }
 return {ok:!errors.length,status:errors.length?(d.status==='DRAFT'?'DRAFT':'STALE'):'SELECTED',errors};
};
J.assertSelectionV9=(p,a)=>{const result=J.selectionIntegrityV9(p,a);if(!result.ok)throw Object.assign(Error('演出の確定が必要です: '+result.errors.join(', ')),{code:'SELECTION_NOT_COMMITTED',diagnostic:result});return result;};
const plan=J.plan;J.plan=(p,a)=>{const result=plan(p,a);if(active(result)){if(p.artDirection?.songNativeDirection?.selection&&p.artDirection.songNativeDirection.sourceIdentity!==result.songNativePlanInputIdentity)result.songNativeDirection.status='STALE';const state=J.selectionIntegrityV9(result,a);if(result.songNativeDirection.status==='SELECTED'&&!state.ok)result.songNativeDirection.status='STALE';for(const c of selectedCuts(result))if(!result.songNativeDirection.selection?.entries.some(e=>e.line===c.line))delete c.registrySelectedV8;}return result;};
const ensure=J.ensureSongNativeDirection;J.ensureSongNativeDirection=(q,a,p,...args)=>{
 const r=ensure(q,a,p,...args);if(active(p)&&p.songNativeDirection.status==='SELECTED')J.assertSelectionV9(p,a);return r;
};
const capture=J.captureSongNativeResolved;J.captureSongNativeResolved=(q,a,p,...args)=>{if(active(p))J.assertSelectionV9(p,a);return capture(q,a,p,...args);};
// A repaired cut needs fresh Canvas validation. Never attach old selection
// metadata to repaired content and call it a confirmed storyboard.
const reapply=J.reapplySongNativeSelection;J.reapplySongNativeSelection=(before,q,a,p,impact)=>{
 if(!active(p))return reapply(before,q,a,p,impact);
 const d=before.registryV8;
 if(impact!=='OBSERVATION_ONLY'||!d?.selection||d.sourceIdentity!==p.songNativeDirection.sourceIdentity)return false;
 const trial=copy(p);trial.songNativeDirection=copy(d);trial.artDirection.songNativeDirection=trial.songNativeDirection;
 const byLine=new Map(d.selection.entries.map(e=>[e.line,e.cut]));trial.cuts=trial.cuts.map(c=>J.songNativeLockedV8(trial,c)||c.line<0?c:copy(byLine.get(c.line)||c));
 if(!J.selectionIntegrityV9(trial,a).ok)return false;
 J.cinemaV3.restorePlan(p,trial);J.cinemaV3.invalidate(p);return true;
};
// All live registry members are ranked; rendering is bounded to a small local
// shortlist per coordinate. Tags are fit priors, never a safety certificate.
// Renderer warnings identify swallowed registry exceptions; an unchanged frame
// after a failed draw is not proof that the component rendered safely.
const probe=J.createRegistryRenderProbe;J.createRegistryRenderProbe=(...args)=>{
 const sample=probe(...args);return (p,c,dt)=>{if(!active(p))return sample(p,c,dt);
  const warn=console.warn,errors=[];console.warn=(...values)=>errors.push(String(values[0]));
  try{const e=sample(p,c,dt);return errors.length?{...e,eligible:false,renderErrors:errors}:e;}finally{console.warn=warn;}
 };
};
J.registryAnchorV9=(cut,anchors,sample)=>{
 const choices=[{cut,anchor:anchors.find(a=>a.x===.5&&a.y===.5)},...anchors.map(anchor=>({cut:{...copy(cut),params:{...copy(cut.params),photoAnchor:copy(anchor)}},anchor}))];
 const ranked=choices.map(x=>{const e=sample(x.cut);return {...x,eligible:e.eligible,score:(e.contrastFit??0)*.65+(1-(x.anchor?.saliency??.5))*.35};}).filter(x=>x.eligible).sort((a,b)=>b.score-a.score);
 return ranked[0]?.cut||cut;
};
J.registryLayoutCandidatesV9=(p,c,f,style,layouts)=>{
 const scored=layouts.filter(([id,d])=>!d.fits||d.fits(f.length)).map(([id,d])=>{
  const tags=d.tags||[],bias=style.bias?.layout?.[id]||0;
  const drive=tags.includes('calm')?.15:tags.includes('glitch')?.85:tags.includes('pop')?.6:.4;
  return {id,score:Math.log1p(Math.max(0,bias))*.2+1-Math.abs(f.onset*.6+f.change*.4-drive)};
 }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id));
 return [...new Set([...scored.slice(0,7).map(x=>x.id),...['center','photoPhrase','photoStatement'].filter(id=>layouts.some(([x])=>x===id))])];
};
J.registryRoleAmountV9=(g,id)=>{
 const d=J.registry(g)[id],tags=d?.tags||[];
 return !id||['none','cut','still','stillCamera'].includes(id)?0:Number.isFinite(d?.motionAmount)?d.motionAmount:tags.includes('calm')?.18:tags.includes('glitch')?.85:tags.includes('pop')?.6:.35;
};
J.registryCurrentRoleScoreV9=(g,cut,target)=>1-Math.abs(target-J.registryRoleAmountV9(g,g==='decor'?cut.decor?.[0]?.id:g==='fx'?cut.registryFxV9:cut[g]));
J.registryRoleCandidatesV9=(p,g,target)=>{
 const method=g==='cam'?'get':['bg','decor','trans','fx'].includes(g)?'draw':'apply';
 return Object.entries(J.registry(g)).filter(([id,d])=>(typeof d[method]==='function'||g==='fx'&&d.builtin)&&J.randomOk(p,g,id)&&!d.requiresAsset).map(([id,d])=>{
  const amount=J.registryRoleAmountV9(g,id);
  return {id,amount,score:1-Math.abs(target-amount)};
 }).sort((a,b)=>b.score-a.score||a.id.localeCompare(b.id)).slice(0,3);
};
// Cut-owned FX are materialized identically in probes and final rendering.
const frame=J.Renderer.prototype.frame;J.Renderer.prototype.frame=function(ctx,p,t,opt={}){
 if(!active(p)||!p.cuts.some(c=>c.registryFxV9))return frame.call(this,ctx,p,t,opt);
 const events=[...(p.events||[]),...p.cuts.filter(c=>c.registryFxV9&&J.FXE[c.registryFxV9]).map(c=>({t:c.start,type:c.registryFxV9,dur:Math.min(.12,c.dur*.15),amp:.12,seed:c.seed,source:'registry-v9',musicalPhotoCue:true}))].sort((a,b)=>a.t-b.t);
 return frame.call(this,ctx,{...p,events},t,opt);
};
J.registryAlternativesV9=async(p,portfolios,winner,sample,phases,selection)=>{
 const variants=portfolios.map(step=>({...step,candidates:step.candidates.filter(c=>!same(c.cut,winner.picks.find(x=>x.line===step.line)?.cut))}));
 if(!variants.some(s=>s.candidates.length))return [];
 for(let i=0;i<variants.length;i++)if(!variants[i].candidates.length)variants[i]=portfolios[i];
 let alt=J.chooseRegistryStoryboard(variants,8);if(J.isCreativeOptimizerV10?.(p)){try{alt=J.chooseCreativeArcV10(p,variants,alt);}catch(e){if(e.message==='V10_UNRESOLVED_ACOUSTIC_ARC')return [];throw e;}}if(J.isSongDerivedV11?.(p))alt=await J.confirmDirectionScaleV11(p,variants,alt,sample,phases);if(alt.status!=='MEASURED_SAFE_SEQUENCE')return [];
 const trial=copy(p),byLine=new Map(alt.picks.map(x=>[x.line,x.cut]));trial.cuts=trial.cuts.map(c=>c.line>=0&&!J.songNativeLockedV8(trial,c)?copy(byLine.get(c.line)):c);trial.cuts.forEach((c,i)=>c.index=i);
 const observed=new Map();for(const c of selectedCuts(trial)){const checks=phases(c).map(dt=>sample(trial,c,dt));if(!checks.every(e=>e.eligible))return [];observed.set(c.line,checks.map(({mask,raster,...e})=>e));}
 const metadata=J.isCreativeOptimizerV10?.(p)?J.creativeAlternativeEvidenceV10(selection,alt,portfolios):{};
 return [{...metadata,status:'MEASURED_SAFE_SEQUENCE',sourceIdentity:p.songNativeDirection.sourceIdentity,rendererCompatibilityId:p.songNativeDirection.rendererCompatibilityId,entries:selectedCuts(trial).map(c=>({line:c.line,cut:copy(c),validation:'MEASURED_SAFE_SEQUENCE',phaseEvidence:observed.get(c.line)})),score:alt.score,method:alt.method}];
};
J.applyRegistryAlternativeV9=async(q,a,p,range,options={})=>{
 J.assertSelectionV9(p,a);const s=p.songNativeDirection.selection,alt=s.alternatives?.[0];
 if(!alt||alt.status!=='MEASURED_SAFE_SEQUENCE'||alt.sourceIdentity!==s.sourceIdentity||alt.rendererCompatibilityId!==s.rendererCompatibilityId)return null;
 const trial=copy(p),byLine=new Map(alt.entries.map(e=>[e.line,e.cut])),previous={...copy(alt),entries:copy(s.entries),...(s.optimizerVersion>=10?{traces:copy(s.traces),visualArc:copy(s.visualArc),multiScaleEvidence:copy(s.multiScaleEvidence??null)}:{})};
 trial.cuts=trial.cuts.map(c=>c.line<0||J.songNativeLockedV8(trial,c)?c:copy(byLine.get(c.line)));trial.cuts.forEach((c,i)=>c.index=i);
 trial.songNativeDirection.selection={...copy(s),entries:copy(alt.entries),...(alt.traces?{traces:copy(alt.traces),visualArc:copy(alt.visualArc),multiScaleEvidence:copy(alt.multiScaleEvidence??null)}:{}),alternatives:[previous]};trial.artDirection.songNativeDirection=trial.songNativeDirection;
 J.assertSelectionV9(trial,a);const evidence=await J.collectJizuraDirectionV8(trial,range,options);
 if(evidence.frames.some(f=>!f.readable))throw Error('ALTERNATIVE_HARD_GATE');
 J.assertSelectionV9(p,a);return trial;
};
// Observed differences are diagnostics with units, not artistic quality scores.
const measure=J.measureJizuraDirectionV8;J.measureJizuraDirectionV8=(p,frames=[],range)=>{
 const result=measure(p,frames,range);if(!active(p))return result;
 result.contractVersion='kamen-jizura-direction-quality-9';
 const distance=(a,b)=>a?.length&&a.length===b?.length?a.reduce((s,v,i)=>s+Math.abs(v-b[i]),0)/a.length:null;
 const pairs=frames.slice(1).map((b,i)=>{const a=frames[i];return {from:a.time,to:b.time,fromLine:a.line,toLine:b.line,ink:J.registryInkDistance(a.signature,b.signature),background:distance(a.background?.luma,b.background?.luma),position:a.features&&b.features?Math.hypot(a.features.center[0]-b.features.center[0],a.features.center[1]-b.features.center[1]):null};});
 const observation=(rows,key,unit)=>{const ev=rows.filter(r=>Number.isFinite(r[key]));return {status:ev.length?'MEASURED':'UNMEASURED',score:null,value:ev.length?ev.reduce((s,r)=>s+r[key],0)/ev.length:null,unit,evidence:ev,source:'paired production Canvas raster; diagnostic, not an artistic score'};};
 result.metrics.compositionChange=observation(pairs,'position','normalized centroid distance');
 if(frames.some(f=>f.background))result.metrics.background=observation(pairs,'background','mean absolute luminance difference');
 const start=range?.start??0,end=range?.end??p.duration;
 result.metrics.opening=observation(pairs.filter(r=>r.from<start+Math.min(2,(end-start)/3)),'ink','primary ink distance');
 result.metrics.ending=observation(pairs.filter(r=>r.to>end-Math.min(2,(end-start)/3)),'ink','primary ink distance');
 result.metrics.stillness=observation(pairs.filter(r=>r.fromLine===r.toLine),'ink','within-line primary ink distance');
 const repeated=[];for(let i=0;i<frames.length;i++)for(let j=0;j<i;j++){const a=frames[j],b=frames[i];if(a.line!==b.line&&p.lines[a.line]?.text===p.lines[b.line]?.text)repeated.push({from:a.time,to:b.time,ink:J.registryInkDistance(a.signature,b.signature)});}
 result.metrics.repetition=observation(repeated,'ink','repeated-lyric primary ink distance');
 return result;
};
const check=J.checkMVQuality;J.checkMVQuality=(q,p,...args)=>{const r=check(q,p,...args);if(!active(p))return r;const v=r.quality;
 v.songGrammarV9=v.songGrammarV5;
 v.domainStates=Object.fromEntries(['technical','creative','social'].map(k=>[k,{status:Number.isFinite(v[k+'Score'])?'MEASURED':'UNMEASURED',score:v[k+'Score']??null}]));
 v.overallStatus=Number.isFinite(v.overallScore)?'MEASURED':'UNMEASURED';
 const integrity=J.selectionIntegrityV9(p);if(!integrity.ok){r.ready=false;r.errors.push({code:'SELECTION_NOT_COMMITTED',message:'演出の確定・再確認が必要です'});}
 return r;
};
J.qualityScoreTextV9=q=>{const value=x=>Number.isFinite(x)?`${x}/100`:'未測定';return `総合：${Number.isFinite(q.overallScore)?value(q.overallScore):'未確定'} · 技術：${value(q.technicalScore)} · 創作：${value(q.creativeScore)} · ${q.socialScope?.scope==='dedicated-short'?'Short版':'本編SNS適性'}：${value(q.socialScore)}`;};
})();
