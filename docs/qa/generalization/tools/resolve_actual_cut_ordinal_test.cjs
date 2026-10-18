'use strict';const assert=require('assert/strict'),{resolveActualCutOrdinal:resolve}=require('./resolve_actual_cut_ordinal.cjs');
const cuts=[{index:7,line:0,start:0,end:2,text:'同じ行'},{index:7,line:0,start:2,end:4,text:'同じ行'}],p={cuts};assert.equal(resolve(p,cuts[1]),1);assert.equal(resolve(p,{...cuts[1]}),1);assert.equal(resolve(p,{...cuts[0]}),0);assert.equal(resolve(p,null),-1);
for(const patch of [{start:1},{text:'別の文字'},{line:1},{index:8}])assert.throws(()=>resolve(p,{...cuts[1],...patch}),/NOT_UNIQUE/);
assert.throws(()=>resolve({cuts:[cuts[1],{...cuts[1]}]},{...cuts[1]}),/NOT_UNIQUE/);console.log('9 PASS: cloned cuts, same-line fragments, authored IDs, changed geometry/text and ambiguity rejected');
