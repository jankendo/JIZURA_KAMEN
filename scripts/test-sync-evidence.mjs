import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const J={alignmentDomains8:()=>({beatSync:{score:50},lyricSync:{score:50}})};
vm.runInNewContext(fs.readFileSync(new URL('../src/11zzb_sync_evidence.js',import.meta.url),'utf8'),{window:{J}});
const observer=times=>({sampleCount:100,sampleStep:.1,peaks:times.map(time=>({time,tier:'Major'}))});
// Off-beat lyric cues and beat cues must not penalize each other.
let r=J.alignmentDomains8(observer([1,1.4,2,2.4]),{BEAT:[1,2,3],LYRIC_ONSET:[1.4,2.4]});
assert.equal(r.beatSync.score,null);assert.equal(r.beatSync.targetPeakPrecision,100);assert.equal(r.lyricSync.score,100);
assert.equal(r.beatSync.coverage,67);assert.equal(r.beatSync.missingTargets.length,1);
assert.equal(r.beatSync.coverageRequired,false);assert.equal(r.beatSync.confidenceStatus,'UNMEASURED');
// Missing lyric targets remain missing, and lower the measured recall.
r=J.alignmentDomains8(observer([1,1.4,2]),{BEAT:[1,2],LYRIC_ONSET:[1.4,2.4]});
assert.equal(r.lyricSync.score,50);assert.equal(r.lyricSync.missingTargets[0].time,2.4);
// One strong peak cannot count twice, even when two target types coincide.
r=J.alignmentDomains8(observer([1]),{BEAT:[1],LYRIC_ONSET:[1]});
assert.equal(r.attribution.matched.length,1);assert.equal(r.lyricSync.score,100);assert.equal(r.beatSync.coverage,0);
// Multiple peaks do not fabricate multiple realizations of a single target.
r=J.alignmentDomains8(observer([1,1.03]),{BEAT:[],LYRIC_ONSET:[1]});
assert.equal(r.lyricSync.matchedCount,1);assert.equal(r.lyricSync.score,50);
// A quiet but observed interval differs from absent measurements.
r=J.alignmentDomains8(observer([]),{LYRIC_ONSET:[1]});assert.equal(r.lyricSync.score,0);
r=J.alignmentDomains8(null,{LYRIC_ONSET:[1]});assert.equal(r.lyricSync.score,null);
// SECTION observations do not become failures in unrelated target domains.
r=J.alignmentDomains8(observer([1,1.4,3]),{BEAT:[1],LYRIC_ONSET:[1.4],SECTION:[3]});
assert.equal(r.beatSync.score,null);assert.equal(r.beatSync.targetPeakPrecision,100);assert.equal(r.lyricSync.score,100);
// Quality score requires explicitly intended beat cues, including missing ones.
r=J.alignmentDomains8(observer([1,1.4]),{BEAT:[1,2,3],EXPECTED_BEAT:[1,2],LYRIC_ONSET:[1.4]});
assert.equal(r.beatSync.score,50);assert.equal(r.beatSync.targetPeakPrecision,100);
assert.equal(r.beatSync.expectedMatchedCount,1);assert.equal(r.beatSync.missingExpectedTargets[0].time,2);
console.log('Target-conditioned sync evidence: 8 scenarios passed');
