'use strict';
const assert=require('node:assert/strict');
const {J,createCanvas}=require('./custom_test_support.cjs').engine();
const ctx=createCanvas(1,1).getContext('2d');
let checks=0;
for(const source of ['追いつけない昨日を置く','飛び越えたい明日の壁を','振り返らない遠い道を']){
 for(const [maxWidth,maxHeight] of [[1094.4,774],[780,774],[400,1000]]){
  const options={font:'embedded_bold',size:189,maxWidth,maxHeight,lead:1.26,track:.015,ctx};
  const r=J.semanticLyricLayout(source,options);
  assert.equal(r.text.replace(/\n/g,''),source);
  assert(r.fits);assert.equal(r.automaticOrphanRows.length,0);
  assert(r.widths.every(w=>w<=maxWidth+.01)&&r.height<=maxHeight+.01);
  for(const offset of r.rows.slice(0,-1).reduce((a,row)=>[...a,(a.at(-1)||0)+row.length],[]))assert(J.lyricBreaks(source).boundaries.some(b=>b.offset===offset));
  checks+=5;
 }
}
for(const source of ['追\nいつけない\n昨日を置く','夢','👩‍🎤','Cafe\u0301','Keep this word intact']){
 const r=J.semanticLyricLayout(source,{font:'embedded_bold',size:48,maxWidth:1000,maxHeight:1000,ctx});
 assert.equal(r.text,source);assert.equal(r.orphanRepairApplied,false);checks+=2;
}
const options={font:'embedded_bold',size:189,maxWidth:1094.4,maxHeight:774,lead:1.26,track:.015,ctx};
const source='追いつけない昨日を置く';
const repaired=J.semanticLyricLayout(source,options);
assert.equal(repaired.text,'追いつけない\n昨日を置く','Merge the orphan with its neighbour rather than moving the break into the next word');checks++;
for(const protectedOption of [{manual:true},{allowSingleCharacterLines:true}]){
 const r=J.semanticLyricLayout(source,{...options,...protectedOption});
 assert.equal(r.orphanRepairApplied,false);assert.equal(r.text,protectedOption.manual?source:'追\nいつけない\n昨日を置く');checks+=2;
}
// A fixed size that cannot fit a non-orphan alternative reports the defect;
// it must not invent boundaries or falsely mark overflow as repaired.
const constrained=J.semanticLyricLayout('明日へ',{...options,size:100,minSize:100,maxWidth:110,maxHeight:500});
assert.equal(constrained.orphanRepairApplied,false);checks++;
console.log(JSON.stringify({status:'PASS',checks,scope:'automatic linguistic candidates, measured bounds, source preservation, explicit/manual/intentional breaks and Unicode clusters'}));
