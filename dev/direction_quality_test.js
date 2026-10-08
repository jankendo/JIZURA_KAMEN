'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const window={},document={getElementById(){return null},createElement(){return {getContext(){return {measureText(s){return {width:String(s).length*20}}}}}},fonts:{load:async()=>[],ready:Promise.resolve()},head:{appendChild(){}}};
const context=vm.createContext({window,document,console,Blob,TextEncoder,URL,setTimeout,clearTimeout,performance,requestAnimationFrame(){}});
for(const file of fs.readdirSync(path.join(__dirname,'../src')).filter(x=>x.endsWith('.js')).sort())vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),context,{filename:file});
const J=window.J;
const cases=[
  ['team',['アレアレガンバエー'],.74],
  ['player',['フォルツァ中谷ー','進之介アレー'],.68],
  ['lala',['ラララララー','ララララララー'],.35],
  ['song',['ガンバの空に響く声','この歌を歌い続けよう'],.7]
];
const map={width:12,height:8,values:Array.from({length:12*8},(_,i)=>i%12>=4&&i%12<=8?[.45,.9]:[.35,.03]).flat()};
for(const [name,phrases,energy] of cases){
  const p=J.defaultProject();p.lyrics=Array.from({length:12},(_,i)=>`[${String(Math.floor(i*4/60)).padStart(2,'0')}:${String(i*4%60).padStart(2,'0')}.00]${phrases[i%phrases.length]}`).join('\n');
  p.title='ガンバの歌';p.artist='GAMBA FAN MUSIC';p.customBg.enabled=true;
  p.autoPalette={...J.emptyAutoPalette(),analyzed:true,enabled:true,localMap:map,stats:{visualCenterX:.5,visualCenterY:.54,spaceLeft:.85,spaceRight:.85,spaceCenter:.1}};
  const audio={duration:54,features:{energy,onsetDensity:.55,beatStrength:.62,sectionContrast:name==='song'?.8:.14,timeline:Array.from({length:18},(_,i)=>({time:i*3,energy:i>12?energy:energy*.6,density:.55}))}};
  const proposal=J.proposeDirection(p,audio,p.autoPalette.stats);
  Object.assign(p,{style:proposal.style,mood:proposal.mood,fx:proposal.fx,enabled:proposal.enabled,seed:proposal.seed,autoDirection:true});p.artDirection=J.makeArtDirection(p,audio,proposal);
  const plan=J.plan(p,audio),cuts=plan.cuts.filter(c=>c.layout!=='interlude');
  assert(cuts.length>0,name);assert(new Set(cuts.map(c=>c.layout)).size<=7,'a bounded chapter layout vocabulary per song');
  assert(new Set(cuts.map(c=>c.params.font)).size===1,'one font in current lyrics');
  assert(cuts.every(c=>c.decor.length>=1&&c.decor.length<=2)&&cuts.some(c=>c.decor.length===1),'style signature stays present with at most one accent layer');
  assert(plan.events.length<=3&&plan.events.every(e=>J.FXE[e.type]?.draw),'registry effects stay sparse and executable');assert(plan.attentionBudget.withinBudget,'the attention budget remains bounded');
  assert(proposal.visualDNA.motionVocabulary.length<=4);
  assert(plan.lyricPlacement.x!==.5,'the salient central subject should remain visible');
  assert(plan.titleDisplay.titleSize*364/plan.W>=10,'title legibility in X timeline');
  assert(plan.titleDisplay.titleSize*.9*364/plan.W>=9,'artist legibility in X timeline');
  if(name!=='song'){
    assert(cuts.every(c=>['center','type','huge','diag','stack','split','splitScreen','vcols'].includes(c.layout)),'chants use a bounded readable layout family');
    assert.equal(cuts.length,plan.lines.length,'each chant line remains on screen as one unit');
    assert(cuts.every(c=>c.text===plan.lines[c.line].text));
  }
  if(name==='team'){
    p.artDirection.version=2;
    const migrated=J.preflightMV(p,{...audio,buffer:{}},{start:0,end:54},()=>J.plan(p,audio));
    assert.equal(p.artDirection.version,5,'an older saved direction is updated before export');
    assert(migrated.fixes>=1);
    assert(migrated.plan.cuts.filter(c=>c.layout!=='interlude').every(c=>['center','type','huge','diag','stack','split','splitScreen','vcols'].includes(c.layout)));assert(migrated.plan.styleArcAudit.coherent);
  }
}
const rendered=[];const original=J.drawItem;J.drawItem=(env,it)=>{rendered.push(it.text);return null;};
const r=Object.create(J.Renderer.prototype);r.editorDebug=false;
const env=r.makeEnv({}, {autoPalette:{},keyBg:null,customBg:{enabled:false}},null,{fg:'#fff'}, {pass:'main',scale:1});
env.draw({text:'LINE 02 | 00:07.00'});env.draw({text:'現在の歌詞'});
assert.deepEqual(rendered,['現在の歌詞'],'internal time/index labels cannot enter ordinary render');
r.editorDebug=true;env.draw({text:'LINE 02 | 00:07.00'});assert.equal(rendered.length,2,'explicit editor debug may show diagnostics');
J.drawItem=original;
console.log('CHANT readability, song grammar, subject placement, credit size and debug separation passed.');
