/* ============================================================
   JIZURA — planner: lyrics -> lines -> chunks -> timed cuts + events
   ============================================================ */
(() => {
'use strict';

J.SAMPLE_LYRICS = `夜明けの色を/覚えてる
ほどけた声が遠くで鳴った
ねえ、まだ間に合うかな
*透明*なままじゃ終われない!`;

J.defaultProject = () => ({
  version: 1,
  title: '', artist: '',
  lyrics: '',
  style: 'noir', mood: null,
  extra: false,                   // random picks may use the parts added after the first version (追加分)
  wa: true,                       // …and the 和風 motifs (提灯・障子・家紋…) — applied after 'extra'
  lang: 'ja',                     // 日本語歌詞版
  autoDirection: false,           // 音楽のセクション変化を行ごとの構成密度へ反映
  artDirection: null,
  proAssets: [],
  titleDisplay: { mode:'scene-aware', enabled: true, position: 'auto', opacity: 0.72, autoColor: true },
  keyBg: 'off',                   // 合成用の背景: 'off' | 'green' (グリーンバック) | 'black' (ブラックバック)
  customBg: { enabled: false, dataUrl: '', filename: '', fit: 'cover', x: 50, y: 50, zoom: 1, darkness: 0.2, blur: 0 },
  autoPalette: J.emptyAutoPalette ? J.emptyAutoPalette() : { enabled: false, analyzed: false, sourceHash: '', mood: null, palette: null, variants: [], suggestedDarkness: null, stats: null, localMap: null, viewportKey: '', userModified: false },
  seed: 20260922,
  aspect: '16:9', res: 1080, fps: 30, includeAudio:true,quality:'high',
  exportSettings:{preset:'auto',videoCodec:'auto',videoBitrate:0,audioBitrate:192000,range:'full',fileName:''},
  fx: { motion: 0.7, glitch: 0.55, chroma: 0.7, decor: 0.5, density: 0.55, texture: 0.6, flash: true, onTwos: true, koma: 12, hud: 'auto', bgSwitch: 0.35 },
  enabled: Object.fromEntries(J.GROUP_KEYS.map(g => [g, Object.fromEntries(J.order(g).map(k => [k, true]))])),
  timing: { bpm: 0, offset: 0.4, snap: true, tail: 0.9, lineTimes: {}, lineScale: 1 },
  overrides: {},
  colors: { enabled: false },
  fonts: {},
});

/* the original (After Effects-implemented) sets, captured before any expression pack registers */
J.CORE_ORDER = { layout: J.LAYOUT_ORDER.slice(), enter: J.ENTER_ORDER.slice(), exit: J.EXIT_ORDER.slice(), hold: J.HOLD_ORDER.slice(), decor: J.DECOR_ORDER.slice() };

/* animation step length: 'koma' = drawings per second on a 24fps timebase (12 = on twos, 8 = on threes, 0 = every output frame) */
J.komaOf = fx => (fx.koma != null ? +fx.koma : (fx.onTwos === false ? 0 : 12));
J.stepDur = (fx, fps) => { const k = J.komaOf(fx); return k > 0 ? 1 / k : 1 / (fps || 24); };

/* ---------------- lyric parsing ---------------- */
J.parseLyrics = (raw) => {
  const lines = []; const meta = {};
  let pendingGap = false;
  for (let src of String(raw || '').replace(/^\uFEFF/, '').replace(/\r/g, '').split('\n')) {
    const s0 = src.trim();
    if (!s0) { if (lines.length) pendingGap = true; continue; }
    if (s0.startsWith('#')) continue;
    const mm = s0.match(/^\[(ti|ar|al|au|by|offset|length|re|ve|la):(.*)\]$/i);
    if (mm) { meta[mm[1].toLowerCase()] = mm[2].trim(); continue; }
    let s = s0; const times = [];
    let m;
    while ((m = s.match(/^\[(\d+):([0-5]?\d)(?:[.:](\d{1,3}))?\]/))) {
      times.push(+m[1] * 60 + +m[2] + (m[3] ? +m[3] / Math.pow(10, m[3].length) : 0));
      s = s.slice(m[0].length);
    }
    const wordTimes=[];
    for(const word of s.matchAll(/<(\d+):([0-5]?\d)(?:[.:](\d{1,3}))?>([^<]+)/g)){
      wordTimes.push({start:+word[1]*60 + +word[2] + (word[3]?+word[3]/Math.pow(10,word[3].length):0),text:word[4]});
    }
    s = s.replace(/<\d+:[0-5]?\d(?:[.:]\d{1,3})?>/g, '').trim();
    let note = null;
    const bar = s.indexOf('|');
    if (bar >= 0) { note = s.slice(bar + 1).trim() || null; s = s.slice(0, bar).trim(); }
    let impact = false;
    if (/[!！]$/.test(s) && s.length > 1) { impact = true; s = s.slice(0, -1).trim(); }
    const emph = [];
    s = s.replace(/\*([^*]+)\*/g, (_, w) => { emph.push(w); return w; });
    let manual = null;
    if (s.includes('/')) {
      manual = s.split('/').map(x => x.trim()).filter(Boolean);
      const latin = manual.some(x => /[A-Za-z]/.test(x));
      s = manual.join(latin ? ' ' : '');
    }
    if (!s) continue;
    const base = { text: s, note, impact, emph, manual, gapBefore: pendingGap, wordTimes };
    pendingGap = false;
    if (times.length) times.forEach(t => lines.push(Object.assign({}, base, { lrc: t })));
    else lines.push(Object.assign({}, base, { lrc: null }));
  }
  const offset = Number(meta.offset);
  if (Number.isFinite(offset) && meta.offset != null) for (const line of lines) if (line.lrc != null){
    line.lrc=Math.max(0,line.lrc+offset/1000);
    line.wordTimes=line.wordTimes.map(w=>({...w,start:Math.max(0,w.start+offset/1000)}));
  }
  if (lines.some(l => l.lrc != null)) lines.sort((a, b) => (a.lrc ?? 1e9) - (b.lrc ?? 1e9));
  return { lines, meta };
};

/* Validate a standalone LRC before replacing the editor; retain original tags for save/restore. */
J.importLRC = raw => {
  const lyrics = String(raw || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  const parsed = J.parseLyrics(lyrics);
  if (!parsed.lines.length || parsed.lines.some(line => line.lrc == null)) throw new Error('時刻付きの歌詞が見つかりません。各行を [00:12.34]歌詞 の形式にしてください。');
  if (parsed.lines.some(line => !Number.isFinite(line.lrc))) throw new Error('LRCの時刻を読み取れませんでした');
  return { lyrics, title: parsed.meta.ti || '', artist: parsed.meta.ar || '', count: parsed.lines.length };
};

/* TXT may contain ordinary lyrics or the same timestamps as LRC. */
J.importLyricsFile = (raw, name='lyrics.lrc') => {
  if (/\.lrc$/i.test(name)) return {...J.importLRC(raw), timed:true};
  if (!/\.txt$/i.test(name)) throw new Error('LRCまたはTXTファイルを選んでください');
  const lyrics=String(raw||'').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
  const parsed=J.parseLyrics(lyrics);
  if (!parsed.lines.length) throw new Error('歌詞が見つかりません。本文のあるTXTファイルを選んでください');
  const timed=parsed.lines.every(line=>Number.isFinite(line.lrc));
  if (parsed.lines.some(line=>line.lrc!=null)&&!timed) throw new Error('時刻付きTXTは全行に時刻を付けてください。時刻なしTXTも読み込めます');
  return {lyrics,title:parsed.meta.ti||'',artist:parsed.meta.ar||'',count:parsed.lines.length,timed};
};

/* ---------------- chunking (bunsetsu-ish) ---------------- */
const segmenters = {};   // one per lyric language (J.segLocale: ja / zh-Hant / zh-Hans / ko)
const segmenterOf = () => {
  if (typeof Intl === 'undefined' || !Intl.Segmenter) return null;
  const loc = J.segLocale ? J.segLocale() : 'ja';
  if (!(loc in segmenters)) { try { segmenters[loc] = new Intl.Segmenter(loc, { granularity: 'word' }); } catch (e) { segmenters[loc] = null; } }
  return segmenters[loc];
};
const segType = s => {
  if (/^\s+$/.test(s)) return 'S';
  if ([...s].every(c => J.isPunct(c))) return 'P';
  if ([...s].some(c => J.isKanji(c))) return 'K';
  if ([...s].every(c => J.isHira(c) || c === 'ー')) return 'H';
  if ([...s].every(c => J.isKata(c) || c === 'ー')) return 'T';
  if (/[A-Za-z0-9]/.test(s)) return 'L';
  return 'O';
};
J.segments = (text) => {
  const segmenter = segmenterOf();
  if (segmenter) return [...segmenter.segment(text)].map(x => x.segment);
  const out = []; let cur = '', ct = '';
  for (const c of text) {
    const t = segType(c);
    if (cur && t !== ct && !(ct === 'K' && t === 'H')) { out.push(cur); cur = ''; }
    cur += c; ct = t;
  }
  if (cur) out.push(cur);
  return out;
};
J.chunkText = (text) => {
  const segs = J.segments(text);
  const chunks = []; let cur = null;
  const close = () => { if (cur && cur.s.trim()) chunks.push(cur.s.trim()); cur = null; };
  for (const sg of segs) {
    const t = segType(sg);
    if (t === 'S') { close(); continue; }
    if (t === 'P') { if (cur) cur.s += sg; else if (chunks.length) chunks[chunks.length - 1] += sg; else cur = { s: sg, k: 'P', hasH: false }; continue; }
    if (!cur) { cur = { s: sg, k: t, hasH: t === 'H' }; continue; }
    if (t === 'H') {
      const len = [...sg].length;
      if (len <= 3 || (cur.k !== 'H' && !cur.hasH) || (cur.k === 'H' && [...cur.s].length + len <= 4)) { cur.s += sg; cur.hasH = true; continue; }
      close(); cur = { s: sg, k: 'H', hasH: true }; continue;
    }
    if (t === 'K' && cur.k === 'K' && !cur.hasH && [...(cur.s + sg)].length <= 6) { cur.s += sg; continue; }
    if (t === 'T' && cur.k === 'T') { cur.s += sg; continue; }
    if (t === 'L' && cur.k === 'L') { cur.s += sg; continue; }
    close(); cur = { s: sg, k: t, hasH: t === 'H' };
  }
  close();
  // split very long chunks, merge lonely single kana
  const out = [];
  for (const c of chunks) {
    const n = [...c].length;
    if (n > 10) { J.splitLines(c, Math.ceil(n / Math.ceil(n / 8))).split('\n').forEach(x => out.push(x)); }
    else out.push(c);
  }
  for (let i = out.length - 1; i > 0; i--) {
    if ([...out[i]].length === 1 && !J.isKanji(out[i])) { out[i - 1] += out[i]; out.splice(i, 1); }
  }
  return out.length ? out : [text];
};

/* ---------------- timing ---------------- */
J.computeTiming = (project, parsed, audio) => {
  const T = project.timing || {};
  const lines = parsed.lines;
  const beat = T.bpm > 0 ? 60 / T.bpm : 0;
  const starts = [];
  const allLrc = lines.length && lines.every(l => l.lrc != null);
  let t = T.offset ?? 0.4;
  lines.forEach((l, i) => {
    const man = T.lineTimes && T.lineTimes[i] != null ? +T.lineTimes[i] : null;
    let s;
    if (man != null && isFinite(man)) s = man;
    else if (allLrc) s = Math.max(0,l.lrc + (Number.isFinite(T.lrcShift)?T.lrcShift:0));
    else {
      if (i > 0) {
        const n = [...lines[i - 1].text].length;
        let d = J.clamp(0.8 + n * 0.17, 1.3, 5.2) * (T.lineScale || 1);
        if (beat) d = Math.max(2, Math.round(d / beat)) * beat;
        s = starts[i - 1] + d + (l.gapBefore ? (beat ? beat * 2 : 0.8) : 0);
      } else s = t;
    }
    starts.push(s);
  });
  const ends = starts.map((s, i) => {
    if (i < starts.length - 1) return Math.max(s + 0.35, starts[i + 1]);
    const n = [...lines[i].text].length;
    let d = J.clamp(0.8 + n * 0.17, 1.5, 5.2) * (T.lineScale || 1);
    if (beat) d = Math.max(2, Math.round(d / beat)) * beat;
    return s + d;
  });
  let duration = (ends.length ? ends[ends.length - 1] : 3) + (T.tail ?? 0.9);
  if (audio && audio.duration && T.useAudioLength !== false) duration = Math.max(audio.duration, ends.length ? ends[ends.length - 1] + 0.2 : 1);
  return { starts, ends, duration };
};

/* ---------------- planning ---------------- */
const wkey = (obj, k, d = 1) => (obj && obj[k] != null ? obj[k] : d);

J.plan = (project, audio) => {
  const st = J.resolveStyle(project);
  const fx = Object.assign({}, J.defaultProject().fx, project.fx || {});
  const parsed = J.parseLyrics(project.lyrics);
  if(project.autoDirection && project.artDirection?.visualDNA?.type==='PLAYER_CHANT')for(const line of parsed.lines){
    const name=line.text.match(/(?:フォルツァ|がんばれ|ガンバレ)([\p{Script=Han}]{2,4})|([\p{Script=Han}]{2,4})(?:アレー|アレ|ー)/u);
    const word=name?.[1]||name?.[2];if(word && !line.emph.includes(word))line.emph.push(word);
  }
  const title = project.title || '';
  const artist = project.artist || '';
  const tm = J.computeTiming(project, parsed, audio);
  const [W, H] = J.designSize(project.aspect);
  // enabled map: anything not explicitly switched off is on (new pack entries appear enabled in old projects);
  // then the 追加分 / 和風 switches decide what random picks may use (a per-line override still works)
  const en = {};
  for (const g of J.GROUP_KEYS) { en[g] = {}; const src = (project.enabled || {})[g] || {}; for (const k of J.order(g)) en[g][k] = src[k] !== false && (!J.randomOk || J.randomOk(project, g, k)); }
  const direction = project.autoDirection && project.artDirection && J.validArtDirection && J.validArtDirection(project.artDirection, project) ? project.artDirection : null;
  const lyricPlacement=direction&&J.selectLyricPlacement?J.selectLyricPlacement(project,W,H):null;
  const plan = {
    version: 1, generator: 'JIZURA', title, artist, W, H, fps: project.fps || 24,
    duration: tm.duration, styleKey: project.style, style: st, fx, seed: project.seed, practice: !!project.practice,
    hasTimedLyrics: parsed.lines.length>0&&parsed.lines.every(l=>l.lrc!=null),
    lines: [], cuts: [], events: [], beats: audio && audio.beats ? audio.beats.slice() : [],
    hud: fx.hud === 'on' ? true : fx.hud === 'off' ? false : !!st.hud,
    keyBg: J.keyMode ? J.keyMode(project) : null,   // 'green' | 'black' | null — 合成用の背景
    customBg: Object.assign({}, J.defaultProject().customBg, project.customBg || {}),
    autoPalette: J.normalizeAutoPalette ? J.normalizeAutoPalette(project.autoPalette) : Object.assign({}, J.defaultProject().autoPalette, project.autoPalette || {}),
    lang: J.resolveLang ? J.resolveLang(project) : 'ja',   // 歌詞の言語 (auto → detected)
    artDirection: direction,
    lyricPlacement,
    titleDisplay: J.planTitleDisplay ? J.planTitleDisplay(project, project.title || '', project.artist || '', st, W, H, direction,lyricPlacement) : null,
  };
  if (J.setLang) J.setLang(plan.lang);                     // chunking + measuring below use this language
  const beats = plan.beats;
  const snap = (t) => {
    if (!beats.length || !(project.timing && project.timing.snap)) return t;
    let lo = 0, hi = beats.length - 1;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (beats[mid] < t) lo = mid + 1; else hi = mid; }
    let best = t, bd = 0.13;
    for (const k of [lo - 1, lo]) if (k >= 0 && k < beats.length && Math.abs(beats[k] - t) < bd) { bd = Math.abs(beats[k] - t); best = beats[k]; }
    return best;
  };
  const history = [], bgHistory = [], fxHistory = [];
  let schemeIdx = 0;
  const nSchemes = st.schemes.length;
  const eventCounts = new Map();
  const addEvent = (t, type, amp, dur) => {
    if (direction) {
      const section = J.directionSection(direction, t);
      const index = direction.sectionProfiles.indexOf(section), count = eventCounts.get(index) || 0;
      if (!section || count >= (section.majorEvent ? 3 : section.intensity > .58 ? 1 : 0)) return;
      eventCounts.set(index, count + 1);
    }
    plan.events.push({ t, type, amp, dur });
  };

  // Intro breathing room: the subtle persistent title credit replaces a separate title card.

  const phraseCounts=new Map();
  parsed.lines.forEach((ln, li) => {
    const s = tm.starts[li], e = tm.ends[li];
    const phraseKey=ln.text.replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase(),repetitionIndex=phraseCounts.get(phraseKey)||0;
    phraseCounts.set(phraseKey,repetitionIndex+1);
    const samePhrase=li>0&&phraseKey===parsed.lines[li-1].text.replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase()&&s-tm.ends[li-1]<.55;
    const section = direction && J.directionSection(direction, s);
    const intensity = section ? section.intensity : 0.5;
    const lineFx = section ? Object.assign({}, fx, {
      density: J.clamp(fx.density * (0.55 + 0.73 * intensity), 0.12, 0.82),
      motion: J.clamp(fx.motion * (0.35 + 0.87 * intensity), 0.08, 0.93),
      decor: J.clamp(fx.decor * (0.2 + 0.98 * intensity), 0.01, 0.85),
      glitch: J.clamp(fx.glitch * (0.16 + 1.1 * intensity), 0, 0.78),
      bgSwitch: 0,
    }) : fx;
    const ov = (project.overrides || {})[li] || {};
    const lineSeed = ov.lock && ov.lockedSeed != null ? ov.lockedSeed : J.h(project.seed, li + 1, ov.seed | 0);
    const rng = J.rng(lineSeed);
    const n = [...ln.text.replace(/\s+/g, '')].length;
    const visEnd = Math.min(e, s + Math.max(3.6, n * 0.5 + 1.2));
    const D = visEnd - s;
    plan.lines.push({ index: li, text: ln.text, start: s, end: e, visEnd, note: ln.note, impact: ln.impact, emph: ln.emph,repeated:repetitionIndex>0,repetitionIndex,
      wordTimes:ln.wordTimes.map(w=>({...w,start:w.start+(s-(ln.lrc??s))})),chunks: null, seed: lineSeed });
    const chunks = ln.manual || J.chunkText(ln.text);
    plan.lines[li].chunks = chunks;
    let lineDensity = lineFx.density;
    if (project.autoDirection && audio && audio.energy && audio.energyRate && audio.energy.length) {
      const from = Math.max(0, Math.floor(s * audio.energyRate)), to = Math.min(audio.energy.length, Math.ceil(Math.min(e, s + 4) * audio.energyRate));
      let sum = 0; for (let j = from; j < to; j++) sum += audio.energy[j];
      if (to > from) lineDensity = J.clamp(lineFx.density * (0.80 + 0.35 * sum / (to - from)), 0.15, 0.9);
    }
    const L = J.lerp(1.3, 0.5, lineDensity);
    let nC = Math.round(D / L);
    const maxC = chunks.length + (chunks.length >= 2 && D > 2.0 ? 1 : 0);
    nC = J.clamp(nC, 1, Math.max(1, maxC));
    if(direction && /CHANT|TEAM_CALL/.test(direction.visualDNA?.type||''))nC=1;
    if (ov.single) nC = 1;
    // groups of chunks
    let groups;
    const nG = Math.min(nC, chunks.length);
    if (nG <= 1) groups = [ln.text];
    else groups = partition(chunks, nG).map(g => g.join(/[A-Za-z]/.test(g.join('')) ? ' ' : ''));
    const recap = nC > groups.length && groups.length >= 2;
    const units = groups.map(g => ({ text: g, w: [...g].length + 1.6 }));
    if (recap) units.push({ text: ln.text, w: (units.reduce((a, u) => a + u.w, 0) / units.length) * 1.25, recap: true });
    const tot = units.reduce((a, u) => a + u.w, 0);
    let acc = s; const bounds = [s];
    units.forEach((u, k) => { acc += D * u.w / tot; bounds.push(k === units.length - 1 ? visEnd : acc); });
    for (let k = 1; k < bounds.length - 1; k++) bounds[k] = J.clamp(snap(bounds[k]), bounds[k - 1] + 0.22, bounds[k + 1] - 0.22);
    // scheme per line
    if (!direction && nSchemes > 1 && li > 0 && rng.chance(fx.bgSwitch * (ln.impact ? 1.8 : 1))) schemeIdx = (schemeIdx + 1 + rng.int(0, nSchemes - 2)) % nSchemes;
    const emphLine = ln.impact || ln.emph.length > 0;
    // background graphic: chosen per line, occasionally re-rolled per cut
    let lineBg = ov.bg && J.BG[ov.bg] ? ov.bg : pickBg(rng, st, en, lineFx, bgHistory);
    bgHistory.push(lineBg);
    let lineBgP = J.BG[lineBg] && J.BG[lineBg].plan ? J.BG[lineBg].plan(rng, st) : {};
    units.forEach((u, k) => {
      const cs = bounds[k], ce = bounds[k + 1], dur = ce - cs;
      const txt = u.text;
      const nn = [...txt.replace(/\s+/g, '')].length;
      const emph = ln.impact && (k === 0 || u.recap) || ln.emph.some(w => txt.includes(w));
      const layout = ov.layout && J.LAYOUTS[ov.layout] ? ov.layout : pickLayout(rng, st, en, nn, dur, history, emph, u.recap, H > W);
      let enter = ov.enter && J.ENTER[ov.enter] ? ov.enter : pickEnter(rng, st, en, layout, dur, history, emph, nn);
      let exit = ov.exit && J.EXIT[ov.exit] ? ov.exit : pickExit(rng, st, en, layout, dur, k === units.length - 1, history);
      const hold = ov.hold && J.HOLD[ov.hold] ? ov.hold : pickHold(rng, en, lineFx, history);
      let inDur = J.clamp(dur * 0.36, 0.12, 0.6);
      if (enter === 'type') inDur = J.clamp(nn * 0.055 + 0.1, 0.15, dur * 0.65);
      if (enter === 'assemble') inDur = J.clamp(dur * 0.45, 0.22, 0.75);
      if (J.ENTER[enter] && J.ENTER[enter].inDur) inDur = J.ENTER[enter].inDur(dur, nn);
      if (enter === 'cut') inDur = 0.12;
      let outDur = exit === 'cut' ? 0 : J.clamp(dur * 0.3, 0.14, 0.55);
      if (['explode', 'fall', 'drift'].includes(exit)) outDur = J.clamp(dur * 0.38, 0.25, 0.7);
      if (J.EXIT[exit] && J.EXIT[exit].outDur) outDur = J.EXIT[exit].outDur(dur, nn);
      if (inDur + outDur > dur * 0.92) { const f = dur * 0.92 / (inDur + outDur); inDur *= f; outDur *= f; }
      let sch = schemeIdx;
      if (!direction && nSchemes > 1 && k > 0 && rng.chance(0.12 * fx.bgSwitch)) sch = (schemeIdx + 1) % nSchemes;
      const LD = J.LAYOUTS[layout];
      const params = LD.plan(rng, { text: txt, n: nn, W, H, dur }, st);
      if(direction && (layout==='center'||layout==='type')){
        params.font=direction.typography.display;
        params.intensityScale=J.clamp(.93+(intensity||0)*.18,.93,1.11);
        if(layout==='center')Object.assign(params,{sx:1,track:.035,sub:false,under:false,accent:false,
          ox:(plan.lyricPlacement?.x??.5)-.5,oy:(plan.lyricPlacement?.y??.5)-.5,maxWidth:plan.lyricPlacement?.maxWidth??.76});
        else Object.assign(params,{align:plan.lyricPlacement?.x<.4?'left':'center',prompt:false});
      }
      if (direction?.visualDNA?.spatialBias === 'right' && layout === 'gloss') params.side = 'right';
      if (direction?.visualDNA?.spatialBias === 'left' && layout === 'gloss') params.side = 'left';
      if (direction?.visualDNA?.spatialBias !== 'balanced' && direction?.visualDNA?.spatialBias !== 'center' && layout === 'type') params.align = 'left';
      const decor = Array.isArray(ov.decor) ? ov.decor.filter(id => J.DECOR[id]).map(id => decorParams(rng, id)) : pickDecor(rng, st, en, lineFx, layout, history);
      const treat = ov.treat && J.TREAT[ov.treat] ? ov.treat : pickTreat(rng, st, en, lineFx, LD, emph, history);
      const treatP = J.TREAT[treat].plan ? J.TREAT[treat].plan(rng, st) : {};
      if (!direction && !ov.bg && k > 0 && rng.chance(0.18 * fx.bgSwitch + 0.04)) { lineBg = pickBg(rng, st, en, fx, bgHistory); lineBgP = J.BG[lineBg].plan ? J.BG[lineBg].plan(rng, st) : {}; }
      const bg = LD.busy && !(J.BG[lineBg] && J.BG[lineBg].subtle) ? 'none' : lineBg;
      const cam = ov.cam && J.CAMERA[ov.cam] ? ov.cam : pickCam(rng, st, en, lineFx, LD, emph, history);
      const camP = J.CAMERA[cam].plan ? J.CAMERA[cam].plan(rng, st) : {};
      // cut-to-cut transition (replaces the previous cut's exit and this cut's entrance)
      const prevCut = plan.cuts[plan.cuts.length - 1];
      let trans = null, transP = {}, transDur = 0;
      const canTrans = prevCut && Math.abs(prevCut.end - cs) < 0.06 && prevCut.layout !== 'interlude' && dur > 0.5;
      if (canTrans) {
        trans = ov.trans && J.TRANS[ov.trans] ? ov.trans : pickTrans(rng, st, en, lineFx, emph, history);
        if (trans) {
          const TD = J.TRANS[trans];
          transDur = J.clamp(TD.dur || 0.35, 0.12, Math.min(0.6, dur * 0.45));
          transP = TD.plan ? TD.plan(rng, st) : {};
          enter = 'cut'; inDur = 0.12;
          prevCut.exit = 'cut'; prevCut.outDur = 0;
        }
      }
      if(direction?.motionDNA){
        const md=direction.motionDNA,sectionEnergy=J.motionEnergyAt(direction,cs);
        inDur=Math.min(dur*.36,md.transitionDuration*(1.16-sectionEnergy*.25));
        outDur=md.exitMotion==='cut'?0:Math.min(dur*.25,md.transitionDuration*.65);
        if(repetitionIndex>0){
          const development=Math.min(3,repetitionIndex)/3*(md.repetitionStrength||.5);
          inDur*=1-.16*development;
        }
      }
      const cut = makeCut({ text: txt, lineText: ln.text, note: ln.note, line: li, start: cs, end: ce, layout, enter, exit, hold, inDur, outDur, params, decor, scheme: sch, seed: J.h(lineSeed, k, 17), emph,repeated:repetitionIndex>0&&k===0,repetitionIndex, recap: !!u.recap, words: J.chunkText(txt), stagger: rng.range(0.025, 0.06),
        treat, treatP, bg, bgP: bg === lineBg ? lineBgP : {}, cam, camP, trans, transP, transDur });
      plan.cuts.push(cut);
      history.push({ layout, enter, exit, hold, treat, cam, trans, decor: decor.map(d => d.id) });
      // events at cut start
      // events at cut start — durations are on a 24fps timebase so every output rate looks the same
      const g = lineFx.glitch * (st.glitchBoost || 1);
      const fxOn = k2 => en.fx == null || en.fx[k2] !== false;
      const eventOn = () => !direction || rng.chance(section?.majorEvent ? 0.6 : .035 + intensity * .16);
      const F = 1 / 24;
      if (fxOn('chroma') && eventOn()) addEvent(cs, 'chroma', (1.4 + rng.range(0, 2) * fx.chroma + (emph ? 2.5 : 0)) * (direction ? .35 + .65 * intensity : 1), 0.25);
      if (fxOn('slice') && (!direction || section?.majorEvent) && rng.chance(g * 0.5 + (emph ? 0.3 : 0))) addEvent(cs, 'slice', 0.6 + rng.range(0, 0.8) * g + (emph ? 0.5 : 0), rng.pick([2, 3, 4]) * F);
      if (fxOn('block') && rng.chance(g * 0.22)) addEvent(cs + rng.range(0, 0.05), 'block', 0.5 + g, rng.pick([2, 4]) * F);
      if (fxOn('shake') && (!direction || intensity > .69) && (emph || rng.chance(lineFx.motion * 0.18))) addEvent(cs, 'shake', (emph ? 1 : 0.5) * lineFx.motion, 0.3);
      if (fxOn('flash') && fx.flash && (!direction || intensity > .83) && (ln.impact && k === 0)) addEvent(cs, 'flash', 1, 3 * F);
      if (fxOn('invert') && rng.chance(0.035 * g)) addEvent(cs, 'invert', 1, 2 * F);
      if (fxOn('zoom') && (emph && rng.chance(0.6) || rng.chance(0.06 * fx.motion))) addEvent(cs, 'zoom', 0.7 + 0.5 * fx.motion, 0.22);
      if (fxOn('mosaic') && rng.chance(0.04 * g)) addEvent(cs, 'mosaic', 1, 3 * F);
      if (fxOn('slice') && dur > 0.8 && rng.chance(g * 0.4)) addEvent(cs + rng.range(0.35, 0.8) * dur, 'slice', 0.4 + g * 0.4, 2 * F);
      // the newer effect library: at most one per cut boundary (plus rare mid-cut accents)
      if (plan.cuts.length > 1 || k > 0 || li > 0) {
        const pick = !direction || section?.majorEvent ? pickFx(rng, st, en, lineFx, emph, fxHistory, 'edge') : null;
        if (pick) { const D2 = J.FXE[pick]; const d = (D2.dur || 4) * F; addEvent(cs - (D2.pre ? D2.pre * F : 0), pick, (D2.amp || 1) * (0.7 + 0.5 * g + (emph ? 0.3 : 0)), d); fxHistory.push(pick); }
      }
      if (dur > 1.1 && (!direction || section?.majorEvent && intensity > .72)) { const pick = pickFx(rng, st, en, lineFx, emph, fxHistory, 'mid'); if (pick) { const D2 = J.FXE[pick]; addEvent(cs + rng.range(0.4, 0.75) * dur, pick, (D2.amp || 1) * (0.5 + 0.4 * g), (D2.dur || 3) * F); } }
    });
    // interlude in long gaps
    const nextStart = li < parsed.lines.length - 1 ? tm.starts[li + 1] : null;
    if (nextStart != null && nextStart - visEnd > 1.3) {
      const r2 = J.rng(J.h(lineSeed, 404));
      plan.cuts.push(makeCut({ text: direction ? '' : title || '', lineText: '', line: li, start: visEnd, end: nextStart, layout: 'interlude', enter: 'blur', exit: 'blur', hold: 'still', inDur: 0.3, outDur: 0.3, params: J.LAYOUTS.interlude.plan(r2), decor: direction ? [] : pickDecor(r2, st, en, Object.assign({}, fx, { decor: 1 }), 'interlude'), scheme: schemeIdx, seed: J.h(lineSeed, 405) }));
    }
  });
  plan.cuts.sort((a, b) => a.start - b.start);
  plan.cuts.forEach((c, i) => { c.index = i; });
  plan.events.sort((a, b) => a.t - b.t);
  plan.energy = audio && audio.energy ? audio.energy : null;
  plan.energyRate = audio && audio.energyRate ? audio.energyRate : 0;
  return plan;
};

function makeCut(o) {
  const c = Object.assign({ hold: 'still', inDur: 0.3, outDur: 0.25, stagger: 0.04, decor: [], params: {}, scheme: 0, emph: false, words: [], note: null, treat: 'none', treatP: {}, bg: 'none', bgP: {}, cam: 'push', camP: {} }, o);
  c.dur = c.end - c.start;
  return c;
}
function partition(chunks, k) {
  const lens = chunks.map(c => [...c].length + 1);
  const tot = lens.reduce((a, b) => a + b, 0), target = tot / k;
  const groups = []; let cur = [], acc = 0, remainingGroups = k;
  chunks.forEach((c, i) => {
    const remainingChunks = chunks.length - i;
    if (cur.length && (acc + lens[i] / 2 > target || remainingChunks < remainingGroups) && groups.length < k - 1) { groups.push(cur); cur = []; acc = 0; remainingGroups--; }
    cur.push(c); acc += lens[i];
  });
  if (cur.length) groups.push(cur);
  return groups;
}
function novelty(history, key, val) {
  let w = 1;
  for (let i = history.length - 1, d = 0; i >= 0 && d < 6; i--, d++) if (history[i][key] === val) w *= d < 2 ? 0.2 : 0.6;
  return w;
}
const PORTRAIT_W = { vcols: 1.9, condensed: 1.3, huge: 1.3, center: 1.2, stack: 1.1, mixed: 0.7, marquee: 0.6, wave: 0.6, diag: 0.8, type: 0.8, gloss: 0.5 };
function pickLayout(rng, st, en, n, dur, history, emph, recap, portrait) {
  const cands = [];
  for (const k of J.LAYOUT_ORDER) {
    const L = J.LAYOUTS[k];
    if (!en.layout[k] || !L.fits(n)) continue;
    let w = wkey(st.bias.layout, k, L.w ?? 1) * novelty(history, 'layout', k);
    if (portrait) w *= L.portrait != null ? L.portrait : wkey(PORTRAIT_W, k, 1);
    if (emph && L.emph) w *= L.emph;
    if (emph && ['huge', 'center', 'tile', 'marquee', 'condensed'].includes(k)) w *= 2;
    if (recap && ['center', 'stack', 'marquee', 'tile', 'mixed', 'type', 'gloss'].includes(k)) w *= 1.8;
    if (dur < 0.5 && ['wave', 'ring', 'labels', 'gloss', 'type', 'tile'].includes(k)) w *= 0.3;
    if (dur < 0.5 && ['center', 'huge', 'condensed', 'vcols'].includes(k)) w *= 1.4;
    cands.push([k, w]);
  }
  if (!cands.length) return 'center';
  return rng.wpick(cands);
}
const LAYOUT_ENTER = {
  type: { type: 4, scramble: 1.5 }, ring: { pop: 2, spin: 2, cut: 1, assemble: 0.4, slice: 0.2, wipe: 0.2 }, labels: { cut: 3, pop: 1 },
  wave: { pop: 1.5, drop: 1.5, blur: 1, slice: 0.3 }, tile: { assemble: 1.3, slice: 1.4, zoom: 1.4 }, huge: { zoom: 1.5, wipe: 1.5, slice: 1.4, stretch: 1.3, type: 0.2 },
  mixed: { pop: 1.6, drop: 1.6, spin: 1.3 }, scatter: { pop: 1.5, spin: 1.5, drop: 1.2, assemble: 1.3 }, vcols: { assemble: 1.8, type: 1.2 }, pill: { wipe: 1.8, type: 1.2 },
};
function pickEnter(rng, st, en, layout, dur, history, emph, n) {
  const cands = [];
  for (const k of J.ENTER_ORDER) {
    if (!en.enter[k]) continue;
    const D = J.ENTER[k]; if (!D) continue;
    const LD = J.LAYOUTS[layout] || {};
    let w = wkey(st.bias.enter, k, D.w ?? 1) * novelty(history, 'enter', k) * wkey(LAYOUT_ENTER[layout] || LD.enterBias, k, 1);
    if (D.minDur && dur < D.minDur) w *= 0.15;
    if (D.maxChars && n > D.maxChars) w *= 0.2;
    if (k === 'cut') w *= 0.5;
    if (dur < 0.45 && ['type', 'assemble', 'drop', 'spin', 'pop', 'flicker'].includes(k)) w *= 0.25;
    if (dur < 0.45 && ['cut', 'slice', 'zoom', 'stretch'].includes(k)) w *= 1.8;
    if (k === 'type' && n > 18) w *= 0.3;
    if (emph && ['zoom', 'assemble', 'slice'].includes(k)) w *= 1.8;
    cands.push([k, w]);
  }
  return cands.length ? rng.wpick(cands) : 'cut';
}
function pickExit(rng, st, en, layout, dur, lastOfLine, history) {
  const cands = [];
  for (const k of J.EXIT_ORDER) {
    if (!en.exit[k]) continue;
    const D = J.EXIT[k]; if (!D) continue;
    let w = wkey(st.bias.exit, k, D.w ?? 1) * novelty(history, 'exit', k);
    if (D.minDur && dur < D.minDur) w *= 0.15;
    if (k === 'cut') w *= dur < 0.6 ? 4 : lastOfLine ? 1.2 : 2.2;
    if (dur < 0.6 && k !== 'cut') w *= 0.4;
    if (['labels', 'ring', 'tile'].includes(layout) && ['explode', 'fall', 'drift'].includes(k)) w *= 0.3;
    cands.push([k, w]);
  }
  return cands.length ? rng.wpick(cands) : 'cut';
}
const HOLD_W = { still: 1, jitter: 1.2, drift: 1, breathe: 0.7, wave: 0.4, glitchtick: 0.9 };
function pickHold(rng, en, fx, history) {
  const cands = J.HOLD_ORDER.filter(k => en.hold[k] !== false && J.HOLD[k]).map(k => {
    const D = J.HOLD[k];
    let w = HOLD_W[k] != null ? HOLD_W[k] : (D.w ?? 0.8);
    if (k === 'jitter' || (D.tags && D.tags.includes('glitch'))) w *= 0.4 + fx.motion;
    if (k === 'glitchtick') w *= fx.glitch;
    return [k, w * novelty(history, 'hold', k)];
  });
  return cands.length ? rng.wpick(cands) : 'still';
}
function decorParams(rng, k) {
  return { id: k, seed: rng.int(1, 1e9), n: rng.int(1, 3) + (k === 'shapes' ? 3 : 0) + (k === 'sparks' ? 4 : 0), right: rng.chance(0.5), low: rng.chance(0.5), accent: rng.chance(0.4), corner: rng.chance(0.5), big: rng.chance(0.4), mode: rng.pick(['count', 'index']), from: rng.int(0, 20), to: rng.int(30, 999), v: rng.int(0, 5), r: rng() };
}
function pickDecor(rng, st, en, fx, layout, history = []) {
  const count = Math.round(fx.decor * 2.8 * rng.range(0.45, 1.15));
  const recent = new Set(history.slice(-2).flatMap(h => h.decor || []));
  const LD = J.LAYOUTS[layout] || {};
  const cands = J.DECOR_ORDER.filter(k => en.decor[k] && J.DECOR[k] && !(LD.busy && J.DECOR[k].layer === 'back' && !J.DECOR[k].subtle))
    .map(k => [k, wkey(st.decor, k, J.DECOR[k].w != null ? J.DECOR[k].w * 0.5 : 0.35) * (recent.has(k) ? 0.35 : 1)]);
  const out = [];
  for (let i = 0; i < count && cands.length; i++) {
    const k = rng.wpick(cands);
    cands.splice(cands.findIndex(c => c[0] === k), 1);
    out.push(decorParams(rng, k));
  }
  return out;
}
// text treatment: plain most of the time; the "decor" slider raises how often a treatment is used
function pickTreat(rng, st, en, fx, LD, emph, history) {
  if (LD.treat === false) return 'none';
  if (!rng.chance(0.18 + 0.42 * (fx.decor ?? 0.5) + (emph ? 0.15 : 0))) return 'none';
  const cands = J.TREAT_ORDER.filter(k => k !== 'none' && en.treat && en.treat[k] !== false && J.TREAT[k] && (LD.treat !== 'safe' || J.TREAT[k].safe))
    .map(k => [k, wkey(st.bias && st.bias.treat, k, J.TREAT[k].w ?? 1) * novelty(history, 'treat', k)]);
  return cands.length ? rng.wpick(cands) : 'none';
}
function pickBg(rng, st, en, fx, bgHist) {
  if (!rng.chance(0.2 + 0.35 * (fx.decor ?? 0.5) + 0.2 * (fx.bgSwitch ?? 0.35))) return 'none';
  const last = bgHist.slice(-3);
  const cands = J.BG_ORDER.filter(k => k !== 'none' && en.bg && en.bg[k] !== false && J.BG[k])
    .map(k => [k, wkey(st.bias && st.bias.bg, k, J.BG[k].w ?? 1) * (last.includes(k) ? 0.25 : 1)]);
  return cands.length ? rng.wpick(cands) : 'none';
}
function pickCam(rng, st, en, fx, LD, emph, history) {
  const cands = J.CAMERA_ORDER.filter(k => en.cam && en.cam[k] !== false && J.CAMERA[k]).map(k => {
    const D = J.CAMERA[k];
    let w = wkey(st.bias && st.bias.cam, k, D.w ?? 1) * novelty(history, 'cam', k);
    if (D.strong) w *= 0.25 + 0.9 * (fx.motion ?? 0.7) + (emph ? 0.6 : 0);
    if (LD.cam === false && k !== 'push') w *= 0.05;
    return [k, w];
  });
  return cands.length ? rng.wpick(cands) : 'push';
}
function pickTrans(rng, st, en, fx, emph, history) {
  if (!J.TRANS_ORDER.length) return null;
  if (!rng.chance(0.1 + 0.22 * (fx.motion ?? 0.7) + (emph ? 0.08 : 0))) return null;
  const cands = J.TRANS_ORDER.filter(k => en.trans && en.trans[k] !== false && J.TRANS[k])
    .map(k => [k, wkey(st.bias && st.bias.trans, k, J.TRANS[k].w ?? 1) * novelty(history, 'trans', k)]);
  return cands.length ? rng.wpick(cands) : null;
}
// kind 'edge' = transition at a cut boundary, 'mid' = accent in the middle of a cut
function pickFx(rng, st, en, fx, emph, fxHist, kind) {
  const g = fx.glitch ?? 0.55;
  const p = kind === 'edge' ? 0.12 + 0.38 * g + 0.12 * (fx.motion ?? 0.7) + (emph ? 0.15 : 0) : 0.05 + 0.2 * g;
  if (!rng.chance(p)) return null;
  const last = fxHist.slice(-3);
  const cands = J.FXE_ORDER.filter(k => { const D = J.FXE[k]; return D && !D.builtin && en.fx && en.fx[k] !== false && (kind === 'edge' ? D.edge !== false : D.mid); })
    .map(k => { const D = J.FXE[k]; let w = wkey(st.bias && st.bias.fx, k, D.w ?? 1) * (last.includes(k) ? 0.2 : 1); if (D.glitchy) w *= 0.3 + g * 1.4; return [k, w]; });
  return cands.length ? rng.wpick(cands) : null;
}

J.designSize = (aspect) => {
  if (aspect === '9:16') return [1080, 1920];
  if (aspect === '1:1') return [1440, 1440];
  if (aspect === '4:5') return [1440, 1800];
  if (aspect === '21:9') return [2520, 1080];
  if (aspect === '4:3') return [1440, 1080];
  if (aspect === '3:4') return [1080, 1440];
  return [1920, 1080];
};
J.outputSize = (project) => {
  const [W, H] = J.designSize(project.aspect);
  const k = (project.res || 1080) / Math.min(W, H);
  return [Math.round(W * k / 2) * 2, Math.round(H * k / 2) * 2];
};
})();
