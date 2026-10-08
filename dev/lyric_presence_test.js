const assert=require('node:assert/strict'),{J,draw}=require('./raster_test_support.cjs');
const p=J.defaultProject();p.lyrics='[00:00.00]日本語の歌詞\n[00:02.00]次の行も見える';p.title='';p.artist='';p.aspect='9:16';p.artDirection={realityVersion:2};
const plan=J.plan(p,{duration:5,beats:[],energy:new Float32Array(250),energyRate:50});
const frame=draw(plan,1,[180,320]);assert(frame.ink>40,'active glyphs must paint actual alpha pixels');
const report=J.checkMVQuality(p,plan,{duration:5,buffer:{}},null,{completed:true,issues:[{code:'LYRIC_NOT_RENDERED',severity:'ERROR',message:'missing'}],metrics:{lyricNotRendered:1}});
assert.equal(report.ready,false);assert(report.quality.score<100);
console.log('Actual Canvas lyric pixels and hard absence gate passed.');
