const assert=require('node:assert/strict'),{J,draw,createCanvas}=require('./raster_test_support.cjs');
const p=J.defaultProject();p.lyrics='[00:00.00]日本語の歌詞\n[00:02.00]次の行も見える';p.title='';p.artist='';p.aspect='9:16';p.artDirection={realityVersion:2};
const plan=J.plan(p,{duration:5,beats:[],energy:new Float32Array(250),energyRate:50});
const frame=draw(plan,1,[180,320]);assert(frame.ink>40,'active glyphs must paint actual alpha pixels');
const report=J.checkMVQuality(p,plan,{duration:5,buffer:{}},null,{completed:true,issues:[{code:'LYRIC_NOT_RENDERED',severity:'ERROR',message:'missing'}],metrics:{lyricNotRendered:1}});
assert.equal(report.ready,false);assert(report.quality.score<100);
console.log('Actual Canvas lyric pixels and hard absence gate passed.');

// Typography may wrap source words; decorative copies cannot lend their alpha.
{
 const c=plan.cuts.find(c=>c.line===0),R=new J.Renderer();
 const canvas=createCanvas(180,320),audit=createCanvas(180,320);
 c.text=c.lineText='Frequency blooms beneath the moon';
 R.lyricAuditCtx=audit.getContext('2d');
 const env=R.makeEnv(canvas.getContext('2d'),plan,c,plan.style.schemes[0],{pass:'main',t:1,lt:1,ltb:1,scale:1});
 const hasInk=()=>audit.getContext('2d').getImageData(0,0,180,320).data.some((v,i)=>i%4===3&&v>16);
 env.draw({text:'Frequency blooms\nbeneath the moon',font:'embedded_bold',size:20,x:90,y:160,color:'#fff',alpha:1});
 assert(hasInk(),'wrapped primary source words must produce actual audit pixels');
 audit.getContext('2d').clearRect(0,0,180,320);
 J.decorativeLyricContexts.set(env.ctx,true);
 try{env.draw({text:c.text,font:'embedded_bold',size:20,x:90,y:160,color:'#fff',alpha:1});}
 finally{J.decorativeLyricContexts.delete(env.ctx);}
 assert(!hasInk(),'decorative full-line copies cannot certify primary words');
}
