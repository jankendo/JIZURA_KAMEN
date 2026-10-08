/* Focused unit checks for custom-background geometry and render routing. Run with: node dev/background_test.js */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const calls = [];
const ctx2d = {
  save() {}, restore() {}, clearRect() {}, setTransform() {}, fillRect(...a) { calls.push(['fillRect', ...a]); },
  drawImage(...a) { calls.push(['drawImage', ...a, this.filter]); }, translate() {}, rotate() {}, scale() {}, transform() {},
  createRadialGradient() { return { addColorStop() {} }; }, createLinearGradient() { return { addColorStop() {} }; },
  measureText(s) { return { width: [...String(s)].length * 50 }; }, createImageData(w, h) { return { data: new Uint8ClampedArray(w * h * 4) }; },
  putImageData() {}, beginPath() {}, closePath() {}, moveTo() {}, lineTo() {}, quadraticCurveTo() {}, arc() {}, fill() {}, stroke() {},
  rect() {}, clip() {}, setLineDash() {}, fillText() {}, strokeText() {},
};
const window = {};
const document = {
  getElementById() { return null; },
  createElement() { return { getContext() { return ctx2d; } }; },
  head: { appendChild() {} },
  fonts: { load: async () => [], ready: Promise.resolve() },
};
let decodeCount = 0, bitmapCloseCount = 0;
const sandbox = vm.createContext({ console, document, window, Blob, TextEncoder, URL, setTimeout, clearTimeout, performance, requestAnimationFrame() {}, Image: function Image() {},
  fetch: async () => ({ ok: true, blob: async () => ({}) }),
  createImageBitmap: async () => { decodeCount++; return { width: 32, height: 18, close() { bitmapCloseCount++; } }; },
});
for (const file of fs.readdirSync(path.join(__dirname, '..', 'src')).filter(x => x.endsWith('.js')).sort()) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', file), 'utf8'), sandbox, { filename: file });
}
const J = window.J;
const closeTo = (actual, expected, msg) => assert.ok(Math.abs(actual - expected) < 0.02, `${msg}: expected ${expected}, received ${actual}`);
const renderer = Object.create(J.Renderer.prototype);
const image = { width: 1600, height: 900 };
renderer.customBgBitmap = image; renderer.filterOK = true;

function rectFor(W, H, fit, source = image, extra = {}, scale = 1) {
  calls.length = 0;
  const plan = { W, H, cuts: [], customBg: Object.assign({ fit, x: 50, y: 50, zoom: 1, darkness: 0, blur: 0 }, extra) };
  const target = { filter: 'none', globalAlpha: 1, save() {}, restore() {}, translate() {}, rotate() {}, scale() {}, transform() {}, drawImage(...a) { calls.push(['drawImage', ...a, this.filter]); }, fillRect(...a) { calls.push(['fillRect', this.globalAlpha, ...a]); } };
  renderer.customBgBitmap = source;
  renderer.drawCustomBackground(target, plan, 0, 0, 0, { bg: '#101010' }, scale, true);
  const draw = calls.find(c => c[0] === 'drawImage');
  assert.ok(draw, 'background image should be drawn');
  return { x: draw[2], y: draw[3], w: draw[4], h: draw[5], calls, target };
}

// Backward-compatible project defaults and the planned data that both exporters consume.
const legacy = Object.assign(J.defaultProject(), { customBg: undefined, keyBg: 'off' });
const legacyPlan = J.plan(legacy, null);
assert.equal(legacyPlan.customBg.enabled, false);
const project = J.defaultProject();
project.customBg = { enabled: true, dataUrl: 'data:image/webp;base64,AA==', filename: 'cover.webp', fit: 'contain', x: 20, y: 80, zoom: 1.5, darkness: 0.5, blur: 10 };
const plan = J.plan(project, null);
assert.equal(plan.customBg.fit, 'contain');
assert.equal(plan.customBg.dataUrl, project.customBg.dataUrl);
assert.equal(J.planForAE(plan, project).customBg.dataUrl, project.customBg.dataUrl);
project.keyBg = 'green';
assert.equal(J.plan(project, null).keyBg, 'green');

// Cover, portrait crop, contain, zoom anchoring, and an ultrawide output.
let r = rectFor(1920, 1080, 'cover');
closeTo(r.x, 0, '16:9 cover x'); closeTo(r.y, 0, '16:9 cover y'); closeTo(r.w, 1920, '16:9 cover width'); closeTo(r.h, 1080, '16:9 cover height');
r = rectFor(1080, 1920, 'cover');
closeTo(r.x, (1080 - 1600 * (1920 / 900)) / 2, 'portrait cover center crop'); closeTo(r.y, 0, 'portrait cover vertical fill');
r = rectFor(1920, 1080, 'contain', { width: 900, height: 1600 });
closeTo(r.x, (1920 - 900 * (1080 / 1600)) / 2, 'contain horizontal centering'); closeTo(r.h, 1080, 'contain full source height');
r = rectFor(1920, 1080, 'contain', { width: 900, height: 1600 }, { zoom: 1.5 });
closeTo(r.w, 900 * (1080 / 1600) * 1.5, '150% zoom'); closeTo(r.x, (1920 - r.w) / 2, 'zoom stays centered by default');
r = rectFor(2520, 1080, 'cover', { width: 1000, height: 1000 });
closeTo(r.w, 2520, '21:9 cover width'); assert.ok(r.h > 1080, 'square image should crop vertically to ultrawide');
r = rectFor(2520, 1080, 'cover', image, { blur: 10 }, 2);
assert.ok(r.calls.some(c => c[0] === 'drawImage' && c[6] === 'blur(20.0px)'), 'blur follows the 4K output scale');
assert.deepEqual(Array.from(J.outputSize({ aspect: '21:9', res: 2160 })), [5040, 2160], '21:9 4K export dimensions');
r = rectFor(1920, 1080, 'cover', image, { x: 100, darkness: 0.5, blur: 10 });
assert.ok(r.x < (1920 - r.w) / 2, 'X position should move the visible crop to the right side');
assert.ok(r.calls.some(c => c[0] === 'drawImage' && c[6] === 'blur(10.0px)'), 'background blur is applied while drawing the image');
assert.ok(r.calls.some(c => c[0] === 'fillRect' && c[1] === 0.5), 'darkness is painted over the image area');

