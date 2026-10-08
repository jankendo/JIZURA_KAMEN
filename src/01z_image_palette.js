/* ============================================================
   JIZURA — local image analysis and safe palette generation
   ============================================================ */
(() => {
'use strict';

const clamp = (v, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, v));
const finite = (v, d = 0) => Number.isFinite(+v) ? +v : d;
const srgbToLinear = v => (v /= 255) <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
const linearToSrgb = v => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(Math.max(0, v), 1 / 2.4) - 0.055);
const rgbLuma = (r, g, b) => 0.2126 * srgbToLinear(r) + 0.7152 * srgbToLinear(g) + 0.0722 * srgbToLinear(b);
const hexRGB = hex => {
  const s = String(hex || '').replace('#', '');
  if (!/^[0-9a-f]{6}$/i.test(s)) return [128, 128, 128];
  return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
};
const hexLuma = hex => rgbLuma(...hexRGB(hex));
const contrast = (a, b) => {
  const x = typeof a === 'number' ? a : hexLuma(a), y = typeof b === 'number' ? b : hexLuma(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};
const rgbHex = (r, g, b) => '#' + [r, g, b].map(v => clamp(Math.round(v), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase();

function rgbToLab(r, g, b) {
  r = srgbToLinear(r); g = srgbToLinear(g); b = srgbToLinear(b);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
function labToRgb(L, a, b) {
  const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3);
  const m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3);
  const s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
  return [
    linearToSrgb(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    linearToSrgb(-1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s),
    linearToSrgb(-0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s),
  ].map(v => clamp(v, 0, 255));
}
const labHex = (L, C, h) => rgbHex(...labToRgb(L, C * Math.cos(h * Math.PI / 180), C * Math.sin(h * Math.PI / 180)));
const labDistance = (x, y) => Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]);
const hueOf = (a, b) => (Math.atan2(b, a) * 180 / Math.PI + 360) % 360;
const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return Math.min(d, 360 - d); };
function hslOf(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const hi = Math.max(r, g, b), lo = Math.min(r, g, b), d = hi - lo;
  let h = 0;
  if (d) h = hi === r ? ((g - b) / d) % 6 : hi === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  const l = (hi + lo) / 2, s = d ? d / (1 - Math.abs(2 * l - 1)) : 0;
  return [h, s, l];
}

J.emptyAutoPalette = () => ({ enabled: false, analyzed: false, sourceHash: '', mood: null, palette: null, variants: [], suggestedDarkness: null, stats: null, localMap: null, viewportKey: '', userModified: false,
  options: { palette: true, readability: true, mood: true }, darknessManual: false, lookModified: false, originalColors: null, originalLook: null });

