'use strict';
const assert=require('node:assert/strict'),{engine}=require('./custom_test_support.cjs');
const {J,createCanvas}=engine();let checks=0;const near=(a,b,label)=>{assert(Math.abs(a-b)<1e-7,`${label}: ${a} vs ${b}`);checks++;};
for(const ratio of [1,2/3])for(const angle of [0,13])for(const skew of [0,7])for(const anchor of [null,{x:.5,y:.5},{x:.65,y:.6}])for(const dy of [-8,0,4]){
 const cv=createCanvas(1080*ratio,1920*ratio),ctx=cv.getContext('2d');ctx.scale(ratio,ratio);
 const plan={W:1080,H:1920},cut={line:0,params:{photoAnchor:anchor}},env={ctx,W:1080,H:1920,scale:ratio,plan,cut};
 const item={text:'境界を越えて\n光を待つ',font:'embedded_bold',size:62,x:540,y:960,rot:angle,skew,charFn:()=>({dx:0,dy}),cinemaAnchorMotion:{dx:0,dy}};
 const neutral={...item,charFn:()=>({dx:0,dy:0}),cinemaAnchorMotion:{dx:0,dy:0}};
 const raw=J.measureLyricItemBounds(env,item),ref=J.measureLyricItemBounds(env,neutral),moved=J.centerPhotoLyricItem(env,item),fixed=J.centerPhotoLyricItem(env,neutral),a=J.measureLyricItemBounds(env,moved),b=J.measureLyricItemBounds(env,fixed);
 near(a.x0-b.x0,raw.x0-ref.x0,'uniform X contribution preserved');near(a.y0-b.y0,raw.y0-ref.y0,'uniform Y contribution preserved');
 assert.strictEqual(moved.charFn,item.charFn,'actual motion function unchanged');checks++;
 const safe=J.measureLyricItemBounds(env,J.safeLyricItem(env,moved));assert(safe.x0>=1080*.11-1e-6&&safe.x1<=1080*.89+1e-6&&safe.y0>=1920*.08-1e-6&&safe.y1<=1920*.92+1e-6,'final actual-bounds safety fit');checks++;
 cut.locked=true;const old=J.centerPhotoLyricItem(env,{...item,cinemaAnchorMotion:undefined}),locked=J.centerPhotoLyricItem(env,item);near(old.x,locked.x,'locked X unchanged');near(old.y,locked.y,'locked Y unchanged');
}
// Absent/invalid metadata keeps the original dynamic-centering path exactly.
{
 const cv=createCanvas(1080,1920),ctx=cv.getContext('2d'),env={ctx,W:1080,H:1920,scale:1,plan:{},cut:{line:0,params:{}}},item={text:'Anchor',font:'embedded_bold',size:50,x:400,y:700,charFn:()=>({dy:9})},old=J.centerPhotoLyricItem(env,item);
 for(const motion of [undefined,{dx:NaN,dy:9},{dx:0,dy:Infinity}]){const a=J.centerPhotoLyricItem(env,{...item,cinemaAnchorMotion:motion});near(a.x,old.x,'fallback X');near(a.y,old.y,'fallback Y');}
}
// The shipped typography path declares exactly the same uniform translation
// it actually adds; neutral/manual/non-grammar paths must not gain metadata.
for(const role of ['continuity','light','echo','grounding','gathering','participation'])for(const t of [1,2,3.9])for(const mode of ['auto','locked','neutral','noGrammar']){
 const ctx=createCanvas(1080,1920).getContext('2d'),plan={duration:20,fps:24,W:1080,H:1920,cinemaSemanticNeutral:mode==='neutral'},cut={start:1,end:4,dur:3,line:0,locked:mode==='locked',params:{},grammar:{temporal:{role,level:.3,hit:1.3,entry:.2,exit:.2}}},env={ctx,plan,cut,t,lt:t-1,H:1920,W:1080,pass:'main'},item={text:'光の先へ',font:'embedded_bold',size:62,x:540,y:960,grammarMode:mode==='noGrammar'?null:'voice',charFns:[]};
 J.applyTypography5(env,item);
 const eligible=mode==='auto'&&['continuity','light'].includes(role);
 assert.equal(!!item.cinemaAnchorMotion,eligible,'metadata limited to explicitly uniform automatic roles');checks++;
 if(eligible){const actual=item.charFns.at(-1)(0,{li:0});near(item.cinemaAnchorMotion.dx,actual.dx,'declared X equals rendered character motion');near(item.cinemaAnchorMotion.dy,actual.dy,'declared Y equals rendered character motion');}
}
console.log(JSON.stringify({status:'PASS',checks,scope:'Real glyph bounds, output scale, item rotation/skew, authored anchor, signed drift, manual lock, invalid metadata, unchanged char function and final actual safety fit. Not encoded MP4 proof.'}));
