/* ============================================================
   JIZURA — editor UI
   ============================================================ */
(() => {
'use strict';
if (!document.getElementById('app')) return;          // engine-only pages (tests)
J.enableSingleBackgroundMode();
J.enableUpstreamMode?.();
const $ = id => document.getElementById(id);
const LS_KEY = 'jizura.project.v1';
const HUD_CHARS = '0123456789:./-_()【】・No.LYRICRECUNTITLEDXYlinebpminterlude—─／ ';
const ICON = {
  dice: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="2" y="2" width="12" height="12" rx="2"/><circle cx="5.5" cy="5.5" r="1" fill="currentColor"/><circle cx="10.5" cy="10.5" r="1" fill="currentColor"/><circle cx="10.5" cy="5.5" r="1" fill="currentColor"/><circle cx="5.5" cy="10.5" r="1" fill="currentColor"/></svg>',
  lock: '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.4"><rect x="3" y="7" width="10" height="7" rx="1.5"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></svg>',
};

const S = { project: null, plan: null, previewPlan:null, previewAspect:null, audio: null, audioLoad:0, audioLoading:false, audioPendingName:'', audioNotice:'', renderer: new J.Renderer(), playing: false, t: 0, t0: 0, loop: true, need: true, exporting: null, tap: null, slow: false, lineEls: [], curLine: -2,
  range:null,rangeMode:null,socialPlan:null,highlights:[],highlightIndex:0,alternative:0,directionCandidates:[],directionStats:null,lastQuality:null,lastExport:null,pixelQA:null,exportCapabilities:null,exportValidation:null,selectedLine:-1,timelineZoom:1,timelineStart:0,timelineDragging:null };
function markImageLookModified() { if (S.project && S.project.autoPalette && S.project.autoPalette.analyzed) S.project.autoPalette.lookModified = true; }

/* WebAudio player (works inside sandboxed pages where blob media may be blocked) */
const AP = {
  ctx: null, src: null, startAt: 0,
  play(buffer, offset) {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.stop();
    const s = this.ctx.createBufferSource(); s.buffer = buffer; s.connect(this.ctx.destination);
    const off = Math.max(0, Math.min(offset, buffer.duration - 0.01));
    const rate=S.tap?.rate||1;s.playbackRate.value=rate;s.start(0, off); this.src = s;this.rate=rate; this.startAt = this.ctx.currentTime - off/rate;
  },
  stop() { if (this.src) { try { this.src.stop(); } catch (e) {} try { this.src.disconnect(); } catch (e) {} this.src = null; } },
  time() { return this.ctx ? (this.ctx.currentTime - this.startAt)*(this.rate||1) : 0; },
};

/* ---------------- project persistence ---------------- */
function mergeProject(p) {
  p = J.migrateProject(p || J.defaultProject());
  const d = J.defaultProject();
  const o = Object.assign(d, p || {});
  if (!J.isValidProjectStyle(o.style)) o.style = 'noir';
  o.lang = 'ja';
  o.fx = Object.assign(J.defaultProject().fx, (p && p.fx) || {});
  o.timing = Object.assign(J.defaultProject().timing, (p && p.timing) || {});
  o.customBg = Object.assign({}, J.defaultProject().customBg, (p && p.customBg) || {});
  o.customBg.fit = o.customBg.fit === 'contain' ? 'contain' : 'cover';
  o.customBg.x = J.clamp(+o.customBg.x || 0, 0, 100);
  o.customBg.y = J.clamp(+o.customBg.y || 0, 0, 100);
  o.customBg.zoom = J.clamp(+o.customBg.zoom || 1, 0.5, 3);
  o.customBg.darkness = J.clamp(+o.customBg.darkness || 0, 0, 0.8);
  o.customBg.blur = J.clamp(+o.customBg.blur || 0, 0, 30);
  o.autoPalette = J.normalizeAutoPalette ? J.normalizeAutoPalette((p && p.autoPalette) || d.autoPalette) : Object.assign({}, d.autoPalette, (p && p.autoPalette) || {});
  o.titleDisplay = Object.assign({}, d.titleDisplay, (p && p.titleDisplay) || {});
  o.titleDisplay.position = ['auto', 'bl', 'br', 'tl', 'tr'].includes(o.titleDisplay.position) ? o.titleDisplay.position : 'auto';
  o.titleDisplay.opacity = J.clamp(Number(o.titleDisplay.opacity) || .72, .2, .85);
  o.titleDisplay.enabled = o.titleDisplay.enabled !== false;
  o.exportSettings=Object.assign({},d.exportSettings,(p&&p.exportSettings)||{});
  o.exportSettings.refinementMode=o.exportSettings.refinementMode==='quality'?'quality':'fast';
  o.exportSettings.preset=J.EXPORT_PRESETS?.[o.exportSettings.preset]?o.exportSettings.preset:'auto';
  o.exportSettings.videoBitrate=Number.isFinite(+o.exportSettings.videoBitrate)?Math.max(0,+o.exportSettings.videoBitrate):0;
  o.exportSettings.audioBitrate=[128000,192000,256000,320000].includes(+o.exportSettings.audioBitrate)?+o.exportSettings.audioBitrate:192000;
  o.exportSettings.range=['full','highlight','socialHook'].includes(o.exportSettings.range)?o.exportSettings.range:'full';
  o.visualEnergyDensity=['auto','clean','standard','high_energy','hyper'].includes(o.visualEnergyDensity)?o.visualEnergyDensity:'auto';
  o.hookStrength=['auto','strong','maximum'].includes(o.hookStrength)?o.hookStrength:'auto';
  o.includeAudio=o.includeAudio!==false;
  o.artDirection = J.validArtDirection && J.validArtDirection(o.artDirection, o) ? o.artDirection : null;
  const en = J.defaultProject().enabled;
  for (const g of Object.keys(en)) en[g] = Object.assign(en[g], ((p && p.enabled) || {})[g] || {});
  o.enabled = en;
  o.overrides = (p && p.overrides) || {};
  o.colors = Object.assign({ enabled: false }, (p && p.colors) || {});
  o.fonts = (p && p.fonts) || {};
  o.audioAsset = p?.audioAsset && typeof p.audioAsset.name==='string' ? p.audioAsset : null;
  o.userFonts = Array.isArray(p && p.userFonts) ? p.userFonts : [];
  for (const uf of o.userFonts) if (!J.FONTS[uf.key]) J.addUserFont(uf.key, uf.label, uf.family, uf.weight || 400);
  return o;
}
function setBadges(d) {
  return (d && d.extra ? '<span class="set-badge ex" title="最初の公開版のあとに追加">追加</span>' : '') + (d && d.wa ? '<span class="set-badge" title="和風の演出">和</span>' : '');
}
const BG_DB_NAME = 'jizura-assets-v1';
let bgDbPromise = null, saveRevision=0, projectSaveQueue=Promise.resolve(), localRecoveryBlocked=false;
function saveStatus(message,error=false){const el=$('localSaveStatus');if(el){el.textContent=message;el.dataset.error=String(error);}}
function openBgDb() {
  if (!window.indexedDB) return Promise.reject(new Error('IndexedDB unavailable'));
  if (!bgDbPromise) {
    const pending=new Promise((resolve,reject)=>{
      const req=indexedDB.open(BG_DB_NAME,1);let failed=false;
      const fail=()=>{failed=true;reject(req.error||new Error('ブラウザ保存領域を開けません。ほかのKAMENタブを閉じて再試行してください'));};
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('assets'))req.result.createObjectStore('assets');};
      req.onsuccess=()=>{if(failed){req.result.close();return;}req.result.onversionchange=()=>{req.result.close();bgDbPromise=null;};resolve(req.result);};
      req.onerror=fail;req.onblocked=fail;
    });
    bgDbPromise=pending;
    pending.catch(()=>{if(bgDbPromise===pending)bgDbPromise=null;});
  }
  return bgDbPromise;
}
const workspaceKey=id=>'workspace:'+id;
const mediaKey=(id,key)=>'workspace-media:'+id+':'+key;
const isMediaKey=key=>/^(background$|audio$|font:|visualAsset:|proAsset:)/.test(key);
function rememberWorkspace(id){S.workspaceId=id;try{sessionStorage.setItem('jizura.workspace.v3',id);localStorage.setItem('jizura.workspace.last.v3',id);}catch{} }
async function workspaceRecords(){const db=await openBgDb();return new Promise((resolve,reject)=>{const tx=db.transaction('assets','readonly'),r=tx.objectStore('assets').getAll(IDBKeyRange.bound('workspace:','workspace:\uffff'));r.onsuccess=()=>resolve(r.result.filter(x=>x.format===3).sort((a,b)=>b.savedAt-a.savedAt));r.onerror=()=>reject(r.error);});}
async function refreshWorkspaces(){const select=$('localWorkspace');if(!select)return;let records;try{records=await workspaceRecords();}catch{S.workspaceStorageUnavailable=true;select.replaceChildren();const option=document.createElement('option');option.textContent='保存した作業を確認できません';select.append(option);select.disabled=true;return;}S.workspaceStorageUnavailable=false;select.replaceChildren();for(const r of records){const option=document.createElement('option');option.value=r.id;option.textContent=(r.project.title||'無題のMV')+(r.forkedFrom?'（分岐）':'')+' · '+new Date(r.savedAt).toLocaleString();select.append(option);}if(!records.some(r=>r.id===S.workspaceId)){const option=document.createElement('option');option.value=S.workspaceId||'';option.textContent='新しい作業（未保存）';select.prepend(option);}select.value=S.workspaceId||'';select.disabled=!!S.exporting||directionBusy||S.audioLoading||S.projectLoading;}
async function bgDbGet(key) {
  if(S.workspaceId&&isMediaKey(key))key=mediaKey(S.workspaceId,key);
  const db = await openBgDb();
  return new Promise((resolve, reject) => { const req = db.transaction('assets', 'readonly').objectStore('assets').get(key); req.onsuccess = () => resolve(req.result || ''); req.onerror = () => reject(req.error); });
}
// Read the committed project and its referenced images in one readonly
// transaction, so another tab cannot splice new assets into an older revision.
async function readCommittedProject(){
 const db=await openBgDb();return new Promise((resolve,reject)=>{
  const tx=db.transaction('assets','readonly'),store=tx.objectStore('assets');let record=null;
  const id=S.workspaceId, r=store.get(id?workspaceKey(id):'project-current-v2');
  r.onsuccess=()=>{record=r.result||null;const p=record?.project;if(!p)return;if(typeof p!=='object'||Array.isArray(p)||![2,3].includes(record.format)){localRecoveryBlocked=true;record=null;return;}
   const asset=key=>id?mediaKey(id,key):key;const get=(key,target)=>{const req=store.get(asset(key));req.onsuccess=()=>{target.dataUrl=req.result||'';if(!req.result)localRecoveryBlocked=true;};};
   if(p.audioAsset){const audio=store.get(asset('audio'));audio.onsuccess=()=>{record.audio=audio.result||null;};}
   if(p.customBg?.storedInIndexedDB&&!p.customBg.dataUrl)get('background',p.customBg);
   for(const [kind,prefix] of [['visualAssets','visualAsset:'],['proAssets','proAsset:']])for(const a of p[kind]||[])if(a.storedInIndexedDB&&!a.dataUrl)get(prefix+a.id,a);
  };
  tx.oncomplete=()=>resolve(record);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error||Error('保存データを読み込めません'));
 });
}
async function loadLocal() {
  let p=null,raw=null,fromIndexedDB=false,legacy=true;
  let records=[];try{records=await workspaceRecords();}catch(error){console.warn('JIZURA workspace list unavailable',error);}let selected=S.workspaceId;try{selected=selected||sessionStorage.getItem('jizura.workspace.v3')||localStorage.getItem('jizura.workspace.last.v3');}catch{}S.workspaceId=records.some(r=>r.id===selected)?selected:(records[0]?.id||null);
  try{const record=await readCommittedProject();if(record?.project){p=record.project;S.localAudioSnapshot={info:p.audioAsset,file:record.audio};fromIndexedDB=true;legacy=record.format!==3;saveRevision++;S.workspaceForkOrigin=record.forkedFrom||null;S.persistenceRevision=legacy?0:record.revision||0;}}catch(error){console.warn('JIZURA IndexedDB restore unavailable',error);}
  try { raw=localStorage.getItem(LS_KEY); if (raw&&!p) {p = JSON.parse(raw);if(!p||typeof p!=='object'||Array.isArray(p))throw new Error('Invalid local project');} } catch (e) {if(!p)localRecoveryBlocked=true;console.error('JIZURA local project read failed',e);}
  // IndexedDB and localStorage cannot share a transaction. A small recovery
  // record commits with the assets; use it only when its previous mirror matches.
  // A project subsequently edited in v35 has a different mirror and takes priority.
  try{const journal=!fromIndexedDB&&await bgDbGet('project-recovery-v1'),recovery=typeof journal==='string'?JSON.parse(journal):null;if(recovery&&typeof recovery.metadata==='string'&&recovery.previousRaw===raw&&recovery.metadata!==raw){const restored=JSON.parse(recovery.metadata);if(restored&&typeof restored==='object'&&!Array.isArray(restored)){p=restored;localRecoveryBlocked=false;S.recoveredLocal=true;}}}catch(e){/* The original local project remains authoritative when recovery is unavailable. */}
  if (!p) {S.workspaceId=crypto.randomUUID();S.persistenceRevision=0;observedProject='';return mergeProject(null);}
  if (p.customBg && p.customBg.storedInIndexedDB && !p.customBg.dataUrl) {
    try { p.customBg.dataUrl = await bgDbGet('background');if(!p.customBg.dataUrl)localRecoveryBlocked=true; } catch (e) { localRecoveryBlocked=true;console.error('JIZURA background restore failed',e); }
  }
  if (p.customBg) delete p.customBg.storedInIndexedDB;
  for(const a of p.visualAssets||[])if(a.storedInIndexedDB&&!a.dataUrl){try{a.dataUrl=await bgDbGet('visualAsset:'+a.id)||'';}catch(e){localRecoveryBlocked=true;console.error('JIZURA asset restore failed',e);}if(!a.dataUrl)localRecoveryBlocked=true;delete a.storedInIndexedDB;}
  for(const a of p.proAssets||[])if(a.storedInIndexedDB&&!a.dataUrl){try{a.dataUrl=await bgDbGet('proAsset:'+a.id);}catch(e){localRecoveryBlocked=true;console.error('JIZURA asset restore failed',e);}if(!a.dataUrl)localRecoveryBlocked=true;delete a.storedInIndexedDB;}
  for(const a of [...(p.visualAssets||[]),...(p.proAssets||[])])delete a.storedInIndexedDB;
  const project=mergeProject(p);
  await restoreProjectFonts(project);
  if(legacy&&!localRecoveryBlocked){
    // Import the old committed record into a fresh namespace. Never rewrite v2.
    const audio=S.localAudioSnapshot?.file;S.workspaceId=crypto.randomUUID();S.persistenceRevision=0;
    if(audio)S.pendingAudioFile=audio;
    const previous=S.project;S.project=project;
    try{if(!await flushSaveImpl())S.unsaved=true;else S.recoveredLocal=true;}finally{S.project=previous;}
  }
  if(S.workspaceId)rememberWorkspace(S.workspaceId);
  observedProject=J.canonicalJSON(J.compactPersistentProjectV111(project));
  return project;
}
async function restoreProjectFonts(project) {
  for (const meta of project.userFonts || []) {
    try {
      let bytes=await bgDbGet('font:'+String(meta.assetKey||meta.key));
      if (bytes && typeof bytes.arrayBuffer==='function') bytes=await bytes.arrayBuffer();
      if (!(bytes instanceof ArrayBuffer) && ArrayBuffer.isView(bytes)) bytes=bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength);
      if (bytes instanceof ArrayBuffer && bytes.byteLength) await J.restoreUserFont(meta,bytes);
    } catch (e) { /* older projects may contain a font name without its local binary */ }
  }
}
async function fontAssetDataUrl(meta) {
  let bytes=J.userFontBytes && J.userFontBytes.get(meta.key);
  if (!bytes) bytes=await bgDbGet('font:'+String(meta.assetKey||meta.key));
  if (bytes && typeof bytes.arrayBuffer==='function') bytes=await bytes.arrayBuffer();
  if (bytes instanceof ArrayBuffer || ArrayBuffer.isView(bytes)) {
    const blob=new Blob([bytes],{type:meta.mime||'font/ttf'});
    return fileAsDataUrl(blob);
  }
  return '';
}
async function portableProjectJSON() {
  const project=J.compactPersistentProjectV111(S.project);
  project.schemaVersion=J.PROJECT_SCHEMA_VERSION;
  for (const meta of project.userFonts || []) {
    const dataUrl=await fontAssetDataUrl(meta);
    if (dataUrl) meta.dataUrl=dataUrl;
  }
  return JSON.stringify(project,null,1);
}
async function restorePortableFonts(project) {
  for (const meta of project.userFonts || []) {
    if (!meta.dataUrl) continue;
    if (!/^data:(?:font\/|application\/(?:font|x-font|vnd\.ms-fontobject))/i.test(meta.dataUrl)) throw new Error('プロジェクトに含まれるフォント形式が正しくありません');
    try {
      const response=await fetch(meta.dataUrl), bytes=await response.arrayBuffer();
      await J.restoreUserFont(meta,bytes);
      // Font bytes are staged in J.userFontBytes and committed with the imported workspace.
    } catch (e) { throw new Error('プロジェクトに含まれるフォントを読み込めませんでした'); }
    delete meta.dataUrl;
  }
}
let saveTimer = 0;
let observedProject='';
function projectFingerprint(){return J.canonicalJSON(J.compactPersistentProjectV111(S.project));}
function autosave() { if(!S.project)return;const next=projectFingerprint();if(next===observedProject)return;observedProject=next;S.unsaved=true;++saveRevision;clearTimeout(saveTimer); saveTimer = setTimeout(flushSave, 700); scheduleHistoryObserve(); }
async function bgDbSetMany(entries, expectedRevision, id=S.workspaceId) {
  const db=await openBgDb();
  return new Promise((resolve,reject)=>{
    const tx=db.transaction('assets','readwrite'),store=tx.objectStore('assets');let conflict=null;
    const write=()=>{try{for(const [key,value] of entries)store.put(value,key==='project-current-v2'?workspaceKey(id):mediaKey(id,key));}catch(error){conflict=error;tx.abort();}};
    const request=store.get(workspaceKey(id));request.onsuccess=()=>{if((request.result?.revision||0)!==expectedRevision){conflict=Object.assign(new Error('別のタブの編集を検出しました'),{code:'SAVE_CONFLICT'});tx.abort();}else write();};
    tx.oncomplete=resolve;tx.onerror=()=>reject(conflict||tx.error||new Error('素材の保存に失敗しました'));tx.onabort=()=>reject(conflict||tx.error||new Error('素材の保存が中断されました'));
  });
}

