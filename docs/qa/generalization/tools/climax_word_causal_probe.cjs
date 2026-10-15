'use strict';
// Node raster diagnostic only. Actual browser MP4 verification is separate.
const fs=require('fs'),path=require('path'),zlib=require('zlib'),crypto=require('crypto');
const [helperSource,beforeSource,afterSource,reference,time,output]=process.argv.slice(2);
const {engine}=require(path.resolve(helperSource,'dev/custom_test_support.cjs'));
const bytes=fs.readFileSync(reference),raw=reference.endsWith('.gz')?zlib.gunzipSync(bytes):bytes,sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const revive=v=>v&&typeof v==='object'?(v.__qaTypedArray?new globalThis[v.__qaTypedArray](v.data):v.__qaMap?new Map(v.__qaMap.map(([k,x])=>[k,revive(x)])):Array.isArray(v)?v.map(revive):Object.fromEntries(Object.entries(v).map(([k,x])=>[k,revive(x)]))):v;
const observations=[];
for(const [name,source] of [['before',beforeSource],['after',afterSource]]){
 const {J,createCanvas}=engine(source),ref=revive(JSON.parse(raw)),p=ref.plan,t=Number(time),c=p.cuts.find(c=>c.line>=0&&c.start<=t&&c.end>t),width=360,height=Math.round(width*p.H/p.W),ctx=createCanvas(width,height).getContext('2d'),draws=[];
 if(!c)throw Error('No active lyric unit');const semantic=J.cinemaSemanticLyricLayout(p,c,ctx),draw=J.drawItem;
 J.drawItem=(e,it)=>{if(e.pass==='main'&&e.cut.index===c.index)draws.push({cutIndex:e.cut.index,line:e.cut.line,text:it.text,font:it.font,size:it.size});return draw(e,it);};
 const r=new J.Renderer();try{r.frame(ctx,p,t,{scale:width/p.W,production:true,range:ref.range});}finally{J.drawItem=draw;r.disposeAssets?.();r.customBgBitmap?.close?.();}
 observations.push({name,sourceDirectory:path.resolve(source),rendererFileSHA256:sha(fs.readFileSync(path.join(source,'src/11zzv_climax_realization.js'))),sourceText:c.lineText??c.text,semanticText:semantic.text,semanticSize:semantic.size,actualDrawItems:draws,sampleNativeTime:t,manualLocked:J.photoChoreographyLocked(p,c)});
}
const result={schema:1,method:'Run complete source stacks separately; capture actual final drawItem text after all layout/motion/readability wrappers. Embedded Node fonts are diagnostic only; no browser encoding, decoded OCR or release quality is certified.',referenceSHA256:sha(raw),planHash:JSON.parse(raw).planHash,observations,human:'HUMAN_UNVERIFIED'};
fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(observations.map(r=>({name:r.name,semanticText:r.semanticText,actualDrawItems:r.actualDrawItems.map(i=>i.text)}))));
