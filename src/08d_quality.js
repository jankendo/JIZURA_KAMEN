/* Preflight checks only what the browser can measure or infer from the render plan. */
(() => {
'use strict';
const finite = Number.isFinite;
const issue = (code, severity, message, fixable=false) => ({code,severity,message,fixable});
J.checkMVQuality = (project, plan, audio, range=null,pixelQA=null,capabilities=null,exportValidation=null) => {
  const issues=[], parsed=J.parseLyrics(project.lyrics), lines=plan?.lines||[];
  const start=range?.start??0,end=range?.end??plan?.duration??0;
  const active=lines.filter(l=>l.start>=start-.03&&l.start<end+.03);
  if(!audio?.buffer || !finite(audio.duration) || audio.duration<=0)issues.push(issue('audio_missing','ERROR','音源を読み込んでください'));
  if(!parsed.lines.length || !active.length)issues.push(issue('lyrics_missing','ERROR','表示できる歌詞がありません'));
  if(parsed.lines.some(l=>l.lrc==null))issues.push(issue('lrc_missing','WARNING','時刻のない歌詞があります。同期を確認してください'));
  if(!finite(end)||end<=start||!finite(plan?.duration)||plan.duration<=0)issues.push(issue('duration','ERROR','動画の長さを確認できません'));
  if(audio?.duration && end>audio.duration+.12)issues.push(issue('audio_range','ERROR','歌詞または動画が音源の長さを超えています'));
  const seen=new Set();
  for(let i=0;i<lines.length;i++){
    const l=lines[i];
    if(!finite(l.start)||!finite(l.end)||l.end<=l.start)issues.push(issue('timing_invalid','ERROR',`${i+1}行目の時刻が正しくありません`));
    if(i&&l.start<lines[i-1].start-.01)issues.push(issue('timing_reverse','ERROR','歌詞の時刻が逆転しています'));
    if(seen.has(l.start.toFixed(2)))issues.push(issue('timing_duplicate','WARNING','同じ時刻から始まる歌詞があります'));
    seen.add(l.start.toFixed(2));
    if(l.start<-0.01 || audio?.duration&&l.start>audio.duration+.1)issues.push(issue('lrc_outside','ERROR',`${i+1}行目の時刻が音源の範囲外です`));
  }
  const [w,h]=J.outputSize(project), fps=plan?.fps;
  if(!finite(w)||!finite(h)||w<320||h<320||w%2||h%2)issues.push(issue('resolution','ERROR','動画サイズが正しくありません'));
  if(!finite(fps)||fps<20||fps>60)issues.push(issue('fps','ERROR','フレームレートが正しくありません'));
  if(end>0&&end-start>0&&Math.round((end-start)*fps)<1)issues.push(issue('frames','ERROR','動画のフレーム数がありません'));
  if(project.customBg?.enabled&&!project.customBg.dataUrl)issues.push(issue('image_missing','WARNING','背景画像を確認してください'));
  if(project.autoDirection&&project.artDirection?.version<5)issues.push(issue('legacy_direction','WARNING','以前の演出を現在の品質基準に更新します',!!audio?.features));
  if(project.customBg?.blur>10)issues.push(issue('blur','WARNING','背景のぼかしを弱めます',true));
  if(project.customBg?.darkness>.52)issues.push(issue('darkness','WARNING','背景が暗すぎるため調整します',true));
  if(project.fx?.glitch>.5||project.fx?.motion>.86)issues.push(issue('motion','WARNING','速すぎる動きを抑えます',true));
  const portrait=h>w, maxChars=portrait?17:30;
  if(project.autoDirection&&plan?.lyricPlacement){
    const p=plan.lyricPlacement,previewWidth=portrait?390:364;
    const smallest=Math.min(...active.map(l=>{
      const glyphs=Math.max(1,Math.ceil([...l.text].length/2));
      return Math.min(plan.H*.22,plan.W*p.maxWidth*.87/glyphs)*previewWidth/plan.W;
    }));
    if(smallest<12)issues.push(issue('lyric_small','WARNING','SNS表示で歌詞が小さくなるため配置を調整します',!project.lyricPlacementWide&&!portrait));
    if(p.subjectOverlap>.58)issues.push(issue('subject_overlap','WARNING','画像の目立つ領域に歌詞が重なる可能性があります'));
  }
  if(plan?.titleDisplay){const d=plan.titleDisplay,screen=(portrait?390:364)/plan.W;
    if(d.title&&d.titleSize*screen<10||d.artist&&d.titleSize*.9*screen<9)
      issues.push(issue('credit_small','WARNING','SNS表示でタイトルやアーティストが小さく見えます'));
    if((d.title||d.artist)&&(d.contrast||0)<4.5)issues.push(issue('title_contrast','WARNING','タイトルの背景との明暗差を強めます',true));
  }
  const dna=plan?.artDirection?.motionDNA,chant=/CHANT|TEAM_CALL/.test(plan?.artDirection?.visualDNA?.type||'');
  if(dna){
    const cuts=(plan.cuts||[]).filter(c=>c.line>=0&&c.start>=start&&c.start<end);
    if(chant&&cuts.some(c=>c.inDur>.35))issues.push(issue('transition_long','WARNING','チャントの歌詞切替を短く調整します',true));
    if(chant&&cuts.some(c=>c.repeated&&c.inDur>.02))issues.push(issue('lyric_invisible_gap','WARNING','反復歌詞の表示が途切れています'));
    const values=cuts.map(c=>c.params?.intensityScale??1),curve=plan.artDirection.intensityCurve||[];
    if(values.length>=6&&Math.max(...curve)-Math.min(...curve)>.24&&Math.max(...values)-Math.min(...values)<.018)
      issues.push(issue('motion_flat','WARNING','曲の強弱に対して文字の反応が単調です'));
    if(J.cameraAt&&cuts.some(c=>{const a=J.cameraAt(plan,Math.max(start,c.start-.002),range),b=J.cameraAt(plan,c.start+.002,range);
      return a&&b&&(Math.abs(a.s-b.s)>.008||Math.abs(a.x-b.x)>plan.W*.01||Math.abs(a.y-b.y)>plan.H*.01);}))
      issues.push(issue('camera_reset','WARNING','歌詞の切替時に背景の動きが飛んでいます'));
    if(end-start<=60&&J.loopQuality){const loop=J.loopQuality(plan,audio,range);
      if(loop.cameraDifference>.025||loop.audioDifference>.75)issues.push(issue('loop_seam','WARNING','動画のループ時に映像または音量の差が目立つ可能性があります'));
    }
  }
  if(active.some(l=>[...l.text].length>maxChars*2))issues.push(issue('long_lyric','WARNING','長い歌詞が小さく見える可能性があります',true));
  if(portrait && plan?.cuts?.some(c=>c.line>=0&&['marquee','scatter','ring','tile','diag'].includes(c.layout)))
    issues.push(issue('portrait_layout','WARNING','縦動画の歌詞を中央の安全な配置にします',true));
  if(plan?.titleDisplay && portrait && ['br','tr'].includes(plan.titleDisplay.position))
    issues.push(issue('title_safe','WARNING','タイトルを操作ボタンから離します',true));
  const stats=project.autoPalette?.stats;
  if(project.customBg?.enabled && stats && stats.detail>.6 && !project.autoPalette?.localMap)
    issues.push(issue('contrast','WARNING','背景の情報量が多いため歌詞を見やすくします',true));
  if(audio?.peakAmplitude!=null&&audio.peakAmplitude<.0001)issues.push(issue('silence','WARNING','音源がほぼ無音の可能性があります'));
  if(audio?.clipFraction>.004)issues.push(issue('audio_clip','WARNING','音源に音割れの可能性があります'));
  const directionAudit=project.autoDirection?J.auditDirectionRealization?.(plan,pixelQA):null;
  if(directionAudit?.errors?.length)issues.push(issue('direction_realization','ERROR','自動演出の一部を動画へ反映できていません',true));
  if(directionAudit?.warnings?.includes('high_energy_render_nearly_static'))issues.push(issue('visual_motion_low','WARNING','盛り上がりに対して映像の動きが弱く見えます',true));
  if(directionAudit?.warnings?.includes('chant_visual_signature_repeats'))issues.push(issue('chant_visual_repeats','WARNING','同じ歌詞の演出が続いています',true));
  if(pixelQA?.issues?.length)for(const entry of pixelQA.issues)if(!issues.some(i=>i.code===entry.code))issues.push(entry);
  if(pixelQA?.metrics?.lyricNotRendered>0&&!issues.some(i=>i.code==='LYRIC_NOT_RENDERED'))issues.push(issue('LYRIC_NOT_RENDERED','ERROR','表示予定の歌詞に文字Pixelがありません'));
  if(pixelQA?.metrics?.lyricPartialClip>0&&!issues.some(i=>i.code==='LYRIC_PARTIAL_CLIP'))issues.push(issue('LYRIC_PARTIAL_CLIP','ERROR','歌詞の文字が安全領域から大きく欠けています'));
  if(capabilities&&(!capabilities.h264||project.includeAudio!==false&&audio?.buffer&&!capabilities.aac)&&!capabilities.recorder)
    issues.push(issue('export_unsupported','ERROR','この端末で使えるMP4書き出し方式が見つかりません'));
  if(exportValidation){
    const expected=J.outputSize(project),hasAudio=project.includeAudio!==false&&!!audio?.buffer;
    if(exportValidation.container!=='mp4'||exportValidation.videoCodec!=='avc1'||exportValidation.duration<=0||exportValidation.bytes<=0||
      exportValidation.width!==expected[0]||exportValidation.height!==expected[1]||
      hasAudio&&(exportValidation.audioCodec!=='mp4a'||!exportValidation.audioSamples)||
      !hasAudio&&exportValidation.audioCodec)
      issues.push(issue('export_validation','ERROR','完成した動画の形式を確認できません'));
    else if(Math.abs(exportValidation.duration-(end-start))>Math.max(.5,1/(plan?.fps||30)))
      issues.push(issue('export_duration_mismatch','WARNING','完成した動画の長さが指定範囲と少し異なります'));
  }
  const errors=issues.filter(i=>i.severity==='ERROR'),warnings=issues.filter(i=>i.severity==='WARNING');
  const report={ready:!errors.length,issues,errors,warnings,checked:{lyrics:!!active.length,layout:!!plan?.cuts?.length,audio:!!audio?.buffer,sns:w>=320&&h>=320,video:finite(fps)&&fps>0,pixels:!!pixelQA?.completed,capabilities:!!capabilities},range:{start,end},directionAudit,pixelQA};
  report.checked.exportValidation=!!exportValidation;
  return J.scoreMVQuality(report,project,plan,audio,range,pixelQA,capabilities,exportValidation);
};
J.scoreMVQuality=(report,project,plan,audio,range=null,pixelQA=null,capabilities=null,exportValidation=null)=>{
  const categories={lyrics:25,motion:20,composition:15,coherence:15,repetition:10,title:5,export:10};
  const penalty={lyrics_missing:['lyrics',25],lrc_missing:['lyrics',5],timing_invalid:['lyrics',14],timing_reverse:['lyrics',12],timing_duplicate:['lyrics',5],lrc_outside:['lyrics',14],audio_range:['lyrics',8],lyric_small:['lyrics',8],long_lyric:['lyrics',4],
    visual_motion_low:['motion',8],motion_flat:['motion',5],camera_reset:['motion',3],direction_realization:['motion',7],
    subject_overlap:['composition',8],portrait_layout:['composition',4],contrast:['composition',5],title_safe:['composition',3],
    legacy_direction:['coherence',5],chant_visual_repeats:['repetition',7],transition_long:['repetition',2],lyric_invisible_gap:['lyrics',5],
    credit_small:['title',3],title_contrast:['title',3],
    image_missing:['composition',5],loop_seam:['motion',3],frozen_frame:['motion',6],render_unavailable:['export',3],
    audio_missing:['export',10],audio_clip:['export',4],silence:['export',5],duration:['export',10],resolution:['export',10],fps:['export',7],frames:['export',10],export_unsupported:['export',10],export_validation:['export',10],export_duration_mismatch:['export',2],black_frame:['export',10],render_failed:['export',8]};
  const earned={...categories};
  for(const item of report.issues){const entry=penalty[item.code];if(!entry)continue;const [key,value]=entry;earned[key]=Math.max(0,earned[key]-value*(item.severity==='ERROR'?1:1));}
  const hard=report.issues.some(i=>i.severity==='ERROR');
  const measured=!!pixelQA?.completed,codecReady=!!(capabilities?.webCodecs||capabilities?.recorder);
  if(!measured)earned.motion=Math.min(earned.motion,17);
  if(!codecReady)earned.export=Math.min(earned.export,6);
  if(!exportValidation)earned.export=Math.min(earned.export,8);
  if(hard&&project.artDirection?.realityVersion!==2){const ratio=Math.min(1,69/Math.max(1,Object.values(earned).reduce((a,b)=>a+b,0)));for(const key of Object.keys(earned))earned[key]=Math.floor(earned[key]*ratio);}
  const score=Math.round(Object.values(earned).reduce((a,b)=>a+b,0));
  report.quality={score:Math.max(0,score),categories:Object.entries(earned).map(([key,value])=>({key,score:value,max:categories[key]})),
    hardGates:{passed:!hard,total:report.issues.filter(i=>i.severity==='ERROR').length},pixelQA:measured?'checked':'pending',exportCapability:codecReady?'checked':'pending',exportValidation:exportValidation?'checked':'pending'};
  report.ready=!hard;return report;
};
J.fixMVQuality = (project, report, audio) => {
  let changes=0;
  for(const i of report.issues){if(!i.fixable)continue;
    if(i.code==='legacy_direction'&&audio?.features){
      const proposal=J.proposeDirection(project,audio,project.autoPalette?.stats||null);
      Object.assign(project,{style:proposal.style,mood:proposal.mood,fx:proposal.fx,enabled:proposal.enabled,seed:proposal.seed,overrides:proposal.overrides,lyricPlacementWide:false});
      project.artDirection=J.makeArtDirection(project,audio,proposal);changes++;
    }
    if(i.code==='blur' && project.customBg.blur>8){project.customBg.blur=8;changes++;}
    if(i.code==='darkness' && project.customBg.darkness>.32){project.customBg.darkness=.32;changes++;}
    if(i.code==='motion'){
      if(project.fx.glitch>.3){project.fx.glitch=.3;changes++;}
      if(project.fx.motion>.75){project.fx.motion=.75;changes++;}
    }
    if(i.code==='portrait_layout'){
      for(const k of ['marquee','scatter','ring','tile','diag'])if(project.enabled?.layout?.[k]!==false){project.enabled.layout[k]=false;changes++;}
      for(const [key,value] of Object.entries(project.overrides||{}))if(['marquee','scatter','ring','tile','diag'].includes(value.layout)){
        project.overrides[key]=Object.assign({},value,{layout:'center'});changes++;
      }
    }
    if((i.code==='title_safe'||i.code==='title_contrast')&&project.titleDisplay){
      if(project.titleDisplay.position!=='auto'){project.titleDisplay.position='auto';changes++;}
      if(!project.titleDisplay.autoColor){project.titleDisplay.autoColor=true;changes++;}
    }
    if(i.code==='direction_realization'&&audio?.features){
      const proposal=J.proposeDirection(project,audio,project.autoPalette?.stats||null);
      Object.assign(project,{style:proposal.style,mood:proposal.mood,fx:proposal.fx,enabled:proposal.enabled,seed:proposal.seed,overrides:proposal.overrides});
      project.artDirection=J.makeArtDirection(project,audio,proposal);changes++;
    }
    if(i.code==='visual_motion_low'&&project.artDirection?.motionDNA){
      project.artDirection.motionDNA.cameraSpeed=Math.min(.92,Math.max(.62,project.artDirection.motionDNA.cameraSpeed||0));
      project.artDirection.motionDNA.beatResponse=Math.min(.72,Math.max(.45,project.artDirection.motionDNA.beatResponse||0));changes++;
    }
    if(i.code==='contrast'&&project.autoPalette?.options){project.autoPalette.options.readability=true;project.lyricPlacementWide=true;changes++;}
    if(i.code==='long_lyric'){
      // Use a stable, simpler layout; never rewrite the user's Japanese lyrics.
      for(const k of ['huge','marquee','scatter','ring','tile'])if(project.enabled?.layout?.[k]!==false){project.enabled.layout[k]=false;changes++;}
    }
    if(i.code==='lyric_small'&&!project.lyricPlacementWide){project.lyricPlacementWide=true;changes++;}
    if(i.code==='lyrics_clipped'){
      if(!project.lyricPlacementWide){project.lyricPlacementWide=true;changes++;}
      else if(project.enabled?.layout){
        const active=Object.keys(project.enabled.layout).filter(k=>project.enabled.layout[k]);
        if(active.length>1||active[0]!=='center'){
          for(const k of Object.keys(project.enabled.layout))project.enabled.layout[k]=k==='center';
          changes++;
        }
      }
    }
    if(i.code==='transition_long'&&project.artDirection?.motionDNA){project.artDirection.motionDNA.transitionDuration=.28;changes++;}
  }
  return changes;
};
J.preflightMV = (project, audio, range=null, makePlan=()=>J.plan(project,audio)) => {
  let plan=makePlan(), report,fixes=0;
  for(let pass=0;pass<3;pass++){
    report=J.checkMVQuality(project,plan,audio,range);
    const n=J.fixMVQuality(project,report,audio);if(!n)break;
    fixes+=n;plan=makePlan();
  }
  report=J.checkMVQuality(project,plan,audio,range);
  return {plan,report,fixes};
};
/* Compare a small, deterministic set of direction solutions before committing one. */
J.optimizeDirectionCandidates=(project,audio,imageStats,max=3)=>{
  const count=Math.max(1,Math.min(3,Math.floor(max)||3)),candidates=[];
  for(let variant=0;variant<count;variant++){
    const proposal=J.proposeDirection(project,audio,imageStats,variant),candidate=Object.assign({},project,{
      style:proposal.style,mood:proposal.mood,fx:proposal.fx,enabled:proposal.enabled,seed:proposal.seed,
      overrides:proposal.overrides,lyricPlacementWide:false,autoDirection:true
    });
    candidate.artDirection=J.makeArtDirection(candidate,audio,proposal);
    const plan=J.plan(candidate,audio),audit=J.auditDirectionRealization?.(plan),inspection=J.inspectDirection(plan);
    const placement=plan.lyricPlacement||{},title=plan.titleDisplay||{};
    const score=(inspection.coherent?30:0)+(audit?.ok?24:0)+
      Math.max(0,18-(placement.subjectOverlap||0)*24)+
      Math.min(12,Math.max(0,(title.titleSize||0)*364/Math.max(1,plan.W)-7))+
      (proposal.signals.image?5:0)+(proposal.signals.audio?5:0)-
      (audit?.warnings?.length||0)*3-(audit?.errors?.length||0)*12;
    candidates.push({variant,proposal,plan,audit,score:+score.toFixed(3)});
  }
  candidates.sort((a,b)=>b.score-a.score||a.variant-b.variant);
  return {recommended:candidates[0],candidates};
};
J.analyzeRenderedFrames = async (plan,range=null,audio=null,telemetry={}) => {
  const result={completed:false,issues:[],metrics:{sampleCount:0,blackFrames:0,clippedLyrics:0,motionEnergy:0,renderedBounds:[],visualNovelty:0,stagnationSeconds:0,sampleInterval:0}};
  if(typeof document==='undefined'||!document.createElement){result.issues.push(issue('render_unavailable','WARNING','この環境ではCanvas画質検査を実行できません'));return result;}
  const from=range?.start??0,to=range?.end??plan.duration,duration=Math.max(.01,to-from);
  const canvas=document.createElement('canvas');canvas.width=192;canvas.height=Math.max(108,Math.round(192*plan.H/plan.W));
  const lyricCanvas=document.createElement('canvas');lyricCanvas.width=canvas.width;lyricCanvas.height=canvas.height;
  const lyricCtx=lyricCanvas.getContext('2d',{willReadFrequently:true});
  const ctx=canvas.getContext('2d',{willReadFrequently:true});if(!ctx){result.issues.push(issue('render_unavailable','WARNING','Canvas画質検査を開始できません'));return result;}
  const R=new J.Renderer(),scale=canvas.width/plan.W,collector=[];
  const active=(plan.lines||[]).filter(l=>l.start>=from&&l.start<to);
  const sampleInterval=Math.max(.25,Math.min(.5,duration/180));
  result.metrics.sampleInterval=sampleInterval;
  const times=[];
  for(let t=from;t<to-.005;t+=sampleInterval)times.push(t);
  // Add lyric and section boundaries so the proxy sees both steady motion and editorial changes.
  const pickEven=(items,n)=>items.length<=n?items:Array.from({length:n},(_,i)=>items[Math.round(i*(items.length-1)/(n-1))]);
  for(const line of pickEven(active,8)){
    const cut=(plan.cuts||[]).find(c=>c.line===line.index&&c.layout!=='interlude');if(!cut)continue;
    times.push(Math.min(to-.02,Math.max(from,line.start+.18)),Math.max(from,Math.min(to-.02,line.visEnd-.12)));
  }
  const profiles=(plan.artDirection?.sectionProfiles||[]).filter(p=>p.start>=from&&p.start<to).sort((a,b)=>b.intensity-a.intensity);
  const pairs=[];for(const p of profiles.slice(0,3)){const t=Math.max(from,p.start+.25);if(t+.14<Math.min(to,p.end))pairs.push([t,t+.14]);}
  times.push(...pairs.flat());
  const samples=[...new Set(times.map(t=>Math.max(from,Math.min(to-.01,t))).map(t=>+t.toFixed(3)))].sort((a,b)=>a-b).slice(0,192),frames=new Map();
  const sampleFrame=(t)=>{
    collector.length=0;R.frame(ctx,plan,t,{scale,range,production:true,qualityCollector:collector});
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let luma=0,nonBlack=0,hash=2166136261,count=0,red=0,green=0,blue=0;
    for(let i=0;i<pixels.length;i+=32){const r=pixels[i],g=pixels[i+1],b=pixels[i+2],v=(r*.2126+g*.7152+b*.0722)/255;luma+=v;nonBlack+=+(v>.03);red+=r;green+=g;blue+=b;hash=Math.imul(hash^Math.round(v*255),16777619)>>>0;count++;}
    const bounds=collector.filter(b=>b.line>=0);for(const b of bounds)if(b.box.x0<-.01||b.box.y0<-.01||b.box.x1>1.01||b.box.y1>1.01)result.metrics.clippedLyrics++;
    result.metrics.renderedBounds.push(...bounds);
    const cols=24,rows=14,grid=[];
    for(let gy=0;gy<rows;gy++)for(let gx=0;gx<cols;gx++){
      const x=Math.min(canvas.width-1,Math.floor((gx+.5)*canvas.width/cols)),y=Math.min(canvas.height-1,Math.floor((gy+.5)*canvas.height/rows)),i=(y*canvas.width+x)*4;
      grid.push(pixels[i]/255,pixels[i+1]/255,pixels[i+2]/255);
    }
    const box=bounds.length?bounds.reduce((o,b)=>({x0:Math.min(o.x0,b.box.x0),y0:Math.min(o.y0,b.box.y0),x1:Math.max(o.x1,b.box.x1),y1:Math.max(o.y1,b.box.y1)}),{x0:1,y0:1,x1:0,y1:0}):null;
    const mainCut=J.cutAt(plan,t),style=mainCut?.styleKey||plan.styleKey;
    return {pixels,luma:luma/count,nonBlack:nonBlack/count,hash,bounds,grid,palette:[red/count/255,green/count/255,blue/count/255],
      layout:mainCut?.layout||'',style,line:bounds.map(b=>b.line).filter((n,i,a)=>a.indexOf(n)===i).join(','),box};
  };
  try{
    if(plan.customBg?.enabled&&plan.customBg.dataUrl)await R.loadCustomBackground(plan.customBg.dataUrl);
    await R.loadAssetDeck?.(plan);
    for(const [i,t] of samples.entries()){frames.set(t,sampleFrame(t));telemetry.onProgress?.({label:'代表フレームの画質を検査しています',current:i+1,total:samples.length});if(i%4===0)await new Promise(r=>setTimeout(r,0));}
    // Every LRC row is inspected at entry, its steady interval, and just before exit.
    const lyricPoints=[],lyricFailures=[];
    telemetry.onProgress?.({label:'歌詞の表示・画面端の欠けを検査しています'});
    for(const line of (plan.lines||[])){
      if(line.start>=to||line.visEnd<=from||!String(line.text||'').trim())continue;
      const begin=Math.max(from,line.start),finish=Math.min(to,line.visEnd||line.end);
      for(const [phase,at] of [['start',begin+.08],['middle',(begin+finish)/2],['end',finish-.08]]){
        if(at<begin||at>=finish)continue;
        const items=[];R.frame(ctx,plan,at,{scale,range,production:true,lyricAuditCtx:lyricCtx,lyricAuditItems:items});
        const pixels=lyricCtx.getImageData(0,0,lyricCanvas.width,lyricCanvas.height).data;
        let ink=0;for(let i=3;i<pixels.length;i+=4)if(pixels[i]>24)ink++;
        const drawn=items.filter(x=>x.line===line.index&&x.bounds),box=drawn.length?drawn.reduce((a,x)=>({x0:Math.min(a.x0,x.bounds.x0),y0:Math.min(a.y0,x.bounds.y0),x1:Math.max(a.x1,x.bounds.x1),y1:Math.max(a.y1,x.bounds.y1)}),{x0:Infinity,y0:Infinity,x1:-Infinity,y1:-Infinity}):null;
        const expected=box?Math.max(1,(box.x1-box.x0)*(box.y1-box.y0)*scale*scale):0;
        const missing=ink<Math.max(5,expected*.012),clipped=!!box&&(box.x0<plan.W*.02||box.x1>plan.W*.98||box.y0<plan.H*.025||box.y1>plan.H*.975);
        const point={line:line.index,phase,time:+at.toFixed(3),ink,expected:Math.round(expected),missing,clipped,bounds:box};lyricPoints.push(point);
        if(missing||clipped)lyricFailures.push(point);
        if(lyricPoints.length%8===0)await new Promise(r=>setTimeout(r,0));
      }
    }
    result.metrics.lyricPoints=lyricPoints;result.metrics.lyricNotRendered=lyricFailures.filter(x=>x.missing).length;
    result.metrics.lyricPartialClip=lyricFailures.filter(x=>x.clipped).length;
    if(result.metrics.lyricNotRendered)result.issues.push(issue('LYRIC_NOT_RENDERED','ERROR','実Canvasで表示予定の歌詞が見つかりません'));
    if(result.metrics.lyricPartialClip)result.issues.push(issue('LYRIC_PARTIAL_CLIP','ERROR','実Canvasで歌詞が画面端から欠けています'));
    const deltas=[];for(const [a,b] of pairs){const A=frames.get(+a.toFixed(3)),B=frames.get(+b.toFixed(3));if(!A||!B)continue;
      let d=0,n=0;for(let i=0;i<A.pixels.length;i+=64){const y1=A.pixels[i]*.2126+A.pixels[i+1]*.7152+A.pixels[i+2]*.0722,y2=B.pixels[i]*.2126+B.pixels[i+1]*.7152+B.pixels[i+2]*.0722;d+=Math.abs(y1-y2)/255;n++;}deltas.push(d/Math.max(1,n));}
    const observations=[...frames.entries()].map(([time,frame])=>({time,...frame}));
    const novelty=J.measurePerceptualNovelty?J.measurePerceptualNovelty(observations):{score:0,stagnationSeconds:0,pairs:[]};
    result.metrics.sampleCount=frames.size;result.metrics.blackFrames=[...frames.values()].filter(f=>f.luma<.008&&f.nonBlack<.01).length;
    result.metrics.motionEnergy=deltas.length?deltas.reduce((a,b)=>a+b,0)/deltas.length:0;
    result.metrics.visualNovelty=novelty.score;result.metrics.stagnationSeconds=novelty.stagnationSeconds;
    const foreground=document.createElement('canvas');foreground.width=canvas.width;foreground.height=canvas.height;
    const foregroundCtx=foreground.getContext('2d',{willReadFrequently:true}),foregroundTimes=pickEven(samples.filter(t=>J.cutAt(plan,t)?.line>=0),18);
    let previous=null,foregroundChange=0,foregroundPairs=0;
    for(const t of foregroundTimes){R.frame(foregroundCtx,plan,t,{scale,range,production:true,transparent:true,fast:true});
      const px=foregroundCtx.getImageData(0,0,foreground.width,foreground.height).data;
      if(previous){let delta=0,count=0;for(let i=0;i<px.length;i+=32){delta+=Math.abs(px[i+3]-previous[i+3])/255+Math.abs(px[i]-previous[i])/510;count++;}foregroundChange+=delta/Math.max(1,count);foregroundPairs++;}
      previous=px;
    }
    result.metrics.foregroundNovelty=Math.round(Math.min(100,foregroundChange/Math.max(1,foregroundPairs)*260));
    result.metrics.openingNovelty=novelty.openingNovelty;result.metrics.temporalContrast=novelty.temporalContrast;
    result.metrics.distinctLayoutCount=new Set(observations.map(f=>f.layout).filter(Boolean)).size;
    result.metrics.distinctStyleCount=new Set(observations.map(f=>f.style).filter(Boolean)).size;
    result.metrics.backgroundShotDiversity=new Set((plan.cuts||[]).filter(c=>c.start>=from&&c.start<to).map(c=>c.backgroundScene?.id).filter(Boolean)).size;
    result.metrics.temporalNovelty=novelty.pairs;
    result.completed=frames.size>0;
    if(result.metrics.blackFrames===frames.size&&frames.size)result.issues.push(issue('black_frame','ERROR','映像が黒いままになっています'));
    if(result.metrics.clippedLyrics)result.issues.push(issue('lyrics_clipped','ERROR','歌詞が画面の外にはみ出しています',true));
    if(plan.artDirection?.visualDNA?.energy>.68&&pairs.length>=2&&result.metrics.motionEnergy<.001)
      result.issues.push(issue('visual_motion_low','WARNING','盛り上がりに対して映像の動きが弱く見えます',true));
    if(novelty.stagnationSeconds>8&&['HYPER','HIGH_ENERGY'].includes(plan.visualEnergyDensity?.tier))
      result.issues.push(issue('visual_stagnation',plan.visualEnergyDensity.tier==='HYPER'?'WARNING':'WARNING','高密度区間で画面の変化が長く止まっています'));
    if(frames.size>=3&&new Set([...frames.values()].map(f=>f.hash)).size===1)
      result.issues.push(issue('frozen_frame','WARNING','映像に変化が見られません。プレビューを確認してください'));
  }catch(e){result.issues.push(issue('render_failed','ERROR','動画フレームの検査に失敗しました'));}
  finally{if(R.customBgBitmap?.close)R.customBgBitmap.close();canvas.width=canvas.height=1;lyricCanvas.width=lyricCanvas.height=1;}
  return result;
};
J.inspectRenderedFrames=async(plan,range=null,audio=null)=>(await J.analyzeRenderedFrames(plan,range,audio)).issues;
})();