function flushSave() {
  if(S.pendingDirectionCommit)return Promise.resolve(false);
  if(!S.project||localRecoveryBlocked)return flushSaveImpl();
  const task=J.processing.begin('このブラウザに保存しています',[['json','編集内容を保存形式にまとめています',1],['assets','画像・素材をIndexedDBに保存しています',8],['metadata','プロジェクト情報を確定しています',1]],{compact:true,retry:flushSave});
  task.enter('json');
  try{return Promise.resolve(flushSaveImpl(task)).then(saved=>{if(saved)task.complete('編集内容を保存しました');else if(task.state.status==='running'){task.supersede('より新しい編集内容の保存に引き継ぎました');}return saved;},error=>{task.fail(error);throw error;});}
  catch(error){task.fail(error);throw error;}
}
function flushSaveImpl(task) {
  clearTimeout(saveTimer);
  if(!S.project)return Promise.resolve(false);
  if(localRecoveryBlocked){saveStatus('前回のデータを保全中 · 自動保存停止。バックアップから開き直してください。',true);return Promise.resolve(false);}
  const edit=++saveRevision,revision=(S.persistenceRevision||0)+1,project=S.project,source=project.customBg?.dataUrl||'';
  const entries=[...(S.workflowSaveEntriesV16||[]),['background',source],...(project.visualAssets||[]).filter(a=>a.dataUrl).map(a=>['visualAsset:'+a.id,a.dataUrl]),...(project.proAssets||[]).filter(a=>a.dataUrl).map(a=>['proAsset:'+a.id,a.dataUrl])];
  const pendingAudio=[S.pendingAudioFile,S.currentAudioFile,S.localAudioSnapshot?.file].find(file=>J.audioAssetMatches(project.audioAsset,file));if(pendingAudio)entries.push(['audio',pendingAudio]);
  for(const meta of project.userFonts||[]){const bytes=J.userFontBytes?.get(meta.key);if(bytes)entries.push(['font:'+String(meta.assetKey||meta.key),bytes]);}
  const copy=J.compactPersistentProjectV111(project);
  copy.customBg={...copy.customBg,dataUrl:'',storedInIndexedDB:!!source};
  for(const kind of ['visualAssets','proAssets'])copy[kind]=(copy[kind]||[]).map(a=>({...a,dataUrl:'',storedInIndexedDB:!!a.dataUrl}));
  const record={id:S.workspaceId||crypto.randomUUID(),revision,project:copy,savedAt:Date.now(),format:3,forkedFrom:S.workspaceForkOrigin||null};
  task?.enter('assets');S.unsaved=true;saveStatus('素材・編集内容を保存中…');
  const run=async()=>{
    if(edit!==saveRevision||project!==S.project)return false;
    record.id=S.workspaceId||record.id;const activeId=record.id;
    // Project and binary references commit together. Aborted writes leave the
    // previous complete record and its assets untouched. Serialize all saves.
    // Copy retained binaries before entering the write transaction.
    const known=new Set(entries.map(e=>e[0]));
    for(const key of ['audio',...(project.userFonts||[]).map(f=>'font:'+String(f.assetKey||f.key))])if(!known.has(key)){const value=await bgDbGet(key);if(key==='audio'&&!J.audioAssetMatches(project.audioAsset,value)){if(project.audioAsset)throw Error('この作業の音源を保存できません。元の音源を選び直すか、プロジェクト保存でバックアップしてください。');continue;}if(value)entries.push([key,value]);}
    if(edit!==saveRevision||project!==S.project)return false;
    record.revision=(S.persistenceRevision||0)+1;
    S.workspaceForked=false;try{await bgDbSetMany([...entries,['project-current-v2',record]],S.persistenceRevision||0,record.id);}
    catch(error){if(error.code!=='SAVE_CONFLICT')throw error;record.forkedFrom=record.id;record.id=crypto.randomUUID();record.revision=1;await bgDbSetMany([...entries,['project-current-v2',record]],0,record.id);S.workspaceForked=true;}
    const stillActive=S.workspaceId===activeId;if(stillActive){rememberWorkspace(record.id);S.workspaceForkOrigin=record.forkedFrom;}
    const verified=await bgDbGet(workspaceKey(record.id));
    if(verified?.revision!==record.revision||J.canonicalJSON(verified.project)!==J.canonicalJSON(copy))throw new Error('保存データの読み戻し確認に失敗しました');
    if(S.workspaceId===record.id)S.persistenceRevision=record.revision;
    if(pendingAudio&&S.pendingAudioFile===pendingAudio)S.pendingAudioFile=null;
    if(edit!==saveRevision||project!==S.project)return false;
    task?.enter('metadata');
    try{localStorage.setItem('jizura.project.ref.v3',JSON.stringify({key:workspaceKey(record.id),revision:record.revision}));}catch(error){S.localReferenceWarning=error.name;}
    S.unsaved=false;S.persistenceRevision=record.revision;S.persistenceError=null;try{localStorage.setItem('jizura.workspace.changed.v3',JSON.stringify({id:record.id,revision:record.revision,at:Date.now()}));}catch{}observedProject=projectFingerprint();if(S.generationNotice?.includes('生成は完了しましたが')){S.generationNotice='生成結果をこのブラウザに保存しました';$('directionStatus').textContent=S.generationNotice;}saveStatus(S.workspaceForked?'別の作業として保存しました':'このブラウザに保存済み');void refreshWorkspaces();return true;
  };
  const result=projectSaveQueue.then(run);projectSaveQueue=result.catch(()=>{});
  return result.catch(error=>{
    task?.fail(error);
    if(edit!==saveRevision||project!==S.project)return false;
    S.unsaved=true;S.persistenceError={storage:'IndexedDB',name:error.name,message:error.message,quota:error.name==='QuotaExceededError'};
    console.error('JIZURA IndexedDB project save failed',error);
    saveStatus('未保存 · '+(S.persistenceError.quota?'ブラウザ保存領域の容量が不足しています。':'ブラウザへの保存に失敗しました。')+'再読み込み前にプロジェクト保存でバックアップしてください。保存状態をクリックすると再試行します。',true);return false;
  });
}
function fileAsDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error || new Error('画像を読み込めませんでした'));
    reader.readAsDataURL(blob);
  });
}
async function decodeImageFile(file) {
  if (typeof createImageBitmap === 'function') return createImageBitmap(file);
  const url = URL.createObjectURL(file), image = new Image(); image.decoding = 'async'; image.src = url;
  try { if (image.decode) await image.decode(); else await new Promise((resolve, reject) => { image.onload = resolve; image.onerror = reject; }); }
  catch (e) { URL.revokeObjectURL(url); throw e; }
  URL.revokeObjectURL(url); return image;
}
async function prepareBackgroundFile(file) {
  const ext = String(file.name || '').split('.').pop().toLowerCase();
  const byExt = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
  const type = String(file.type || byExt[ext] || '').toLowerCase();
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(type)) throw new Error('この画像形式には対応していません。JPEG / PNG / WebPを使用してください。');
  let image;
  try { image = await decodeImageFile(file); } catch (e) { throw new Error('画像を読み込めませんでした。JPEG / PNG / WebPを使用してください。'); }
  try {
    const w = image.width || image.naturalWidth, h = image.height || image.naturalHeight;
    if (!w || !h) throw new Error('画像を読み込めませんでした。JPEG / PNG / WebPを使用してください。');
    if(w*h>64*1024*1024)throw new Error('画像が大きすぎます。画質を保ったまま6400万画素以下の素材を選択してください。元の背景は保持されています。');
    // Keep validated source bytes. Repeated uploads must not resize or add lossy WebP generations.
    const dataUrl = await fileAsDataUrl(new Blob([file], { type }));
    if (!dataUrl.startsWith('data:image/')) throw new Error('画像を保存できませんでした');
    return dataUrl;
  } finally { if (image && image.close) image.close(); }
}
window.addEventListener('pagehide', () => { if (S.project&&S.unsaved) flushSave(); });

/* ---------------- planning ---------------- */
function audioLike() {
  const T = S.project.timing;
  if (S.audio) {
    const a = Object.assign({}, S.audio);
    if (T.bpm > 0) a.beats = J.beatGrid(T.bpm, T.beatOffset || 0, S.audio.duration);
    return a;
  }
  if (T.bpm > 0) return { beats: J.beatGrid(T.bpm, T.beatOffset || 0, 600) };
  return null;
}
function viewPlan() { return S.rangeMode==='socialHook'&&S.socialPlan?S.socialPlan:(S.previewPlan||S.plan); }
function refreshPreviewPlan() {
  if(S.comparisonDraftV16&&S.project.randomWorkflowV16?.state==='FINISHED'){S.previewPlan={...S.plan,cuts:J.clonePhotoRenderPlan(S.project.randomWorkflowV16.originalCuts)};return;}
  S.previewPlan = S.previewAspect ? J.plan({ ...S.project, aspect:S.previewAspect }, audioLike()) : null;
}
function replan() {
  lastCutIdx=-2;
  S.socialPlan=null;
  S.pixelQA=null;S.exportValidation=null;
  S.plan = J.plan(S.project, audioLike());
  let restoreNotice=$('songNativeRestoreNotice');
  if(!restoreNotice){restoreNotice=document.createElement('p');restoreNotice.id='songNativeRestoreNotice';restoreNotice.setAttribute('role','status');$('directionStatus').parentElement.appendChild(restoreNotice);}
  restoreNotice.hidden=!['REJECTED','PENDING_INPUT'].includes(S.plan.songNativeRestore?.status);
  restoreNotice.textContent=S.plan.songNativeRestore?.status==='PENDING_INPUT'?'保存されたMVの演出は、音源の読み込み後に互換性を確認します。':'保存されたMVの演出は、現在のバージョンとの互換性を確認できませんでした。元データは保持されています。演出を再確認してください。';
  // Boot plans before restoring audio. Its temporary direction must not replace
  // the saved selected direction needed by the resolved-plan equality check.
  if(S.plan.songNativeDirection&&S.project.artDirection&&S.plan.songNativeRestore?.status!=='PENDING_INPUT')S.project.artDirection.songNativeDirection=J.clonePhotoRenderPlan(S.plan.songNativeDirection);
  if(S.project.visualAssets?.length) (S.renderer._uiLoadQueue=(S.renderer._uiLoadQueue||Promise.resolve()).catch(()=>{}).then(()=>S.renderer.loadAssetDeck(S.plan))).then(()=>{S.need=true;}).catch(e=>toast(e.message));
  refreshVisualAssetsUI();
  refreshPreviewPlan();
  if (S.t > S.plan.duration) S.t = 0;
  if(S.plan.songNativeDirection?.version===9){const st=J.selectionIntegrityV9(S.plan,audioLike());$('directionStatus').dataset.selectionState=st.status;$('directionStatus').textContent=({DRAFT:'解析済み・演出候補を比較中',SELECTED:'演出確定済み',STALE:'再確認が必要',FAILED:'選択失敗'})[st.status];if(!st.ok)delete $('directionStatus').dataset.result;}
  renderLines(); sizeViewport(); drawTimeline(); updateTimeUI();
  S.need = true; ensureFonts(); drawSwatch(); showNow();
  syncDirectionUI(); scheduleHistoryObserve();
  clearTimeout(warmTimer); warmTimer = setTimeout(warm, 450);
}
/* pre-decompose glyphs used by piece animations while the editor is idle, so playback does not hitch */
let warmTimer = 0, warmJob = 0;
function warm() {
  const job = ++warmJob;
  const cuts = S.plan.cuts.filter(c => c.enter === 'assemble' || ['explode', 'fall', 'drift'].includes(c.exit));
  const src = $('view');
  const cv = document.createElement('canvas'); cv.width = src.width; cv.height = src.height;
  const ctx = cv.getContext('2d');
  let i = 0;
  const idle = window.requestIdleCallback ? (f) => window.requestIdleCallback(f, { timeout: 400 }) : (f) => setTimeout(() => f(null), 40);
  const step = (deadline) => {
    if (job !== warmJob || S.exporting) return;
    do {
      const c = cuts[i++]; if (!c) break;
      const ts = [];
      if (c.enter === 'assemble') ts.push(c.start + Math.min(c.inDur * 0.3, c.dur * 0.2));
      if (c.outDur > 0) ts.push(c.end - c.outDur * 0.5);
      for (const t of ts) { try { S.renderer.frame(ctx, S.plan, t, { scale: cv.width / S.plan.W, fast: true, noHud: true, noGhost: true }); } catch (e) {} }
    } while (i < cuts.length && deadline && deadline.timeRemaining() > 10);
    if (i < cuts.length) idle(step);
  };
  idle(step);
}
let replanTimer = 0;
const replanSoon = (ms = 220) => { clearTimeout(replanTimer); replanTimer = setTimeout(replan, ms); };
let fontKey = '';
let thumbFonts = null;
async function ensureFonts() {
  const txt = S.project.lyrics + (S.project.title || '') + (S.project.artist || '') + HUD_CHARS;
  const keys = J.fontsOfPlan(S.plan);                       // only the faces this plan draws with
  const key = txt + '|' + keys.join(',') + '|' + Object.keys(J.FONTS).length;
  if (key === fontKey) return;
  fontKey = key;
  showMsg('フォントを読み込み中…');
  try { await J.ensureFonts(txt, keys); } catch (e) {}
  showMsg(null); S.need = true; drawStyleGrid(); loadThumbFonts();
}
// style thumbnails need two glyphs of every style's display face — fetched only once the style grid is actually shown
function loadThumbFonts() {
  if (thumbFonts || !$('styleGrid').offsetParent) return;
  thumbFonts = J.ensureFonts('仮面', [...new Set(J.STYLE_ORDER.map(k => J.STYLES[k].fonts.display[0]))]).then(() => drawStyleGrid()).catch(() => {});
}
function showMsg(m) { const el = $('viewMsg'); if (!m) { el.hidden = true; return; } el.textContent = m; el.hidden = false; }

/* ---------------- viewport & drawing ---------------- */
function sizeViewport() {
  const vp = $('viewport'), c = $('view');
  const plan=viewPlan(), ar = plan.W / plan.H;
  let cssW = vp.clientWidth || 800, cssH = cssW / ar;
  const maxH = Math.max(220, window.innerHeight * 0.68);
  if (cssH > maxH) { cssH = maxH; cssW = cssH * ar; }
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const pw = Math.round(Math.min(plan.W, cssW * dpr)), ph = Math.round(pw / ar);
  if (c.width !== pw || c.height !== ph) { c.width = pw; c.height = ph; }
  c.style.width = cssW + 'px'; c.style.height = cssH + 'px';
  S.need = true;
}
function draw() {
  const c = $('view'), ctx = c.getContext('2d');
  const t0 = performance.now();
  const plan=viewPlan();
  S.renderer.frame(ctx, plan, S.t, { scale: c.width / plan.W, fast: S.playing && S.slow, range:S.range });
  const dt = performance.now() - t0;
  S.slow = S.playing ? (dt > 30 ? true : dt < 14 ? false : S.slow) : false;
  updateTimeUI(); drawTimeline(); updateCutInfo();
}
function tick(now) {
  requestAnimationFrame(tick);
  if (S.exporting) return;
  if (S.playing) {
    // rAF timestamps can precede the moment play()/seek() stamped t0 → clamp so t never goes negative
    let t = Math.max(0, S.audio ? AP.time() : (now - S.t0) / 1000);
    const end=S.tap?S.audio.duration:(S.range?.end??S.plan.duration),begin=S.range?.start??0;
    if (t >= end - 1e-3) {
      if (S.loop && !S.tap) { seek(begin); t = begin; }
      else { pause(); t = end - 1e-3; if (S.tap) stopTap(); }
    }
    S.t = t;
    if(!S.timelineDragging){const win=timelineWindow();if(t<win.start||t>win.end)S.timelineStart=J.clamp(t-win.span*.18,0,Math.max(0,win.duration-win.span));}
    S.need = true;
  }
  if (S.need) { S.need = false; draw(); }
}
function updateTimeUI() {
  $('timeNow').textContent = J.fmtTime(S.t);
  $('timeDur').textContent = J.fmtTime(S.plan.duration);
  if (!S.scrubbing) $('scrub').value = String(Math.round(S.t / Math.max(0.001, S.plan.duration) * 10000));
}
function play() {
  if (S.audio) AP.play(S.audio.buffer, S.t);
  else S.t0 = performance.now() - S.t * 1000;
  S.playing = true; $('btnPlay').textContent = '❚❚'; $('btnPlay').setAttribute('aria-label', '一時停止');
}
function pause() {
  S.playing = false; AP.stop();
  $('btnPlay').textContent = '▶'; $('btnPlay').setAttribute('aria-label', '再生'); S.need = true;
}
function seek(t) {
  S.t = J.clamp(t, 0, Math.max(0, S.plan.duration - 1e-3));
  if (S.audio) { if (S.playing) AP.play(S.audio.buffer, S.t); }
  else S.t0 = performance.now() - S.t * 1000;
  S.need = true;
}

/* ---------------- timeline ---------------- */
const layoutHue = k => (J.LAYOUT_ORDER.indexOf(k) * 37 + 30) % 360;
function timelineWindow() {
  const win=J.timelineViewport(S.plan.duration,S.timelineZoom,S.timelineStart);S.timelineStart=win.start;return win;
}
function timelineTimeAt(clientX) {
  const canvas=$('timeline'),rect=canvas.getBoundingClientRect(),win=timelineWindow();
  return J.timelineTimeAtRatio(win,(clientX-rect.left)/Math.max(1,rect.width));
}
function nearestLineMarker(px,win,w,dpr) {
  let best=-1,dist=13*dpr;
  S.plan.lines.forEach((line,i)=>{
    const x=(line.start-win.start)/win.span*w;
    if(x<0||x>w)return;
    const d=Math.abs(x-px);if(d<dist){dist=d;best=i;}
  });
  return best;
}
function selectedTimelineLine(index) {
  S.selectedLine=Number.isInteger(index)&&index>=0&&index<S.plan.lines.length?index:-1;
  const line=S.selectedLine>=0?S.plan.lines[S.selectedLine]:null;
  $('timelineStatus').textContent=line?`${S.selectedLine+1}行目 · ${line.start.toFixed(2)}秒 · ${line.text}`:'波形上部の歌詞マーカーをドラッグして調整';
  $('timeline').setAttribute('aria-label',line?`選択中 ${S.selectedLine+1}行目、${line.start.toFixed(2)}秒。上下キーで移動し、削除キーで自動時刻へ戻す`:'タイムライン。クリックで移動、上部の歌詞マーカーをドラッグして開始時刻を変更');
  drawTimeline();
}
function snappedLineTime(index,time) {
  const duration=S.audio?.duration||S.plan.duration;
  return J.snapTimelineLineTime(index,time,S.plan.lines,S.plan.beats||[],duration,S.project.timing.snap!==false,.1);
}
function setLineTime(index,time,immediate=false) {
  if(index<0||index>=S.plan.lines.length)return;
  if(!S.project.timing.lineTimes)S.project.timing.lineTimes={};
  S.project.timing.lineTimes[index]=snappedLineTime(index,time);
  $('timelineStatus').textContent=`${index+1}行目 · ${S.project.timing.lineTimes[index].toFixed(2)}秒`;
  if(immediate){clearTimeout(replanTimer);replan();flushSave();}
  else replanSoon(90);
}
function nudgeSelectedLine(delta) {
  if(S.selectedLine<0){toast('タイムライン上の歌詞マーカーを選んでください');return;}
  setLineTime(S.selectedLine,S.plan.lines[S.selectedLine].start+delta,true);
  selectedTimelineLine(S.selectedLine);
}
function zoomTimeline(factor,anchor=S.t) {
  const before=timelineWindow(),oldAnchor=J.clamp((anchor-before.start)/before.span,0,1);
  S.timelineZoom=J.clamp(S.timelineZoom*factor,1,Math.max(1,S.plan.duration/4));
  const afterSpan=Math.min(S.plan.duration,Math.max(4,S.plan.duration/S.timelineZoom));
  S.timelineStart=J.clamp(anchor-oldAnchor*afterSpan,0,Math.max(0,S.plan.duration-afterSpan));
  drawTimeline();
}
let timelineLayer=null,timelineCache=null;
function drawTimeline() {
  const c = $('timeline'), dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(10, Math.round(c.clientWidth * dpr)), h = Math.max(10, Math.round(c.clientHeight * dpr));
  if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
  const output=c.getContext('2d'), win=timelineWindow(), X=t=>(t-win.start)/win.span*w;
  const key=[S.plan,S.audio?.peaks,S.audio?.duration,S.selectedLine,w,h,dpr,win.start,win.span];
  const rebuild=!timelineCache||key.some((v,i)=>v!==timelineCache[i]);
  if(!timelineLayer)timelineLayer=document.createElement('canvas');
  if(rebuild){timelineLayer.width=w;timelineLayer.height=h;}
  const x=timelineLayer.getContext('2d');
  if(rebuild){
  x.fillStyle = '#131316'; x.fillRect(0, 0, w, h);
  if (S.audio && S.audio.peaks) {
    const pk = S.audio.peaks, n = pk.length, sd = S.audio.duration;
    x.fillStyle = '#2b2b33';
    for (let i = 0; i < w; i += 2) { const t=win.start+i/w*win.span;if(t>sd)break;const v=pk[Math.min(n-1,Math.floor(t/sd*n))];const hh=v*h*.76;x.fillRect(i,h*.56-hh/2,1.5,hh); }
  }
  const beats = S.plan.beats || [];
  x.fillStyle = '#3a3a44';
  for (const b of beats) { if(b<win.start)continue;if(b>win.end)break;x.fillRect(Math.round(X(b)),h-6*dpr,1,6*dpr); }
  const top = h * 0.3, bot = h - 8 * dpr;
  for (const cut of S.plan.cuts) {
    if(cut.end<win.start||cut.start>win.end)continue;
    const x0 = X(Math.max(win.start,cut.start)), x1 = X(Math.min(win.end,cut.end));
    const hue = layoutHue(cut.layout);
    x.fillStyle = `hsla(${hue},70%,58%,0.28)`; x.fillRect(x0, top, Math.max(1, x1 - x0 - 1), bot - top);
    x.fillStyle = `hsla(${hue},80%,62%,0.95)`; x.fillRect(x0, top, Math.max(1, 2 * dpr), bot - top);
    if (x1 - x0 > 34 * dpr) {
      x.fillStyle = 'rgba(236,231,225,0.85)'; x.font = `${10 * dpr}px ${getComputedStyle(document.body).getPropertyValue('--mono') || 'monospace'}`;
      x.save(); x.beginPath(); x.rect(x0, top, x1 - x0 - 3, bot - top); x.clip();
      x.fillText((J.LAYOUTS[cut.layout] || {}).name || cut.layout, x0 + 5 * dpr, top + 13 * dpr); x.restore();
    }
  }
  x.font = `${10 * dpr}px monospace`;
  for (const ln of S.plan.lines) {
    if(ln.start<win.start||ln.start>win.end)continue;
    const lx = X(ln.start),selected=ln.index===S.selectedLine;
    x.fillStyle=selected?'#f5a50c':'#5d5a63';x.fillRect(lx,0,selected?2*dpr:1,top);
    x.fillStyle=selected?'#ffe1a1':'#8e8a94';x.fillText(String(ln.index+1).padStart(2,'0'),lx+3*dpr,12*dpr);
    x.beginPath();x.moveTo(lx-4*dpr,18*dpr);x.lineTo(lx+4*dpr,18*dpr);x.lineTo(lx,25*dpr);x.closePath();x.fillStyle=selected?'#f5a50c':'#cbc7cf';x.fill();
  }
  timelineCache=key;
  }
  output.drawImage(timelineLayer,0,0);
  const px = X(S.t);
  if(px>=0&&px<=w){output.fillStyle = '#f5a50c'; output.fillRect(Math.round(px)-dpr,0,2*dpr,h);}
  output.fillStyle='#87838d';output.font=`${9*dpr}px monospace`;output.textBaseline='bottom';
  for(let i=0;i<=4;i++){const xx=i*w/4;output.fillText(J.fmtTime(win.start+win.span*i/4),xx+2*dpr,h-1*dpr);}
}
function timelineSeek(ev) {
  seek(timelineTimeAt(ev.clientX));
}

