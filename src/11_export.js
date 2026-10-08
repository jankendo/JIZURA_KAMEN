/* ============================================================
   JIZURA — export: MP4 (WebCodecs + mp4-muxer), PNG sequence ZIP,
   file saving (artifact download capability or plain browser download)
   ============================================================ */
(() => {
'use strict';

J.EXPORT_PRESETS={
  auto:{label:'自動おすすめ'},xStandard:{label:'X 軽量 720p',aspect:'16:9',res:720,fps:30,quality:'high',videoBitrate:6000000,audioBitrate:192000},
  xHigh:{label:'X 高画質',aspect:'16:9',res:1080,fps:30,quality:'high',videoBitrate:9000000,audioBitrate:192000},
  youtube1080:{label:'YouTube 1080p',aspect:'16:9',res:1080,fps:30,quality:'high',videoBitrate:8000000,audioBitrate:192000},
  vertical:{label:'9:16 SNS',aspect:'9:16',res:1080,fps:30,quality:'high',videoBitrate:8000000,audioBitrate:192000},
  master:{label:'高品質マスター',aspect:'16:9',res:1440,fps:30,quality:'max',videoBitrate:16000000,audioBitrate:256000},custom:{label:'カスタム'}
};
J.resolveExportSettings=project=>Object.assign({preset:'auto',videoCodec:'auto',videoBitrate:0,audioBitrate:192000,sampleRate:48000,range:'full',fileName:''},project?.exportSettings||{});
J.applyExportPreset=(project,key)=>{
  const preset=J.EXPORT_PRESETS[key];if(!preset)throw new Error('書き出しプリセットが見つかりません');
  project.exportSettings=Object.assign(J.resolveExportSettings(project),{preset:key});
  if(key!=='auto'&&key!=='custom'){
    project.aspect=preset.aspect;project.res=preset.res;project.fps=preset.fps;project.quality=preset.quality;
    project.exportSettings.videoBitrate=preset.videoBitrate;project.exportSettings.audioBitrate=preset.audioBitrate;
  }
  return project;
};
J.estimateExport=(project,duration,includeAudio=project?.includeAudio!==false)=>{
  const [w,h]=J.outputSize(project),fps=project?.fps||30,settings=J.resolveExportSettings(project);
  const videoBitrate=Number(settings.videoBitrate)>0?Number(settings.videoBitrate):Math.min(w*h<=2.2e6?40e6:60e6,w*h*fps*(project?.quality==='max'?.42:project?.quality==='standard'?.16:.28));
  const audioBitrate=includeAudio?Math.min(320000,Math.max(128000,Number(settings.audioBitrate)||192000)):0;
  const seconds=Math.max(0,Number(duration)||0),bytes=Math.ceil((videoBitrate+audioBitrate)*seconds/8*1.04),fileMiB=bytes/1048576;
  const workingMiB=fileMiB*1.65+w*h*4*3/1048576;
  const memory=workingMiB>500?'危険':workingMiB>220?'高':workingMiB>80?'中':'低';
  return {width:w,height:h,fps,seconds,videoBitrate,audioBitrate,bytes,fileMiB:+fileMiB.toFixed(1),workingMiB:+workingMiB.toFixed(0),memory};
};

/* ---------- saving ---------- */
// Open the picker during the original click, before analysis/encoding consumes activation.
J.prepareFileSave = (filename, type) => {
  if (typeof window.showSaveFilePicker !== 'function' || globalThis.navigator?.userActivation?.isActive === false) return Promise.resolve(null);
  const ext='.'+filename.split('.').pop();
  try { return window.showSaveFilePicker({suggestedName:filename,types:[{description:filename,accept:{[type]:[ext]}}]})
    .catch(error=>error.name==='AbortError'?'declined':null); }
  catch { return Promise.resolve(null); }
};
const downloads=new Map();
J.saveFile = async (filename, data, options={}) => {
  const blob=data instanceof Blob?data:new Blob([data]);
  const destination=await options.destination;
  if(destination==='declined')return 'declined';
  if(destination){
    let writable;
    try{writable=await destination.createWritable();await writable.write(blob);await writable.close();downloads.get(filename)?.remove();return 'saved';}
    catch(error){try{await writable?.abort();}catch{} console.warn('KAMEN file write failed; download remains available',error);}
  }
  // A programmatic click after a long export can be blocked. Retain a real
  // user-clickable link until dismissed instead of claiming disk-save success.
  downloads.get(filename)?.remove();
  let panel=document.getElementById('kamenDownloads');
  if(!panel){panel=document.createElement('section');panel.id='kamenDownloads';panel.className='kamen-downloads';panel.setAttribute('aria-label','生成ファイルの保存');
    const title=document.createElement('strong');title.textContent='生成ファイルを保存';panel.appendChild(title);
    const hint=document.createElement('p');hint.textContent='保存されない場合は、下のファイル名を押してください。この画面を閉じる前に保存してください。';panel.appendChild(hint);document.body.appendChild(panel);}
  const url=URL.createObjectURL(blob),row=document.createElement('div'),a=document.createElement('a'),dismiss=document.createElement('button');
  row.className='kamen-download-row';a.href=url;a.download=filename;a.textContent=filename+' を保存';
  const open=document.createElement('a');open.href=url;open.target='_blank';open.rel='noopener';open.textContent='別タブで開く';
  dismiss.type='button';dismiss.textContent='閉じる';dismiss.setAttribute('aria-label',filename+' の保存リンクを閉じる');
  let removed=false;
  const remove=()=>{if(removed)return;removed=true;row.remove();URL.revokeObjectURL(url);downloads.delete(filename);if(!downloads.size)panel.remove();};
  dismiss.addEventListener('click',remove);row.append(a,open,dismiss);panel.appendChild(row);downloads.set(filename,{remove});
  // Sidecar files remain links; one automatic download avoids multi-download blocking.
  if(options.automatic!==false)a.click();
  return 'download';
};

/* Every asynchronous encoder boundary is cancellable and bounded. */
J.waitExportStep = (operation,{signal,label='処理',timeout=45000,onTimeout}={}) => new Promise((resolve,reject)=>{
  let timer,finished=false;
  const finish=(error,value)=>{if(finished)return;finished=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve(value);};
  const abort=()=>finish(Object.assign(new Error('キャンセルしました'),{name:'AbortError'}));
  if(signal?.aborted){abort();return;}
  signal?.addEventListener('abort',abort,{once:true});
  timer=setTimeout(()=>{finish(Object.assign(new Error(label+'が応答しません。別の書き出し方法で再試行します'),{code:'ENCODER_TIMEOUT'}));try{onTimeout?.();}catch{}},timeout);
  Promise.resolve().then(()=>typeof operation==='function'?operation():operation).then(v=>finish(null,v),e=>finish(e));
});
J.waitEncoderCapacity=async(encoder,limit,{signal,label,getError=()=>null,getProgress=()=>0,timeout=45000}={})=>{
  let last=performance.now(),previous=encoder.encodeQueueSize,output=getProgress();
  while(encoder.encodeQueueSize>limit){
    if(signal?.aborted)throw Object.assign(new Error('キャンセルしました'),{name:'AbortError'});
    if(getError())throw getError();
    const queue=encoder.encodeQueueSize,n=getProgress();
    if(queue!==previous||n!==output){last=performance.now();previous=queue;output=n;}
    if(performance.now()-last>timeout)throw Object.assign(new Error(label+'が応答しません。別の書き出し方法で再試行します'),{code:'ENCODER_TIMEOUT'});
    await new Promise(r=>setTimeout(r,10));
  }
  if(getError())throw getError();
};

/* ---------- codec negotiation ---------- */
J.pickVideoCodec = async (w, h, fps, bitrate) => {
  if (typeof VideoEncoder === 'undefined') return null;
  const cands = [
    { codec: 'avc1.640033', mux: 'avc', label: 'H.264 High' },
    { codec: 'avc1.4d0033', mux: 'avc', label: 'H.264 Main' },
    { codec: 'avc1.42003e', mux: 'avc', label: 'H.264 Baseline' },
  ];
  for (const c of cands) {
    const cfg = { codec: c.codec, width: w, height: h, bitrate, framerate: fps };
    if (c.mux === 'avc') cfg.avc = { format: 'avc' };
    try { const s = await J.waitExportStep(()=>VideoEncoder.isConfigSupported(cfg),{label:'映像コーデック確認',timeout:10000}); if (s.supported) return Object.assign({}, c, { cfg }); } catch (e) {}
  }
  return null;
};
/* Keep SNS exports in H.264; retry supported software profiles if a device encoder stalls. */
J.videoAttempts = async (w,h,fps,bitrate) => {
  if(typeof VideoEncoder==='undefined')return [];
  const primary=await J.pickVideoCodec(w,h,fps,bitrate);
  if(!primary)return [];
  const attempts=[primary];
  for(const codec of [primary.codec,'avc1.4d0033','avc1.42003e']){
    if(attempts.length>=4)break;
    const cfg={codec,width:w,height:h,framerate:fps,bitrate,hardwareAcceleration:'prefer-software',avc:{format:'avc'}};
    if(attempts.some(a=>a.cfg.codec===cfg.codec&&a.cfg.hardwareAcceleration===cfg.hardwareAcceleration))continue;
    try{if((await J.waitExportStep(()=>VideoEncoder.isConfigSupported(cfg),{label:'映像コーデック確認',timeout:10000})).supported)attempts.push({codec,mux:'avc',label:'H.264（ソフトウェア）',cfg});}catch(e){}
  }
  return attempts;
};
J.verifyEncodedTracks = ({frames,expected,audioChunks=0,audioEnd=0,audioExpected=0}) => {
  if(frames<Math.max(1,Math.floor(expected*.98)))throw new Error(`映像のフレームが不足しています（${frames}/${expected}）。再試行してください`);
  if(audioExpected>0&&(audioChunks===0||audioEnd<Math.max(0,audioExpected-.5)*1e6))
    throw new Error('音声のエンコードが途中で停止しました。再試行してください');
};
J.pickAudioCodec = async (sr, chn, requestedBitrate=192000) => {
  if (typeof AudioEncoder === 'undefined') return window.JIZURAAAC?{codec:'mp4a.40.2',mux:'aac',sr:[44100,48000].includes(Number(sr))?Number(sr):48000,bitrate:requestedBitrate,wasm:true}:null;
  const requested=Math.min(320000,Math.max(128000,Number(requestedBitrate)||192000));
  const bitrates=[requested];
  for (const bitrate of bitrates) {
    const c={codec:'mp4a.40.2',mux:'aac',sr:[44100,48000].includes(Number(sr))?Number(sr):48000,bitrate};
    try { const s = await J.waitExportStep(()=>AudioEncoder.isConfigSupported({ codec:c.codec,sampleRate:c.sr,numberOfChannels:chn,bitrate }),{label:'音声コーデック確認',timeout:10000}); if (s.supported) return c; } catch (e) {}
  }
  return window.JIZURAAAC?{codec:'mp4a.40.2',mux:'aac',sr:Number(sr)||48000,bitrate:requested,wasm:true}:null;
};

/* Parse the produced bytes, not the encoder configuration, before offering the file. */
J.inspectMP4Buffer = (buffer,{requireAudio=true}={}) => {
  if(!(buffer instanceof ArrayBuffer)||buffer.byteLength<100)throw new Error('動画ファイルが空です');
  const view=new DataView(buffer),size=buffer.byteLength;
  const str=(p,n=4)=>Array.from({length:n},(_,i)=>String.fromCharCode(view.getUint8(p+i))).join('');
  const out={container:null,videoCodec:null,audioCodec:null,duration:0,width:0,height:0,videoSamples:0,audioSamples:0,bytes:size};
  let mdat=false;const tracks=new Map();
  const containers=new Set(['moov','trak','mdia','minf','stbl','edts','dinf']);
  function walk(from,to,track=null,depth=0){
    if(depth>8)return;
    for(let p=from;p+8<=to;){
      let length=view.getUint32(p),header=8;if(length===1){if(p+16>to)break;length=Number(view.getBigUint64(p+8));header=16;}
      else if(length===0)length=to-p;
      if(!Number.isSafeInteger(length)||length<header||p+length>to)break;
      const type=str(p+4),d=p+header;
      if(type==='ftyp')out.container='mp4';
      if(type==='mdat'&&length>header)mdat=true;
      if(type==='mvhd'&&d+28<=p+length){const v=view.getUint8(d),o=v===1?20:12;
        const scale=view.getUint32(d+o),dur=v===1?Number(view.getBigUint64(d+o+4)):view.getUint32(d+o+4);
        if(scale>0)out.duration=dur/scale;
      }
      if(type==='mdhd'&&track&&d+24<=p+length){const o=view.getUint8(d)===1?20:12;track.timescale=view.getUint32(d+o);track.duration=(view.getUint8(d)===1?Number(view.getBigUint64(d+o+4)):view.getUint32(d+o+4))/track.timescale;}
      if(type==='tkhd'&&track){const o=view.getUint8(d)===1?20:12;track.id=view.getUint32(d+o);}
      if(type==='hdlr'&&track&&d+12<=p+length)track.kind=str(d+8);
      if(type==='tkhd'&&track&&length>=16){track.width=view.getUint32(p+length-8)/65536;track.height=view.getUint32(p+length-4)/65536;}
      if(type==='stsd'&&track&&d+16<=p+length)track.codec=str(d+12);
      if(type==='stsz'&&track&&d+12<=p+length)track.samples=view.getUint32(d+8);
      if(type==='trak'){const t={kind:null,codec:null,samples:0,width:0,height:0};walk(d,p+length,t,depth+1);
        tracks.set(t.id,t);
        if(t.kind==='vide'){out.videoDuration=t.duration;out.videoCodec=t.codec;out.videoSamples=t.samples;out.width=t.width;out.height=t.height;}
        if(t.kind==='soun'){out.audioDuration=t.duration;out.audioCodec=t.codec;out.audioSamples=t.samples;}
      }else if(containers.has(type))walk(d,p+length,track,depth+1);
      p+=length;
    }
  }
  walk(0,size);
  // MediaRecorder produces fragmented MP4: sample tables and mvhd may be empty.
  const boxes=(from,to)=>{const list=[];for(let p=from;p+8<=to;){let n=view.getUint32(p),h=8;if(n===1){if(p+16>to)break;n=Number(view.getBigUint64(p+8));h=16;}else if(!n)n=to-p;if(n<h||p+n>to)break;list.push({type:str(p+4),d:p+h,end:p+n});p+=n;}return list;};
  for(const moof of boxes(0,size).filter(b=>b.type==='moof'))for(const traf of boxes(moof.d,moof.end).filter(b=>b.type==='traf')){
    const children=boxes(traf.d,traf.end),head=children.find(b=>b.type==='tfhd');if(!head||head.d+8>head.end)continue;
    const flags=view.getUint32(head.d)&0xffffff,t=tracks.get(view.getUint32(head.d+4));if(!t)continue;
    let q=head.d+8;if(flags&1)q+=8;if(flags&2)q+=4;let defaultDuration=0;if(flags&8&&q+4<=head.end)defaultDuration=view.getUint32(q);
    const tfdt=children.find(b=>b.type==='tfdt');let decodeTime=t.fragmentEnd||0;
    if(tfdt&&tfdt.d+8<=tfdt.end)decodeTime=view.getUint8(tfdt.d)===1?Number(view.getBigUint64(tfdt.d+4)):view.getUint32(tfdt.d+4);
    for(const run of children.filter(b=>b.type==='trun')){
      if(run.d+8>run.end)continue;const f=view.getUint32(run.d)&0xffffff,count=view.getUint32(run.d+4);let r=run.d+8;if(f&1)r+=4;if(f&4)r+=4;
      const stride=((f&0x100?1:0)+(f&0x200?1:0)+(f&0x400?1:0)+(f&0x800?1:0))*4;
      if(r+count*stride>run.end)continue;
      for(let i=0;i<count;i++){decodeTime+=(f&0x100)?view.getUint32(r):defaultDuration;r+=stride;}
      t.fragmentSamples=(t.fragmentSamples||0)+count;
    }
    t.fragmentEnd=Math.max(t.fragmentEnd||0,decodeTime);
  }
  for(const t of tracks.values())if(t.fragmentSamples){
    if(t.kind==='vide')out.videoSamples+=t.fragmentSamples;if(t.kind==='soun')out.audioSamples+=t.fragmentSamples;
    if(t.timescale)out.duration=Math.max(out.duration,t.fragmentEnd/t.timescale);
  }
  if(out.container!=='mp4'||!mdat||out.videoCodec!=='avc1'||
     requireAudio&&(out.audioCodec!=='mp4a'||!out.audioSamples)||
     !out.videoSamples||out.duration<=0||out.width<=0||out.height<=0)
    throw Object.assign(new Error('MP4を検査した結果、映像または音声が正しく含まれていません。'),{inspection:out});
  return out;
};

async function resample(buffer, sr, duration, start=0) {
  const chn = Math.min(2, buffer.numberOfChannels);
  const len = Math.ceil(duration * sr);
  const oc = new OfflineAudioContext(chn, len, sr);
  const src = oc.createBufferSource(); src.buffer = buffer; src.connect(oc.destination); src.start(0,start);
  return oc.startRendering();
}

/* ---------- MP4 ---------- */
J.exportMP4 = async ({ plan, project, audio, range=null, quality = 'high', onProgress, signal, videoAttempt=null,audioAttempt=null }) => {
  const [w, h] = J.outputSize(project);
  const fps = plan.fps;
  const px = w * h * fps;
  const exportSettings=J.resolveExportSettings(project);
  const bitrate=Math.round(Number(exportSettings.videoBitrate)>0?exportSettings.videoBitrate:Math.min(w*h<=2.2e6?40e6:60e6,px*(quality==='max'?.42:quality==='high'?.28:.16)));
  const vc = videoAttempt||await J.pickVideoCodec(w, h, fps, bitrate);
  if (!vc) throw new Error('このブラウザは動画エンコード（WebCodecs）に対応していません。Chrome か Edge の最新版で開いてください。');
  let ac = null;
  if (audio && audio.buffer && project.includeAudio !== false) ac = audioAttempt||await J.pickAudioCodec(exportSettings.sampleRate, Math.min(2, audio.buffer.numberOfChannels),exportSettings.audioBitrate);
  if (audio && audio.buffer && project.includeAudio !== false && !ac) throw new Error('この端末はAAC音声でのMP4書き出しに対応していません。対応ブラウザで開いてください。');
  const target = new Mp4Muxer.ArrayBufferTarget();
  const muxOpts = { target, video: { codec: vc.mux, width: w, height: h, frameRate: fps }, fastStart: 'in-memory', firstTimestampBehavior: 'offset' };
  if (ac) muxOpts.audio = { codec: ac.mux, numberOfChannels: Math.min(2, audio.buffer.numberOfChannels), sampleRate: ac.sr };
  const muxer = new Mp4Muxer.Muxer(muxOpts);
  let err = null,videoFrames=0;
  const venc = new VideoEncoder({ output: (chunk, meta) => {try{muxer.addVideoChunk(chunk,meta);videoFrames++;}catch(e){err=e;}}, error: e => { err = e; } });
  try{venc.configure(Object.assign({}, vc.cfg, { latencyMode: 'realtime' }));}catch(e){venc.close();throw e;}
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { alpha: false });
  const R = new J.Renderer();
  let audioJob=null,pipelineStopped=false,videoDone=false,activeAenc=null;
  const pipeline=new AbortController(),cancelPipeline=()=>pipeline.abort();signal?.addEventListener('abort',cancelPipeline,{once:true});if(signal?.aborted)pipeline.abort();
  const guard=(operation,label,timeout=45000)=>J.waitExportStep(operation,{signal:pipeline.signal,label,timeout});
  const audioProgress=(...args)=>{if(videoDone)onProgress?.(...args);};
  try {
  if (!plan.keyBg && plan.customBg && plan.customBg.enabled && plan.customBg.dataUrl) await R.loadCustomBackground(plan.customBg.dataUrl);
  await R.loadAssetDeck?.(plan);
  const start=range?.start??0,duration=(range?.end??plan.duration)-start;
  if(!Number.isFinite(duration)||duration<=0||start<0||audio?.duration&&start+duration>audio.duration+.12)
    throw new Error('動画の切り出し範囲を確認してください');
  const total = Math.max(1, Math.round(duration * fps));
  const encodeAudio=async()=>{
    audioProgress(.91, '音声を変換中',{stage:'resample',indeterminate:true});
    const rs = await guard(()=>resample(audio.buffer,ac.sr,duration,start),'音声変換',Math.max(45000,Math.min(120000,duration*1000)));
    if(pipeline.signal.aborted)throw new Error('キャンセルしました');
    const chn = rs.numberOfChannels;
    let audioChunks=0,audioEnd=0;
    if(ac.wasm){audioProgress(.92,'音声をエンコードしています',{stage:'audio',indeterminate:true});await guard(()=>window.JIZURAAAC.encode(rs,ac.bitrate,(chunk,meta)=>{if(pipeline.signal.aborted)return;muxer.addAudioChunk(chunk,meta);audioChunks++;audioEnd=Math.max(audioEnd,chunk.timestamp+(chunk.duration||0));},{signal:pipeline.signal,onProgress:(current,total)=>audioProgress(.92+.06*current/total,'音声をエンコード中',{stage:'audio',current,total})}),'AAC音声エンコード',Math.max(60000,Math.min(300000,duration*2000)));}
    else {
    const aenc = new AudioEncoder({ output: (chunk, meta) => {try{muxer.addAudioChunk(chunk,meta);audioChunks++;audioEnd=Math.max(audioEnd,chunk.timestamp+(chunk.duration||0));}catch(e){err=e;}}, error: e => { err = e; } });
    activeAenc=aenc;
    try {
    aenc.configure({ codec:ac.codec,sampleRate:ac.sr,numberOfChannels:chn,bitrate:ac.bitrate||192000 });
    const frames = rs.length, block = 4800;
    for (let off = 0; off < frames; off += block) {
      if(signal?.aborted||pipelineStopped)throw new Error('キャンセルしました');
      if(err)throw err;
      const n = Math.min(block, frames - off);
      const data = new Float32Array(n * chn);
      for (let c = 0; c < chn; c++) data.set(rs.getChannelData(c).subarray(off, off + n), c * n);
      const ad = new AudioData({ format: 'f32-planar', sampleRate: ac.sr, numberOfFrames: n, numberOfChannels: chn, timestamp: Math.round(off * 1e6 / ac.sr), data });
      try{aenc.encode(ad);}finally{ad.close();}
      await J.waitEncoderCapacity(aenc,16,{signal:pipeline.signal,label:'音声エンコーダー',getError:()=>err,getProgress:()=>audioChunks});
      if(off%24000===0)audioProgress(.92+.06*off/frames,'音声をエンコード中',{stage:'audio',current:Math.min(frames,off+n),total:frames});
    }
    audioProgress(.98,'音声のエンコード完了を待っています',{stage:'audio',indeterminate:true});
    await guard(()=>aenc.flush(),'音声エンコーダーの完了'); aenc.close();
    if (err) throw err;

    } finally {activeAenc=null;if(aenc.state!=='closed')aenc.close();}
    }
    return {audioChunks,audioEnd};
  };
  audioJob=ac?encodeAudio().catch(error=>{err=error;return null;}):null;
  const scale = w / plan.W;
  const prevRes = J.glyphs.maxRes; J.glyphs.maxRes = h >= 1000 ? 768 : 512;
  try {
  let lastYield=performance.now(),lastProgress=-Infinity;
  for (let i = 0; i < total; i++) {
    if (signal?.aborted) throw new Error('キャンセルしました');
    if (err) throw err;
    await guard(()=>R.prepareAssetFrame?.(plan,start+i/fps),'動画素材のフレーム');
    R.frame(ctx, plan, start+i / fps, { scale, production:true, range });
    const vf = new VideoFrame(canvas, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
    try{venc.encode(vf, { keyFrame: i % (fps * 2) === 0 });}finally{vf.close();}
    await J.waitEncoderCapacity(venc,4,{signal:pipeline.signal,label:'映像エンコーダー',getError:()=>err,getProgress:()=>videoFrames});
    if(i===Math.min(total-1,fps*3)&&videoFrames===0){await guard(()=>venc.flush(),'映像エンコーダーの完了');if(!videoFrames)throw new Error('映像エンコーダーが出力を返しません');}
    const now=performance.now();
    if(now-lastProgress>=100||i===total-1){onProgress?.(.9*(i+1)/total,`映像・音声を並行生成中 ${i+1}/${total}フレーム`,{stage:'frames',current:i+1,total,encoded:videoFrames});lastProgress=now;}
    if(now-lastYield>=16){await new Promise(r=>setTimeout(r,0));lastYield=performance.now();}
  }
  } finally { J.glyphs.maxRes = prevRes; }
  onProgress?.(.9,'映像のエンコード完了を待っています',{stage:'video',indeterminate:true});
  await guard(()=>venc.flush(),'映像エンコーダーの完了'); venc.close();
  if(err)throw err;
  J.verifyEncodedTracks({frames:videoFrames,expected:total});
  videoDone=true;
  if(ac){onProgress?.(.91,'並行処理した音声の完了を確認しています',{stage:'audio',indeterminate:true});const sound=await audioJob;if(err)throw err;J.verifyEncodedTracks({frames:videoFrames,expected:total,...sound,audioExpected:Math.min(duration,audio.buffer.duration-start)});}
  onProgress&&onProgress(.985,'MP4にまとめています',{stage:'mux',indeterminate:true});
  muxer.finalize();
  onProgress&&onProgress(.995,'動画を検査しています',{stage:'verify',indeterminate:true});
  const validation=J.inspectMP4Buffer(target.buffer,{requireAudio:!!ac});
  onProgress && onProgress(.995, '生成済みファイルの検査を続けています',{stage:'verify',indeterminate:true});
  return { blob: new Blob([target.buffer], { type: 'video/mp4' }), codec: vc.label, audio: ac ? ac.mux : null, width: w, height: h, validation };
  } finally {
    pipelineStopped=true;pipeline.abort();signal?.removeEventListener('abort',cancelPipeline);
    if(activeAenc?.state!=='closed')try{activeAenc?.close();}catch{}
    // audioJob already handles rejection; cleanup must never wait for a stuck codec.
    if(venc.state!=='closed')venc.close();
    if(R.customBgBitmap?.close)R.customBgBitmap.close();R.disposeAssets?.();
    canvas.width=canvas.height=1;
  }
};

J.exportCapabilities = async (project,audio) => {
  const settings=J.resolveExportSettings(project),estimate=J.estimateExport(project,Math.max(.1,audio?.duration||1),project?.includeAudio!==false);
  const [w,h]=J.outputSize(project),video=await J.pickVideoCodec(w,h,project.fps||30,settings.videoBitrate||estimate.videoBitrate);
  const sound=audio?.buffer&&project?.includeAudio!==false?await J.pickAudioCodec(settings.sampleRate,Math.min(2,audio.buffer.numberOfChannels),settings.audioBitrate):null;
  const mimeCandidates=project?.includeAudio!==false?['video/mp4;codecs="avc1.42E01E,mp4a.40.2"']:['video/mp4;codecs="avc1.42E01E"','video/mp4'];
  const recorder=typeof MediaRecorder!=='undefined' && typeof HTMLCanvasElement!=='undefined' &&
    !!HTMLCanvasElement.prototype.captureStream?mimeCandidates.find(m=>MediaRecorder.isTypeSupported?.(m))||null:null;
  return {webCodecs:!!video&&(!audio?.buffer||project?.includeAudio===false||!!sound),h264:!!video,aac:!!sound,recorder,
    offscreen:typeof OffscreenCanvas!=='undefined',worker:typeof Worker!=='undefined'};
};

/* Real-time MP4 fallback on browsers with MediaRecorder MP4 support. Never relabel a WebM as MP4. */
J.exportMP4Fallback = async ({plan,project,audio,range=null,onProgress,signal}) => {
  onProgress?.(0,'映像と音声を録画する方法で準備しています',{stage:'frames',label:'映像と音声を録画しています',skip:['video','resample','audio','mux'],indeterminate:true});
  const includeAudio=project.includeAudio!==false;
  if(includeAudio&&!audio?.buffer)throw new Error('音源を読み込んでください');
  const caps=await J.exportCapabilities(project,audio);
  if(!caps.recorder)throw new Error('この端末ではMP4の代替書き出しにも対応していません。別のブラウザでお試しください');
  const start=range?.start??0,duration=(range?.end??plan.duration)-start;
  if(!(duration>0)||(audio?.duration&&start+duration>audio.duration+.12))throw new Error('動画の切り出し範囲を確認してください');
  const [w,h]=J.outputSize(project),canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
  const ctx=canvas.getContext('2d',{alpha:false});if(!ctx)throw new Error('動画の描画を開始できません');
  const R=new J.Renderer();let ac,source,stream,recorder,raf=0;
  const chunks=[];
  try{
    if(plan.customBg?.enabled&&plan.customBg.dataUrl)await R.loadCustomBackground(plan.customBg.dataUrl);
  await R.loadAssetDeck?.(plan);
    const tracks=[...canvas.captureStream(project.fps||30).getVideoTracks()];
    if(includeAudio){
      const AC=window.AudioContext||window.webkitAudioContext;if(!AC)throw new Error('この端末では音声付き動画を録画できません');
      ac=new AC({sampleRate:J.resolveExportSettings(project).sampleRate});const destination=ac.createMediaStreamDestination();
      source=ac.createBufferSource();source.buffer=audio.buffer;source.connect(destination);
      tracks.push(...destination.stream.getAudioTracks());await ac.resume();
    }
    for(const a of R.assetBitmaps?.values()||[])if(a.video)await a.video.play();
    stream=new MediaStream(tracks);R.frame(ctx,plan,start,{scale:w/plan.W,production:true,range});
    const settings=J.resolveExportSettings(project),estimate=J.estimateExport(project,duration,includeAudio);
    recorder=new MediaRecorder(stream,{mimeType:caps.recorder,videoBitsPerSecond:Math.max(2e6,Math.round(settings.videoBitrate||estimate.videoBitrate))});
    const result=new Promise((resolve,reject)=>{recorder.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data);};
      recorder.onerror=e=>reject(e.error||new Error('代替書き出しに失敗しました'));
      recorder.onstop=()=>resolve(new Blob(chunks,{type:'video/mp4'}));});
    result.catch(()=>{});recorder.start(1000);source?.start(0,start,duration);
    const beginning=performance.now();
    await J.waitExportStep(new Promise((resolve,reject)=>{
      const step=now=>{
        if(signal?.aborted){reject(new Error('キャンセルしました'));return;}
        if(document.hidden){reject(new Error('書き出し中に画面が閉じられました。画面を表示したまま再試行してください'));return;}
        const elapsed=Math.min(duration,(now-beginning)/1000);
        try{R.frame(ctx,plan,start+elapsed,{scale:w/plan.W,production:true,range});}catch(e){reject(e);return;}
        onProgress?.(elapsed/duration*.96,`動画を録画中 ${Math.floor(elapsed)} / ${Math.ceil(duration)}秒`,{stage:'frames',current:Math.min(elapsed,duration),total:duration,unit:'秒'});
        if(elapsed>=duration)resolve();else raf=requestAnimationFrame(step);
      };raf=requestAnimationFrame(step);
    }),{signal,label:'動画の録画',timeout:duration*1000+45000});
    recorder.stop();onProgress?.(.98,'MP4を検査しています',{stage:'verify',indeterminate:true});
    const blob=await J.waitExportStep(result,{signal,label:'録画の完了'});
    const validation=J.inspectMP4Buffer(await blob.arrayBuffer(),{requireAudio:includeAudio});
    onProgress?.(.995,'MP4コンテナ検査完了',{stage:'verify',indeterminate:true});return {blob,codec:'H.264',audio:includeAudio?'aac':null,width:w,height:h,validation,fallback:true};
  }finally{
    cancelAnimationFrame(raf);if(recorder?.state==='recording')recorder.stop();
    try{source?.stop();}catch(e){}stream?.getTracks().forEach(t=>t.stop());if(ac)await J.waitExportStep(()=>ac.close(),{label:'音声録画の終了',timeout:3000}).catch(()=>{});
    if(R.customBgBitmap?.close)R.customBgBitmap.close();R.disposeAssets?.();canvas.width=canvas.height=1;
  }
};