J.normalizeAutoPalette = value => {
  const out = Object.assign(J.emptyAutoPalette(), value && typeof value === 'object' ? value : {});
  const cleanPalette = p => {
    if (!p || typeof p !== 'object') return null;
    const c = {};
    for (const k of ['bg', 'fg', 'sub', 'accent', 'accent2', 'ink', 'dim', 'ghostA', 'ghostB']) if (/^#[0-9a-f]{6}$/i.test(String(p[k] || ''))) c[k] = String(p[k]).toUpperCase();
    return c.fg && c.accent ? c : null;
  };
  out.palette = cleanPalette(out.palette);
  out.variants = Array.isArray(out.variants) ? out.variants.slice(0, 3).map(cleanPalette).filter(Boolean) : [];
  out.options = Object.assign({ palette: true, readability: true, mood: true }, value && value.options && typeof value.options === 'object' ? value.options : {});
  for (const k of ['palette', 'readability', 'mood']) out.options[k] = out.options[k] !== false;
  out.darknessManual = !!out.darknessManual;
  out.lookModified = !!out.lookModified;
  out.originalColors = out.originalColors && typeof out.originalColors === 'object' ? Object.assign({}, out.originalColors) : null;
  out.originalLook = out.originalLook && typeof out.originalLook === 'object' ? {
    style: typeof out.originalLook.style === 'string' ? out.originalLook.style : null,
    mood: typeof out.originalLook.mood === 'string' ? out.originalLook.mood : null,
    fx: out.originalLook.fx && typeof out.originalLook.fx === 'object' ? Object.assign({}, out.originalLook.fx) : null,
    enabled: out.originalLook.enabled && typeof out.originalLook.enabled === 'object' ? JSON.parse(JSON.stringify(out.originalLook.enabled)) : null,
  } : null;
  out.sourceHash = typeof out.sourceHash === 'string' ? out.sourceHash.slice(0, 48) : '';
  out.mood = typeof out.mood === 'string' ? out.mood : null;
  out.suggestedDarkness = Number.isFinite(+out.suggestedDarkness) ? clamp(+out.suggestedDarkness, 0, 0.8) : null;
  if (out.stats && typeof out.stats === 'object') {
    const stats = {};
    for (const k of ['mean', 'median', 'p10', 'p25', 'p75', 'p90', 'chroma', 'warmth', 'detail', 'contrast', 'dominantHue', 'hueSpread', 'edgeDensity', 'negativeSpace', 'visualCenterX', 'visualCenterY', 'spaceLeft', 'spaceRight', 'spaceCenter', 'spaceTop', 'spaceBottom']) if (Number.isFinite(+out.stats[k])) stats[k] = clamp(+out.stats[k], 0, 1);
    out.stats = stats;
  } else out.stats = null;
  if (out.localMap && typeof out.localMap === 'object') {
    const w = Math.floor(+out.localMap.width), h = Math.floor(+out.localMap.height), values = out.localMap.values;
    if (w > 0 && w <= 32 && h > 0 && h <= 24 && Array.isArray(values) && values.length === w * h * 2 && values.every(v => Number.isFinite(+v))) {
      out.localMap = { width: w, height: h, values: values.map(v => clamp(+v, 0, 1)) };
    } else out.localMap = null;
  } else out.localMap = null;
  out.enabled = !!out.enabled && !!out.analyzed && !!out.palette;
  out.analyzed = !!out.analyzed && !!out.palette;
  out.userModified = !!out.userModified;
  out.viewportKey = typeof out.viewportKey === 'string' ? out.viewportKey.slice(0, 120) : '';
  return out;
};

J.customBgGeometry = (iw, ih, W, H, cfg = {}) => {
  if (!(iw > 0 && ih > 0 && W > 0 && H > 0)) return null;
  const fit = cfg.fit === 'contain' ? 'contain' : 'cover';
  const s = (fit === 'contain' ? Math.min : Math.max)(W / iw, H / ih);
  let w = iw * s * clamp(finite(cfg.zoom, 1) || 1, 0.5, 3), h = ih * s * clamp(finite(cfg.zoom, 1) || 1, 0.5, 3);
  const blur = clamp(finite(cfg.blur), 0, 30);
  if (blur > 0) { const bleed = 1 + blur * 2 / Math.max(1, Math.min(w, h)); w *= bleed; h *= bleed; }
  const x = clamp(finite(cfg.x, 50), 0, 100) / 100, y = clamp(finite(cfg.y, 50), 0, 100) / 100;
  return { x: (W - w) * x, y: (H - h) * y, w, h, fit, blur };
};

J.autoPaletteViewportKey = (project = {}) => {
  const b = project.customBg || {};
  return [project.aspect || '16:9', b.fit || 'cover', Math.round(finite(b.x, 50)), Math.round(finite(b.y, 50)), Math.round(finite(b.zoom, 1) * 100), Math.round(finite(b.blur)), Math.round(finite(b.darkness) * 100)].join('|');
};

J.captureCustomBackground = (image, project, baseColor, maxEdge = 128) => {
  if (!image || !image.width || !image.height || typeof document === 'undefined') throw new Error('背景画像を分析できません');
  const [W, H] = J.designSize(project && project.aspect || '16:9');
  const edge = clamp(Math.round(maxEdge), 48, 192), scale = Math.min(edge / W, edge / H);
  const width = Math.max(16, Math.round(W * scale)), height = Math.max(16, Math.round(H * scale));
  const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('背景画像を分析できません');
  ctx.fillStyle = /^#[0-9a-f]{6}$/i.test(String(baseColor || '')) ? baseColor : '#111114';
  ctx.fillRect(0, 0, width, height);
  const cfg = project.customBg || {}, rect = J.customBgGeometry(image.width, image.height, W, H, cfg);
  ctx.save();
  if (rect.blur > 0) { try { ctx.filter = `blur(${(rect.blur * scale).toFixed(2)}px)`; } catch (e) {} }
  ctx.drawImage(image, rect.x * scale, rect.y * scale, rect.w * scale, rect.h * scale);
  ctx.filter = 'none';
  const darkness = clamp(finite(cfg.darkness), 0, 0.8);
  if (darkness > 0) { ctx.globalAlpha = darkness; ctx.fillStyle = '#000000'; ctx.fillRect(rect.x * scale, rect.y * scale, rect.w * scale, rect.h * scale); }
  ctx.restore();
  const data = ctx.getImageData(0, 0, width, height).data;
  return { width, height, data, localMap: J.localLumaMap(width, height, data), sourceHash: J.imageFingerprint(image) };
};

J.imageFingerprint = image => {
  if (!image || !image.width || !image.height || typeof document === 'undefined') return '';
  const c = document.createElement('canvas'); c.width = 48; c.height = 48;
  const x = c.getContext('2d', { willReadFrequently: true });
  if (!x) return '';
  x.drawImage(image, 0, 0, 48, 48);
  const d = x.getImageData(0, 0, 48, 48).data;
  let h = 2166136261 >>> 0;
  for (let i = 0; i < d.length; i += 1) { h ^= d[i]; h = Math.imul(h, 16777619) >>> 0; }
  return `${image.width}x${image.height}-${h.toString(16).padStart(8, '0')}`;
};

J.localLumaMap = (width, height, data, gridW = 24, gridH = 16) => {
  gridW = Math.max(1, Math.min(32, Math.floor(gridW), width)); gridH = Math.max(1, Math.min(24, Math.floor(gridH), height));
  const n = gridW * gridH, sum = new Float64Array(n), count = new Uint32Array(n), edge = new Float64Array(n), edgeN = new Uint32Array(n);
  const lum = new Float32Array(width * height);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const p = (y * width + x) * 4, idx = y * width + x;
    lum[idx] = rgbLuma(data[p], data[p + 1], data[p + 2]);
    const cell = Math.min(gridH - 1, Math.floor(y * gridH / height)) * gridW + Math.min(gridW - 1, Math.floor(x * gridW / width));
    sum[cell] += lum[idx]; count[cell]++;
    for (const ni of [x + 1 < width ? idx + 1 : -1, y + 1 < height ? idx + width : -1]) if (ni >= 0) { edge[cell] += Math.abs(lum[idx] - lum[ni]); edgeN[cell]++; }
  }
  const values = [];
  for (let i = 0; i < n; i++) values.push(+((count[i] ? sum[i] / count[i] : 0.5).toFixed(4)), +((edgeN[i] ? clamp(edge[i] / edgeN[i] * 2) : 0).toFixed(4)));
  return { width: gridW, height: gridH, values };
};

