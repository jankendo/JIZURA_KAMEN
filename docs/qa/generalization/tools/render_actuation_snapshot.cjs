'use strict';
function snapshotRenderItem(it){
 if(!it||typeof it!=='object')return null;
 return Object.fromEntries(Object.entries(it).map(([k,v])=>[k,Array.isArray(v)?{array:v.slice()}:v]));
}
function diffRenderItem(before,it){
 if(!before)return {changed:[],opaqueObjectFields:[]};
 const changed=[],opaque=[];
 for(const k of new Set([...Object.keys(before),...Object.keys(it)])){
  const a=before[k],b=it[k];
  if(a?.array&&Array.isArray(b)){if(a.array.length!==b.length||a.array.some((v,i)=>!Object.is(v,b[i])))changed.push(k);}
  else if(!Object.is(a,b))changed.push(k);
  else if(a&&typeof a==='object')opaque.push(k);
 }
 return {changed,opaqueObjectFields:opaque};
}
function snapshotCanvasState(ctx){
 if(!ctx?.getTransform)return null;
 const state=Object.fromEntries(['globalAlpha','globalCompositeOperation','fillStyle','strokeStyle','filter','lineWidth','shadowBlur','shadowColor','font','textAlign','textBaseline'].map(k=>[k,ctx[k]])),t=ctx.getTransform();state.transform=[t.a,t.b,t.c,t.d,t.e,t.f].join(',');return state;
}
module.exports={snapshotRenderItem,diffRenderItem,snapshotCanvasState};
