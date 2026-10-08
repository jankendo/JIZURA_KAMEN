const assert=require('node:assert/strict'),{J,draw}=require('./raster_test_support.cjs');
const ids=J.order('layout'),p=J.defaultProject();p.lyrics='[00:00.00]日本語の歌詞\n[00:03.00]次の行も見える';p.title='';p.artist='';p.artDirection={realityVersion:2};
const audio={duration:7,beats:[],energy:new Float32Array(350),energyRate:50},failures=[];
for(const aspect of ['16:9','9:16','1:1','4:5']){
 p.aspect=aspect;
 for(const layout of ids){
  try{
   p.overrides={0:{layout}};const plan=J.plan(p,audio),cut=plan.cuts.find(c=>c.line===0&&c.layout!=='interlude');
   if(!cut)throw Error('no lyric cut');
   const at=Math.min(cut.end-.08,cut.start+Math.max(.85,cut.dur*.6));
   const out=draw(plan,at,aspect==='9:16'||aspect==='4:5'?[100,160]:[160,100]);
   if(!out.ink)failures.push({layout,aspect,reason:'no glyph pixels'});
  }catch(error){failures.push({layout,aspect,reason:error.message});}
 }
}
assert(ids.length>=140,'retain every existing layout');
assert.equal(failures.length,0,JSON.stringify(failures.slice(0,18)));
console.log(`${ids.length} layouts × 4 aspects produced actual lyric pixels.`);
