'use strict';
const assert=require('node:assert/strict');
const {engine}=require('./custom_test_support.cjs');
const {J,createCanvas}=engine();
(async()=>{
 const plain=J.importLyricsFile('\uFEFF青黒の声\r\n響かせろ','lyrics.TXT');
 assert.equal(plain.count,2);assert.equal(plain.timed,false);assert.equal(plain.lyrics,'青黒の声\n響かせろ');
 for(const name of ['lyrics.lrc','lyrics.txt']){
  const imported=J.importLyricsFile('[00:12.00]青黒の声\n[00:16.00]響かせろ',name);
  assert(imported.timed);assert.equal(J.parseLyrics(imported.lyrics).lines[0].lrc,12);
 }
 assert.throws(()=>J.importLyricsFile('','lyrics.txt'));assert.throws(()=>J.importLyricsFile('時刻なし','lyrics.lrc'));
 const audio={duration:30,beats:Array.from({length:60},(_,i)=>i*.5),features:{bpm:120,energy:.6,beatStrength:.7,onsetDensity:.5,density:.5}};
 for(const start of [0,3,12,24]){
  const p=J.defaultProject();Object.assign(p,{lyrics:`[00:${start.toFixed(2).padStart(5,'0')}]青黒の声\n[00:${(start+3).toFixed(2).padStart(5,'0')}]響かせろ`,autoDirection:true,title:'',artist:''});
  const d=J.proposeDirection(p,audio,null);Object.assign(p,{style:d.style,mood:d.mood,fx:d.fx,enabled:d.enabled,seed:d.seed});p.artDirection=J.makeArtDirection(p,audio,d);
  const plan=J.plan(p,audio);assert.equal(plan.lines[0].start,start);assert.equal(plan.hookEngine.firstCut.start,start);
  assert(!plan.cuts.some(c=>c.line>=0&&c.layout!=='interlude'&&c.start<start));
  const q=J.checkMVQuality(p,plan,audio,{start:0,end:30});assert(!q.errors.some(e=>e.code==='hook_weak'));
  const h=J.hypeQuality(p,plan,audio,{start:0,end:30});assert(Number.isFinite(h.hookStrength));
  const canvas=createCanvas(640,360),renderer=new J.Renderer(),items=[];
  renderer.frame(canvas.getContext('2d'),plan,start+.5,{scale:640/plan.W,production:true,lyricAuditItems:items,lyricAuditCtx:createCanvas(640,360).getContext('2d')});
  assert(items.some(item=>item.line===0&&item.bounds),'actual lyric rendered at '+start);
  const endRange=J.hypeQuality(p,plan,audio,{start:29,end:30});assert(!endRange.hardFail,'no lyric requirement for lyric-free outro');
 }
 let calls=0;const analyze=J.analyzeRenderedFrames,fix=J.fixMVQuality;
 J.analyzeRenderedFrames=async()=>{calls++;return {completed:false,issues:[],metrics:{}};};J.fixMVQuality=()=>0;
 try{const p={...J.defaultProject(),lyrics:plain.lyrics};const set=await J.optimizeDirectionCandidatesRendered(p,audio,null,1,{onProgress(){}});assert.equal(set.candidates.length,1);assert.equal(calls,1);assert.equal(set.recommended.variant,0);assert.equal(set.recommended.plan.lines.length,2);}finally{J.analyzeRenderedFrames=analyze;J.fixMVQuality=fix;}
 console.log('TXT/LRC import, delayed real-canvas lyrics (0/3/12/24s), intro/outro export gates and single generated candidate passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
