/* Audio + image direction and imported LRC integration. Run: node dev/auto_direction_lrc_test.js */
'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const window = {}, document = { getElementById() { return null; }, createElement() { return { getContext() { return { measureText(s) { return { width: String(s).length * 20 }; } }; } }; }, fonts: { load: async () => [], ready: Promise.resolve() }, head: { appendChild() {} } };
const context = vm.createContext({ window, document, console, Blob, TextEncoder, URL, setTimeout, clearTimeout, performance, requestAnimationFrame() {} });
for (const name of fs.readdirSync(path.join(__dirname, '../src')).filter(x => x.endsWith('.js')).sort()) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../src', name), 'utf8'), context, { filename: name });
}
const J = window.J;
const lrc = '\uFEFF[ti:遠い光]\r\n[ar:作者]\r\n[offset:-250]\r\n[length:03:12]\r\n[00:01.50][00:04.500]あさの光\r\n[00:08.30]歩いていこう';
const imported = J.importLRC(lrc), project = J.defaultProject();
assert.equal(imported.count, 3);
assert.equal(imported.title, '遠い光');
assert.equal(imported.artist, '作者');
project.lyrics = imported.lyrics;
const parsed = J.parseLyrics(project.lyrics);
assert.deepEqual(Array.from(parsed.lines, l => l.lrc), [1.25, 4.25, 8.05]);
assert.deepEqual(Array.from(parsed.lines, l => l.text), ['あさの光', 'あさの光', '歩いていこう']);
assert.deepEqual(Array.from(J.computeTiming(project, parsed, null).starts), [1.25, 4.25, 8.05]);
assert.equal(J.plan(project, null).title, '', 'an empty title field stays empty');
project.title = imported.title; project.artist = imported.artist;
assert.equal(J.plan(project, null).title, '遠い光');
assert.throws(() => J.importLRC('普通の歌詞だけ'), /時刻付き/);
assert.throws(() => J.importLRC('[00:01]歌詞\n時刻なし'), /時刻付き/);
assert.equal(JSON.parse(JSON.stringify(project)).lyrics, project.lyrics);
assert.equal(J.defaultProject().lang, 'ja');

const calm = J.audioFeatures(Float32Array.from(Array(300).fill(.38)), Float32Array.from(Array(300).fill(0)), 78, 6);
const active = J.audioFeatures(Float32Array.from(Array.from({ length: 300 }, (_, i) => i < 150 ? .28 : .94)),
  Float32Array.from(Array.from({ length: 300 }, (_, i) => i % 9 === 0 ? .8 : 0)), 152, 6);
assert.ok(active.density > calm.density);
assert.ok(active.dynamics > calm.dynamics);
assert.ok(active.development > calm.development);
const dark = { median: .1, chroma: .11, warmth: .32, contrast: .2, detail: .12 };
const bright = { median: .86, chroma: .75, warmth: .8, contrast: .65, detail: .25 };
const a = J.proposeDirection(project, { name: 'soft.wav', duration: 90, features: calm }, dark);
const b = J.proposeDirection(project, { name: 'hard.wav', duration: 90, features: active }, bright);
assert.equal(a.seed, J.proposeDirection(project, { name: 'soft.wav', duration: 90, features: calm }, dark).seed);
assert.notEqual(a.mood, b.mood, 'contrasting media must affect the proposed atmosphere');
assert.notEqual(a.fx.density, b.fx.density, 'arrangement must affect cut density');
assert.equal(a.signals.audio, true);
assert.equal(J.proposeDirection(project, null, dark).signals.audio, false);
assert.equal(J.proposeDirection(project, { name: 'soft.wav', duration: 90, features: calm }, null).signals.image, false);
project.overrides = { 0: { lock: true, layout: 'center' }, 1: { layout: 'huge' } };
assert.deepEqual(Object.keys(J.proposeDirection(project, null, dark).overrides), ['0']);
Object.assign(project, { style: b.style, mood: b.mood, fx: b.fx, enabled: b.enabled, seed: b.seed });
const planned = J.plan(project, { duration: 90, beats: [], energy: Float32Array.of(.25, .9), energyRate: 50 });
assert.equal(planned.styleKey, b.style);
assert.ok(planned.cuts.length > 0);
assert.ok(planned.energy);
assert.equal(J.planForAE(planned, project).styleKey, b.style);
console.log('Auto direction and LRC integration passed.');

// A film-level profile carries a fixed vocabulary; sections change strength, not style.
const songEnergy = Float32Array.from(Array.from({ length: 4500 }, (_, i) => i < 1300 || i > 3500 ? .23 : .92));
const song = { name: 'demo.wav', duration: 90, bpm: 128, energy: songEnergy, energyRate: 50, features: active, beats: [] };
const proposal = J.proposeDirection(project, song, dark);
Object.assign(project, { style: proposal.style, mood: proposal.mood, fx: proposal.fx, enabled: proposal.enabled,
  seed: proposal.seed, fonts: {}, autoDirection: true, title: 'タイトル', artist: 'アーティスト', overrides: proposal.overrides });
