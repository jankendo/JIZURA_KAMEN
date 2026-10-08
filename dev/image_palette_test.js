/* Local, deterministic image palette and readability checks. Run with: node dev/image_palette_test.js */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function pixelCanvas(width, height) {
  const canvas = { data: new Uint8ClampedArray(Math.max(0, width * height * 4)) };
  let cw = width, ch = height;
  Object.defineProperties(canvas, {
    width: { get() { return cw; }, set(v) { cw = +v; canvas.data = new Uint8ClampedArray(Math.max(0, cw * ch * 4)); } },
    height: { get() { return ch; }, set(v) { ch = +v; canvas.data = new Uint8ClampedArray(Math.max(0, cw * ch * 4)); } },
  });
  const ctx = { fillStyle: '#000000', globalAlpha: 1, filter: 'none', stack: [],
    save() { this.stack.push([this.fillStyle, this.globalAlpha, this.filter]); },
    restore() { [this.fillStyle, this.globalAlpha, this.filter] = this.stack.pop() || ['#000000', 1, 'none']; },
    fillRect(x, y, w, h) {
      const hex = /^#([0-9a-f]{6})$/i.exec(this.fillStyle || '')?.[1] || '000000';
      const color = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
      const xa = Math.max(0, Math.floor(x)), xb = Math.min(canvas.width, Math.ceil(x + w));
      const ya = Math.max(0, Math.floor(y)), yb = Math.min(canvas.height, Math.ceil(y + h));
      for (let py = ya; py < yb; py++) for (let px = xa; px < xb; px++) {
        const i = (py * canvas.width + px) * 4, a = this.globalAlpha;
        for (let c = 0; c < 3; c++) canvas.data[i + c] = Math.round(color[c] * a + canvas.data[i + c] * (1 - a));
        canvas.data[i + 3] = 255;
      }
    },
    drawImage(image, dx, dy, dw, dh) {
      const sw = image.width, sh = image.height, src = image.data;
      if (!src) return;
      for (let py = Math.max(0, Math.floor(dy)); py < Math.min(canvas.height, Math.ceil(dy + dh)); py++) {
        for (let px = Math.max(0, Math.floor(dx)); px < Math.min(canvas.width, Math.ceil(dx + dw)); px++) {
          const sx = Math.max(0, Math.min(sw - 1, Math.floor((px + 0.5 - dx) / dw * sw)));
          const sy = Math.max(0, Math.min(sh - 1, Math.floor((py + 0.5 - dy) / dh * sh)));
          const si = (sy * sw + sx) * 4, di = (py * canvas.width + px) * 4;
          for (let c = 0; c < 4; c++) canvas.data[di + c] = src[si + c];
        }
      }
    },
    getImageData() { return { data: canvas.data }; },
    createRadialGradient() { return { addColorStop() {} }; },
  };
  canvas.getContext = () => ctx;
  return canvas;
}
const document = { getElementById() { return null; }, createElement(name) { return name === 'canvas' ? pixelCanvas(1, 1) : {}; },
  fonts: { load: async () => [], ready: Promise.resolve() }, head: { appendChild() {} } };
const sandbox = vm.createContext({ console, document, window: {}, Blob, TextEncoder, URL, setTimeout, clearTimeout, performance, requestAnimationFrame() {}, Image: function Image() {},
  fetch: async () => ({ ok: true, blob: async () => ({}) }), createImageBitmap: async () => ({ width: 8, height: 8, close() {} }) });
for (const file of fs.readdirSync(path.join(__dirname, '..', 'src')).filter(x => x.endsWith('.js')).sort()) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8'), sandbox, { filename: file });
}
const J = sandbox.window.J;
const solid = (w, h, rgb) => {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) { data[i * 4] = rgb[0]; data[i * 4 + 1] = rgb[1]; data[i * 4 + 2] = rgb[2]; data[i * 4 + 3] = 255; }
  return { width: w, height: h, data };
};
const paint = (image, x, y, rgb) => { const i = (y * image.width + x) * 4; image.data.set([...rgb, 255], i); };
const colorHue = hex => {
  const [r, g, b] = [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255);
  const hi = Math.max(r, g, b), lo = Math.min(r, g, b), d = hi - lo;
  if (!d) return 0;
  let h = hi === r ? ((g - b) / d) % 6 : hi === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return (h * 60 + 360) % 360;
};
const analyze = image => J.analyzeImagePixels(image.width, image.height, image.data);

