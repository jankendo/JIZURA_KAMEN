'use strict';
const fs=require('node:fs'),assert=require('node:assert/strict'),{engine}=require('./custom_test_support.cjs');
const {J,context,createCanvas}=engine();context.Path2D=require('@napi-rs/canvas').Path2D;
const p=J.defaultProject();Object.assign(p,{autoDirection:false,title:'',artist:'',lyrics:'[00:00.000]青黒の歌声を響かせろ\n[00:04.000]We are ガンバ',res:720,fps:30});
const audio={duration:8,beats:[0,1,2,3,4,5,6,7],features:{energy:.7}};
const report={version:require('../package.json').version,method:'Native Canvas full renderer; isolated registry dispatch, 2 aspects × 3 phases. This is not browser font verification or aesthetic certification.',aspects:['16:9','9:16'],entries:[],rendererCalls:0},warnings=[];
const warn=console.warn;console.warn=(...args)=>warnings.push(String(args[0])+':'+String(args.at(-1)));
for(const aspect of report.aspects){
 const base=J.plan({...p,aspect},audio),cv=createCanvas(256,Math.round(256*base.H/base.W)),mask=createCanvas(cv.width,cv.height),ctx=cv.getContext('2d'),mc=mask.getContext('2d'),R=new J.Renderer();
 for(const group of ['style',...J.GROUP_KEYS]){
  const reg=group==='style'?J.STYLES:J.registry(group);
  for(const [id,def]of Object.entries(reg)){
   if(group==='layout'&&['title','interlude'].includes(id)){report.entries.push({group,id,aspect,status:'CREDIT_ONLY'});continue;}
   console.error('AUDIT',aspect,group,id);warnings.length=0;let dispatch=0;const original={};
   for(const key of ['render','draw','apply','get'])if(typeof def[key]==='function'){original[key]=def[key];def[key]=function(...a){dispatch++;return original[key].apply(this,a);};}
   const oldCamera=J.cameraAt,oldLyricCamera=J.lyricsCameraAt;if(group==='cam'){J.cameraAt=()=>null;J.lyricsCameraAt=()=>null;}
   try{
    const style=group==='style'?def:base.style,plan={...base,style,styleKey:group==='style'?id:base.styleKey,artDirection:null,photoCompositionPolicy:false,motionDirector7:false,visualWorld:null,titleDisplay:null,events:[],hypeTimeline:[],directionOverrides7:{0:{lock:true},1:{lock:true}}};
    const cuts=[0,1].map(line=>{const c=base.cuts.find(c=>c.line===line),cut={...c,index:line,n:[...base.lines[line].text.replace(/\s/g,'')].length,W:base.W,H:base.H,start:line*4,end:line*4+4,dur:4,line,text:base.lines[line].text,lineText:base.lines[line].text,layout:'center',enter:'cut',hold:'still',exit:'cut',trans:'cut',cam:'push',bg:'none',treat:'none',decor:[],inDur:.35,outDur:.35,transDur:line?.35:0,params:{...J.LAYOUTS.center.plan(J.rng(17),c,style),font:'gothic_bold',sub:false,under:false,accent:false},style,styleKey:plan.styleKey};
     const rng=J.rng(17),param=def.plan?def.plan(rng,group==='layout'?cut:style,style)||{}:{};
     if(group==='layout'){cut.layout=id;cut.params={...param,font:'gothic_bold'};}
     else if(group==='decor')cut.decor=[{id,seed:17,n:2,right:false,low:false,accent:true,corner:false,big:false,mode:'count',from:0,to:80,v:1,r:.5,...param}];
     else if(group!=='style'&&group!=='fx'){cut[group]=id;cut[group+'P']=param;}
     return cut;});plan.cuts=cuts;
    if(group==='fx')plan.events=[{t:0,dur:4,type:id,amp:.7,seed:17,manual:true}];
    let inkFrames=0,clippedFrames=0;
    const times=group==='trans'?[4.03,4.12,4.3]:group==='exit'?[3.68,3.85,3.97]:group==='enter'?[.03,.12,.3]:[.3,1.1,2.8];
    for(const time of times){const items=[];R.frame(ctx,plan,time,{scale:cv.width/plan.W,production:true,lyricAuditCtx:mc,lyricAuditItems:items,noGhost:true});report.rendererCalls++;const data=mc.getImageData(0,0,cv.width,cv.height).data;if(data.some((v,i)=>i%4===3&&v>24))inkFrames++;if(items.some(({bounds:b})=>b&&(b.x0<0||b.x1>plan.W||b.y0<0||b.y1>plan.H)))clippedFrames++;}
    report.entries.push({group,id,aspect,dispatch:group==='style'?'STYLE_PALETTE_RENDERED':dispatch?'EXECUTED':def.builtin||['cut','none'].includes(id)?'BUILTIN_IDENTITY':'NO_NATIVE_DISPATCH',inkFrames,clippedFrames,warnings:[...new Set(warnings)]});
   }catch(error){report.entries.push({group,id,aspect,error:error.message});}
   finally{for(const [key,fn]of Object.entries(original))def[key]=fn;J.cameraAt=oldCamera;J.lyricsCameraAt=oldLyricCamera;}
  }
 }
 R.disposeAssets();
}
console.warn=warn;
report.techniques=J.GROUP_KEYS.reduce((n,g)=>n+Object.keys(J.registry(g)).length,0);report.styles=Object.keys(J.STYLES).length;report.fonts=Object.keys(J.FONTS).map(id=>({id,status:'NATIVE_RENDER_COMPARED_SEPARATELY; BROWSER_AVAILABILITY_UNVERIFIED'}));report.failures=report.entries.filter(e=>e.error||e.warnings?.length);
fs.writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({styles:report.styles,techniques:report.techniques,fonts:report.fonts.length,rendererCalls:report.rendererCalls,failures:report.failures.length,nonDispatch:report.entries.filter(e=>e.dispatch==='NO_NATIVE_DISPATCH').map(e=>e.group+'.'+e.id)}));
assert.equal(report.failures.length,0,JSON.stringify(report.failures.slice(0,5)));
