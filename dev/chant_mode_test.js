'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const window={},document={getElementById(){return null},createElement(){return {getContext(){return {measureText(s){return {width:String(s).length*20}}}}}},fonts:{load:async()=>[],ready:Promise.resolve()},head:{appendChild(){}}};
const context=vm.createContext({window,document,console,Blob,TextEncoder,URL,setTimeout,clearTimeout,performance,requestAnimationFrame(){}});
for(const file of fs.readdirSync(path.join(__dirname,'../src')).filter(x=>x.endsWith('.js')).sort())vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),context,{filename:file});
const J=window.J;
const scenarios=[
  ['player',Array.from({length:6},(_,i)=>`[00:${String(i*5).padStart(2,'0')}.00]${i%2?'進之介アレー':'フォルツァ中谷ー'}`).join('\n'),{energy:.6,beatStrength:.65,onsetDensity:.5,sectionContrast:.18},'PLAYER_CHANT'],
  ['team',Array.from({length:8},(_,i)=>`[00:${String(i*5).padStart(2,'0')}.00]アレアレガンバエー`).join('\n'),{energy:.72,beatStrength:.75,onsetDensity:.65,sectionContrast:.12},'TEAM_CALL'],
  ['song',Array.from({length:12},(_,i)=>`[00:${String(i*5).padStart(2,'0')}.00]${['あの日に見た空の色を覚えている','ここから始まる新しい旅へ','静かな朝に声を重ねて'][i%3]}`).join('\n'),{energy:.39,beatStrength:.25,onsetDensity:.18,sectionContrast:.54,smoothness:.76},'EMOTIONAL']
];
for(const [name,text,music,expected] of scenarios){
  const project=J.defaultProject();project.lyrics=text;project.customBg.enabled=true;
  const proposal=J.proposeDirection(project,{duration:60,features:music},{median:.35,detail:.32,spaceLeft:.65,spaceRight:.23});
  assert.equal(proposal.visualDNA.type,expected,name);
  if(expected!=='EMOTIONAL')assert.equal(proposal.fx.glitch,0);
  console.log(name,proposal.visualDNA.type,proposal.visualDNA.motionAmount);
}
console.log('Chant classification passed.');