project.artDirection = J.makeArtDirection(project, song, proposal);
const profile = project.artDirection;
assert.equal(profile.style, proposal.style);
assert.equal(profile.mood, proposal.mood);
assert.ok(profile.sectionProfiles.some(s => s.intensity < .4));
assert.ok(profile.sectionProfiles.some(s => s.intensity > .7));
assert.ok(profile.sectionProfiles.every(s => s.intensity >= 0 && s.intensity <= 1));
assert.equal(J.makeArtDirection(project, song, proposal).intensityCurve.join(','), profile.intensityCurve.join(','));
assert.ok(profile.vocabulary.enter.length <= 6);
const directedPlan = J.plan(project, song);
assert.equal(directedPlan.titleDisplay.title, 'タイトル');
assert.equal(directedPlan.titleDisplay.artist, 'アーティスト');
assert.ok(directedPlan.cuts.every(c => c.scheme === 0));
assert.equal(J.inspectDirection(directedPlan).violations.length, 0);
for (const aspect of ['16:9', '9:16', '4:3', '3:4', '1:1', '4:5', '21:9']) {
  project.aspect = aspect;
  const item = J.plan(project, song).titleDisplay;
  assert.ok(item.marginX >= item.W * .04);
  assert.ok(item.marginY >= item.H * .045);
  const relSize=item.titleSize/Math.min(item.W,item.H);
  assert.ok(relSize >= (item.H>item.W?.04:.06) && relSize <= (item.H>item.W?.058:.09));
}
project.aspect = '16:9';
project.titleDisplay = { enabled: false };
assert.equal(J.plan(project, song).titleDisplay, null);
const paletteMap = lum => ({ width: 12, height: 8, values: Array(12 * 8).fill(0).flatMap(() => [lum, .03]) });
project.title = '題'; project.artist = '作者';
project.titleDisplay = { enabled: true, position: 'auto', opacity: .42, autoColor: true };
project.autoPalette = Object.assign(J.emptyAutoPalette(), { analyzed: true, enabled: true,
  palette: { fg: '#FFFFFF', accent: '#FFAA00', bg: '#333333' }, localMap: paletteMap(.92) });
assert.equal(J.plan(project, song).titleDisplay.color, '#161719', 'bright corners get dark credits');
project.autoPalette.localMap = paletteMap(.03);
assert.equal(J.plan(project, song).titleDisplay.color, '#F6F5F2', 'dark corners get light credits');
project.autoPalette = J.emptyAutoPalette();
const japaneseLines = J.splitLines('遠くにいる君を、忘れない。ずっと！', 6).split('\n');
assert.ok(japaneseLines.slice(1).every(line => !/^[、。！？」』）]/.test(line)), 'no forbidden punctuation starts a line');

for (const [label, music, image] of [
  ['ballad', calm, dark], ['dance', active, dark],
  ['pop', Object.assign({}, active, { bpm: 128, density: .55, intensity: .84 }), bright],
  ['rock', Object.assign({}, active, { bpm: 110, density: .3, dynamics: .6 }), { ...bright, chroma: .33, detail: .58 }],
]) {
  const input = Object.assign(J.defaultProject(), { lyrics: imported.lyrics, customBg: { enabled: true } });
  const a = J.proposeDirection(input, { duration: 90, features: music }, image);
  Object.assign(input, { style: a.style, mood: a.mood, fx: a.fx, enabled: a.enabled, seed: a.seed, autoDirection: true });
  input.artDirection = J.makeArtDirection(input, { duration: 90, features: music }, a);
  const film = J.plan(input, null);
  assert.equal(J.inspectDirection(film).coherent, true, label + ' cuts must obey their shared vocabulary');
  assert.ok(J.inspectDirection(film).vocabularySize <= 40, label + ' uses a restrained visual vocabulary');
}
project.titleDisplay = { enabled: true, position: 'auto', opacity: .42, autoColor: true };
const brightCredit = J.planTitleDisplay(project, '題', '作者', J.STYLES[project.style], 1920, 1080);
assert.ok(brightCredit);
project.title = ''; project.artist = '';
assert.equal(J.plan(project, song).titleDisplay, null);

const draws = [];
const c = { canvas: { width: 1920, height: 1080 }, save() {}, restore() {}, setTransform() {},
  measureText(t) { return { width: [...t].length * 15 }; }, fillText(s, x, y) { draws.push({ s, x, y, alpha: this.globalAlpha }); } };
const renderer = Object.create(J.Renderer.prototype);
renderer.drawTitleCredit(c, { titleDisplay: Object.assign({}, brightCredit, { title: 'あ'.repeat(100), artist: 'い'.repeat(100) }) }, 4, 1);
assert.equal(draws.length, 2);
assert.ok(draws[0].s.endsWith('…') && draws[1].s.endsWith('…'));
assert.ok(draws.every(d => d.x >= brightCredit.marginX && d.x <= 1920 - brightCredit.marginX));
assert.ok(draws[0].alpha <= .5 && draws[1].alpha < draws[0].alpha);
console.log('Art direction and persistent credit tests passed.');