/* ---------- PNG sequence as ZIP (store, no compression) ---------- */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (u8) => { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC[(c ^ u8[i]) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
class ZipWriter {
  constructor() { this.parts = []; this.central = []; this.offset = 0; }
  add(name, u8) {
    const nb = new TextEncoder().encode(name), crc = crc32(u8);
    const lh = new DataView(new ArrayBuffer(30));
    lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0x0800, true); lh.setUint16(8, 0, true);
    lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true); lh.setUint32(14, crc, true); lh.setUint32(18, u8.length, true); lh.setUint32(22, u8.length, true);
    lh.setUint16(26, nb.length, true); lh.setUint16(28, 0, true);
    this.parts.push(lh.buffer, nb, u8);
    const ch = new DataView(new ArrayBuffer(46));
    ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true); ch.setUint16(8, 0x0800, true); ch.setUint16(10, 0, true);
    ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true); ch.setUint32(16, crc, true); ch.setUint32(20, u8.length, true); ch.setUint32(24, u8.length, true);
    ch.setUint16(28, nb.length, true); ch.setUint32(42, this.offset, true);
    this.central.push(ch.buffer, nb);
    this.offset += 30 + nb.length + u8.length;
  }
  finish() {
    const cdSize = this.central.reduce((s, p) => s + (p.byteLength ?? p.length), 0);
    const n = this.central.length / 2;
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, n, true); end.setUint16(10, n, true); end.setUint32(12, cdSize, true); end.setUint32(16, this.offset, true);
    return new Blob([...this.parts, ...this.central, end.buffer], { type: 'application/zip' });
  }
}
J.ZipWriter=ZipWriter;
J.createDirectorPack=async({context,project,audioFile})=>{
  const zip=new ZipWriter(),encode=text=>new TextEncoder().encode(text),add=(name,value)=>zip.add(name,encode(value));
  add('DIRECTOR_CONTEXT.json',JSON.stringify(context,null,2));
  add('lyrics.lrc',String(project.lyrics||''));
  add('CHATGPT_PROMPT.md',J.directorPrompt());
  add('PROJECT_SUMMARY.md',`# ${project.title||'JIZURA project'}\n\nArtist: ${project.artist||'—'}\nDuration: ${context.duration}s\nProject hash: ${context.projectHash}\n`);
  const bg=project.customBg?.dataUrl;
  if(bg&&bg.startsWith('data:image/')){
    const type=bg.slice(5,bg.indexOf(';')),ext=type==='image/png'?'png':type==='image/webp'?'webp':type==='image/jpeg'?'jpg':null;
    if(ext){let bytes=new Uint8Array(await (await fetch(bg)).arrayBuffer()),name=`background.${ext}`;
      if(ext!=='webp'&&typeof createImageBitmap==='function'){
        const bitmap=await createImageBitmap(new Blob([bytes],{type}));
        try{const canvas=document.createElement('canvas');canvas.width=bitmap.width;canvas.height=bitmap.height;
          canvas.getContext('2d').drawImage(bitmap,0,0);
          const converted=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.88));
          if(converted?.type==='image/webp'){bytes=new Uint8Array(await converted.arrayBuffer());name='background.webp';}
        }finally{bitmap.close?.();}
      }
      zip.add(name,bytes);
    }
  }
  if(audioFile instanceof Blob&&audioFile.size<=120*1024*1024){
    const extension=/\.(mp3|m4a|wav|ogg|flac)$/i.exec(audioFile.name||'')?.[1]?.toLowerCase()||'bin';
    zip.add(`audio.${extension}`,new Uint8Array(await audioFile.arrayBuffer()));
  }
  add('README.txt','DIRECTOR_CONTEXT.jsonと素材、CHATGPT_PROMPT.mdをChatGPTへ渡してください。音源が含まれない場合は元音源を別途添付してください。JIZURAは外部へ素材を送信しません。\n');
  return zip.finish();
};
J.exportPNGZip = async ({ plan, project, transparent, onProgress, signal, every = 1 }) => {
  const [w, h] = J.outputSize(project);
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const R = new J.Renderer();
  if (!transparent && !plan.keyBg && plan.customBg && plan.customBg.enabled && plan.customBg.dataUrl) await R.loadCustomBackground(plan.customBg.dataUrl);
  await R.loadAssetDeck?.(plan);
  const fps = plan.fps, total = Math.max(1, Math.round(plan.duration * fps));
  const zip = new ZipWriter();
  const scale = w / plan.W;
  for (let i = 0; i < total; i += every) {
    if (signal && signal.aborted) throw new Error('キャンセルしました');
    await R.prepareAssetFrame?.(plan,i/fps);
    R.frame(ctx, plan, i / fps, { scale, transparent, production:true });
    const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
    zip.add(`jizura_${String(i).padStart(5, '0')}.png`, new Uint8Array(await blob.arrayBuffer()));
    onProgress && onProgress((i+1) / total, `PNG ${i + 1}/${total}`,{stage:'frames',current:i+1,total});
  }
  onProgress && onProgress(.995, 'PNGをZIPファイルにまとめています',{stage:'mux',indeterminate:true});
  return zip.finish();
};

