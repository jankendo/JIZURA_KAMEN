/* ============================================================
   JIZURA — portable project schema and migrations
   ============================================================ */
(() => {
'use strict';

J.PROJECT_SCHEMA_VERSION = 2;
J.BPM_RANGE = Object.freeze({ min:45, max:240 });

J.migrateProject = input => {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error('プロジェクトデータの形式が正しくありません');
  }
  const project = { ...input };
  const oldSchema = Number(project.schemaVersion || project.version || 1);

  // v1 stored uploaded-font metadata only. Keep it readable; v2 adds an optional
  // IndexedDB asset key, while exported project files may carry an embedded data URL.
  project.userFonts = Array.isArray(project.userFonts) ? project.userFonts.filter(font =>
    font && typeof font.key === 'string' && typeof font.family === 'string'
  ).map(font => ({
    ...font,
    weight: Number.isFinite(+font.weight) ? +font.weight : 400,
    assetKey: typeof font.assetKey === 'string' ? font.assetKey : font.key,
  })) : [];
  if (!J.STYLES || !J.STYLES[project.style]) project.style = 'noir';
  if (project.mood != null && (!J.MOODS || !J.MOODS[project.mood])) project.mood = null;
  if (!['16:9', '9:16', '1:1', '4:5', '4:3', '3:4', '21:9'].includes(project.aspect)) project.aspect = '16:9';
  project.schemaVersion = J.PROJECT_SCHEMA_VERSION;
  project.migratedFromSchema = Number.isFinite(oldSchema) ? oldSchema : 1;
  return project;
};

J.isValidProjectStyle = style => !!(J.STYLES && Object.prototype.hasOwnProperty.call(J.STYLES, style));

J.timelineViewport = (duration, zoom = 1, start = 0) => {
  const length=Math.max(.001,Number(duration)||0),level=J.clamp(Number(zoom)||1,1,Math.max(1,length/4));
  const span=Math.min(length,Math.max(4,length/level));
  const left=J.clamp(Number(start)||0,0,Math.max(0,length-span));
  return {start:left,span,end:left+span,duration:length};
};
J.previewAspectForMode = mode => mode==='vertical'?'9:16':null;
J.timelineTimeAtRatio = (window, ratio) => window.start+J.clamp(Number(ratio)||0,0,1)*window.span;
J.snapTimelineLineTime = (index,time,lines,beats,duration,beatSnap=true,grid=.1) => {
  const raw=Number(time),step=Number(grid)>0?Number(grid):.1,value=Number.isFinite(raw)?raw:0;
  let next=Math.round(value/step)*step;
  if(beatSnap&&Array.isArray(beats)&&beats.length){
    let lo=0,hi=beats.length-1;
    while(lo<hi){const mid=(lo+hi)>>1;if(beats[mid]<value)lo=mid+1;else hi=mid;}
    for(const j of [lo-1,lo])if(j>=0&&j<beats.length&&Math.abs(beats[j]-value)<.13)next=beats[j];
  }
  const previous=lines[index-1],following=lines[index+1],min=previous?previous.start+.02:0,max=following?following.start-.02:Number(duration)||0;
  return +J.clamp(next,min,Math.max(min,max)).toFixed(2);
};

// Acknowledgement follows transaction completion, and a failed write is retryable.
// This queue does not change database names, keys, formats or schema versions.
J.createAssetSaveQueue = writeMany => {
  const saved = new Map();
  let tail = Promise.resolve(), pending = 0;
  const persist = entries => {
    const snapshot = entries.map(([key,value]) => [key,value]);
    pending++;
    const result = tail.catch(() => {}).then(async () => {
      const changes = snapshot.filter(([key,value]) => !saved.has(key) || saved.get(key) !== value);
      if (changes.length) {
        await writeMany(changes);
        for (const [key,value] of changes) saved.set(key,value);
      }
      const retained = new Set(snapshot.map(([key]) => key));
      for (const key of saved.keys()) if (!retained.has(key)) saved.delete(key);
    }).finally(() => { pending--; });
    tail = result;
    return result;
  };
  persist.isDurable = entries => pending === 0 && entries.every(([key,value]) => saved.has(key) && saved.get(key) === value);
  return persist;
};
J.historyFields = ['style','mood','seed','fx','enabled','fonts','colors','overrides','autoPalette','autoDirection','artDirection','directorPlan','lyrics','timing','customBg','keyBg','title','artist','titleDisplay','proAssets','visualAssets','scenePins','socialAssetStrategy','aspect','res','fps','quality','includeAudio','practice','userFonts','extra','wa','visualEnergyDensity','hookStrength','exportSettings'];
J.historySnapshot = (project,intern) => {
  const value={};
  for (const key of J.historyFields) {
    let v=project[key]??null;
    if ((key==='visualAssets'||key==='proAssets')&&v) v=v.map(a=>({...a,dataUrl:'',__historyAsset:intern(a.dataUrl||'')}));
    if (key==='customBg'&&v) {v={...v,__historyAsset:intern(v.dataUrl||'')};delete v.dataUrl;}
    if (key==='autoPalette'&&v) v={...v,localMap:null};
    value[key]=v;
  }
  return JSON.stringify(value);
};
J.restoreHistory = (snapshot,resolve) => {
  const state=JSON.parse(snapshot);
  for (const key of ['visualAssets','proAssets']) if(state[key]) state[key]=state[key].map(a=>{const ref=a.__historyAsset;delete a.__historyAsset;return {...a,dataUrl:ref?resolve(ref):''};});
  if(state.customBg){const ref=state.customBg.__historyAsset;delete state.customBg.__historyAsset;state.customBg.dataUrl=ref?resolve(ref):'';}
  return state;
};
J.pruneHistoryAssets = (snapshots,assets,refs) => {
  const used = new Set();
  for(const snapshot of snapshots){const state=JSON.parse(snapshot);if(state.customBg?.__historyAsset)used.add(state.customBg.__historyAsset);for(const key of ['visualAssets','proAssets'])for(const a of state[key]||[])if(a.__historyAsset)used.add(a.__historyAsset);}
  for(const [ref,url] of assets)if(!used.has(ref)){assets.delete(ref);refs.delete(url);}
};
J.waitMediaEvent = (media,event,{timeout=15000,signal}={}) => new Promise((resolve,reject)=>{
  let timer;
  const cleanup=()=>{clearTimeout(timer);media.removeEventListener(event,done);media.removeEventListener('error',fail);signal?.removeEventListener('abort',abort);};
  const done=()=>{cleanup();resolve();};
  const fail=()=>{cleanup();reject(new Error('動画を読み込めませんでした。素材またはブラウザの対応形式を確認してください。'));};
  const abort=()=>{cleanup();reject(Object.assign(new Error('キャンセルしました'),{name:'AbortError'}));};
  if(signal?.aborted){abort();return;}
  media.addEventListener(event,done);media.addEventListener('error',fail);signal?.addEventListener('abort',abort);
  timer=setTimeout(()=>{cleanup();reject(new Error('動画の応答がありません。素材を確認して再試行してください。'));},timeout);
});
// Equivalent RGB test without materialising and filtering the entire RGBA buffer.
J.nonBlackRGBFraction = pixels => {
  let count=0;
  for(let i=0;i<pixels.length;i+=4){if(pixels[i]>8)count++;if(pixels[i+1]>8)count++;if(pixels[i+2]>8)count++;}
  return pixels.length?count/(pixels.length/4*3):0;
};
J.createControlLock = () => {
  const states=new Map();
  return {
    lock(controls){for(const control of controls){if(!states.has(control))states.set(control,control.disabled);control.disabled=true;}},
    unlock(){for(const [control,disabled] of states)control.disabled=disabled;states.clear();},
  };
};
})();
