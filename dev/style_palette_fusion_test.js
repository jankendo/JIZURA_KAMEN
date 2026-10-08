const assert=require('node:assert/strict'),J=require('./style_test_harness.cjs');
const image={bg:'#101820',fg:'#FFFFFF',sub:'#CCCCCC',accent:'#778899',accent2:'#777777',ghostA:'#777777',ghostB:'#777777'};
const fused=J.STYLE_ORDER.map(k=>J.fuseStylePalette(J.STYLES[k].schemes[0],image,{chroma:.05,contrast:.4}));
assert.equal(new Set(fused.map(p=>p.accent+'|'+p.accent2)).size,24);for(const p of fused){assert(J.paletteContrast(p.fg,p.bg)>=6.9);assert(J.paletteContrast(p.sub,p.bg)>=4.4);}
console.log('24 distinct fused palettes, readable neutral foreground');
