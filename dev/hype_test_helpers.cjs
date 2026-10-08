const J=require('./style_test_harness.cjs');
function chantProject(count=24,step=2){
 const lyrics=Array.from({length:count},(_,i)=>`[00:${String(i*step).padStart(2,'0')}]${i%4===3?'アレガンバエー':'アレアレガンバエー'}`).join('\n');
 const p={...J.defaultProject(),lyrics,title:'アレガンバエー',artist:'GAMBA FAN MUSIC',customBg:{...J.defaultProject().customBg,enabled:true,dataUrl:'data:image/png;base64,AA=='},autoDirection:true};
 const duration=count*step+1,a={duration,buffer:{},beats:Array.from({length:Math.ceil(duration*2.4)},(_,i)=>i*.42),features:{bpm:143,energy:.82,beatStrength:.84,onsetDensity:.74,sectionContrast:.22,percussive:.8,density:.7,timeline:Array.from({length:Math.ceil(duration*2)},(_,i)=>({time:i*.5,energy:.74+Math.sin(i/4)*.08,density:.7,spectralFlux:.5,bass:.6}))}};
 const d=J.proposeDirection(p,a,{median:.24,detail:.35,spaceLeft:.7,spaceRight:.2,dominantHue:.59,chroma:.65});
 Object.assign(p,{style:d.style,mood:d.mood,fx:d.fx,enabled:d.enabled,seed:d.seed,autoDirection:true});p.artDirection=J.makeArtDirection(p,a,d);
 return {J,p,a,plan:J.plan(p,a)};
}
module.exports={chantProject};
