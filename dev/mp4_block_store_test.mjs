import assert from 'node:assert/strict';
globalThis.window={};
const {MP4BlockStore}=await import('../scripts/aac-browser-entry.mjs');
const store=new MP4BlockStore(8);
store.write(Uint8Array.from([1,2,3,4,5,6,7,8,9,10]),0);
store.write(Uint8Array.from([40,50,60,70]),6); // overwrite across the page boundary
store.write(Uint8Array.from([99]),19);        // unwritten regions are zero-filled
assert.deepEqual([...new Uint8Array(await store.blob().arrayBuffer())],[1,2,3,4,5,6,40,50,60,70,0,0,0,0,0,0,0,0,0,99]);
const snapshot=store.blob();store.write(Uint8Array.from([255]),0);store.clear();
assert.equal(new Uint8Array(await snapshot.arrayBuffer())[0],1,'Blob must survive page reuse and cleanup');
assert.throws(()=>store.write(new Uint8Array(1),-1),/position/);
console.log('Positioned MP4 writes, cross-page patches, sparse zero fill and Blob lifetime PASS');

const {createHash}=await import('node:crypto');
for(const text of ['', 'abc'])assert.equal(await window.JIZURAMedia.hashBlob(new Blob([text])),createHash('sha256').update(text).digest('hex'));
const data=Uint8Array.from({length:1024*1024+17},(_,i)=>i%251),blob=new Blob([data]),slice=blob.slice.bind(blob);let reads=0;
Object.defineProperty(blob,'arrayBuffer',{value:()=>{throw Error('Whole-file read is forbidden');}});
Object.defineProperty(blob,'slice',{value:(start,end)=>{assert(end-start<=1024*1024,'hash reads must be bounded');reads++;return slice(start,end);}});
assert.equal(await window.JIZURAMedia.hashBlob(blob),createHash('sha256').update(data).digest('hex'));assert(reads>1);
const controller=new AbortController();await assert.rejects(window.JIZURAMedia.hashBlob(blob,{signal:controller.signal,onProgress:()=>controller.abort()}),{name:'AbortError'});
console.log('Incremental SHA-256 matches independent vectors, forbids full-file reads and supports mid-read cancellation PASS');
