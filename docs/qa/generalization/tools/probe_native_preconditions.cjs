'use strict';
// Run the existing exact Native observer with one explicit preparation change.
// This renders only; it never constructs an encoder or generates a movie.
const fs=require('node:fs'),path=require('node:path'),Module=require('node:module'),assert=require('node:assert/strict');
const mode=process.env.KAMEN_NATIVE_PRECONDITION||'BASELINE';assert(['BASELINE','ANALYZE_AUDIO'].includes(mode));
const file=path.join(__dirname,'native_dispatch_lineage_trace_v7.cjs');let code=fs.readFileSync(file,'utf8');
const anchor="  const cv=document.createElement('canvas'),[w,h]=J.outputSize(project);";assert(code.includes(anchor));
code=code.replace(anchor,"  if(ref.__qaPrecondition==='ANALYZE_AUDIO'){const audio=await J.analyzeAudio(new Blob([Uint8Array.from(atob(ref.__qaAudioWAV),c=>c.charCodeAt(0))],{type:'audio/wav'}));if(!audio.buffer)throw Error('AUDIO_PRECONDITION_NOT_EXECUTED');}\n"+anchor);
const payload='__artifactBinding:row.provenance.finalArtifactVerification.binding';assert(code.includes(payload));
code=code.replace(payload,"__qaPrecondition:"+JSON.stringify(mode)+",__qaAudioWAV:(()=>{const b=fs.readFileSync(process.env.KAMEN_NATIVE_AUDIO_WAV);assert.equal(sha(b),row.referenceInputs.audioSHA256,'AUDIO_PRECONDITION_SHA_MISMATCH');return b.toString('base64');})(),"+payload);
code=code.replace('const report={schema:7,','const report={schema:7,nativePrecondition:'+JSON.stringify(mode)+',');
const probe=new Module(file,module);probe.filename=file;probe.paths=Module._nodeModulePaths(__dirname);probe._compile(code,file);
