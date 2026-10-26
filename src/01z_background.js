/* Background geometry and saved palette metadata normalization. No retired optimizer. */
(()=>{'use strict';const clamp=(v,a=0,b=1)=>J.clamp(v,a,b),finite=(v,d=0)=>Number.isFinite(+v)?+v:d;
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

})();
