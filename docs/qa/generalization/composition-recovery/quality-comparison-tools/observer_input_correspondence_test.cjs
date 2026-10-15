const assert=require('node:assert/strict'),classify=require('./observer_input_correspondence.cjs');
const keys=['audioHash','imageHashes','lyricsHash','projectHash','rendererVersion','proceduralTextureVersion','outputProfile','userLocks','inputHash'],base=Object.fromEntries(keys.map(k=>[k,true]));let count=0;
assert.equal(classify(base),'MATCHED');count++;assert.equal(classify({...base,audioHash:false,inputHash:false}),'VISUAL_ONLY_PCM_MISMATCH');count++;
for(const k of keys.filter(k=>!['audioHash','inputHash'].includes(k))){assert.equal(classify({...base,audioHash:false,inputHash:false,[k]:false}),'REJECT_NON_AUDIO_MISMATCH');count++;}
for(const k of keys){let x={...base};delete x[k];assert.equal(classify(x),'REJECT_INCOMPLETE_CONTRACT');count++;}
assert.equal(classify({...base,inputHash:false}),'REJECT_NON_AUDIO_MISMATCH');count++;
console.log(JSON.stringify({status:'PASS',cases:count,scope:'Visual-only observation cannot certify a mismatched input or audio/FAV; all non-audio mismatches reject'}));
