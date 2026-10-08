const assert=require('node:assert/strict'),{J,createCanvas}=require('./raster_test_support.cjs');
for(const [W,H] of [[1920,1080],[1080,1920],[1080,1080],[1080,1350]])for(const vertical of [false,true])for(const align of ['left','center','right'])for(const rot of [0,17,90]){
 const env={W,H,ctx:createCanvas(W,H).getContext('2d'),cut:{params:{directionAngle:0}}};
 const item={text:vertical?'縦書き\n歌詞検査':'日本語の歌詞を表示',font:'gothic_bold',size:vertical?125:155,x:W*.91,y:H*.87,vertical,align,rot,skew:9,sx:1.07,sy:.93};
 const safe=J.safeLyricItem(env,item),box=J.measureLyricItemBounds(env,safe);
 assert(box.x0>=W*.055-2&&box.x1<=W*.945+2&&box.y0>=H*.08-2&&box.y1<=H*.92+2,JSON.stringify({W,H,vertical,align,rot,box}));
 if(vertical&&align==='left')assert.equal(safe.vAlign,'top');
}
console.log('Vertical and horizontal glyph bounds remain in safe rect across four aspects and transforms.');
