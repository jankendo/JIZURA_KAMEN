'use strict';
const assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),path=require('node:path');
const {engine,root}=require('./custom_test_support.cjs');
(async()=>{
 const {J,context}=engine();
 class Node{constructor(tag){this.tag=tag;this.children=[];this.events={};}appendChild(x){x.parent=this;this.children.push(x);}append(...xs){xs.forEach(x=>this.appendChild(x));}setAttribute(){}addEventListener(k,f){this.events[k]=f;}click(){this.clicked=(this.clicked||0)+1;this.events.click?.();}remove(){if(this.parent)this.parent.children=this.parent.children.filter(x=>x!==this);}}
 const body=new Node('body'),find=(n,id)=>n.id===id?n:n.children.map(x=>find(x,id)).find(Boolean);let urls=0;const revoked=[];
 context.document={body,createElement:t=>new Node(t),getElementById:id=>find(body,id)};
 context.URL={createObjectURL:()=> 'blob:test/'+(++urls),revokeObjectURL:u=>revoked.push(u)};
 assert.equal(await J.saveFile('test.mp4',new Blob(['video'])),'download');
 let panel=find(body,'kamenDownloads'),row=panel.children.at(-1);assert.equal(row.children[0].clicked,1);assert.equal(revoked.length,0);row.children[0].click();assert.equal(row.children[0].clicked,2);
 await J.saveFile('test.mp4',new Blob(['replacement']));assert.equal(revoked.length,1);assert(find(body,'kamenDownloads'));assert.equal(find(body,'kamenDownloads').children.length,3);
 await J.saveFile('report.json',new Blob(['qa']),{automatic:false});row=find(body,'kamenDownloads').children.at(-1);assert(!row.children[0].clicked);row.children[2].click();assert.equal(revoked.length,2);
 let written,closed=false,picked=0;context.window.showSaveFilePicker=()=>{picked++;return Promise.resolve({createWritable:async()=>({write:async b=>written=b,close:async()=>closed=true})});};
 const target=J.prepareFileSave('test.mp4','video/mp4');assert.equal(picked,1,'picker is invoked synchronously before encoding');
 assert.equal(await J.saveFile('test.mp4',new Blob(['exact']),{destination:target}),'saved');assert.equal(await written.text(),'exact');assert(closed);
 context.window.showSaveFilePicker=async()=>{throw Object.assign(Error('cancel'),{name:'AbortError'});};assert.equal(await J.prepareFileSave('test.zip','application/zip'),'declined');
 assert.equal(await J.saveFile('cancel.zip',new Blob(['zip']),{destination:'declined'}),'declined');
 context.window.showSaveFilePicker=async()=>{throw Object.assign(Error('sandbox'),{name:'SecurityError'});};assert.equal(await J.prepareFileSave('test.zip','application/zip'),null);
 assert.equal(await J.saveFile('pack.zip',new Blob(['zip']),{destination:{createWritable:async()=>{throw Error('write failed');}}}),'download');assert(find(body,'kamenDownloads').children.some(r=>r.children[0]?.download==='pack.zip'));
 console.log('MP4/ZIP direct write, activation-safe picker, cancellation, restricted picker, persistent retry link and manual sidecar PASS');
 // Run the actual MP4 core before and after the change with asynchronous codec adapters.
 const previous=process.env.KAMEN_EXPORT_BASELINE?fs.readFileSync(process.env.KAMEN_EXPORT_BASELINE,'utf8'):null,current=fs.readFileSync(path.join(root,'src/11_export.js'),'utf8');
 async function run(code,{abort=false,wasm=false}={}){
  const e=engine(),ctx=e.context,J=e.J,records={video:[],audio:[],configs:[],closed:0};let lastVideo=0,audioStart=Infinity;const begin=performance.now();
  class Codec{constructor(o,kind){this.o=o;this.kind=kind;this.state='configured';this.encodeQueueSize=0;this.pending=[];}configure(c){records.configs.push([this.kind,c]);if(this.kind==='audio')audioStart=performance.now();}encode(data,opt){assert.equal(this.state,'configured');const record=this.kind==='video'?{...data.options,keyFrame:opt.keyFrame,pixel:data.pixel}:{timestamp:data.timestamp,duration:data.numberOfFrames*1e6/data.sampleRate,pcm:Array.from(data.data)};records[this.kind].push(record);this.encodeQueueSize++;this.pending.push(new Promise(resolve=>setTimeout(()=>{this.encodeQueueSize--;if(this.state!=='closed'){this.o.output(record,{});if(this.kind==='video')lastVideo=performance.now();}resolve();},12)));}async flush(){await Promise.all(this.pending);}close(){if(this.state!=='closed')records.closed++;this.state='closed';}}
  ctx.VideoEncoder=class extends Codec{constructor(o){super(o,'video');}};ctx.AudioEncoder=class extends Codec{constructor(o){super(o,'audio');}};
  ctx.VideoFrame=class{constructor(c,options){this.options=options;this.pixel=c.pixel;}close(){}};ctx.AudioData=class{constructor(o){Object.assign(this,o);}close(){}};
  const buffer={duration:2,numberOfChannels:1,sampleRate:48000,length:96000,getChannelData:()=>new Float32Array(96000).fill(.125)};
  ctx.OfflineAudioContext=class{constructor() {this.destination={};}createBufferSource(){return {connect(){},start(){}};}async startRendering(){await new Promise(r=>setTimeout(r,45));return buffer;}};
  const controller=new AbortController();if(abort)setTimeout(()=>controller.abort(),20);
  ctx.document.createElement=t=>({width:0,height:0,getContext(){return {canvas:this};}});
  ctx.Mp4Muxer={ArrayBufferTarget:class{constructor(){this.buffer=new ArrayBuffer(101);}},Muxer:class{constructor(o){this.o=o;}addVideoChunk(){}addAudioChunk(){}finalize(){assert.equal(records.video.length,60);}}};
  vm.runInContext(code,ctx);J.outputSize=()=>[64,36];J.pickVideoCodec=async()=>({mux:'avc',label:'H.264',cfg:{codec:'avc1.640033',width:64,height:36,framerate:30,bitrate:9999999}});J.pickAudioCodec=async()=>({mux:'aac',codec:'mp4a.40.2',sr:48000,bitrate:192000,wasm});J.inspectMP4Buffer=()=>({videoCodec:'avc1',audioCodec:'mp4a'});
  J.Renderer=class{frame(ctx,p,t){ctx.canvas.pixel=t;}disposeAssets(){records.disposed=true;}};
  ctx.window.JIZURAAAC={encode:async(rs,bitrate,onChunk)=>{audioStart=performance.now();await new Promise(r=>setTimeout(r,20));onChunk({timestamp:0,duration:2000000},{});}};
  const promise=J.exportMP4({plan:{fps:30,duration:2,W:64,H:36},project:{includeAudio:true},audio:{buffer,duration:2},signal:controller.signal});
  if(abort){await assert.rejects(promise,/キャンセル/);assert(records.disposed);return;}
  await promise;assert(records.disposed);return {...records,elapsed:performance.now()-begin,overlap:audioStart<lastVideo};
 }
 const old=previous?await run(previous):null,now=await run(current);assert(now.overlap);assert.equal(now.video.length,60);assert.equal(now.audio.length,20);assert.equal(now.configs[0][1].latencyMode,'realtime');assert.equal(now.configs[1][1].bitrate,192000);if(old){assert(!old.overlap);for(const key of ['video','audio'])assert.equal(JSON.stringify(now[key]),JSON.stringify(old[key]));const legacyConfigs=JSON.parse(JSON.stringify(old.configs));legacyConfigs[0][1].latencyMode='realtime';assert.equal(JSON.stringify(now.configs),JSON.stringify(legacyConfigs));}
 await run(current,{abort:true});await run(current,{wasm:true});
 console.log(JSON.stringify({pipeline:'same frame pixels/timestamps/keyframes, same PCM/codec/bitrate; realtime latency to bound buffering',beforeMs:old?Math.round(old.elapsed):null,afterMs:Math.round(now.elapsed),nativeOverlap:now.overlap,cancellation:'clean',wasmAAC:'pass'}));
})().catch(e=>{console.error(e);process.exitCode=1;});
