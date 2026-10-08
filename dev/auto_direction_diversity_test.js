/* Input sensitivity and deterministic film-level coherence. Run: node dev/auto_direction_diversity_test.js */
'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const window={},document={getElementById(){return null},createElement(){return {getContext(){return {measureText(s){return {width:String(s).length*20}}}}}},fonts:{load:async()=>[],ready:Promise.resolve()},head:{appendChild(){}}};
const c=vm.createContext({window,document,console,Blob,TextEncoder,URL,setTimeout,clearTimeout,performance,requestAnimationFrame(){}});
for(const file of fs.readdirSync(path.join(__dirname,'../src')).filter(x=>x.endsWith('.js')).sort())vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),c,{filename:file});
const J=window.J, lyrics=Array.from({length:24},(_,i)=>`[${String(Math.floor(i*3.5/60)).padStart(2,'0')}:${(i*3.5%60).toFixed(2).padStart(5,'0')}]${i%6===0?'君へ':'夜空を見上げて歩いていく'}`).join('\n');
const image=(median,chroma,warmth,detail,spaceRight,spaceLeft)=>({median,chroma,warmth,detail,contrast:detail*.9+.13,negativeSpace:1-detail,spaceRight,spaceLeft,spaceCenter:.5,visualCenterX:spaceRight>spaceLeft?.3:.7});
const audio=(bpm,energy,density,contrast,bass,brightness)=>({duration:90,features:{bpm,tempo:(bpm-65)/115,energy,intensity:energy,density,onsetDensity:density,beatStrength:density,sectionContrast:contrast,development:contrast,dynamics:contrast,bass,brightness,smoothness:1-density,
  timeline:Array.from({length:30},(_,i)=>({time:i*3,energy:Math.max(.08,energy+(i>=10&&i<20?contrast*.38:-contrast*.3)),density:i>=10&&i<20?density:Math.max(0,density-.2),brightness}))}});
const cases={
  darkBallad:[image(.14,.13,.25,.15,.72,.25),audio(74,.3,.12,.3,.35,.22)],
  neonEDM:[image(.18,.78,.24,.7,.23,.3),audio(154,.92,.9,.79,.88,.81)],
  warmRock:[image(.44,.36,.91,.62,.78,.24),audio(120,.8,.7,.65,.57,.61)],
  brightPop:[image(.85,.83,.82,.43,.3,.7),audio(136,.76,.68,.35,.32,.72)],
  acoustic:[image(.75,.11,.76,.08,.7,.15),audio(92,.22,.13,.12,.18,.29)]
};
const results={};
for(const [name,[img,song]] of Object.entries(cases)){
  const p=J.defaultProject();p.lyrics=lyrics;p.customBg.enabled=true;
  const recommendation=J.proposeDirection(p,song,img);
  Object.assign(p,{style:recommendation.style,mood:recommendation.mood,fx:recommendation.fx,enabled:recommendation.enabled,seed:recommendation.seed,autoDirection:true});
  p.artDirection=J.makeArtDirection(p,song,recommendation);
  const plan=J.plan(p,song);
  assert.equal(J.inspectDirection(plan).coherent,true,name+' uses a coherent vocabulary');
  assert.equal(recommendation.seed,J.proposeDirection(p,song,img).seed,'same media produces same DNA and seed');
  const oldSeed=p.seed;p.seed=oldSeed+1;assert.equal(JSON.stringify(J.plan(p,song).artDirection.visualDNA),JSON.stringify(plan.artDirection.visualDNA));
  assert.equal(JSON.stringify(J.plan(p,song).cuts.map(x=>x.layout)),JSON.stringify(plan.cuts.map(x=>x.layout)),'a different seed cannot change the song-wide layout grammar');
  const r=results[name]={dna:recommendation.visualDNA,confidence:recommendation.debug.confidence,style:recommendation.style,mood:recommendation.mood,
    layouts:[...new Set(plan.cuts.filter(x=>x.layout!=='interlude').map(x=>x.layout))],cameras:[...new Set(plan.cuts.map(x=>x.cam))],
    intensity:[Math.min(...p.artDirection.intensityCurve),Math.max(...p.artDirection.intensityCurve)],events:plan.events.length};
  console.log(name,JSON.stringify(r));
}
const names=Object.keys(results),similarities={};
const sameImageCases=[['ballad',cases.darkBallad[1]],['edm',cases.neonEDM[1]]].map(([,song])=>J.proposeDirection(Object.assign(J.defaultProject(),{lyrics}),song,cases.darkBallad[0]));
assert.notEqual(sameImageCases[0].visualDNA.motionStrategy,sameImageCases[1].visualDNA.motionStrategy);
assert.notEqual(sameImageCases[0].visualDNA.cameraStrategy,sameImageCases[1].visualDNA.cameraStrategy);
const sameSongCases=[cases.darkBallad[0],cases.brightPop[0]].map(img=>J.proposeDirection(Object.assign(J.defaultProject(),{lyrics}),cases.brightPop[1],img));
assert.notEqual(sameSongCases[0].visualDNA.style,sameSongCases[1].visualDNA.style);
assert.notEqual(sameSongCases[0].visualDNA.layoutStrategy,sameSongCases[1].visualDNA.layoutStrategy);
const pixels=new Uint8ClampedArray(48*32*4);
for(let y=0;y<32;y++)for(let x=0;x<48;x++){const p=(y*48+x)*4,v=x<22?(x+y)%2?10:240:75;pixels.set([v,v,v,255],p);}
const spatial=J.analyzeImagePixels(48,32,pixels).stats;
assert.ok(spatial.spaceRight>spatial.spaceLeft+.1,'empty side of an image should be preferred');
assert.ok(spatial.visualCenterX<.5,'visual weight should track left-side detail');
const makeTone=hz=>Float32Array.from({length:24000},(_,i)=>Math.sin(2*Math.PI*hz*i/8000)*.45);
const silentEnergy=new Float32Array(150),silentOnset=new Float32Array(150);
const lowSpectrum=J.spectralTimeline(makeTone(150),8000,silentEnergy,silentOnset,3);
const highSpectrum=J.spectralTimeline(makeTone(3000),8000,silentEnergy,silentOnset,3);
assert.ok(highSpectrum.brightness>lowSpectrum.brightness+.3,'centroid tracks spectral brightness');
assert.ok(lowSpectrum.bass>highSpectrum.bass+.3,'bass ratio tracks low frequency');
for(let i=0;i<names.length;i++)for(let j=i+1;j<names.length;j++){
  const a=names[i],b=names[j],v=J.visualDNASimilarity(results[a].dna,results[b].dna);
  similarities[a+' / '+b]=v;assert.ok(v<.8,`${a} and ${b} are too similar: ${v}`);
}
assert.notEqual(results.darkBallad.dna.motionStrategy,results.neonEDM.dna.motionStrategy);
assert.notEqual(results.darkBallad.dna.cameraStrategy,results.neonEDM.dna.cameraStrategy);
assert.notEqual(results.darkBallad.dna.style,results.brightPop.dna.style);
assert.notEqual(results.neonEDM.dna.archetype,results.acoustic.dna.archetype);
console.log('Visual DNA similarity',JSON.stringify(similarities));
console.log('Auto direction diversity passed.');
