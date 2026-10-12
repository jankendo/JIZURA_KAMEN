'use strict';
const assert=require('node:assert/strict'),{engine}=require('./custom_test_support.cjs'),{J,context}=engine();context.Path2D=require('@napi-rs/canvas').Path2D;
(async()=>{
 const project=J.defaultProject();Object.assign(project,{lyrics:'[00:00.30]時をつなぐ\n[00:03.20]遠くの灯りを見つめる',res:720,fps:24,style:'paper'});project.customBg.enabled=false;
 const plan=J.plan(project,{duration:7,beats:[],features:{energy:.2}});plan.musicalPhoto=null;
 const cut=plan.cuts.find(c=>c.line>=0);Object.assign(cut,{layout:'huge',inDur:0,outDur:0,enter:'cut',exit:'cut',hold:'still',cam:'stillCamera',params:{...cut.params,font:'embedded_bold'}});
 const original=JSON.stringify(plan.cuts.map(c=>[c.text,c.start,c.end,c.line]));
 const locked=plan.cuts.filter(c=>c.line>=0).at(-1);locked.locked=true;const beforeLock=JSON.stringify(locked);
 await J.prepareAutomaticUnitSafety({plan});
 assert.equal(JSON.stringify(locked),beforeLock,'manual lock cannot be repaired');assert.equal(JSON.stringify(plan.cuts.map(c=>[c.text,c.start,c.end,c.line])),original,'source units and clocks unchanged');
 assert(plan.automaticUnitSafety.decisions.some(d=>d.adopted),'unsafe large unit has a measured safe alternative');
 for(const d of plan.automaticUnitSafety.decisions.filter(d=>d.adopted))assert(d.after.every(s=>s.geometry.every(g=>g.readable)&&s.complete&&s.safe&&s.contrast.contrastRatio>=3&&s.contrast.score>=95));
 const cancellation=new AbortController();cancellation.abort();await assert.rejects(J.prepareAutomaticUnitSafety({plan,signal:cancellation.signal}),e=>e.name==='AbortError');
 console.log('Automatic unit native geometry/contrast, immutable text/timing, manual lock and cancellation counterexamples PASS; actual MP4 required separately');
})().catch(e=>{console.error(e);process.exitCode=1;});