// Dark night and snow scenes should select opposite, high-contrast lyric colors.
const night = analyze(solid(48, 32, [12, 19, 34]));
const snow = analyze(solid(48, 32, [239, 242, 244]));
assert.ok(J.paletteLuma(night.palette.fg) > 0.8, 'dark images should choose a light foreground');
assert.ok(J.paletteLuma(snow.palette.fg) < 0.2, 'bright images should choose a dark foreground');
assert.ok(J.paletteContrast(night.palette.fg, night.stats.median) >= 4.5, 'night foreground should meet 4.5:1 at the median');
assert.ok(J.paletteContrast(snow.palette.fg, snow.stats.median) >= 4.5, 'snow foreground should meet 4.5:1 at the median');

// Deterministic clustering covers warmth, blue scenes, grayscale restraint, and neon color.
const sunset = solid(48, 32, [222, 83, 40]);
for (let y = 0; y < sunset.height; y++) for (let x = 24; x < sunset.width; x++) paint(sunset, x, y, [255, 175, 70]);
const sunsetResult = analyze(sunset);
assert.ok(sunsetResult.stats.warmth > 0.55, 'sunset should be classified as warm');
assert.ok(['emotional', 'pop', 'graphic'].includes(sunsetResult.mood), 'warm vivid scene should select a matching mood');
const oceanPixels = solid(48, 32, [25, 93, 150]);
const ocean = analyze(oceanPixels);
assert.ok(J.paletteContrast(ocean.palette.accent, ocean.stats.median) >= 2.4, 'blue scene accent should remain distinct from its median');
const gray = analyze(solid(48, 32, [128, 128, 128]));
const grayRgb = [1, 3, 5].map(i => parseInt(gray.palette.accent.slice(i, i + 2), 16));
assert.ok(Math.max(...grayRgb) - Math.min(...grayRgb) < 160, 'grayscale should produce a restrained accent');
const neon = solid(48, 32, [18, 16, 44]);
for (let y = 0; y < neon.height; y++) for (let x = 12; x < 24; x++) paint(neon, x, y, [20, 240, 209]);
for (let y = 0; y < neon.height; y++) for (let x = 24; x < 36; x++) paint(neon, x, y, [240, 27, 173]);
assert.ok(analyze(neon).stats.chroma > 0.12, 'neon scene should retain its high chroma');
assert.equal(JSON.stringify(analyze(oceanPixels)), JSON.stringify(analyze(oceanPixels)), 'the same pixels must return the same result');

// Tiny LED-like red outliers must not steer a blue palette; a large skin-like cluster is deprioritized.
const blueWithLed = solid(100, 60, [16, 72, 126]);
for (let y = 0; y < 6; y++) for (let x = 0; x < 10; x++) paint(blueWithLed, x, y, [245, 18, 32]);
assert.ok(colorHue(analyze(blueWithLed).palette.accent) > 150, 'a 1% red outlier should not dominate a blue image palette');
const portrait = solid(100, 60, [207, 151, 110]);
for (let y = 0; y < 60; y++) for (let x = 65; x < 85; x++) paint(portrait, x, y, [20, 169, 157]);
const portraitResult = analyze(portrait);
assert.ok(portraitResult.clusters.some(c => c.skinLike), 'large skin-like clusters should be detected');
assert.ok(colorHue(portraitResult.palette.accent) > 140, 'a vivid secondary cluster should outrank a large skin-like region');

// Bright/dark local regions and detail are recorded in a compact map for per-item sampling.
const split = solid(96, 48, [0, 0, 0]);
for (let y = 0; y < 48; y++) for (let x = 48; x < 96; x++) paint(split, x, y, [255, 255, 255]);
const splitMap = J.localLumaMap(split.width, split.height, split.data);
assert.ok(J.sampleLocalLuma(splitMap, 0.05, 0.5).luma < 0.05, 'left local sample should stay dark');
assert.ok(J.sampleLocalLuma(splitMap, 0.95, 0.5).luma > 0.95, 'right local sample should stay bright');
assert.ok(splitMap.width <= 32 && splitMap.height <= 24 && splitMap.values.length === splitMap.width * splitMap.height * 2, 'local map storage must remain bounded');
const noisy = solid(48, 32, [30, 30, 30]);
for (let y = 0; y < 32; y++) for (let x = 0; x < 48; x++) if ((x + y) % 2) paint(noisy, x, y, [225, 225, 225]);
assert.ok(J.analyzeImagePixels(noisy.width, noisy.height, noisy.data).stats.detail > night.stats.detail, 'busy imagery should have more detail than a flat scene');

