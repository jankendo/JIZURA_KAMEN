/* Application policy: one active background; archive assets remain portable. */
(()=>{'use strict';const J=window.J;
J.singleBackgroundProject=project=>{
 const bg=project.customBg;
 const active=bg?.enabled&&bg.dataUrl;
 const archived=active?(project.visualAssets||[]).find(a=>a.dataUrl===bg.dataUrl):null;
 const visualAssets=active?[{...archived,id:archived?.id||'background',name:bg.filename||'背景画像',dataUrl:bg.dataUrl,role:'AUTO',pin:'auto',crop:{x:50,y:50}}]:[];
 // The legacy planner extends artDirection.vocabulary in place. Isolate that
 // small metadata tree; do not clone audio buffers or retained image payloads.
 return {...project,artDirection:project.artDirection?JSON.parse(JSON.stringify(project.artDirection)):null,visualAssets,scenePins:[],proAssets:(project.proAssets||[]).filter(a=>/^data:video\/(mp4|webm);base64,/.test(a.dataUrl||''))};
};
// Activated by the editor, not by legacy engine-only pages and archive tooling.
J.enableSingleBackgroundMode=()=>{J.singleBackgroundMode=true;};
J.backgroundResolutionInfo=(project,image)=>{
 if(!project.customBg?.enabled||!image?.width||!image?.height)return null;
 const [width,height]=J.outputSize(project),rect=J.customBgGeometry(image.width,image.height,width,height,project.customBg);
 return rect?{sourceWidth:image.width,sourceHeight:image.height,width,height,scale:rect.w/image.width}:null;
};
const plan=J.plan;
J.plan=(p,a)=>{const result=plan(J.singleBackgroundMode?J.singleBackgroundProject(p):p,a);if(J.singleBackgroundMode)result.singleBackground=true;return result;};
const pack=J.createDirectorPack;
J.createDirectorPack=args=>pack(J.singleBackgroundMode?{...args,project:J.singleBackgroundProject(args.project)}:args);
const context=J.directorContext;
J.directorContext=(p,...args)=>context(J.singleBackgroundMode?J.singleBackgroundProject(p):p,...args);

// A reliable separation edge for filled primary lyrics on photographic backgrounds.
// Keep outline/ghost passes and graphic plates intact. No per-frame pixel readback.
const readable=J.adjustLocalReadability;
J.adjustLocalReadability=(env,it)=>{
 const next=readable(env,it);
 const world=env.plan?.visualWorld?.chapters?.find(w=>env.t>=w.from&&env.t<w.to);
 const label=String(it.text||'').replace(/\s/g,''),lyrics=String(env.cut?.lineText||env.cut?.text||'').replace(/\s/g,'');
 if(env.pass!=='main'||!env.plan?.customBg?.enabled||env.plan.keyBg||it.fill===false||it.ghost===false||!label||!lyrics.includes(label)||env.cut?.line<0)return next;
 if(world?.photoExit){
  const luma=J.paletteLuma(world.fieldColor||'#0b1020');
  const color=1.05/(luma+.05)>(luma+.05)/.055?'#f8f8f2':'#10151e';
  // Per-character animation colors used to override the field's contrast color.
  const fn=next.charFn;
  return {...next,color,strokeColor:color,gradient:null,pattern:null,charFn:fn?(...args)=>{const c=fn(...args);return c?{...c,color}:c;}:fn};
 }
 const light=J.paletteLuma(next.color||env.sc.fg||'#fff')>.48;
 const channel=light?'0,0,0':'255,255,255';
 const edge=Math.max(1,Math.min(4,(it.size||24)*.018));
 return {...next,stroke:Math.max(next.stroke||0,edge),strokeColor:`rgba(${channel},0.88)`,strokeUnder:true,
  shadow:{...next.shadow,color:`rgba(${channel},0.78)`,blur:Math.max(next.shadow?.blur||0,2),dx:0,dy:1}};
};
})();
