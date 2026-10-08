const assert=require('node:assert/strict'),{J,fixture,draw,createCanvas}=require('./phase4_fixture.cjs');
module.exports=async name=>{
 const {p,a,plan}=fixture(),sections=plan.musicalStructure.sections;
 if(name==='musical_section_test'){
  const custom={...a,features:{...a.features,timeline:Array.from({length:122},(_,i)=>({time:i*.5,energy:i<22?.25:i<58?.8:i<88?.16:.95,density:i<22?.2:.8,bass:i<58?.2:.8,spectralFlux:i<58?.1:.7}))}};
  const x=J.analyzeMusicalStructure(plan,custom,p),gaps=x.sections.map(s=>s.to-s.from);assert(!x.fallback);assert(x.sections.length>=3&&x.sections.length<=7);assert(new Set(gaps.map(x=>Math.round(x))).size>1);assert(x.sections.some(s=>Math.abs(s.from-29)<1||Math.abs(s.from-44)<1));
 }else if(name==='section_boundary_snap_test'){
  const x=J.snapMusicalBoundary(10,[{time:10.22,source:'lyric',priority:1},{time:10.9,source:'beat'}],.3);assert.equal(x.time,10.22);assert(Math.abs(x.shift)<=.3);assert.equal(J.snapMusicalBoundary(10,[{time:11}],.3).time,10);
 }else if(name==='beat_salience_test'){
  const x=J.buildBeatHierarchy({beats:[0,.5,1,1.5,2,2.5],lines:[]},{energyRate:2,energy:Float32Array.from([.2,.9,.3,.95,.2,.7]),onset:Float32Array.from([.1,.9,.1,.9,.1,.3])});assert(x[1].beatSalience>x[0].beatSalience);assert(x[3].beatSalience>x[4].beatSalience);assert(x.every(b=>b.downbeat===null));assert(x.some(b=>b.impact==='maintain')&&x.some(b=>b.impact==='macro'));
 }else if(name==='visual_hit_alignment_test'){
  const good=J.measureVisualHitAlignment({beatHierarchy:[{time:1,beatSalience:1}],events:[{t:1.03,amp:.8}]});const bad=J.measureVisualHitAlignment({beatHierarchy:[{time:1,beatSalience:1}],events:[{t:1.4,amp:.8}]});assert(good.score>bad.score);assert.equal(good.alignedPercent,100);
 }else if(name==='scene_distinctness_test'){
  const c=createCanvas(48,48),ctx=c.getContext('2d');ctx.fillStyle='#111';ctx.fillRect(0,0,48,48);const read=()=>Array.from(ctx.getImageData(0,0,48,48).data).filter((_,i)=>i%4!==3).map(x=>x/255);const first=read();ctx.fillStyle='#ec8011';ctx.fillRect(0,0,48,24);const second=read();assert.equal(J.sceneDistinctness({grid:first},{grid:first}).score,0);assert(J.sceneDistinctness({grid:first},{grid:second}).score>20);
 }else if(name==='motif_arc_test'){
  const peak=sections.find(s=>s.role==='climax'),early=J.motifStateAt(plan,1),late=J.motifStateAt(plan,peak.from+.5);assert(late.density>early.density);const canvas=createCanvas(320,180),ctx=canvas.getContext('2d');ctx.scale(320/plan.W,180/plan.H);J.drawUnifiedMotif(ctx,plan,1);let first=canvas.toBuffer('image/png');ctx.clearRect(0,0,plan.W,plan.H);J.drawUnifiedMotif(ctx,plan,peak.from+.5);assert(!first.equals(canvas.toBuffer('image/png')));
 }else if(name==='motif_fatigue_test'){
  const x={...plan,cuts:Array.from({length:8},(_,i)=>({line:0,start:i,architecture:'stacked',backgroundScene:{id:'WIDE'},motifState:{state:'line'},cam:'push',repetitionIndex:0}))};assert(J.auditMotifFatigue(x).penalties.length>0);assert(J.auditMotifFatigue({...x,cuts:x.cuts.slice(0,3)}).score===100);
 }else if(name==='typography_v5_test'){
  const c=plan.cuts.find(x=>x.line>=0),strong=plan.beatHierarchy.sort((a,b)=>b.beatSalience-a.beatSalience)[0],state=J.typography5State(plan,c,strong.time);assert(state.scale>1);assert(state.width>=.85&&state.weight>=500&&Math.abs(state.slant)<10);assert(draw(plan,1).ink>10);
 }else if(name==='variable_font_fallback_test'){
  assert(!J.fontCapabilities('gothic_bold').variable);const b=new ArrayBuffer(64),v=new DataView(b);v.setUint16(4,1);[... 'fvar'].forEach((c,i)=>v.setUint8(12+i,c.charCodeAt(0)));v.setUint32(20,28);v.setUint16(32,16);v.setUint16(36,1);v.setUint16(38,20);[...'wght'].forEach((c,i)=>v.setUint8(44+i,c.charCodeAt(0)));v.setInt32(48,100*65536);v.setInt32(52,400*65536);v.setInt32(56,900*65536);J.userFontBytes.set('test-variable',b);assert.equal(J.fontCapabilities('test-variable').axes[0].tag,'wght');assert(!J.fontCapabilities('invalid').variable);
 }else if(name==='portrait_layout_resolver_test'){
  const {p:portrait,a:audio}=fixture('9:16');for(const source of ['diag','split','marquee','scatter','tile','ring']){const id=J.resolvePortraitLayout(source);assert.notEqual(id,'center');portrait.overrides={0:{layout:id}};const x=J.plan(portrait,audio);assert(draw(x,.9,[180,320]).ink>20,id);}
 }else if(name==='social_hype_v3_test'){
  const {plan:portrait}=fixture('9:16'),hook=J.socialHookCandidates(portrait,a)[0],social=J.createSocialHookPlan(portrait,hook);assert(social.socialHook.version>=3);assert.equal(social.socialHook.phases.length,6);assert(social.H>social.W);assert(social.cuts.filter(c=>c.socialHookPhase).every(c=>c.layout!=='center'));assert(draw(social,hook.start+.8,[180,320]).ink>20);
 }else if(name==='social_loop_test'){
  const hook=J.socialHookCandidates(plan,a)[0],social=J.createSocialHookPlan(plan,hook),pixels=Array(192).fill(.5);const close=J.measureSocialLoop(social,pixels,pixels,a),different=J.measureSocialLoop(social,pixels,Array(192).fill(0),a);assert(close.score>different.score);assert.equal(close.pixelContinuity,100);
 }else if(name==='credit_choreography_test'){
  assert.equal(J.creditStateAt(plan,1).opacity,1);const peak=sections.find(s=>s.role==='climax');assert(J.creditStateAt(plan,Math.min(peak.to-.2,peak.from+3)).hidden);assert.equal(J.creditStateAt(plan,plan.duration-.5).opacity,1);plan.creditChoreography.mode='always';assert(!J.creditStateAt(plan,30).hidden);
 }else if(name==='director_context_v3_test'){
  const c=J.directorContext(p,plan,a);assert(['jizura-director-context-v3','jizura-director-context-v4','jizura-director-context-v5','jizura-director-context-v7'].includes(c.schema));for(const key of ['macroSections','microSections','sceneCandidates','motifCandidates','styleCompatibility','beatSalienceSummary','currentQAFailures','socialTarget','visualWorldState'])assert(key in c,key);assert(c.audioStatistics.energy.mean<1&&c.audioStatistics.energy.dynamicRange>0);
 }else if(name==='director_macro_section_test'){
  const hash=J.directorContext(p,plan,a).projectHash,raw={schema:'jizura-director-v3',projectHash:hash,chapters:sections.map(s=>({...s,motionIntent:['push'],restraint:.4,loop:'return'})),constraints:{preserveLyrics:true,safeArea:true}};assert(J.validateDirectorPlan(raw,p,plan,a).valid);assert(!J.validateDirectorPlan({...raw,chapters:Array(8).fill(raw.chapters[0])},p,plan,a).valid);assert(!J.validateDirectorPlan({...raw,story:'<script>bad</script>'},p,plan,a).valid);
 }else if(name==='director_candidate_tournament_test'){
  const hash=J.directorContext(p,plan,a).projectHash,candidates=[{index:0,plan:{schema:'jizura-director-v3',projectHash:hash,concept:{title:'A'},chapters:sections, constraints:{safeArea:true,preserveLyrics:true}}}];
  const original=J.analyzeRenderedFrames;J.analyzeRenderedFrames=async()=>({completed:true,issues:[],metrics:{styleArcRealization:90,visualNovelty:50,distinctLayoutCount:3}});try{const x=await J.compareDirectorCandidates(p,a,candidates);assert(x[0].recommended);assert(x[0].windows.length>=5);assert(Number.isFinite(x[0].quality.direction));}finally{J.analyzeRenderedFrames=original;}
 }else if(name==='foreground_channels_test'){
  const canvas=createCanvas(320,180),ctx=canvas.getContext('2d');ctx.scale(320/plan.W,180/plan.H);J.drawUnifiedMotif(ctx,plan,1);assert(canvas.getContext('2d').getImageData(0,0,320,180).data.some((x,i)=>i%4===3&&x>0));assert(draw(plan,1).ink>0);
 }else if(name==='pro_asset_deck_test'){
  const url=createCanvas(4,4).toDataURL('image/png'),assets=J.validateAssetDeck(Array.from({length:7},(_,i)=>({id:String(i),dataUrl:url,role:i===0?'logo':'support'})));assert.equal(assets.length,5);assert.equal(J.validateAssetDeck([{dataUrl:'https://example.invalid/a.png'}]).length,0);const renderer=new J.Renderer();await renderer.loadAssetDeck({assetDeck:assets});assert.equal(renderer.assetBitmaps.size,5);await renderer.loadAssetDeck({assetDeck:[]});assert.equal(renderer.assetBitmaps.size,0);
 }else throw Error('unknown '+name);
 console.log(name+' PASS');
};
