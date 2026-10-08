const {J,draw,createCanvas}=require('./raster_test_support.cjs');
function fixture(aspect='16:9'){
 const p=J.defaultProject();p.aspect=aspect;p.title='';p.artist='';
 p.lyrics=Array.from({length:20},(_,i)=>`[00:${String(i*3).padStart(2,'0')}]${i%2?'未来へ進む':'光をつなぐ'}`).join('\n');p.autoDirection=true;
 const a={duration:61,buffer:{},beats:Array.from({length:140},(_,i)=>i*.43),features:{bpm:140,energy:.8,beatStrength:.8,onsetDensity:.7,sectionContrast:.3,percussive:.7,density:.7,timeline:Array.from({length:122},(_,i)=>({time:i*.5,energy:.5+Math.sin(i/9)*.3,density:.7,spectralFlux:.6,bass:.5}))}};
 const d=J.proposeDirection(p,a,{median:.3,detail:.4,chroma:.7});Object.assign(p,{style:d.style,mood:d.mood,fx:d.fx,enabled:d.enabled,seed:d.seed});p.artDirection=J.makeArtDirection(p,a,d);return {p,a,plan:J.plan(p,a)};
}
module.exports={J,draw,createCanvas,fixture};