J.sampleLocalLuma = (map, nx, ny, rx = 1, ry = 1) => {
  if (!map || !Array.isArray(map.values) || !map.width || !map.height) return { luma: 0.5, detail: 0 };
  const cx = clamp(nx) * (map.width - 1), cy = clamp(ny) * (map.height - 1);
  rx = clamp(Math.ceil(rx), 0, 5); ry = clamp(Math.ceil(ry), 0, 5);
  let l = 0, d = 0, n = 0;
  for (let y = Math.max(0, Math.floor(cy) - ry); y <= Math.min(map.height - 1, Math.ceil(cy) + ry); y++) {
    for (let x = Math.max(0, Math.floor(cx) - rx); x <= Math.min(map.width - 1, Math.ceil(cx) + rx); x++) {
      const i = (y * map.width + x) * 2; l += map.values[i]; d += map.values[i + 1]; n++;
    }
  }
  return { luma: n ? l / n : 0.5, detail: n ? d / n : 0 };
};

function farthestClusters(points, k = 5) {
  if (!points.length) return [];
  const centers = [points[Math.floor(points.length / 2)].lab.slice()];
  while (centers.length < Math.min(k, points.length)) {
    let selected = points[0], best = -1;
    for (const p of points) {
      let min = Infinity; for (const c of centers) min = Math.min(min, labDistance(p.lab, c));
      if (min > best) { best = min; selected = p; }
    }
    centers.push(selected.lab.slice());
  }
  let groups = [];
  for (let iter = 0; iter < 9; iter++) {
    groups = centers.map(() => []);
    for (const p of points) {
      let bi = 0, bd = Infinity;
      for (let i = 0; i < centers.length; i++) { const d = labDistance(p.lab, centers[i]); if (d < bd) { bd = d; bi = i; } }
      groups[bi].push(p);
    }
    groups.forEach((g, i) => { if (!g.length) return; const s = [0, 0, 0]; for (const p of g) { s[0] += p.lab[0]; s[1] += p.lab[1]; s[2] += p.lab[2]; } centers[i] = s.map(v => v / g.length); });
  }
  return groups.filter(g => g.length).map(g => {
    const lab = [0, 0, 0], rgb = [0, 0, 0];
    for (const p of g) { for (let i = 0; i < 3; i++) { lab[i] += p.lab[i]; rgb[i] += p.rgb[i]; } }
    for (let i = 0; i < 3; i++) { lab[i] /= g.length; rgb[i] /= g.length; }
    const [h, sat] = hslOf(...rgb);
    return { lab, rgb, ratio: g.length / points.length, chroma: Math.hypot(lab[1], lab[2]), hue: hueOf(lab[1], lab[2]), skinLike: h < 72 && sat > 0.2 && lab[0] > 0.35 && lab[0] < 0.86 };
  }).sort((a, b) => b.ratio - a.ratio);
}

