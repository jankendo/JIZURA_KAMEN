/* One lossless wrapping decision for rendering and QA; no midpoint or material-specific rule. */
(()=>{'use strict';const J=window.J;
const cache=new Map();
J.semanticLyricLayout=(value,options={})=>{
 const original=String(value??''),font=options.font||'embedded_bold',lead=options.lead??1.2,track=options.track??.015;
 const maxWidth=options.maxWidth??Infinity,maxHeight=options.maxHeight??Infinity,initialSize=options.size??48;let minSize=options.minSize??initialSize*.55;
 let ctx=options.ctx;try{ctx??=document.createElement('canvas').getContext('2d');}catch{}
 const previousFont=ctx?.font;const measured=typeof ctx?.measureText==='function'&&typeof J.fontCSS==='function',ledger=J.lyricBreaks(original,options);if(measured&&options.minSize===undefined&&typeof J.fitSize==='function')minSize=Math.min(minSize,J.fitSize(original,font,maxWidth,maxHeight,{lead,track}));
 const width=(text,size)=>{if(measured){ctx.font=J.fontCSS(font,size);return Math.max(ctx.measureText(text).width+Math.max(0,J.graphemes(text).length-1)*track*size,J.measure?.({text,font,size,lead,track})?.w??0);}return null;};
 const explicit=/\r?\n/u.test(original),manual=options.manual===true;
 const rowChoices=part=>{
  if(explicit||manual)return [[part]];
  const b=J.lyricBreaks(part,options).boundaries.sort((a,b)=>a.cost-b.cost||a.offset-b.offset).slice(0,64).sort((a,b)=>a.offset-b.offset),choices=[[part]],maxLines=options.maxLines??4;
  // Beam over legitimate linguistic boundaries; never split a long Latin word or a cluster.
  let states=[{rows:[],start:0,cost:0}];
  for(let n=1;n<maxLines;n++){
   const next=[];
   for(const state of states)for(const cut of b){if(cut.offset<=state.start||!part.slice(state.start,cut.offset).trim())continue;const rows=[...state.rows,part.slice(state.start,cut.offset)];const tail=part.slice(cut.offset);if(tail.trim()&&choices.length<256)choices.push([...rows,tail]);next.push({rows,start:cut.offset,cost:state.cost+cut.cost});}
   states=next.sort((a,b)=>a.cost-b.cost||a.start-b.start).slice(0,24);
  }
  return choices;
 };
 const candidates=explicit?[[...original.split('\n')]]:rowChoices(original),sizes=[initialSize,initialSize*.9,initialSize*.8,initialSize*.7,initialSize*.55,initialSize*.4,minSize].filter((s,i,a)=>s>=minSize&&a.indexOf(s)===i),ranked=[];
 for(const rows of candidates)for(const size of sizes){
  const widths=rows.map(row=>width(row,size)),height=size*(1+Math.max(0,rows.length-1)*lead),fits=measured&&widths.every(w=>w<=maxWidth+.01)&&height<=maxHeight+.01;
  const rowCounts=rows.map(r=>J.graphemes(r).length),balanced=Math.max(...rowCounts,0)-Math.min(...rowCounts,0),characterLimit=options.maxPer??Infinity;
  const overflow=measured?Math.max(0,...widths.map(w=>w/maxWidth-1),height/maxHeight-1):Math.max(0,...rowCounts.map(n=>n/characterLimit-1));
  // Preserve a fitting unbroken phrase; wrapping precedes further size loss only when required.
  const loss=(initialSize-size)/initialSize,cost=overflow*100+loss*2+(rows.length-1)*.16+balanced*.005;
  ranked.push({rows,size,widths,height,fits,cost});
 }
 const winner=ranked.sort((a,b)=>Number(b.fits)-Number(a.fits)||a.cost-b.cost||b.size-a.size||a.rows.join('\n').localeCompare(b.rows.join('\n'),'en'))[0]||{rows:[original],size:initialSize,widths:[null],height:initialSize,fits:false};
 const text=winner.rows.join('\n'),withoutInserted=text.replace(/\n/g,''),sourceWithoutBreaks=original.replace(/\n/g,'');
 if(measured)ctx.font=previousFont;
 if(withoutInserted!==sourceWithoutBreaks)throw Error('LYRIC_LAYOUT_SOURCE_CHANGED');
 return {original,text,rows:winner.rows,size:winner.size,widths:winner.widths,height:winner.height,status:measured?'MEASURED':'UNMEASURED',fits:winner.fits,explicitBreaksPreserved:explicit,method:ledger.method,semanticConfidence:ledger.semanticConfidence,sourceOffsets:ledger.offsets,limits:ledger.limits};
};
J.splitLines=(value,maxPer)=>{
 const text=String(value??'');if(text.includes('\n')||J.graphemes(text).length<=maxPer)return text;
 const key=text+'\u0000'+maxPer;if(cache.has(key))return cache.get(key);
 // Counts are only a provisional space constraint; actual font/raster fitting follows at draw time.
 const result=J.semanticLyricLayout(text,{ctx:{},maxPer,maxLines:Math.min(6,Math.ceil(J.graphemes(text).length/Math.max(1,maxPer))+1)}).text;
 if(cache.size>=256)cache.clear();cache.set(key,result);return result;
};
})();
