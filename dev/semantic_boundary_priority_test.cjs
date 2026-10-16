'use strict';
const assert=require('node:assert/strict');
const {J,createCanvas}=require('./custom_test_support.cjs').engine();
const ctx=createCanvas(600,600).getContext('2d'),originalBreaks=J.lyricBreaks;let checks=0;
const cost=(text,rows,options={})=>{const ledger=originalBreaks(text,options),by=new Map(ledger.boundaries.map(b=>[b.offset,b.cost]));let offset=0,total=0;for(const row of rows.slice(0,-1)){offset+=row.length;assert(by.has(offset),'Inserted line break must remain a legitimate source boundary');total+=by.get(offset);}return total;};
const neutral=(text,options)=>{J.lyricBreaks=(s,o)=>{const r=originalBreaks(s,o);return {...r,boundaries:r.boundaries.map(b=>({...b,cost:0}))};};try{return J.semanticLyricLayout(text,options);}finally{J.lyricBreaks=originalBreaks;}};
const options={ctx,font:'zenkaku',size:54,maxWidth:260,maxHeight:150,maxLines:2};
const source='何も言わず朝を待つ',baseline=neutral(source,options),fixed=J.semanticLyricLayout(source,options);
assert.equal(baseline.text,'何も言わ\nず朝を待つ');assert.equal(fixed.text,'何も言わず\n朝を待つ');assert.equal(fixed.size,baseline.size);assert.equal(fixed.rows.length,baseline.rows.length);assert.equal(fixed.fits,baseline.fits);assert(cost(source,fixed.rows)<cost(source,baseline.rows));checks+=6;
for(const text of ['消えない灯りを胸に抱く','抱きしめた風が通り過ぎる','雨が上がれば空を見よう','遠い空を見上げて歩く','Silver rivers cross the night','We’re moving through light','Cafe\u0301 lights return','声👩‍🎤が夜を越えていく'])for(const [w,h]of[[230,140],[310,190]]){
 const o={ctx,font:'zenkaku',size:48,maxWidth:w,maxHeight:h,maxLines:2},before=neutral(text,o),after=J.semanticLyricLayout(text,o);
 assert.equal(after.text.replace(/\n/g,''),text);assert.equal(after.size,before.size);assert.equal(after.rows.length,before.rows.length);assert.equal(after.height,before.height);assert.equal(after.fits,before.fits);assert.equal(after.selectedBreakCost,cost(text,after.rows));assert(cost(text,after.rows)<=cost(text,before.rows));checks+=7;
}
for(const o of [{manual:true},{fallback:true},{maxWidth:10000}]){const r=J.semanticLyricLayout(source,{...options,...o});assert.equal(r.text.replace(/\n/g,''),source);if(o.manual||o.maxWidth)assert.equal(r.text,source);checks+=2;}
for(const text of ['風が\n通り過ぎる','Keep\nthis break','雨\r\nのち晴れ']){assert.equal(J.semanticLyricLayout(text,options).text,text);checks++;}
const longWord='Supercalifragilisticexpialidocious';assert.equal(J.semanticLyricLayout(longWord,{...options,maxWidth:100}).text,longWord);checks++;
console.log(JSON.stringify({status:'PASS',checks,scope:'Original text and clusters, author/manual breaks, font/row/fit/height preservation, and nondominated existing linguistic boundary cost; no score or threshold changes'}));
