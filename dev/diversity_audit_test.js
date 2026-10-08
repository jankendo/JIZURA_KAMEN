'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const window={},document={getElementById(){return null},createElement(){return {getContext(){return {measureText(s){return {width:String(s).length*20}}}}}},fonts:{load:async()=>[],ready:Promise.resolve()},head:{appendChild(){}}};
const c=vm.createContext({window,document,console,Blob,TextEncoder,URL,setTimeout,clearTimeout,performance,requestAnimationFrame(){}});
for(const name of fs.readdirSync(path.join(__dirname,'../src')).filter(x=>x.endsWith('.js')).sort())vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',name),'utf8'),c,{filename:name});
const J=window.J,images=[{median:.2,chroma:.3,warmth:.3,detail:.2,spaceLeft:.2,spaceRight:.8},{median:.38,chroma:.15,warmth:.5,detail:.45,spaceLeft:.8,spaceRight:.2},{median:.52,chroma:.2,warmth:.4,detail:.18,spaceLeft:.6,spaceRight:.3},{median:.12,chroma:.5,warmth:.15,detail:.8,spaceLeft:.5,spaceRight:.6},{median:.8,chroma:.65,warmth:.8,detail:.32,spaceLeft:.7,spaceRight:.3}];
const specs=[
 ['team',['アレアレガンバエー'],{energy:.6,bpm:122,onsetDensity:.58,beatStrength:.7,sectionContrast:.12,brightness:.4}],
 ['player',['フォルツァ中谷ー','進之介アレー','ラララララー'],{energy:.66,bpm:135,onsetDensity:.64,beatStrength:.65,sectionContrast:.22,brightness:.35}],
 ['lala',['ラララララー','ララララララー'],{energy:.4,bpm:90,onsetDensity:.2,beatStrength:.45,sectionContrast:.1,brightness:.2}],
 ['anthem',['遠く響く声が空を越えていく','立ち上がれ僕らの明日へ','この光を掴むその日まで'],{energy:.76,bpm:113,onsetDensity:.55,beatStrength:.55,sectionContrast:.8,bass:.7,brightness:.5}],
 ['pop',['今日の街には新しい風が吹いている','君と笑い合える日々が続いてく','眩しい空へ手を伸ばしたくなる'],{energy:.72,bpm:142,onsetDensity:.65,beatStrength:.6,sectionContrast:.43,brightness:.82}]
];
const results=[];
for(let i=0;i<specs.length;i++){
 const [name,phrases,features]=specs[i],project=J.defaultProject();project.lyrics=Array.from({length:15},(_,n)=>`[${String(Math.floor(n*4/60)).padStart(2,'0')}:${String(n*4%60).padStart(2,'0')}.00]${phrases[n%phrases.length]}`).join('\n');project.customBg.enabled=true;
 const audio={duration:65,features:{...features,timeline:Array.from({length:22},(_,n)=>({time:n*3,energy:n>8&&n<17?features.energy:features.energy*.48,density:features.onsetDensity}))}};
 const v=J.proposeDirection(project,audio,images[i]);Object.assign(project,{style:v.style,mood:v.mood,fx:v.fx,enabled:v.enabled,seed:v.seed,autoDirection:true});project.artDirection=J.makeArtDirection(project,audio,v);
 const plan=J.plan(project,audio),signature=[v.visualDNA.type,v.style,v.mood,[...new Set(plan.cuts.map(c=>c.cam))].join(','),[...new Set(plan.cuts.map(c=>c.layout))].slice(0,4).join(','),v.visualDNA.motionAmount].join('|');
 results.push(signature);console.log(name,signature,v.debug.reasons.join('; '));
 if(name==='anthem')assert.equal(v.visualDNA.type,'ANTHEM','A changing anthem with repeated long lyrics must not be classified as chant');
}
assert(new Set(results).size>=4,'At least four distinct directions among five inputs');
console.log('Five-song explainable diversity audit passed.');