// The frame renderer must omit custom backgrounds for transparency and chroma-key modes.
renderer.customBgBitmap = image;
renderer.filterOK = true;
renderer.paperCache = new Map();
const framePlan = customBg => ({ W: 1920, H: 1080, fps: 24, duration: 1, cuts: [], events: [], beats: [],
  style: { schemes: [{ bg: '#202020', fg: '#fff' }], texture: { paper: 0 }, glow: 0 },
  fx: { motion: 0.7, glitch: 0, chroma: 0, texture: 0, flash: false, koma: 0, onTwos: false },
  keyBg: null, customBg, hud: false, lang: 'ja' });
const makeTarget = () => ({ canvas: { width: 1920, height: 1080 }, filter: 'none', globalAlpha: 1, globalCompositeOperation: 'source-over',
  save() {}, restore() {}, setTransform() {}, clearRect() {}, fillRect(...a) { calls.push(['fillRect', this.globalAlpha, ...a]); }, drawImage(...a) { calls.push(['drawImage', ...a, this.filter]); },
  createRadialGradient() { return { addColorStop() {} }; } });
calls.length = 0;
renderer.frame(makeTarget(), framePlan({ enabled: true, fit: 'cover', x: 50, y: 50, zoom: 1, darkness: 0.2, blur: 0 }), 0, { noPost: true, noHud: true });
assert.ok(calls.some(c => c[0] === 'drawImage' && c[1] === image), 'custom image should render in a normal frame');
calls.length = 0;
renderer.frame(makeTarget(), framePlan({ enabled: true, dataUrl: 'data:image/webp;base64,AA==' }), 0, { transparent: true, noPost: true, noHud: true });
assert.ok(!calls.some(c => c[0] === 'drawImage' && c[1] === image), 'transparent PNG frame must omit the custom image');
calls.length = 0;
const keyed = framePlan({ enabled: true, dataUrl: 'data:image/webp;base64,AA==' }); keyed.keyBg = 'green';
renderer.frame(makeTarget(), keyed, 0, { noPost: true, noHud: true });
assert.ok(!calls.some(c => c[0] === 'drawImage' && c[1] === image), 'green-screen render must override the custom image');
const creditPlan = framePlan({ enabled: false });
creditPlan.titleDisplay = { title: '作品', artist: '作者', color: '#FFFFFF', font: 'mono', opacity: .42,
  position: 'bl', W: 1920, H: 1080, marginX: 86, marginY: 54, titleSize: 20, maxWidth: 600, detail: 0 };
const creditTarget = makeTarget();
creditTarget.measureText = t => ({ width: t.length * 20 });
creditTarget.fillText = (t, x, y) => calls.push(['credit', t, x, y]);
for (const t of [0.8, 20]) {
  calls.length = 0;
  renderer.frame(creditTarget, creditPlan, t, { noPost: true });
  assert.equal(calls.filter(c => c[0] === 'credit').length, 2, 'both labels persist across song sections');
  calls.length = 0;
  renderer.frame(creditTarget, creditPlan, t, { transparent: true, noPost: true });
  assert.equal(calls.filter(c => c[0] === 'credit').length, 2, 'transparent PNG retains the credit');
}
const routing = Object.create(J.Renderer.prototype);
routing.filterOK = false;
routing.post = () => calls.push(['post']);
routing.keyFinish = () => calls.push(['key']);
routing.drawTitleCredit = () => calls.push(['credit']);
const routed = framePlan({ enabled: false }); routed.keyBg = 'green'; routed.titleDisplay = creditPlan.titleDisplay;
calls.length = 0;
routing.frame(makeTarget(), routed, .8, {});
assert.deepEqual(calls.filter(c => ['post', 'key', 'credit'].includes(c[0])).map(c => c[0]), ['post', 'key', 'credit'],
  'credit is composited after post and green/black key conversion');

(async () => {
  const cache = Object.create(J.Renderer.prototype);
  await assert.rejects(cache.loadCustomBackground('https://example.invalid/remote.jpg'), /画像を読み込めませんでした/, 'background imports must not fetch remote image URLs');
  assert.equal(decodeCount, 0, 'remote sources are rejected before decode');
  const first = await cache.loadCustomBackground('data:image/webp;base64,AA==');
  assert.equal(decodeCount, 1, 'load decodes the source once');
  assert.equal(await cache.loadCustomBackground('data:image/webp;base64,AA=='), first, 'same source reuses the cached bitmap');
  assert.equal(decodeCount, 1, 'reusing the source does not decode it again');
  await cache.loadCustomBackground('data:image/webp;base64,AQ==');
  assert.equal(bitmapCloseCount, 1, 'replacing an image releases the old bitmap');
  await cache.loadCustomBackground('');
  assert.equal(bitmapCloseCount, 2, 'clearing an image releases the cached bitmap');
  console.log('Custom background tests passed.');
})().catch(error => { console.error(error); process.exitCode = 1; });
