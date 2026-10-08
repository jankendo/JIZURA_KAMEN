const assert=require('node:assert/strict'),path=require('node:path');
const {J,draw,createCanvas,fixture}=require('./phase4_fixture.cjs');
module.exports=async name=>{
 const {p,a,plan}=fixture();
 if(name==='vertical_raster_test'){
   for(const aspect of ['16:9','9:16','1:1','4:5']){const {p:project,a:audio}=fixture(aspect);project.overrides={0:{layout:'vcols'}};const q=J.plan(project,audio),f=draw(q,q.lines[0].start+.6,aspect==='9:16'?[180,320]:[320,180]);assert(f.ink>30,aspect);}
 }else if(name==='vertical_motion_test'){
   const env={W:1080,H:1920,ctx:createCanvas(108,192).getContext('2d'),scale:.1,cut:{params:{}}};env.ctx.setTransform(.1,0,0,.1,0,0);
   for(const phase of [0,.5,1]){const it=J.safeLyricItem(env,{text:'動く縦歌詞',size:170,font:'gothic_bold',vertical:true,align:'left',x:900,y:1600,rot:phase*32,skew:phase*6,charFn:i=>({dx:i*phase*8,sx:1+phase*.12})}),b=J.measureLyricItemBounds(env,it);assert(b.x0>=55&&b.x1<=1025&&b.y0>=150&&b.y1<=1770,JSON.stringify(b));}
 }else if(name==='vertical_all_layouts_test'){
   const ids=J.order('layout').filter(id=>/vcol|vert|spine|pillar|tower/i.test(id));assert(ids.length>=2);
   for(const id of ids){p.overrides={0:{layout:id}};const q=J.plan(p,a),cut=q.cuts.find(c=>c.line===0);assert.equal(cut.layout,id,'vertical selection must survive planning');assert(draw(q,cut.start+Math.min(1.3,cut.dur*.65)).ink>0,id);}
 }else if(name==='lyric_partial_clip_test'){
   const qa={completed:true,metrics:{lyricPartialClip:1},issues:[]},report=J.checkMVQuality(p,plan,a,null,qa);assert(report.errors.some(i=>i.code==='LYRIC_PARTIAL_CLIP'));assert(report.quality.score<100);
 }else if(name==='scene_arc_test'){
   assert(plan.styleArc.segments.length>=3&&plan.styleArc.segments.length<=5);assert(plan.cuts.filter(c=>c.line>=0).every(c=>c.chapter?.style&&c.chapter?.typographyMode&&c.chapter?.transitionLanguage));
 }else if(name==='background_variant_test'){
   const shots=new Set(plan.cuts.filter(c=>c.line>=0).map(c=>c.backgroundScene?.id));assert(shots.size>=3,[...shots].join(','));
 }else if(name==='style_arc_visual_test'){
   const chapterCuts=plan.styleArc.segments.map(s=>plan.cuts.find(c=>c.line>=0&&c.start>=s.from&&c.start<s.to)).filter(Boolean);assert(new Set(chapterCuts.map(c=>c.styleKey)).size>=2);
   const visual=new Set(chapterCuts.map(c=>[c.params.font,c.backgroundScene.id,c.chapter.typographyMode,c.chapter.graphicMotif].join('|')));assert(visual.size>=3);
 }else if(name==='foreground_novelty_test'){
   const early=draw(plan,plan.lines[1].start+.7),late=draw(plan,plan.lines[15].start+.7),a0=early.audit.getContext('2d').getImageData(0,0,320,180).data,b0=late.audit.getContext('2d').getImageData(0,0,320,180).data;
   let differences=0;for(let i=3;i<a0.length;i+=4)differences+=Math.abs(a0[i]-b0[i]);assert(differences>1000,`actual foreground glyph pixels must vary: ${differences}`);
 }else if(name==='typography_v4_test'){
   const source='光をつなぐ未来へ';const tokens=J.tokenizeLyric?.(source)||J.lyricTokens?.(source)||[...source];assert.equal(tokens.map(t=>typeof t==='string'?t:t.text).join(''),source);
   const it={text:source,font:'gothic_bold',size:100,x:700,y:500,track:.05,rot:12,skew:4,sx:1.2,charFn:i=>({s:1+i*.01,rot:i*2})};const env={W:1920,H:1080,ctx:createCanvas(192,108).getContext('2d'),scale:.1,cut:{params:{}}};assert(J.measureLyricItemBounds(env,it).x1>J.measureLyricItemBounds(env,{...it,sx:.6}).x1);
 }else if(name==='attention_budget_layer_test'){
   const b=J.auditAttentionBudget(plan);assert(b.windows.length&&b.windows.every(w=>Object.keys(w.layers).length===5));assert(Number.isFinite(b.peak));
 }else if(name==='pattern_interrupt_test'){
   const times=plan.styleArc.segments.slice(1).map(s=>s.from),gaps=times.slice(1).map((t,i)=>t-times[i]);assert(times.length>=2);assert(plan.events.some(e=>e.registryDriven)||plan.hookEngine.patternInterrupt);
 }else if(name==='social_hype_9x16_test'){
   const portrait=fixture('9:16').plan,candidate=J.socialHookCandidates(portrait,a)[0],social=J.createSocialHookPlan(portrait,candidate);assert(social.H>social.W);assert.equal(social.socialHook.phases.length,6);assert(draw(social,candidate.start+.8,[180,320]).ink>10);
 }else if(name==='director_multiwindow_test'){
   const windows=J.directorWindows(plan.duration);assert.equal(windows.length,5);assert(windows.some(w=>w.name==='climax'));assert(windows.some(w=>w.name==='ending'));
 }else if(name==='director_reality_test'){
   const context=J.directorContext(p,plan,a),data={schema:'jizura-director-v2',projectHash:context.projectHash,chapters:[{from:0,to:plan.duration,role:'climax',typographyIntent:'giant',sceneIntent:'tight'}],constraints:{preserveLyrics:true,safeArea:true}};
   assert(J.validateDirectorPlan(data,p,plan,a).valid);assert(!J.validateDirectorPlan({...data,constraints:{preserveLyrics:false,safeArea:true}},p,plan,a).valid);
 }else if(name==='director_pack_test'){
   const bg=createCanvas(3,3).toDataURL('image/png');p.customBg={...p.customBg,enabled:true,dataUrl:bg};
   const context=J.directorContext(p,plan,a),zip=await J.createDirectorPack({context,project:p});assert(zip.size>200);
   const bytes=Buffer.from(await zip.arrayBuffer()),required=['DIRECTOR_CONTEXT.json','lyrics.lrc','background.webp','CHATGPT_PROMPT.md','PROJECT_SUMMARY.md','README.txt'];for(const file of required)assert(bytes.includes(Buffer.from(file)),file);
 }else throw Error('unknown regression '+name);
 console.log(name+' passed');
};