function hueAccent(hue, chroma, yValues, medianY, lightText, delta = 0) {
  hue = (hue + delta + 360) % 360; chroma = clamp(chroma, 0.07, 0.24);
  const prefer = lightText ? 0.8 : 0.48;
  let best = null;
  for (let L = 0.34; L <= 0.86; L += 0.035) {
    const hex = labHex(L, chroma, hue), y = hexLuma(hex);
    let visible = 0;
    for (let i = 0; i < yValues.length; i += Math.max(1, Math.floor(yValues.length / 1400))) if (contrast(y, yValues[i]) >= 2.6) visible++;
    const samples = Math.ceil(yValues.length / Math.max(1, Math.floor(yValues.length / 1400)));
    const score = visible / Math.max(1, samples) * 2 + Math.min(contrast(y, medianY), 8) * 0.05 - Math.abs(L - prefer) * 0.18;
    if (!best || score > best.score) best = { hex, score };
  }
  return best ? best.hex : labHex(prefer, chroma, hue);
}

function paletteFrom(records, clusters, stats) {
  const yValues = records.map(p => p.y), medianRecord = records.slice().sort((a, b) => a.y - b.y)[Math.floor(records.length / 2)];
  const medianY = medianRecord ? medianRecord.y : 0.5;
  const lightTint = stats.warmth > 0.58 ? '#F7F2E9' : '#F2F6FB';
  const darkTint = stats.warmth > 0.58 ? '#171310' : '#11151B';
  let lightScore = 0, darkScore = 0;
  for (let i = 0; i < yValues.length; i += Math.max(1, Math.floor(yValues.length / 1800))) {
    if (contrast(lightTint, yValues[i]) >= 4.5) lightScore++;
    if (contrast(darkTint, yValues[i]) >= 4.5) darkScore++;
  }
  const lightText = lightScore === darkScore ? medianY < 0.48 : lightScore > darkScore;
  const foreground = lightText ? lightTint : darkTint;
  const sub = lightText ? (stats.warmth > 0.58 ? '#CFCCC5' : '#C9D2DD') : (stats.warmth > 0.58 ? '#514A43' : '#4B5662');
  const ranked = clusters.filter(c => c.ratio >= 0.012).map(c => ({ c, score: Math.pow(c.ratio, 0.42) * (0.34 + Math.min(c.chroma, 0.28) * 3.1) * (c.skinLike ? 0.58 : 1) })).sort((a, b) => b.score - a.score);
  let first = ranked[0] && ranked[0].c, second = ranked.find(x => first && hueGap(x.c.hue, first.hue) > 26 && labDistance(x.c.lab, first.lab) > 0.055);
  let hue = first && first.chroma > 0.028 ? first.hue : stats.warmth > 0.58 ? 34 : stats.warmth < 0.42 ? 205 : 263;
  const C = first && first.chroma > 0.035 ? clamp(first.chroma * 1.12, 0.11, 0.23) : (stats.chroma < 0.035 ? 0.105 : 0.145);
  const accent = hueAccent(hue, C, yValues, medianY, lightText);
  let hue2 = second && second.c.chroma > 0.035 ? second.c.hue : hue + (stats.warmth > 0.58 ? 148 : -142);
  let C2 = second && second.c.chroma > 0.035 ? clamp(second.c.chroma, 0.09, 0.21) : clamp(C * 0.82, 0.09, 0.18);
  if (hueGap(hue, hue2) < 34) hue2 = hue + 150;
  const accent2 = hueAccent(hue2, C2, yValues, medianY, lightText, 0);
  const bg = labHex(lightText ? 0.15 : 0.95, 0.025, hue);
  const dim = labHex(lightText ? 0.22 : 0.89, 0.018, hue);
  const p = { bg, fg: foreground, sub, accent, accent2, ink: foreground, dim,
    ghostA: hueAccent(hue + 158, Math.max(0.09, C * 0.92), yValues, medianY, lightText),
    ghostB: hueAccent(hue2 - 38, Math.max(0.08, C2 * 0.9), yValues, medianY, lightText) };
  return { palette: p, lightText, medianY, accentHue: hue, accent2Hue: hue2, chroma1: C, chroma2: C2 };
}

