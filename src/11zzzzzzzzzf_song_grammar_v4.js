/* Song-Generated Visual Grammar v4. Bounded recurrence analysis and continuous
   constrained composition; legacy direction is used only by legacy projects. */
(()=>{
'use strict';
const J=window.J,C=J.clamp,F=Number.isFinite,clone=J.clonePhotoRenderPlan;
const avg=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const variance=a=>avg(a.map(x=>(x-avg(a))**2));
const active=p=>p?.songNativeDirection?.version===4||p?.artDirection?.songNativeDirection?.version===4;
const locked=(p,c)=>!!(p.songNativeManualPlan||c.locked||Object.keys(p.directionOverrides7?.[c.line]||{}).length||p.directorLyricDirectives7?.some(d=>d.line===c.line)||c.assetScene?.locked||p.directorSections7?.some(s=>c.start>=s.from&&c.start<s.to&&(s.typographyIntent||s.motionIntent)));
const abort=s=>{if(s?.aborted)throw new DOMException('Aborted','AbortError');};
const keys=['energy','onset','brightness','bass','high','spectralFlux',...Array.from({length:6},(_,i)=>'band'+i)];
const dist=(a,b)=>Math.sqrt(avg(a.map((v,i)=>(v-b[i])**2)));
const smooth=u=>{u=C(u);return u*u*(3-2*u);};
const unitKeys=['motionIntensity','visualDensity','cameraTravel','negativeSpace','typographyScale','contrastIntent','transitionIntensity'];
// No PCM copies, second FFT, persisted matrix or unbounded timeline. 192^2
// scalar comparisons is the maximum, independent of song length.
J.analyzeSongRecurrenceV4=(audio,duration,{signal}={})=>{
 abort(signal);
 const raw=(audio?.features?.detailedTimeline?.length?audio.features.detailedTimeline:audio?.features?.timeline)||[];
 const n=Math.max(1,Math.min(192,Math.ceil(duration/.5))),step=duration/n;
 const bins=Array.from({length:n},(_,i)=>({time:i*step,end:(i+1)*step,sums:Array(12).fill(0),counts:Array(12).fill(0),count:0}));
 const add=(b,k,v)=>{if(F(v)){b.sums[k]+=v;b.counts[k]++;}};
 for(const row of raw){if(!F(row.time)||row.time<0||row.time>=duration)continue;const b=bins[Math.min(n-1,Math.floor(row.time/step))];
  for(let k=0;k<6;k++)add(b,k,row[keys[k]]);for(let k=0;k<6;k++)add(b,k+6,row.logBands?.[k]);b.count++;
 }
 const rate=audio?.energyRate||audio?.energy?.length/Math.max(.01,audio?.duration||duration);
 // Envelope and RMS remain measured separately from spectral colour.
 for(let i=0;i<(audio?.energy?.length||0);i++){const t=i/rate;if(t>=duration)break;const b=bins[Math.min(n-1,Math.floor(t/step))];
  if(F(audio.energy[i])){b.envelopeSum=(b.envelopeSum||0)+audio.energy[i];b.envelopeCount=(b.envelopeCount||0)+1;}
  if(F(audio.onset?.[i])){b.onsetSum=(b.onsetSum||0)+audio.onset[i];b.onsetCount=(b.onsetCount||0)+1;}
  if(F(audio.rms?.[i])){b.rmsSum=(b.rmsSum||0)+audio.rms[i];b.rmsCount=(b.rmsCount||0)+1;}
 }
 for(const b of bins){if(!b.counts[0]&&b.envelopeCount)add(b,0,b.envelopeSum/b.envelopeCount);if(!b.counts[1]&&b.onsetCount)add(b,1,b.onsetSum/b.onsetCount);}
 const measured=keys.map((_,k)=>bins.some(b=>b.counts[k]>0));
 const values=bins.map(b=>b.sums.map((s,k)=>b.counts[k]?s/b.counts[k]:null));
 const ranges=keys.map((_,k)=>{const a=values.map(v=>v[k]).filter(F);return a.length?[Math.min(...a),Math.max(...a)]:[0,0];});
 const varying=measured.map((v,k)=>v&&ranges[k][1]-ranges[k][0]>1e-6);
 const frames=bins.map((b,i)=>({time:b.time,end:b.end,energy:values[i][0],silence:b.rmsCount?b.rmsSum/b.rmsCount<.001:values[i][0]===0,
  vector:values[i].map((v,k)=>varying[k]&&F(v)?C((v-ranges[k][0])/(ranges[k][1]-ranges[k][0])):0)}));
 const coverage=keys.map((_,k)=>bins.filter(b=>b.counts[k]>0).length/n);
 const dims=varying.map((v,k)=>v&&coverage[k]>=.5?k:-1).filter(k=>k>=0);
 const distance=(a,b)=>dims.length?Math.sqrt(avg(dims.map(k=>(a.vector[k]-b.vector[k])**2))):0;
 const matrix=new Float32Array(n*n);
 for(let i=0;i<n;i++){abort(signal);for(let j=0;j<=i;j++){const d=frames[i].silence!==frames[j].silence?1:distance(frames[i],frames[j]);matrix[i*n+j]=matrix[j*n+i]=1-d;}}
 const novelty=frames.map((_,i)=>{const radius=Math.max(1,Math.min(3,Math.floor(1.5/step))),left=frames.slice(Math.max(0,i-radius),i),right=frames.slice(i,Math.min(n,i+radius));return i&&left.length&&right.length?avg(left.flatMap(a=>right.map(b=>distance(a,b)))):0;});
 const threshold=avg(novelty)+Math.sqrt(variance(novelty))*.55;
 const boundaries=[0];
 for(let i=1;i<n;i++){const rest=frames[i].silence!==frames[i-1].silence,peak=novelty[i]>Math.max(.035,threshold)&&novelty[i]>=novelty[i-1]&&novelty[i]>= (novelty[i+1]??0);
  if((rest||peak)&&frames[i].time-boundaries.at(-1)>=Math.max(step,1)&&duration-frames[i].time>=step*.5)boundaries.push(frames[i].time);
 }
 boundaries.push(duration);
 const sections=boundaries.slice(0,-1).map((start,id)=>{const end=boundaries[id+1],rows=frames.filter(f=>f.time>=start&&f.time<end),indices=rows.map(f=>frames.indexOf(f));
  return {id,start,end,vector:keys.map((_,k)=>avg(rows.map(f=>f.vector[k]))),energy:rows.some(f=>F(f.energy))?avg(rows.map(f=>f.energy).filter(F)):null,silence:rows.every(f=>f.silence),boundaryConfidence:id?C(novelty[indices[0]]/Math.max(.001,threshold*2)):1,indices};
 });
 const relations=[];
 for(let i=0;i<sections.length;i++){
  const a=sections[i];let best=null;
  for(let j=0;j<i-1;j++){const b=sections[j];
   // Compare sequence phase as well as the section average. Different order
   // with the same histogram must not collapse to identical musical structure.
   const seq=avg(Array.from({length:4},(_,k)=>{const x=a.indices[Math.min(a.indices.length-1,Math.floor(k*a.indices.length/4))],y=b.indices[Math.min(b.indices.length-1,Math.floor(k*b.indices.length/4))];return 1-matrix[x*n+y];}));
   const difference=dist(a.vector,b.vector)*.5+seq*.5;
   if(difference<.24&&(!best||difference<best.distance))best={from:j,to:i,distance:difference,similarity:1-difference};
  }
  if(best)relations.push(best);

 }
 sections.forEach(s=>delete s.indices);
 return {method:'BOUNDED_NORMALIZED_SSM_V4',status:measured.some(Boolean)?'INFERRED':'UNMEASURED',resolution:step,sampleCount:n,features:Object.fromEntries(keys.map((k,i)=>[k,measured[i]?'MEASURED':'UNMEASURED'])),featureCoverage:Object.fromEntries(keys.map((k,i)=>[k,coverage[i]])),sections,relations,novelty:novelty.map((value,i)=>({time:frames[i].time,value})),limitations:'Acoustic recurrence, not formal verse/chorus or semantic recognition'};
};
// Layout objective is continuous. Local edge density is measured, never called
// a face, subject or depth map. Gradients refine positions within readable bounds.
const composition=(project,target,previous,repeat,density)=>{
 const map=project.autoPalette?.localMap,stats=project.autoPalette?.stats||{};
 const energy=target[0],onset=target[1],brightness=target[2],bass=target[3],flux=target[5],spectralAxis=avg(target.slice(6).map((v,i)=>v*(i-2.5)))/2.5;
 const desired={x:.5+(brightness-bass)*.40+(onset-flux)*.14+spectralAxis*.18,y:.5+(flux-energy)*.30-spectralAxis*.12,
  width:.58+(1-density)*.22+(brightness-.5)*.13,height:.24+density*.24,track:.005+onset*.05,lead:1.12+flux*.24,
  cameraX:.5+(bass-brightness)*.24,cameraY:.5+(energy-flux)*.16,zoom:1.02+Math.abs(energy-bass)*.20,layerX:(brightness-onset)*.08,layerY:(bass-flux)*.06,alpha:.02+flux*.08,contrast:C(.5+(1-(stats.contrast??.5))*.3),motion:C(Math.sqrt(variance(target))*.8+onset*.2)};
 const weight=repeat?.similarity??0;
 if(repeat)for(const k of ['x','y','width','height','track','lead','cameraX','cameraY','zoom','layerX','layerY','alpha'])desired[k]=desired[k]*(1-weight*.58)+repeat.state[k]*weight*.58;
 let x=desired.x,y=desired.y;
 const cost=(a,b)=>{const local=map?J.sampleLocalLuma(map,a,b,2,2):{detail:0};return (a-desired.x)**2+(b-desired.y)**2+(previous? .22*((a-previous.x)**2+(b-previous.y)**2):0)+(local.detail||0)*.055;};
 for(let i=0;i<10;i++){const h=.008,dx=(cost(x+h,y)-cost(x-h,y))/(2*h),dy=(cost(x,y+h)-cost(x,y-h))/(2*h);x=C(x-dx*.12,.26,.74);y=C(y-dy*.12,.24,.76);}
 return {...desired,x,y,width:C(desired.width,.48,.86),height:C(desired.height,.24,.52)};
};
const acousticIdentity=audio=>{const str=J.canonicalJSON({key:J.registrySelectionAudioKey(audio),energy:Array.from(audio?.energy||[]),onset:Array.from(audio?.onset||[]),rms:Array.from(audio?.rms||[]),rate:audio?.energyRate});let h=2166136261;for(let i=0;i<str.length;i++)h=Math.imul(h^str.charCodeAt(i),16777619)>>>0;return str.length+':'+h;};
const regularize=(d,amount)=>{for(let i=1;i<d.sections.length;i++)for(const k of ['x','y','cameraX','cameraY','width'])d.sections[i].state[k]=J.lerp(d.sections[i].state[k],d.sections[i-1].state[k],amount);d.grammar.regularization=amount;return d;};
const buildV3=J.buildSongNativeDirection;
J.buildSongVisualGrammarV4=(project,audio,options={})=>{
 abort(options.signal);
 const parsed=J.parseLyrics(project.lyrics),timing=J.computeTiming(project,parsed,audio),duration=timing.duration;
 const acousticKey=acousticIdentity(audio),prior=project.artDirection?.songNativeDirection;
 const structure=prior?.version===4&&J.validSongNativeDirection(prior)&&prior.acousticIdentity===acousticKey&&prior.duration===duration?clone(prior.structure):J.analyzeSongRecurrenceV4(audio,duration,options),states=[];
 const lyrics=parsed.lines.map((l,i)=>({line:i,start:timing.starts[i],end:timing.ends[i],text:l.text,length:J.graphemes(l.text).length}));
 const sections=structure.sections.map((s,i)=>{
  const lines=lyrics.filter(l=>l.start<s.end&&l.end>s.start),density=C(avg(lines.map(l=>l.length/Math.max(.1,l.end-l.start)))/12),relation=structure.relations.find(r=>r.to===i),previous=states.at(-1);
  const state=composition(project,s.vector,previous,relation?{...relation,state:states[relation.from]}:null,density);
  if(s.silence)state.motion=0;
  states.push(state);const prior=structure.sections[i-1];
  return {start:s.start,end:s.end,state,repeatFrom:relation?.from??null,repeatSimilarity:relation?.similarity??null,boundaryConfidence:s.boundaryConfidence,measuredEnergy:s.energy,energyStatus:structure.features.energy,
   energyChange:prior&&F(prior.energy)&&F(s.energy)?s.energy-prior.energy:null,quietIntent:s.silence,motionIntensity:state.motion,visualDensity:C(1-state.width),cameraTravel:state.motion,negativeSpace:C(state.width),typographyScale:C(state.height*2),contrastIntent:state.contrast,transitionIntensity:C(structure.novelty.find(n=>n.time===s.start)?.value||0),lyricDensity:density};
 });
 const result={version:4,acousticIdentity:acousticKey,algorithm:'SONG_GENERATED_VISUAL_GRAMMAR_V4',rendererCompatibilityId:'kamen-song-grammar-renderer-4',sourceIdentity:J.songNativeInputIdentity(project,audio),duration,sections,lyrics,structure,
  grammar:{continuity:1-avg(structure.novelty.map(n=>n.value)),recurrence:avg(structure.relations.map(r=>r.similarity)),coordinates:'continuous normalized glyph groups, crop and layer coupling',operators:['glyph','camera','crop','alpha','safe-area']},evidence:{energy:structure.features.energy,image:project.autoPalette?.analyzed?'MEASURED':'UNMEASURED',semantics:'UNMEASURED'},climax:null};
 const amount=options.regularization??(J.validSongNativeDirection(prior)?prior?.grammar?.regularization:0)??0;
 return regularize(result,F(amount)?C(amount,0,.6):0);
};
J.buildSongNativeDirection=(project,audio)=>active(project)?J.buildSongVisualGrammarV4(project,audio):buildV3(project,audio);
const valid=J.validSongNativeDirection;
const stateKeys=['x','y','width','height','track','lead','cameraX','cameraY','zoom','layerX','layerY','alpha','contrast','motion'];
const validStructure=d=>d.structure?.method==='BOUNDED_NORMALIZED_SSM_V4'&&Array.isArray(d.structure.sections)&&d.structure.sections.length===d.sections?.length&&d.structure.sections.length<=192&&d.structure.sections.every(s=>Array.isArray(s.vector)&&s.vector.length===12&&s.vector.every(v=>F(v)&&v>=0&&v<=1))&&Array.isArray(d.structure.relations)&&d.structure.relations.every(r=>Number.isInteger(r.from)&&Number.isInteger(r.to)&&r.from>=0&&r.to>r.from&&r.to<d.sections.length&&F(r.similarity)&&r.similarity>=0&&r.similarity<=1)&&Array.isArray(d.structure.novelty)&&d.structure.novelty.length<=192&&d.structure.novelty.every(n=>F(n.time)&&F(n.value));
J.validSongNativeDirection=d=>d?.version!==4?valid(d):!!(d.algorithm==='SONG_GENERATED_VISUAL_GRAMMAR_V4'&&d.rendererCompatibilityId==='kamen-song-grammar-renderer-4'&&typeof d.sourceIdentity==='string'&&F(d.duration)&&d.duration>0&&validStructure(d)&&d.sections?.length&&d.sections[0].start===0&&d.sections.at(-1).end===d.duration&&d.sections.every((s,i)=>F(s.start)&&F(s.end)&&s.end>s.start&&(!i||s.start===d.sections[i-1].end)&&unitKeys.every(k=>F(s[k])&&s[k]>=0&&s[k]<=1)&&s.state&&stateKeys.every(k=>F(s.state[k]))&&s.state.x>=.1&&s.state.x<=.9&&s.state.y>=.1&&s.state.y<=.9&&s.state.width>=.3&&s.state.width<=.9&&s.state.height>=.15&&s.state.height<=.6&&s.state.zoom>=1&&s.state.zoom<=1.5&&s.state.alpha>=0&&s.state.alpha<=.2&&s.state.track>=0&&s.state.track<=.1&&s.state.lead>=1&&s.state.lead<=1.5&&['cameraX','cameraY','contrast','motion'].every(k=>s.state[k]>=0&&s.state[k]<=1)&&Math.abs(s.state.layerX)<=.1&&Math.abs(s.state.layerY)<=.1));
// v4 audits verify generated renderer contracts rather than requiring a legacy
// motif, named camera mode or style decoration. Pixel/artistic scores stay null
// without measured evidence; no quality threshold or Hard Gate is relaxed.
const realization=J.auditDirectionRealization,reality=J.auditDirectionReality;
const grammarChecks=p=>{
 const d=p.songNativeDirection||p.artDirection?.songNativeDirection,cuts=(p.cuts||[]).filter(c=>c.line>=0&&!locked(p,c));
 return [{intent:'valid generated trajectory',status:J.validSongNativeDirection(d)?'match':'mismatch'},
  {intent:'generated glyph operator',status:cuts.every(c=>c.layout==='songGrammarV4'&&!c.story&&!c.grammar)?'match':'mismatch'}];
};
J.auditDirectionRealization=(p,pixels)=>{
 if(!active(p))return realization(p,pixels);const checks=grammarChecks(p),errors=checks.filter(c=>c.status==='mismatch').map(c=>c.intent);
 return {ok:!errors.length,errors,warnings:pixels&&!pixels.completed?['render_pixel_audit_incomplete']:[],metrics:{algorithm:'SONG_GENERATED_VISUAL_GRAMMAR_V4',sectionCount:(p.songNativeDirection||p.artDirection.songNativeDirection).sections.length,pixelsVerified:!!pixels?.completed}};
};
J.auditDirectionReality=(p,pixels)=>{
 if(!active(p))return reality(p,pixels);const checks=grammarChecks(p),mismatches=checks.filter(c=>c.status==='mismatch');
 return {checks,mismatches,ok:!mismatches.length,score:null,styleRealizationScore:null,pixelsVerified:!!pixels?.completed,status:'RENDER_CONTRACT_ONLY',artisticQuality:'UNVERIFIED'};
};
// New generation never calls legacy propose/make, registry tournaments or story
// recipes. The vocabulary contains renderer primitives, not completed direction.
const proposalV4=project=>({songNativeDirector:4,style:project.style,mood:project.mood,fx:{...project.fx,hud:'off'},enabled:clone(project.enabled),seed:project.seed,overrides:clone(project.overrides||{}),summary:'曲から生成した構図進行 v4',signals:{image:!!project.autoPalette?.analyzed,audio:true,lyricLines:J.parseLyrics(project.lyrics).lines.length},debug:{confidence:null}});
J.generateSongVisualGrammarV4=async(project,audio,options={})=>{
 const identity=J.songNativeInputIdentity(project,audio);abort(options.signal);
 // Structural analysis is computed once here, then retained in the proposal.
 const direction=J.buildSongVisualGrammarV4(project,audio,{...options,regularization:0});
 await new Promise(resolve=>setTimeout(resolve,0));abort(options.signal);
 if(J.songNativeInputIdentity(project,audio)!==identity)throw Error('INPUT_CHANGED_DURING_GRAMMAR');
 options.onProgress?.({label:'楽曲の反復・転換から連続構図を生成しました'});
 const spread=Math.sqrt(variance(direction.structure.novelty.map(n=>n.value)));
 const candidates=[0,.12+spread*.25,.25+spread*.25].map(amount=>({proposal:{...proposalV4(project),grammarDirection:regularize(clone(direction),amount)}}));
 return {recommended:candidates[0],candidates};
};
const propose=J.proposeDirection;J.proposeDirection=(project,...args)=>active(project)?proposalV4(project):propose(project,...args);
const make=J.makeArtDirection;
J.makeArtDirection=(project,audio,proposal)=>{
 if(proposal.songNativeDirector!==4&&!active(project))return make(project,audio,proposal);
 const vocabulary={layout:['songGrammarV4'],enter:['cut'],exit:['cut'],hold:['still'],cam:['stillCamera'],bg:['none'],treat:[],trans:['cut'],decor:[],fx:[]};
 const saved=proposal.grammarDirection,identity=J.songNativeInputIdentity(project,audio);
 const d=saved?.sourceIdentity===identity?clone(saved):J.buildSongVisualGrammarV4(project,audio,{regularization:saved?.grammar?.regularization});
 const font=project.fonts?.display||'embedded_bold';
 return {version:5,style:project.style,mood:project.mood,typography:{display:font,body:font,serif:font},vocabulary,layoutLanguage:vocabulary.layout,motionLanguage:{base:0,enters:['cut'],exits:['cut']},cameraLanguage:['stillCamera'],fxLanguage:{allowed:[],budget:0},decorationLanguage:{allowed:[],budget:0},transitionLanguage:['cut'],intensityCurve:d.sections.map(s=>s.motionIntensity),sectionProfiles:d.sections.map(s=>({start:s.start,end:s.end,intensity:s.motionIntensity,majorEvent:false})),duration:d.duration,songNativeDirection:d};
};
// Bypass the entire dynamically composed Story chain, not just its first recipe.
const story=J.buildPhotoStory;J.buildPhotoStory=p=>active(p)?p:story(p);
const stateAt=(p,t)=>{
 const s=J.songNativeSectionAt(p,t);if(!s)return null;const d=p.songNativeDirection,i=d.sections.indexOf(s),next=d.sections[i+1]||s;
 const u=s.quietIntent?0:smooth((t-s.start)/Math.max(.1,s.end-s.start));
 return Object.fromEntries(stateKeys.map(k=>[k,J.lerp(s.state[k],next.state[k],u)]));
};
J.songGrammarStateAt=stateAt;
const plan=J.plan;
J.plan=(project,audio)=>{
 const p=plan(project,audio);if(!active(project))return p;
 const saved=project.artDirection.songNativeDirection,identity=J.songNativeInputIdentity(project,audio);
 p.songNativeDirection=J.validSongNativeDirection(saved)&&saved.sourceIdentity===identity?clone(saved):J.buildSongVisualGrammarV4(project,audio);
 p.artDirection={...p.artDirection,...clone(project.artDirection),songNativeDirection:p.songNativeDirection};
 p.songNativePlanInputIdentity=identity;p.songNativeManualPlan=!!p.directorSections7?.length;
 // Legacy render adapters activate on these objects. None controls v4 cuts.
 delete p.musicalPhoto;
 for(const c of p.cuts||[]){if(c.line<0||locked(p,c))continue;
  Object.assign(c,{layout:'songGrammarV4',text:p.lines.find(l=>l.index===c.line)?.text??c.lineText,lineText:p.lines.find(l=>l.index===c.line)?.text??c.lineText,enter:'cut',exit:'cut',hold:'still',cam:'stillCamera',bg:'none',treat:null,trans:'cut',inDur:0,outDur:0,transDur:0,stagger:0,decor:[],params:{readablePhoto:true,font:project.fonts?.display||project.artDirection.typography?.display||'embedded_bold'}});
  for(const k of ['cinema','grammar','story','backgroundScene','photoExit','semanticIntent','semanticResolved','lyricUnitOrigin','cinemaV3LegacyGrammar','cinemaV3Shot','cinemaV3Typography'])delete c[k];
 }
 p.events=(p.events||[]).filter(e=>e.manual||e.directorIntent);p.hypeTimeline=(p.hypeTimeline||[]).filter(e=>e.manual||e.directorIntent);
 // Remove duplicate chunk cuts: v4 renders each complete timed phrase once.
 const seen=new Set();p.cuts=p.cuts.filter(c=>{if(c.line<0||locked(p,c))return true;if(seen.has(c.line))return false;seen.add(c.line);const l=p.lines.find(l=>l.index===c.line);c.start=l.start;c.end=l.end;c.dur=l.end-l.start;return true;});
 if(!p.songNativeManualPlan){
  p.musicalStructure={...p.musicalStructure,sections:p.songNativeDirection.sections.map(s=>({from:s.start,to:s.end,role:'unknown',energy:s.measuredEnergy,confidence:s.boundaryConfidence}))};
  if(p.visualWorld)p.visualWorld={...p.visualWorld,chapters:p.songNativeDirection.sections.map((s,i)=>({index:i,from:s.start,to:s.end,photoExit:false,intent:'measured-structure',backgroundWorld:'source-image',paletteTreatment:'source-image'}))};
 }
 p.fx={...p.fx,glitch:0,decor:0,texture:0};
 p.realityAudit=J.auditDirectionReality(p);
 return J.restoreSongNativeResolved(project,audio,p);
};
// Custom continuous glyph operator. Text is never rewritten to fake novelty.
// Wrapping retains every grapheme and exact LRC boundaries; fitting and the
// established final safe-area/contrast pipeline remain authoritative.
J.LAYOUTS.songGrammarV4={name:'Song-generated glyph geometry',plan:()=>({}),render:env=>{
 const {plan:p,cut:c,W,H}=env,s=stateAt(p,env.t);if(!s)return null;
 const font=c.params.font,text=c.lineText||c.text;
 const width=W*s.width,height=H*s.height;
 const rows=J.semanticLyricLayout?.(text,{font,size:H*.14,maxWidth:width,maxHeight:height,lead:s.lead,track:s.track,ctx:env.ctx});
 let item={text:rows?.text??text,font,size:Math.min(H*.16,rows?.size??J.fitSize(text,font,width,height,{lead:s.lead,track:s.track})),x:s.x*W,y:s.y*H,lead:s.lead,track:s.track,color:env.sc.fg,noHold:true};
 item=J.safeLyricItem(env,item);return J.mainDraw(env,item);
}};
// Position and crop trajectories replace the legacy camera wholesale for unlocked
// v4 cuts. Locks still use their original renderer and camera.
const typography=J.applyTypography5;J.applyTypography5=(env,it)=>{if(active(env.plan)&&!locked(env.plan,env.cut))return;return typography(env,it);};
const center=J.centerPhotoLyricItem;J.centerPhotoLyricItem=(env,it)=>active(env.plan)&&!locked(env.plan,env.cut)?it:center(env,it);
const camera=J.cameraAt;J.cameraAt=(p,t,range)=>{
 if(!active(p)||locked(p,J.cutAt(p,t)||{}))return camera(p,t,range);
 const s=stateAt(p,t);return s?{s:s.zoom,x:(.5-s.cameraX)*p.W*.35,y:(.5-s.cameraY)*p.H*.35,rot:0}:camera(p,t,range);
};
// Background layer is tied to the same continuous state, with no duplicated image
// allocation. Preserve the original image and established crop drawing.
const background=J.Renderer.prototype.drawCustomBackground;
J.Renderer.prototype.drawCustomBackground=function(ctx,p,t,...args){
 if(!active(p)||locked(p,J.cutAt(p,t)||{}))return background.call(this,ctx,p,t,...args);
 const s=stateAt(p,t);if(!s)return background.call(this,ctx,p,t,...args);
 ctx.save();ctx.globalAlpha*=1-s.alpha;ctx.translate(s.layerX*p.W,s.layerY*p.H);ctx.scale(1+Math.abs(s.layerX)*.3,1+Math.abs(s.layerY)*.3);
 try{return background.call(this,ctx,p,t,...args);}finally{ctx.restore();}
};
// Bounded numerical alternatives stay on the generated trajectory. Evaluation
// compares music/structure, continuity, excess and real glyph safety separately.
const objectives=d=>{
 const transitions=d.sections.slice(1).map((s,i)=>({music:dist(d.structure.sections[i].vector,d.structure.sections[i+1].vector),visual:Math.hypot(s.state.x-d.sections[i].state.x,s.state.y-d.sections[i].state.y)}));
 const structural=d.structure.relations.map(r=>1-C(dist(stateKeys.map(k=>d.sections[r.from].state[k]),stateKeys.map(k=>d.sections[r.to].state[k]))));
 return {musicFit:transitions.length?1-avg(transitions.map(t=>Math.abs(t.music-t.visual))):null,structuralFit:structural.length?avg(structural):null,coherence:1-avg(transitions.map(t=>t.visual)),excess:avg(transitions.map(t=>Math.max(0,t.visual-t.music)))};
};
const search=J.searchSongNativeCandidates;
J.searchSongNativeCandidates=async(p,range,audio,telemetry={})=>{
 if(!active(p))return search(p,range,audio,telemetry);abort(telemetry.signal);
 const before=await J.cinemaV3.planHash(p),source=clone(p.songNativeDirection),seen=new Set(),candidates=[];
 const budget=C(Math.sqrt(variance(source.structure.novelty.map(n=>n.value))));
 for(const regularization of [0,.12+budget*.25,.25+budget*.25]){
  const d=clone(source);for(let i=1;i<d.sections.length;i++)for(const k of ['x','y','cameraX','cameraY','width'])d.sections[i].state[k]=J.lerp(d.sections[i].state[k],d.sections[i-1].state[k],regularization);
  const key=J.canonicalJSON(d.sections.map(s=>s.state));if(seen.has(key))continue;seen.add(key);
  if(!J.validSongNativeDirection(d))continue;
  candidates.push({d,objectives:objectives(d)});
 }
 const renderer=new J.Renderer(),cv=document.createElement('canvas');cv.width=256;cv.height=Math.round(256*p.H/p.W);const ctx=cv.getContext('2d');
 try{
  if(p.customBg?.enabled&&p.customBg.dataUrl)await renderer.loadCustomBackground(p.customBg.dataUrl);
  const cuts=p.cuts.filter(c=>c.line>=0&&!locked(p,c)),representatives=cuts.filter((_,i)=>i===0||i===Math.floor(cuts.length/2)||i===cuts.length-1);
  for(const candidate of candidates){abort(telemetry.signal);const trial=clone(p);trial.songNativeDirection=candidate.d;let safe=true,observed=0;const spatial=[];
   for(const c of representatives){const t=c.start+Math.min(.2,c.dur*.5);const masks=document.createElement('canvas');masks.width=cv.width;masks.height=cv.height;const mc=masks.getContext('2d'),items=[];
    renderer.frame(ctx,trial,t,{scale:cv.width/p.W,production:true,noHud:true,lyricAuditCtx:mc,lyricAuditItems:items});
    const ink=mc.getImageData(0,0,cv.width,cv.height).data;let count=0;for(let i=3;i<ink.length;i+=4)if(ink[i])count++;
    const geometry=J.selectionPixelEvidence(ctx.getImageData(0,0,cv.width,cv.height).data,ink,cv.width,cv.height,items.map(i=>i.bounds).filter(Boolean),p.W,p.H);
    safe=safe&&count>0&&geometry.safe;observed+=count;spatial.push({...J.songNativeSpatialObservation(ink,cv.width,cv.height),time:t});masks.width=masks.height=1;
   }
   candidate.safe=safe;candidate.observedGlyphPixels=observed;
   const comparisons=spatial.slice(1).map((row,i)=>{const before=spatial[i],a=source.structure.sections.find(s=>before.time>=s.start&&before.time<s.end),b=source.structure.sections.find(s=>row.time>=s.start&&row.time<s.end);return {observed:Math.hypot(row.centroidX-before.centroidX,row.centroidY-before.centroidY,row.spread-before.spread),music:dist(a.vector,b.vector)};});
   candidate.objectives.visualNoveltyFit=comparisons.length?1-avg(comparisons.map(r=>Math.abs(r.observed-r.music))):null;
  }
 }finally{renderer.disposeAssets?.();cv.width=cv.height=1;}
 abort(telemetry.signal);if(await J.cinemaV3.planHash(p)!==before)throw Error('INPUT_CHANGED_DURING_SEARCH');
 const safe=candidates.filter(c=>c.safe),dominates=(a,b)=>['musicFit','structuralFit','coherence','visualNoveltyFit'].every(k=>b.objectives[k]===null||a.objectives[k]!==null&&a.objectives[k]>=b.objectives[k])&&a.objectives.excess<=b.objectives.excess;
 const frontier=safe.filter(c=>!safe.some(other=>other!==c&&dominates(other,c)&&!dominates(c,other)));
 const chosen=frontier.sort((a,b)=>a.objectives.excess-b.objectives.excess||(b.objectives.musicFit??0)-(a.objectives.musicFit??0))[0];
 if(!chosen)throw Error('V4_NO_READABLE_GRAMMAR');
 p.songNativeDirection=chosen.d;p.artDirection.songNativeDirection=chosen.d;
 p.songNativeDirection.optimization={objectives:chosen.objectives,canvas:'OBSERVED_GLYPH_MASK',candidateCount:candidates.length,artisticQuality:'UNVERIFIED'};
 J.cinemaV3.invalidate(p);telemetry.onProgress?.({label:'曲構造・連続性と代表文字フレームの安全性を比較しました'});return p;
};
const fixSnapshot=J.songNativeFixSnapshot;J.songNativeFixSnapshot=(project,audio,p)=>({...fixSnapshot(project,audio,p),grammarV4:active(p)?clone(p.songNativeDirection):null});
const reapply=J.reapplySongNativeSelection;J.reapplySongNativeSelection=(before,project,audio,p,impact)=>{
 const reused=reapply(before,project,audio,p,impact);
 if(reused&&before.grammarV4&&active(p)){
  const identity=p.songNativeDirection.sourceIdentity;p.songNativeDirection={...clone(before.grammarV4),sourceIdentity:identity};p.artDirection.songNativeDirection=p.songNativeDirection;J.cinemaV3.invalidate(p);
 }
 return reused;
};
// Architecture repair is inappropriate for generated grammar. Existing v3 fixes
// still use their original path; v4 quality observation and Hard Gates are intact.
const repair=J.repairWeakSections;J.repairWeakSections=(p,...args)=>active(p)?Promise.resolve({accepted:false,status:'V4_GRAMMAR_RETAINS_OBSERVED_GEOMETRY',changedLines:[]}):repair(p,...args);
})();
