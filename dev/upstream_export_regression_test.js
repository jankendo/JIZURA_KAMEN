'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const J={},VideoEncoder={isConfigSupported:async cfg=>({supported:cfg.codec.startsWith('avc1.')})};
const context=vm.createContext({J,VideoEncoder,window:{},document:{},Blob,ArrayBuffer,DataView,TextEncoder,URL,setTimeout,clearTimeout});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/11_export.js'),'utf8'),context);
(async()=>{
  const candidates=await J.videoAttempts(1920,1080,30,18e6);
  assert(candidates.length>=2,'supported software H.264 retry should be offered');
  assert(candidates.every(c=>c.mux==='avc'),'SNS export must remain H.264');
  assert(candidates.slice(1).every(c=>c.cfg.hardwareAcceleration==='prefer-software'));
  assert.doesNotThrow(()=>J.verifyEncodedTracks({frames:179,expected:180,audioChunks:20,audioEnd:5900000,audioExpected:6}));
  assert.throws(()=>J.verifyEncodedTracks({frames:0,expected:180}),/フレームが不足/);
  assert.throws(()=>J.verifyEncodedTracks({frames:180,expected:180,audioChunks:0,audioExpected:6}),/音声のエンコード/);
  assert.throws(()=>J.verifyEncodedTracks({frames:180,expected:180,audioChunks:20,audioEnd:3500000,audioExpected:6}),/音声のエンコード/);
  console.log('H.264 software retry and encoded track completeness passed.');
})().catch(e=>{console.error(e);process.exitCode=1});
