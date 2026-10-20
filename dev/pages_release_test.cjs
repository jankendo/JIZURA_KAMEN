'use strict';
// Synthetic adapter fixtures only: no real MP4, CI run or release certification.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const zlib = require('node:zlib');
const {execFileSync} = require('node:child_process');
const {sha} = require('./release_gates.cjs');
const {evidenceReader, assertRun, inspectBundle, fileHash, verifyMedia} = require('./pages_release.cjs');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'kamen-pages-release-'));
const target = 'a'.repeat(40), hash = 'b'.repeat(64);
let sequence = 0, checks = 0;
function ref(value, extension = '.json') {
  // An ftyp header exercises media-vs-JSON routing, never actual MP4 decoding.
  const bytes = extension === '.mp4' ? Buffer.concat([Buffer.from([0, 0, 0, 8]), Buffer.from('ftyp'), Buffer.from(value)]) : Buffer.from(JSON.stringify(value));
  const name = `fixture-${sequence++}${extension}`;
  fs.writeFileSync(path.join(root, name), bytes);
  return {path: name, sha256: sha(bytes)};
}
const record = data => ref({sourceCommit: target, ...data});
const read = reference => JSON.parse(fs.readFileSync(path.join(root, reference.path)));
function fixture() {
  const outputProfile = {resolution: [64, 64], fps: 10, range: [0, .4]};
  const media = ref('synthetic movie; never decoded or counted as release evidence', '.mp4');
  const binding = {sourceCommit: target, rendererVersion: hash, inputHash: hash, planHash: hash, outputProfile, videoSHA256: media.sha256};
  const decoded = {sourceCommit: target, ...binding, selectedCandidateId: 'selected', videoSHA256: media.sha256, codecVideo: 'h264', codecAudio: 'aac', decodeExitCode: 0, decodeComplete: true};
  const original = record({...decoded, binding, media, videoFrameCount: 4, decodedRGBA_SHA256: hash});
  function movie(label) {
    const bytes = ref(`synthetic ${label}`, '.mp4');
    return {hash: bytes.sha256, reference: record({binding: {...binding, videoSHA256: bytes.sha256}, videoSHA256: bytes.sha256, codecVideo: 'h264', decodeComplete: true, decodeExitCode: 0, decodedRGBA_SHA256: sha(Buffer.from(label)), media: bytes})};
  }
  const control = movie('control'), repeat = movie('repeat');
  const contract = {intentId: 'dynamic', proofType: 'DYNAMIC', binding, target: {id: 'primary', layer: 'PRIMARY_LYRIC'}, from: 0, to: .4, semanticModel: {units: 'OUTPUT_PIXELS', expectedSamples: [0, .1, .2].map((t, i) => ({actualDecodedTimestamp: t, vector: [i + 1, 0]}))}};
  const measurement = record({intentId: 'dynamic', proofType: 'DYNAMIC', binding, targetId: 'primary', contractSHA256: sha(Buffer.from(JSON.stringify(contract))), decodedPixels: true, movie: original, isolatedControl: true, controlVideoSHA256: control.hash, repeatVideoSHA256: repeat.hash, controlMovie: control.reference, repeatMovie: repeat.reference, actualDecodedTimestamp: .2, measuredValues: [1, 2], independentRepeat: true, originalNativeIdentity: true, originalDecodedIdentity: true, repeatNativeIdentity: true, targetModelPassed: true, semanticSamples: contract.semanticModel.expectedSamples.map(sample => ({...sample, targetId: 'primary', nativeExpectedVector: sample.vector, observedVector: sample.vector, repeatVector: sample.vector}))});
  const comparisonMovies = [original, record({...decoded, sourceCommit: 'c'.repeat(40)}), record({...decoded, sourceCommit: 'd'.repeat(40)})].map((r, i) => ({...r, expectedSourceCommit: [target, 'c'.repeat(40), 'd'.repeat(40)][i]}));
  const condition = id => ({id, significantRegression: false, lyricSafetyFailed: false, sameInput: true, sameSeed: true, sameProfile: true, shippedPipelines: true, actualDecodedComparison: true, movies: comparisonMovies});
  return {releaseSourceCommit: target, latestCandidate: record({...decoded, artifactId: 'finished', movieSourceCommit: target, selectionFinalized: true, media}), evidence: {
    ci: record({headSha: target, conclusion: 'success', url: 'https://github.com/example/kamen/actions/runs/1'}),
    tests: record({install: {exitCode: 0}, build: {exitCode: 0, outputSHA256: fileHash(path.join(root, 'dist/index.html'))}, cases: [{id: 'test', status: 'PASS', exitCode: 0}]}),
    browser: record({actualBrowser: true, operations: ['generation', 'oneClickExport', 'save', 'restore', 'cancel', 'retry', 'rejectInvalidMP4'].map(id => ({id, completed: true, traceSHA256: hash}))}),
    artifacts: record({movies: [{id: 'finished', ...decoded, hashMatches: true, hasVideo: true, hasAudio: true, observation: original}]}),
    comparisons: record({expectedConditionIds: Array.from({length: 30}, (_, i) => `condition-${i}`), conditions: Array.from({length: 30}, (_, i) => condition(`condition-${i}`)), independent: [{...condition('independent'), unusedBeforeFreeze: true, notUsedForAdjustment: true}], compositionAssessment: {significantRegressionsResolved: true, observations: [record({actualDecodedFrames: true, videoSHA256s: [media.sha256, control.hash], measuredSampleCount: 4})]}}),
    operators: record({proofSchema: 3, importanceClassificationFinalized: true, expectedImportantIntentIds: ['dynamic'], population: record({intents: [contract], executionLedger: record({expectedImportantIntentIds: ['dynamic'], rows: [{intentId: 'dynamic', binding, important: true, naturalSelection: 'NATURAL', classification: 'EXECUTED_IMPORTANT'}]})}), observations: [{intentId: 'dynamic', status: 'VERIFIED', videoSHA256: media.sha256, controlVideoSHA256: control.hash, actualDecodedTimestamp: .2, counterfactual: true, decodedPixels: true, measurement}]}),
    safety: record({knownMajorDefects: 0, lyricMissing: 0, audioBroken: 0, manualLocksChanged: 0, allTargetPathsBound: true, finalArtifactMatchesSource: true, pathObservations: [{path: 'single-image'}]})
  }};
}
function inspect(manifest, override = {}) {
  fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest));
  return inspectBundle({root, manifestHash: fileHash(path.join(root, 'manifest.json')), target, repositoryRoot: root, ...override});
}
function rejection(change, message) {
  const manifest = fixture(); change(manifest);
  assert.throws(() => inspect(manifest), message); checks++;
}
function edit(manifest, key, fn) { const value = read(manifest.evidence[key]); fn(value); manifest.evidence[key] = record(value); }
try {
  fs.mkdirSync(path.join(root, 'dist')); fs.writeFileSync(path.join(root, 'dist/index.html'), 'synthetic build');
  assert.equal(inspect(fixture()).result.RELEASE_GO, 'PASS'); checks++;
  rejection(m => {m.releaseSourceCommit = 'e'.repeat(40);}, /Manifest target/);
  rejection(m => {m.latestCandidate = record({...read(m.latestCandidate), selectionFinalized: false});}, /not finalized/);
  rejection(m => {m.latestCandidate = record({...read(m.latestCandidate), sourceCommit: 'e'.repeat(40)});}, /not finalized/);
  for (const key of ['selectedCandidateId', 'videoSHA256', 'inputHash', 'planHash', 'rendererVersion', 'outputProfile']) {
    rejection(m => {m.latestCandidate = record({...read(m.latestCandidate), [key]: key === 'outputProfile' ? {fps: 30} : 'wrong'});}, new RegExp(`Latest candidate ${key} mismatch`));
  }
  rejection(m => {m.latestCandidate = record({...read(m.latestCandidate), movieSourceCommit: 'e'.repeat(40)});}, /Original movie source/);
  rejection(m => edit(m, 'artifacts', a => {a.movies.push(a.movies[0]);}), /identify one/);
  rejection(m => edit(m, 'artifacts', a => {const raw = read(a.movies[0].observation); raw.decodeComplete = false; a.movies[0].observation = record(raw);}), /decode observations/);
  rejection(m => edit(m, 'tests', t => {t.build.outputSHA256 = hash;}), /build output differs/);
  rejection(m => edit(m, 'operators', o => {o.proofSchema = 1;}), /requires v3/);
  rejection(m => edit(m, 'operators', o => {o.observations = [];}), /QUALITY_GO is UNVERIFIED/);
  rejection(m => edit(m, 'safety', s => {s.knownMajorDefects = 1;}), /QUALITY_GO is FAIL/);
  const failedQuality = fixture();
  edit(failedQuality, 'safety', s => {s.knownMajorDefects = 1;});
  assert.throws(() => inspect(failedQuality), error => error.result?.TECHNICAL_GO === 'PASS' && error.result?.QUALITY_GO === 'FAIL' && error.result?.RELEASE_GO === 'FAIL'); checks++;
  rejection(m => edit(m, 'ci', c => {c.headSha = 'e'.repeat(40);}), /TECHNICAL_GO is UNVERIFIED/);
  rejection(m => {m.latestCandidate = {...m.latestCandidate, sha256: hash};}, /hash mismatch/);
  const manifest = fixture();
  assert.throws(() => inspect(manifest, {manifestHash: hash}), /hash mismatch/); checks++;
  const reader = evidenceReader(root), plain = record({nested: 'value'});
  assert.deepEqual(reader.read(plain), {sourceCommit: target, nested: 'value'}); checks++;
  const compressed = zlib.gzipSync(Buffer.from('{"compressed":true}'));
  fs.writeFileSync(path.join(root, 'evidence.json.gz'), compressed);
  assert.deepEqual(reader.read({path: 'evidence.json.gz', sha256: sha(compressed)}), {compressed: true}); checks++;
  for (const name of ['../outside.json', '/tmp/outside.json', '..\\outside.json']) {
    assert.throws(() => reader.locate({path: name, sha256: hash}), /escapes bundle/); checks++;
  }
  fs.symlinkSync(path.join(root, plain.path), path.join(root, 'link.json'));
  assert.throws(() => reader.read({path: 'link.json', sha256: plain.sha256}), /symlink rejected/); checks++;
  fs.mkdirSync(path.join(root, 'nested')); fs.symlinkSync(path.join(root, 'nested'), path.join(root, 'linked-dir'));
  assert.throws(() => reader.locate({path: 'linked-dir/anything.json', sha256: hash}), /symlink rejected/); checks++;
  const nestedMissing = record({child: {path: 'absent.json', sha256: hash}});
  assert.throws(() => reader.walk(nestedMissing), /ENOENT/); checks++;
  for (const [child, error] of [[{path: '../outside.json', sha256: hash}, /escapes bundle/], [{path: 'link.json', sha256: plain.sha256}, /symlink rejected/]]) {
    const name = `disguised-${sequence++}.mp4`, bytes = Buffer.from(JSON.stringify({child}));
    fs.writeFileSync(path.join(root, name), bytes);
    assert.throws(() => reader.walk({path: name, sha256: sha(bytes)}), error); checks++;
  }
  const fakeHeader = record({xxftyp: {path: '../outside.json', sha256: hash}});
  assert.throws(() => reader.walk(fakeHeader), /escapes bundle/); checks++;
  const tampered = record({observed: true}); fs.appendFileSync(path.join(root, tampered.path), ' ');
  assert.throws(() => reader.read(tampered), /hash mismatch/); checks++;
  const run = {repository: {full_name: 'example/kamen'}, head_sha: target, status: 'completed', conclusion: 'success', path: '.github/workflows/build.yml'};
  assert.doesNotThrow(() => assertRun(run, 'example/kamen', target, '.github/workflows/build.yml')); checks++;
  for (const update of [{repository: {full_name: 'other/kamen'}}, {head_sha: 'e'.repeat(40)}, {status: 'in_progress'}, {conclusion: 'failure'}, {conclusion: 'cancelled'}, {path: '.github/workflows/partial.yml'}]) {
    assert.throws(() => assertRun({...run, ...update}, 'example/kamen', target, '.github/workflows/build.yml'), /mismatch|full build workflow/); checks++;
  }
  console.log(`Pages release adapter: ${checks} synthetic positive/counterexample scenarios PASS; no real quality or MP4 certification`);
  // One tiny codec fixture tests the actual decoder adapter; it is not KAMEN output.
  const tinyMedia = path.join(root, 'decoder-fixture.mp4');
  execFileSync('ffmpeg', ['-v', 'error', '-f', 'lavfi', '-i', 'color=c=blue:s=64x64:r=10:d=0.4', '-f', 'lavfi', '-i', 'sine=frequency=440:sample_rate=48000:duration=0.4', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-t', '0.4', '-y', tinyMedia], {stdio: ['ignore', 'ignore', 'pipe']});
  const profile = {resolution: [64, 64], fps: 10, range: [0, .4]};
  assert.doesNotThrow(() => verifyMedia(tinyMedia, profile));
  assert.throws(() => verifyMedia(tinyMedia, {...profile, fps: 24}), /resolution\/fps mismatch/);
  assert.throws(() => verifyMedia(tinyMedia, {...profile, range: [0, .8]}), /complete frame population mismatch/);
  console.log('Pages media adapter: 3 tiny H.264/AAC decoder scenarios PASS; no KAMEN candidate or release-quality certification');
} finally { fs.rmSync(root, {recursive: true, force: true}); }
