'use strict';
const assert=require('node:assert/strict');
const {J,createCanvas}=require('./custom_test_support.cjs').engine();
const protect=J.climaxSplitNeedsProtection;
for(const [source,split,expected] of [
 ['Bright voices','Bright voi\nces',true],
 ['Bright voices','Bright \nvoices',false],
 ['sky42 rising','sky4\n2 rising',true],
 ['翼👩‍🎤と空','翼👩‍\n🎤と空',true],
 ['Cafe\u0301','Cafe\n\u0301',true],
 ['Cafe\u0301time','Cafe\u0301\ntime',true],
 ["Don't turn away","Don'\nt turn away",true],
 ['We’re moving','We\n’re moving',true],
 ['遠い空を見上げる','遠い空を\n見上げる',false],
 ['Keep\nthis break','Keep\nthis \nbreak',true],
])assert.equal(protect(source,split),expected,JSON.stringify({source,split}));
let checks=10;
const originalMain=J.mainDraw;
try{
 for(const [W,H] of [[1280,720],[720,1280],[720,720]]){
  const source='Brave voices cross the night',cut={index:0,line:0,start:0,end:4,dur:4,text:source,lineText:source,layout:'cinemaGrammarsolo',params:{font:'embedded_bold'},grammar:{mode:'solo',stage:1,field:'hero',temporal:{climax:true}}};
  const p={W,H,fps:24,duration:4,lines:[{text:source,start:0,end:4}],cuts:[cut]},ctx=createCanvas(W,H).getContext('2d'),env={W,H,ctx,plan:p,cut,t:2,lt:2,pass:'main'};
  let drawn;J.mainDraw=(e,it)=>(drawn=it);
  J.LAYOUTS.cinemaGrammarsolo.render(env);
  assert(drawn);assert.equal(drawn.text.replace(/\n/g,''),source,'Every source character and space survives');
  assert.equal(protect(source,drawn.text),false,'The actual climax item must respect word/cluster boundaries');
  const shared=J.cinemaSemanticLyricLayout(p,cut,ctx);assert.equal(drawn.text,shared.text);assert.equal(drawn.size,shared.size);
  assert(Number.isFinite(drawn.size)&&drawn.size>0);checks+=6;
  // Safe Japanese climax composition keeps its existing equal-row geometry.
  const japanese='朝の風が空へ届く';cut.text=cut.lineText=japanese;J.LAYOUTS.cinemaGrammarsolo.render(env);
  const chars=Array.from(japanese),parts=chars.slice(0,Math.ceil(chars.length/2)).join('')+'\n'+chars.slice(Math.ceil(chars.length/2)).join('');
  assert.equal(drawn.text,parts);assert.equal(drawn.size,Math.min(H*(W>H?.185:.105),J.fitSize(parts,'embedded_bold',W*.84,H*.64,{lead:1.12,track:.015})));checks+=2;
  // The new protection cannot override user locks or non-climax rendering.
  J.climaxSplitNeedsProtection=()=>{throw Error('Protected branch must not be entered');};
  cut.locked=true;assert.doesNotThrow(()=>J.LAYOUTS.cinemaGrammarsolo.render(env));
  cut.locked=false;cut.grammar.temporal.climax=false;assert.doesNotThrow(()=>J.LAYOUTS.cinemaGrammarsolo.render(env));checks+=2;
  J.climaxSplitNeedsProtection=protect;
 }
 console.log(JSON.stringify({status:'PASS',checks,profiles:['16:9','9:16','1:1'],scope:'Actual automatic climax item matches existing semantic renderer/QA layout when a token or cluster would be cut. Already-safe geometry, manual locks and non-climax branches preserved.'}));
}finally{J.mainDraw=originalMain;J.climaxSplitNeedsProtection=protect;}
