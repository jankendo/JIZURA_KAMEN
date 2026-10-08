'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const window={},document={getElementById(){return null},createElement(){return {getContext(){return {measureText(s){return {width:String(s).length*20}}}}}},fonts:{load:async()=>[],ready:Promise.resolve()},head:{appendChild(){}}};
const ctx=vm.createContext({window,document,console,Blob,TextEncoder,URL,setTimeout,clearTimeout,performance,requestAnimationFrame(){}});
for(const name of fs.readdirSync(path.join(__dirname,'../src')).filter(x=>x.endsWith('.js')).sort())vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',name),'utf8'),ctx,{filename:name});
const J=window.J;
const scenarios=[
  ['fastCall',['アレアレガンバエー'],{bpm:155,energy:.88,onsetDensity:.9,beatStrength:.9,sectionContrast:.18,spectralFlux:.72,brightness:.52}],
  ['player',['フォルツァ中谷ー','進之介アレー'],{bpm:119,energy:.67,onsetDensity:.56,beatStrength:.67,sectionContrast:.25,spectralFlux:.4,brightness:.35}],
  ['anthem',['遠く響く声が空を越えていく','立ち上がれ僕らの明日へ','この光を掴むその日まで'],{bpm:98,energy:.74,onsetDensity:.34,beatStrength:.48,sectionContrast:.8,spectralFlux:.27,bass:.78,smoothness:.72}],
  ['ballad',['静かな朝に思い出す君の声','届かない言葉がまだ胸にある','遠い空の向こうへ祈りを送る'],{bpm:72,energy:.24,onsetDensity:.15,beatStrength:.24,sectionContrast:.5,spectralFlux:.12,smoothness:.87}],
];
const signatures=[];
for(const [name,phrases,features] of scenarios){
  const p=J.defaultProject();p.lyrics=Array.from({length:12},(_,i)=>`[${String(Math.floor(i*4/60)).padStart(2,'0')}:${String(i*4%60).padStart(2,'0')}.00]${phrases[i%phrases.length]}`).join('\n');
  p.customBg.enabled=true;p.autoPalette={...J.emptyAutoPalette(),stats:{visualCenterX:.53,visualCenterY:.5,spaceLeft:.76,spaceRight:.25,spaceCenter:.2}};
  const audio={duration:50,beats:Array.from({length:Math.ceil(50*features.bpm/60)},(_,i)=>i*60/features.bpm),
    features:{...features,timeline:Array.from({length:17},(_,i)=>({time:i*3,energy:i>9?features.energy:features.energy*.57,density:features.onsetDensity}))}};
  const d=J.proposeDirection(p,audio,p.autoPalette.stats);
  Object.assign(p,{style:d.style,mood:d.mood,fx:d.fx,enabled:d.enabled,seed:d.seed,autoDirection:true});p.artDirection=J.makeArtDirection(p,audio,d);
  const film=J.plan(p,audio),motion=film.artDirection.motionDNA,sig=J.motionSignature(film);
  signatures.push(sig);console.log(name,JSON.stringify(sig));
  const songLayouts=film.cuts.filter(c=>c.layout!=='interlude').map(c=>c.layout),layoutCounts=new Map();songLayouts.forEach(x=>layoutCounts.set(x,(layoutCounts.get(x)||0)+1));assert(songLayouts.length>0&&layoutCounts.size<=7,'coherent chapters keep a bounded visual grammar');assert(Math.max(...layoutCounts.values())/songLayouts.length>=1/7,'a primary grammar remains present across chapters');assert(film.styleArcAudit.coherent,'style changes are bridged through compatible identities');
  assert(motion.transitionDuration<=.55&&motion.transitionDuration>=.1);
  for(const cut of film.cuts.filter(c=>c.layout!=='interlude').slice(1)){
    const a=J.cameraAt(film,Math.max(0,cut.start-.001)),b=J.cameraAt(film,cut.start+.001);
    assert(Math.abs(a.s-b.s)<.002&&Math.abs(a.x-b.x)<film.W*.002&&Math.abs(a.y-b.y)<film.H*.002,`camera must remain continuous at every LRC boundary: ${JSON.stringify({cut:cut.start,a,b})}`);
  }
  const c0=J.cameraAt(film,0),c1=J.cameraAt(film,film.duration);
  assert(Math.abs(c0.s-c1.s)<.001&&Math.abs(c0.x-c1.x)<.001,'short video camera returns to its first pose');
  const clip={start:8,end:38},ca=J.cameraAt(film,clip.start,clip),cb=J.cameraAt(film,clip.end,clip);
  assert(Math.abs(ca.s-cb.s)<.001&&Math.abs(ca.x-cb.x)<.001,'60-second selection has matching camera endpoints');
  const shortClip={start:8,end:8.4},sa=J.cameraAt(film,shortClip.start,shortClip),sb=J.cameraAt(film,shortClip.end,shortClip);
  assert(Math.abs(sa.s-sb.s)<.001&&Math.abs(sa.x-sb.x)<.001,'subsecond clip has matching camera endpoints');
  const alt1=J.proposeDirection(p,audio,p.autoPalette.stats,1),alt2=J.proposeDirection(p,audio,p.autoPalette.stats,2);
  assert.notEqual(alt1.motionDNA.signature,alt2.motionDNA.signature,'alternative choices require distinct motion directions');
  assert.equal(alt1.motionDNA.subtype,alt2.motionDNA.subtype,'alternative must preserve the chant subtype');
  if(name==='fastCall'){
    assert(motion.motionSpeed>.55);assert(motion.transitionDuration<=.25);
    assert(film.cuts.some(c=>c.repeated&&c.inDur===0),'repeated chants keep continuous screen-space lyrics');
    assert(film.cuts.filter(c=>c.repeated).every(c=>c.inDur===0&&c.enter==='cut'),'repeated lines have no entrance visibility gap');
    const amended=film.cuts.find(c=>c.line>=0&&!c.repeated);amended.inDur=.62;
    assert(J.checkMVQuality(p,film,{...audio,buffer:{}},{start:0,end:50}).issues.some(i=>i.code==='transition_long'));
    amended.inDur=.2;
  }
}
assert(new Set(signatures.map(x=>JSON.stringify(x))).size>=3,'distinct songs need distinct motion signatures');
assert.notEqual(signatures[0].font,signatures[3].font,'fast chant and ballad require distinct typography');
assert.notEqual(signatures[0].entrance,signatures[3].entrance,'fast chant and ballad need distinct entry motion');
const copiedDNA={font:'gothic_black',entranceMotion:'wipe',sustainMotion:'beatPulse',exitMotion:'cut',cameraMode:'hold',beatResponse:.7};
const copiedPlan={artDirection:{motionDNA:copiedDNA},lyricPlacement:{x:.5,y:.5}};
assert.equal(J.auditMotionDiversity([copiedPlan,copiedPlan],
  [{energy:.9,onsetDensity:.9,beatStrength:.9},{energy:.1,onsetDensity:.1,beatStrength:.1}]).length,1,'identical signatures for distinct audio must be flagged');
console.log('Motion DNA signatures and continuous camera passed.');
