'use strict';
// Compressed-input adapter; all original source/plan/cache guards stay intact.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');const file=path.join(__dirname,'native_dispatch_lineage_trace_v7.cjs');let code=fs.readFileSync(file,'utf8');
function replaceOnce(a,b){assert.equal(code.split(a).length,2);code=code.replace(a,b);}
replaceOnce("require('./read_adopted_matrix_row.cjs').readAdoptedMatrixRow(input,caseId,variant)","JSON.parse(require('node:zlib').gunzipSync(fs.readFileSync(path.join(input,caseId+'-'+variant+'-row.json.gz'))))");
replaceOnce("const bytes=fs.readFileSync(path.join(input,row.referenceInputs.file));","assert.equal(row.fixture.id,caseId);assert.equal(row.variant,variant);assert.equal(row.status,'PASS');const bytes=require('node:zlib').gunzipSync(fs.readFileSync(path.join(input,row.referenceInputs.file+'.gz')));");
const probe=new Module(file,module);probe.filename=file;probe.paths=Module._nodeModulePaths(__dirname);probe._compile(code,file);
