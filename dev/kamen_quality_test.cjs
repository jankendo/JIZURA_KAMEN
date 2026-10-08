'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{performance}=require('node:perf_hooks');
const {engine,root}=require('./custom_test_support.cjs');
const baseline=process.argv[2]||root;
const previous=engine(fs.existsSync(baseline)?baseline:root),current=engine(),old=previous.J,J=current.J;
const results=[],timings=[];
const equal=(a,b)=>assert.equal(JSON.stringify(a),JSON.stringify(b));
function test(name,fn){fn();results.push({name,status:'PASS'});console.log(name,'PASS');}
function fixtures(count=300){
 const timeline=Array.from({length:count},(_,i)=>({time:i*.1,energy:.55+.3*Math.sin(i/41),density:.45+.22*Math.cos(i/31),spectralFlux:.2+.4*Math.abs(Math.sin(i/7)),bass:.1+.8*Math.abs(Math.cos(i/19)),onset:i%7?.12:.9}));
 const duration=Math.max(10,count*.1),beats=Array.from({length:Math.floor(duration/.4)},(_,i)=>i*.4),lines=Array.from({length:Math.floor(duration/3)},(_,i)=>({start:i*3,end:i*3+2.8,text:i%2?'未来へ進む':'光をつなぐ'}));
 return {plan:{duration,lines,beats,artDirection:{sectionProfiles:[]}},audio:{beats,features:{detailedTimeline:timeline}}};
}
const fixed=fixtures();
test('indexed_music_structure_preserves_every_result',()=>{for(const count of [0,1,35,300,1600]){const f=fixtures(count);equal(J.analyzeMusicalStructure(f.plan,f.audio,{}),old.analyzeMusicalStructure(f.plan,f.audio,{}));equal(J.buildBeatHierarchy(f.plan,f.audio),old.buildBeatHierarchy(f.plan,f.audio));}});
test('timeline_duplicates_ties_and_legacy_order_preserved',()=>{
 const frames=[{time:0,energy:.3,bass:.1},{time:1,energy:.5,bass:.7},{time:1,energy:.9,bass:.9},{time:2,energy:.6,bass:.5}];
 for(const timeline of [frames,[frames[2],frames[0],frames[3],frames[1]],[],[...frames,{time:NaN,energy:.8}]]){
  const f=fixtures(30);f.audio.features.detailedTimeline=timeline;f.audio.beats=f.plan.beats=[-.2,.5,1,1.5,2,2.5];
  equal(J.analyzeMusicalStructure(f.plan,f.audio,{}),old.analyzeMusicalStructure(f.plan,f.audio,{}));equal(J.buildBeatHierarchy(f.plan,f.audio),old.buildBeatHierarchy(f.plan,f.audio));
 }
});
test('actual_weight_used_for_glyph_fitting_and_drawing',()=>{
 const canvas=current.createCanvas(1920,1080),ctx=canvas.getContext('2d');
 const env={ctx,W:1920,H:1080,t:1,scale:1,pass:'main',allowFilter:false,plan:{artDirection:{realityVersion:2}},cut:{line:0,start:0,end:4,params:{}}};
 const item={text:'未来へ進む ABC',font:'gothic_regular',fontWeight:800,size:230,x:960,y:540,color:'#fff'};
 const css=J.fontCSS,weights=[];J.fontCSS=(font,size,weight)=>{weights.push(weight);return css(font,size,weight);};
 try{const safe=J.safeLyricItem(env,item),measured=J.measureLyricItemBounds(env,safe),drawn=J.drawItem(env,safe);assert(weights.length>=3);assert(weights.filter(w=>w===800).length>=3);for(const key of ['x0','x1','y0','y1'])assert(Math.abs(measured[key]-drawn[key])<.001,`${key}: measured=${measured[key]}, drawn=${drawn[key]}`);assert(drawn.x0>=1920*.055-.01&&drawn.x1<=1920*.945+.01&&drawn.y0>=1080*.08-.01&&drawn.y1<=1080*.92+.01);}finally{J.fontCSS=css;}
});
test('native_frames_identical_at_all_four_output_aspects',()=>{
 for(const aspect of ['16:9','9:16','1:1','4:5']){
  const p=J.defaultProject();Object.assign(p,{title:'',artist:'',aspect,res:720,seed:777,autoDirection:true,lyrics:fixed.plan.lines.slice(0,8).map(l=>`[00:${l.start.toFixed(2).padStart(5,'0')}]${l.text}`).join('\n')});
  const audio={...fixed.audio,duration:25,features:{...fixed.audio.features,energy:.7,bpm:150,density:.6,percussive:.7}};
  const d=J.proposeDirection(p,audio,{median:.3,detail:.4,chroma:.7});Object.assign(p,{style:d.style,mood:d.mood,fx:d.fx,enabled:d.enabled,seed:d.seed});p.artDirection=J.makeArtDirection(p,audio,d);
  J.enableSingleBackgroundMode();old.enableSingleBackgroundMode();
  const now=J.plan(JSON.parse(JSON.stringify(p)),audio),before=old.plan(JSON.parse(JSON.stringify(p)),audio);
  equal(now.musicalStructure,before.musicalStructure);equal(now.beatHierarchy,before.beatHierarchy);
  equal(J.resolveExportSettings(p),old.resolveExportSettings(p));
  const r=new J.Renderer(),r0=new old.Renderer();const c=current.createCanvas(320,320),c0=previous.createCanvas(320,320);
  try{for(const t of [.3,3.7,8.5,14.2,22]){const scale=320/now.W;c.height=c0.height=Math.round(now.H*scale);r.frame(c.getContext('2d'),now,t,{scale,production:true});r0.frame(c0.getContext('2d'),before,t,{scale,production:true});assert(Buffer.from(c.getContext('2d').getImageData(0,0,c.width,c.height).data).equals(Buffer.from(c0.getContext('2d').getImageData(0,0,c0.width,c0.height).data)),`${aspect} t=${t}`);}}
  finally{r.disposeAssets();r0.disposeAssets();}
 }
});
test('offline_cues_are_conservative_and_never_modify_project_data',()=>{
 for(const text of ['貫けよ','突き抜けろ！','昇れ','舞い上がれ！','集まれ！','一つになれ'])assert(J.localLyricCue(text));
 for(const text of ['貫けない','貫けよう','昇れない','昇れ！集まれ！','「貫け」と言った','集まれない','光をつなぐ','青黒大阪','突き抜ける'])assert.equal(J.localLyricCue(text),null);
 for(const aspect of ['16:9','9:16','1:1','4:5']){
  const p=J.defaultProject();Object.assign(p,{title:'',artist:'',aspect,res:720,seed:777,autoDirection:true,lyrics:'[00:00.00]貫けよ\n[00:03.00]集まれ！\n[00:06.00]昇れ\n[00:09.00]青黒大阪'});
  const a={...fixed.audio,duration:13,features:{...fixed.audio.features,energy:.7,bpm:150,density:.6,percussive:.7}};
  const d=J.proposeDirection(p,a,{median:.3,detail:.4,chroma:.7});Object.assign(p,{style:d.style,mood:d.mood,fx:d.fx,enabled:d.enabled,seed:d.seed});p.artDirection=J.makeArtDirection(p,a,d);
  const source=JSON.stringify(p),now=J.plan(p,a),before=old.plan(JSON.parse(source),a);assert.equal(JSON.stringify(p),source);equal(now.lines,before.lines);assert(now.lineSemantics.length>0&&now.lineSemantics.length<=3);assert(now.cuts.filter(c=>c.layout==='huge'||c.repetitionRole==='payoff').every(c=>!c.semanticIntent));for(const cut of now.cuts){const b=before.cuts.find(c=>c.line===cut.line&&c.start===cut.start);if(b)for(const key of ['layout','params','cam','camP','kineticGrouped'])equal(cut[key],b[key]);}if(aspect==='1:1')assert(!now.cuts.find(c=>c.line===0).semanticIntent);assert(!now.cuts.find(c=>c.line===3).semanticIntent);equal(J.resolveExportSettings(p),old.resolveExportSettings(p));
  const r=new J.Renderer(),canvas=current.createCanvas(480,Math.round(480*now.H/now.W)),mask=current.createCanvas(canvas.width,canvas.height);
  try{for(const cut of now.cuts.filter(c=>c.semanticIntent)){for(const u of [.2,.5,.8]){const items=[];r.frame(canvas.getContext('2d'),now,cut.start+(cut.end-cut.start)*u,{scale:480/now.W,production:true,lyricAuditCtx:mask.getContext('2d'),lyricAuditItems:items});const bytes=mask.getContext('2d').getImageData(0,0,mask.width,mask.height).data;let ink=0;for(let i=3;i<bytes.length;i+=4)if(bytes[i]>24)ink++;assert(ink>8,`${aspect} line ${cut.line} u=${u}: missing lyric ink`);assert(items.some(it=>it.bounds), 'actual main glyph bounds were not captured');for(const item of items.filter(it=>it.bounds)){const b=item.bounds;assert(b.x0>=now.W*.055-1&&b.x1<=now.W*.945+1&&b.y0>=now.H*.08-1&&b.y1<=now.H*.92+1,`${aspect} line ${cut.line}: `+JSON.stringify(b));}}}}
  finally{r.disposeAssets();}
  p.overrides={0:{layout:'type',cam:'stillCamera'},1:{lock:true}};const manual=J.plan(p,a);assert(!manual.cuts.find(c=>c.line===0).semanticIntent);assert(!manual.cuts.find(c=>c.line===1).semanticIntent);assert.equal(manual.cuts.find(c=>c.line===0).layout,'type');assert.equal(manual.cuts.find(c=>c.line===0).cam,'stillCamera');
  p.directorPlan={lineSemantics:[]};assert(!J.plan(p,a).localLyricDirection);
  p.directorPlan=null;p.autoDirection=false;assert(!J.plan(p,a).localLyricDirection);
 }
});
function median(values){return values.slice().sort((a,b)=>a-b)[Math.floor(values.length/2)];}
function timed(name,oldFn,newFn,repeats=5){oldFn();newFn();const a=[],b=[];for(let i=0;i<repeats;i++){let start=performance.now();oldFn();a.push(performance.now()-start);start=performance.now();newFn();b.push(performance.now()-start);}const beforeMs=median(a),afterMs=median(b);timings.push({name,beforeMs,afterMs,improvementPercent:(1-afterMs/beforeMs)*100,repeats,method:'median; chronological 10-minute, 100 ms timeline; identical output verified',scope:'structure or beat planning only, not full audio decode/MV/export'});}
const long=fixtures(6000);equal(J.analyzeMusicalStructure(long.plan,long.audio,{}),old.analyzeMusicalStructure(long.plan,long.audio,{}));equal(J.buildBeatHierarchy(long.plan,long.audio),old.buildBeatHierarchy(long.plan,long.audio));
timed('musicalStructure',()=>old.analyzeMusicalStructure(long.plan,long.audio,{}),()=>J.analyzeMusicalStructure(long.plan,long.audio,{}));
timed('beatHierarchy',()=>old.buildBeatHierarchy(long.plan,long.audio),()=>J.buildBeatHierarchy(long.plan,long.audio));
const report={baseline,results,timings,limitations:['CPU benchmark uses synthetic features, not audio decoding.','Native Canvas frames do not validate browser variable-font rendering or perceptual singing alignment.']};
fs.writeFileSync(path.join(__dirname,'kamen-quality-results.json'),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(timings,null,2));
