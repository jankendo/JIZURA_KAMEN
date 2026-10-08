const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage,DOMMatrix,GlobalFonts}=require('@napi-rs/canvas');
const fontRoot=path.resolve(__dirname,'../assets/fonts');
if(fs.existsSync(path.join(fontRoot,'NotoSansCJKjp-Regular.ttf'))){
 GlobalFonts.registerFromPath(path.join(fontRoot,'NotoSansCJKjp-Regular.ttf'),'JIZURA Noto CJK JP');
 GlobalFonts.registerFromPath(path.join(fontRoot,'NotoSansCJKjp-Bold.ttf'),'JIZURA Noto CJK JP');
}
const window={},document={createElement(tag){return tag==='canvas'?createCanvas(1,1):{appendChild(){},setAttribute(){}}},getElementById(){return null},fonts:{load:async()=>[],ready:Promise.resolve(),check:()=>true},head:{appendChild(){}}};
const context=vm.createContext({window,document,console,Blob,TextEncoder,TextDecoder,URL,fetch,DOMMatrix,createImageBitmap:async blob=>loadImage(Buffer.from(await blob.arrayBuffer())),setTimeout,clearTimeout,performance,requestAnimationFrame(){}});
const root=path.resolve(__dirname,'..');
for(const name of fs.readdirSync(path.join(root,'src')).filter(n=>n.endsWith('.js')&&!n.startsWith('12_')).sort())vm.runInContext(fs.readFileSync(path.join(root,'src',name),'utf8'),context,{filename:name});
const J=window.J;
function draw(plan,time,dimensions=[320,180]){
 const [w,h]=dimensions,canvas=createCanvas(w,h),audit=createCanvas(w,h),items=[],R=new J.Renderer();
 R.frame(canvas.getContext('2d'),plan,time,{scale:w/plan.W,production:true,lyricAuditCtx:audit.getContext('2d'),lyricAuditItems:items});
 const pixels=audit.getContext('2d').getImageData(0,0,w,h).data;let ink=0;for(let i=3;i<pixels.length;i+=4)ink+=pixels[i]>16?1:0;
 return {ink,items,canvas,audit};
}
module.exports={J,createCanvas,draw};
