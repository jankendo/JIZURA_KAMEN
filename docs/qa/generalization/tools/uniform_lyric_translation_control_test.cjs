'use strict';
const assert=require('assert/strict'),{installUniformLyricTranslationControl:install}=require('./uniform_lyric_translation_control.cjs');let n=0;
const env={t:1,cut:{index:2,line:0,layout:'photoCondensed',start:0,end:3}},item={text:'same',font:'same',charFns:[]};
for(const mode of ['ON','OFF','ON_REPEAT'])for(const contract of [{status:'EXECUTABLE',mode:'UNIFORM_TRANSLATION',state:{role:'light'}},{status:'EXECUTABLE',mode:'GRAMMAR',state:{role:'continuity'}},{status:'NOT_APPLICABLE',reason:'LOCKED'}]){
 const original=()=>contract,J={cinemaLyricTemporalContract:original},before=structuredClone(item),control=install(J,mode),got=J.cinemaLyricTemporalContract(env,item),off=mode==='OFF'&&contract.mode==='UNIFORM_TRANSLATION';assert(off?got.status==='NOT_APPLICABLE':got===contract);assert.deepEqual(item,before);assert.equal(control.stats.disabledCalls,off?1:0);control.restore();assert.equal(J.cinemaLyricTemporalContract,original);n++;
}
assert.throws(()=>install({},'ON'),/ABSENT/);assert.throws(()=>install({},'OTHER'),/UNKNOWN/);console.log(`${n+2} PASS: exact contract isolation, ON identity, grammar/manual exclusion, settings unchanged and restoration`);
