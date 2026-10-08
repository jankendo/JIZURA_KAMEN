'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function fixture(mode){
 let videoClosed=0,audioClosed=0,framesClosed=0;
 const J={outputSize:()=>[320,180],glyphs:{maxRes:128},Renderer:class{frame(){}disposeAssets(){}}},window={J},document={hidden:true,createElement:()=>({width:0,height:0,getContext:()=>({})})};
 const context=vm.createContext({J,window,document,performance,setTimeout,clearTimeout,AbortController,DOMException,Blob,TextEncoder,URL,console,VideoFrame:class{close(){framesClosed++;}},VideoEncoder:class{
  static async isConfigSupported(cfg){return {supported:true,config:cfg};}constructor(cb){this.cb=cb;this.state='unconfigured';this.encodeQueueSize=0;}configure(c){this.state='configured';this.config=c;}encode(){if(mode==='queue')this.encodeQueueSize=5;else this.cb.output({},{});}flush(){return mode==='flush'||mode==='cancel'?new Promise(()=>{}):Promise.resolve();}close(){this.state='closed';videoClosed++;this.encodeQueueSize=0;}
 },AudioEncoder:class{static async isConfigSupported(){return {supported:true};}constructor(cb){this.cb=cb;this.state='configured';this.encodeQueueSize=0;}configure(){}encode(ad){this.cb.output({timestamp:ad.timestamp,duration:100000},{});}flush(){return new Promise(()=>{});}close(){this.state='closed';audioClosed++;}},AudioData:class{constructor(v){Object.assign(this,v);}close(){}},OfflineAudioContext:class{createBufferSource(){return {connect(){},start(){}};}startRendering(){return Promise.resolve({sampleRate:48000,length:48000,numberOfChannels:1,getChannelData:()=>new Float32Array(48000)});}},Mp4Muxer:{ArrayBufferTarget:class{constructor(){this.buffer=new ArrayBuffer(128);}},Muxer:class{addVideoChunk(){}addAudioChunk(){}finalize(){}}}});
 vm.runInContext(fs.readFileSync(path.join(__dirname,'../src/11_export.js'),'utf8'),context);
 J.inspectMP4Buffer=()=>({container:'mp4'});
 const wait=J.waitExportStep;J.waitExportStep=(op,opt)=>wait(op,{...opt,timeout:mode==='cancel'?1000:30});
 const capacity=J.waitEncoderCapacity;J.waitEncoderCapacity=(e,n,opt)=>capacity(e,n,{...opt,timeout:25});
 if(mode==='wasm'){J.pickAudioCodec=async()=>({wasm:true,sr:48000,bitrate:192000,mux:'aac'});window.JIZURAAAC={encode:()=>new Promise(()=>{})};}
 const args={plan:{W:320,H:180,fps:10,duration:1},project:{fps:10,includeAudio:mode==='wasm'||mode==='native'},audio:mode==='wasm'||mode==='native'?{duration:1,buffer:{duration:1,numberOfChannels:1}}:null};
 return {J,context,args,stats:()=>({videoClosed,audioClosed,framesClosed})};
}
(async()=>{
 let f=fixture('normal');await f.J.exportMP4(f.args);assert.deepEqual(f.stats(),{videoClosed:1,audioClosed:0,framesClosed:10});
 for(const mode of ['flush','queue','wasm','native']){f=fixture(mode);const t=performance.now();await assert.rejects(f.J.exportMP4(f.args),/応答しません/);assert(performance.now()-t<500,mode+' must reject promptly, even in hidden tabs');assert.equal(f.stats().videoClosed,1);if(mode==='native')assert.equal(f.stats().audioClosed,1);}
 f=fixture('cancel');const controller=new AbortController();setTimeout(()=>controller.abort(),15);await assert.rejects(f.J.exportMP4({...f.args,signal:controller.signal}),/キャンセル/);assert.equal(f.stats().videoClosed,1);
 f=fixture('fallback');let stopped=0,tracks=0;f.J.exportCapabilities=async()=>({recorder:'video/mp4'});f.context.document.createElement=()=>({width:320,height:180,getContext:()=>({}),captureStream:()=>({getVideoTracks:()=>[{stop(){tracks++;}}]})});f.context.MediaStream=class{constructor(t){this.t=t;}getTracks(){return this.t;}};f.context.MediaRecorder=class{constructor(){this.state='inactive';}start(){this.state='recording';}stop(){stopped++;this.state='inactive';this.onstop?.();}};f.context.requestAnimationFrame=()=>1;f.context.cancelAnimationFrame=()=>{};
 const fallbackAbort=new AbortController();setTimeout(()=>fallbackAbort.abort(),15);await assert.rejects(f.J.exportMP4Fallback({...f.args,project:{includeAudio:false},signal:fallbackAbort.signal}),/キャンセル/);assert.equal(stopped,1);assert.equal(tracks,1);
 const {J}=require('./custom_test_support.cjs').engine();const original=J.checkMVQuality;J.checkMVQuality=()=>({errors:[],quality:{overallScore:70,creativeScore:70,metrics:{},productionDomains:{}}});let calls=0;
 const r=await J.refinePhotoExport({project:{},plan:{musicalPhoto:{}},audio:{}},async()=>{calls++;return {audio:'aac',provenance:{},validation:{}};});assert.equal(calls,1,'ordinary export never restarts encoding to chase creative scores');assert.equal(r.provenance.machineRefinement.minimumMet,false);J.checkMVQuality=original;
 console.log('Normal export, hidden stalled queue, video/audio flush, WASM stall, cancellation, resource release and one-pass default PASS');
})().catch(e=>{console.error(e);process.exitCode=1;});
