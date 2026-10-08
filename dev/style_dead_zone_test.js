const assert=require('node:assert/strict'),J=require('./style_test_harness.cjs');
const rng=J.rng(8821),counts=Object.fromEntries(J.STYLE_ORDER.map(k=>[k,[0,0,0]])),witness={};
for(let n=0;n<14000;n++){
 const m={bpm:65+rng()*115,energy:rng(),onsetDensity:rng(),beatStrength:rng(),percussive:rng(),smoothness:rng(),sectionContrast:rng(),bass:rng(),brightness:rng()};
 const i={median:rng(),chroma:rng(),warmth:rng(),contrast:rng(),detail:rng(),dominantHue:rng(),negativeSpace:rng()};
 const l={longRatio:rng(),repeatRatio:rng(),japaneseRatio:1};
 const ranked=J.scoreStyleProfiles(J.styleInputProfile(m,i,l));
 ranked.slice(0,5).forEach((x,j)=>{if(!j){counts[x.style][0]++;witness[x.style]??={music:m,image:i,lyrics:l};}if(j<3)counts[x.style][1]++;counts[x.style][2]++;});
}
console.log(JSON.stringify(counts));console.log('Dead',Object.keys(counts).filter(k=>counts[k][0]===0));

assert(Object.values(counts).every(c=>c[0]>0),'every style needs a reachable real input scenario');