function recolor(hex, hueDelta, chromaScale, lightDelta) {
  const lab = rgbToLab(...hexRGB(hex)), C = Math.hypot(lab[1], lab[2]), h = hueOf(lab[1], lab[2]);
  return labHex(clamp(lab[0] + lightDelta, 0.34, 0.92), clamp(C * chromaScale, 0.05, 0.24), h + hueDelta);
}
function makeVariants(base) {
  const dramatic = Object.assign({}, base, {
    accent: recolor(base.accent, 8, 1.12, 0.035), accent2: recolor(base.accent2, -8, 1.08, -0.025),
    ghostA: recolor(base.ghostA, 12, 1.12, 0.025), ghostB: recolor(base.ghostB, -10, 1.08, -0.02),
  });
  const soft = Object.assign({}, base, {
    accent: recolor(base.accent, -6, 0.68, 0.015), accent2: recolor(base.accent2, 6, 0.68, 0.01),
    ghostA: recolor(base.ghostA, -5, 0.72, 0), ghostB: recolor(base.ghostB, 5, 0.72, 0),
  });
  return [base, dramatic, soft];
}

function chooseMood(s) {
  const bright = s.median, c = s.chroma, d = s.detail;
  if (bright < 0.3 && c >= 0.11) return d > 0.38 ? 'glitch' : 'graphic';
  if (bright < 0.38 && c < 0.11) return d > 0.32 || s.contrast > 0.42 ? 'emotional' : 'calm';
  if (bright > 0.68 && c >= 0.13) return d > 0.4 ? 'graphic' : 'pop';
  if (bright > 0.68 && c < 0.1) return d < 0.22 ? 'editorial' : 'calm';
  if (s.warmth > 0.59 && c >= 0.075) return 'emotional';
  if (d > 0.4 && c > 0.12) return 'graphic';
  if (c > 0.14) return 'pop';
  return 'editorial';
}