/* ---------------- cut info ---------------- */
let lastCutIdx = -2;
function updateCutInfo() {
  const cut = J.cutAt(S.plan, S.t);
  const idx = cut ? cut.index : -1;
  const li = cut ? cut.line : -1;
  if (li !== S.curLine) { S.lineEls.forEach((el, i) => el.classList.toggle('cur', i === li)); S.curLine = li; }
  if (idx === lastCutIdx) return;
  lastCutIdx = idx;
  const el = $('cutInfo');
  if (!cut) { el.innerHTML = '<span class="hint">この位置にカットはありません</span>'; return; }
  const chip = (cls, k, v) => `<span class="chip ${cls}"><b>${k}</b>${v}</span>`;
  const n = (tbl, k) => (tbl[k] ? tbl[k].name : k);
  const selected=J.describeJizuraDirectionV8?.(S.plan,cut);
  if(selected){el.innerHTML=Object.entries({スタイル:selected.style,レイアウト:selected.layout,登場:selected.enter,保持:selected.hold,退場:selected.exit,カメラ:selected.camera,加工:selected.treat,装飾:selected.decor,背景:selected.background,FX:selected.fx||'なし',トランジション:selected.transition||'カット',採用:selected.selection,...(selected.reason?{理由:selected.reason,比較:selected.comparison,Canvas:selected.canvas}:{} )}).map(([k,v])=>chip('',k,escapeHtml(v))).join('');return;}
  const generated=J.describeSongCompositionV7?.(S.plan,cut);
  const generatedChip=(cls,key,value)=>chip(cls,key,escapeHtml(value));
  if(generated){el.innerHTML=[generatedChip('l','構図',`${generated.groups}文字グループ`),generatedChip('e','登場',generated.entry),generatedChip('h','表示中',generated.hold),generatedChip('x','退場',generated.exit),generatedChip('c','カメラ',generated.camera),generatedChip('b','背景',generated.background),generatedChip('','反復',generated.repeat===null?'独立区間':`区間 ${generated.repeat+1} と関連`),generatedChip('','探索',generated.selection)].join('');return;}
  el.innerHTML = [
    `<span class="chip mono">#${String(cut.index + 1).padStart(2, '0')}</span>`,
    chip('l', 'レイアウト', n(J.LAYOUTS, cut.layout)), chip('e', '登場', n(J.ENTER, cut.enter)), chip('h', '保持', n(J.HOLD, cut.hold)), chip('x', '退場', n(J.EXIT, cut.exit)),
    cut.decor && cut.decor.length ? chip('', '装飾', cut.decor.map(d => n(J.DECOR, d.id)).join('・')) : '',
    cut.treat && cut.treat !== 'none' ? chip('t', '加工', n(J.TREAT, cut.treat)) : '',
    cut.bg && cut.bg !== 'none' ? chip('b', '背景', n(J.BG, cut.bg)) : '',
    cut.cam && cut.cam !== 'push' ? chip('c', 'カメラ', n(J.CAMERA, cut.cam)) : '',
    cut.trans ? chip('c', 'つなぎ', n(J.TRANS, cut.trans)) : '',
  ].join('');
}

/* ---------------- line list ---------------- */
function renderLines() {
  const ol = $('lineList'); ol.innerHTML = ''; S.lineEls = []; S.curLine = -2;
  if(S.selectedLine>=S.plan.lines.length)S.selectedLine=-1;
  const ov = S.project.overrides;
  const layoutOpts = '<option value="">自動</option>' + (J.engineOrder?.(S.project,'layout')||J.LAYOUT_ORDER).map(k => `<option value="${k}">${J.LAYOUTS[k].name}</option>`).join('');
  S.plan.lines.forEach((ln, i) => {
    const o = ov[i] || {};
    const li = document.createElement('li'); li.className = 'ln';
    const manual = S.project.timing.lineTimes && S.project.timing.lineTimes[i] != null;
    li.innerHTML = `<span class="no">${String(i + 1).padStart(2, '0')}</span>
      <input class="time mono" type="number" step="0.01" min="0" value="${ln.start.toFixed(2)}" title="開始（秒）${manual ? '・手動' : '・自動'}" aria-label="${i + 1}行目の開始秒" style="${manual ? 'border-color:var(--cyan)' : ''}">
      <span class="txt" title="${escapeHtml(ln.text)}">${escapeHtml(ln.text)}</span>
      <span class="timing-line"><button type="button" data-nudge="-0.1" aria-label="${i+1}行目を0.1秒早く">−0.1</button><button type="button" data-nudge="0.1" aria-label="${i+1}行目を0.1秒遅く">＋0.1</button></span>
      <div class="meta"><span class="cuts"></span>
      <span class="tools">
        <select aria-label="レイアウト指定"></select>
        <button class="icon ghost dice" title="この行を再抽選">${ICON.dice}</button>
        <button class="icon ghost lock" title="この行の構成をロック" aria-pressed="${o.lock ? 'true' : 'false'}">${ICON.lock}</button>
      </span></div>`;
    const layoutSelect=li.querySelector('select');
    layoutSelect.innerHTML='<option value="'+escapeHtml(o.layout||'')+'">'+escapeHtml(o.layout?J.LAYOUTS[o.layout]?.name||o.layout:'自動')+'</option>';
    const populate=()=>{if(layoutSelect.dataset.full)return;layoutSelect.innerHTML=layoutOpts;layoutSelect.value=o.layout||'';layoutSelect.dataset.full='1';};
    layoutSelect.addEventListener('focus',populate);layoutSelect.addEventListener('pointerdown',populate);
    li.querySelector('.time').addEventListener('change', e => {
      const v = parseFloat(e.target.value);
      if (!S.project.timing.lineTimes) S.project.timing.lineTimes = {};
      if (isFinite(v)) S.project.timing.lineTimes[i] = J.clamp(v,i?S.plan.lines[i-1].start:0,S.plan.lines[i+1]?.start??S.plan.duration); else delete S.project.timing.lineTimes[i];
      replan();
    });
    li.querySelector('.txt').addEventListener('click', () => seek(ln.start + 0.001));
    li.querySelectorAll('[data-nudge]').forEach(b=>b.addEventListener('click',()=>{
      S.project.timing.lineTimes[i]=Math.max(0,+(ln.start+Number(b.dataset.nudge)).toFixed(2));replan();flushSave();
    }));
    li.querySelector('select').addEventListener('change', e => { setOv(i, { layout: e.target.value || undefined }); replan(); });
    li.querySelector('.dice').addEventListener('click', () => { const cur = ov[i] || {}; setOv(i, { seed: (cur.seed | 0) + 1, lock: false }); replan(); seek(ln.start + 0.001); });
    li.querySelector('.lock').addEventListener('click', () => {
      const cur = ov[i] || {};
      if (cur.lock) setOv(i, { lock: false, lockedSeed: undefined,lockedCuts:undefined });
      else setOv(i, { lock: true, lockedSeed: ln.seed,...(J.isUpstream(S.project)?{lockedCuts:JIZURAUpstream.lineSnapshot(S.plan,i)}:{}) });
      replan();
    });
    const cutsEl = li.querySelector('.cuts');
    S.plan.cuts.filter(c => c.line === i && J.LAYOUTS[c.layout] && !J.LAYOUTS[c.layout].special).forEach(c => {
      const sp = document.createElement('span'); sp.textContent = c.registrySelectedV8?`${J.STYLES[c.styleKey]?.name||c.styleKey} · ${J.LAYOUTS[c.layout].name}`:J.LAYOUTS[c.layout].name; sp.title = c.registrySelectedV8?`${c.text}｜${Object.values(J.describeJizuraDirectionV8(S.plan,c)).join(' · ')}`:c.generatedMotionV7?`${c.text}｜${J.describeSongCompositionV7(S.plan,c).selection}`:`${c.text}｜${J.ENTER[c.enter].name} → ${J.EXIT[c.exit].name}`;
      sp.style.borderColor = `hsla(${layoutHue(c.layout)},70%,58%,0.7)`;
      sp.addEventListener('click', () => seek(c.start + Math.min(c.dur * 0.5, c.inDur + 0.05)));
      cutsEl.appendChild(sp);
      if(J.isUpstream(S.project)){
        const index=S.plan.cuts.filter(x=>x.line===i).indexOf(c);
        const detail=document.createElement('details'),summary=document.createElement('summary');summary.textContent='カット '+(index+1)+' の指定';detail.appendChild(summary);
        let filled=false;detail.addEventListener('toggle',()=>{if(!detail.open||filled)return;filled=true;
          if(index>0){const input=document.createElement('input');input.type='number';input.step='.01';input.placeholder=(c.start-ln.start).toFixed(2);input.setAttribute('aria-label','カット '+(index+1)+' の開始秒（行の先頭から）');input.value=o.cutTime?.[index]??'';input.onchange=()=>{const ct={...S.project.overrides[i]?.cutTime},n=Number.parseFloat(input.value);if(Number.isFinite(n))ct[index]=n;else delete ct[index];setOv(i,{cutTime:ct});replan();};detail.appendChild(input);}
          for(const group of ['layout','enter','hold','exit','cam','bg','treat','trans']){const select=document.createElement('select');select.setAttribute('aria-label','カット '+(index+1)+' '+group);select.innerHTML='<option value="">自動</option>'+J.order(group).filter(k=>window.JIZURAUpstream.registry(group)[k]).map(k=>'<option value="'+k+'">'+escapeHtml(J.registry(group)[k].name||k)+'</option>').join('');select.value=o.cutTech?.[index]?.[group]||'';select.onchange=()=>{const cut={...S.project.overrides[i]?.cutTech},entry={...cut[index]};if(select.value)entry[group]=select.value;else delete entry[group];cut[index]=entry;setOv(i,{cutTech:cut});replan();};detail.appendChild(select);}
        });cutsEl.appendChild(detail);
      }
    });
    ol.appendChild(li); S.lineEls.push(li);
  });
  $('linesInfo').textContent = `${S.plan.lines.length}行 / ${S.plan.cuts.length}カット`;
}
function setOv(i, patch) {
  const cur = Object.assign({}, S.project.overrides[i] || {}, patch);
  for (const k of Object.keys(cur)) if (cur[k] === undefined || cur[k] === false || cur[k] === '') delete cur[k];
  if (Object.keys(cur).length) S.project.overrides[i] = cur; else delete S.project.overrides[i];
}
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])); }

/* ---------------- style tab ---------------- */
let stylePreviewObserver=null;
const editorStyles=()=>J.isUpstream(S.project)?window.JIZURAUpstream.STYLES:J.STYLES;
const editorStyleOrder=()=>window.JIZURAUpstream.STYLE_ORDER;
function drawStyleGrid() {
  const g = $('styleGrid');
  if(g.offsetParent===null)return;
  if(typeof IntersectionObserver==='function'&&!stylePreviewObserver)stylePreviewObserver=new IntersectionObserver(entries=>{if(entries.some(e=>e.isIntersecting))drawStyleGrid();},{rootMargin:'100px'});
  if (!g.children.length) {
    editorStyleOrder().forEach(k => {
      const b = document.createElement('button'); b.className = 'stile'; b.dataset.k = k;
      b.title = editorStyles()[k].desc;
      b.innerHTML = `<canvas width="192" height="108"></canvas><span>${editorStyles()[k].name}</span><span class="badges">${setBadges(editorStyles()[k])}</span>`;
      b.addEventListener('click', () => { remember(); markImageLookModified(); S.project.style = k; S.project.colors.enabled = false; syncUI(); replan(); commit(); });
      g.appendChild(b);stylePreviewObserver?.observe(b);
    });
  }
  [...g.children].forEach(b => {
    const k = b.dataset.k, st = editorStyles()[k], sc = st.schemes[0], cv = b.querySelector('canvas');

    b.setAttribute('aria-pressed', S.project.style === k ? 'true' : 'false');
    const off = !J.randomOk(S.project, 'style', k);
    b.classList.toggle('set-off', off);
    b.title = st.desc + (off ? (st.extra && S.project.extra !== true ? '（追加分がオフのため、おまかせでは選ばれません）' : '（和風の演出がオフのため、おまかせでは選ばれません）') : '');
    if(stylePreviewObserver){const rect=b.getBoundingClientRect();if(rect.bottom< -100||rect.top>innerHeight+100||rect.right<0||rect.left>innerWidth)return;}
    const x=cv.getContext('2d');cv.dataset.previewReady='true';
    x.fillStyle = sc.bg; x.fillRect(0, 0, 192, 108);
    st.schemes.slice(1, 4).forEach((s2, i) => { x.fillStyle = s2.bg; x.fillRect(192 - 14 * (i + 1), 0, 14, 10); });
    const f = st.fonts.display[0];
    x.font = J.fontCSS(f, 46); x.textAlign = 'center'; x.textBaseline = 'middle';
    x.fillStyle = sc.ghostB; x.fillText('仮面', 96 - 3, 54 - 1);
    x.fillStyle = sc.ghostA; x.fillText('仮面', 96 + 3, 54 + 2);
    x.fillStyle = sc.fg; x.fillText('仮面', 96, 54);
    x.fillStyle = sc.accent; x.fillRect(12, 90, 30, 4);
    x.font = J.fontCSS('mono', 9); x.textAlign = 'left'; x.fillStyle = sc.sub; x.fillText(k.toUpperCase(), 48, 93);
  });
}
function fontSelectOptions(sel) {
  return '<option value="">スタイルの既定</option>' + Object.entries(J.FONTS).map(([k, f]) => {
    const g = J.faceOf ? J.faceOf(k) : f, alt = g.label && g.label !== f.label ? ' → ' + g.label : '';   // the face actually used for the lyric language
    return `<option value="${k}" ${sel === k ? 'selected' : ''}>${escapeHtml(f.label + alt)}</option>`;
  }).join('');
}
function uploadedFontMime(file) {
  const extension=String(file.name||'').split('.').pop().toLowerCase();
  const byExtension={ttf:'font/ttf',otf:'font/otf',woff:'font/woff',woff2:'font/woff2'};
  return /^font\//i.test(file.type||'')?file.type:byExtension[extension]||'font/ttf';
}
function renderFontRoles() {
  const box = $('fontRoles'); box.innerHTML = '';
  [['display', '見出し'], ['serif', '明朝枠'], ['body', '小さな文字']].forEach(([role, label]) => {
    const row = document.createElement('div'); row.className = 'font-row';
    row.innerHTML = `<span class="muted">${label}</span><select aria-label="${label}のフォント">${fontSelectOptions(S.project.fonts[role])}</select>`;
    row.querySelector('select').addEventListener('change', e => { if (e.target.value) S.project.fonts[role] = e.target.value; else delete S.project.fonts[role]; fontKey = ''; replan(); });
    box.appendChild(row);
  });
}
const BASE_KEYS = [['bg', '背景'], ['fg', '文字'], ['sub', '補助']];
const ACCENT_KEYS = [['accent', 'アクセント'], ['ghostA', 'ズレ色A'], ['ghostB', 'ズレ色B']];
function renderColors() {
  const st = editorStyles()[S.project.style] || J.STYLES.noir, sc = st.schemes[0];
  const c = S.project.colors;
  $('colorOn').checked = !!c.enabled;
  $('accentOn').checked = !!c.accentOn;
  const fill = (rowId, keys, flag) => {
    const row = $(rowId); row.innerHTML = '';
    keys.forEach(([k, label]) => {
      const l = document.createElement('label');
      const v = (c[flag] && c[k]) || c[k] || sc[k];
      l.innerHTML = `${label}<input type="color" value="${toColorInput(v)}">`;
      l.querySelector('input').addEventListener('input', e => {
        c[k] = e.target.value.toUpperCase();
        if (S.project.autoPalette && S.project.autoPalette.analyzed) S.project.autoPalette.userModified = true;
        if (!c[flag]) { c[flag] = true; $(flag === 'enabled' ? 'colorOn' : 'accentOn').checked = true; }
        replanSoon(60); drawSwatch();
      });
      row.appendChild(l);
    });
  };
  fill('colorRow', BASE_KEYS, 'enabled');
  fill('colorRowAccent', ACCENT_KEYS, 'accentOn');
  drawSwatch();
}
const toColorInput = v => { const h = String(v || '#000000'); return /^#[0-9a-f]{6}$/i.test(h) ? h.toLowerCase() : J.toHex(...J.hex(h)).toLowerCase(); };
function swatchHTML(cols) { return cols.map(c => `<i style="background:${c}" title="${c}"></i>`).join(''); }
function drawSwatch() {
  const sc = S.plan ? S.plan.style.schemes[0] : null; if (!sc) return;
  $('paletteSwatch').innerHTML = swatchHTML([sc.accent, sc.ghostA, sc.ghostB]);
}
function randomPalette() {
  remember();
  const c = S.project.colors;
  const sc0 = editorStyles()[S.project.style].schemes[0];
  const bg = c.enabled && c.bg ? c.bg : sc0.bg;
  let p, guard = 0;
  do { p = J.randomPalette(bg); } while (guard++ < 6 && p.ghostA === c.ghostA && p.ghostB === c.ghostB);
  Object.assign(c, { accent: p.accent, ghostA: p.ghostA, ghostB: p.ghostB, accentOn: true });
  if (S.project.autoPalette && S.project.autoPalette.analyzed) S.project.autoPalette.userModified = true;
  renderColors(); replan(); commit();
  toast('配色：アクセント・ズレ色A/Bを変更', [p.accent, p.ghostA, p.ghostB]);
}

/* ---------------- bounded project history (look buttons + Ctrl/Cmd+Z) ---------------- */
const H = { list: [], i: -1, assets:new Map(), assetRefs:new Map(), nextAsset:1 };
function lookSnap() {
  return J.historySnapshot(S.project,dataUrl=>{
    if(!dataUrl)return null;
    let ref=H.assetRefs.get(dataUrl);
    if(!ref){ref='asset-'+H.nextAsset++;H.assetRefs.set(dataUrl,ref);H.assets.set(ref,dataUrl);}
    return ref;
  });
}
function addHistoryState(snapshot=lookSnap()) {
  if(H.restoredSnapshot===snapshot)return;H.restoredSnapshot=null;
  if(H.i>=0&&H.list[H.i]===snapshot)return;
  H.list=H.list.slice(0,H.i+1);H.list.push(snapshot);H.i=H.list.length-1;
  if(H.list.length>60){H.list.splice(0,H.list.length-60);H.i=H.list.length-1;}
  J.pruneHistoryAssets(H.list,H.assets,H.assetRefs);
  updateHist();
}
let historyObserveTimer=0;
function scheduleHistoryObserve(){clearTimeout(historyObserveTimer);historyObserveTimer=setTimeout(()=>addHistoryState(),420);}
function remember() { addHistoryState(); }
function commit() { clearTimeout(historyObserveTimer);addHistoryState();autosave(); }
let historyBusy=false;
async function histGo(d) {
  if (S.exporting||exportPreflightBusy||historyBusy) return;
  clearTimeout(historyObserveTimer);remember();
  const j=H.i+d;if(j<0||j>=H.list.length)return;
  historyBusy=true;updateHist();
  try {
  H.i=j;
  const currentMap=S.project.autoPalette&&S.project.autoPalette.localMap;
  const currentHash=S.project.autoPalette&&S.project.autoPalette.sourceHash;
  const state=J.restoreHistory(H.list[j],ref=>H.assets.get(ref)||'');
  Object.assign(S.project,state);
  S.project.autoPalette=J.normalizeAutoPalette(S.project.autoPalette);
  if(!S.project.autoPalette.localMap&&currentMap&&S.project.autoPalette.sourceHash&&S.project.autoPalette.sourceHash===currentHash)S.project.autoPalette.localMap=currentMap;
  await S.renderer.loadAssetDeck?.(S.plan).catch(()=>{});if(S.project.customBg?.dataUrl)await S.renderer.loadCustomBackground(S.project.customBg.dataUrl).catch(()=>{});
  else await S.renderer.loadCustomBackground('').catch(()=>{});
  fontKey='';syncUI();replan();updateHist();toast(`${j+1} / ${H.list.length} 履歴`);restartPreview();flushSave();H.restoredSnapshot=lookSnap();
  }catch(error){console.error('JIZURA history restore failed',error);toast('履歴の素材を復元できません。バックアップを保管して素材を確認してください。');}
  finally{historyBusy=false;updateHist();}
}
function updateHist() {
  const canB = !historyBusy&&H.i > 0, canF = !historyBusy&&H.i < H.list.length - 1;
  ['btnPrev', 'btnPrev2'].forEach(id => { $(id).disabled = !canB; });
  ['btnNext', 'btnNext2'].forEach(id => { $(id).disabled = !canF; });
  $('histPos').textContent = H.list.length > 1 ? `${H.i + 1} / ${H.list.length}` : '';
}
function resetHistory() { clearTimeout(historyObserveTimer);H.list = []; H.i = -1; H.restoredSnapshot=null;H.assets.clear();H.assetRefs.clear();H.nextAsset=1;remember();commit(); }

/* ---------------- おまかせ ---------------- */
function restartPreview() { seek(0); if (!S.playing && S.mode === 'easy') play(); }
function omakase() {
  if(S.exporting||S.tap)return;
  void generateUpstreamMV();
}
// change just one aspect of the current look
function rerollPart(part) {
  if (S.exporting || S.tap) return;
  remember();
  markImageLookModified();
  const P = S.project;
  let msg = '';
  if (part === 'style') {
    let pool = editorStyleOrder().filter(k => k !== P.style && J.randomOk(P, 'style', k));
    if (!pool.length) pool = editorStyleOrder().filter(k => k !== P.style);
    P.style = pool[Math.floor(Math.random() * pool.length)];
    P.colors.enabled = false;
    msg = `スタイル：${editorStyles()[P.style].name}`;
  } else if (part === 'mood') {
    const r = J.omakase(P);
    Object.assign(P, { mood: r.mood, fx: r.fx, enabled: r.enabled });
    msg = `雰囲気：${J.MOODS[r.mood].name}`;
  } else if (part === 'cut') {
    P.seed = (Math.random() * 1e9) | 0;
    msg = '構成：レイアウトと動きを再抽選';
  }
  fontKey = ''; syncUI(); replan(); commit();
  toast(msg);
  restartPreview();
}
function showNow() {
  const el = $('easyNow'); if (!el || !S.plan || el.closest('[hidden]')) return;
  const P = S.project, sc = S.plan.style.schemes[0];
  const moodName = P.mood && J.MOODS[P.mood] ? J.MOODS[P.mood].name : 'カスタム';
  const fk = S.plan.style.fonts.display[0];
  const fontName = J.FONTS[fk] ? J.FONTS[fk].label : fk;
  const cuts = S.plan.cuts.filter(c => c.line >= 0 && c.layout !== 'interlude');
  const kinds = new Set(cuts.map(c => c.layout)).size;
  const row = (k, v) => `<div class="now-row"><span class="k">${k}</span><span class="v">${v}</span></div>`;
  el.innerHTML = row('スタイル', `<b>${escapeHtml(editorStyles()[P.style].name)}</b>`)
    + row('雰囲気', escapeHtml(moodName))
    + row('配色', `<span class="swatches">${swatchHTML([sc.bg, sc.fg, sc.accent, sc.ghostA, sc.ghostB])}</span>${P.colors.accentOn ? '<span class="tagl">ランダム</span>' : ''}`)
    + row('見出し書体', escapeHtml(fontName))
    + row('構成', `${cuts.length} カット・レイアウト ${kinds} 種`)
    + row('演出', `加工 ${cuts.filter(c => c.treat && c.treat !== 'none').length}・背景 ${new Set(cuts.map(c => c.bg).filter(b => b && b !== 'none')).size}種・カメラ ${cuts.filter(c => c.cam && c.cam !== 'push').length}`);
}
let toastTimer = 0;
function toast(m, cols) {
  const el = $('toast'); if (!el) return;
  el.innerHTML = escapeHtml(m) + (cols ? `<span class="swatches">${swatchHTML(cols)}</span>` : '');
  el.hidden = false; el.classList.remove('out'); void el.offsetWidth; el.classList.add('in');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.classList.remove('in'); el.classList.add('out'); toastTimer = setTimeout(() => { el.hidden = true; }, 260); }, 1700);
}

