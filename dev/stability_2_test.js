'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const window={},document={getElementById(){return null},createElement(){return {getContext(){return {measureText(s){return {width:String(s).length*20}}}}}},fonts:{load:async()=>[],ready:Promise.resolve()},head:{appendChild(){}}};
const context=vm.createContext({window,document,console,Blob,TextEncoder,URL,setTimeout,clearTimeout,performance,requestAnimationFrame(){}});
for(const file of fs.readdirSync(path.join(__dirname,'../src')).filter(name=>name.endsWith('.js')).sort())vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),context,{filename:file});
const J=window.J;

const parsed=J.parseLyrics('奪い取れ！\n行末!\n普通の行');
assert.deepEqual(Array.from(parsed.lines,line=>line.impact),[true,true,false]);
assert.deepEqual(Array.from(parsed.lines,line=>line.text),['奪い取れ','行末','普通の行']);

const playerLyrics=J.parseLyrics('フォルツァ山田ー\n山田アレー\n山田アレー').lines;
const playerProfile=J.lyricsProfile(playerLyrics,18);
assert.equal(playerProfile.nameSignal,true,'generic player-name phrases are detected without a fixed player roster');
assert.equal(J.classifySong(playerProfile,{beatStrength:.7,onsetDensity:.7,sectionContrast:.2},18).type,'PLAYER_CHANT');
const ordinaryLyrics=J.parseLyrics('ちゃんと前を向いて\n今日も歩いてゆこう').lines;
assert.equal(J.lyricsProfile(ordinaryLyrics,20).nameSignal,false,'honorific-like words alone do not imply a player chant');

const migrated=J.migrateProject({version:1,style:'missing-style',mood:'missing-mood',aspect:'panorama',userFonts:[{key:'user_x',label:'手持ち書体',family:'UF_Test'}]});
assert.equal(migrated.schemaVersion,3);
assert.equal(migrated.migratedFromSchema,1);
assert.equal(migrated.style,'noir');
assert.equal(migrated.mood,null);
assert.equal(migrated.aspect,'16:9');
assert.equal(migrated.userFonts[0].assetKey,'user_x');
assert.throws(()=>J.migrateProject([]),/形式/);

assert.deepEqual(Array.from(J.bpmFamily(95)),[47.5,95,190]);
assert.deepEqual(Array.from(J.bpmFamily(47.5)),[47.5,95]);
assert.deepEqual(Array.from(J.bpmFamily(0)),[]);
assert.deepEqual({...J.BPM_RANGE},{min:45,max:240});

const view=J.timelineViewport(180,3,35);
assert.equal(view.start,35);assert.equal(view.span,60);assert.equal(J.timelineTimeAtRatio(view,.5),65);
assert.equal(J.previewAspectForMode('vertical'),'9:16');assert.equal(J.previewAspectForMode('x'),null);
const lines=[{start:1},{start:4},{start:8}];
assert.equal(J.snapTimelineLineTime(1,5.04,lines,[4.95,5,5.5],12,false),5);
assert.equal(J.snapTimelineLineTime(1,5.04,lines,[4.95,5,5.5],12,true),5);
assert.equal(J.snapTimelineLineTime(1,5.07,lines,[5.07],12,true),5.07,'nearby beat snap takes precedence over tenth-second grid');
assert.equal(J.snapTimelineLineTime(1,8,lines,[],12,false),7.98,'line markers cannot cross their neighbour');
console.log('JIZURA 2 stability: punctuation, schema migration, BPM family and timeline timing passed.');