J.analyzeImagePixels = (width, height, data) => {
  if (data && data.data) data = data.data;
  if (!(width > 0 && height > 0 && data && data.length >= width * height * 4)) throw new Error('背景画像を分析できません');
  const points = [], ys = [], labs = [];
  const total = width * height, stride = Math.max(1, Math.ceil(total / 16000));
  let meanY = 0, meanA = 0, meanB = 0, meanC = 0, valid = 0, warmthSum = 0, hueX = 0, hueY = 0, hueN = 0;
  for (let p = 0, i = 0; p < total; p += stride, i = p * 4) {
    if (data[i + 3] < 16) continue;
    const rgb = [data[i], data[i + 1], data[i + 2]], lab = rgbToLab(...rgb), y = rgbLuma(...rgb);
    const [h, sat] = hslOf(...rgb); if (sat > .16) { hueX += Math.cos(h * Math.PI / 180) * sat; hueY += Math.sin(h * Math.PI / 180) * sat; hueN += sat; }
    points.push({ lab, rgb, y }); ys.push(y); labs.push(lab); meanY += y; meanA += lab[1]; meanB += lab[2]; meanC += Math.hypot(lab[1], lab[2]); warmthSum += lab[1] * 0.56 + lab[2] * 0.44; valid++;
  }
  if (!points.length) throw new Error('背景画像を分析できません');
  ys.sort((a, b) => a - b);
  const q = p => ys[Math.min(ys.length - 1, Math.floor((ys.length - 1) * p))];
  let edge = 0, edgeN = 0;
  for (let y = 0; y < height; y += stride) for (let x = 0; x < width; x += stride) {
    const i = (y * width + x) * 4, lum = rgbLuma(data[i], data[i + 1], data[i + 2]);
    if (x + stride < width) { const j = (y * width + x + stride) * 4; edge += Math.abs(lum - rgbLuma(data[j], data[j + 1], data[j + 2])); edgeN++; }
    if (y + stride < height) { const j = ((y + stride) * width + x) * 4; edge += Math.abs(lum - rgbLuma(data[j], data[j + 1], data[j + 2])); edgeN++; }
  }
  const warmth = clamp(0.5 + warmthSum / valid * 1.15), detail = clamp(edgeN ? edge / edgeN * 2.5 : 0);
  const map = J.localLumaMap(width, height, data);
  const cells = [], weights = { left: 0, right: 0, center: 0, top: 0, bottom: 0 };
  let salience = 0, cx = 0, cy = 0, open = 0;
  for (let y = 0; y < map.height; y++) for (let x = 0; x < map.width; x++) {
    const i = (y * map.width + x) * 2, l = map.values[i], d = map.values[i + 1];
    const w = clamp(d * 1.65 + Math.abs(l - meanY / valid) * .4);
    salience += w; cx += (x + .5) / map.width * w; cy += (y + .5) / map.height * w;
    const space = clamp(1 - d * 2.4 - Math.abs(l - meanY / valid) * .45);
    open += space; cells.push(space);
    if (x < map.width * .42) weights.left += space;
    if (x >= map.width * .58) weights.right += space;
    if (x >= map.width * .33 && x < map.width * .67) weights.center += space;
    if (y < map.height * .42) weights.top += space;
    if (y >= map.height * .58) weights.bottom += space;
  }
  const space = (key, portion) => clamp(weights[key] / Math.max(1, map.width * map.height * portion));
  const stats = { mean: meanY / valid, median: q(0.5), p10: q(0.1), p25: q(0.25), p75: q(0.75), p90: q(0.9), chroma: meanC / valid, warmth, detail, contrast: q(0.9) - q(0.1),
    dominantHue: hueN ? hueOf(hueX, hueY) / 360 : 0, hueSpread: hueN ? clamp(1 - Math.hypot(hueX, hueY) / hueN) : 0,
    edgeDensity: detail, negativeSpace: open / cells.length, visualCenterX: salience ? cx / salience : .5, visualCenterY: salience ? cy / salience : .5,
    spaceLeft: space('left', .42), spaceRight: space('right', .42), spaceCenter: space('center', .34), spaceTop: space('top', .42), spaceBottom: space('bottom', .42) };
  const clusters = farthestClusters(points, 5).map(c => Object.assign({}, c, { hex: rgbHex(...labToRgb(...c.lab)) }));
  const generated = paletteFrom(points, clusters, stats);
  const suggestedDarkness = clamp(stats.detail < 0.14 && stats.contrast < 0.34 ? 0.06 : 0.07 + stats.detail * 0.19 + stats.contrast * 0.1, 0.06, 0.28);
  const mood = chooseMood(stats);
  return { palette: generated.palette, variants: makeVariants(generated.palette), clusters: clusters.slice(0, 6), stats, mood, suggestedDarkness, lightText: generated.lightText };
};

J.analyzeCustomBackground = (image, project) => {
  project = project || J.defaultProject();
  const ap = project.autoPalette || {}, baseColors = ap.analyzed && !ap.userModified ? ap.originalColors : project.colors;
  const baseStyleKey = ap.analyzed && !ap.lookModified && ap.originalLook && ap.originalLook.style ? ap.originalLook.style : project.style;
  const baseStyle = J.STYLES[baseStyleKey] || J.STYLES.noir;
  const baseColor = baseColors && baseColors.enabled && baseColors.bg ? baseColors.bg : baseStyle.schemes[0].bg;
  const sample = J.captureCustomBackground(image, project, baseColor, 128);
  const out = J.analyzeImagePixels(sample.width, sample.height, sample.data);
  out.sourceHash = sample.sourceHash;
  out.localMap = sample.localMap;
  out.viewportKey = J.autoPaletteViewportKey(project);
  return out;
};

J.refreshAutoPaletteMap = (image, project) => {
  if (!image || !project || !project.autoPalette || !project.autoPalette.analyzed) return null;
  const style = J.resolveStyle(project), sample = J.captureCustomBackground(image, project, style.schemes[0].bg, 96);
  return sample.localMap;
};

function applyDetectedMood(project, moodKey) {
  if (!J.MOODS || !J.MOODS[moodKey] || !J.omakase) return;
  const preset = J.omakase(project, () => 0.371, moodKey);
  const mood = J.MOODS[moodKey];
  const styles = [...new Set([...(mood.styles || []), ...J.STYLE_ORDER.filter(k => (J.STYLES[k].moods || []).includes(moodKey))])]
    .filter(k => J.STYLES[k] && (!J.randomOk || J.randomOk(project, 'style', k)));
  if (styles.length) preset.style = styles[0];
  project.mood = moodKey;
  project.style = preset.style;
  project.fx = preset.fx;
  project.enabled = preset.enabled;
}

