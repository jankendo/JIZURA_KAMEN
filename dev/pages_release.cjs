'use strict';
// Production adapter: downloaded evidence is data, never executable code.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {execFileSync} = require('node:child_process');
const {isDeepStrictEqual} = require('node:util');
const {evaluate, sha} = require('./release_gates.cjs');
const COMMIT = /^[a-f0-9]{40}$/;
const HASH = /^[a-f0-9]{64}$/;
function requireThat(value, message) { if (!value) throw Error(message); }
function fileHash(file) {
  const h = crypto.createHash('sha256'), fd = fs.openSync(file, 'r'), b = Buffer.alloc(1024 * 1024);
  try { let n; while ((n = fs.readSync(fd, b, 0, b.length, null))) h.update(b.subarray(0, n)); }
  finally { fs.closeSync(fd); }
  return h.digest('hex');
}
function evidenceReader(root) {
  root = fs.realpathSync(root);
  const visited = new Set();
  function locate(ref) {
    requireThat(ref && typeof ref.path === 'string' && HASH.test(ref.sha256 || ''), 'Missing evidence path/hash');
    requireThat(!path.isAbsolute(ref.path) && !ref.path.split(/[\\/]/).includes('..'), 'Evidence path escapes bundle');
    const file = path.resolve(root, ref.path);
    requireThat(file.startsWith(root + path.sep), 'Evidence path escapes bundle');
    let current = root;
    for (const part of path.relative(root, file).split(path.sep)) {
      current = path.join(current, part);
      requireThat(!fs.lstatSync(current).isSymbolicLink(), 'Evidence symlink rejected');
    }
    requireThat(fs.statSync(file).isFile() && fileHash(file) === ref.sha256, 'Evidence file missing/hash mismatch');
    return file;
  }
  function read(ref) {
    const file = locate(ref);
    requireThat(fs.statSync(file).size <= 128 * 1024 * 1024, 'JSON evidence too large');
    let b = fs.readFileSync(file);
    if (b[0] === 31 && b[1] === 139) b = require('node:zlib').gunzipSync(b, {maxOutputLength: 128 * 1024 * 1024});
    return JSON.parse(b);
  }
  function walk(value) {
    if (!value || typeof value !== 'object') return;
    if ('path' in value && 'sha256' in value) {
      const file = locate(value);
      if (visited.has(file)) return;
      visited.add(file);
      // File names are untrusted: JSON named .mp4 must still be traversed.
      // An ISO BMFF media header cannot be interpreted as JSON by the evaluator.
      const header = Buffer.alloc(8), fd = fs.openSync(file, 'r');
      try { fs.readSync(fd, header, 0, 8, 0); } finally { fs.closeSync(fd); }
      // Small ftyp box begins with a NUL size byte, excluding JSON and gzip.
      const mediaHeader = header[0] === 0 && header.readUInt32BE(0) >= 8 &&
        header.readUInt32BE(0) <= fs.statSync(file).size && header.toString('ascii', 4, 8) === 'ftyp';
      if (!mediaHeader) walk(read(value));
    }
    for (const child of Object.values(value)) walk(child);
  }
  return {locate, read, walk};
}
function assertRun(run, repository, target, workflow) {
  requireThat(run.repository?.full_name === repository && run.head_sha === target &&
    run.status === 'completed' && run.conclusion === 'success', 'Run repository/SHA/success mismatch');
  if (workflow) requireThat(run.path === workflow, 'CI must be the full build workflow');
}
function inspectBundle({root, manifestHash, target, repositoryRoot}) {
  requireThat(COMMIT.test(target || '') && HASH.test(manifestHash || ''), 'Exact target SHA and manifest SHA-256 required');
  const reader = evidenceReader(root);
  const manifest = reader.read({path: 'manifest.json', sha256: manifestHash});
  requireThat(manifest.releaseSourceCommit === target, 'Manifest target differs from approved SHA');
  reader.walk(manifest);
  // Correspondence uses trusted checkout history, never a repository from the bundle.
  manifest.gitRepository = path.resolve(repositoryRoot);
  const operators = reader.read(manifest.evidence?.operators);
  requireThat(operators.proofSchema === 3, 'Production requires v3 typed semantic/phase/attribution evidence');
  const candidate = reader.read(manifest.latestCandidate);
  requireThat(candidate.sourceCommit === target && candidate.selectionFinalized === true, 'Latest candidate selection is not finalized for target');
  const artifacts = reader.read(manifest.evidence.artifacts);
  const matches = (artifacts.movies || []).filter(m => m.id === candidate.artifactId);
  requireThat(matches.length === 1, 'Latest candidate must identify one finished artifact');
  const movie = matches[0], raw = reader.read(movie.observation);
  for (const key of ['selectedCandidateId', 'videoSHA256', 'inputHash', 'planHash', 'rendererVersion', 'outputProfile']) {
    requireThat(candidate[key] !== undefined && isDeepStrictEqual(candidate[key], movie[key]) &&
      isDeepStrictEqual(candidate[key], raw[key]), `Latest candidate ${key} mismatch`);
  }
  requireThat(candidate.movieSourceCommit === raw.sourceCommit && COMMIT.test(raw.sourceCommit || ''), 'Original movie source must be preserved');
  requireThat(raw.decodeComplete === true && raw.decodeExitCode === 0 && raw.codecVideo === 'h264' && raw.codecAudio === 'aac', 'Latest candidate decode observations incomplete');
  requireThat(candidate.media?.sha256 === movie.videoSHA256, 'Latest candidate MP4 hash mismatch');
  const media = reader.locate(candidate.media);
  const tests = reader.read(manifest.evidence.tests);
  requireThat(tests.build?.outputSHA256 === fileHash(path.join(repositoryRoot, 'dist/index.html')), 'Approved build output differs from evidence');
  const result = evaluate(manifest, root);
  for (const gate of ['TECHNICAL_GO', 'QUALITY_GO', 'RELEASE_GO']) {
    if (result[gate] !== 'PASS') { const error = Error(`${gate} is ${result[gate]}`); error.result = result; throw error; }
  }
  return {result, media, profile: candidate.outputProfile, ci: reader.read(manifest.evidence.ci)};
}
function verifyMedia(media, profile) {
  requireThat(Array.isArray(profile?.resolution) && profile.resolution.length === 2 &&
    profile.resolution.every(n => Number.isInteger(n) && n > 0) && Number.isFinite(profile.fps) && profile.fps > 0 &&
    Array.isArray(profile.range) && profile.range.length === 2 && profile.range.every(Number.isFinite) &&
    profile.range[1] > profile.range[0], 'Latest candidate output profile incomplete');
  const probe = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-show_streams', '-of', 'json', media], {encoding: 'utf8', maxBuffer: 1024 * 1024}));
  const video = probe.streams.find(s => s.codec_type === 'video'), audio = probe.streams.find(s => s.codec_type === 'audio');
  requireThat(video?.codec_name === 'h264' && audio?.codec_name === 'aac', 'Latest candidate requires H.264 and AAC');
  const rate = (video.avg_frame_rate || '').split('/').map(Number);
  requireThat(video.width === profile.resolution[0] && video.height === profile.resolution[1] &&
    rate.length === 2 && rate[1] > 0 && Math.abs(rate[0] / rate[1] - profile.fps) < 1e-6, 'Latest candidate actual resolution/fps mismatch');
  const progress = execFileSync('ffmpeg', ['-v', 'error', '-xerror', '-err_detect', 'explode', '-i', media,
    '-map', '0:v:0', '-map', '0:a:0', '-fps_mode', 'passthrough', '-progress', 'pipe:1', '-nostats', '-f', 'null', '-'],
    {encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1024 * 1024});
  const frames = [...progress.matchAll(/^frame=(\d+)$/gm)];
  requireThat(/progress=end/.test(progress) && Number(frames.at(-1)?.[1]) === Math.max(1, Math.round((profile.range[1] - profile.range[0]) * profile.fps)), 'Latest candidate complete frame population mismatch');
}
function gh(endpoint) {
  return JSON.parse(execFileSync('gh', ['api', endpoint], {encoding: 'utf8', maxBuffer: 4 * 1024 * 1024}));
}
function current(env) {
  const target = env.APPROVED_SHA, repository = env.GITHUB_REPOSITORY;
  requireThat(COMMIT.test(target || '') && target === env.GITHUB_SHA && env.GITHUB_REF === 'refs/heads/main', 'Approval must match exact main checkout SHA');
  requireThat(/^[\w.-]+\/[\w.-]+$/.test(repository || ''), 'Invalid repository');
  requireThat(gh(`repos/${repository}/git/ref/heads/main`).object.sha === target, 'Approved SHA is no longer current main');
  requireThat(execFileSync('git', ['rev-parse', 'HEAD'], {encoding: 'utf8'}).trim() === target, 'Checkout SHA mismatch');
  return {target, repository};
}
function main(mode, env = process.env) {
  const {target, repository} = current(env);
  if (mode === 'current') return;
  requireThat(HASH.test(env.MANIFEST_SHA256 || ''), 'Reviewed manifest hash required');
  if (mode === 'producer') {
    requireThat(/^[1-9][0-9]*$/.test(env.EVIDENCE_RUN_ID || ''), 'Invalid evidence run ID');
    requireThat(env.EVIDENCE_RUN_ID !== env.GITHUB_RUN_ID, 'Evidence must come from a completed independent run');
    assertRun(gh(`repos/${repository}/actions/runs/${env.EVIDENCE_RUN_ID}`), repository, target);
    const artifacts = gh(`repos/${repository}/actions/runs/${env.EVIDENCE_RUN_ID}/artifacts?name=kamen-release-evidence&per_page=100`);
    requireThat(artifacts.total_count === 1 && artifacts.artifacts[0].name === 'kamen-release-evidence' &&
      !artifacts.artifacts[0].expired && /^sha256:[a-f0-9]{64}$/.test(artifacts.artifacts[0].digest || ''), 'Unique unexpired evidence artifact with digest required');
    console.log(JSON.stringify({evidenceRunId: env.EVIDENCE_RUN_ID, artifactId: artifacts.artifacts[0].id, digest: artifacts.artifacts[0].digest}));
    return;
  }
  requireThat(mode === 'verify', 'Unknown release operation');
  const {result, media, profile, ci} = inspectBundle({root: env.EVIDENCE_ROOT, manifestHash: env.MANIFEST_SHA256, target, repositoryRoot: process.cwd()});
  const prefix = `https://github.com/${repository}/actions/runs/`;
  requireThat(ci.url?.startsWith(prefix) && /^[1-9][0-9]*$/.test(ci.url.slice(prefix.length)), 'CI URL must identify this repository run');
  assertRun(gh(`repos/${repository}/actions/runs/${ci.url.slice(prefix.length)}`), repository, target, '.github/workflows/build.yml');
  verifyMedia(media, profile);
  fs.writeFileSync(env.RELEASE_REPORT, JSON.stringify({...result, approvedSHA: target, reviewedManifestSHA256: env.MANIFEST_SHA256, latestCandidateDecode: 'PASS'}, null, 2) + '\n');
  console.log('TECHNICAL_GO=PASS QUALITY_GO=PASS RELEASE_GO=PASS; latest candidate fully decoded');
}
module.exports = {evidenceReader, assertRun, inspectBundle, fileHash, verifyMedia};
if (require.main === module) {
  try { main(process.argv[2]); }
  catch (error) {
    const failure = {...(error.result || {TECHNICAL_GO: 'UNVERIFIED', QUALITY_GO: 'UNVERIFIED', RELEASE_GO: 'UNVERIFIED'}), publication: 'BLOCKED', reason: error.message};
    if (process.env.RELEASE_REPORT) fs.writeFileSync(process.env.RELEASE_REPORT, JSON.stringify(failure, null, 2) + '\n');
    console.error(error.message); process.exitCode = 1;
  }
}