/* ---------------- かんたん / 詳細 ---------------- */
function setMode(m) {
  S.mode = m === 'pro' ? 'pro' : 'easy';
  const easy = S.mode === 'easy';
  $('app').classList.toggle('is-easy', easy);
  $('app').classList.toggle('studio-advanced', !easy);
  $('easyPanel').hidden = !easy;
  $('studioAdvanced').setAttribute('aria-expanded', String(!easy));
  $('modeEasy').setAttribute('aria-pressed', String(easy));
  $('modePro').setAttribute('aria-pressed', String(!easy));
  try { localStorage.setItem('jizura.mode', S.mode); } catch (e) {}
  if (easy) { showNow(); syncOut(); codecNote(); }
  sizeViewport(); drawTimeline(); loadThumbFonts();
}

/* ---------------- fx tab ---------------- */
const FX = [['motion', '動きの強さ'], ['glitch', 'グリッチ'], ['chroma', '色ズレ'], ['decor', '装飾の量'], ['density', 'カットの細かさ'], ['texture', '質感'], ['bgSwitch', '背景の切替']];
function renderFx() {
  const box = $('fxSliders'); box.innerHTML = '';
  FX.forEach(([k, label]) => {
    const row = document.createElement('div'); row.className = 'slider';
    const v = S.project.fx[k] ?? 0.5;
    row.innerHTML = `<label for="fx_${k}">${label}</label><input id="fx_${k}" type="range" min="0" max="1" step="0.01" value="${v}"><output>${Math.round(v * 100)}</output>`;
    const inp = row.querySelector('input'), out = row.querySelector('output');
    inp.addEventListener('input', () => { markImageLookModified(); S.project.fx[k] = +inp.value; S.project.mood = null; out.textContent = Math.round(inp.value * 100); replanSoon(120); });
    const lock=document.createElement('button');lock.type='button';lock.className='ghost small';lock.textContent=S.project.locks?.params?.[k]?'ロック解除':'値をロック';lock.onclick=()=>{S.project.locks??={tech:{},params:{}};S.project.locks.params??={};S.project.locks.params[k]=!S.project.locks.params[k];renderFx();autosave();};row.appendChild(lock);
    box.appendChild(row);
  });
  $('fxFlash').checked = !!S.project.fx.flash;
  $('fxKoma').value = String(J.komaOf(S.project.fx));
  $('fxHud').value = S.project.fx.hud || 'auto';
  $('seed').value = S.project.seed;
}

/* ---------------- technique tab ---------------- */
const GROUPS = [['layout', 'レイアウト'], ['enter', '登場'], ['hold', '保持'], ['exit', '退場'], ['decor', '装飾'], ['treat', '文字の加工'], ['bg', '背景'], ['cam', 'カメラ'], ['fx', '画面効果'], ['trans', 'カット間のつなぎ']];
const openGroups = new Set();
function techItems(g) { return (J.engineOrder?.(S.project,g)||J.order(g)).filter(k => J.registry(g)[k] && !J.registry(g)[k].special); }
function renderTech() {
  const box = $('techLists'); box.innerHTML = '';
  const q = ($('techFilter').value || '').trim().toLowerCase();
  let total = 0, onAll = 0;
  GROUPS.forEach(([g, label]) => {
    const tbl = J.registry(g), items = techItems(g), en = S.project.enabled[g] || (S.project.enabled[g] = {});
    const shown = q ? items.filter(k => (tbl[k].name + ' ' + k).toLowerCase().includes(q)) : items;
    const onN = items.filter(k => en[k] !== false).length;
    total += items.length; onAll += onN;
    if (q && !shown.length) return;
    const d = document.createElement('details'); d.className = 'tgroup';
    d.open = !!q || openGroups.has(g);
    d.addEventListener('toggle', () => { if (d.open) openGroups.add(g); else openGroups.delete(g); });
    d.innerHTML = `<summary><span class="tg-name">${label}</span><span class="tg-cnt mono">${onN}/${items.length}</span></summary><div class="tg-tools"><button class="ghost small" data-a="on">すべてON</button><button class="ghost small" data-a="off">すべてOFF</button><button class="ghost small" data-a="flip">反転</button></div>`;
    const lock=document.createElement('button');lock.type='button';lock.className='ghost small';lock.textContent=S.project.locks?.tech?.[g]?'ON/OFFロック解除':'ON/OFFをロック';lock.onclick=()=>{S.project.locks??={tech:{},params:{}};S.project.locks.tech??={};S.project.locks.tech[g]=!S.project.locks.tech[g];renderTech();autosave();};d.querySelector('.tg-tools').appendChild(lock);
    const list = document.createElement('div'); list.className = 'checks';
    let filled=false;const populate=()=>{if(filled)return;filled=true;shown.forEach(k => {
      const l = document.createElement('label');
      l.title = k + (tbl[k].tags && tbl[k].tags.length ? '（' + tbl[k].tags.map(t => (J.MOODS[t] ? J.MOODS[t].name : t)).join('・') + '）' : '');
      if (!J.randomOk(S.project, g, k)) { l.classList.add('set-off'); l.title += tbl[k].extra && S.project.extra !== true ? '（追加分がオフのため、自動では選ばれません）' : '（和風の演出がオフのため、自動では選ばれません）'; }
      l.innerHTML = `<input type="checkbox" ${en[k] !== false ? 'checked' : ''}> ${escapeHtml(tbl[k].name)}${setBadges(tbl[k])}`;
      l.querySelector('input').addEventListener('change', e => { markImageLookModified(); en[k] = e.target.checked; S.project.mood = null; d.querySelector('.tg-cnt').textContent = `${items.filter(x => en[x] !== false).length}/${items.length}`; replanSoon(60); });
      list.appendChild(l);
    });};
    d.querySelectorAll('.tg-tools button[data-a]').forEach(b => b.addEventListener('click', () => {
      const a = b.dataset.a;
      shown.forEach(k => { en[k] = a === 'on' ? true : a === 'off' ? false : en[k] === false; });
      // keep a fallback so the planner always has something to use
      if (g === 'layout' && !items.some(k => en[k] !== false)) en.center = true;
      if (g === 'enter') en.cut = true; if (g === 'exit') en.cut = true; if (g === 'hold') en.still = true;
      if (g === 'treat') en.none = true; if (g === 'bg') en.none = true; if (g === 'cam') en.push = true;
      markImageLookModified(); S.project.mood = null; openGroups.add(g); renderTech(); replan();
    }));
    if(d.open)populate();d.addEventListener('toggle',()=>{if(d.open)populate();});
    d.appendChild(list);
    box.appendChild(d);
  });
  $('techTotal').textContent = `${onAll}/${total}`;
}

/* ---------------- output tab ---------------- */
function syncOut() {
  $('outAspect').value = S.project.aspect; $('outRes').value = String(S.project.res); $('outFps').value = String(S.project.fps);
  $('eAspect').value = S.project.aspect; $('eRes').value = String(S.project.res); $('eFps').value = String(S.project.fps);
  $('outQuality').value = S.project.quality || 'high'; $('outAudio').checked = S.project.includeAudio !== false;
  const key = J.keyMode(S.project), mode = key || (S.project.customBg.enabled ? 'custom' : 'off');
  $('outKey').value = mode; $('eKey').value = mode;
  const kb = $('keyBadge');
  kb.hidden = !key;
  if (key) kb.innerHTML = `<i style="background:${J.KEY_BG[key]}"></i>${key === 'green' ? 'グリーンバック' : 'ブラックバック'}`;
  document.querySelectorAll('.custom-bg-controls').forEach(el => { el.hidden = mode !== 'custom'; });
  document.querySelectorAll('.custom-bg-controls').forEach(box => {
    const bg = S.project.customBg;
    box.querySelector('[data-bg-name]').textContent = bg.filename || (bg.dataUrl ? '画像を読み込み済み' : '画像未選択');
    let note=box.querySelector('[data-bg-resolution]');if(!note){note=document.createElement('p');note.className='note';note.dataset.bgResolution='';box.appendChild(note);}
    const info=J.backgroundResolutionInfo(S.project,S.renderer.customBgBitmap);
    note.hidden=!info;note.textContent=info?`元画像 ${info.sourceWidth} × ${info.sourceHeight} · 出力 ${info.width} × ${info.height}${info.scale>1.01?` · 基本配置で${info.scale.toFixed(2)}倍に拡大します。細部を保つには高解像度の元画像を選んでください。`:' · 元画像の画素数を保った配置です。'} 演出のズームではさらに拡大される場合があります。`:'';
    box.querySelectorAll('[data-bg-setting]').forEach(input => {
      const setting = input.dataset.bgSetting;
      const value = setting === 'zoom' ? Math.round(bg.zoom * 100) : setting === 'darkness' ? Math.round(bg.darkness * 100) : bg[setting];
      input.value = String(value);
      const out = input.parentElement.querySelector('output');
      if (out) out.textContent = setting === 'blur' ? `${value}px` : `${value}${setting === 'fit' ? '' : '%'}`;
    });
  });
  syncStudioAspect();
  syncDirectionUI();
}

function syncStudioAspect() {
  const select = $('studioAspect');
  if (!select || !S.project) return;
  select.querySelectorAll('[data-project-aspect]').forEach(option => option.remove());
  const aspect = S.project.aspect || '16:9';
  if (![...select.options].some(option => option.value === aspect)) {
    const option = document.createElement('option');
    option.value = aspect;
    option.textContent = `詳細設定 · ${aspect}`;
    option.dataset.projectAspect = 'true';
    select.appendChild(option);
  }
  select.value = aspect;
  const exportButton = $('studioExport');
  if (exportButton) {
    const label = ({'16:9':'X用','9:16':'縦動画','1:1':'正方形'})[aspect] || `${aspect}`;
    exportButton.textContent = `${label} MP4を書き出す`;
  }
}

