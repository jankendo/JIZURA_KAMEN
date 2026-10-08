const assert=require('node:assert/strict'),J=require('./style_test_harness.cjs');
for(const [W,H] of [[1920,1080],[1080,1920],[1080,1080]])for(const angle of [-3,0,3])for(const x of [-100,0,W/2,W,W+100]){
const env={W,H,cut:{params:{directionAngle:angle}}};const it=J.safeLyricItem(env,{text:'アレアレガンバエーアレアレガンバエー',font:'gothic_black',size:180,x,y:-10,sx:1,sy:1});const l=J.layoutText(it),a=angle*J.DEG,w=(Math.abs(l.W*Math.cos(a))+Math.abs(l.H*Math.sin(a)))/2,h=(Math.abs(l.W*Math.sin(a))+Math.abs(l.H*Math.cos(a)))/2;
assert(it.x-w>=W*.05-1&&it.x+w<=W*.95+1);assert(it.y-h>=H*.07-1&&it.y+h<=H*.93+1);assert.deepEqual(JSON.parse(JSON.stringify(J.lyricsCameraAt())),{s:1,x:0,y:0,rot:0});}
console.log('Long animated lyric bounds clamp in 3 aspects and extreme positions');
