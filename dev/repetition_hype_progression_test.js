const assert=require('node:assert/strict');const {chantProject}=require('./hype_test_helpers.cjs');
const {plan}=chantProject(24,1.5),repeated=plan.cuts.filter(c=>c.line>=0&&c.text==='アレアレガンバエー');
assert(repeated.length>10);assert(repeated.at(-1).params.intensityScale>repeated[2].params.intensityScale);assert(repeated.at(-1).repetitionProgress>repeated[2].repetitionProgress);assert(repeated.some(c=>c.layout==='diag')&&repeated.some(c=>c.layout==='huge'),'late chant repetitions must progress into diagonal and hero layouts');
assert(new Set(repeated.slice(1,4).map(c=>c.hypeAccent)).size>=2);assert(plan.hypeAudit.repetitionLadder);assert(repeated.every(c=>c.params.intensityScale<=1.27));console.log('Repeated phrases progress in scale and accent without changing the lyric line.');
