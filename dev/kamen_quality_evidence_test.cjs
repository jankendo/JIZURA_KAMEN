'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
let supplied;
const J={measurePerceptualNovelty:frames=>({pairs:frames.slice(1).map((f,i)=>({from:frames[i].time,to:f.time,score:1,stagnant:true})),stagnationSeconds:10}),analyzeRenderedFrames:async()=>supplied,checkMVQuality:()=>({quality:{typographyScore:73}}),createExportProvenance:async()=>({measurementSources:{},measurementPolicy:{}})};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/11zzc_quality_evidence.js'),'utf8'),{window:{J}});
const plan={duration:30,lines:[{index:0,start:12,end:22,visEnd:22,text:'歌詞'}],musicalStructure:{sections:[{from:0,to:12,role:'intro'},{from:12,to:22,role:'verse'},{from:22,to:30,role:'outro'}]}};
const slow=Array.from({length:11},(_,i)=>({time:i,grid:[i*.0002,.1,.2],hash:i+1}));
const quiet=J.measurePerceptualNovelty(slow),e=J.classifyTemporalEvidence(plan,quiet.pairs);
assert.equal(e.applicableStagnationSeconds,0);assert.equal(e.intentionalLyricFreeRestraintSeconds,10);assert(e.intervals.every(p=>p.classification==='INTENTIONAL_LYRIC_FREE_RESTRAINT'));
const frozen=J.measurePerceptualNovelty(slow.map(f=>({...f,grid:[.1,.1,.1],hash:7}))),freeze=J.classifyTemporalEvidence(plan,frozen.pairs);assert.equal(freeze.frozenSuspectSeconds,10);assert.equal(freeze.applicableStagnationSeconds,10);
const active=J.classifyTemporalEvidence(plan,quiet.pairs.map(p=>({...p,from:p.from+12,to:p.to+12})));assert.equal(active.activeLyricLowVariationSeconds,10);
// A line crossing a sample boundary is active, including line index zero.
assert.equal(J.classifyTemporalEvidence(plan,[{from:11.9,to:12.1,score:1,stagnant:true,pixelDelta:.001}]).intervals[0].activeLyrics,true);
assert.equal(J.classifyTemporalEvidence(plan,quiet.pairs,{start:2,end:5}).intentionalLyricFreeRestraintSeconds,3);
assert.equal(J.classifyTemporalEvidence({...plan,musicalStructure:{sections:[]}},quiet.pairs).applicableStagnationSeconds,10);
const hold={...plan,directorSections7:[{from:0,to:12,cameraIntent:'locked'}]};assert.equal(J.classifyTemporalEvidence(hold,frozen.pairs).frozenSuspectSeconds,0);
const glyph=J.glyphInspectionEvidence(plan,{lyricPoints:[{line:0,time:13,missing:true,clipped:false},{line:0,time:18,missing:false,clipped:true}]});assert.equal(glyph.missingSamples,1);assert.equal(glyph.clippedSamples,1);assert.equal(glyph.readabilityScore,null);assert.equal(glyph.localContrastStatus,'UNMEASURED');
(async()=>{
 supplied={completed:true,issues:[{code:'visual_stagnation'},{code:'LYRIC_NOT_RENDERED'}],metrics:{temporalNovelty:quiet.pairs,stagnationSeconds:10,lyricPoints:[]}};
 const r=await J.analyzeRenderedFrames(plan);assert.equal(r.metrics.stagnationSeconds,0);assert(r.issues.some(i=>i.code==='LYRIC_NOT_RENDERED'));assert(!r.issues.some(i=>i.code==='visual_stagnation'));
 const q=J.checkMVQuality({},plan,null,null,r).quality;assert.equal(q.typographyScore,73);assert(q.typographyEvidence.formula.includes('not a contrast/readability score'));
 supplied={completed:true,issues:[{code:'visual_stagnation'}],metrics:{stagnationSeconds:10}};const unknown=await J.analyzeRenderedFrames(plan);assert.equal(unknown.metrics.stagnationSeconds,10);assert.equal(unknown.metrics.temporalEvidence.status,'UNMEASURED');assert.equal(unknown.issues.length,1);
 const metadata=await J.createExportProvenance({plan});assert.equal(metadata.qualityEvidence.typography.readabilityScore,null);
 console.log('Quality evidence: slow lyric-free motion, frozen suspicion, active lyric stagnation, range, explicit hold, glyph failures and unmeasured preservation passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
