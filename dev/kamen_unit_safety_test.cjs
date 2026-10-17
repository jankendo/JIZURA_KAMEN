'use strict';
const assert=require('node:assert/strict'),{engine}=require('./custom_test_support.cjs'),{J,context}=engine();context.Path2D=require('@napi-rs/canvas').Path2D;
(async()=>{
 const project=J.defaultProject();Object.assign(project,{lyrics:'[00:00.30]時をつなぐ\n[00:03.20]遠くの灯りを見つめる',res:720,fps:24,style:'paper'});project.customBg.enabled=false;
 const plan=J.plan(project,{duration:7,beats:[],features:{energy:.2}});plan.musicalPhoto=null;const previousMotion=plan.motionDirector7,previousWorld=plan.visualWorld;plan.motionDirector7={};plan.visualWorld={chapters:[{from:0,to:7,photoExit:true,fieldColor:'#0b1020'}]};
 const requested={text:'時をつなぐ',color:'#111111',size:80};assert.equal(J.adjustLocalReadability({plan,cut:plan.cuts.find(c=>c.line>=0),t:1,pass:'main',H:plan.H},requested).color,'#111111','unrendered photo-exit field cannot override actual non-image foreground color');plan.motionDirector7=previousMotion;plan.visualWorld=previousWorld;
 const cut=plan.cuts.find(c=>c.line>=0);Object.assign(cut,{layout:'huge',inDur:0,outDur:0,enter:'cut',exit:'cut',hold:'still',cam:'stillCamera',params:{...cut.params,font:'embedded_bold'}});
 const fitEnv={plan,cut,pass:'main',H:plan.H},fitItem={text:cut.text,font:'embedded_bold',size:100,x:123,y:234};
 const key=J.unitSafetyItemKey(fitItem);cut.params.unitSafetyFitItems=[{itemKey:key,factor:.6}];
 const scaled=J.adjustLocalReadability(fitEnv,fitItem);assert.equal(scaled.size,60);assert.equal(scaled.x,123);assert.equal(scaled.y,234);
 assert.equal(J.adjustLocalReadability(fitEnv,{...fitItem,size:120}).size,72,'fixed factor preserves relative animated size');
 assert.equal(J.adjustLocalReadability(fitEnv,{...fitItem,text:'別単位'}).size,100,'same line cannot borrow another internal item fit');
 cut.locked=true;assert.equal(J.adjustLocalReadability(fitEnv,fitItem).size,100,'manual lock bypasses automatic fitting');cut.locked=false;delete cut.params.unitSafetyFitItems;
 const original=JSON.stringify(plan.cuts.map(c=>[c.text,c.start,c.end,c.line]));
 const locked=plan.cuts.filter(c=>c.line>=0).at(-1);locked.locked=true;const beforeLock=JSON.stringify(locked);
 await J.prepareAutomaticUnitSafety({plan});
 assert.equal(JSON.stringify(locked),beforeLock,'manual lock cannot be repaired');assert.equal(JSON.stringify(plan.cuts.map(c=>[c.text,c.start,c.end,c.line])),original,'source units and clocks unchanged');
 assert(plan.automaticUnitSafety.decisions.some(d=>d.adopted),'unsafe large unit has a measured safe alternative');
 for(const d of plan.automaticUnitSafety.decisions.filter(d=>d.adopted))assert(d.after.every(s=>s.geometry.every(g=>g.readable)&&s.complete&&s.safe&&s.contrast.contrastRatio>=3&&s.contrast.score>=95));
 for(const candidate of plan.unitSafetyPreservingCandidates||[]){const shipping=plan.cuts.find(c=>c.index===candidate.index);assert.equal(candidate.fullState.layout,candidate.previousState.layout);assert.equal(candidate.fullState.hold,candidate.previousState.hold);assert.equal(candidate.fullState.cam,candidate.previousState.cam);assert.equal(candidate.requiresFinalEncodedComparison,true);assert.equal(shipping.layout,'globalReadableUnit','Native proposal cannot replace the shipping fallback');}
 const cancellation=new AbortController();cancellation.abort();await assert.rejects(J.prepareAutomaticUnitSafety({plan,signal:cancellation.signal}),e=>e.name==='AbortError');
 console.log('Automatic unit native geometry/contrast, immutable text/timing, manual lock and cancellation counterexamples PASS; actual MP4 required separately');
})().catch(e=>{console.error(e);process.exitCode=1;});
