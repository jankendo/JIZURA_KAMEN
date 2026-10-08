'use strict';
const assert=require('node:assert/strict'),{engine}=require('./custom_test_support.cjs');
const {J,createCanvas}=engine();
(async()=>{
const luma=c=>{const d=c.getContext('2d').getImageData(0,0,c.width,c.height).data;let n=0;for(let i=0;i<d.length;i+=4)n+=d[i]*.2126+d[i+1]*.7152+d[i+2]*.0722;return n/(d.length/4)/255;};
const canvas=createCanvas(320,180),ctx=canvas.getContext('2d'),scratch=createCanvas(320,180);
const fill=()=>{ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.fillStyle='#334455';ctx.fillRect(0,0,320,180);scratch.getContext('2d').drawImage(canvas,0,0);};
const info={cw:320,ch:180,S:scratch,sc:{bg:'#101010',fg:'#ffffff'},allowFilter:false,photoReadablePolicy:true};
fill();const base=luma(canvas);J.FXE.bloomFlash.draw(ctx,{amp:.12},.12,info);const increase=luma(canvas)-base;assert(increase<.06,'actual bloom pixel lift must stay bounded: '+increase);
fill();J.FXE.bloomFlash.draw(ctx,{amp:0},.12,{...info,photoReadablePolicy:false});assert.equal(luma(canvas),base,'zero amplitude must not create minimum-strength bloom');
fill();const A=createCanvas(320,180),B=createCanvas(320,180);A.getContext('2d').drawImage(canvas,0,0);B.getContext('2d').drawImage(canvas,0,0);
J.TRANS.flashCross.draw(ctx,A,B,.45,{...info,P:{c:'white'}});assert(luma(canvas)-base<.06,'photo transition must preserve white-text contrast');
const glyph=createCanvas(320,180),gctx=glyph.getContext('2d'),glyphEnv={ctx:gctx,W:320,H:180,scale:1,pass:'main',allowFilter:false,inLayer:true,plan:{}};
 const glyphItem={text:'青黒',font:'gothic_black',size:100,x:160,y:90,color:'#ffffff',strokeColor:'#000000',stroke:4,strokeUnder:true};J.drawItem(glyphEnv,glyphItem);const normal=Buffer.from(gctx.getImageData(0,0,320,180).data);gctx.clearRect(0,0,320,180);J.drawItem(glyphEnv,{...glyphItem,charFn:()=>({color:'#ffffff'})});assert(Buffer.from(gctx.getImageData(0,0,320,180).data).equals(normal),'character fill color must not repaint explicit separation stroke');
 const env={W:1920,H:1080,scale:1,t:1,ctx:createCanvas(1920,1080).getContext('2d'),plan:{directionOverrides7:{}},cut:{line:0,params:{readablePhoto:true}}};
const item=J.safeLyricItem(env,{text:'我らの歌声響かせろ',font:'gothic_black',size:380,x:960,y:540,stroke:20});const bounds=J.measureLyricItemBounds(env,item);assert(bounds.x0>=1920*.11-1&&bounds.x1<=1920*.89+1);assert(item.stroke<20,'stroke must scale with fitted glyph');
const lines=[{text:'一',start:2,end:4},{text:'二',start:4,end:6},{text:'一',start:6,end:8},{text:'二',start:8,end:10}],p={duration:14,lines,beats:[],artDirection:{sectionProfiles:[]}};
const flat=J.analyzeMusicalStructure(p,{features:{energy:.5}},{ });assert.equal(flat.sections.find(s=>s.from===6).role,'reprise');assert.equal(flat.sections.find(s=>s.from===6).boundaryConfidence,.9);assert(flat.sections.find(s=>s.from===6).roleConfidence<.9);
const rising=J.analyzeMusicalStructure(p,{features:{timeline:Array.from({length:14},(_,time)=>({time,energy:time>=6&&time<10?.8:.4}))}},{});assert.equal(rising.sections.find(s=>s.from===6).role,'climax');assert.equal(rising.sections.find(s=>s.from===6).roleEvidence,'repetition-and-energy-rise');
const plan={singleBackground:true,customBg:{enabled:true},W:320,H:180,style:{schemes:[{accent:'#ffff00'}]},visualWorld:{motifs:['stripe'],chapters:[{from:0,to:14,photoExit:false}]},musicalStructure:{sections:[{from:0,to:14,role:'climax'}]}};
ctx.clearRect(0,0,320,180);J.drawUnifiedMotif(ctx,plan,2);assert.equal(luma(canvas),0,'automatic photo must not acquire unrelated stripe decoration');
const intro={...plan,musicalStructure:{sections:[{from:0,to:4,role:'intro'},{from:10,to:14,role:'outro'}]},cuts:[]};assert(J.cameraAt(intro,3).s>J.cameraAt(intro,1).s);assert(J.cameraAt(intro,13).s<J.cameraAt(intro,11).s);
plan.directorSections7=[{from:20,to:30,motif:'wave'}];plan.duration=14;const motifReport=await J.measureMotifReality7(plan,{start:0,end:14});assert.equal(motifReport.applicable,false);assert.equal(motifReport.score,null);
assert.equal(J.audienceImpact7({signals:[],peaks:[]},intro).climaxApplicable,false);assert.equal(J.chapterIntent({role:'reprise'}),'reprise');
 console.log(JSON.stringify({bloomPixelLift:increase,widthLimit:.78,flatRefrain:'reprise',risingRefrain:'climax',photoMotif:'artwork',lyricFreeCamera:'continuous',status:'PASS'}));

})().catch(e=>{console.error(e);process.exitCode=1;});
