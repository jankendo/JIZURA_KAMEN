const assert=require('node:assert/strict'),J=require('./style_test_harness.cjs'),scenarios=require('./fixtures/style_scenarios.json');
for(const key of J.STYLE_ORDER){const s=scenarios[key];assert(s,key+' witness required');const p={...J.defaultProject(),extra:true};const result=J.rankStyles(p,s.music,s.image,s.lyrics,{});assert.equal(result.selected,key);assert.equal(result.candidates.length,J.STYLE_ORDER.length);console.log(key,result.candidates.slice(0,3).map(c=>`${c.style}:${c.score}`).join(' '));}
assert.equal(new Set(J.STYLE_ORDER.map(k=>JSON.stringify(J.buildStyleProfile(k)))).size,J.STYLE_ORDER.length);
console.log('24/24 style reachability PASS');
