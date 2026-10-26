/* ============================================================
   JIZURA — fonts: catalogue, loading, glyph decomposition
   ============================================================ */
(() => {
'use strict';

const JP_SANS_FB = '"JIZURA Noto CJK JP","Noto Sans JP","Noto Sans CJK JP","Hiragino Sans","Yu Gothic","Meiryo",sans-serif';
const JP_SERIF_FB = '"Noto Serif JP","Noto Serif CJK JP","JIZURA Noto CJK JP","Hiragino Mincho ProN","Yu Mincho",serif';

/* role catalogue: key -> {label, family, weight, kind} */
J.FONTS = {
  embedded_bold: { label: 'Noto CJK JP（内蔵 Bold）', family: '"JIZURA Noto CJK JP"', weight: 700, kind: 'gothic', fb: JP_SANS_FB },
  gothic_black:  { label: 'Noto Sans JP Black',        family: '"Noto Sans JP"', weight: 900, kind: 'gothic', fb: JP_SANS_FB, gf: 'Noto+Sans+JP:wght@300;500;700;900' },
  gothic_bold:   { label: 'Noto Sans JP Bold',         family: '"Noto Sans JP"', weight: 700, kind: 'gothic', fb: JP_SANS_FB, gf: 'Noto+Sans+JP:wght@300;500;700;900' },
  gothic_med:    { label: 'Noto Sans JP Medium',       family: '"Noto Sans JP"', weight: 500, kind: 'gothic', fb: JP_SANS_FB, gf: 'Noto+Sans+JP:wght@300;500;700;900' },
  gothic_light:  { label: 'Noto Sans JP Light',        family: '"Noto Sans JP"', weight: 300, kind: 'gothic', fb: JP_SANS_FB, gf: 'Noto+Sans+JP:wght@300;500;700;900' },
  dela:          { label: 'Dela Gothic One',           family: '"Dela Gothic One"', weight: 400, kind: 'display', fb: JP_SANS_FB, gf: 'Dela+Gothic+One' },
  zenkaku:       { label: 'Zen Kaku Gothic New Black', family: '"Zen Kaku Gothic New"', weight: 900, kind: 'gothic', fb: JP_SANS_FB, gf: 'Zen+Kaku+Gothic+New:wght@900' },
  mincho_black:  { label: 'Zen Old Mincho Black',      family: '"Zen Old Mincho"', weight: 900, kind: 'mincho', fb: JP_SERIF_FB, gf: 'Zen+Old+Mincho:wght@900' },
  mincho_bold:   { label: 'Noto Serif JP Bold',        family: '"Noto Serif JP"', weight: 700, kind: 'mincho', fb: JP_SERIF_FB, gf: 'Noto+Serif+JP:wght@300;500;700' },
  mincho:        { label: 'Noto Serif JP Medium',      family: '"Noto Serif JP"', weight: 500, kind: 'mincho', fb: JP_SERIF_FB, gf: 'Noto+Serif+JP:wght@300;500;700' },
  mincho_light:  { label: 'Noto Serif JP Light',       family: '"Noto Serif JP"', weight: 300, kind: 'mincho', fb: JP_SERIF_FB, gf: 'Noto+Serif+JP:wght@300;500;700' },
  tokumin:       { label: 'Kaisei Tokumin',            family: '"Kaisei Tokumin"', weight: 800, kind: 'mincho', fb: JP_SERIF_FB, gf: 'Kaisei+Tokumin:wght@800' },
  round:         { label: 'M PLUS Rounded 1c',         family: '"M PLUS Rounded 1c"', weight: 800, kind: 'round', fb: JP_SANS_FB, gf: 'M+PLUS+Rounded+1c:wght@800' },
  pop:           { label: 'Mochiy Pop One',            family: '"Mochiy Pop One"', weight: 400, kind: 'display', fb: JP_SANS_FB, gf: 'Mochiy+Pop+One' },
  dot:           { label: 'DotGothic16',               family: '"DotGothic16"', weight: 400, kind: 'pixel', fb: JP_SANS_FB, gf: 'DotGothic16' },
  brush:         { label: 'Yuji Syuku',                family: '"Yuji Syuku"', weight: 400, kind: 'brush', fb: JP_SERIF_FB, gf: 'Yuji+Syuku' },
  mono:          { label: 'IBM Plex Mono',             family: '"IBM Plex Mono"', weight: 500, kind: 'mono', fb: '"IBM Plex Sans JP",' + JP_SANS_FB, gf: 'IBM+Plex+Mono:wght@500;600' },
  reggae:        { label: 'Reggae One',                family: '"Reggae One"', weight: 400, kind: 'display', fb: JP_SANS_FB, gf: 'Reggae+One' },
  rampart:       { label: 'Rampart One',               family: '"Rampart One"', weight: 400, kind: 'display', fb: JP_SANS_FB, gf: 'Rampart+One' },
  potta:         { label: 'Potta One',                 family: '"Potta One"', weight: 400, kind: 'brush', fb: JP_SANS_FB, gf: 'Potta+One' },
  kiwi:          { label: 'Kiwi Maru',                 family: '"Kiwi Maru"', weight: 500, kind: 'round', fb: JP_SANS_FB, gf: 'Kiwi+Maru:wght@500' },
  klee:          { label: 'Klee One',                  family: '"Klee One"', weight: 600, kind: 'hand', fb: JP_SERIF_FB, gf: 'Klee+One:wght@600' },
  shippori:      { label: 'Shippori Mincho B1',        family: '"Shippori Mincho B1"', weight: 800, kind: 'mincho', fb: JP_SERIF_FB, gf: 'Shippori+Mincho+B1:wght@800' },
  sansui:        { label: 'IBM Plex Sans JP',          family: '"IBM Plex Sans JP"', weight: 500, kind: 'gothic', fb: JP_SANS_FB, gf: 'IBM+Plex+Sans+JP:wght@400;500;700' },
};
J.GOOGLE_FONTS_URL = 'https://fonts.googleapis.com/css2?family=Dela+Gothic+One&family=Noto+Sans+JP:wght@300;500;700;900&family=Noto+Serif+JP:wght@300;500;700&family=Zen+Kaku+Gothic+New:wght@900&family=Zen+Old+Mincho:wght@900&family=Kaisei+Tokumin:wght@800&family=M+PLUS+Rounded+1c:wght@800&family=Mochiy+Pop+One&family=DotGothic16&family=Yuji+Syuku&family=IBM+Plex+Mono:wght@500;600&family=IBM+Plex+Sans+JP:wght@400;500;700&display=swap';

/* user fonts (local family names or uploaded files) */
J.addUserFont = (key, label, family, weight = 400, kind = 'custom') => {
  J.FONTS[key] = { label, family: `"${family.replace(/"/g, '')}"`, weight, kind, fb: JP_SANS_FB, user: true };
  J.glyphs.clear();
  J.metrics?.clear();
};
J.userFontBytes = new Map();
J.fontContentHash = async buffer => {
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  if (globalThis.crypto?.subtle) {
    try {
      const digest = new Uint8Array(await globalThis.crypto.subtle.digest('SHA-256', bytes));
      return [...digest].map(v=>v.toString(16).padStart(2,'0')).join('');
    } catch (e) { /* use the deterministic embedded-webview fallback below */ }
  }
  // Deterministic fallback for embedded webviews without SubtleCrypto.
  let a=2166136261; for(const b of bytes){a^=b;a=Math.imul(a,16777619);}
  return (a>>>0).toString(16).padStart(8,'0');
};
J.restoreUserFont = async (meta, buffer) => {
  if (!meta || !meta.key || !meta.family || !buffer) throw new Error('フォントデータがありません');
  const bytes = buffer instanceof ArrayBuffer ? buffer : buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
  const axis=J.fontCapabilities?.(meta.key)?.axes?.find(a=>a.tag==='wght');
  const face = new FontFace(meta.family, bytes, { weight: axis?`${axis.min} ${axis.max}`:String(meta.weight || 400) });
  await face.load(); document.fonts.add(face);
  J.addUserFont(meta.key, meta.label || meta.family, meta.family, meta.weight || 400, 'custom');
  J.FONTS[meta.key].loaded=true;J.userFontBytes.set(meta.key, bytes.slice(0));
  return meta.key;
};
J.loadFontFile = async file => {
  const buf = await file.arrayBuffer(), hash=await J.fontContentHash(buf);
  const fam = 'UF_' + hash.slice(0, 16), key = 'user_font_' + hash.slice(0, 20);
  await J.restoreUserFont({ key, label: file.name.replace(/\.[^.]+$/, ''), family: fam, weight: 400 }, buf);
  return key;
};

J.fontCSS = (key, px, verifiedWeight = null) => {
  const f = J.faceOf ? J.faceOf(key) : (J.FONTS[key] || J.FONTS.gothic_bold);   // per-language face (02b_lang.js)
  return `${verifiedWeight == null ? f.weight : Math.max(500,Math.min(850,verifiedWeight))} ${px.toFixed(2)}px ${f.family},${f.fb}`;
};

/* Google Fonts stylesheets are attached lazily, one family at a time, only for the faces a plan actually uses —
   adding faces to the catalogue therefore costs nothing until a style or setting picks them */
const cssJobs = new Map();
J.fontLoadEvidence = new Map();
const boundedFontWait=(promise,ms)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>resolve(null),ms);Promise.resolve(promise).then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});
const fontFaceState=fontSet=>[...fontSet].map(face=>[face.family,face.weight,face.style,face.stretch,face.status,face.unicodeRange||''].join('|')).sort().join('\n');
let lastFontConfigState=null;
function attachFamily(spec) {
  if (!spec || typeof document === 'undefined' || !document.head) return Promise.resolve();
  if (cssJobs.has(spec)) return cssJobs.get(spec);
  const job = new Promise(res => {
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = 'https://fonts.googleapis.com/css2?family=' + spec + '&display=swap';
    const done = () => res(); l.onload = done; l.onerror = done; setTimeout(done, 5000);
    document.head.appendChild(l);
  });
  cssJobs.set(spec, job);
  return job;
}
/* font keys a plan draws with: style roles, per-cut font params, mono for HUD */
J.fontsOfPlan = (plan) => {
  const set = new Set(['mono']);
  if (!plan) return [...set];
  for (const r of Object.values(plan.style.fonts || {})) for (const k of r) set.add(k);
  for (const c of plan.cuts || []) for (const v of Object.values(c.params || {})) {
    if (typeof v === 'string' && J.FONTS[v]) set.add(v);
    else if (Array.isArray(v)) v.forEach(x => { if (typeof x === 'string' && J.FONTS[x]) set.add(x); });
  }
  return [...set].filter(k => J.FONTS[k]);
};
/* make sure the glyphs we need are loaded (Google Fonts are unicode-range split). keys = null → every catalogue face */
J.ensureFonts = async (text, keys) => {
  if (!document.fonts || !document.fonts.load) return;
  const priorFontState=fontFaceState(document.fonts);
  const uniq = [...new Set([...text])].join('') || 'あ';
  const list = (keys || Object.keys(J.FONTS)).filter(k => J.FONTS[k]);
  // faces in the current lyric language (+ its fallback sans / serif), each with the weight it is drawn at
  const faces = list.map(k => (J.faceOf ? J.faceOf(k) : J.FONTS[k]));
  const fontConfigState=JSON.stringify(list.map((key,i)=>{const f=faces[i];return [key,f.family,f.weight,f.gf||'',f.kind||'',!!f.user];}));
  if (J.langBaseFaces) for (const b of J.langBaseFaces(list)) faces.push({ family: '"' + b.family + '"', weight: b.weight, gf: b.gf });
  await Promise.all([...new Set(faces.map(f => f.gf).filter(Boolean))].map(attachFamily));
  const jobs = [], seen = new Set();let complete=true;
  for (const f of faces) {
    const spec = `${f.weight} 64px ${f.family}`;
    if (seen.has(spec)) continue; seen.add(spec);
    jobs.push(boundedFontWait(document.fonts.load(spec, uniq),8000).then(loaded => {
      for (const key of list.filter(k => (J.faceOf ? J.faceOf(k) : J.FONTS[k]).family === f.family && (J.faceOf ? J.faceOf(k) : J.FONTS[k]).weight === f.weight))
        J.fontLoadEvidence.set(key, {status: loaded?.length ? "LOADED" : "REQUESTED_FACE_UNAVAILABLE", family: f.family, faces: loaded?.length || 0});
      if(!loaded?.length)complete=false;
      return loaded;
    }).catch(() => { complete=false;for (const key of list.filter(k => J.FONTS[k].family === f.family && J.FONTS[k].weight === f.weight)) J.fontLoadEvidence.set(key,{status:"LOAD_FAILED",family:f.family}); return null; }));
  }
  await Promise.all(jobs);
  if (document.fonts.ready) await boundedFontWait(document.fonts.ready,2000);
  if(!complete||priorFontState!==fontFaceState(document.fonts)||lastFontConfigState!==fontConfigState){
    J.glyphs.clear();
    J.metrics.clear();
  }
  lastFontConfigState=fontConfigState;
};

})();