J.applyImagePalette = (project, result, options = {}) => {
  if (!project || !result || !result.palette) return project;
  const previous = project.autoPalette || J.emptyAutoPalette();
  const prefs = Object.assign({}, previous.options || {}, options || {});
  for (const k of ['palette', 'readability', 'mood']) prefs[k] = prefs[k] !== false;
  const originalColors = previous.analyzed && !previous.userModified && previous.originalColors ? previous.originalColors : Object.assign({}, project.colors || {});
  const originalLook = previous.analyzed && !previous.lookModified && previous.originalLook ? previous.originalLook : { style: project.style, mood: project.mood, fx: Object.assign({}, project.fx || {}), enabled: JSON.parse(JSON.stringify(project.enabled || {})) };
  const palette = Object.assign({}, result.palette);
  if (prefs.palette) project.colors = Object.assign({}, project.colors || {}, palette, { enabled: true, accentOn: true });
  else project.colors = Object.assign({}, originalColors);
  project.autoPalette = { enabled: true, analyzed: true, sourceHash: result.sourceHash || '', mood: result.mood || null,
    palette, variants: (result.variants || [palette]).slice(0, 3).map(p => Object.assign({}, p)),
    suggestedDarkness: clamp(finite(result.suggestedDarkness, 0.16), 0, 0.8), stats: Object.assign({}, result.stats || {}),
    localMap: prefs.readability ? (result.localMap || null) : null, viewportKey: result.viewportKey || J.autoPaletteViewportKey(project), userModified: false,
    options: prefs, darknessManual: !!previous.darknessManual, lookModified: false, originalColors, originalLook };
  if (!project.autoPalette.darknessManual) project.customBg = Object.assign({}, project.customBg || {}, { darkness: project.autoPalette.suggestedDarkness });
  if (prefs.mood) applyDetectedMood(project, result.mood);
  else if (originalLook) {
    if (originalLook.style && J.STYLES[originalLook.style]) project.style = originalLook.style;
    project.mood = originalLook.mood || null;
    if (originalLook.fx) project.fx = Object.assign({}, originalLook.fx);
    if (originalLook.enabled) project.enabled = JSON.parse(JSON.stringify(originalLook.enabled));
  }
  project.autoPalette.enabled = !!prefs.palette;
  return project;
};

J.setImagePaletteOption = (project, key, enabled) => {
  if (!project || !project.autoPalette || !['palette', 'readability', 'mood'].includes(key)) return;
  const ap = project.autoPalette;
  ap.options = Object.assign({ palette: true, readability: true, mood: true }, ap.options || {}, { [key]: !!enabled });
  if (key === 'palette') {
    ap.enabled = !!enabled && !!ap.analyzed && !!ap.palette;
    if (!enabled && !ap.userModified && ap.originalColors) project.colors = Object.assign({}, ap.originalColors);
    else if (enabled && ap.analyzed && !ap.userModified) project.colors = Object.assign({}, project.colors || {}, ap.palette, { enabled: true, accentOn: true });
  } else if (key === 'mood' && ap.analyzed) {
    if (enabled) applyDetectedMood(project, ap.mood);
    else if (ap.originalLook) {
      if (ap.originalLook.style && J.STYLES[ap.originalLook.style]) project.style = ap.originalLook.style;
      project.mood = ap.originalLook.mood || null;
      if (ap.originalLook.fx) project.fx = Object.assign({}, ap.originalLook.fx);
      if (ap.originalLook.enabled) project.enabled = JSON.parse(JSON.stringify(ap.originalLook.enabled));
    }
  }
};

J.invalidateAutoPalette = project => {
  if (!project) return;
  const old = project.autoPalette || {}, removeGenerated = old.analyzed && !old.userModified;
  if (removeGenerated && old.originalColors) project.colors = Object.assign({}, old.originalColors);
  else if (removeGenerated && project.colors) { project.colors.enabled = false; project.colors.accentOn = false; }
  if (old.analyzed && !old.lookModified && old.originalLook) {
    if (old.originalLook.style && J.STYLES[old.originalLook.style]) project.style = old.originalLook.style;
    project.mood = old.originalLook.mood || null;
    if (old.originalLook.fx) project.fx = Object.assign({}, old.originalLook.fx);
    if (old.originalLook.enabled) project.enabled = JSON.parse(JSON.stringify(old.originalLook.enabled));
  }
  project.autoPalette = J.emptyAutoPalette();
  project.autoPalette.darknessManual = !!old.darknessManual;
  project.autoPalette.options = Object.assign({}, project.autoPalette.options, old.options || {});
};

