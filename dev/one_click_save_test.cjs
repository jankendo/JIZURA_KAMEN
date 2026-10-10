'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync(require('node:path').join(__dirname,'../src/11_export.js'),'utf8');
let clicks=0,closed=0,aborted=0;const nodes=new Map(),node=()=>({appendChild(){},append(){},setAttribute(){},addEventListener(){},remove(){},click(){clicks++;}});
const J={},window={},document={getElementById:id=>nodes.get(id),createElement:()=>node(),body:{appendChild(n){nodes.set(n.id,n)}}};
vm.runInNewContext(source.slice(source.indexOf('J.prepareFileSave ='),source.indexOf('/* Every asynchronous encoder')), {J,window,document,Blob,navigator:{userActivation:{isActive:true}},URL:{createObjectURL:()=> 'blob:test',revokeObjectURL(){}},console:{warn(){}}});
const cancelled=()=>Object.assign(Error('cancelled'),{name:'AbortError'});
(async()=>{
 window.showSaveFilePicker=()=>{throw cancelled()};assert.equal(await J.prepareFileSave('test.mp4','video/mp4'),'declined');
 window.showSaveFilePicker=async()=>{throw cancelled()};assert.equal(await J.prepareFileSave('test.mp4','video/mp4'),'declined');
 const writable={async write(){},async close(){closed++},async abort(){aborted++}};
 const destination={async createWritable(){return writable}};
 assert.equal(await J.saveFile('test.mp4',new Blob(['video']),{destination}),'saved');assert.equal(closed,1);assert.equal(clicks,0);
 writable.write=async()=>{throw cancelled()};assert.equal(await J.saveFile('test.mp4','video',{destination}),'declined');assert.equal(aborted,1);assert.equal(clicks,0,'write cancellation must not download');
 writable.write=async()=>{};writable.close=async()=>{throw cancelled()};assert.equal(await J.saveFile('test.mp4','video',{destination}),'declined');assert.equal(clicks,0);
 writable.close=async()=>{throw Error('disk unavailable')};assert.equal(await J.saveFile('test.mp4','video',{destination}),'download');assert.equal(clicks,1,'ordinary disk error preserves a usable file link');
 assert.equal(await J.saveFile('test.mp4.kamen-qa.json','{}',{automatic:false}),'download');assert.equal(clicks,1,'sidecar avoids multiple automatic downloads');
 console.log('Native write/close, picker/write/close cancellation and retained download fallback PASS');
})().catch(error=>{console.error(error);process.exitCode=1});
