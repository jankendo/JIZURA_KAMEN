const assert=require('node:assert/strict');const {chantProject}=require('./hype_test_helpers.cjs');
const {plan}=chantProject(28,1.7);const lyricCuts=plan.cuts.filter(c=>c.line>=0);
assert(lyricCuts.every(c=>c.text===plan.lines[c.line].text));assert(lyricCuts.every(c=>c.params.intensityScale<=1.27));assert(plan.hypeAudit.bounded&&plan.hypeAudit.repetitionLadder);
assert(lyricCuts.every(c=>['type','center','huge','diag','stack'].includes(c.layout)));assert(lyricCuts.every(c=>c.decor.length<=2));assert(plan.events.length<Math.max(1,lyricCuts.length),'no effects are appended to the original event stream');console.log('High energy remains within lyric, layout, style and event-budget bounds.');