function exportRangeForSettings() {
  const settings=J.resolveExportSettings(S.project),full={start:0,end:Math.min(S.plan?.duration||0,S.audio?.duration||S.plan?.duration||0)};
  if(settings.range==='full')return full;
  if(S.range)return S.range;
  try{const choice=settings.range==='socialHook'?J.socialHookCandidates(S.plan,S.audio)[0]:J.highlightCandidates(S.plan,S.audio)[0];return choice?{start:choice.start,end:choice.end}:null;}catch(e){return null;}
}
function updateExportSummary() {
  const out=$('studioExportSummary');if(!out||!S.project)return;
  const range=exportRangeForSettings(),settings=J.resolveExportSettings(S.project);
  if(!range){out.textContent=settings.range==='socialHook'?'12〜15秒の縦型ショートをLRCから選べません。歌詞タイミングを確認してください。':settings.range==='highlight'?'LRCの区切りから自然な60秒区間を選べません。先に「SNS 60秒版」を確認してください。':'書き出し設定を確認してください。';return;}
  const estimate=J.estimateExport(S.project,range.end-range.start,S.project.includeAudio!==false);
  const mbps=(estimate.videoBitrate/1e6).toFixed(1),audio=S.project.includeAudio!==false?`AAC ${Math.round(estimate.audioBitrate/1000)} kbps`:'音声なし';
  const codec=S.exportCapabilities?.h264?'H.264':S.exportCapabilities?.recorder?'MP4（形式は書き出し後に確認）':'MP4（形式未確認）';
  const name=(settings.fileName||S.project.title||'kamen').trim().replace(/\.mp4$/i,'').replace(/[\\/:*?"<>|]+/g,'_')||'kamen';
  out.textContent=`${estimate.width}×${estimate.height} / ${estimate.fps}fps / ${codec} ${mbps}Mbps / ${audio} / ${estimate.seconds.toFixed(1)}秒 / 推定 ${estimate.fileMiB}MB / メモリ負荷 ${estimate.memory} / ${name}.mp4`;
  const warnings=[];
  if(['xStandard','xHigh'].includes(settings.preset)&&estimate.fps>40)warnings.push('Xの通常投稿では30fpsをおすすめします');
  if(estimate.memory==='高'||estimate.memory==='危険')warnings.push(`書き出し中のメモリ負荷が${estimate.memory}になる見込みです。画面を閉じずにお待ちください`);
  if(S.exportCapabilities?.recorder&&!S.exportCapabilities?.webCodecs)warnings.push('この端末ではリアルタイム録画を使う場合があります');
  $('studioExportCapability').textContent=warnings.join(' ・ ')||'MP4 / H.264 と、音源がある場合は AAC の対応状況を確認します。';
}
function syncStudioExportControls() {
  if(!$('studioPreset')||!S.project)return;
  const e=J.resolveExportSettings(S.project);

  $('studioPreset').value=e.preset;$('studioRes').value=String(S.project.res||1080);$('studioFPS').value=S.project.exportSettings.fpsMode==='auto'?'auto':String(S.project.fps||30);
  $('studioQualityLevel').value=S.project.quality||'high';$('studioVideoBitrate').value=e.videoBitrate>0?(e.videoBitrate/1e6).toString():'';
  $('studioSampleRate').value=String(e.sampleRate||48000);
  $('studioAudio').value=S.project.includeAudio===false?'off':'on';$('studioAudioBitrate').value=String(e.audioBitrate||192000);


  $('studioExportRange').value=e.range||'full';$('studioFileName').value=e.fileName||'';updateExportSummary();
}

function syncSocialCopy() {
  const copy = document.querySelector('#studioSocialFrame .social-copy');
  if (copy && S.project) copy.textContent = (S.project.title || '').trim() || '作品の表示イメージ';
}

function syncStudioResultVisibility() {
  const ready = !!((S.project?.autoDirection||S.project?.generation?.generated||!J.isUpstream(S.project)) && S.audio && S.plan?.lines?.length);
  $('studioResult').hidden = !ready;
  $('studioTools').hidden = !ready;
}

function invalidateGeneratedMV() {
  if (!S.project) return;
  S.project.autoDirection = false;
  S.range = null;
  S.highlights = [];
  S.highlightIndex = 0;
  $('studioHighlight').setAttribute('aria-pressed', 'false');
  $('studioHighlight').textContent = 'SNS 60秒版';
  $('highlightChoice').textContent = '';
  $('highlightNext').hidden = true;
  S.rangeMode=null;
  syncStudioResultVisibility();
  delete $('directionStatus').dataset.result;
}


function refreshLocalPaletteMap() {
  if(J.isUpstream(S.project))return;
  const ap = S.project.autoPalette;
  if (!ap || !ap.analyzed || !S.renderer.customBgBitmap) return;
  if (ap.options && ap.options.readability) ap.localMap = J.refreshAutoPaletteMap(S.renderer.customBgBitmap, S.project);
  else ap.localMap = null;
  if (S.plan && S.plan.autoPalette) S.plan.autoPalette.localMap = ap.localMap;
}

function validatePaletteSource(project, image) {
  if(J.isUpstream(project))return;
  const ap = project.autoPalette;
  if (!ap || !ap.analyzed || !image) return;
  const hash = J.imageFingerprint(image);
  if (ap.sourceHash && hash && ap.sourceHash !== hash) J.invalidateAutoPalette(project);
  else {
    if (!ap.sourceHash && hash) ap.sourceHash = hash;
    // A persisted v16 map is part of the selected render input. Recomputing
    // it at the legacy 96px refresh size would replace its 128px source map.
    const workflow=project.randomWorkflowV16;
    const savedComplete=project.autoDirection&&project.artDirection?.songNativeResolved;
    const retained=(savedComplete||J.workflowRendererCompatibleV16(workflow)&&['RANDOM_DRAFT_READY','FINISHED'].includes(workflow.state))&&ap.localMap&&ap.viewportKey===J.autoPaletteViewportKey(project);
    if (!retained&&ap.options && ap.options.readability) ap.localMap = J.refreshAutoPaletteMap(image, project);
  }
}


let directionBusy = false, exportPreflightBusy=false;
const workflowImageFingerprintsV16=new WeakMap();
const editingLock=J.createControlLock();
function processingLocks(active){
  if(!active){editingLock.unlock();return;}
  editingLock.lock([...document.querySelectorAll('#app input,#app select,#app textarea,#app button')].filter(el=>!el.classList.contains('terms-open')&&el.id!=='btnHelp'&&!el.closest('dialog')));
}
function syncDirectionUI() {
  const locked=!!(S.exporting||exportPreflightBusy||S.projectLoading||directionBusy||visualBusy);
  if(!locked){processingLocks(false);if($('localWorkspace'))$('localWorkspace').disabled=!!(S.audioLoading||S.tap||S.workspaceStorageUnavailable);}
  const image = !!(S.project.customBg.enabled && S.project.customBg.dataUrl && S.renderer.customBgBitmap);
  const music = !!S.audio;
  const lyrics = J.parseLyrics(S.project.lyrics).lines.length>0;
  const generated = !!(S.project.autoDirection && S.audio && S.plan?.lines?.length && image && lyrics);
  $('studioStep').textContent = !J.isUpstream(S.project)?'保存したMV · 編集・書き出し可能':directionBusy?'処理中 · キャンセルできます':({INPUT_READY:'01 / 03　素材を準備',RANDOM_DRAFT_READY:'02 / 03　ランダム案を選択',FINISHED:J.isUpstream?.(S.project)?'03 / 03　生成済み':'03 / 03　最適化済み'})[workflowStateV16()];
  const workflow=workflowStateV16(),draftBlocked=false;
  const canExport = !draftBlocked && !!(S.audio && lyrics && S.plan?.duration > 0 && !S.audioLoading && !S.exporting && !exportPreflightBusy && !S.tap);
  $('studioExport').disabled = !canExport;
  $('studioHighlight').disabled = !canExport||S.plan.duration<60;$('studioHighlight').title=(S.plan?.duration||0)<60?'60秒以上の音源で使用できます':'';
  if($('studioSocialHook'))$('studioSocialHook').disabled=!canExport||S.plan.duration<12;


  $('studioTiming').disabled = !lyrics || !!S.exporting;
  const btn = $('btnAutoDirection');
  btn.disabled = directionBusy || S.audioLoading || !!S.tap || !image || !music || !lyrics;
  btn.textContent='本家JIZURAで'+(S.project.generation?.generated||!J.isUpstream(S.project)?'再生成':'生成');

  for(const id of ['btnMP4','eMP4'])if($(id))$(id).disabled=draftBlocked||locked;


  for(const [id,ready] of [['studioImageSlot',image],['studioAudioSlot',music],['studioLrcSlot',lyrics]])
    $(id).parentElement.classList.toggle('is-ready',ready);
  $('studioImageName').textContent=image?S.project.customBg.filename||'画像を読み込み済み':'画像を選択';
  $('studioAudioName').textContent=S.audioLoading?`${S.audioPendingName||'音源'} を解析中…`:music?S.audio.name||'音源を読み込み済み':'曲を選択';
  if(!lyrics)$('studioLrcName').textContent='LRC / TXTを選択';
  else if($('studioLrcName').textContent==='LRC / TXTを選択')$('studioLrcName').textContent='歌詞を読み込み済み';
  if (S.audioLoading) $('directionStatus').textContent = '音源を解析しています。終わるまでお待ちください。';
  else if (S.audioNotice) $('directionStatus').textContent = S.audioNotice;
  else if (!directionBusy && !$('directionStatus').dataset.result && $('directionStatus').dataset.selectionState!=='FAILED') {
    const missing=[!image&&'背景画像',!music&&'音源',!lyrics&&'歌詞'].filter(Boolean);
    $('directionStatus').textContent=S.generationNotice|| (missing.length?`あと ${missing.join('・')} を選んでください。`:'素材が揃いました。本家JIZURAで生成できます。');
  }
  syncStudioResultVisibility();

  if(locked)processingLocks(true);
}
function completedWorkflowSnapshotV16(project){
  const snapshot=J.compactPersistentProjectV111(project);
  if(snapshot.randomWorkflowV16){delete snapshot.randomWorkflowV16.finishedProject;delete snapshot.randomWorkflowV16.previousFinishedProject;}
  return snapshot;
}
function workflowStateV16() {
  if(J.isUpstream?.(S.project))return S.project.generation.generated?'FINISHED':'INPUT_READY';
  const d=S.project.randomWorkflowV16;
  if(!J.workflowRendererCompatibleV16(d))return 'INPUT_READY';
  return d.inputHash===J.songNativeInputIdentity(S.project,audioLike())?d.state:'INPUT_READY';
}
async function generateRandomDraft(){return generateUpstreamMV();}
async function generateUpstreamMV(){
 if(directionBusy||S.exporting||exportPreflightBusy||S.audioLoading||S.projectLoading||S.tap)return;
 const sourceInput=projectFingerprint(),before=S.project,priorPlan=S.plan,priorState={pixelQA:S.pixelQA,exportValidation:S.exportValidation,confirmedCinemaPlan:S.confirmedCinemaPlan,range:S.range,rangeMode:S.rangeMode},audio=S.audio,controller=new AbortController();let committed=false;
 const task=J.processing.begin('本家JIZURA方式でMVを生成しています',[['direction','歌詞・音源から演出を組み立てています',9],['save','生成結果を保存しています',1]],{cancel:()=>controller.abort(),retry:generateRandomDraft});
 directionBusy=true;pause();syncDirectionUI();
 try{
  task.enter('direction');await J.processingYield();
  const result=J.generateUpstream(before,audioLike());result.project.generation.generated=true;
  await J.ensureFonts(result.project.lyrics,J.fontsOfPlan(result.plan));
  if(controller.signal.aborted||S.project!==before||S.audio!==audio||projectFingerprint()!==sourceInput)throw new DOMException('生成を中止しました','AbortError');
  remember();S.project=mergeProject(result.project);S.plan=J.plan(S.project,audioLike());S.pixelQA=null;S.exportValidation=null;S.confirmedCinemaPlan=null;S.range=null;S.rangeMode=null;
  if(controller.signal.aborted)throw new DOMException('生成を中止しました','AbortError');
  committed=true;task.state.cancel=null;task.enter('save');const saved=await flushSave();
  S.generationNotice=saved?(S.workspaceForked?'生成結果を別の作業として保存しました':'JIZURA v'+J.upstreamInfo.version+'で生成しました。演出品質は参考情報です。'):'生成は完了しましたが、ブラウザに保存できませんでした。プロジェクト保存でバックアップしてください。'+(S.persistenceError?.message||'');
  syncUI();replan();commit();$('directionStatus').dataset.result='true';$('directionStatus').textContent=S.generationNotice;$('workflowChanges').textContent='seed '+S.project.seed;if(saved)task.complete('MVを生成・保存しました');else task.fail(new Error(S.generationNotice));
 }catch(e){if(!committed){if(S.project===before&&projectFingerprint()===sourceInput){S.plan=priorPlan;Object.assign(S,priorState);}else replan();syncUI();renderLines();refreshPreviewPlan();S.need=true;}S.generationNotice=e.message;task.fail(e,e.name==='AbortError');$('directionStatus').textContent=e.message;}
 finally{directionBusy=false;syncDirectionUI();}
}
async function optimizeSelectedDraft(){return runRandomWorkflowV16(true);}
async function runRandomWorkflowV16(finish) {
  if(directionBusy||S.exporting||exportPreflightBusy||S.audioLoading||S.projectLoading||S.tap)return;
  if(finish&&workflowStateV16()!=='RANDOM_DRAFT_READY')return;
  const before={project:S.project,plan:S.plan,pixelQA:S.pixelQA,confirmed:S.confirmedCinemaPlan,range:S.range,rangeMode:S.rangeMode,t:S.t};
  const sourceIdentity=J.songNativeInputIdentity(S.project,audioLike()),sourceAudio=S.audio;
  let snapshot=null;try{if(finish)snapshot=J.selectedDraftSnapshotV16(S.project,S.plan,audioLike());}catch(error){$('directionStatus').textContent=error.message;return;}
  const q=mergeProject(J.clonePhotoRenderPlan(S.project)),controller=new AbortController();
  const priorFinished=q.randomWorkflowV16?.finishedProject||q.randomWorkflowV16?.previousFinishedProject||(q.randomWorkflowV16?.state==='FINISHED'||!q.randomWorkflowV16&&q.artDirection?.songNativeResolved?completedWorkflowSnapshotV16(q):null);
  let committed=false,workingPlan=null;
  const task=J.processing.begin(finish?'現在の案を最適化しています':'ランダム案を生成しています',finish?[['direction','選択した案の可読性と640px合成を検査しています',75],['quality','完成プレビューを観測しています',20],['save','選択案と結果を保存しています',5]]:[['direction','登録技法からランダム案を描画しています',95],['save','ドラフトを保存しています',5]],{retry:finish?optimizeSelectedDraft:generateRandomDraft,cancel:()=>controller.abort()});
  const assertCurrent=()=>{if(controller.signal.aborted)throw new DOMException('Aborted','AbortError');if(S.audio!==sourceAudio||S.project!==q||J.songNativeInputIdentity(before.project,audioLike())!==sourceIdentity)throw Error('入力が変更されたため処理を中止しました');};
  directionBusy=true;S.pendingDirectionCommit=true;S.project=q;pause();syncDirectionUI();
  $('directionStatus').dataset.workflowState=finish?'OPTIMIZING':'INPUT_READY';
  try{
    task.enter('direction');await J.processingYield();assertCurrent();
    const options={signal:controller.signal,onProgress:e=>task.observe(e.current,e.total,e.label),initialPlan:before.plan};
    let result;
    const audioFile=S.pendingAudioFile||await bgDbGet('audio').catch(()=>null);assertCurrent();
    if(finish){
      if(audioFile)S.workflowSaveEntriesV16=[['finished-audio-v16',audioFile]];
      result=await J.finishSelectedDraftV16(q,before.plan,audioLike(),snapshot,options);assertCurrent();workingPlan=result.plan;
      task.enter('quality');
      await J.ensureFonts(q.lyrics+(q.title||'')+(q.artist||''),J.fontsOfPlan(workingPlan));assertCurrent();
      // Observe this final render state once. No score-driven genome search.
      const qa=await J.observeMVQuality(workingPlan,{start:0,end:Math.min(workingPlan.duration,S.audio.duration)},S.audio,{signal:controller.signal,observationCache:new Map(),onProgress:options.onProgress});assertCurrent();
      if(!qa?.completed)throw Error('V16_FINAL_OBSERVATION_INCOMPLETE');
      workingPlan.lastPixelQA=qa;S.pixelQA=qa;
      S.exportCapabilities=await J.exportCapabilities(q,q.includeAudio!==false?S.audio:null).catch(()=>null);assertCurrent();
      q.artDirection.songNativeDirection=J.clonePhotoRenderPlan(workingPlan.songNativeDirection);
      q.randomWorkflowV16.state='FINISHED';
      J.captureSongNativeResolved(q,audioLike(),workingPlan);
      q.randomWorkflowV16={...q.randomWorkflowV16,draftSourceTreeSHA256:q.randomWorkflowV16.draftSourceTreeSHA256||q.randomWorkflowV16.sourceTreeSHA256,sourceTreeSHA256:window.KAMEN_BUILD_INFO?.sourceTreeSHA256??null,state:'FINISHED',changes:result.changes,finishMetrics:{...result.metrics,qaObservations:1},scaleSafety:result.scaleSafety,nativeSafety:result.nativeSafety,previousFinishedProject:priorFinished};
      q.randomWorkflowV16.inputHash=J.songNativeInputIdentity(q,audioLike());
      q.randomWorkflowV16.finishedProject=completedWorkflowSnapshotV16(q);
    }else{
      if(before.project.randomWorkflowV16?.state==='FINISHED'||!before.project.randomWorkflowV16&&priorFinished){const previousAudio=await bgDbGet('finished-audio-v16').catch(()=>null)||audioFile;if(previousAudio)S.workflowSaveEntriesV16=[['previous-finished-audio-v16',previousAudio]];}
      const paletteStarted=performance.now(),bitmap=S.renderer.customBgBitmap;let paletteCacheHit=false;
      if(bitmap&&q.customBg?.enabled&&q.customBg.dataUrl){
        const immutable=typeof ImageBitmap!=='undefined'&&bitmap instanceof ImageBitmap,cached=immutable?workflowImageFingerprintsV16.get(bitmap):null;
        const hash=cached?.source===q.customBg.dataUrl?cached.hash:J.imageFingerprint(bitmap);if(immutable)workflowImageFingerprintsV16.set(bitmap,{source:q.customBg.dataUrl,hash});
        const ap=q.autoPalette;paletteCacheHit=!!(ap?.analyzed&&ap.sourceHash===hash&&ap.viewportKey===J.autoPaletteViewportKey(q)&&ap.stats&&ap.palette&&(!q.randomWorkflowV16||q.randomWorkflowV16.inputHash===J.songNativeInputIdentity(q,audioLike())));
        if(!paletteCacheHit){let analyzed=J.analyzeCustomBackground(bitmap,q);if(!ap?.darknessManual&&Math.abs(q.customBg.darkness-analyzed.suggestedDarkness)>.005){q.customBg.darkness=analyzed.suggestedDarkness;analyzed=J.analyzeCustomBackground(bitmap,q);}J.applyImagePalette(q,analyzed,{palette:true,readability:true,mood:false});}
      }
      const paletteMs=performance.now()-paletteStarted;
      result=await J.generateRandomDraftV16(q,audioLike(),options);result.draft.metrics.paletteMs=paletteMs;result.draft.metrics.paletteCacheHit=paletteCacheHit;assertCurrent();workingPlan=result.plan;
      q.randomWorkflowV16.previousFinishedProject=priorFinished;S.pixelQA=null;
    }
    S.comparisonDraftV16=false;
    S.plan=workingPlan;S.confirmedCinemaPlan=null;S.range=null;S.rangeMode=null;S.exportValidation=null;
    assertCurrent();task.state.cancel=null;S.pendingDirectionCommit=false;task.enter('save');
    if(!await flushSave())throw Error('保存できなかったため、前の状態を保持しました。空き容量を確認してください。');
    assertCurrent();committed=true;commit();fontKey='';syncUI();renderLines();refreshPreviewPlan();sizeViewport();drawTimeline();S.t=Math.min(before.t,S.plan.duration);if(!finish&&!(J.cutAt(S.plan,S.t)?.line>=0)){const first=S.plan.cuts.find(c=>c.line>=0);if(first)S.t=first.start+Math.min(.5,first.dur*.5);}S.need=true;
    $('directionStatus').dataset.result='true';$('directionStatus').dataset.selectionState=finish?'SELECTED':'DRAFT';$('directionStatus').dataset.workflowState=q.randomWorkflowV16.state;
    $('directionStatus').textContent=finish?'最適化済み · 640px合成検査済み。芸術品質は未検証です。':'ランダム案 · 未最適化・書き出し前検証未完了。何度でも再生成できます。';
    if(finish){updateStudioQuality();const n=result.changes.reduce((n,c)=>n+c.changedRoles.length,0);$('workflowChanges').textContent=`技法変更 ${n}件 · `+result.changes.filter(c=>c.changedRoles.length).map(c=>`${c.line+1}行: ${c.changedRoles.join(' / ')}（描画安全性の復旧）`).join('、');}
    else {$('workflowChanges').textContent=`seed ${q.randomWorkflowV16.seed} · 完成認定前のプレビュー`;}
    if(finish&&J.cinemaV3?.enabled){
      try{const V=J.cinemaV3,range={start:0,end:Math.min(workingPlan.duration,S.audio.duration)},renderState=V.qaRenderState(q,workingPlan,range),input=await V.snapshot(q,S.audio,workingPlan,range),planHash=await V.planHash(workingPlan);if(S.project===q&&S.plan===workingPlan&&S.pixelQA?.observationBinding?.planHash===planHash)S.confirmedCinemaPlan={plan:workingPlan,inputHash:input.inputHash,analysisKey:J.canonicalJSON(audioLike()),planHash,pixelQA:S.pixelQA,pixelQAPlan:workingPlan,renderState,rangeKey:J.canonicalJSON(range)};}catch{/* Cache preparation cannot invalidate a saved, measured result. */}
    }
    task.complete(finish?'選んだ案の最適化と保存が完了しました':'ランダム案を表示しました');
  }catch(error){
    if(!committed&&S.project===q){S.project=before.project;S.plan=before.plan;S.pixelQA=before.pixelQA;S.confirmedCinemaPlan=before.confirmed;S.range=before.range;S.rangeMode=before.rangeMode;S.t=before.t;syncUI();renderLines();refreshPreviewPlan();S.need=true;}
    const message=J.workflowErrorMessageV16(error);
    task.fail(new Error(message,{cause:error}),controller.signal.aborted);$('directionStatus').textContent=controller.signal.aborted?'処理をキャンセルしました。前の状態を保持しています。':message;
    $('directionStatus').dataset.selectionState='FAILED';console.error('KAMEN v16 workflow',error,{diagnostic:error.diagnostic??null});
  }finally{S.workflowSaveEntriesV16=null;S.pendingDirectionCommit=false;directionBusy=false;syncDirectionUI();}
}

async function restorePreviousFinishedV16(){
  if(directionBusy||S.exporting)return;
  const previous=S.project.randomWorkflowV16?.previousFinishedProject;if(!previous)return;
  const before={project:S.project,plan:S.plan,audio:S.audio,pending:S.pendingAudioFile};directionBusy=true;S.pendingDirectionCommit=true;syncDirectionUI();
  try{
    const q=mergeProject(J.clonePhotoRenderPlan(previous)),file=await bgDbGet('previous-finished-audio-v16');
    let audio=S.audio;
    if(J.songNativeInputIdentity(q,audio)!==q.artDirection?.songNativeResolved?.sourceIdentity){if(!file)throw Error('前の完成MVの音源が保存されていません。プロジェクトと元の音源を読み込んでください。');audio=await J.analyzeAudio(file);}
    const p=J.plan(q,audio);if(p.songNativeRestore?.status!=='RESTORED')throw Error('前の完成MVと音源の互換性を確認できませんでした。');
    S.project=q;S.plan=p;S.audio=audio;S.pendingAudioFile=file||before.pending;S.pendingDirectionCommit=false;
    if(!await flushSave())throw Error('復元内容を保存できませんでした。');
    await S.renderer.loadCustomBackground(q.customBg.dataUrl);S.comparisonDraftV16=false;syncUI();renderLines();refreshPreviewPlan();S.need=true;commit();$('directionStatus').textContent='前の完成MVを復元しました。';
  }catch(error){S.project=before.project;S.plan=before.plan;S.audio=before.audio;S.pendingAudioFile=before.pending;$('directionStatus').textContent=error.message;}
  finally{S.pendingDirectionCommit=false;directionBusy=false;syncDirectionUI();}
}

function updateStudioQuality(){const target=$('studioQuality');if(!target)return;target.textContent=S.exportValidation?'MP4技術検査済み · '+S.exportValidation.width+'×'+S.exportValidation.height+' · '+S.exportValidation.duration.toFixed(2)+'秒':'MP4の映像・音声は書き出し後に検査します。';if($('studioPreflight'))$('studioPreflight').textContent='演出スコアによる保存制限はありません。';}

async function showHighlight() {
  const choice=S.highlights[S.highlightIndex];if(!choice)return;
  S.socialPlan=null;S.range={start:choice.start,end:choice.end};
  S.rangeMode='highlight';S.project.exportSettings.range='highlight';S.exportValidation=null;syncStudioExportControls();flushSave();
  $('highlightChoice').textContent=`推奨区間 ${J.fmtTime(choice.start)} → ${J.fmtTime(choice.end)} · ${choice.reason}`;
  $('highlightNext').hidden=S.highlights.length<2;
  $('studioHighlight').setAttribute('aria-pressed','true');
  if($('studioSocialHook'))$('studioSocialHook').setAttribute('aria-pressed','false');
  $('studioHighlight').textContent='曲全体に戻す';
  seek(choice.start);
  S.pixelQA=await J.analyzeRenderedFrames(S.plan,S.range,S.audio);
  updateStudioQuality();
}

async function showSocialHook(index=null){
  try{if(!S.highlights.length||S.rangeMode!=='socialHook'){S.highlights=J.socialHookCandidates(S.plan,S.audio);S.highlightIndex=0;}if(index!=null)S.highlightIndex=index;}catch(e){$('highlightChoice').textContent=e.message||'15秒版を選べませんでした';return;}
  S.rangeMode='socialHook';
  const selected=S.highlights[S.highlightIndex]||S.highlights[0];S.range={start:selected.start,end:selected.end};
  const portraitProject=J.deepClone?J.deepClone(S.project):JSON.parse(JSON.stringify(S.project));portraitProject.aspect='9:16';
  const portraitPlan=J.plan(portraitProject,audioLike());S.socialPlan=J.createSocialHookPlan?J.createSocialHookPlan(portraitPlan,{...selected,assetStrategy:S.project.socialAssetStrategy}):portraitPlan;
  S.project.exportSettings.range='socialHook';S.exportValidation=null;syncStudioExportControls();flushSave();
  $('highlightChoice').textContent=`縦型ショート ${J.fmtTime(selected.start)} → ${J.fmtTime(selected.end)} · ${selected.duration.toFixed(1)}秒 · ${selected.reason}`;
  $('highlightNext').hidden=S.highlights.length<2;$('studioSocialHook').setAttribute('aria-pressed','true');$('studioHighlight').setAttribute('aria-pressed','false');
  sizeViewport();seek(selected.start);S.pixelQA=await J.analyzeRenderedFrames(viewPlan(),S.range,S.audio);updateStudioQuality();
}

function mountStudio() {
  const move=(id,slot)=>$(slot).appendChild($(id));
  move('songTitle','studioTitleSlot');move('songArtist','studioArtistSlot');
  move('audioFile','studioAudioSlot');move('lrcFile','studioLrcSlot');
  const background=$('eCustomBg').querySelector('[data-bg-file]');$('studioImageSlot').appendChild(background);
  move('btnAutoDirection','studioGenerateSlot');move('directionStatus','studioStatusSlot');
  const viewport=$('viewport'),frame=document.createElement('div');frame.id='studioSocialFrame';frame.className='studio-social-frame';
  frame.innerHTML='<div class="social-head"><span class="social-avatar" aria-hidden="true">K</span><span><strong>投稿者</strong><br><small>@account · 表示確認</small></span></div><div class="social-copy"></div><div class="social-video"></div><div class="social-foot">返信　　リポスト　　いいね</div>';
  viewport.before(frame);frame.querySelector('.social-video').appendChild(viewport);
  syncSocialCopy();
  const overlay=document.createElement('div');overlay.className='social-safe-overlay';overlay.setAttribute('aria-hidden','true');
  overlay.innerHTML='<span class="safe-top"></span><span class="safe-right"></span><span class="safe-bottom"></span>';
  frame.querySelector('.social-video').appendChild(overlay);
  $('btnAutoDirection').textContent='ランダム生成';


  $('studioAdvanced').addEventListener('click',()=>{
    const expanded=!$('app').classList.contains('studio-advanced');
    setMode(expanded?'pro':'easy');
    sizeViewport();drawTimeline();
  });
  $('studioAspect').addEventListener('change',e=>{
    S.project.aspect=e.target.value;S.project.res=1080;S.project.fps=30;S.project.exportSettings.preset='custom';
    refreshLocalPaletteMap();syncOut();syncStudioExportControls();replan();codecNote();flushSave();updateStudioQuality();
  });
  $('studioPreset').addEventListener('change',e=>{
    remember();J.applyExportPreset(S.project,e.target.value);syncOut();syncStudioAspect();syncStudioExportControls();replan();
    flushSave();codecNote();updateStudioQuality();
  });
  $('studioRes').addEventListener('change',e=>{
    S.project.res=+e.target.value;S.project.exportSettings.preset='custom';S.exportValidation=null;syncOut();syncStudioExportControls();flushSave();codecNote();updateExportSummary();updateStudioQuality();
  });
  $('studioFPS').addEventListener('change',e=>{
    S.project.exportSettings.fpsMode=e.target.value==='auto'?'auto':'manual';S.project.fps=e.target.value==='auto'?J.chooseAdaptiveFPS(S.project).fps:+e.target.value;S.project.exportSettings.preset='custom';replan();syncOut();syncStudioExportControls();flushSave();codecNote();updateStudioQuality();
  });
  $('studioQualityLevel').addEventListener('change',e=>{
    S.project.quality=e.target.value;S.project.exportSettings.preset='custom';S.project.exportSettings.videoBitrate=0;S.exportValidation=null;
    syncStudioExportControls();flushSave();updateExportSummary();
  });
  $('studioVideoBitrate').addEventListener('change',e=>{
    const mbps=Number(e.target.value);S.project.exportSettings.videoBitrate=Number.isFinite(mbps)&&mbps>0?Math.round(mbps*1e6):0;
    S.project.exportSettings.preset='custom';S.exportValidation=null;syncStudioExportControls();flushSave();updateExportSummary();updateStudioQuality();
  });
  $('studioAudio').addEventListener('change',e=>{
    S.project.includeAudio=e.target.value!=='off';S.exportValidation=null;syncOut();codecNote();flushSave();updateExportSummary();updateStudioQuality();
  });

  $('studioSampleRate').addEventListener('change',e=>{S.project.exportSettings.sampleRate=+e.target.value;S.exportValidation=null;flushSave();codecNote();updateExportSummary();});
  $('studioAudioBitrate').addEventListener('change',e=>{
    S.project.exportSettings.audioBitrate=+e.target.value;S.project.exportSettings.preset='custom';S.exportValidation=null;syncStudioExportControls();flushSave();codecNote();updateExportSummary();updateStudioQuality();
  });


  $('studioExportRange').addEventListener('change',async e=>{
    S.project.exportSettings.range=e.target.value;S.exportValidation=null;flushSave();
    if(e.target.value==='highlight'||e.target.value==='socialHook'){
      try{if(e.target.value==='socialHook')await showSocialHook();else{S.highlights=J.highlightCandidates(S.plan,S.audio);S.highlightIndex=0;await showHighlight();}}
      catch(error){$('highlightChoice').textContent=error.message||'SNS用の区間を選べませんでした';updateStudioQuality();}
    }else{
      S.range=null;S.rangeMode=null;S.socialPlan=null;S.pixelQA=null;$('studioHighlight').setAttribute('aria-pressed','false');$('studioSocialHook').setAttribute('aria-pressed','false');$('studioHighlight').textContent='SNS 60秒版';$('highlightNext').hidden=true;$('highlightChoice').textContent='';
      updateExportSummary();updateStudioQuality();
    }
  });
  $('studioFileName').addEventListener('input',e=>{
    S.project.exportSettings.fileName=e.target.value.slice(0,80);updateExportSummary();flushSave();
  });
  $('studioHighlight').addEventListener('click',()=>{
    if(S.rangeMode==='highlight'){S.range=null;S.rangeMode=null;S.socialPlan=null;S.project.exportSettings.range='full';syncStudioExportControls();$('studioHighlight').setAttribute('aria-pressed','false');$('studioSocialHook').setAttribute('aria-pressed','false');$('studioHighlight').textContent='SNS 60秒版';$('highlightChoice').textContent='曲全体';$('highlightNext').hidden=true;seek(0);updateStudioQuality();return;}
    try{S.highlights=J.highlightCandidates(S.plan,S.audio);S.highlightIndex=0;showHighlight();}
    catch(e){$('highlightChoice').textContent=e.message;}
  });
  $('studioSocialHook').addEventListener('click',()=>{
    if(S.rangeMode==='socialHook'){S.range=null;S.rangeMode=null;S.socialPlan=null;S.project.exportSettings.range='full';syncStudioExportControls();$('studioSocialHook').setAttribute('aria-pressed','false');$('studioHighlight').setAttribute('aria-pressed','false');$('highlightChoice').textContent='曲全体';sizeViewport();seek(0);updateStudioQuality();return;}
    showSocialHook();
  });
  $('highlightNext').addEventListener('click',()=>{S.highlightIndex=(S.highlightIndex+1)%S.highlights.length;if(S.rangeMode==='socialHook')showSocialHook(S.highlightIndex);else showHighlight();});

  $('studioPreviewMode').addEventListener('change',e=>{
    $('app').classList.remove('preview-x','preview-vertical');
    if(e.target.value==='x')$('app').classList.add('preview-x');
    if(e.target.value==='vertical'){
      $('app').classList.add('preview-vertical');
    }
    S.previewAspect=J.previewAspectForMode(e.target.value);
    refreshPreviewPlan();
    syncSocialCopy();
    S.need=true;requestAnimationFrame(()=>{sizeViewport();drawTimeline();});
  });


  $('studioExport').addEventListener('click',async()=>{
    if(!S.audio){$('studioQuality').textContent='音源を読み込んでください。';return;}
    if(!S.plan.lines?.length){$('studioQuality').textContent='歌詞を読み込んでください。';return;}
    if(S.plan.lines.some(l=>l.start<0 || l.start>S.audio.duration+.15)){
      $('studioQuality').textContent='音源の長さを超える歌詞があります。歌詞タイミングを調整してください。';return;
    }
    const before=J.canonicalJSON(S.project);S.project.aspect=$('studioAspect').value;
    syncOut();if(before!==J.canonicalJSON(S.project))replan();await runExport('mp4');
  });
  $('studioPNG').addEventListener('click',()=>{
    $('view').toBlob(blob=>{if(blob)J.saveFile(baseName()+'_frame.png',blob);else $('studioQuality').textContent='画像を保存できませんでした。';},'image/png');
  });
  $('studioShare').addEventListener('click',async()=>{
    if(!S.lastExport)return;
    try{await navigator.share({files:[S.lastExport],title:S.project.title||'KAMEN MV'});}
    catch(e){if(e.name!=='AbortError')$('studioQuality').textContent='共有できませんでした。MP4の保存をお試しください。';}
  });
  $('studioTiming').addEventListener('click',()=>{
    setMode('pro');$('lineList').scrollIntoView({behavior:'smooth',block:'start'});sizeViewport();
  });

  if(S.project.lyrics && S.project.lyrics.includes('['))$('studioLrcName').textContent='歌詞を復元しました';
  syncDirectionUI();
  syncStudioAspect();
  updateStudioQuality();
  syncStudioResultVisibility();
}
async function codecNote() {
  const [w, h] = J.outputSize(S.project);
  const caps=await J.exportCapabilities(S.project,S.project.includeAudio!==false?S.audio:null).catch(()=>({webCodecs:false,h264:false,aac:false,recorder:null}));
  S.exportCapabilities=caps;
  const sound=S.project.includeAudio===false?'音声なし':caps.aac?'AAC音声':'音声形式は書き出し後に確認';
  $('codecNote').textContent=caps.webCodecs?`H.264 / ${sound}で書き出します（${w}×${h}）。`:caps.recorder?'この端末では代替方法でMP4を書き出します。画面を表示したままお待ちください。':'この端末はMP4の書き出しに対応していません。';
  $('btnMP4').disabled=!caps.webCodecs&&!caps.recorder; $('eMP4').disabled=!caps.webCodecs&&!caps.recorder;
  updateExportSummary();updateStudioQuality();
}
const EXP_BTNS = ['btnMP4', 'btnPNG', 'btnPNGA', 'eMP4'];
function baseName() {
  const k = J.keyMode(S.project);
  const settings=J.resolveExportSettings(S.project),source=(settings.fileName||S.project.title||'kamen').trim().replace(/\.mp4$/i,'');
  return (source.replace(/[\\/:*?"<>|]+/g,'_').slice(0,60)||'kamen')+(settings.fileName?'':(k?(k==='green'?'_greenback':'_blackback'):''));
}
async function runExport(kind) {
  if (S.exporting||exportPreflightBusy||directionBusy) return;
  pause();
  const outcome=S.exportOutcome={fileState:'PREPARING',creativeState:'UNMEASURED'};
  const range=exportRangeForSettings();
  if(!range){outcome.fileState='FAILED_TECHNICAL';$('studioQuality').textContent='書き出す範囲を選べません。先に「SNS 60秒版」で候補を確認してください。';return;}
  const destination=kind==='mp4'?J.prepareFileSave(baseName()+'.mp4','video/mp4'):Promise.resolve(null);
  let saveHandle=null;
  const socialHook=J.resolveExportSettings(S.project).range==='socialHook';
  let outputProject=socialHook?{...S.project,aspect:'9:16'}:S.project;
  let exportPlan=socialHook&&S.socialPlan?.socialHook?.start===range.start&&S.socialPlan?.socialHook?.end===range.end?S.socialPlan:S.plan;
  const makeOutputPlan=()=>{const target=socialHook?{...S.project,aspect:'9:16'}:S.project,p=J.plan(target,audioLike());return socialHook&&J.createSocialHookPlan?J.createSocialHookPlan(p,{...range,assetStrategy:S.project.socialAssetStrategy}):p;};
  const task=J.processing.begin(kind==='mp4'?'動画を書き出しています':'PNGを書き出しています',[
    ['prepare','書き出し前の映像・歌詞・出力設定を検査しています',8],['fonts','フォントと素材を準備しています',2],
    ['frames','フレームを生成・エンコーダーに送っています',65],['video','映像のエンコード完了を待っています',5],
    ['resample','音声を出力形式へ変換しています',4],['audio','音声をエンコードしています',8],
    ['mux',kind==='mp4'?'映像と音声をMP4にまとめています':'PNGをZIPにまとめています',2],
    ['verify','生成ファイルの映像・音声・タイミングを検証しています',5],['file','保存ファイルを作成しています',1]],{retry:()=>runExport(kind)});
  const ac=new AbortController();task.state.cancel=()=>ac.abort();
  task.enter('prepare');
  if(kind!=='mp4'){for(const id of ['video','resample','audio','verify'])task.skip(id);}
  else if(!S.audio||S.project.includeAudio===false){task.skip('resample');task.skip('audio');}
  const auditDetail=e=>{if(ac.signal.aborted)throw new DOMException('書き出し前の検査を中止しました','AbortError');task.observe(e.current,e.total,[e.label,e.detail,e.total?(e.current+' / '+e.total):''].filter(Boolean).join(' · '));};
  if(kind==='mp4'){
    exportPreflightBusy=true;syncDirectionUI();showMsg('書き出し前に代表フレームを検査しています…');
    try{
    S.exportValidation=null;saveHandle=await destination;if(saveHandle==='declined'){outcome.fileState='CANCELLED';task.fail(new Error('保存を中止しました'),true);return;}
    if(J.isUpstream(S.project)){
      if(!exportPlan.lines.length)throw Error('歌詞を読み込んでください');
      if(!Number.isFinite(exportPlan.duration)||exportPlan.duration<=0)throw Error('動画の長さを確認してください');
      S.exportCapabilities=await J.exportCapabilities(outputProject,S.project.includeAudio!==false?S.audio:null);
      if(!S.exportCapabilities.webCodecs&&!S.exportCapabilities.recorder)throw Error('H.264/AAC書き出しに対応していません');
      outcome.creativeState='NOT_APPLICABLE';
    }else{
    let fixes=0,report=null,retainConfirmedPlan=false;
    const confirmed=S.confirmedCinemaPlan,V=J.cinemaV3;
    if(!socialHook&&V?.enabled&&confirmed?.plan===exportPlan&&confirmed.pixelQA===S.pixelQA&&confirmed.pixelQA?.completed&&confirmed.pixelQAPlan===exportPlan&&confirmed.rangeKey===J.canonicalJSON(range)){const input=await V.snapshot(outputProject,S.audio,exportPlan,range);retainConfirmedPlan=!!confirmed.renderState&&confirmed.renderState===V.qaRenderState(outputProject,exportPlan,range)&&input.inputHash===confirmed.inputHash&&J.canonicalJSON(audioLike())===confirmed.analysisKey&&await V.planHash(exportPlan)===confirmed.planHash;}
    outcome.initialConfirmedPlanReused=retainConfirmedPlan;
    let capabilitiesKey=null;
    const refreshCapabilities=async()=>{const key=JSON.stringify([outputProject.aspect,outputProject.res,outputProject.fps,outputProject.quality,outputProject.exportSettings,outputProject.includeAudio]);if(key===capabilitiesKey)return;S.exportCapabilities=await J.exportCapabilities(outputProject,S.project.includeAudio!==false?S.audio:null).catch(()=>({webCodecs:false,h264:false,aac:false,recorder:null}));capabilitiesKey=key;};
    for(let pass=0;pass<3;pass++){
      outputProject=socialHook?{...S.project,aspect:'9:16'}:S.project;
      const pre=pass===0&&retainConfirmedPlan?{fixes:0,plan:exportPlan}:J.preflightMV(outputProject,S.audio,range,makeOutputPlan);
      fixes+=pre.fixes;exportPlan=pre.plan;
      if(socialHook)S.socialPlan=exportPlan;else S.plan=exportPlan;
      if(pre.fixes){syncUI();replan();}
      await refreshCapabilities();
      if(!(pass===0&&retainConfirmedPlan))S.pixelQA=await J.analyzeRenderedFrames(exportPlan,range,S.audio,{onProgress:auditDetail});
      report=J.checkMVQuality(outputProject,exportPlan,S.audio,range,S.pixelQA,S.exportCapabilities,null);
      const repaired=J.fixMVQuality(S.project,report,S.audio);fixes+=repaired;
      if(!repaired)break;
      S.pixelQA=null;
      syncUI();replan();
      if(pass===2){outputProject=socialHook?{...S.project,aspect:'9:16'}:S.project;exportPlan=makeOutputPlan();S.pixelQA=null;}
    }
    await refreshCapabilities();
    if(!S.pixelQA?.completed)S.pixelQA=await J.analyzeRenderedFrames(exportPlan,range,S.audio,{onProgress:auditDetail});
    await J.preparePhotoExport({plan:exportPlan,project:outputProject,audio:S.audio,range,signal:ac.signal,onProgress:(_p,label)=>auditDetail({label})});S.pixelQA=exportPlan.lastPixelQA||S.pixelQA;
    report=J.checkMVQuality(outputProject,exportPlan,S.audio,range,S.pixelQA,S.exportCapabilities,null);S.lastQuality=report;
    if(socialHook)S.socialPlan=exportPlan;else S.plan=exportPlan;
    updateStudioQuality(fixes);
    outcome.creativeState=J.creativeExportState(report.quality.targetAcceptance);
    if(!report.ready){outcome.fileState='FAILED_TECHNICAL';$('studioQuality').textContent=(report.exportErrors||report.errors).map(i=>i.message).join(' / ');task.fail(new Error($('studioQuality').textContent));return;}
    }
    }catch(error){outcome.fileState=ac.signal.aborted?'CANCELLED':'FAILED_TECHNICAL';task.fail(error,ac.signal.aborted);
      if(ac.signal.aborted){$('studioQuality').textContent='書き出し前の検査を中止しました';return;}
      $('studioQuality').textContent='書き出し前の確認に失敗しました：'+error.message;
      console.error('JIZURA preflight failed',error);return;
    }finally{showMsg(null);exportPreflightBusy=false;syncDirectionUI();}
  }
  S.exporting = ac;syncDirectionUI();
  // The shared processing panel is the sole progress surface.
  let exportMessage='';
  const setText=m=>{exportMessage=m;task.observe(null,null,m);};
  const txt={set textContent(m){exportMessage=m;},get textContent(){return exportMessage;}};
  EXP_BTNS.forEach(id => { $(id).disabled = true; });$('studioExport').disabled=true;
  const onProgress=(p,m,stage={})=>{
    const id=stage.stage||(/音声/.test(m)?'audio':/検査|検証/.test(m)?'verify':/まとめ/.test(m)?'mux':'frames');
    for(const skipped of stage.skip||[])task.skip(skipped);
    if(stage.label){const current=task.state.stages.find(s=>s.id===id);if(current)current.label=stage.label;}
    outcome.fileState=id==='verify'?'VERIFYING':id==='fonts'?'PREPARING':'ENCODING';
    task.enter(id);task.update(stage.indeterminate?null:stage.current,stage.indeterminate?null:stage.total,m+(Number.isFinite(stage.encoded)?' · エンコード済み '+stage.encoded+'フレーム':''));
  };
  const t0 = performance.now();
  let wake=null;
  try {
    try{wake=await navigator.wakeLock?.request('screen')||null;}catch(e){}
    task.enter('fonts');await J.processingYield();
    await J.ensureFonts(S.project.lyrics + (S.project.title || '') + (S.project.artist || '') + HUD_CHARS, J.fontsOfPlan(exportPlan));
    if (kind === 'mp4') {
      const args={plan:exportPlan,project:outputProject,audio:S.project.includeAudio!==false?S.audio:null,range,quality:S.project.quality||'high',cinemaV3:J.cinemaV3?.enabled===true,refinementMode:S.project.exportSettings?.refinementMode==='quality'?'quality':'fast',onProgress,signal:ac.signal};
      const caps=S.exportCapabilities||await J.exportCapabilities(outputProject,args.audio);
      const r=await J.exportWithRetries(args,caps);
      outcome.creativeState=J.isUpstream(S.project)?'NOT_APPLICABLE':J.creativeExportState(r.provenance?.machineRefinement?.acceptance||r.provenance?.qualityTarget);
      outcome.fileState='SAVE_AVAILABLE';
      const qualified=['TARGET_MET','NOT_APPLICABLE'].includes(outcome.creativeState);
      txt.textContent = `MP4生成完了 ${(r.blob.size / 1048576).toFixed(1)}MB・${r.codec}${r.audio ? ' + ' + r.audio.toUpperCase() : ''}・${((performance.now() - t0) / 1000).toFixed(0)}秒`;
      $('studioQuality').textContent=`${r.validation.certification?.passed?'EXPORT VERIFIED':'MP4コンテナ検査済み'}：${r.validation.videoCodec.toUpperCase()}映像 / ${r.validation.audioCodec?.toUpperCase()||'音声なし'}音声 / ${r.validation.duration.toFixed(1)}秒`;
      S.exportValidation=r.validation;updateStudioQuality();
      if(typeof File!=='undefined'&&navigator.share){
        const file=new File([r.blob],baseName()+'.mp4',{type:'video/mp4'});
        if(!navigator.canShare||navigator.canShare({files:[file]})){S.lastExport=file;$('studioShare').hidden=false;}
      }
      task.enter('file');task.state.cancel=null;const res = await J.saveFile(baseName() + '.mp4', r.blob,{destination:saveHandle});
      outcome.fileState=res==='declined'?'CANCELLED':res==='saved'?'SAVED':'SAVE_AVAILABLE';
      if(res!=='declined'&&r.sidecar){try{const qa=JSON.parse(await r.sidecar.text());qa.creativeState=outcome.creativeState;qa.outputOutcome={...outcome};await J.saveFile(baseName()+'.mp4.kamen-qa.json',new Blob([JSON.stringify(qa,null,2)],{type:'application/json'}),{automatic:false});}catch(qaError){console.warn('KAMEN QA save failed',qaError);toast('MP4は生成・検証済みです。QAファイルの保存に失敗しました。');}}
      if(res==='declined'){txt.textContent+='（保存はキャンセルされました）';task.fail(new Error('MP4は生成・検証済みですが、ファイル保存を中止しました'),true);}
      else task.complete((res==='saved'?'MP4を生成・検証し、保存しました':'MP4を生成しました。保存リンクを用意しました')+(qualified?'':'。演出品質には改善の余地があります。'));
    } else {
      const blob = await J.exportPNGZip({ plan: exportPlan, project: outputProject,range, transparent: kind === 'pnga', onProgress, signal: ac.signal });
      txt.textContent = `完成 ${(blob.size / 1048576).toFixed(1)}MB`;
      task.enter('file');const saved=await J.saveFile(baseName() + (kind === 'pnga' ? '_alpha' : '') + '_png.zip', blob);if(saved==='declined')task.fail(new Error('ファイル保存を中止しました'),true);else task.complete('PNGのZIPファイルを作成しました');
    }
  } catch (e) {
    const raw=String(e?.message||e),message=ac.signal.aborted?'書き出しを中止しました':
      /memory|allocation|quota|resource/i.test(raw)?'端末の空きメモリが足りません。短い区間か別の端末でお試しください。':
      /NotSupported|codec|encoder|MediaRecorder/i.test(raw)?'この端末ではMP4を書き出せませんでした。別のブラウザでお試しください。':
      /[ぁ-んァ-ヶ一-龠]/u.test(raw)?raw:'動画の書き出しに失敗しました。もう一度お試しください。';
    outcome.fileState=ac.signal.aborted?'CANCELLED':'FAILED_TECHNICAL';S.lastExportError={message:raw,stage:task.state.stages[task.state.index]?.id||outcome.fileState,settings:{...J.resolveExportSettings(S.project),aspect:S.project.aspect,res:S.project.res,fps:S.project.fps},attempts:e.attempts||[],browser:navigator.userAgent,time:new Date().toISOString()};task.fail(new Error(message+'（詳細：'+raw+'）'),ac.signal.aborted);txt.textContent = message;$('studioQuality').textContent=message+'（詳細：'+raw+'）';
    console.error('JIZURA export failed',e);
  } finally {
    S.exporting = null; S.need = true;
    try{await wake?.release();}catch(e){}
    EXP_BTNS.forEach(id => { $(id).disabled = false; });
    syncDirectionUI();codecNote();
  }
}

/* ---------------- tap sync ---------------- */
function startTap() {
  if (!S.plan.lines.length || !S.audio || S.audioLoading || S.exporting || directionBusy) { toast('歌詞と音源を読み込んでから同期してください。'); return; }
  remember();
  S.range=null; S.rangeMode=null; S.socialPlan=null; replan();
  let opts={rate:1,count:false};try{opts={...opts,...JSON.parse(localStorage.getItem('jizura.tapOpts')||'{}')};}catch{}
  S.tap = { i: 0,rate:[1,.75,.5].includes(opts.rate)?opts.rate:1,counting:!!opts.count, project:S.project, lyrics:S.project.lyrics, audio:S.audio, changes: [] };
  if (!S.project.timing.lineTimes) S.project.timing.lineTimes = {};
  $('tapPanel').hidden = false; $('btnTap').setAttribute('aria-pressed', 'true');
  $('tapRate').value=String(S.tap.rate);$('tapCount').checked=!!opts.count;
  seek(0);updateTap();$('tapBtn').focus();syncDirectionUI();
  const session=S.tap;
  if(opts.count){pause();let n=3;const tick=()=>{if(S.tap!==session)return;if(n){$('tapLine').textContent=String(n--);session.timer=setTimeout(tick,1000);}else{session.counting=false;play();updateTap();}};tick();}else play();
}
function tapNow() {
  if (!S.tap || S.tap.counting || !S.playing || !S.audio) return;
  if(S.tap.project!==S.project || S.tap.lyrics!==S.project.lyrics || S.tap.audio!==S.audio){pause(); stopTap(); toast('素材が変更されたため同期を終了しました。歌詞と音源を確認してください。'); return;}
  const time = Math.max(0, Math.min(S.audio.duration, AP.time()));
  if (S.tap.i && time < S.project.timing.lineTimes[S.tap.i - 1]) { toast('前の行より前の時刻です。「1行戻す」でやり直してください。'); return; }
  const i=S.tap.i;
  S.tap.changes.push({i, value:S.project.timing.lineTimes[i]});
  S.project.timing.lineTimes[i] = Math.min(+time.toFixed(3),Math.floor(S.audio.duration*1000)/1000); S.tap.i++;
  S.t=time; replan();
  if (S.tap.i >= S.plan.lines.length) { pause(); stopTap(); toast('全行の同期が完了しました。LRCを書き出せます。'); } else updateTap();
}
function tapCut(){
 if(!S.tap||S.tap.counting||!S.playing||S.tap.i<1)return;
 const li=S.tap.i-1,cuts=S.plan.cuts.filter(c=>c.line===li),ct={...S.project.overrides[li]?.cutTime},index=Object.keys(ct).length+1;
 if(index>=cuts.length)return;
 S.tap.changes.push({cut:true,i:li,index,value:ct[index]});ct[index]=Math.max(0,AP.time()-S.plan.lines[li].start);setOv(li,{cutTime:ct});replan();
}
function undoTap() {
  if (!S.tap?.changes.length) return;
  if(S.tap.changes.at(-1).cut){const change=S.tap.changes.pop(),ct={...S.project.overrides[change.i]?.cutTime};if(change.value==null)delete ct[change.index];else ct[change.index]=change.value;setOv(change.i,{cutTime:ct});replan();updateTap();return;}
  const {i,value}=S.tap.changes.pop();
  if(value==null)delete S.project.timing.lineTimes[i];else S.project.timing.lineTimes[i]=value;
  S.tap.i=i; replan(); seek(Math.max(0,(i?S.project.timing.lineTimes[i-1]:0)-1)); updateTap();
}
function stopTap() { if(!S.tap)return;clearTimeout(S.tap.timer);const playing=S.playing;pause();S.tap = null;if(playing)play(); $('tapPanel').hidden = true; $('btnTap').setAttribute('aria-pressed', 'false'); replan(); commit(); flushSave(); syncDirectionUI(); }
function updateTap() { const ln = S.plan.lines[S.tap.i]; $('tapLine').textContent = ln ? `${S.tap.i + 1} / ${S.plan.lines.length}　${ln.text}` : '—';$('tapUndo').disabled=!S.tap.changes.length; }
async function exportLRC() {
  if(S.tap){toast('タップ同期を終了してから書き出してください。');return;}
  try { const text=J.exportLRC(S.project,audioLike()); const result=await J.saveFile(baseName()+'.lrc',new Blob([text],{type:'text/plain;charset=utf-8'})); toast(result==='declined'?'LRC保存を中止しました':'LRCファイルを作成しました。'); }
  catch(error){ console.error('KAMEN LRC export',error);toast(error.message); }
}

/* ---------------- sync all inputs from project ---------------- */
function syncUI() {
  if($('upstreamTheme'))$('upstreamTheme').value=S.project.themeId||'';
  document.querySelectorAll('[data-upstream-key]').forEach(el=>{el.checked=!!(el.dataset.upstreamFx?S.project.fx[el.dataset.upstreamKey]:S.project[el.dataset.upstreamKey]);});
  $('songTitle').value = S.project.title || ''; $('songArtist').value = S.project.artist || '';

  $('lyrics').value = S.project.lyrics;
  $('bpm').value = S.project.timing.bpm > 0 ? S.project.timing.bpm : '';
  $('bpm').placeholder = S.audio ? `自動 ${S.audio.bpm}` : 'なし';
  $('offset').value = S.project.timing.offset ?? 0.4;
  $('lineScale').value = S.project.timing.lineScale ?? 1;
  $('snap').checked = !!S.project.timing.snap;
  document.querySelectorAll('.wa-toggle').forEach(el => { el.checked = S.project.wa !== false; });
  document.querySelectorAll('.extra-toggle').forEach(el => { el.checked = S.project.extra === true; });
  renderFontRoles(); renderColors(); renderFx(); renderTech(); syncOut();syncStudioExportControls(); drawStyleGrid(); syncSocialCopy();
  syncDirectionUI();
}

/* ---------------- wiring ---------------- */
function bind() {
  for(const type of ['input','change','click'])$('app').addEventListener(type,()=>queueMicrotask(()=>autosave()));
  $('lyrics').addEventListener('input', e => { S.project.lyrics = e.target.value; $('studioLrcName').textContent=e.target.value.trim()?'歌詞を入力済み':'LRC / TXTを選択'; delete $('directionStatus').dataset.result; syncDirectionUI(); replanSoon(260); });
  let lrcLoad=0;
  $('lrcFile').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const task=J.processing.begin('歌詞ファイルを読み込んでいます',[['read','歌詞ファイルを読み込んでいます',2],['lyrics','歌詞とタイムスタンプを確認しています',6],['apply','歌詞を反映・保存しています',2]],{retry:()=>document.getElementById('lrcFile').click()});task.enter('read');
    try {
      if (!/\.(lrc|txt)$/i.test(f.name) || f.size > 2 * 1024 * 1024) throw new Error('2MB以下の .lrc / .txt ファイルを選んでください');
      const project=S.project,request=++lrcLoad;
      const text=await f.text();task.enter('lyrics');await J.processingYield();const imported=J.importLyricsFile(text,f.name);
      if(project!==S.project||request!==lrcLoad){task.fail(new Error('別のプロジェクトに切り替わりました'),true);return;}task.enter('apply');
      remember();
      pause(); S.project.lyrics = imported.lyrics; invalidateGeneratedMV();
      S.range=null;S.highlights=[];
      S.project.timing.lineTimes = {}; S.project.timing.lrcShift=0; S.project.overrides = {};
      if (!S.project.title && imported.title) S.project.title = imported.title;
      if (!S.project.artist && imported.artist) S.project.artist = imported.artist;
      $('lrcStatus').textContent = `${f.name} · ${imported.count}行 · ${imported.timed?'時刻を反映しました':'時刻は自動配置です。タップ同期で調整できます'}`;
      $('studioLrcName').textContent=f.name;
      delete $('directionStatus').dataset.result; syncUI(); replan();if(!await flushSave())throw new Error('歌詞は反映しましたが、保存完了を確認できませんでした。プロジェクト保存でバックアップしてください');task.complete(imported.count+'行の歌詞を反映しました'+(imported.timed?'':'。時刻はタップ同期で調整できます'));
    } catch (err) {task.fail(err);
      const detail=err.message||'歌詞を読み込めませんでした';
      $('lrcStatus').textContent=detail;
      syncDirectionUI();
      $('studioLrcName').textContent=J.parseLyrics(S.project.lyrics).lines.length?'読込失敗・前の歌詞を使用中':'歌詞を読み込めませんでした';
      $('directionStatus').textContent=detail;
    }
    e.target.value = '';
  });
  $('songTitle').addEventListener('input', e => { S.project.title = e.target.value; syncSocialCopy(); replanSoon(300); });
  $('songArtist').addEventListener('input', e => { S.project.artist = e.target.value; replanSoon(300); });

  $('btnSyntax').addEventListener('click', e => { const s = $('syntax'); s.hidden = !s.hidden; e.target.setAttribute('aria-expanded', String(!s.hidden)); });
  $('bpm').addEventListener('change', e => { const value=parseFloat(e.target.value)||0;S.project.timing.bpm=value>0?J.clamp(value,45,240):0;e.target.value=S.project.timing.bpm?String(S.project.timing.bpm):'';replan(); });
  $('offset').addEventListener('change', e => { S.project.timing.offset = Math.max(0, parseFloat(e.target.value) || 0); replan(); });
  $('lineScale').addEventListener('change', e => { S.project.timing.lineScale = J.clamp(parseFloat(e.target.value) || 1, 0.3, 4); replan(); });
  $('snap').addEventListener('change', e => { S.project.timing.snap = e.target.checked; replan(); });
  $('btnResetTimes').addEventListener('click', () => { S.project.timing.lineTimes = {}; replan(); });
  document.querySelectorAll('#timingNudge [data-shift]').forEach(b=>b.addEventListener('click',()=>{
    const delta=Number(b.dataset.shift), parsed=J.parseLyrics(S.project.lyrics);
    if(parsed.lines.length && parsed.lines.every(l=>l.lrc!=null)){
      S.project.timing.lrcShift=+((S.project.timing.lrcShift||0)+delta).toFixed(2);
      for(const [i,time] of Object.entries(S.project.timing.lineTimes))S.project.timing.lineTimes[i]=Math.max(0,+(time+delta).toFixed(2));
    } else S.project.timing.lineTimes=Object.fromEntries(S.plan.lines.map((l,i)=>[i,Math.max(0,+(l.start+delta).toFixed(2))]));
    replan();flushSave();
  }));
  $('audioFile').addEventListener('change', e => { const f = e.target.files && e.target.files[0]; if (f) loadAudioFile(f); });
  $('btnAutoDirection').addEventListener('click', generateRandomDraft);

  $('btnTap').addEventListener('click', () => (S.tap ? stopTap() : startTap()));
  $('tapBtn').addEventListener('click', tapNow);
  const saveTapOptions=()=>{try{localStorage.setItem('jizura.tapOpts',JSON.stringify({rate:+$('tapRate').value,count:$('tapCount').checked}));}catch{}};
  $('tapRate').addEventListener('change',()=>{if(S.tap){const time=S.playing?AP.time():S.t;pause();S.tap.rate=+$('tapRate').value;seek(time);if(!S.tap.counting)play();}saveTapOptions();});
  $('tapCount').addEventListener('change',saveTapOptions);
  $('tapUndo').addEventListener('click', undoTap);
  $('btnLRC').addEventListener('click', exportLRC);
  $('tapStop').addEventListener('click', () => { pause(); stopTap(); });
  $('btnPlay').addEventListener('click', () => (S.playing ? pause() : play()));
  $('btnLoop').addEventListener('click', e => { S.loop = !S.loop; e.target.setAttribute('aria-pressed', String(S.loop)); });
  $('btnShuffle').addEventListener('click', () => { remember(); S.project.seed = (Math.random() * 1e9) | 0; $('seed').value = S.project.seed; replan(); commit(); });
  const sc = $('scrub');
  sc.addEventListener('input', () => { S.scrubbing = true; seek(sc.value / 10000 * S.plan.duration); });
  sc.addEventListener('change', () => { S.scrubbing = false; });
  const tl = $('timeline');
  tl.tabIndex=0;
  tl.addEventListener('pointerdown',e=>{
    tl.focus();tl.setPointerCapture(e.pointerId);const rect=tl.getBoundingClientRect(),win=timelineWindow(),px=(e.clientX-rect.left)*tl.width/Math.max(1,rect.width),dpr=tl.width/Math.max(1,rect.width);
    const line=e.offsetY<30?nearestLineMarker(px,win,tl.width,dpr):-1;
    if(e.shiftKey||e.button===1){S.timelineDragging={type:'pan',pointerId:e.pointerId,startX:e.clientX,startStart:S.timelineStart};return;}
    if(line>=0){selectedTimelineLine(line);S.timelineDragging={type:'line',pointerId:e.pointerId,index:line,moved:false};return;}
    S.timelineDragging={type:'seek',pointerId:e.pointerId};timelineSeek(e);
  });
  tl.addEventListener('pointermove',e=>{
    const drag=S.timelineDragging;if(!drag||drag.pointerId!==e.pointerId)return;
    if(drag.type==='seek')timelineSeek(e);
    else if(drag.type==='line'){drag.moved=true;setLineTime(drag.index,timelineTimeAt(e.clientX));}
    else if(drag.type==='pan'){const rect=tl.getBoundingClientRect(),win=timelineWindow();S.timelineStart=J.clamp(drag.startStart-(e.clientX-drag.startX)/Math.max(1,rect.width)*win.span,0,Math.max(0,win.duration-win.span));drawTimeline();}
  });
  const finishTimelineDrag=e=>{const drag=S.timelineDragging;if(!drag||e.pointerId!==drag.pointerId)return;S.timelineDragging=null;if(drag.type==='line'&&drag.moved)setLineTime(drag.index,timelineTimeAt(e.clientX),true);};
  tl.addEventListener('pointerup',finishTimelineDrag);tl.addEventListener('pointercancel',finishTimelineDrag);
  tl.addEventListener('wheel',e=>{
    if(e.ctrlKey||e.metaKey){e.preventDefault();zoomTimeline(e.deltaY<0?1.2:1/1.2,timelineTimeAt(e.clientX));}
    else if(e.shiftKey||Math.abs(e.deltaX)>Math.abs(e.deltaY)){e.preventDefault();const win=timelineWindow();S.timelineStart=J.clamp(S.timelineStart+(e.deltaX||e.deltaY)/Math.max(1,tl.clientWidth)*win.span,0,Math.max(0,win.duration-win.span));drawTimeline();}
  },{passive:false});
  $('timelineZoomIn').addEventListener('click',()=>zoomTimeline(1.5));
  $('timelineZoomOut').addEventListener('click',()=>zoomTimeline(1/1.5));
  $('timelineFit').addEventListener('click',()=>{S.timelineZoom=1;S.timelineStart=0;drawTimeline();});
  document.querySelectorAll('[data-line-nudge]').forEach(button=>button.addEventListener('click',()=>nudgeSelectedLine(Number(button.dataset.lineNudge))));
  document.querySelectorAll('.tabs button').forEach(b => b.addEventListener('click', () => {
    document.querySelectorAll('.tabs button').forEach(x => x.setAttribute('aria-selected', String(x === b)));
    document.querySelectorAll('.tabpane').forEach(p => { p.hidden = p.dataset.pane !== b.dataset.tab; });
    if (b.dataset.tab === 'out') codecNote();
    loadThumbFonts();
  }));
  $('fxFlash').addEventListener('change', e => { markImageLookModified(); S.project.fx.flash = e.target.checked; replan(); });
  $('techFilter').addEventListener('input', () => renderTech());
  const setSwitch = (cls, key, on, msgOn, msgOff) => document.querySelectorAll('.' + cls).forEach(el => el.addEventListener('change', e => {
    remember();
    markImageLookModified();
    S.project[key] = e.target.checked;
    document.querySelectorAll('.' + cls).forEach(x => { x.checked = e.target.checked; });
    renderTech(); drawStyleGrid(); replan(); commit(); flushSave();
    toast(e.target.checked ? msgOn : msgOff);
  }));
  setSwitch('extra-toggle', 'extra', true, '追加分の演出：使う', '追加分の演出：使わない（最初の公開版の演出だけ）');
  setSwitch('wa-toggle', 'wa', true, '和風の演出：使う', '和風の演出：使わない（おまかせ・シャッフルで選ばれません）');
  $('fxKoma').addEventListener('change', e => { markImageLookModified(); const k = +e.target.value; S.project.fx.koma = k; S.project.fx.onTwos = k > 0; S.project.mood = null; replan(); });
  $('fxHud').addEventListener('change', e => { markImageLookModified(); S.project.fx.hud = e.target.value; replan(); });
  $('seed').addEventListener('change', e => { S.project.seed = parseInt(e.target.value, 10) || 0; replan(); });
  $('btnSeed').addEventListener('click', () => { S.project.seed = (Math.random() * 1e9) | 0; $('seed').value = S.project.seed; replan(); });
  const colorToggle = (flag, keys) => e => {
    remember();
    const c = S.project.colors; c[flag] = e.target.checked;
    if (S.project.autoPalette && S.project.autoPalette.analyzed) S.project.autoPalette.userModified = true;
    if (c[flag]) { const sc0 = editorStyles()[S.project.style].schemes[0]; keys.forEach(([k]) => { if (!c[k]) c[k] = sc0[k]; }); }
    renderColors(); replan(); commit();
  };
  $('colorOn').addEventListener('change', colorToggle('enabled', BASE_KEYS));
  $('accentOn').addEventListener('change', colorToggle('accentOn', ACCENT_KEYS));
  $('btnRandPalette').addEventListener('click', randomPalette);
  $('btnAddFont').addEventListener('click', () => {
    const name = $('localFont').value.trim(); if (!name) return;
    const key = 'local_' + name.replace(/\s+/g, '_');
    const weight = /bold|太|black|heavy|w[6-9]|[6-9]00/i.test(name) ? 700 : 400;
    J.addUserFont(key, name + '（PC）', name, weight);
    S.project.userFonts = (S.project.userFonts || []).filter(u => u.key !== key).concat([{ key, label: name + '（PC）', family: name, weight }]);
    S.project.fonts.display = key; $('localFont').value = '';
    fontKey = ''; renderFontRoles(); replan();
  });
  $('fontFile').addEventListener('change', async e => {
    const f = e.target.files && e.target.files[0]; if (!f) return;
    const task=J.processing.begin('フォントを読み込んでいます',[['font','フォントを読み込み・検証しています',8],['save','フォントと編集内容を保存しています',2]],{retry:()=>document.getElementById('fontFile').click()});task.enter('font');
    try {
      const project=S.project;
      const key = await J.loadFontFile(f);if(project!==S.project){task.fail(new Error('別のプロジェクトに切り替わりました'),true);return;}
      const face=J.FONTS[key], family=String(face.family).replace(/^"|"$/g,'');
      const meta={key,label:f.name.replace(/\.[^.]+$/,''),family,weight:face.weight||400,assetKey:key,mime:uploadedFontMime(f)};
      S.project.userFonts=(S.project.userFonts||[]).filter(item=>item.key!==key).concat([meta]);
      task.enter('save');
      S.project.fonts.display = key; fontKey = ''; renderFontRoles(); replan();
      // Font bytes and the reference commit together through the workspace CAS.
      if(!await flushSave())throw new Error('フォントは反映しましたが、保存完了を確認できませんでした。プロジェクト保存でバックアップしてください。');
      task.complete('フォントを読み込みました');
    }
    catch (err) {task.fail(err);showMsg(err.message||'フォントを読み込めませんでした'); setTimeout(() => showMsg(null), 2500); }
    finally { e.target.value=''; }
  });
  ['outAspect', 'eAspect'].forEach(id => $(id).addEventListener('change', e => { S.project.aspect = e.target.value; refreshLocalPaletteMap(); syncOut(); replan(); codecNote(); }));
  ['outRes', 'eRes'].forEach(id => $(id).addEventListener('change', e => { S.project.res = +e.target.value; syncOut(); autosave(); codecNote(); }));
  ['outFps', 'eFps'].forEach(id => $(id).addEventListener('change', e => { S.project.fps = +e.target.value; syncOut(); replan(); codecNote(); }));
  $('outQuality').addEventListener('change', e => { S.project.quality = e.target.value; autosave(); });
  ['outKey', 'eKey'].forEach(id => $(id).addEventListener('change', e => {
    const mode = e.target.value;
    S.project.keyBg = mode === 'green' || mode === 'black' ? mode : 'off';
    S.project.customBg.enabled = mode === 'custom';
    syncOut(); replan(); flushSave();
    const k = J.keyMode(S.project);
    toast(k ? `背景：${k === 'green' ? 'グリーンバック' : 'ブラックバック'}（白い文字と演出だけ）` : mode === 'custom' ? '背景：カスタム画像' : '背景：通常（スタイルの配色）');
  }));
  document.querySelectorAll('[data-bg-file]').forEach(input=>input.addEventListener('change',async e=>{const files=Array.from(e.target.files||[]);if(files.length)await importVisualAssets(files);e.target.value='';}));
  document.querySelectorAll('[data-bg-setting]').forEach(input => {
    const apply = e => {
      const setting = e.target.dataset.bgSetting;
      const raw = e.target.value;
      S.project.customBg[setting] = setting === 'fit' ? raw : setting === 'zoom' ? (+raw / 100) : setting === 'darkness' ? (+raw / 100) : +raw;
      if (setting === 'darkness' && S.project.autoPalette) S.project.autoPalette.darknessManual = true;
      refreshLocalPaletteMap();
      if (S.plan) S.plan.customBg = Object.assign({}, S.project.customBg);
      syncOut(); S.need = true; autosave(); scheduleHistoryObserve();
    };
    input.addEventListener(input.type === 'range' ? 'input' : 'change', apply);
  });
  document.querySelectorAll('[data-bg-action="reset"]').forEach(button => button.addEventListener('click', () => {
    S.project.customBg = Object.assign({}, S.project.customBg, { fit: 'cover', x: 50, y: 50, zoom: 1, darkness: 0.2, blur: 0 });
    if (S.project.autoPalette) S.project.autoPalette.darknessManual = true;
    refreshLocalPaletteMap();
    if (S.plan) S.plan.customBg = Object.assign({}, S.project.customBg);
    syncOut(); S.need = true; autosave(); scheduleHistoryObserve();
  }));
  document.querySelectorAll('[data-bg-action="clear"]').forEach(button => button.addEventListener('click', async () => {
    remember();
    await S.renderer.loadCustomBackground('');
    J.invalidateAutoPalette(S.project);
    // Preserve archived multi-image assets when clearing the active background.
    S.project.customBg = Object.assign({}, S.project.customBg, { enabled: false, dataUrl: '', filename: '' });
    S.project.keyBg = 'off'; invalidateGeneratedMV(); syncOut(); replan(); commit(); flushSave();
  }));
  $('outAudio').addEventListener('change', e => { S.project.includeAudio = e.target.checked; autosave(); });
  $('btnMP4').addEventListener('click', () => runExport('mp4'));
  $('btnPNG').addEventListener('click', () => runExport('png'));
  $('btnPNGA').addEventListener('click', () => runExport('pnga'));
  $('eMP4').addEventListener('click', () => runExport('mp4'));
  // かんたんモード
  $('modeEasy').addEventListener('click', () => setMode('easy'));
  $('modePro').addEventListener('click', () => setMode('pro'));
  $('btnOmakase').addEventListener('click', omakase);
  $('btnOmakaseBig').addEventListener('click', omakase);
  ['btnPrev', 'btnPrev2'].forEach(id => $(id).addEventListener('click', () => histGo(-1)));
  ['btnNext', 'btnNext2'].forEach(id => $(id).addEventListener('click', () => histGo(1)));
  $('eStyle').addEventListener('click', () => rerollPart('style'));
  $('eMood').addEventListener('click', () => rerollPart('mood'));
  $('eCut').addEventListener('click', () => rerollPart('cut'));
  $('ePalette').addEventListener('click', () => { randomPalette(); restartPreview(); });
  const help=$('helpDlg');$('btnHelp').addEventListener('click',()=>{if(help.showModal){if(!help.open)help.showModal();}else help.setAttribute('open','');});
  help.addEventListener('click',e=>{if(e.target===help)help.close?.();});
  // 利用について（出力物の権利・ライセンス）
  const dlg = $('termsDlg');
  const openTerms = () => { if (dlg.showModal) { if (!dlg.open) dlg.showModal(); } else dlg.setAttribute('open', ''); };
  document.querySelectorAll('.terms-open').forEach(b => b.addEventListener('click', openTerms));
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close ? dlg.close() : dlg.removeAttribute('open'); });   // click on the backdrop
  $('btnSave').addEventListener('click', async () => {
    const button=$('btnSave');if(button.disabled)return;button.disabled=true;button.textContent='保存準備中…';
    const task=J.processing.begin('プロジェクトの保存ファイルを作成しています',[['json','プロジェクトとフォント素材をまとめています',8],['file','保存ファイルを作成しています',2]],{retry:()=>button.click()});task.enter('json');await J.processingYield();
    try {const json=await portableProjectJSON();task.enter('file');const result=await J.saveFile(baseName()+'.kamen.json',json);if(result==='declined')task.fail(new Error('ファイル保存を中止しました'),true);else task.complete('保存ファイルを作成しました。ダウンロード完了を確認してください');toast(result==='declined'?'ファイル保存を中止しました':'保存ファイルを作成しました。ダウンロード完了を確認し、音源も別途保管してください。');}
    catch(err){task.fail(err);console.error('JIZURA project export failed',err);toast('プロジェクトを保存できません。空き容量とダウンロード許可を確認して再試行してください。');}
    finally{button.disabled=false;button.textContent='プロジェクト保存';}
  });

  let projectLoadBusy=false;
  $('fileProject').addEventListener('change', async e => {
    const f=e.target.files&&e.target.files[0];if(!f||projectLoadBusy||S.exporting||exportPreflightBusy)return;
    if(S.audioLoading||visualBusy||directionBusy){toast('素材の読み込み・解析が終わってからプロジェクトを開いてください。');e.target.value='';return;}
    const task=J.processing.begin('プロジェクトを読み込んでいます',[['project','プロジェクトファイルを読み込んでいます',5],['fonts','フォントを復元しています',10],['images','背景画像・追加素材を復元しています',25],['restore','編集状態を復元しています',55],['preview','プレビューを準備しています',5]],{retry:()=>document.getElementById('fileProject').click()});
    task.enter('project');
    projectLoadBusy=true;S.projectLoading=true;syncDirectionUI();e.target.disabled=true;showMsg('プロジェクト・素材を読み込み中…');
    try {
      const rawProject=JSON.parse(await f.text());
      const project = mergeProject(rawProject);
      task.enter('fonts');await restorePortableFonts(project);task.enter('images');await J.processingYield();
      try {
        if (project.customBg.dataUrl) { await S.renderer.loadAssetDeck?.({assetDeck:J.validateAssetDeck(project.proAssets)});
        const image=await S.renderer.loadCustomBackground(project.customBg.dataUrl); validatePaletteSource(project, image); }
        else { await S.renderer.loadCustomBackground(''); J.invalidateAutoPalette(project); }
      } catch (err) {throw new Error('背景画像を復元できませんでした。別のバックアップを選んでください。');}
      S.audioLoad++;S.audioLoading=false;S.audioPendingName='';S.audioNotice='';project.audioAsset=null;
      S.generationNotice=null;localRecoveryBlocked=false; // A successful explicit import replaces the local project; retained media are not deleted.
      task.enter('restore');rememberWorkspace(crypto.randomUUID());S.workspaceForkOrigin=null;S.persistenceRevision=0;S.project = project; S.audio = null;S.currentAudioFile=null;S.pendingAudioFile=null; $('audioName').textContent = '曲なし（曲を読み込むと拍を検出します）';
      delete $('directionStatus').dataset.result; resetHistory(); syncUI(); replan();await flushSave();task.enter('preview');syncStudioResultVisibility();S.need=true;task.complete('プロジェクトを読み込みました。音源は別途選択してください');
    }
    catch(err){task.fail(err);console.error('JIZURA project import failed',err);toast('プロジェクトを開けません。JSON形式と画像・フォントを確認し、別のバックアップで再試行してください。');await S.renderer.loadAssetDeck?.(S.plan).catch(()=>{});if(S.project.customBg?.dataUrl)await S.renderer.loadCustomBackground(S.project.customBg.dataUrl).catch(()=>{});}
    finally{projectLoadBusy=false;S.projectLoading=false;e.target.disabled=false;e.target.value='';showMsg(null);syncDirectionUI();}
  });
  document.addEventListener('keydown', e => {
    if(e.target?.closest?.('.processing-panel'))return;
    const tag = (e.target && e.target.tagName) || '';
    const typing = /INPUT|TEXTAREA|SELECT/.test(tag) && e.target.type !== 'range' && e.target.type !== 'checkbox';
    if (S.tap && (e.code === 'Space' || e.code === 'Enter') && !typing) { e.preventDefault(); if(!e.repeat)tapNow(); return; }
    if (S.tap && e.code === 'Escape') { pause(); stopTap(); return; }
    if(typing||$('termsDlg').open||$('helpDlg').open||S.exporting||exportPreflightBusy||S.projectLoading||directionBusy||visualBusy)return;
    if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'){e.preventDefault();histGo(e.shiftKey?1:-1);return;}
    if (e.code === 'Space') { e.preventDefault(); S.playing ? pause() : play(); }
    else if (e.code === 'ArrowRight' && S.selectedLine>=0 && e.altKey) nudgeSelectedLine(e.shiftKey ? .01 : .1);
    else if (e.code === 'ArrowLeft' && S.selectedLine>=0 && e.altKey) nudgeSelectedLine(e.shiftKey?-.01:-.1);
    else if (e.code === 'ArrowRight') seek(S.t + (e.shiftKey ? .01 : .1));
    else if (e.code === 'ArrowLeft') seek(S.t - (e.shiftKey ? .01 : .1));
    else if (e.code === 'Home') seek(S.range?.start??0);
    else if (e.code === 'End') seek(S.range?.end??S.plan.duration);
    else if (e.code === 'Delete' && S.selectedLine>=0) { if(S.project.timing.lineTimes)delete S.project.timing.lineTimes[S.selectedLine];replan();flushSave();selectedTimelineLine(S.selectedLine); }
    else if (e.code === 'KeyR' && !e.metaKey && !e.ctrlKey && !e.altKey && !S.exporting) { e.preventDefault(); omakase(); }
  });
  window.addEventListener('resize', () => { sizeViewport(); drawTimeline(); });
  if (window.ResizeObserver) new ResizeObserver(() => { sizeViewport(); drawTimeline(); }).observe($('viewport'));
}

function audioSummary(audio) {
  const confidence=Number(audio.tempoConfidence??audio.features?.tempoConfidence)||0;
  const tempo=audio.bpm?`約${audio.bpm} BPM${confidence>0?` · 拍推定 ${Math.round(confidence*100)}%`:''}`:'拍を推定できませんでした';
  return `${audio.name}（${J.fmtTime(audio.duration)}・${tempo}）`;
}

/* song file -> beat analysis (file input, or a host such as the After Effects panel) */
async function loadAudioFile(f) {
  const project=S.project,request=++S.audioLoad;
  const cancel=new AbortController();
  const task=J.processing.begin('音源を解析しています',J.audioProgressStages,{retry:()=>loadAudioFile(f),cancel:()=>cancel.abort()});
  S.audioLoading=true;S.audioPendingName=f.name||'';S.audioNotice='';
  delete $('directionStatus').dataset.result;
  $('audioName').textContent = '解析中…';
  syncDirectionUI();
  try {
    pause();
    const analyzed=await J.analyzeAudio(f,{onProgress:J.audioProgressEvent(task),onStage:message=>{if(project===S.project&&request===S.audioLoad){$('audioName').textContent=message+' · '+(f.name||'音源');$('studioAudioName').textContent=message;}},signal:{get aborted(){return cancel.signal.aborted||project!==S.project||request!==S.audioLoad;}}});
    if(project!==S.project||request!==S.audioLoad){task.fail(new Error('音源解析を中止しました'),true);return false;}
    S.audio=analyzed;S.currentAudioFile=f;
    invalidateGeneratedMV();resetHistory();
    $('audioName').textContent = audioSummary(S.audio);
    S.project.timing.snap = true;
    delete $('directionStatus').dataset.result; syncUI(); replan();
    task.state.cancel=null;task.enter('save');await J.processingYield();
    // A large file or an unavailable IndexedDB does not prevent this session's MV creation.
    if(f.size<=120*1024*1024){S.pendingAudioFile=f;S.project.audioAsset=J.audioAssetInfo(f);}
    else{S.pendingAudioFile=null;S.project.audioAsset=null;S.audioNotice='音源は読み込みました。ファイルが大きいため、次回はもう一度選択してください。';}
    const saved=await flushSave();if(!saved)task.fail(new Error('音源は解析しましたが、プロジェクトの保存完了を確認できませんでした'));else task.complete(S.audioNotice||'音源の解析が完了しました');return true;
  } catch (err) { task.fail(err,cancel.signal.aborted||request!==S.audioLoad);console.error('JIZURA audio import failed',err);if(project===S.project&&request===S.audioLoad){
      S.audioNotice=S.audio?`音源を読み込めませんでした。前の曲「${S.audio.name}」を使用中です。`:'音源を読み込めませんでした。対応形式を確認してください。';
      $('audioName').textContent=S.audio?`${S.audio.name}（前の曲を使用中）`:S.audioNotice;
    } return false; }
  finally{$('audioFile').value='';if(request===S.audioLoad){S.audioLoading=false;S.audioPendingName='';syncDirectionUI();}}
}

async function restoreAudioFile(){
  const project=S.project,info=project.audioAsset,request=++S.audioLoad;
  if(!info)return;
  const task=J.processing.begin('保存した音源を復元しています',J.audioProgressStages,{retry:restoreAudioFile});
  S.audioLoading=true;S.audioPendingName=info.name||'';S.audioNotice='';syncDirectionUI();
  $('audioName').textContent='音源を復元中…';
  try{
    task.enter('read');const snapshot=S.localAudioSnapshot;const file=J.audioAssetMatches(info,snapshot?.file)?snapshot.file:await bgDbGet('audio');
    if(!J.audioAssetMatches(info,file))throw new Error('保存された音源を見つけられませんでした');
    const audio=await J.analyzeAudio(file,{onProgress:J.audioProgressEvent(task)});
    if(project!==S.project||request!==S.audioLoad){task.fail(new Error('別のプロジェクトに切り替わりました'),true);return;}
    S.audio=audio;S.currentAudioFile=file;$('audioName').textContent=audioSummary(audio);
    syncUI();replan();updateStudioQuality();task.skip('save');task.complete('保存した音源の復元が完了しました');
  }catch(e){task.fail(e);if(project===S.project&&request===S.audioLoad){S.audioNotice='前回の音源を復元できませんでした。保存済みデータは保持しています。曲を選び直してください。';$('audioName').textContent=S.audioNotice;}}
  finally{if(request===S.audioLoad){S.audioLoading=false;S.audioPendingName='';syncDirectionUI();}}
}

let visualBusy=false;
function invalidateVisualDirection(){const automatic=S.project.autoDirection;invalidateGeneratedMV();S.project.autoDirection=automatic;S.pixelQA=null;S.exportValidation=null;}
async function importVisualAssets(files){
 if(visualBusy||S.projectLoading||S.exporting||exportPreflightBusy||directionBusy||!files.length)return;
 const file=files[0];if(files.length>1)toast('背景は1枚です。先頭の画像を使用します');
 visualBusy=true;syncDirectionUI();showMsg('背景画像を読み込み中…');
 const task=J.processing.begin('背景画像を読み込んでいます',[['images','背景画像を読み込み・検証しています',80],['preview','背景プレビューを準備しています',15],['save','画像とプロジェクトを保存しています',5]],{retry:()=>document.querySelector('[data-bg-file]').click()});task.enter('images');
 try{
  await J.processingYield();if(file.size>25*1024*1024)throw Error('画像は1枚25MBまでです');
  // Prepare before changing the project: a rejected input leaves the previous background intact.
  const dataUrl=await prepareBackgroundFile(file);task.update(1,1,file.name);
  task.enter('preview');await J.processingYield();await S.renderer.loadCustomBackground(dataUrl);
  remember();S.project.customBg={...S.project.customBg,enabled:true,dataUrl,filename:file.name};
  // Legacy visualAssets/proAssets are retained in backups and IndexedDB, but never selected for rendering.
  S.project.keyBg='off';J.invalidateAutoPalette(S.project);invalidateVisualDirection();syncUI();replan();await S.renderer.loadAssetDeck(S.plan);commit();
  task.enter('save');if(!await flushSave())throw Error('画像は読み込みましたが、保存完了を確認できませんでした。プロジェクト保存でバックアップしてください');
  restartPreview();task.complete('背景画像を読み込みました');
 }catch(e){task.fail(e);toast(e.message);}finally{visualBusy=false;showMsg(null);syncDirectionUI();}
}
function refreshVisualAssetsUI(){} // Legacy call sites remain harmless during project restoration.
function mountVisualAssets(){
 document.querySelectorAll('[data-bg-file]').forEach(input=>{input.multiple=false;});
 const drop=document.querySelector('#studioImageSlot')?.closest('label');if(drop){drop.ondragover=e=>{e.preventDefault();drop.classList.add('drag-over');};drop.ondragleave=()=>drop.classList.remove('drag-over');drop.ondrop=async e=>{e.preventDefault();drop.classList.remove('drag-over');await importVisualAssets(Array.from(e.dataTransfer.files));};}
}

/* ---------------- boot ---------------- */
async function boot() {
  // Embedded hosts may load this bundle after DOMContentLoaded.
  await Promise.resolve();
  J.mountProcessingUI();
  const task=S.bootTask=J.processing.begin('前回のプロジェクトを読み込んでいます',[['project','保存したプロジェクト・素材・フォントを復元しています',50],['images','背景画像と追加素材を読み込んでいます',40],['preview','編集画面とプレビューを準備しています',10]],{retry:()=>location.reload()});
  task.enter('project');S.project = await loadLocal();task.enter('images');
  S.directionStats=S.project.autoPalette?.stats||null;
  if (S.project.customBg.dataUrl) {
    try { const image = await S.renderer.loadCustomBackground(S.project.customBg.dataUrl); validatePaletteSource(S.project, image); }
    catch(e){localRecoveryBlocked=true;console.error('JIZURA background decode failed',e);}
  } else if (S.project.autoPalette.analyzed) J.invalidateAutoPalette(S.project);
  bind(); syncUI(); replan();mountStudio();mountUpstreamControls();mountVisualAssets();await S.renderer.loadAssetDeck?.(S.plan);
  task.enter('preview');await J.processingYield();
  let savedMode='easy';try{const value=localStorage.getItem('jizura.mode');if(value==='easy'||value==='pro')savedMode=value;}catch(e){}
  setMode(savedMode); resetHistory();clearTimeout(saveTimer);observedProject=projectFingerprint();S.unsaved=!!S.persistenceError;
  // open on a representative frame (end of the first cut's entrance)
  const c0 = S.plan.cuts.find(c => c.line >= 0);
  if (c0) seek(c0.start + Math.min(c0.dur * 0.6, c0.inDur + 0.25));
  saveStatus(localRecoveryBlocked?'前回のデータを保全中 · 自動保存停止。バックアップから開き直してください。':S.unsaved?'未保存 · ブラウザに保存できませんでした。再読み込み前にプロジェクト保存でバックアップしてください。':S.recoveredLocal?'前回の保存中断から復元しました。プロジェクト保存でバックアップしてください。':'編集内容はこのブラウザに自動保存されます',localRecoveryBlocked||S.unsaved);
  requestAnimationFrame(tick);
  if(localRecoveryBlocked)task.fail(new Error('保存素材の一部を復元できません。保存済みデータを保全して自動保存を停止しています'));else task.complete('プロジェクトを読み込みました。保存音源がある場合は続けて解析します');
  if(S.project.audioAsset)requestAnimationFrame(()=>setTimeout(restoreAudioFile,0));
}
const workspaceLabel=document.createElement('label');workspaceLabel.className='workspace-picker';workspaceLabel.textContent='保存した作業 ';const workspaceSelect=document.createElement('select');workspaceSelect.id='localWorkspace';workspaceLabel.append(workspaceSelect);$('localSaveStatus').after(workspaceLabel);
workspaceSelect.onchange=async()=>{const id=workspaceSelect.value;if(id===S.workspaceId)return;if(S.exporting||directionBusy||S.audioLoading||S.projectLoading||S.tap){workspaceSelect.value=S.workspaceId;return;}if(S.unsaved&&!await flushSave()){workspaceSelect.value=S.workspaceId;return;}rememberWorkspace(id);location.reload();};
window.addEventListener('storage',e=>{if(e.key==='jizura.workspace.changed.v3')void refreshWorkspaces();});
const start=()=>boot().then(refreshWorkspaces).catch(error=>{S.bootTask?.fail(error);console.error('JIZURA startup failed',error);localRecoveryBlocked=true;showMsg('起動できませんでした。データを削除せずページを再読み込みしてください。解消しない場合はバックアップを保管してお問い合わせください。');saveStatus('起動に失敗しました。保存データは上書きしていません。',true);});
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
J.ui = S;
function mountUpstreamControls(){
const upstreamControls=document.createElement('div');upstreamControls.className='upstream-controls';
upstreamControls.innerHTML='<label>おまかせのテーマ <select id="upstreamTheme"><option value="">テーマなし</option></select></label>';
for(const [key,t] of Object.entries(J.THEMES||{})){const option=document.createElement('option');option.value=key;option.textContent=t.name||key;upstreamControls.querySelector('select').appendChild(option);}
upstreamControls.querySelector('select').value=S.project.themeId||'';
upstreamControls.querySelector('select').onchange=e=>{S.project.themeId=e.target.value||null;autosave();};
for(const [key,name] of [['typo','文字PV'],['kinetic','キネティック'],['horror','ホラー'],['unify','統一感'],['typeset','文字整列'],['centerFree','中央を空ける']]){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.dataset.upstreamKey=key;input.checked=!!S.project[key];input.onchange=()=>{S.project[key]=input.checked;replan();};label.append(input,document.createTextNode(name));upstreamControls.appendChild(label);}
for(const [key,name] of [['hideNo','飾りの数字を消す'],['hideTime','飾りの時刻を消す']]){const label=document.createElement('label'),input=document.createElement('input');input.type='checkbox';input.dataset.upstreamKey=key;input.dataset.upstreamFx='1';input.checked=!!S.project.fx[key];input.onchange=()=>{S.project.fx[key]=input.checked;replan();};label.append(input,document.createTextNode(name));upstreamControls.appendChild(label);}
const diagnostics=document.createElement('button');diagnostics.type='button';diagnostics.className='ghost small';diagnostics.textContent='書き出しエラーの詳細を保存';diagnostics.onclick=()=>{if(S.lastExportError)J.saveFile('kamen-export-error.json',JSON.stringify(S.lastExportError,null,2));else toast('記録された書き出しエラーはありません');};upstreamControls.appendChild(diagnostics);
$('btnAutoDirection').parentElement.appendChild(upstreamControls);
}
// hooks for hosts that embed the app (the After Effects CEP panel)
window.addEventListener('beforeunload',event=>{if(S.unsaved){event.preventDefault();event.returnValue='';}});
if($('localSaveStatus')){$('localSaveStatus').title='クリックして再保存';$('localSaveStatus').tabIndex=0;$('localSaveStatus').setAttribute('role','button');$('localSaveStatus').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();flushSave();}});$('localSaveStatus').addEventListener('click',()=>flushSave());}
J.uiApi = { runRandomWorkflowV16,mergeProject, portableProjectJSON, loadLocal, toast, startTap, tapNow, undoTap, stopTap, exportLRC, replan, syncUI, pause, seek, flushSave, loadAudioFile, restartPreview, generateRandomDraft, optimizeSelectedDraft, workflowStateV16 };
})();
