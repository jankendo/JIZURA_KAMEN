'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const calls=[],J={waitExportStep:operation=>operation()};
class VideoEncoder{static async isConfigSupported(config){calls.push({...config});return {supported:VideoEncoder.supported(config),config};}}
VideoEncoder.supported=()=>true;
const context=vm.createContext({J,window:{J},VideoEncoder,setTimeout,clearTimeout,AbortController,DOMException,console});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/11_export.js'),'utf8'),context);
(async()=>{
 let selected=await J.pickVideoCodec(1280,720,30,8000000);
 assert.equal(selected.cfg.hardwareAcceleration,undefined,'automatic H.264 selection is tried first');
 assert.equal(calls[0].hardwareAcceleration,undefined);
 calls.length=0;
 const attempts=await J.videoAttempts(1280,720,30,8000000);
 assert.equal(attempts[0].cfg.hardwareAcceleration,undefined);
 assert(attempts.some(attempt=>!('hardwareAcceleration' in attempt.cfg)),'automatic browser selection remains available');
 assert(attempts.some(attempt=>attempt.cfg.hardwareAcceleration==='prefer-software'),'software fallback remains available');
 calls.length=0;VideoEncoder.supported=config=>config.hardwareAcceleration!=='prefer-hardware'&&config.hardwareAcceleration!=='prefer-software';
 selected=await J.pickVideoCodec(1280,720,30,8000000);
 assert.equal(selected.cfg.hardwareAcceleration,undefined,'unsupported hardware preference falls back to automatic selection');
 console.log('Automatic H.264 negotiation and software fallback PASS');
})().catch(error=>{console.error(error);process.exitCode=1;});
