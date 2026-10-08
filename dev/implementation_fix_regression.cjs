const assert=require('node:assert/strict'),{J,fixture,draw,createCanvas}=require('./phase4_fixture.cjs');
module.exports=async name=>{
 const {p,a,plan}=fixture();
 if(name==='certification_guard_test'){
  const good={domains:{technical:99,musicalDirection:95,typography:95,visualWorld:95,motionRealization:95,audienceImpact:95,social:95,semanticDirection:null},creative:95,exportVerified:true,provenanceMatch:true,pixelComplete:true,lyricSampleCount:60,requiredLyricSamples:60,semanticRequired:false,socialHook:false,loopQuality:89,portraitWarnings:0,issues:[]};
  assert(J.certificationEligibility7(good),'positive control');
  for(const bad of [{domains:{...good.domains,social:69}},{issues:[{severity:'ERROR',code:'VISUAL_STAGNATION'}]},{issues:[{severity:'WARNING'}]},{lyricSampleCount:59},{provenanceMatch:false},{semanticRequired:true}])assert(!J.certificationEligibility7({...good,...bad}),JSON.stringify(bad));
  assert(!J.certificationEligibility7({...good,socialHook:true,loopQuality:84}));
 }else if(name==='override_preservation_test'){
  for(const aspect of ['16:9','9:16','1:1','4:5']){p.aspect=aspect;p.overrides={0:{layout:'vcols',cam:'stillCamera',hold:'breathe',trans:'diagonalWipe',lock:true}};const q=J.plan(p,a);for(const mutate of [()=>{},()=>J.applyVisualWorld7(q)]){mutate();const c=q.cuts.find(c=>c.line===0);for(const k of ['layout','cam','hold','trans'])assert.equal(c[k],p.overrides[0][k],k);assert.equal(J.cameraAt(q,c.start+.4).s,1);assert(draw(q,c.start+.5).ink>10);}const cloned=structuredClone(q);J.applyVisualWorld7(cloned);assert.equal(cloned.cuts.find(c=>c.line===0).layout,'vcols');}
 }else if(name==='director_intent_preservation_test'){
  const raw={schema:'jizura-director-v4',projectHash:J.directorProjectHash(p,a.duration,a),chapters:plan.musicalStructure.sections.map(s=>({...s,typographyIntent:'vertical',sceneIntent:'detail',motionIntent:'calm'})),constraints:{preserveLyrics:true,safeArea:true}};
  const v=J.validateDirectorPlan(raw,p,plan,a);assert(v.valid,JSON.stringify(v.errors));const project=J.applyDirectorPlan(p,v.candidates[0].plan,a),q=J.plan(project,a);for(const w of q.visualWorld.chapters){assert.equal(w.architecture,'vertical');assert.equal(w.scene,'DETAIL');assert(!w.photoExit);}for(const c of q.cuts.filter(c=>c.line>=0)){assert.equal(c.layout,'vcols');assert.equal(c.backgroundScene.id,'DETAIL');assert.equal(c.cam,'stillCamera');}J.applyVisualWorld7(q);assert(draw(q,1).ink>10);
 }else if(name==='quality_hard_gate_count_test'){
  const pixel={completed:true,metrics:{lyricPoints:[],lyricNotRendered:1,stagnationSeconds:20,worldRealization:{score:100,weakChapters:[]},audienceImpact:{score:0,climaxPass:false}}};const r=J.checkMVQuality(p,plan,a,null,pixel);assert(r.errors.some(x=>x.code==='VISUAL_STAGNATION'));assert.equal(r.quality.hardGates.total,r.errors.length);assert(!r.quality.hardGates.passed);assert(r.quality.creativeScore<=72);assert(!r.quality.certified100);
 }else if(name==='quality_range_consistency_test'){
  const pixel={completed:true,metrics:{lyricPoints:[],stagnationSeconds:0}},r1=J.checkMVQuality(p,plan,a,null,pixel),r2=J.checkMVQuality(p,plan,a,{start:0,end:plan.duration},pixel);assert.equal(r1.quality.socialScore,r2.quality.socialScore);assert.deepEqual(r1.quality.productionDomains,r2.quality.productionDomains);assert.equal(J.normalizeQARange7(plan,{start:0,end:plan.duration}),null);
 }else if(name==='observer_range_origin_test'){
  assert.equal(J.observerTimeOrigin7({socialHook:{start:13.43}}),13.43);assert.equal(J.observerTimeOrigin7({socialHook:{start:13.43}},{start:20}),20);assert.equal(J.observerTimeOrigin7({}),0);
  const relative={peaks:[{time:.05,tier:'Major'}],sampleCount:10},origin=J.observerTimeOrigin7({socialHook:{start:13}}),aligned={...relative,peaks:relative.peaks.map(x=>({...x,time:x.time+origin}))};assert.equal(J.alignObservedPeaks(aligned,{BEAT:[13.05]}).score,100);assert.equal(J.alignObservedPeaks(relative,{BEAT:[13.05]}).score,0);
 }else if(name==='negative_space_layers_test'){
  const peak=plan.musicalStructure.sections.find(s=>s.role==='climax'),t=peak.from-.325,control={...plan,suppressNegativeSpace7:true};const measure=q=>{const c=createCanvas(240,135),x=c.getContext('2d');x.scale(240/q.W,240/q.W);J.drawUnifiedMotif(x,q,t);const b=x.getImageData(0,0,240,135).data;let n=0;for(let i=3;i<b.length;i+=4)n+=b[i];return n;};assert(measure(plan)<measure(control)*.4);const c0=J.cameraAt(control,t),c1=J.cameraAt(plan,t);assert(Math.abs(c1.s-1)<=Math.abs(c0.s-1)*.16+1e-8);
 }else throw Error(name);
 console.log(name+' PASS');
};
