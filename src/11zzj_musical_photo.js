/* Photographic direction: music-timed poses, with no free-running pulse. */
(()=>{'use strict';const J=window.J;
const enabled=p=>{const s=p.artDirection?.registrySelection;return p.photoCompositionPolicy&&s&&s.style===p.styleKey&&s.lyricsKey===J.registrySelectionLyricsKey(p)&&s.backgroundKey===J.registrySelectionBackgroundKey(p)&&!p.directorSections7?.length;};
const locked=(p,c)=>!!c&&J.photoChoreographyLocked(p,c);
const make=J.plan;J.plan=(project,audio)=>{
 const p=make(project,audio);if(!enabled(p))return p;
 p.musicalPhoto={version:1,chapterZooms:p.musicalStructure.sections.map(s=>['intro','outro','break'].includes(s.role)?1.03:['reprise','climax'].includes(s.role)?1.42:1.14),chapterGrades:p.musicalStructure.sections.map(()=>0),source:'lyric sections and salient audio beats'};
 p.fx={...p.fx,texture:0};
 p.musicalPhoto.cornerFrame=true;
 p.musicalPhoto.phraseSettle={duration:.16,initialScale:.86,fullPhraseVisible:true};
 if(p.titleDisplay)p.titleDisplay={...p.titleDisplay,font:'embedded_bold',titleSize:Math.max(p.titleDisplay.titleSize,p.H*.052)};
 for(const c of p.cuts)if(c.line>=0&&!locked(p,c)){
  c.bg='none';if(!c.registrySelected){c.hold='still';c.holdP={};c.inDur=0;c.enter='cut';}c.outDur=0;c.exit='cut';c.trans='cut';c.transDur=0;
  if(c.line===p.lines[0]?.index||c.line===0)c.params={...c.params,hookScale:1.12,intensityScale:1.3};
 }
 // Intro/outro decoration is subordinate to the supplied artwork. Fixed poses
 // change on selected audio accents rather than on arbitrary elapsed seconds.
 for(const c of p.cuts)if(c.line<0&&!locked(p,c)){c.bg='none';c.decor=[];c.cam='stillCamera';}
 p.events=p.events.filter(e=>e.manual||e.directorIntent);p.hypeTimeline=p.hypeTimeline.filter(e=>e.manual||e.directorIntent);
 const first=p.cuts.find(c=>c.line>=0&&!locked(p,c));if(first)p.events.push({type:'zoom',t:first.start,dur:.12,amp:.18,hype:true,musicalPhotoCue:true,targetType:'LYRIC_ONSET',reason:'first-lyric photograph emphasis'});
 p.events.sort((a,b)=>a.t-b.t);
 return p;
};
const camera=J.cameraAt;J.cameraAt=(p,t,range)=>{
 if(!p.musicalPhoto||locked(p,J.cutAt(p,t)))return camera(p,t,range);
 const sections=p.musicalStructure.sections,i=sections.findIndex(s=>t>=s.from&&t<s.to),s=sections[i];if(!s)return camera(p,t,range);
 const base=p.musicalPhoto.chapterZooms[i]??1.14,quiet=['intro','outro'].includes(s.role),beats=(p.beatHierarchy||[]).filter(b=>b.beatSalience>=.45&&b.time>=s.from&&b.time<=t);
 const step=quiet?beats.length%3:0;
 const ps=sections[i-1],previous=(p.musicalPhoto.chapterZooms[Math.max(0,i-1)]??base)+(ps&&['intro','outro'].includes(ps.role)?((p.beatHierarchy||[]).filter(b=>b.beatSalience>=.45&&b.time>=ps.from&&b.time<ps.to).length%3)*.022:0),u=J.clamp((t-s.from)/.08),e=u*u*(3-2*u);
 return {s:J.lerp(previous,base,e)+(quiet?step*.022:0),x:0,y:0,rot:0};
};
// The older motif wrapper displaces the entire image continuously even when
// decorative motifs are omitted. Neutralise that transform for this policy.
const physics=J.motifPhysicsAt;J.motifPhysicsAt=(p,t)=>p.musicalPhoto?{...physics(p,t),x:0,y:0,scale:1,rotation:0,skew:0}:physics(p,t);
const typography=J.applyTypography5;J.applyTypography5=(env,it)=>{typography(env,it);const law=env.plan.musicalPhoto?.phraseSettle;if(law&&env.cut.enter==='cut'&&env.cut.line>=0&&!locked(env.plan,env.cut)){const u=J.clamp((env.t-env.cut.start)/law.duration);it.size*=law.initialScale+(1-law.initialScale)*(1-(1-u)**3);}};
const background=J.Renderer.prototype.drawCustomBackground;J.Renderer.prototype.drawCustomBackground=function(ctx,p,t,...args){const value=background.call(this,ctx,p,t,...args),i=p.musicalStructure?.sections.findIndex(s=>t>=s.from&&t<s.to),s=p.musicalStructure?.sections[i],quiet=s&&['intro','outro'].includes(s.role),grade=p.musicalPhoto?(.25+(p.musicalPhoto.chapterGrades?.[i]||0)+(quiet?.025*J.clamp((t-s.from)/(s.to-s.from)):0)):0;if(grade&&!locked(p,J.cutAt(p,t))){ctx.save();ctx.globalCompositeOperation='source-over';ctx.globalAlpha=grade;ctx.fillStyle='#000';ctx.fillRect(0,0,p.W,p.H);ctx.restore();}return value;};
const credit=J.creditStateAt;J.creditStateAt=(p,t)=>p.musicalPhoto?{hidden:false,opacity:1,scale:1}:credit(p,t);
const drawCredit=J.Renderer.prototype.drawTitleCredit;J.Renderer.prototype.drawTitleCredit=function(ctx,p,t,scale){return drawCredit.call(this,ctx,p,p.musicalPhoto?Math.max(.65,t):t,scale);};
// A stable corner frame anchors the supplied artwork and survives small codec
// changes in fine photographic edges. Keep it outside the lyric safe region.
const frame=J.Renderer.prototype.frame;J.Renderer.prototype.frame=function(ctx,p,t,opt={}){const value=frame.call(this,ctx,p,t,opt);if(!p.musicalPhoto?.cornerFrame||opt.transparent||opt.backgroundOnly||opt.noHud)return value;const w=ctx.canvas.width,h=ctx.canvas.height,arm=h/9,th=h/27;ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.fillStyle='#fff';for(const [x,y,dx,dy]of [[0,0,1,1],[w,0,-1,1],[0,h,1,-1],[w,h,-1,-1]]){ctx.fillRect(dx>0?x:x-arm,dy>0?y:y-th,arm,th);ctx.fillRect(dx>0?x:x-th,dy>0?y:y-arm,th,arm);}ctx.restore();return value;};
// A single clean push, with no stacked ghost copies. The physical zoom is
// bounded so centered lyrics retain their measured safe area.
const post=J.Renderer.prototype.post;J.Renderer.prototype.post=function(ctx,p,t,...args){
 const events=p.events,cues=events.filter(e=>e.musicalPhotoCue&&t>=e.t&&t<e.t+e.dur);p.events=events.filter(e=>!e.musicalPhotoCue);
 try{post.call(this,ctx,p,t,...args);}finally{p.events=events;}
 for(const e of cues){const w=ctx.canvas.width,h=ctx.canvas.height,S=this.ensure(this.photoPush||(this.photoPush=document.createElement('canvas')),w,h),sx=S.getContext('2d');sx.setTransform(1,0,0,1,0,0);sx.globalCompositeOperation='copy';sx.drawImage(ctx.canvas,0,0);const k=1+(e.amp*.1)*(1-(t-e.t)/e.dur);ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=1;ctx.globalCompositeOperation='copy';ctx.drawImage(S,(w-w*k)/2,(h-h*k)/2,w*k,h*k);ctx.restore();}
};
// Search the existing raster-distance objective. The target, channels, weights
// and pass threshold belong to the independent QA and are never changed here.
J.refineMusicalPhotoPlan=async(p,range,telemetry={})=>{
 if(!p.musicalPhoto||p.musicalPhoto.refinement)return;
 const R=new J.Renderer(),canvas=document.createElement('canvas'),mask=document.createElement('canvas'),w=96,h=Math.round(w*p.H/p.W);canvas.width=mask.width=w;canvas.height=mask.height=h;
 const ctx=canvas.getContext('2d'),mc=mask.getContext('2d'),chapters=p.visualWorld.chapters,history=[];
 const measure=()=>{const frames=chapters.map(s=>{const time=Math.round((s.from+s.to)*5)/10;R.frame(ctx,p,time,{scale:w/p.W,production:true,lyricAuditCtx:mc,lyricAuditItems:[]});return {time,features:J.observePixelFrame(ctx.getImageData(0,0,w,h).data,w,h,mc.getImageData(0,0,w,h).data)};});return J.measureWorldDistance7(p,frames,null);};
 try{
  await R.loadCustomBackground(p.customBg.dataUrl);await R.loadAssetDeck?.(p);let best=measure();
  for(let pass=0;pass<2&&best.score<100;pass++)for(let i=1;i<chapters.length;i++){
   if(['intro','outro','break'].includes(chapters[i].role)||p.cuts.some(c=>c.start>=chapters[i].from&&c.start<chapters[i].to&&locked(p,c)))continue;
   const original=p.musicalPhoto.chapterZooms[i];let winner=original,winnerGrade=p.musicalPhoto.chapterGrades[i];
   for(const zoom of [1.08,1.14,1.22,1.30,1.38,1.46].filter(z=>z<=(p.musicalPhoto.songProfile?.mode==='drift'?1.18:p.musicalPhoto.songProfile?.mode==='flow'?1.30:1.46)))for(const grade of [0,.04,.08]){
    p.musicalPhoto.chapterZooms[i]=zoom;p.musicalPhoto.chapterGrades[i]=grade;const ev=measure();history.push({chapter:i,zoom,grade,score:ev.score,weakChapters:ev.weakChapters.length});
    if(ev.score>best.score||ev.score===best.score&&ev.weakChapters.length<=best.weakChapters.length&&zoom+grade<winner+winnerGrade){best=ev;winner=zoom;winnerGrade=grade;}
   }
   p.musicalPhoto.chapterZooms[i]=winner;p.musicalPhoto.chapterGrades[i]=winnerGrade;telemetry.onProgress?.({label:'章ごとの実画素差を比較して背景の寄り方を修正しています'});await new Promise(r=>setTimeout(r,0));
  }
  p.musicalPhoto.refinement={target:100,score:best.score,targetMet:best.score===100,history,method:'unchanged measureWorldDistance7; same renderer, same lyric masks, bounded photo crops',limits:'A uniform image may not reach the target without replacing its visual identity.'};
 }finally{R.disposeAssets?.();R.customBgBitmap?.close?.();canvas.width=mask.width=canvas.height=mask.height=1;}
};
const analyze=J.analyzeRenderedFrames;J.analyzeRenderedFrames=async(p,range,audio,telemetry={})=>{await J.refineMusicalPhotoPlan(p,range,telemetry);return analyze(p,range,audio,telemetry);};
const context=J.directorContext;J.directorContext=(project,p,...args)=>({...context(project,p,...args),musicalPhoto:p.musicalPhoto||null});
const provenance=J.createExportProvenance;J.createExportProvenance=async(...args)=>({...await provenance(...args),musicalPhoto:args[0].plan.musicalPhoto||null});
// Verify the encoded artifact, then refine the actual motion and re-encode.
// Scores, the supplied music and timestamps are never overwritten.
J.clonePhotoRenderPlan=(value,seen=new WeakMap())=>{
 if(value===null||typeof value!=='object')return value;if(seen.has(value))return seen.get(value);
 if(ArrayBuffer.isView(value))return value instanceof DataView?new DataView(value.buffer.slice(value.byteOffset,value.byteOffset+value.byteLength)):value.slice();
 if(value instanceof ArrayBuffer)return value.slice(0);if(value instanceof Blob)return value;
 if(value instanceof Map){const out=new Map();seen.set(value,out);for(const [k,v]of value)out.set(k,J.clonePhotoRenderPlan(v,seen));return out;}
 if(value instanceof Set){const out=new Set();seen.set(value,out);for(const v of value)out.add(J.clonePhotoRenderPlan(v,seen));return out;}if(value instanceof Date)return new Date(value.getTime());
 const out=Array.isArray(value)?[]:{};seen.set(value,out);for(const [k,v]of Object.entries(value))out[k]=J.clonePhotoRenderPlan(v,seen);return out;
};
// Improve a small raster plan before the single expensive MP4 encode.
J.preparePhotoExport=async args=>{
 const p=args.plan;if(!p.musicalPhoto||!p.lastPixelQA?.completed||p.musicalPhoto.preparation)return;
 const evaluate=()=>{const report=J.checkMVQuality(args.project,p,args.audio,args.range,p.lastPixelQA,{h264:true,aac:!!args.audio,webCodecs:true},null),acceptance=J.evaluateQualityTarget(report);return {report,acceptance,rank:[acceptance.minimumMet?1:0,-(report.exportErrors||[]).length,-acceptance.hardFailures.length,-acceptance.failures.length,report.quality.creativeScore??0,report.quality.socialScore??0]};};
 const better=(a,b)=>a.some((v,i)=>v!==b[i]&&a.slice(0,i).every((n,j)=>n===b[j])&&v>b[i]);
 const attempts=[];let best=evaluate();
 for(let i=0;i<4&&!best.acceptance.minimumMet;i++){
  if(args.signal?.aborted)throw new DOMException('Aborted','AbortError');
  const snapshot=J.clonePhotoRenderPlan(p),changes=J.repairPhotoBottlenecks(p,best.acceptance,i+1);if(!changes.length)break;
  J.clearPhotoComposition?.(p);p.lastPixelQA=null;delete p._provenancePlanHash;
  await J.analyzeRenderedFrames(p,args.range,args.audio,{onProgress:e=>{if(args.signal?.aborted)throw new DOMException('Aborted','AbortError');args.onProgress?.(0,e.label||'書き出す映像計画を調整しています',{stage:'frames',indeterminate:true});}});
  const candidate=evaluate(),accepted=better(candidate.rank,best.rank);attempts.push({pass:i+1,changes,accepted,acceptance:candidate.acceptance});
  if(accepted)best=candidate;else{for(const key of Object.keys(p))delete p[key];Object.assign(p,snapshot);J.clearPhotoComposition?.(p);}
 }
 p.musicalPhoto.preparation={method:'bounded raster refinement before encoding',attempts,maxPasses:4,acceptance:best.acceptance};
};
J.refinePhotoExport=async(args,encode)=>{
 const p=args.plan,V=J.cinemaV3;if(args._photoRefining)return encode(args);if(!p.musicalPhoto){if(!args.cinemaV3||!V?.enabled)return encode(args);const session=await V.beginRepair(args);try{const result=await encode(args);await V.assertSnapshot(session.input,args.project,args.audio,p,args.range);if(V.lockSignature(p)!==session.locks)throw Error('LOCK_CHANGED');result.provenance.cinemaV3={version:V.version,input:session.input,planHash:await V.planHash(p),videoHash:await J.sha256(await result.blob.arrayBuffer()),state:'UNREPAIRABLE',stopReason:'CINEMA_OBSERVATION_NOT_APPLICABLE_TO_LEGACY_RENDERER',artistic100Established:false,peakMemoryBytes:null,peakMemoryStatus:'UNMEASURED'};result.sidecar=new Blob([JSON.stringify(result.provenance,null,2)],{type:'application/json'});return result;}catch(error){V.restorePlan(p,session.original,session.originalProvenanceHash);throw error;}finally{await session.resourceScope.dispose();}}if(args.refinementAttempts===undefined)await J.preparePhotoExport(args);const session=args.cinemaV3&&V?.enabled?await V.beginRepair(args):null;const attempts=[],repairHistory=[],renderHistory=[],maxAttempts=args.refinementAttempts===undefined?(p.musicalPhoto?.cinema?.architecture?4:1):Math.max(1,Math.min(5,args.refinementAttempts));let best=null,last=null,stopReason='bounded-search-exhausted';
 try{for(let attempt=0;attempt<maxAttempts;attempt++){
  if(session&&best&&performance.now()-session.started>=session.budgetMs){stopReason='BUDGET_EXHAUSTED';break;}
  if(args.signal?.aborted)throw new DOMException('Aborted','AbortError');
  const result=await encode({...args,_photoRefining:true}),report=J.checkMVQuality(args.project,p,args.audio,args.range,p.lastPixelQA,{h264:true,aac:!!result.audio,webCodecs:true},result.validation),score=report.quality.overallScore;last=result;
  const acceptance=J.evaluateQualityTarget(report),decoded=p.lastPixelQA?.metrics?.decodedCinema,measured=decoded?.completed&&p.musicalPhoto?.cinema?.architecture,rank=J.cinemaCandidateRank?J.cinemaCandidateRank(acceptance,decoded,score):[acceptance.minimumMet?1:0,-acceptance.hardFailures.length,-acceptance.failures.length,score];
  const v3=session?await V.observeRepair(session,args,result,best):null;const protectedMetrics=best?J.cinemaProtectedRegressions?.(best.acceptance,acceptance)||[]:[],stronger=session?(!best||v3.accepted):!best||!protectedMetrics.length&&rank.some((n,i)=>n!==best.rank[i]&&rank.slice(0,i).every((v,k)=>v===best.rank[k])&&n>best.rank[i]);
  const node={renderId:result.provenance.videoSHA256+':render-'+(attempt+1),parentRenderId:renderHistory.at(-1)?.renderId??null,renderAttempt:attempt+1,repairPass:p.musicalPhoto?.cinema?.targetedRepair?.attempt??0,planHash:result.provenance.planHash??p._provenancePlanHash??null,frameEvidenceHash:await J.sha256(J.canonicalJSON(decoded??null)),frameEvidenceFormat:'SHA-256 of canonical decoded observation JSON; not raw frame bytes',videoSHA256:result.provenance.videoSHA256};result.provenance.renderId=node.renderId;renderHistory.push(node);attempts.push({renderId:node.renderId,protectedRegressions:protectedMetrics,attempt:attempt+1,score,creative:report.quality.creativeScore,musicalDirection:report.quality.productionDomains?.musicalDirection,certified100:report.quality.certified100,acceptance});p.lastQualityTarget=acceptance;
  if(stronger)best={v3,result,score,rank,acceptance,attempt:attempt+1,plan:session||maxAttempts>1?J.clonePhotoRenderPlan(p):null,hash:p._provenancePlanHash};
  if(session&&!v3.decodedCompleted){stopReason='UNREPAIRABLE:DECODED_QA_UNMEASURED';break;}if(report.quality.certified100){stopReason='certified-100';break;}if(acceptance.minimumMet&&!p.lastPixelQA?.metrics?.decodedCinema?.weakLines?.length){stopReason='all-measured-minima-met; certification-evidence-retained';break;}if(report.errors.some(e=>e.exportBlocking!==false)){stopReason='export-blocking-failure';break;}if(attempt===maxAttempts-1){if(maxAttempts===1)stopReason='single-encode-completed; measured deficits retained';break;}
  if(p.musicalPhoto?.cinema?.architecture&&!p.lastPixelQA?.metrics?.decodedCinema?.completed){stopReason='decoded-cinema-unmeasured; no blind re-encode';break;}
  if(session&&!stronger&&best?.plan)V.restorePlan(p,best.plan,best.hash);
  args.onProgress?.(.99,'完成したMP4の採点から文字の収束を修正して再生成しています',{stage:'verify',indeterminate:true});
  const renderedBefore=p.lastPixelQA?.metrics?.cinemaFeedback?.samples?.map(s=>s.signature).flat(),before=J.canonicalJSON({photo:p.musicalPhoto,cuts:p.cuts,events:p.events}),changes=session?V.applyRepair(p,best.acceptance,attempt+1).changes:J.repairPhotoBottlenecks(p,acceptance,attempt+1);attempts.at(-1).repairs=changes;repairHistory.push(JSON.parse(JSON.stringify(p.musicalPhoto?.cinema?.targetedRepair||{attempt:attempt+1,changes})));if(!changes.length||before===J.canonicalJSON({photo:p.musicalPhoto,cuts:p.cuts,events:p.events})){stopReason='no-further-render-change-in-safe-search';break;}
  if(session&&session.state.state==='DECODED_QA')V.transition(session.state,'REPAIRABLE',{confirmedPlanHash:best.v3.evaluation.planHash});
  J.clearPhotoComposition?.(p);p.lastPixelQA=null;delete p._provenancePlanHash;await J.analyzeRenderedFrames(p,args.range,args.audio,{signal:args.signal,onProgress:e=>args.onProgress?.(.99,e.label,{stage:'verify',indeterminate:true})});
  const renderedAfter=p.lastPixelQA?.metrics?.cinemaFeedback?.samples?.map(s=>s.signature).flat();if(p.musicalPhoto?.cinema?.architecture&&renderedBefore?.length&&renderedBefore.length===renderedAfter?.length&&renderedBefore.reduce((sum,v,i)=>sum+Math.abs(v-renderedAfter[i]),0)/renderedBefore.length<.001){attempts.at(-1).proxyPlateau=true;args.onProgress?.(.99,'微修正の画素差が小さいため次の失敗では構造を変更します',{stage:'verify',indeterminate:true});}
 }
 }catch(error){if(session){V.restorePlan(p,best?.plan||session.original,best?.hash??session.originalProvenanceHash);V.interruptState(session.state||V.createState(session.input.inputHash,'unencoded'),args.signal?.aborted?'CANCELLED':'FAILED:'+error.message);}throw error;}finally{await session?.resourceScope.dispose();}
 // Keep the strongest measured artifact if a later refinement regresses.
 if(best.plan){if(session)V.restorePlan(p,best.plan,best.hash);else{for(const key of Object.keys(p))delete p[key];Object.assign(p,best.plan);Object.defineProperty(p,'_provenancePlanHash',{value:best.hash,configurable:true});J.clearPhotoComposition?.(p);}}
 if(session){const state=session.state||V.createState(session.input.inputHash,best.v3.evaluation.planHash);if(state.state==='DECODED_QA')V.transition(state,best.v3.eligible&&best.acceptance.minimumMet?'ACCEPTED':stopReason==='BUDGET_EXHAUSTED'?'BUDGET_EXHAUSTED':'UNREPAIRABLE',{confirmedPlanHash:best.v3.evaluation.planHash,outcome:stopReason});best.result.provenance.cinemaV3={version:V.version,input:session.input,planHash:best.v3.evaluation.planHash,videoHash:best.v3.videoHash,state:state.state,history:session.evaluations,selectedEvidence:best.v3.evaluation,stopReason,artistic100Established:false,peakMemoryBytes:null,peakMemoryStatus:'UNMEASURED'};}
 best.result.provenance.targetedRepair={selectedRenderId:best.result.provenance.renderId,selectedArtifactAttempt:best.attempt,repairPassProducesRenderAttempt:true,appliedToSelectedArtifact:p.musicalPhoto?.cinema?.targetedRepair?{...p.musicalPhoto.cinema.targetedRepair,repairPass:p.musicalPhoto.cinema.targetedRepair.attempt,producedRenderAttempt:best.attempt,producedRenderId:best.result.provenance.renderId}:null,attemptedRepairs:repairHistory,rejectedRepairsRemainHistoryOnly:true};best.result.provenance.machineRefinement={target:100,minimum:90,minimumDetail:80,minimumMet:best.acceptance.minimumMet,acceptance:best.acceptance,score:best.score,attempts,selectedArtifactAttempt:best.attempt,repairHistory,maxAttempts,stopReason,preparation:p.musicalPhoto.preparation||null,scoring:'KAMEN scorer applied to decoded MP4; per-item acceptance, original thresholds and weights',limits:'Automatic architecture permits at most four encodes by default with decoded evidence; legacy defaults to one; best artifact retained; unresolved failures are retained. Manual direction and unmeasured certification requirements remain authoritative.'};
 best.result.provenance.renderHistory={schema:'kamen-render-dag-v1',selectedRenderId:best.result.provenance.renderId,nodes:renderHistory,limits:'Each parent is the actual preceding encode; rejected candidates remain history only'};best.result.sidecar=new Blob([JSON.stringify(best.result.provenance,null,2)],{type:'application/json'});return best.result;
};
for(const key of ['exportMP4','exportMP4Fallback']){const encode=J[key];if(encode)J[key]=args=>J.refinePhotoExport(args,encode);}
})();
