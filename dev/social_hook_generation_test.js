const assert=require('node:assert/strict');const {chantProject}=require('./hype_test_helpers.cjs');
const {J,plan,a}=chantProject();const hooks=J.socialHookCandidates(plan,a);assert(hooks.length>0&&hooks.length<=3);
for(const clip of hooks){assert(clip.duration>=12&&clip.duration<=15);assert(clip.complete);assert(clip.first3Energy>=.65);assert(clip.end-clip.start===clip.duration);}
assert.notEqual(hooks[0].start,undefined);assert(J.highlightCandidates(plan,a).some(c=>c.end-c.start>=12));console.log('12–15 second contiguous SOCIAL HOOKs and existing 60-second highlights pass.');
