'use strict';const assert=require('node:assert/strict'),{engine}=require('./custom_test_support.cjs');
const {J}=engine(),w=8,h=8,bg=new Uint8ClampedArray(w*h*4),rendered=new Uint8ClampedArray(w*h*4),mask=new Uint8ClampedArray(w*h*4);
for(let i=0;i<bg.length;i+=4){bg[i]=bg[i+1]=bg[i+2]=64;bg[i+3]=255;rendered[i]=rendered[i+1]=rendered[i+2]=248;rendered[i+3]=255;mask[i+3]=255;}
const dark=J.glyphFootprintContrast(bg,rendered,mask,w,h);assert(dark.measured);assert.equal(dark.interiorPixels,36);assert(dark.renderedVsBackgroundContrastP10>9);assert.equal(dark.nearWhiteFraction,1);
for(let i=0;i<bg.length;i+=4)bg[i]=bg[i+1]=bg[i+2]=240;
const bright=J.glyphFootprintContrast(bg,rendered,mask,w,h);assert(bright.renderedVsBackgroundContrastP10<1.2);
mask.fill(0);for(let x=1;x<w-1;x++)mask[(3*w+x)*4+3]=255;assert.equal(J.glyphFootprintContrast(bg,rendered,mask,w,h).measured,false);
const lines=Array.from({length:20},(_,i)=>({text:'歌'.repeat(i+1),start:i*2,end:i*2+2})),p={lines,duration:40,musicalStructure:{sections:lines.map(l=>({from:l.start,to:l.end}))}};const points=J.glyphContrastSamplePoints(p);assert.equal(points.length,12);assert(points.every(x=>x.time>=lines[x.line].start&&x.time<lines[x.line].end));assert.equal(J.glyphContrastSamplePoints(p,{start:30,end:31}).length,3);
console.log('glyph contrast evidence: opaque interior, low contrast, bounded range sampling PASS');

(async()=>{const Original=J.Renderer;let disposed=0;J.Renderer=class{async loadAssetDeck(){}frame(){throw new Error('simulated unavailable decoder')}disposeAssets(){disposed++}};try{const report=await J.measureGlyphContrastEvidence({W:1280,H:720,duration:2,lines:[{text:'歌詞',start:0,end:2}],cuts:[],musicalStructure:{sections:[{from:0,to:2}]}});assert.equal(report.measured,false);assert.equal(report.status,'ANALYSIS_UNAVAILABLE');assert.equal(disposed,1);}finally{J.Renderer=Original}console.log('glyph contrast unavailable-renderer fallback PASS')})().catch(error=>{console.error(error);process.exitCode=1});
