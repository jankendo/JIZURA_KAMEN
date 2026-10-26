/* Modern browser project adapter. No legacy planner/renderer is loaded. */
(()=>{'use strict';
const U=window.JIZURAUpstream;
J.upstreamInfo=Object.freeze({engine:'jizura',version:'0.10.1',commit:'fc16bfe43ea4a6c25a21f1caf04d17326de14f00'});
J.isUpstream=p=>p?.generation?.engine==='jizura';
J.upstreamDefaultEnabled=true;
J.defaultProject=()=>({...U.defaultProject(),lyrics:'',lang:'ja',customBg:{enabled:false,dataUrl:'',filename:'',fit:'cover',x:50,y:50,zoom:1,darkness:.2,blur:0},autoPalette:J.emptyAutoPalette(),titleDisplay:{enabled:true,position:'auto',opacity:.72},exportSettings:{preset:'auto',videoBitrate:0,audioBitrate:192000,sampleRate:48000,range:'full',fileName:''},includeAudio:true,quality:'high',autoDirection:false,generation:{...J.upstreamInfo,generated:false}});
const migrate=J.migrateProject;
J.migrateProject=input=>{
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('プロジェクトデータの形式が正しくありません');
 if(J.isUpstream(input)){
  if(input.generation.version!==J.upstreamInfo.version||input.generation.commit!==J.upstreamInfo.commit)throw Error('このJIZURA生成バージョンには対応していません。元のファイルを保管してください');
  const p=migrate(input);for(const key of ['artDirection','directorPlan','randomWorkflowV16','visualAssets','proAssets','scenePins','socialAssetStrategy','visualEnergyDensity','hookStrength'])delete p[key];return p;
 }
 // Import an allowlist of source material, never old renderer decisions or caches.
 const p=J.defaultProject();
 for(const key of ['title','artist','lyrics','customBg','audioAsset','userFonts','fonts','aspect','res','fps','includeAudio','exportSettings'])if(input[key]!=null)p[key]=JSON.parse(JSON.stringify(input[key]));
 p.timing={...p.timing,...input.timing,lineTimes:{...input.timing?.lineTimes}};
 if(input.timingOrder!==2){const map=U.parseOrderV1(p.lyrics||'');if(map)p.timing.lineTimes=Object.fromEntries(Object.entries(p.timing.lineTimes).map(([k,v])=>[map[+k]??k,v]));}
 p.timingOrder=2;p.credits=J.creditDefaults();
 p.generation={...J.upstreamInfo,generated:false};
 p.sourceImport={version:1,requiresGeneration:true,sourceEngine:'kamen'};
 return migrate(p);
};
J.plan=(p,a)=>Object.assign(U.plan(p,a),{generation:{...p.generation},customBg:p.customBg,titleDisplay:p.titleDisplay,singleBackground:true,upstream:true,quality:p.quality,outputResolution:p.res});
J.generateUpstream=(project,audio,{rnd=Math.random}={})=>{
 const q=JSON.parse(JSON.stringify(project)),generated=U.omakase(q,rnd,q.themeId);
 for(const [g,locked]of Object.entries(q.locks?.tech||{}))if(locked&&q.enabled?.[g])generated.enabled[g]={...q.enabled[g]};
 for(const [k,locked]of Object.entries(q.locks?.params||{}))if(locked&&q.fx?.[k]!=null)generated.fx[k]=q.fx[k];
 Object.assign(q,generated);q.generation={...J.upstreamInfo,generated:true};q.timingOrder=2;
 if(q.sourceImport)q.sourceImport.requiresGeneration=false;
 return {project:q,plan:J.plan(q,audio)};
};
J.engineOrder=(_p,g)=>U.order(g);
J.backgroundResolutionInfo=(p,image)=>{if(!p.customBg?.enabled||!image?.width)return null;const [width,height]=J.outputSize(p),rect=J.customBgGeometry(image.width,image.height,width,height,p.customBg);return rect?{sourceWidth:image.width,sourceHeight:image.height,width,height,scale:rect.w/image.width}:null;};
J.exportLRC=(p,_a,range)=>U.lrcText(p,null,range);
J.createSocialHookPlan=(p,range)=>({...p,socialHook:{...range}});
J.canonicalJSON=value=>JSON.stringify(value,(_k,v)=>v&&typeof v==='object'&&!Array.isArray(v)&&!ArrayBuffer.isView(v)?Object.fromEntries(Object.keys(v).sort().map(k=>[k,v[k]])):v);
J.compactPersistentProject=project=>JSON.parse(JSON.stringify(project));
J.historyFields.push('generation','sourceImport','themeId','timingOrder','typo','kinetic','horror','unify','typeset','centerFree','centerDir','locks');
Object.assign(U.FONTS,J.FONTS);
const ensure=J.ensureFonts;J.ensureFonts=async(...args)=>{await ensure(...args);await U.ensureFonts(...args);};
const restore=J.restoreUserFont;J.restoreUserFont=async(...args)=>{const key=await restore(...args);Object.assign(U.FONTS,J.FONTS);return key;};
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
J.exportMP4=args=>standard(args);
J.exportMP4Fallback=args=>standard(args,true);
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

})();