// The same geometry drives palette sampling and rendering for crop/position/zoom/fit.
const cover = J.customBgGeometry(200, 100, 100, 100, { fit: 'cover', x: 50, y: 50, zoom: 1 });
assert.equal(cover.x, -50); assert.equal(cover.y, 0); assert.equal(cover.w, 200);
const contain = J.customBgGeometry(200, 100, 100, 100, { fit: 'contain', x: 50, y: 50, zoom: 1 });
assert.equal(contain.x, 0); assert.equal(contain.y, 25); assert.equal(contain.w, 100); assert.equal(contain.h, 50);
const panorama = solid(200, 100, [220, 30, 30]);
for (let y = 0; y < 100; y++) for (let x = 100; x < 200; x++) paint(panorama, x, y, [25, 45, 225]);
const project = J.defaultProject(); project.aspect = '1:1'; project.customBg = { enabled: true, fit: 'cover', x: 0, y: 50, zoom: 1, darkness: 0, blur: 0 };
const leftCapture = J.captureCustomBackground(panorama, project, '#111114', 64);
project.customBg.x = 100;
const rightCapture = J.captureCustomBackground(panorama, project, '#111114', 64);
const meanRed = d => { let n = 0; for (let i = 0; i < d.length; i += 4) n += d[i]; return n / (d.length / 4); };
assert.ok(meanRed(leftCapture.data) > meanRed(rightCapture.data) + 80, 'cover position must change sampled colors to match the visible crop');
assert.notEqual(J.autoPaletteViewportKey(project), J.autoPaletteViewportKey(Object.assign({}, project, { customBg: Object.assign({}, project.customBg, { fit: 'contain' }) })), 'fit mode belongs in the viewport cache key');
const repeatProject = J.defaultProject(); repeatProject.aspect = '1:1'; repeatProject.customBg = { enabled: true, fit: 'contain', x: 50, y: 50, zoom: 1, darkness: 0.2, blur: 0 };
const preliminary = J.analyzeCustomBackground(panorama, repeatProject);
repeatProject.customBg.darkness = preliminary.suggestedDarkness;
const firstAnalysis = J.analyzeCustomBackground(panorama, repeatProject);
J.applyImagePalette(repeatProject, firstAnalysis, { palette: true, readability: true, mood: true });
const repeatedAnalysis = J.analyzeCustomBackground(panorama, repeatProject);
assert.equal(JSON.stringify(firstAnalysis.palette), JSON.stringify(repeatedAnalysis.palette), 'contain margins must not make same-image reanalysis drift');

// Conditional readability compensation: busy, low-contrast placements get a small treatment only.
const oldLayout = J.layoutText;
J.layoutText = () => ({ W: 300, H: 80 });
let radialCalls = 0;
const ctx = { getTransform: () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 }), createRadialGradient() { radialCalls++; return { addColorStop() {} }; }, save() {}, restore() {}, fillRect() {} };
const readabilityPlan = { autoPalette: { enabled: true, analyzed: true, options: { readability: true }, localMap: { width: 24, height: 16, values: Array(24 * 16).fill(0).flatMap(() => [1, 0.9]) } }, keyBg: null, customBg: { enabled: true } };
const env = { plan: readabilityPlan, pass: 'main', ctx, scale: 1, W: 1920, H: 1080, sc: { fg: '#F7F4EF' }, cameraMatrix: J.cameraMatrix(1920, 1080, {}), draw: null };
const hardToRead = { x: 960, y: 540, size: 80, text: 'LYRIC', font: 'sans', color: '#F7F4EF', fill: true };
const adjusted = J.adjustLocalReadability(env, hardToRead);
assert.ok(adjusted.shadow && adjusted.stroke, 'low contrast should get a shadow and a very fine stroke');
assert.ok(radialCalls > 0, 'very busy low-contrast locations may receive a soft local scrim');
readabilityPlan.keyBg = 'green';
assert.equal(J.adjustLocalReadability(env, hardToRead), hardToRead, 'key backgrounds must bypass image readability treatment');
J.layoutText = oldLayout;

