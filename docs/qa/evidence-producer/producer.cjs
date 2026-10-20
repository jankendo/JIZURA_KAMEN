'use strict';
// Assemble data only. Preserve raw bytes and source labels; certification uses
// the existing trusted publication adapter, never code in the intake bundle.
const fs = require('node:fs'), path = require('node:path'), zlib = require('node:zlib');
const {performance} = require('node:perf_hooks');
const {sha} = require('../../../dev/release_gates.cjs');
const {fileHash, inspectBundle, verifyMedia, assertRun} = require('../../../dev/pages_release.cjs');
const HASH = /^[a-f0-9]{64}$/, COMMIT = /^[a-f0-9]{40}$/;
const LIMIT = 128 * 1024 * 1024;
function assert(v, m) { if (!v) throw Error(m); }
function safe(root, name) {
 assert(typeof name === 'string' && name.length && !name.includes('\\') && !name.includes('\0') &&
  !path.isAbsolute(name) && !name.split('/').some(p => ['..', '.', ''].includes(p)), 'Invalid evidence path');
 let current = root;
 for (const part of name.split('/')) {
  current = path.join(current, part);
  assert(!fs.lstatSync(current).isSymbolicLink(), 'Evidence symlink rejected');
 }
 assert(fs.statSync(current).isFile(), 'Evidence must be a regular file');
 return current;
}
function kind(file) {
 const fd = fs.openSync(file, 'r'), h = Buffer.alloc(8);
 try { fs.readSync(fd, h, 0, 8, 0); } finally { fs.closeSync(fd); }
 if (h[0] === 0 && h.readUInt32BE(0) >= 8 && h.readUInt32BE(0) <= fs.statSync(file).size && h.toString('ascii', 4, 8) === 'ftyp') return 'mp4';
 return h[0] === 31 && h[1] === 139 ? 'gzip-json' : 'json';
}
function json(file, type) {
 assert(fs.statSync(file).size <= LIMIT, 'JSON evidence too large');
 const b = fs.readFileSync(file);
 return JSON.parse(type === 'gzip-json' ? zlib.gunzipSync(b, {maxOutputLength: LIMIT}) : b);
}
function assemble({root, manifest, output, mappings = [], provenance}) {
 const start = performance.now();
 assert(!fs.lstatSync(root).isSymbolicLink(), 'Intake root symlink rejected');
 root = fs.realpathSync(root); output = path.resolve(output);
 assert(output !== root && !output.startsWith(root + path.sep) && !root.startsWith(output + path.sep), 'Intake/output must be separate');
 assert(!fs.existsSync(output), 'Output must not exist');
 assert(provenance && typeof provenance.repository === 'string' && COMMIT.test(provenance.commit || ''), 'Immutable intake provenance required');
 const aliases = new Map();
 for (const m of mappings) {
  assert(m && typeof m.originalPath === 'string' && HASH.test(m.sha256 || '') && typeof m.safePath === 'string', 'Invalid explicit relocation');
  const key = m.originalPath + '\0' + m.sha256;
  assert(!aliases.has(key), 'Duplicate relocation'); aliases.set(key, m.safePath);
 }
 fs.mkdirSync(output, {recursive: true});
 const archives = new Map(), cache = new Map(), inputCache = new Map(), active = new Set(), origins = [], errors = [];
 const stats = {references: 0, uniqueInputFiles: 0, reusedReferences: 0, inputBytes: 0, outputBytes: 0, mediaCopies: 0};
 function store(bytes, folder, ext) {
  const hash = sha(bytes), name = `${folder}/${hash}.${ext}`, dest = path.join(output, name);
  if (!fs.existsSync(dest)) { fs.mkdirSync(path.dirname(dest), {recursive: true}); fs.writeFileSync(dest, bytes, {flag: 'wx'}); stats.outputBytes += bytes.length; }
  return {path: name, sha256: hash};
 }
 function archive(bytes) {
  // Encode original bytes as data, so the unchanged adapter can hash/traverse
  // the archive without interpreting historical ../ paths as live references.
  return store(zlib.gzipSync(Buffer.from(JSON.stringify({encoding:'base64',originalSHA256:sha(bytes),bytes:bytes.toString('base64')}))), 'raw-archives', 'json.gz');
 }
 function visit(ref) {
  stats.references++;
  assert(ref && typeof ref.path === 'string' && HASH.test(ref.sha256 || ''), 'Missing evidence path/hash');
  // Legacy ../ references are never resolved. Only explicit hash-bound mappings
  // to safe paths permit import; the original path and raw hash remain in index.
  const name = aliases.get(ref.path + '\0' + ref.sha256) || ref.path;
  const file = safe(root, name);
  if (!inputCache.has(file)) inputCache.set(file, fileHash(file));
  assert(inputCache.get(file) === ref.sha256, 'Evidence hash mismatch');
  const type = kind(file);
  if (ref.type !== undefined) assert(ref.type === ({mp4:'video/mp4',json:'application/json','gzip-json':'application/gzip'})[type], 'Evidence type mismatch');
  const rawName = `originals/${ref.sha256}.${type === 'mp4' ? 'mp4' : type === 'gzip-json' ? 'json.gz' : 'json'}`;
  const origin = {originalPath: ref.path, intakePath: name, sha256: ref.sha256, type, provenance};
  origins.push(origin);
  assert(!active.has(ref.sha256), 'Cyclic evidence references');
  if (cache.has(ref.sha256)) { origin.rawEvidence=archives.get(ref.sha256); stats.reusedReferences++; return {...ref, ...cache.get(ref.sha256)}; }
  stats.uniqueInputFiles++; stats.inputBytes += fs.statSync(file).size;
  fs.mkdirSync(path.join(output, 'originals'), {recursive:true});
  fs.copyFileSync(file, path.join(output, rawName), fs.constants.COPYFILE_EXCL);
  stats.outputBytes += fs.statSync(file).size;
  assert(fileHash(path.join(output, rawName)) === ref.sha256, 'Evidence changed during copy');
  let result;
  if (type === 'mp4') { result = {path:rawName, sha256:ref.sha256}; origin.rawEvidence=result; stats.mediaCopies++; }
  else {
   active.add(ref.sha256);
   const originalValue = json(file, type), originalJSON = JSON.stringify(originalValue);
   origin.rawEvidence=archive(fs.readFileSync(file));
   const value = transform(originalValue), normalizedJSON = JSON.stringify(value);
   active.delete(ref.sha256);
   if (normalizedJSON === originalJSON) result = {path:rawName,sha256:ref.sha256};
   else {
    const bytes = Buffer.from(normalizedJSON + '\n');
    result = type === 'gzip-json' ? store(zlib.gzipSync(bytes), 'objects', 'json.gz') : store(bytes, 'objects', 'json');
    fs.unlinkSync(path.join(output,rawName)); stats.outputBytes -= fs.statSync(file).size;
   }
  }
  archives.set(ref.sha256,origin.rawEvidence);
  cache.set(ref.sha256, result);
  return {...ref, ...result, ...(ref.type ? {type: type === 'mp4' ? 'video/mp4' : type === 'gzip-json' ? 'application/gzip' : 'application/json'} : {})};
 }
 function transform(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(transform);
  if ('path' in value && 'sha256' in value) {
   try {
    const imported = visit(value);
    for (const [k,v] of Object.entries(imported)) if (!['path','sha256','type'].includes(k)) imported[k] = transform(v);
    return imported;
   } catch (e) { errors.push({reference:value, reason:e.message}); return value; }
  }
  return Object.fromEntries(Object.entries(value).map(([k,v]) => [k,transform(v)]));
 }
 const file = safe(root, manifest), rawHash = fileHash(file);
 let normalized;
 try { normalized = transform(json(file, kind(file))); }
 catch (e) { errors.push({reason:e.message}); normalized = {}; }
 // Keep the root manifest's original bytes too. Never reinterpret raw hashes.
 const originalManifest = {rawEvidence:archive(fs.readFileSync(file)),rawSHA256:rawHash};
 const diagnostic = Buffer.from(JSON.stringify(normalized, null, 2) + '\n');
 fs.writeFileSync(path.join(output, 'diagnostic-manifest.json'), diagnostic);
 stats.outputBytes += diagnostic.length; stats.assemblyMilliseconds = performance.now() - start;
 const index = {schema:1, provenance, originalManifest, originalManifestSHA256:rawHash, origins, errors, stats};
 fs.writeFileSync(path.join(output, 'provenance.json'), JSON.stringify(index,null,2)+'\n');
 return {normalized, index};
}
function produce(options) {
 assert(COMMIT.test(options.target || ''), 'Exact target SHA required');
 assert(options.repositoryRoot && fs.statSync(options.repositoryRoot).isDirectory(), 'Trusted repository required');
 const {normalized, index} = assemble(options), output = path.resolve(options.output);
 let qualified = false, result = null, reason;
 try {
  assert(index.errors.length === 0, 'Evidence graph incomplete or invalid');
  assert(normalized.releaseSourceCommit === options.target, 'Manifest source differs from target');
  assert(require('node:child_process').execFileSync('git',['-C',options.repositoryRoot,'rev-parse','HEAD'],{encoding:'utf8'}).trim() === options.target, 'Trusted checkout source differs from target');
  normalized.producerProvenance = {path:'provenance.json',sha256:fileHash(path.join(output,'provenance.json'))};
  const bytes = Buffer.from(JSON.stringify(normalized,null,2)+'\n');
  // inspectBundle requires manifest.json. Keep it only after every gate and the
  // final actual full media decode passes; remove it on all failure paths.
  fs.writeFileSync(path.join(output,'manifest.json'), bytes, {flag:'wx'});
  const inspected = inspectBundle({root:output,manifestHash:sha(bytes),target:options.target,repositoryRoot:options.repositoryRoot});
  const repository = options.provenance.repository;
  assert(/^[\w.-]+\/[\w.-]+$/.test(repository), 'Invalid CI repository');
  const prefix = `https://github.com/${repository}/actions/runs/`, url = inspected.ci.url;
  assert(typeof url === 'string' && url.startsWith(prefix) && /^[1-9][0-9]*$/.test(url.slice(prefix.length)), 'Exact repository CI run URL required');
  const actualRun = JSON.parse(require('node:child_process').execFileSync('gh',['api',`repos/${repository}/actions/runs/${url.slice(prefix.length)}`],{encoding:'utf8',maxBuffer:4*1024*1024}));
  assertRun(actualRun,repository,options.target,'.github/workflows/build.yml');
  const start = performance.now(); verifyMedia(inspected.media, inspected.profile);
  index.stats.finalDecodeMilliseconds = performance.now() - start;
  result = inspected.result; qualified = true;
 } catch (e) { reason = e.message; result = e.result || null; }
 finally { if (!qualified) fs.rmSync(path.join(output,'manifest.json'), {force:true}); }
 const report = {schema:1, qualified, artifactName:qualified?'kamen-release-evidence':'kamen-evidence-diagnostic', target:options.target, reason, result, stats:index.stats};
 fs.writeFileSync(path.join(output,'producer-result.json'), JSON.stringify(report,null,2)+'\n');
 return report;
}
// Fetch only missing exact correspondence commit roots; history ancestry is not
// used by the evaluator's endpoint diff/tree checks. Never fetch intake URLs.
function prepareHistory({root, manifest, mappings = [], repositoryRoot, target}) {
 const {execFileSync} = require('node:child_process');
 root = fs.realpathSync(root);
 const aliases = new Map(mappings.map(m => [m.originalPath+'\0'+m.sha256,m.safePath]));
 function read(ref) {
  assert(ref && HASH.test(ref.sha256 || ''), 'Missing history reference hash');
  const file = safe(root,aliases.get(ref.path+'\0'+ref.sha256)||ref.path);
  assert(fileHash(file) === ref.sha256,'History reference hash mismatch');
  return json(file,kind(file));
 }
 const file=safe(root,manifest), m=json(file,kind(file));
 assert(COMMIT.test(target || '') && m.releaseSourceCommit===target,'History target mismatch');
 const commits=new Set([target]);
 for(const ref of m.sourceCorrespondence || []) {
  const c=read(ref);
  assert(c.sourceCommit===target && c.toCommit===target && COMMIT.test(c.fromCommit || ''),'History source correspondence mismatch');
  commits.add(c.fromCommit);
 }
 const fetched=[];
 for(const commit of commits) {
  try { execFileSync('git',['-C',repositoryRoot,'cat-file','-e',commit+'^{commit}'],{stdio:'ignore'}); }
  catch {
   execFileSync('git',['-C',repositoryRoot,'fetch','--filter=blob:none','--depth=1','origin',commit],{stdio:['ignore','ignore','pipe'],maxBuffer:1024*1024});
   fetched.push(commit);
  }
 }
 return {required:[...commits],fetched};
}
module.exports = {safe, kind, assemble, produce, prepareHistory};
if (require.main === module) {
 try {
  const options = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
  const report = produce(options); console.log(JSON.stringify(report)); process.exitCode = report.qualified ? 0 : 2;
 } catch (e) { console.error(e.message); process.exitCode = 2; }
}
