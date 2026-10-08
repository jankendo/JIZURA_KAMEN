const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {createCanvas,loadImage,DOMMatrix,GlobalFonts}=require('@napi-rs/canvas');
const root=path.resolve(__dirname,'..');
for(const [name,weight] of [['Regular',400],['Bold',700]])GlobalFonts.registerFromPath(path.join(root,'assets/fonts',`NotoSansCJKjp-${name}.ttf`),'JIZURA Noto CJK JP');
function engine(directory=root,ui=false){
 let seed=19;const math=Object.create(Math);math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const nodes=new Map(),window={addEventListener(){}},document={readyState:'loading',addEventListener(){},createElement(tag){return tag==='canvas'?createCanvas(1,1):{appendChild(){},setAttribute(){}}},getElementById(id){if(!ui)return null;if(!nodes.has(id))nodes.set(id,{dataset:{},textContent:'',disabled:false,setAttribute(){},classList:{contains:()=>false,toggle(){}},parentElement:{classList:{toggle(){}}}});return nodes.get(id);},fonts:{load:async()=>[],ready:Promise.resolve(),check:()=>true},head:{appendChild(){}},body:{},querySelectorAll(){return []}};
 const context=vm.createContext({window,document,console,Blob,ArrayBuffer,DataView,Float32Array,Float64Array,TextEncoder,TextDecoder,AbortController,DOMException,URL,fetch,DOMMatrix,Math:math,setTimeout,clearTimeout,performance,requestAnimationFrame(){},getComputedStyle:()=>({getPropertyValue:()=> 'monospace'}),createImageBitmap:async blob=>loadImage(Buffer.from(await blob.arrayBuffer()))});
 for(const name of fs.readdirSync(path.join(directory,'src')).filter(n=>n.endsWith('.js')&&!n.startsWith('12_')).sort())vm.runInContext(fs.readFileSync(path.join(directory,'src',name),'utf8'),context,{filename:name});
 if(ui){let code=fs.readFileSync(path.join(directory,'src/12_ui.js'),'utf8');code=code.replace('J.uiApi = { toast,','J.uiApi = { lookSnap, drawTimeline, loadLocal, processingLocks:typeof processingLocks==="function"?processingLocks:undefined, syncDirectionUI, toast,');vm.runInContext(code,context,{filename:'12_ui.js'});}
 return {J:window.J,context,nodes,createCanvas,resetRandom(){seed=19;}};
}
module.exports={engine,root};