/* ---------- plan JSON for the After Effects panel ---------- */
/* The After Effects panel implements the original expression set. Newer pack entries are exported as their
   closest original counterpart (the browser key is kept in web* fields so nothing is lost). */
J.AE_MAP = {
  layout: { lowerThird: 'center', corners: 'mixed', staircase: 'mixed', zigzag: 'wave', arcTop: 'ring', spiral: 'ring', gridCells: 'labels', dropCap: 'mixed', justified: 'tile', frameBox: 'center', bubble: 'pill', subtitleBar: 'center', ticker: 'marquee', splitScreen: 'diag', mirror: 'stack', sideways: 'vcols', edgeFrame: 'marquee', perspective: 'stack', hanko: 'vcols', genkou: 'vcols', panels: 'diag', filmstrip: 'labels', quote: 'center', ruler: 'gloss', searchBar: 'type', chat: 'labels', notification: 'pill', ticket: 'pill',
    rain: 'tile', hanging: 'scatter', orbit: 'ring', tunnel: 'tile', wordCloud: 'scatter', bounceLine: 'mixed', elastic: 'condensed', crossBands: 'diag', stickerBomb: 'labels', neon: 'center', keycaps: 'labels', bubbles: 'scatter', slotMachine: 'labels', flipBoard: 'labels', credits: 'type', zoomRepeat: 'stack', splitHalves: 'stack', columnsBig: 'vcols', circleWords: 'ring', dotMatrix: 'type', depthStack: 'stack', typeSpecimen: 'stack', kanjiFocus: 'huge', halfVertical: 'vcols', curtain: 'center', equalizer: 'mixed', tape: 'diag' },
  enter: { riseMask: 'drop', dropMask: 'drop', slideL: 'wipe', slideR: 'wipe', slideWhole: 'stretch', flipX: 'spin', flipY: 'spin', domino: 'spin', fold: 'pop', unroll: 'wipe', strokeDraw: 'assemble', outlineFill: 'blur', splitJoin: 'slice', vSlice: 'slice', shutter: 'wipe', iris: 'zoom', diagWipe: 'wipe', blinds: 'slice', checker: 'flicker', randomOrder: 'flicker', bounceBig: 'drop', squashDrop: 'drop', rubber: 'stretch', glitchIn: 'scramble', echoIn: 'zoom', whip: 'stretch', skewIn: 'stretch', trackIn: 'blur', trackOut: 'blur', blurStagger: 'blur', fadeStagger: 'blur', waveIn: 'pop', spiralIn: 'spin', zoomOut: 'zoom', resolve: 'scramble', magnet: 'assemble', inkBleed: 'blur', neonOn: 'flicker', cursorSweep: 'type', stamp: 'zoom' },
  exit: { sinkMask: 'fall', riseOut: 'drift', slideOutL: 'stretch', slideOutR: 'stretch', flipOutX: 'shrink', flipOutY: 'fall', foldOut: 'shrink', squash: 'shrink', trackOutWide: 'blur', collapse: 'shrink', zoomThrough: 'blur', zoomFar: 'shrink', spinOut: 'scatter', twist: 'shrink', waveOut: 'scatter', blurOutStagger: 'blur', undraw: 'blur', outlineOut: 'blur', irisClose: 'shrink', diagWipeOut: 'wipe', blindsClose: 'slice', checkerOut: 'glitch', splitApart: 'slice', vSliceDrop: 'fall', melt: 'fall', dissolve: 'drift', backspace: 'wipe', scrambleOut: 'glitch', glitchDissolve: 'glitch', echoOut: 'blur', whipOut: 'stretch', gravity: 'fall', popOut: 'scatter', burn: 'drift', sweepCover: 'wipe', shatterLite: 'explode' },
  hold: { float: 'drift', sway: 'wave', pulse: 'breathe', shimmer: 'still', colorRun: 'still', rotateSlow: 'drift', trackBreathe: 'breathe', skewWobble: 'wave', beatHop: 'wave', hWave: 'wave', heartbeat: 'breathe', orbitSmall: 'jitter', jelly: 'breathe', scanBand: 'glitchtick', noiseDrift: 'drift', tilt: 'drift', zoomSlow: 'drift', stretchPulse: 'breathe', glitchJump: 'glitchtick', echoTrail: 'drift' },
  decor: { crosshair: 'brackets', cropMarks: 'brackets', reticle: 'rings', radar: 'rings', progressRing: 'rings', timecodeBar: 'barcode', rulerEdge: 'grid', dimension: 'leaders', indexNum: 'counter', dateStamp: 'barcode', qrBlock: 'barcode', glitchRects: 'bars', concentricSquares: 'shapes', triangleSpin: 'shapes', lineBurst: 'sparks', plusGrid: 'grid', guides: 'grid', waveLine: 'waveform', spiralLine: 'rings', halftonePatch: 'shapes', checkerStrip: 'stripes', beatRing: 'rings', orbitDots: 'dots', constellation: 'sparks', confetti: 'shapes', petals: 'shapes', rainStreaks: 'slash', snow: 'dots', lightLeak: 'blobs', bokeh: 'blobs', speedCorner: 'slash', risingParticles: 'sparks', twinkle: 'sparks', brushStroke: 'bars', tapePieces: 'bars', scribbleCircle: 'rings', scribbleUnder: 'slash', crossOut: 'slash', highlightMark: 'bars', heartsStars: 'shapes', watermarkKanji: 'counter', verticalStrip: 'leaders', romajiLine: 'leaders', bracketsJP: 'brackets', seal: 'shapes' },
  fx: { rgbSplit: 'chroma', smear: 'slice', vhsRoll: 'slice', trackingNoise: 'slice', waveWarp: 'slice', pixelDrift: 'slice', tileShift: 'block', gridRepeat: 'block', mirrorFlash: 'block', strobe: 'invert', blackFrame: 'invert', whiteFrame: 'flash', filmBurn: 'flash', lightSweep: 'flash', panelWipe: 'flash', zoomPunch: 'zoom', whipBlur: 'zoom', posterize: 'mosaic', hueShift: 'chroma', irisTrans: 'zoom', doors: 'slice', blindsTrans: 'slice', splitSlide: 'slice', crtOff: 'flash' },
};
// The plan goes to the After Effects panel as-is (version 2): the panel builds every key it implements and
// picks the closest counterpart itself (from the exported metadata / J.AE_MAP) for anything it lacks.
J.planForAE = (plan, project) => {
  const clean = JSON.parse(JSON.stringify(plan, (k, v) => (k === 'energy' || k === 'buffer' || k === 'peaks' ? undefined : v)));
  clean.version = 2;
  clean.width = J.outputSize(project)[0]; clean.height = J.outputSize(project)[1];
  clean.extra = project.extra === true; clean.wa = project.wa !== false;
  clean.fonts = {};
  for (const [role, keys] of Object.entries(plan.style.fonts)) clean.fonts[role] = keys.map(k => J.FONTS[k] ? J.FONTS[k].label : k);
  clean.fontTable = Object.fromEntries(Object.entries(J.FONTS).map(([k, f]) => [k, { label: f.label, family: f.family.replace(/"/g, ''), weight: f.weight, kind: f.kind }]));
  // lyric language: the face each key is drawn with in the browser for this plan (the panel maps keys → AE fonts per language)
  clean.lang = plan.lang || 'ja';
  if (J.setLang && J.faceOf && clean.lang !== 'ja') {
    J.setLang(clean.lang);
    for (const k of Object.keys(clean.fontTable)) { const f = J.faceOf(k); clean.fontTable[k].langFamily = f.family.replace(/"/g, ''); clean.fontTable[k].langWeight = f.weight; }
  }
  return clean;
};
})();
