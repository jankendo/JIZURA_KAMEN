/* Acoustic Trajectory v6. Reuses measured FFT timelines and v5 optimization.
   No genre modes, recipes, random assignment, additional FFT or pixel caches. */
(()=>{'use strict';
const J=window.J,C=J.clamp,F=Number.isFinite,copy=J.clonePhotoRenderPlan;
const active=p=>(p?.songNativeDirection||p?.artDirection?.songNativeDirection)?.version===6;
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const features=['energy','onset','brightness','bass','high','spectralFlux'];
const bounds={x:[.26,.74],y:[.25,.75],width:[.48,.86],height:[.24,.52],track:[0,.1],lead:[1,1.5],cameraX:[.12,.88],cameraY:[.12,.88],zoom:[1,1.25],layerX:[-.1,.1],layerY:[-.1,.1],alpha:[0,.2],contrast:[0,1],motion:[0,1],groupSpread:[.14,.48],groupAxis:[0,1],split:[.2,.8],regionMix:[0,.48],regionAxis:[0,1],cropRatio:[.45,1]};
const distance=(a,b)=>Math.sqrt(mean(a.map((x,i)=>(x-b[i])**2)));
const abort=signal=>{if(signal?.aborted)throw new DOMException('Aborted','AbortError');};
const interpolate=(knots,t)=>{
 let lo=0,hi=knots.length-1;while(lo+1<hi){const m=(lo+hi)>>1;if(knots[m].time<=t)lo=m;else hi=m;}
 const a=knots[lo],b=knots[hi],u=C((t-a.time)/Math.max(1e-9,b.time-a.time)),e=u*u*(3-2*u);
 return Object.fromEntries(Object.keys(a.state).map(k=>[k,k==='groupCount'||k==='regionCount'?a.state[k]:J.lerp(a.state[k],b.state[k],e)]));
};
// At most 768 aggregate rows; missing channels remain missing. A constant measured
// channel is valid evidence of a hold, not an invented varying feature.
const timeline=(a,duration)=>{
 const raw=(a?.features?.detailedTimeline?.length?a.features.detailedTimeline:a?.features?.timeline)||[];
 const source=raw.filter(r=>F(r.time)&&r.time>=0&&r.time<duration).sort((a,b)=>a.time-b.time),stride=Math.max(1,Math.ceil(source.length/768)),rows=[];
 for(let i=0;i<source.length;i+=stride){const chunk=source.slice(i,i+stride),values=[...features.map(k=>chunk.map(r=>r[k])),...Array.from({length:6},(_,k)=>chunk.map(r=>r.logBands?.[k]))].map(v=>v.filter(F));rows.push({time:mean(chunk.map(r=>r.time)),values:values.map(v=>v.length?mean(v):null)});}
 const ranges=Array.from({length:12},(_,k)=>{const v=rows.map(r=>r.values[k]).filter(F);return v.length?[Math.min(...v),Math.max(...v)]:null;});
 const dims=ranges.map((r,k)=>r&&rows.filter(x=>F(x.values[k])).length>=rows.length*.5?k:-1).filter(k=>k>=0);
 for(const r of rows)r.vector=r.values.map((v,k)=>F(v)&&ranges[k]&&ranges[k][1]-ranges[k][0]>1e-6?C((v-ranges[k][0])/(ranges[k][1]-ranges[k][0])):0);
 for(let i=0;i<rows.length;i++){const a=rows[Math.max(0,i-1)],b=rows[Math.min(rows.length-1,i+1)];rows[i].importance=dims.length?Math.sqrt(mean(dims.map(k=>(b.vector[k]-a.vector[k])**2))):0;}
 return {rows,dims,status:rows.length>=3&&dims.length>=2?'MEASURED':'UNMEASURED',channels:ranges.map(r=>r?'MEASURED':'UNMEASURED')};
};
// Small monotone DTW on actual within-section sequences, rather than averages.
const align=(rows,a,b)=>{
 const sample=s=>{const r=rows.filter(r=>r.time>=s.start&&r.time<s.end),step=Math.max(1,Math.ceil(r.length/24));return r.filter((_,i)=>i%step===0);},x=sample(a),y=sample(b);
 if(x.length<2||y.length<2)return [];
 const costs=Array.from({length:x.length},()=>Array(y.length).fill(Infinity)),prev=costs.map(r=>r.map(()=>null));
 for(let i=0;i<x.length;i++)for(let j=0;j<y.length;j++){let best=i||j?Infinity:0,point=null;for(const [u,v] of [[i-1,j-1],[i-1,j],[i,j-1]])if(u>=0&&v>=0&&costs[u][v]<best){best=costs[u][v];point=[u,v];}costs[i][j]=best+distance(x[i].vector,y[j].vector);prev[i][j]=point;}
 const path=[];let point=[x.length-1,y.length-1];while(point){const [i,j]=point;path.push({from:x[i].time,to:y[j].time,distance:distance(x[i].vector,y[j].vector)});point=prev[i][j];}return path.reverse();
};
J.buildSongAcousticTrajectoryV6=(p,a,options={})=>{
 const d=J.buildSongVisualGrammarV5(p,a,options),data=timeline(a,d.duration),rows=data.rows;
 d.version=6;d.algorithm='SONG_NATIVE_ACOUSTIC_TRAJECTORY_V6';d.rendererCompatibilityId='kamen-song-grammar-renderer-6';d.schemaVersion=6;
 const importance=rows.map(r=>r.importance),avg=mean(importance),threshold=Math.max(.025,avg+Math.sqrt(mean(importance.map(x=>(x-avg)**2)))*.5);
 const knots=[],add=(time,state,reason,importance=0)=>{const old=knots.find(k=>Math.abs(k.time-time)<1e-6);if(old){if(reason==='section-anchor'||reason==='quiet-hold')Object.assign(old,{state:{...state},reason,importance});}else knots.push({time,state:{...state},reason,importance});};
 for(const s of d.sections){
  abort(options.signal);const local=rows.filter(r=>r.time>=s.start&&r.time<s.end),v=d.structure.sections[d.sections.indexOf(s)].vector;
  const lyrics=d.lyrics.filter(l=>l.start<s.end&&l.end>s.start),length=mean(lyrics.map(l=>l.length)),display=mean(lyrics.map(l=>l.end-l.start));
  const image=p.autoPalette?.localMap?J.sampleLocalLuma(p.autoPalette.localMap,s.state.x,s.state.y,2,2):null;
  s.state.groupCount=Math.min(6,Math.max(1,Math.ceil(length/Math.max(8,12+display*1.5-(image?.detail||0)*4))));
  s.state.regionCount=s.quietIntent||!p.customBg?.enabled?1:Math.min(4,1+Math.floor(s.state.regionMix*6*(1-(image?.detail||0)*.7)));
  s.compositionEvidence={imageDetail:image?.detail??null,imageAspect:p.autoPalette?.stats?.aspect??null,lyricLength:length,displayDuration:display,semanticRecognition:'UNMEASURED'};
  if(s.quietIntent&&knots.length)s.state={...knots.at(-1).state,motion:0};
  const previousState=knots.at(-1)?.state,settled=s.start+(previousState&&!s.quietIntent?Math.min(s.transition.duration||0,(s.end-s.start)*.25):0);
  add(s.start,previousState||s.state,s.quietIntent?'quiet-hold':'section-anchor');
  if(settled>s.start)add(settled,s.state,'boundary-settled');
  if(!s.quietIntent&&data.status==='MEASURED')for(let i=1;i<local.length-1;i++){
   const r=local[i];if(r.time<=settled||r.importance<threshold||r.importance<local[i-1].importance||r.importance<=local[i+1].importance)continue;
   const delta=r.vector.map((x,k)=>x-v[k]),state={...s.state};
   // Signed spectral deviation determines space; novelty only controls adoption.
   const changes={x:(delta[2]-delta[3])*.18+(delta[6]-delta[11])*.08,y:(delta[5]-delta[0])*.14,width:delta[2]*.1,height:delta[0]*.06,cameraX:(delta[3]-delta[2])*.13,cameraY:(delta[0]-delta[5])*.1,zoom:(delta[1]+delta[5])*.07,groupSpread:(delta[1]-delta[0])*.08,groupAxis:(delta[3]-delta[2])*.2,split:(delta[2]-delta[3])*.15,regionMix:delta[5]*.15,regionAxis:(delta[6]-delta[11])*.2,cropRatio:-delta[5]*.14,layerX:delta[2]*.025,layerY:delta[3]*.025};
   for(const [k,value] of Object.entries(changes))state[k]=C(state[k]+value,...bounds[k]);
   add(Math.max(settled,(local[i-1].time+r.time)/2),knots.at(-1).state,'pre-change-hold');add(r.time,state,'measured-local-change',r.importance);
  }
  // Holds and sustained tones do not receive periodic synthetic motion.
  const last=knots.at(-1);add(s.end,last.state,s.quietIntent?'quiet-hold':'sustained-state');
 }
 knots.sort((a,b)=>a.time-b.time);
 for(const s of d.sections.filter(s=>s.quietIntent))for(const k of knots.filter(k=>k.time>=s.start&&k.time<=s.end))k.state={...s.state};
 const correspondences=[];
 for(const rel of d.structure.relations){abort(options.signal);const path=align(rows,d.sections[rel.from],d.sections[rel.to]);correspondences.push({...rel,status:path.length?'MEASURED':'UNMEASURED',path});
  for(const k of knots.filter(k=>k.reason==='measured-local-change'&&k.time>=d.sections[rel.to].start&&k.time<d.sections[rel.to].end)){
   const match=path.reduce((best,x)=>!best||Math.abs(x.to-k.time)<Math.abs(best.to-k.time)?x:best,null);if(!match)continue;
   const reference=interpolate(knots,match.from),weight=C((1-match.distance)*rel.similarity*.35);
   for(const key of Object.keys(bounds))k.state[key]=J.lerp(k.state[key],reference[key],weight);
  }
 }
 d.trajectory={version:6,status:data.status,channels:data.channels,threshold,interpolation:'C1_SMOOTHSTEP_ZERO_ENDPOINT_VELOCITY',knots,correspondences,source:'existing spectral timeline; no second FFT'};
 d.grammar={...d.grammar,contractVersion:'KAMEN_ACOUSTIC_TRAJECTORY_V6',groupLimit:6,regionLimit:4};return d;
};
J.buildSongVisualGrammarV6=J.buildSongAcousticTrajectoryV6;
const valid=J.validSongNativeDirection;
const asV5=d=>({...copy(d),version:5,algorithm:'SONG_GENERATED_VISUAL_GRAMMAR_V5',rendererCompatibilityId:'kamen-song-grammar-renderer-5',sections:d.sections.map(s=>({...copy(s),state:{...s.state,groupCount:Math.min(3,s.state.groupCount)}}))});
J.validSongNativeDirection=d=>d?.version!==6?valid(d):!!(d.schemaVersion===6&&d.algorithm==='SONG_NATIVE_ACOUSTIC_TRAJECTORY_V6'&&d.rendererCompatibilityId==='kamen-song-grammar-renderer-6'&&Array.isArray(d.sections)&&d.sections.length>0&&valid(asV5(d))&&['MEASURED','UNMEASURED'].includes(d.trajectory?.status)&&Array.isArray(d.trajectory?.knots)&&d.trajectory.knots.length>=2&&d.trajectory.knots.length<=1922&&d.trajectory.knots[0].time===0&&d.trajectory.knots.at(-1).time===d.duration&&Array.isArray(d.trajectory.correspondences)&&d.trajectory.correspondences.length<=192&&d.trajectory.correspondences.every(r=>Array.isArray(r.path)&&r.path.length<=47&&r.path.every(x=>F(x.from)&&F(x.to)&&F(x.distance)&&x.distance>=0&&x.distance<=1))&&d.trajectory.knots.every((k,i)=>F(k.time)&&(!i||k.time>d.trajectory.knots[i-1].time)&&Object.entries(bounds).every(([key,[lo,hi]])=>F(k.state?.[key])&&k.state[key]>=lo&&k.state[key]<=hi)&&Number.isInteger(k.state.groupCount)&&k.state.groupCount>=1&&k.state.groupCount<=6&&Number.isInteger(k.state.regionCount)&&k.state.regionCount>=1&&k.state.regionCount<=4));
const build=J.buildSongNativeDirection;J.buildSongNativeDirection=(p,a)=>active(p)?J.buildSongVisualGrammarV6(p,a):build(p,a);
J.generateSongVisualGrammarV6=async(p,a,options={})=>{
 const identity=J.songNativeInputIdentity(p,a),d=J.buildSongVisualGrammarV6(p,a,options);await new Promise(r=>setTimeout(r,0));abort(options.signal);if(identity!==J.songNativeInputIdentity(p,a))throw Error('INPUT_CHANGED_DURING_GRAMMAR');
 const proposal={songNativeDirector:6,style:p.style,mood:p.mood,fx:{...p.fx,hud:'off'},enabled:copy(p.enabled),seed:p.seed,overrides:copy(p.overrides||{}),summary:'音響の時間構造から生成した映像軌道 v6',signals:{image:!!p.autoPalette?.analyzed,audio:true,lyricLines:J.parseLyrics(p.lyrics).lines.length},debug:{confidence:null},grammarDirection:d};const candidate={proposal};return {recommended:candidate,candidates:[candidate]};
};
const make=J.makeArtDirection;J.makeArtDirection=(p,a,pr)=>{
 if(pr.songNativeDirector!==6&&!active(p))return make(p,a,pr);
 const d=pr.grammarDirection?.version===6&&J.validSongNativeDirection(pr.grammarDirection)&&pr.grammarDirection.sourceIdentity===J.songNativeInputIdentity(p,a)?copy(pr.grammarDirection):J.buildSongVisualGrammarV6(p,a);
 const art=make(p,a,{...pr,songNativeDirector:5,grammarDirection:asV5(d)});art.songNativeDirection=d;art.vocabulary.layout=art.layoutLanguage=['songGrammarV6'];return art;
};
const plan=J.plan;J.plan=(p,a)=>{
 if(!active(p))return plan(p,a);const identity=J.songNativeInputIdentity(p,a),saved=p.artDirection.songNativeDirection,d=saved.sourceIdentity===identity&&J.validSongNativeDirection(saved)?copy(saved):J.buildSongVisualGrammarV6(p,a);
 const adapter=copy(p);adapter.artDirection.songNativeDirection=asV5(d);delete adapter.artDirection.songNativeResolved;
 const result=plan(adapter,a);result.songNativeDirection=d;result.artDirection={...result.artDirection,...copy(p.artDirection),songNativeDirection:d};result.songNativePlanInputIdentity=identity;
 for(const c of result.cuts)if(c.layout==='songGrammarV5')c.layout='songGrammarV6';return J.restoreSongNativeResolved(p,a,result);
};
const state=J.songGrammarStateAt;J.songGrammarStateAt=(p,t)=>active(p)?interpolate(p.songNativeDirection.trajectory.knots,t):state(p,t);
J.songBackgroundRegionsV6=(p,s,image)=>{
 const n=s.regionCount;if(n<=1)return [];const weights=Array.from({length:n},(_,i)=>1+(s.split-.5)*(i/(n-1)-.5)),total=weights.reduce((a,b)=>a+b,0),sourceAspect=image?.width/image?.height,axis=C(s.regionAxis*.8+(F(sourceAspect)?C(.5+(sourceAspect-p.W/p.H)*.2):s.regionAxis)*.2);let cursor=0;
 return weights.map(v=>{const size=v/total,rect=[cursor*p.W*(1-axis),cursor*p.H*axis,p.W*(axis+(1-axis)*size),p.H*((1-axis)+axis*size)];cursor+=size;return rect;});
};
J.songGrammarV6Groups=(text,s,p)=>{const maxGroups=Math.max(1,Math.min(6,Math.floor(s.groupSpread/(.038*1.55))));return J.songGrammarV5Groups(text,{...s,groupCount:Math.min(s.groupCount,maxGroups)});};
J.LAYOUTS.songGrammarV6={name:'Acoustic trajectory glyph groups',plan:()=>({}),render:env=>{
 const {plan:p,cut:c,W,H,ctx}=env,s=J.songGrammarStateAt(p,env.t);if(!s)return null;
 // Width and minimum readable height constrain groups per actual output aspect.
 const text=c.lineText||c.text,font=c.params.font,minSize=H*.038;
 const groups=J.songGrammarV6Groups(text,s,p),axis=s.groupAxis;
 for(let i=0;i<groups.length;i++){
  const phase=groups.length===1?0:i/(groups.length-1)-.5,span=s.groupSpread;
  const width=W*Math.min(.86,s.width+axis*.12),height=groups.length>1?Math.min(H*s.height,H*span/(groups.length-1)*.85):H*s.height;
  const rows=J.semanticLyricLayout(groups[i],{font,size:H*.14,minSize,maxWidth:width,maxHeight:height,lead:s.lead,track:s.track,ctx});
  const item={text:rows?.text??groups[i],font,size:Math.max(minSize,Math.min(H*.16,rows?.size??J.fitSize(groups[i],font,width,height,{lead:s.lead,track:s.track}))),x:(s.x+phase*span*(1-axis)*.35)*W,y:(s.y+phase*span)*H,lead:s.lead,track:s.track,color:env.sc.fg,noHold:true};
  J.mainDraw(env,J.safeLyricItem(env,item));
 }
}};
// Greedy coverage gain balances measurement families and temporal separation.
// Endpoints/first lyric are reserved; remaining choices maximize uncovered tasks.
J.selectSongGrammarObservationTimesV6=(p,range)=>{
 const from=range?.start??0,to=range?.end??p.duration,last=to-Math.min(1/(p.fps||30),(to-from)/10),candidates=new Map(),chosen=[];
 const add=(t,task,weight=1,reserved=false)=>{if(!F(t)||t<from||t>last)return;const time=Math.round(t*100000)/100000,key=time.toFixed(5),r=candidates.get(key)||{time,tasks:new Map(),reserved:false};r.tasks.set(task,Math.max(weight,r.tasks.get(task)||0));r.reserved||=reserved;candidates.set(key,r);};
 for(const t of [from,from+Math.min(.04,(to-from)/8),last,Math.max(from,last-.2),Math.max(from,last-.5),Math.min(last,from+3)])add(t,'endpoint',10,true);
 const first=p.lines.find(l=>l.end>from&&l.start<to);
 if(first)for(const t of [first.start-.04,Math.max(from,first.start)+.04,Math.max(from,first.start)+.18])add(t,'first-lyric',9,true);
 for(const k of p.songNativeDirection.trajectory.knots){if(k.time<from||k.time>=to)continue;const weight=3+k.importance*6;for(const t of [k.time-.04,k.time,k.time+.04])add(t,'acoustic',weight);}
 for(const s of p.songNativeDirection.sections){if(s.end<=from||s.start>=to)continue;if(s.quietIntent)for(const u of [.25,.75])add(s.start+(s.end-s.start)*u,'quiet',7);add((s.start+s.end)/2,'interior',2);}
 for(const r of p.songNativeDirection.trajectory.correspondences)for(const match of r.path.filter((_,i,a)=>i===0||i===Math.floor(a.length/2)||i===a.length-1)){add(match.from,'repeat',5);add(match.to,'repeat',5);}
 for(const l of p.lines){add(l.start+.04,'lyrics',3);add(l.end-.04,'lyrics',2);}
 for(let i=1;i<16;i++)add(from+(to-from)*i/16,'coverage',2);
 const counts=new Map();const take=r=>{chosen.push(r.time);candidates.delete(r.time.toFixed(5));for(const task of r.tasks.keys())counts.set(task,(counts.get(task)||0)+1);};
 for(const r of [...candidates.values()].filter(r=>r.reserved))take(r);
 while(chosen.length<64&&candidates.size){let best=null,score=-1;for(const r of candidates.values()){
  const gap=chosen.length?Math.min(...chosen.map(t=>Math.abs(t-r.time))):to-from;
  const gain=[...r.tasks].reduce((s,[task,w])=>s+w/Math.sqrt(1+(counts.get(task)||0)),0)*(1+Math.min(1,gap/Math.max(.04,(to-from)/64)));
  if(gain>score){score=gain;best=r;}
 }take(best);}
 return chosen.sort((a,b)=>a-b);
};
J.refineSongGrammarQualityV6=(p,rows,pairs,metrics,range)=>{
 const from=range?.start??0,to=range?.end??p.duration,measured=(scores,evidence,source='actual separated Canvas channels')=>({status:scores.length?'MEASURED':'UNMEASURED',score:scores.length?Math.round(100*C(mean(scores))):null,evidence,source,contractVersion:'kamen-song-grammar-quality-6'});
 const fit=(actual,expected)=>expected>.0001?C(actual/expected)*C(1-Math.max(0,actual-expected)/Math.max(.025,expected)):C(1-actual/.025);
 const line=t=>p.lines.find(l=>l.start<=t&&l.end>t),state=J.songGrammarStateAt;
 const comparisons=pairs.map(r=>{
  const a=rows.find(x=>x.time===r.from),b=rows.find(x=>x.time===r.to),x=state(p,r.from),y=state(p,r.to),sameLine=line(r.from)?.index===line(r.to)?.index;
  const foregroundExpected=Math.hypot(x.x-y.x,x.y-y.y)+Math.abs(x.width-y.width)*.5+Math.abs(x.groupSpread-y.groupSpread);
  const backgroundExpected=(Math.hypot(x.cameraX-y.cameraX,x.cameraY-y.cameraY)+Math.abs(x.zoom-y.zoom)+Math.abs(x.regionMix-y.regionMix)+Math.abs(x.split-y.split)+Math.abs(x.cropRatio-y.cropRatio))*.15;
  // Lyric appearance/disappearance is tested as occupancy, not camera motion.
  const occupancy=[a,b].every(f=>!!line(f.time)===(f.features.area>0));
  const foregroundActual=sameLine?r.actual:0;
  const actual=foregroundActual+(r.background??0),target=(sameLine?foregroundExpected:0)+backgroundExpected;
  const covered=(!p.customBg?.enabled||F(r.background))&&a.features.foregroundSource==='raster-mask'&&b.features.foregroundSource==='raster-mask';
  return {...r,actual,target,foregroundActual,foregroundExpected,backgroundExpected,occupancy,sameLine,covered,score:fit(actual,target)*Number(occupancy)};
 });
 const acoustic=p.songNativeDirection.trajectory.status==='MEASURED',available=comparisons.filter(r=>r.covered);
 metrics.world=measured(acoustic?available.map(r=>r.score):[],comparisons);
 metrics.realization=metrics.world;
 const novel=available.filter(r=>r.sameLine);metrics.perceptualNovelty=measured(novel.map(r=>C(r.actual/.15)),novel,'observed visual distance; independent of plan realization');
 metrics.backgroundNovelty=p.customBg?.enabled?measured(available.map(r=>C(r.background/.08)),available,'source-image Canvas pixels'): {status:'NOT_APPLICABLE',score:null,evidence:[]};
 const openingEnd=Math.min(to,from+3),opening=available.filter(r=>r.from>=from&&r.to<=openingEnd+.001),openingCovered=rows.some(r=>r.time<=from+.06)&&rows.some(r=>r.time>=openingEnd-Math.min(.1,(to-from)/4)&&r.time<=openingEnd);
 metrics.opening=measured(acoustic&&openingCovered?opening.map(r=>r.score):[],[{coverage:openingCovered,firstLyricStart:line(from)?.start??p.lines.find(l=>l.start>=from)?.start??null,intervals:opening,classification:acoustic?'input-conditioned movement or observed hold':'acoustic evidence unavailable'}]);
 const ending=available.filter(r=>r.from>=to-.6),covered=rows.some(r=>r.time>=to-.06)&&ending.some(r=>r.to-r.from>=Math.min(.15,(to-from)/4)),lastLine=p.lines.filter(l=>l.start<to&&l.end>from).at(-1),truncated=!!lastLine&&lastLine.end>to+.05;
 metrics.ending=measured(acoustic&&covered?ending.map(r=>truncated?0:r.score):[],[{coverage:covered,lastFrame:rows.at(-1)?.time??null,lastLyricEnd:lastLine?.end??null,audioEnd:p.songNativeDirection.duration,lyricTruncated:truncated,observedProgression:ending,classification:covered?'observed input-conditioned closure':'insufficient endpoint coverage',encodedAudioClosure:'UNMEASURED'}]);
 const events=p.songNativeDirection.trajectory.knots.filter(k=>k.reason==='measured-local-change'&&k.time>from&&k.time<to),timing=[];
 for(const event of events){const index=p.songNativeDirection.trajectory.knots.indexOf(event),start=p.songNativeDirection.trajectory.knots[index-1].time,local=available.filter(r=>r.from<=event.time+.04&&r.to>=start-.04&&r.duration<=Math.max(.55,event.time-start+.1));const covered=local.some(r=>r.from<=start+.001)&&local.some(r=>r.to>=event.time-.001);timing.push({start,end:event.time,covered,intervals:local,score:local.length?mean(local.map(r=>r.score)):null});}
 metrics.temporal=measured(acoustic?timing.filter(r=>r.covered).map(r=>r.score):[],timing);
 if(acoustic&&!events.length)metrics.temporal=measured(available.map(r=>r.score),available,'measured acoustic hold and Canvas correspondence');
 const repeats=[];for(const relation of p.songNativeDirection.trajectory.correspondences)for(const match of relation.path){const a=rows.find(r=>Math.abs(r.time-match.from)<=.08),b=rows.find(r=>Math.abs(r.time-match.to)<=.08);if(a&&b){const actual=Math.hypot(a.features.center[0]-b.features.center[0],a.features.center[1]-b.features.center[1]);repeats.push({from:a.time,to:b.time,acousticDistance:match.distance,observedGeometryDistance:actual,score:C(1-Math.abs(actual-match.distance*.2))});}}
 metrics.repetition=p.songNativeDirection.structure.relations.length?measured(repeats.map(r=>r.score),repeats):{status:'NOT_APPLICABLE',score:null,evidence:[]};
 metrics.background=p.customBg?.enabled?measured(acoustic?available.map(r=>fit(r.background,r.backgroundExpected)):[],available):{status:'NOT_APPLICABLE',score:null,evidence:[]};
 const quiet=available.filter(r=>r.quiet&&r.sectionFrom===r.sectionTo&&r.sameLine);if(p.songNativeDirection.sections.some(s=>s.quietIntent&&s.end>from&&s.start<to))metrics.stillness=measured(quiet.map(r=>C(1-r.actual/.025)),quiet);
 const moving=available.filter(r=>!r.quiet&&r.target>.001&&r.duration<=.55);if(p.songNativeDirection.sections.some(s=>s.quietIntent&&s.end>from&&s.start<to))metrics.temporalContrast=measured(quiet.length&&moving.length?[fit(Math.max(0,mean(moving.map(r=>r.actual))-mean(quiet.map(r=>r.actual))),mean(moving.map(r=>r.target)))]:[],[{moving,quiet}]);
 metrics.continuity=measured(available.filter(r=>r.duration<=.55).map(r=>C(1-Math.max(0,r.actual-r.target)/.3)),available.filter(r=>r.duration<=.55));
 metrics.density=measured(acoustic?available.filter(r=>r.duration<=.55).map(r=>C(1-Math.abs(r.actual-r.target)/Math.max(.025,r.target))):[],available.filter(r=>r.duration<=.55));
 return {contractVersion:'kamen-song-grammar-quality-6',comparisons};
};

J.measureSongGrammarV6=J.measureSongGrammarV5;J.collectSongGrammarEvidenceV6=J.collectSongGrammarEvidenceV5;
})();
