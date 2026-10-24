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
