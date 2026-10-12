'use strict';
const assert=require('node:assert/strict');
const {engine}=require('./custom_test_support.cjs');
const {J}=engine();
const image=(x)=>{const a=new Uint8ClampedArray(80*48*4);for(let y=10;y<30;y++)for(let i=x;i<x+12;i++)a[(y*80+i)*4+3]=255;return J.registryInkSignature(a,80,48);};
const A=image(5),B=image(55);
assert.equal(J.registryInkDistance(A,A),0);
assert(J.registryInkDistance(A,B)>.9,'different glyph placement must have a distinct measured signature');
const c=(layout,family,score,signature,safe=true)=>({layout,family,score,signature,evidence:{eligible:safe}});
const steps=[
 {line:0,role:'verse',energy:.6,candidates:[c('a','statement',1,A),c('unsafe','novelty',100,B,false)]},
 {line:1,role:'verse',energy:.6,candidates:[c('a','statement',1,A)]},
 {line:2,role:'climax',energy:.8,candidates:[c('a','statement',1,A),c('b','frame',.99,B)]}
];
const before=JSON.stringify(steps),one=J.chooseRegistryStoryboard(steps),two=J.chooseRegistryStoryboard(steps);
assert.equal(one.status,'MEASURED_SAFE_SEQUENCE');
assert.deepEqual(Array.from(one.picks,x=>x.layout),['a','a','b'],'the global sequence should avoid a third visual duplicate when measured alternatives are nearly tied');
assert.deepEqual(one.picks,two.picks,'identical inputs must yield deterministic ordering');
assert.equal(JSON.stringify(steps),before,'selection must not edit measured evidence');
assert.equal(J.chooseRegistryStoryboard([{line:0,candidates:[c('unsafe','x',999,B,false)]}]).status,'NO_MEASURED_SAFE_PATH');
assert(J.chooseRegistryStoryboard([{line:0,role:'intro',energy:.1,candidates:[c('a','statement',1,A)]},{line:1,role:'outro',energy:.1,candidates:[c('a','statement',1,A),c('b','frame',.1,B)]}]).picks.every(x=>x.layout==='a'),'quiet scenes should not be forced into unnecessary effects');
console.log('Global measured storyboard: deterministic, safe-only, phrase-aware, and non-mutating PASS');

assert.deepEqual(Array.from(J.chooseRegistryStoryboard([{line:0,role:'verse',energy:.7,candidates:[c('a','one',1,A)]},{line:1,role:'verse',energy:.7,candidates:[c('a','one',1,A)]},{line:2,role:'verse',energy:.7,candidates:[c('a','one',1,A),c('label-only','other',.99,A)]}]).picks,x=>x.layout),['a','a','a'],'renaming a family without a real pixel change must not escape fatigue');
