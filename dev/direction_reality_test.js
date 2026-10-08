const assert=require('node:assert/strict'),J=require('./style_test_harness.cjs'),p=require('./fixtures/repetitive_chant.json');
const audio={duration:57.4,buffer:{},features:{energy:.75,percussive:.8,bpm:150,onsetDensity:.7,beatStrength:.8}};
const old=J.plan(p,audio);assert(!J.auditDirectionReality(old).ok);assert(J.checkMVQuality(p,old,audio).quality.score<100);
const proposal=J.proposeDirection(p,audio,p.autoPalette.stats);Object.assign(p,{style:proposal.style,mood:proposal.mood,fx:proposal.fx,enabled:proposal.enabled});p.artDirection=J.makeArtDirection(p,audio,proposal);const plan=J.plan(p,audio);assert(J.auditDirectionReality(plan).ok);
plan.artDirection.visualDNA.layoutStrategy='dynamicDiagonal';plan.cuts.forEach(c=>{c.layout='center';c.params.directionAngle=0;});assert(!J.auditDirectionReality(plan).ok);
console.log('Old supplied fixture fails Reality gate; renewed direction passes; contradictory plan fails');
