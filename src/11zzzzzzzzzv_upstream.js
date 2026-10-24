/* JIZURA 0.10.1 adapter. Vendored sources remain checksum-identical to upstream.
 * Old projects retain the KAMEN path; only explicit generation changes engines. */
(()=>{'use strict';
const J=window.J,U=window.JIZURAUpstream;if(!U)return;
const version='0.10.1',commit='fc16bfe43ea4a6c25a21f1caf04d17326de14f00';
J.upstreamInfo=Object.freeze({engine:'jizura',version,commit});
J.isUpstream=p=>p?.generation?.engine==='jizura';
const legacy={plan:J.plan,defaults:J.defaultProject,migrate:J.migrateProject,omakase:J.omakase,randomOk:J.randomOk,export:J.exportMP4,fallback:J.exportMP4Fallback,previewPlan:J.previewPlan};
// UI catalogues need names for upstream cuts, but legacy random pools must not change.
const catalogKeys=['LAYOUTS','LAYOUT_ORDER','ENTER','ENTER_ORDER','HOLD','HOLD_ORDER','EXIT','EXIT_ORDER','DECOR','DECOR_ORDER','TREAT','TREAT_ORDER','BG','BG_ORDER','CAMERA','CAMERA_ORDER','FXE','FXE_ORDER','TRANS','TRANS_ORDER','STYLES','STYLE_ORDER'];
const originalCatalog=Object.fromEntries(catalogKeys.filter(k=>J[k]).map(k=>[k,Array.isArray(J[k])?J[k].slice():{...J[k]}]));
const inLegacyCatalog=fn=>{const active=Object.fromEntries(Object.keys(originalCatalog).map(k=>[k,J[k]]));Object.assign(J,originalCatalog);try{return fn();}finally{Object.assign(J,active);}};
J.engineOrder=(p,g)=>J.isUpstream(p)?U.order(g):(originalCatalog[{layout:'LAYOUT_ORDER',enter:'ENTER_ORDER',hold:'HOLD_ORDER',exit:'EXIT_ORDER',decor:'DECOR_ORDER',treat:'TREAT_ORDER',bg:'BG_ORDER',cam:'CAMERA_ORDER',fx:'FXE_ORDER',trans:'TRANS_ORDER'}[g]]||J.order(g));
const newKeys=new Map();
for(const group of J.GROUP_KEYS){const local=J.registry(group),remote=U.registry(group);for(const key of U.order(group))if(!local[key]){local[key]=remote[key];J.order(group).push(key);newKeys.set(group+'|'+key,true);}}
J.randomOk=(p,g,k)=>J.isUpstream(p)?U.randomOk(p,g,k):!newKeys.has(g+'|'+k)&&legacy.randomOk(p,g,k);
for(const key of U.STYLE_ORDER)if(!J.STYLES[key]){J.STYLES[key]=U.STYLES[key];J.STYLE_ORDER.push(key);newKeys.set('style|'+key,true);}
J.THEMES=U.THEMES;
J.legacyDefaultProject=()=>({...inLegacyCatalog(legacy.defaults),generation:{engine:'kamen',version:'legacy'}});
J.enableUpstreamMode=()=>{J.upstreamDefaultEnabled=true;};
J.defaultProject=()=>{
 const old=inLegacyCatalog(legacy.defaults);if(!J.upstreamDefaultEnabled)return old;
 const p=U.defaultProject();return {...old,...p,lyrics:'',customBg:old.customBg,titleDisplay:old.titleDisplay,autoPalette:old.autoPalette,exportSettings:old.exportSettings,includeAudio:true,quality:'high',autoDirection:false,generation:{...J.upstreamInfo}};
};
J.migrateProject=input=>{const p=legacy.migrate(input);if(p.generation?.engine==='jizura'&&(p.generation.version!==version||p.generation.commit!==commit))throw Error('このJIZURA生成バージョンには対応していません。元のファイルを保管してください');if(!p.generation)p.generation={engine:'kamen',version:'legacy'};return p;};
J.historyFields.push('generation','themeId','timingOrder','typo','kinetic','horror','unify','typeset','centerFree','centerDir','locks');
J.upstreamProject=p=>{
 const d=U.defaultProject(),q={...d,...p,fx:{...d.fx,...p.fx},timing:{...d.timing,...p.timing},enabled:{}};
 for(const g of U.GROUP_KEYS)q.enabled[g]={...d.enabled[g],...p.enabled?.[g]};
 return q;
};
J.plan=(p,a)=>{
 if(!J.isUpstream(p))return inLegacyCatalog(()=>legacy.plan(p,a));
 const result=U.plan(J.upstreamProject(p),a);
 Object.assign(result,{appVersion:version,generation:{...p.generation},customBg:p.customBg,titleDisplay:p.titleDisplay,autoPalette:p.autoPalette,singleBackground:true,upstream:true,quality:p.quality,outputResolution:p.res});
 return result;
};
J.omakase=(p,...args)=>J.isUpstream(p)?U.omakase(J.upstreamProject(p),...args):inLegacyCatalog(()=>legacy.omakase(p,...args));
J.previewPlan=(p,...args)=>J.isUpstream(p)?Object.assign(U.previewPlan(J.upstreamProject(p),...args),{generation:p.generation,upstream:true}):legacy.previewPlan(p,...args);
J.generateUpstream=(project,audio,{rnd=Math.random}={})=>{
 const q=JSON.parse(JSON.stringify(project));
 // Keep line-owned timing/locks; remap the pre-0.10 sorted LRC indices only on explicit conversion.
 if(!J.isUpstream(q)&&q.timingOrder!==2){const map=U.parseOrderV1(q.lyrics||'');if(map){const move=obj=>Object.fromEntries(Object.entries(obj||{}).map(([k,v])=>[map[+k]??k,v]));q.timing={...q.timing,lineTimes:move(q.timing?.lineTimes)};q.overrides=move(q.overrides);if(q.exportRange){const indices=map.slice(q.exportRange.from,q.exportRange.to+1);q.exportRange=indices.length?{from:Math.min(...indices),to:Math.max(...indices)}:null;}}}
 q.generation={...J.upstreamInfo};q.timingOrder=2;
 // Do not let the retired optimizer rewrite or restore a newly generated plan.
 q.autoDirection=false;q.artDirection=null;delete q.randomWorkflowV16;delete q.directorPlan;
 const generated=U.omakase(J.upstreamProject(q),rnd);
 for(const [g,locked] of Object.entries(q.locks?.tech||{}))if(locked&&q.enabled?.[g])generated.enabled[g]={...q.enabled[g]};
 for(const [k,locked] of Object.entries(q.locks?.params||{}))if(locked&&q.fx?.[k]!=null)generated.fx[k]=q.fx[k];
 Object.assign(q,generated);
 return {project:q,plan:J.plan(q,audio)};
};
// The sole production frame dispatcher: same engine for preview, PNG and MP4.
const frame=J.Renderer.prototype.frame,dispose=J.Renderer.prototype.disposeAssets;
// A hook immediately after the upstream base fill retains KAMEN's photographic background.
U.drawCustomBackground=(renderer,ctx,plan,t,tq,step,scheme,scale,filter)=>{
 const owner=renderer.kamenOwner;if(owner?.customBgBitmap&&plan.customBg?.enabled)owner.drawCustomBackground(ctx,plan,t,tq,step,scheme,scale,filter);
};
J.Renderer.prototype.frame=function(ctx,p,t,opt){
 if(!J.isUpstream(p))return frame.call(this,ctx,p,t,opt);
 const renderer=this.upstreamRenderer??=new U.Renderer();renderer.kamenOwner=this;
 return renderer.frame(ctx,p,t,opt);
};
J.Renderer.prototype.disposeAssets=function(...args){if(this.upstreamRenderer){this.upstreamRenderer.kamenOwner=null;this.upstreamRenderer=null;}return dispose?.apply(this,args);};
const ensure=J.ensureFonts;J.ensureFonts=async(...args)=>{await ensure(...args);await U.ensureFonts(...args);};
// Upstream fonts remain in sync with custom font registrations.
Object.assign(U.FONTS,J.FONTS);
const restoreFont=J.restoreUserFont;J.restoreUserFont=async(...args)=>{const key=await restoreFont(...args);Object.assign(U.FONTS,J.FONTS);return key;};
J.inspectMP4Blob=async(blob,options)=>{try{return await window.JIZURAMedia.inspectMP4(blob,options);}catch(e){if(e.name==='AbortError')throw e;throw Object.assign(new Error('EXPORT_INVALID: '+e.message),{cause:e,code:'EXPORT_INVALID'});}};
J.verifyTechnicalExport=async(result,args)=>{
 const expected=(args.range?.end??args.plan.duration)-(args.range?.start??0),v=await J.inspectMP4Blob(result.blob,{requireAudio:!!args.audio?.buffer&&args.project.includeAudio!==false,signal:args.signal});
 const [w,h]=J.outputSize(args.project),frames=Math.max(1,Math.round(expected*args.plan.fps));
 if(v.width!==w||v.height!==h||Math.abs(v.videoDuration-expected)>Math.max(.12,2/args.plan.fps)||v.videoSamples!==frames||Math.abs(v.fps-args.plan.fps)>.1||v.audioCodec&&Math.abs(v.audioDuration-expected)>.15)throw Error('EXPORT_INVALID: 映像・音声の長さ、フレーム数または出力設定が一致しません');
 // Decode the actual first, middle and last frames before offering a download.
 await window.JIZURAMedia.sampleMP4(result.blob,[0,Math.max(0,(expected-1/args.plan.fps)/2),Math.max(0,expected-1/args.plan.fps)],{width:64,height:64,signal:args.signal,onSample:()=>{}});
 if(v.audioCodec&&!await window.JIZURAMedia.audioEndpoints(result.blob,{signal:args.signal}))throw Error('EXPORT_INVALID: AAC音声をデコードできません');
 v.certification={passed:true,scope:'container, track completeness, output settings and decoded endpoint/midpoint samples'};
 result.validation=v;result.provenance={schema:'kamen-upstream-export-v1',generation:args.project.generation,exportSettings:{width:w,height:h,fps:args.plan.fps,range:args.range},validation:v,creativeState:'ADVISORY',timestamp:new Date().toISOString()};
 result.sidecar=new Blob([JSON.stringify(result.provenance,null,2)],{type:'application/json'});return result;
};
const standard=async(args,fallback=false)=>J.verifyTechnicalExport(await(fallback?J.exportMP4FallbackBase:J.exportMP4Base)(args),args);
J.exportMP4=args=>J.isUpstream(args.project)?standard(args):legacy.export(args);
J.exportMP4Fallback=args=>J.isUpstream(args.project)?standard(args,true):legacy.fallback(args);
// One coordinator owns retries. Audio failures retry AAC without changing the
// video configuration; malformed output and cancellation are never retried.
J.exportWithRetries=async(args,caps)=>{
 const diagnostics=[],settings=J.resolveExportSettings(args.project),[w,h]=J.outputSize(args.project);
 const terminal=e=>args.signal?.aborted||e.name==='AbortError'||/EXPORT_INVALID|CINEMA_V5_UNSAFE_EXPORT|PROVENANCE_MISMATCH|検査|フレームが不足/.test(e.message||'');
 const record=(e,attempt,stage)=>diagnostics.push({stage,codec:attempt?.codec||null,acceleration:attempt?.cfg?.hardwareAcceleration||'auto',code:e.code||e.name,message:e.message});
 let last=new Error('このブラウザーはMP4書き出しに対応していません');
 if(caps.webCodecs){
  const duration=(args.range?.end??args.plan.duration)-(args.range?.start??0),estimate=J.estimateExport(args.project,duration,!!args.audio);
  const attempts=await J.videoAttempts(w,h,args.plan.fps,Math.round(estimate.videoBitrate));
  for(const [index,videoAttempt]of attempts.entries()){
   if(args.signal?.aborted)throw new DOMException('キャンセルしました','AbortError');
   if(index)args.onProgress?.(0,'別のH.264エンコーダーで再試行しています',{stage:'frames'});
   try{const r=await J.exportMP4({...args,videoAttempt});r.attempts=diagnostics;return r;}
   catch(e){last=e;record(e,videoAttempt,/音声|AAC/.test(e.message||'')?'audio':'video');if(terminal(e))throw e;
    if(/音声|AAC/.test(e.message||'')){
     if(window.JIZURAAAC){args.onProgress?.(0,'AAC音声の代替処理で再試行しています',{stage:'audio'});
      try{const r=await J.exportMP4({...args,videoAttempt,audioAttempt:{codec:'mp4a.40.2',mux:'aac',sr:settings.sampleRate||48000,bitrate:settings.audioBitrate,wasm:true}});r.attempts=diagnostics;return r;}
      catch(audioError){last=audioError;record(audioError,videoAttempt,'audio');if(terminal(audioError))throw audioError;}
     }
     break;
    }
   }
  }
 }
 if(caps.recorder){try{return await J.exportMP4Fallback(args);}catch(e){last=e;record(e,null,'recorder');}}
 last.attempts=diagnostics;throw last;
};
// Creativity is advisory for both engines; technical checks remain mandatory.
for(const key of ['preflightMV','fixMVQuality','preparePhotoExport']){const fn=J[key];J[key]=(...args)=>{
 const p=key==='preparePhotoExport'?args[0].project:args[0];
 if(!J.isUpstream(p))return fn(...args);
 return key==='preflightMV'?{fixes:0,plan:args[3]()}:key==='fixMVQuality'?0:Promise.resolve();
};}
const check=J.checkMVQuality;J.checkMVQuality=(p,plan,audio,range,...args)=>{
 if(!J.isUpstream(p))return check(p,plan,audio,range,...args);
 const errors=[];
 if(!plan.lines?.length)errors.push({code:'EMPTY_LYRICS',message:'歌詞を読み込んでください'});
 const from=range?.start??0,to=range?.end??plan.duration;
 if(!Number.isFinite(to)||to<=from||from<0)errors.push({code:'INVALID_RANGE',message:'書き出し範囲を確認してください'});
 return {ready:!errors.length,errors,exportErrors:errors,warnings:[],quality:{score:null,certified100:false,categories:[],targetAcceptance:{state:'NOT_APPLICABLE',advisory:true,failures:[],unmeasured:[]}}};
};
const social=J.createSocialHookPlan;J.createSocialHookPlan=(p,range)=>J.isUpstream(p)?{...p,socialHook:{...range}}:social(p,range);
const lrc=J.exportLRC;J.exportLRC=(p,audio,range)=>J.isUpstream(p)?U.lrcText(J.upstreamProject(p),null,range):lrc(p,audio,range);
})();