// Persisted palette, old project defaults, manual invalidation, Omakase and key-mode compatibility.
const oldProject = J.defaultProject(); delete oldProject.autoPalette; oldProject.lyrics = 'legacy lyrics';
assert.equal(J.plan(oldProject, null).autoPalette.analyzed, false, 'old JSON without autoPalette must remain valid');
const paletteProject = J.defaultProject(); paletteProject.customBg.enabled = true;
J.applyImagePalette(paletteProject, Object.assign({}, night, { sourceHash: 'night-hash', viewportKey: J.autoPaletteViewportKey(paletteProject) }), { palette: true, readability: true, mood: true });
assert.equal(paletteProject.autoPalette.enabled, true);
assert.equal(J.resolveStyle(paletteProject).schemes[0].fg, paletteProject.autoPalette.palette.fg, 'resolved palette must carry to renderer plans');
assert.equal(J.plan(paletteProject, null).autoPalette.sourceHash, 'night-hash', 'renderer plan must carry analyzed data for both exporters');
const savedColors = JSON.stringify(paletteProject.autoPalette.originalColors), savedStyle = paletteProject.autoPalette.originalLook.style;
J.setImagePaletteOption(paletteProject, 'palette', false);
assert.equal(paletteProject.autoPalette.enabled, false);
assert.equal(JSON.stringify(paletteProject.colors), savedColors, 'disabling image colors should restore the previous manual palette');
J.setImagePaletteOption(paletteProject, 'palette', true);
assert.equal(paletteProject.autoPalette.enabled, true);
J.setImagePaletteOption(paletteProject, 'mood', false);
assert.equal(paletteProject.style, savedStyle, 'disabling mood matching should restore the original style');
J.setImagePaletteOption(paletteProject, 'mood', true);
const colorsBeforeOmakase = JSON.stringify(paletteProject.colors);
for (let i = 0; i < 5; i++) { const r = J.omakase(paletteProject, () => 0.371); assert.equal(JSON.stringify(r.colors), colorsBeforeOmakase, 'Omakase must preserve image-derived colors'); }
paletteProject.keyBg = 'green';
assert.equal(J.resolveStyle(paletteProject).schemes[0].fg, '#FFFFFF', 'green screen monochrome must override the image palette');
paletteProject.keyBg = 'black';
assert.equal(J.resolveStyle(paletteProject).schemes[0].accent, '#FFFFFF', 'black key mode must stay monochrome');
paletteProject.keyBg = 'off';
const beforeColors = JSON.stringify(paletteProject.autoPalette.originalColors);
const beforeStyle = paletteProject.autoPalette.originalLook.style;
paletteProject.autoPalette.darknessManual = true;
J.invalidateAutoPalette(paletteProject);
assert.equal(paletteProject.autoPalette.analyzed, false, 'image replacement must invalidate the previous analysis');
assert.equal(JSON.stringify(paletteProject.colors), beforeColors, 'automatically generated colors should not survive a replaced image');
assert.equal(paletteProject.autoPalette.darknessManual, true, 'manual darkness preference must survive image replacement');
assert.equal(paletteProject.style, beforeStyle, 'image replacement should remove the old automatic mood look');
const handTuned = J.defaultProject();
J.applyImagePalette(handTuned, Object.assign({}, night, { sourceHash: 'night-hash' }), { palette: true, readability: true, mood: true });
handTuned.style = 'transit'; handTuned.autoPalette.lookModified = true;
J.invalidateAutoPalette(handTuned);
assert.equal(handTuned.style, 'transit', 'image replacement must preserve a style the user changed after analysis');
const manualDarkness = J.defaultProject(); manualDarkness.customBg.darkness = 0.47; manualDarkness.autoPalette.darknessManual = true;
J.applyImagePalette(manualDarkness, Object.assign({}, night, { suggestedDarkness: 0.08 }), { palette: true, readability: true, mood: true });
assert.equal(manualDarkness.customBg.darkness, 0.47, 'analysis must keep a manually selected darkness value');

console.log('Image palette tests passed (20 scenario groups).');