J.cameraMatrix = (W, H, cam = {}, offsetX = 0, offsetY = 0) => {
  const rot = finite(cam.rot) * (J.DEG || Math.PI / 180), co = Math.cos(rot), si = Math.sin(rot), shear = Math.tan(finite(cam.skx) * (J.DEG || Math.PI / 180));
  const s = finite(cam.s, 1), sx = s * finite(cam.sx, 1), sy = s * finite(cam.sy, 1);
  const a = co * sx, b = si * sx, c = (co * shear - si) * sy, d = (si * shear + co) * sy;
  return { a, b, c, d, e: W / 2 + offsetX + finite(cam.x) - a * W / 2 - c * H / 2,
    f: H / 2 + offsetY + finite(cam.y) - b * W / 2 - d * H / 2 };
};
J.inversePoint = (m, x, y) => {
  if (!m) return [x, y];
  const det = m.a * m.d - m.b * m.c;
  if (Math.abs(det) < 1e-8) return [x, y];
  x -= m.e; y -= m.f;
  return [(m.d * x - m.c * y) / det, (-m.b * x + m.a * y) / det];
};

J.adjustLocalReadability = (env, it) => {
  const ap = env && env.plan && env.plan.autoPalette, map = ap && ap.localMap;
  if (!ap || !ap.options || !ap.options.readability || !ap.analyzed || !map || env.pass !== 'main' || env.plan.keyBg || !env.plan.customBg?.enabled || !it || !it.text || it.fill === false) return it;
  const ctx = env.ctx, scale = Math.max(0.001, finite(env.scale, 1));
  let x = finite(it.x, env.W / 2), y = finite(it.y, env.H / 2);
  try {
    if (ctx.getTransform) {
      const t = ctx.getTransform();
      [x, y] = J.inversePoint(env.cameraMatrix, (t.a * x + t.c * y + t.e) / scale, (t.b * x + t.d * y + t.f) / scale);
    }
  } catch (e) {}
  const lay = J.layoutText(it), rx = clamp(Math.max(finite(it.size), finite(lay.W)) / env.W * map.width * 0.45, 1, 5), ry = clamp(Math.max(finite(it.size), finite(lay.H)) / env.H * map.height * 0.5, 1, 5);
  const local = J.sampleLocalLuma(map, x / env.W, y / env.H, rx, ry);
  const textColor = it.color || it.strokeColor || env.sc.fg || '#FFFFFF', ratio = contrast(textColor, local.luma);
  if (ratio >= 4.5 && local.detail < 0.3) return it;
  const textLight = hexLuma(textColor) > 0.48, channel = textLight ? '0,0,0' : '255,255,255';
  const severity = clamp((4.5 - ratio) / 4.5), busy = clamp((local.detail - 0.16) / 0.65);
  const alpha = clamp(0.24 + severity * 0.31 + busy * 0.15, 0.24, 0.66);
  const next = Object.assign({}, it);
  next.shadow = Object.assign({}, it.shadow || {}, { color: `rgba(${channel},${alpha.toFixed(2)})`, blur: Math.max(finite(it.shadow && it.shadow.blur), clamp(finite(it.size) * 0.018 + busy * 1.2, 1.2, 4.5)), dx: finite(it.shadow && it.shadow.dx), dy: finite(it.shadow && it.shadow.dy) });
  if (ratio < 2.15 && !it.stroke && it.size > 24) {
    next.stroke = clamp(it.size * 0.009, 0.55, 1.35);
    next.strokeColor = `rgba(${channel},${Math.min(0.48, alpha * 0.65).toFixed(2)})`;
  }
  if (ratio < 1.8 && local.detail > 0.48 && it.size > 26) {
    try {
      const g = ctx.createRadialGradient(it.x, it.y, 0, it.x, it.y, Math.max(lay.W, lay.H) * 0.82);
      g.addColorStop(0, `rgba(${channel},0.13)`); g.addColorStop(0.72, `rgba(${channel},0.055)`); g.addColorStop(1, `rgba(${channel},0)`);
      ctx.save(); ctx.fillStyle = g; ctx.fillRect(it.x - lay.W * 0.55, it.y - lay.H * 0.8, lay.W * 1.1, lay.H * 1.6); ctx.restore();
    } catch (e) {}
  }
  return next;
};

J.paletteContrast = contrast;
J.paletteLuma = hexLuma;
})();
