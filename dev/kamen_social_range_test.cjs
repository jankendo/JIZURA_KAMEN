const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const J={highlightCandidates:()=>['full remains'],plan:()=>['original plan']},originalPlan=J.plan;
vm.runInNewContext(fs.readFileSync(require('node:path').join(__dirname,'../src/11zzg_social_range.js'),'utf8'),{window:{J}});
const audio={duration:60,features:{timeline:[]}},plan=lines=>({lines,hasTimedLyrics:true,duration:60});
const line=(text,start,end)=>({text,start,end});
// Delayed first lyric: exact millisecond onset, no introductory empty interval.
let p=plan([line('a',14.289,17.609),line('b',17.609,20.98),line('c',20.98,23.919),line('d',23.919,25.769),line('e',25.769,28.089),line('a',28.089,31.439),line('b',31.439,34.9),line('c',34.9,37.809),line('d',37.809,39.559),line('e',39.559,41.059)]);
const snapshot=JSON.stringify(p),c=J.socialHookCandidates(p,audio);
assert.equal(c[0].start,14.289);assert.equal(c[0].end,28.089);assert.equal(c[0].selectionEvidence.wholeRepeatedBlock,true);assert.equal(JSON.stringify(p),snapshot);
assert.ok(c.some(v=>v.start===28.089&&v.end===41.059));
// A single held 13s phrase is meaningful; do not require three lines.
let r=J.socialHookCandidates(plan([line('held',4.123,17.123)]),audio);assert.equal(r[0].start,4.123);assert.equal(r[0].end,17.123);
// A tempting next onset at 14s would truncate the held 16s phrase: reject it.
assert.throws(()=>J.socialHookCandidates(plan([line('long',1,17),line('next',14,18)]),audio),/12〜15秒/);
// Display end before a long instrumental tail: avoid padding to audio end.
r=J.socialHookCandidates(plan([line('one',10,16),line('two',16,23)]),audio);assert.equal(r[0].end,23);
// Invalid/unavailable exact times must not be replaced with invented ones.
assert.throws(()=>J.socialHookCandidates({...p,hasTimedLyrics:false},audio),/時刻付き/);
assert.throws(()=>J.socialHookCandidates(plan([line('held',4,17),line('invalid',18,NaN)]),audio),/表示時刻/);
// Full plan and existing 60-second selector are untouched.
assert.equal(J.plan,originalPlan);assert.equal(J.highlightCandidates()[0],'full remains');
// Never exceed media length or create a shortened held phrase.
assert.throws(()=>J.socialHookCandidates(plan([line('held',4,17)]),{...audio,duration:16}),/12〜15秒/);
// Explicit extended visual hold wins over an earlier heuristic end.
r=J.socialHookCandidates(plan([{...line('hold',3,14),visEnd:16}]),audio);assert.equal(r[0].end,16);
console.log('SNS original-interval selection: 8 cases passed');
