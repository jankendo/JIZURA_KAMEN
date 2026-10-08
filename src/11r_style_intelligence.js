/* Style Intelligence 2: profiles are measured from the actual installed style packs.
   No rotation, usage counters, random choice, or per-style score bonuses. */
(() => {
'use strict';
const C=(n,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(+n)?+n:a));
const mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const rgb=h=>[1,3,5].map(i=>parseInt(h.slice(i,i+2),16)/255);
const color=h=>{const [r,g,b]=rgb(h),max=Math.max(r,g,b),min=Math.min(r,g,b),d=max-min;let hue=0;
 if(d)hue=(max===r?(g-b)/d+(g<b?6:0):max===g?(b-r)/d+2:(r-g)/d+4)/6;
 return {light:J.paletteLuma(h),chroma:d,warmth:C(.5+(r-b)*.5),hue};};
const bias=(s,g,re)=>{const entries=Object.entries(s.bias?.[g]||{});return C(entries.filter(([k])=>re.test(k)).reduce((n,[,v])=>n+v,0)/Math.max(1,entries.reduce((n,[,v])=>n+v,0)));};
const profiles=new Map();
J.buildStyleProfile=style=>{
 const key=typeof style==='string'?style:Object.keys(J.STYLES).find(k=>J.STYLES[k]===style),s=typeof style==='string'?J.STYLES[style]:style;
 if(!s)throw new Error('Unknown style: '+key);if(profiles.has(key))return profiles.get(key);
 const bg=color(s.schemes[0].bg),colors=s.schemes.flatMap(x=>[x.bg,x.accent,x.accent2]).map(color),f=s.fonts.display;
 const digital=C((s.texture.scan||0)*.45+(s.hud?.25:0)+bias(s,'enter',/scramble|slice|glitch|pixel|scan/i)*.6);
 const organic=C((s.texture.paper||0)*.5+bias(s,'enter',/ink|blur|fade|unroll/i)*.6);
 const pop=C(bias(s,'enter',/pop|bounce|spin|drop|stretch/i)*1.4+(f.some(x=>/round|pop|kiwi/.test(x))?.3:0));
 const aggression=C(bias(s,'enter',/slice|scramble|zoom|stamp|crash/i)*1.6+(s.glitchBoost||0)*.12);
 const energy=C(.18+aggression*.4+pop*.4+digital*.22-organic*.12);
 const rhythm=C(.2+digital*.35+aggression*.3+pop*.25);
 const detail=C(.18+Object.keys(s.decor||{}).length*.025+digital*.3+(s.texture.grain||0)*.13);
 const fontWeight=f.some(x=>/black|dela|tokumin|pop/.test(x))?.9:f.some(x=>/light/.test(x))?.2:.55;
 const profile={style:key,darkness:1-bg.light,chroma:mean(colors.map(c=>c.chroma)),warmth:mean(colors.map(c=>c.warmth)),
 contrast:C(Math.log(J.paletteContrast(s.schemes[0].fg,s.schemes[0].bg))/Math.log(21)),detail,energy,rhythm,aggression,
 emotion:C(organic*.5+(s.moods?.includes('emotional')?.5:0)),epicness:C(fontWeight*.45+aggression*.3),
 minimalism:C(1-detail),graphicness:C(aggression*.5+pop*.4),organicness:organic,digitalness:digital,
 retro:C((s.texture.scan||0)*.55+(s.texture.paper||0)*.45),editorial:bias(s,'layout',/type|gloss|label|column|stack/i),pop,
 cinematic:C((s.texture.grain||0)*.45+organic*.3),Japanese:1,
 textureAmount:mean(Object.values(s.texture)),typographyWeight:fontWeight,hueX:(Math.cos(bg.hue*Math.PI*2)+1)/2,hueY:(Math.sin(bg.hue*Math.PI*2)+1)/2};
 profiles.set(key,profile);return profile;
};
J.styleInputProfile=(music,image,lyrics,direction={})=>{
 const m=music||{},i=image||{},l=lyrics||{},h=C(i.dominantHue??0),energy=C(m.energy??.45),rhythm=C(.42*C(((m.bpm||105)-65)/115)+.34*(m.onsetDensity??.35)+.24*(m.beatStrength??.4));
 return {darkness:1-C(i.median??.5),chroma:C(i.chroma??.25),warmth:C(i.warmth??.5),contrast:C(i.contrast??.4),detail:C(i.detail??.3),
 energy,rhythm,aggression:C(energy*(m.percussive??.5)),emotion:C((m.smoothness??.5)*(m.sectionContrast??.3)),epicness:C((m.bass??.4)*.5+(m.sectionContrast??.3)*.5),
 minimalism:C(i.negativeSpace??.5),graphicness:C((m.onsetDensity??.35)*.6+(l.repeatRatio??0)*.4),organicness:C((m.smoothness??.5)*(1-(m.brightness??.5))),
 digitalness:C((m.percussive??.5)*(m.brightness??.5)),retro:C((1-(m.brightness??.5))*.5+(i.detail??.3)*.5),editorial:C(l.longRatio??.2),pop:C((1-(i.median??.5))*.1+(m.brightness??.4)*energy),
 cinematic:C((m.sectionContrast??.3)*.6+(m.smoothness??.5)*.4),Japanese:C(l.japaneseRatio??1),textureAmount:C(i.detail??.3),typographyWeight:C(.3+energy*.45+(l.repeatRatio??0)*.2),
 hueX:(Math.cos(h*Math.PI*2)+1)/2,hueY:(Math.sin(h*Math.PI*2)+1)/2};
};
const groups={image:['darkness','chroma','warmth','contrast','detail','hueX','hueY'],audio:['energy','rhythm','aggression','emotion','epicness','organicness','digitalness'],lyrics:['editorial','typographyWeight','Japanese'],direction:['minimalism','graphicness','retro','pop','cinematic','textureAmount']};
J.scoreStyleProfiles=(input,allowed=J.STYLE_ORDER)=>allowed.map(style=>{
 const p=J.buildStyleProfile(style),parts={};for(const [g,axes] of Object.entries(groups))parts[g]=1-mean(axes.map(k=>Math.abs(input[k]-p[k])));
 const score=parts.image*.38+parts.audio*.32+parts.lyrics*.16+parts.direction*.14;
 return {style,score:+score.toFixed(6),components:parts,reasons:[`画像との一致 ${Math.round(parts.image*100)}%`,`音楽との一致 ${Math.round(parts.audio*100)}%`,`歌詞・書体との一致 ${Math.round(parts.lyrics*100)}%`],penalties:Object.entries(parts).filter(([,v])=>v<.6).map(([k,v])=>({axis:k,mismatch:1-v}))};
}).sort((a,b)=>b.score-a.score||a.style.localeCompare(b.style));
J.rankStyles=(project,music,image,lyrics,direction)=>{
 const input=J.styleInputProfile(music,image,lyrics,direction),allowed=J.STYLE_ORDER.filter(k=>J.randomOk(project,'style',k));
 const candidates=J.scoreStyleProfiles(input,allowed.length?allowed:J.STYLE_ORDER);
 const result={version:2,input,candidates,selected:candidates[0].style,confidence:C((candidates[0].score-(candidates[1]?.score||0))*5),weights:{image:.38,audio:.32,lyrics:.16,direction:.14}};
 J.lastStyleDecision=result;return result;
};
J.fuseStylePalette=(style,image,stats)=>{
 const weight=C(.72+(1-C(stats?.chroma??.25))*.16-C(stats?.contrast??.3)*.08,.64,.88),out={...style};
 out.bg=image.bg||style.bg;out.fg=J.fitContrast(image.fg||style.fg,out.bg,7);out.sub=J.fitContrast(image.sub||style.sub,out.bg,4.5);
 for(const k of ['accent','accent2','ghostA','ghostB'])out[k]=J.fitContrast(J.mix(style[k],image[k]||style[k],1-weight),out.bg,k.startsWith('ghost')?1.5:3);
 out.ink=out.accent;out.dim=J.mix(out.bg,out.fg,.14);return out;
};
J.styleSignature=key=>{
 const s=J.STYLES[key],decor=Object.entries(s.decor||{}).filter(([k])=>J.DECOR[k]).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))[0]?.[0];
 return {core:[{kind:'font',values:s.fonts.display},{kind:'accent',values:[s.schemes[0].accent]},{kind:'decor',values:decor?[decor]:[]}],optional:Object.keys(s.bias?.treat||{}),forbidden:['unreadable','clipping','rapidFlash'],decor};
};
const originalPropose=J.proposeDirection;
J.proposeDirection=(project,audio,image,variant=0)=>{
 const p=originalPropose(project,audio,image,variant),s=J.STYLES[p.style],signature=J.styleSignature(p.style),d=p.visualDNA,md=p.motionDNA;
 // Joint scoring retains the chosen style's typography, with song/readability choosing its member.
 const fonts=s.fonts.display.filter(k=>J.FONTS[k]);
 md.font=fonts.slice().sort((a,b)=>(md.score.font[b]??.4)-(md.score.font[a]??.4)||fonts.indexOf(a)-fonts.indexOf(b))[0]||md.font;
 md.fontCategory=J.FONTS[md.font].kind;
 d.typographyStyle=md.font;d.typographyStrategy='styleJoint';d.cameraStrategy=md.cameraMode;d.motionStrategy=md.entranceMotion;d.transitionStrategy=md.exitMotion;
 // One readable family per song; constrained diagonal uses a bounded angle, never the busy legacy layout.
 d.layoutStrategy=d.archetype==='rawRock'&&project.aspect!=='9:16'?'dynamicDiagonal':d.spatialBias==='left'||d.spatialBias==='right'?'editorialAsymmetric'+d.spatialBias:'centeredCinematic';
 d.layoutAngle=d.layoutStrategy==='dynamicDiagonal'?-3:0;
 d.decorationStrategy=signature.decor?'styleSignature':'none';d.decorationAmount=signature.decor?.16:0;d.colorStrategy='styleImageFusion';
 for(const k of Object.keys(p.enabled.decor))p.enabled.decor[k]=k===signature.decor;
 p.fx.decor=signature.decor?.16:0;
 md.signature=[md.font,md.entranceMotion,md.cameraMode,md.sustainMotion,md.subtype||d.type].join('|');d.motionSignature=md.signature;
 p.debug.selected=d;p.debug.styleDecision.selected=p.style;p.styleSignature=signature;
 return p;
};
const originalMake=J.makeArtDirection;
J.makeArtDirection=(project,audio,proposal)=>{
 const d=originalMake(project,audio,proposal);d.realityVersion=2;d.styleDecision=proposal.debug.styleDecision;d.styleSignature=proposal.styleSignature||J.styleSignature(proposal.style);
 d.backgroundCamera={mode:d.motionDNA.cameraMode};d.lyricsMotion={mode:d.motionDNA.sustainMotion,screenSpace:true};d.globalCamera={mode:'none'};
 return d;
};
const originalPlan=J.plan;
J.plan=(project,audio)=>{
 const plan=originalPlan(project,audio),d=plan.artDirection;if(d?.realityVersion!==2)return plan;
 const cuts=plan.cuts.filter(c=>c.line>=0&&c.layout!=='interlude'),counts={};for(const c of cuts)counts[c.text]=(counts[c.text]||0)+1;
 const seen={};for(const c of cuts){
  c.repetitionProgress=(seen[c.text]||0)/Math.max(1,counts[c.text]-1);seen[c.text]=(seen[c.text]||0)+1;
  if(/CHANT|TEAM_CALL/.test(d.visualDNA.type)&&c.repetitionIndex>0){c.enter='cut';c.inDur=0;}
  if(/CHANT|TEAM_CALL/.test(d.visualDNA.type)){c.exit='cut';c.outDur=0;}
  c.params.font=d.typography.display;c.params.directionAngle=d.visualDNA.layoutAngle||0;
  c.params.intensityScale=C(.92+c.repetitionProgress*.1+J.motionEnergyAt(d,c.start)*.07,.92,1.09);
  const id=d.styleSignature.decor;if(id&&!c.decor.some(x=>x.id===id)){const D=J.DECOR[id];
   // Use the registry's planner, preserving its real parameters and draw implementation.
   const seeded=J.rng(c.seed);c.decor=[{id,seed:c.seed,n:1,right:false,low:true,accent:true,corner:true,big:false,mode:'count',from:0,to:99,v:0,r:seeded(),...(D.plan?D.plan(seeded,plan.style):{})}];
  }
 }
 plan.realityAudit=J.auditDirectionReality(plan);return plan;
};
J.lyricsCameraAt=()=>({s:1,x:0,y:0,rot:0});
// Measure the glyphs in their actual local coordinate system, then transform
// every corner through character scale/rotation/skew and the item transform.
J.measureLyricItemBounds=(env,it)=>{
 const lay=J.layoutText(it),ctx=env.ctx,points=[],rad=J.DEG;
 const rotate=(x,y,a)=>[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)];
 if(ctx?.save){ctx.save();ctx.font=J.fontCSS(it.font,it.size,it.fontWeight);ctx.textAlign='center';ctx.textBaseline='middle';}
 for(const g of lay){
  if(!g.ch.trim())continue;
  const c=it.charFn?.(g.i,g,lay.N);if(c?.hide||((it.alpha??1)*(c?.a??1))<=.002)continue;
  const m=ctx?.measureText?.(c?.ch||g.ch),size=it.size;
  const left=Number.isFinite(m?.actualBoundingBoxLeft)?-m.actualBoundingBoxLeft:-g.w/2;
  const right=Number.isFinite(m?.actualBoundingBoxRight)?m.actualBoundingBoxRight:g.w/2;
  const top=Number.isFinite(m?.actualBoundingBoxAscent)?-m.actualBoundingBoxAscent:-size/2;
  const bottom=Number.isFinite(m?.actualBoundingBoxDescent)?m.actualBoundingBoxDescent:size/2;
  const sx=(it.sx??1)*(c?.s??1)*(c?.sx??1),sy=(it.sy??1)*(c?.s??1)*(c?.sy??1);
  const gx=(g.x+g.vx)*(it.sx??1)+(c?.dx||0),gy=(g.y+g.vy)*(it.sy??1)+(c?.dy||0);
  const itemAngle=(it.rot||0)*rad,charAngle=((c?.rot||0)+(g.r90?90:0))*rad;
  const pad=Math.max(0,(it.stroke||0)/2)+(it.blur||0)*.8;
  for(const x of [left-pad,right+pad])for(const y of [top-pad,bottom+pad]){
   let X=x*sx+Math.tan((c?.skew||0)*rad)*y*sy,Y=y*sy;
   [X,Y]=rotate(X,Y,charAngle);X+=gx;Y+=gy;
   X+=Math.tan((it.skew||0)*rad)*Y;
   [X,Y]=rotate(X,Y,itemAngle);X+=(it.x||0);Y+=(it.y||0);
   const matrix=ctx?.getTransform?.(),k=env.scale||1;
   if(matrix)points.push([(matrix.a*X+matrix.c*Y+matrix.e)/k,(matrix.b*X+matrix.d*Y+matrix.f)/k]);
   else points.push([X,Y]);
  }
 }
 if(ctx?.restore)ctx.restore();
 if(!points.length)return null;
 return {x0:Math.min(...points.map(p=>p[0])),x1:Math.max(...points.map(p=>p[0])),y0:Math.min(...points.map(p=>p[1])),y1:Math.max(...points.map(p=>p[1]))};
};
J.safeLyricItem=(env,item)=>{
 const it={...item},hero=(env.cut?.params?.readableHero||env.cut?.params?.readablePhoto)&&!env.plan.directionOverrides7?.[env.cut.line]?.lock,rect={x0:env.W*(hero ? .11 : .055),x1:env.W*(hero ? .89 : .945),y0:env.H*.08,y1:env.H*.92};
 // A full-height vertical line was re-centred every frame, cancelling rise/fall.
 // Reserve motion headroom and move the fitting window with the semantic path.
 const verb=env.cut?.semanticIntent?.visualVerb;
 if(it.vertical&&['rise','fall'].includes(verb)&&!env.plan.directionOverrides7?.[env.cut.line]?.lock){
  const u=J.clamp((env.t-env.cut.start)/Math.max(.2,env.cut.end-env.cut.start));
  const shift=(verb==='rise'?-1:1)*.075*u;
  rect.y0=env.H*((verb==='rise'?.16:.08)+shift);rect.y1=env.H*((verb==='rise'?.92:.84)+shift);
 }
 if(it.vertical&&it.vAlign==null)it.vAlign=it.align==='left'?'top':'center';
 it.rot=(it.rot||0)+(env.cut?.params?.directionAngle||0);
 let box=J.measureLyricItemBounds(env,it);
 if(!box)return it;
 const fit=Math.min(1,(rect.x1-rect.x0)/Math.max(1,box.x1-box.x0),(rect.y1-rect.y0)/Math.max(1,box.y1-box.y0));
 if(fit<1){const s=Math.max(.05,fit*.99);it.size*=s;if(it.stroke)it.stroke*=s;if(it.shadow)it.shadow={...it.shadow,blur:(it.shadow.blur||0)*s,dx:(it.shadow.dx||0)*s,dy:(it.shadow.dy||0)*s};it.track=(it.track||0);it._lay=null;it._m=null;box=J.measureLyricItemBounds(env,it);}
 if(box){const dx=Math.max(rect.x0-box.x0,Math.min(0,rect.x1-box.x1)),dy=Math.max(rect.y0-box.y0,Math.min(0,rect.y1-box.y1));
   const m=env.ctx?.getTransform?.(),det=m?m.a*m.d-m.b*m.c:0,k=env.scale||1;
   if(Math.abs(det)>1e-9){it.x+=(m.d*dx-m.c*dy)*k/det;it.y+=(-m.b*dx+m.a*dy)*k/det;}
   else{it.x+=dx;it.y+=dy;}
 }
 it._lay=null;it._m=null;return it;
};
const originalCredit=J.planTitleDisplay;
J.planTitleDisplay=(...args)=>{
 const d=originalCredit(...args);if(!d||args[6]?.realityVersion!==2)return d;
 d.opacity=C(.7+(d.detail||0)*.2+(4.5-(d.contrast||4.5))*.025,.7,.94);
 d.scrim=C(.18+(d.detail||0)*.18,.18,.36);return d;
};
J.auditDirectionReality=(plan,pixel=null)=>{
 const d=plan?.artDirection,v=d?.visualDNA||{},cuts=(plan?.cuts||[]).filter(c=>c.line>=0&&c.layout!=='interlude'),checks=[];
 const check=(intent,actual,ok)=>checks.push({intent,actual,status:ok?'match':'mismatch'});
 check('layout:'+v.layoutStrategy,[...new Set(cuts.map(c=>c.layout+':'+(c.params?.directionAngle||0)))],v.layoutStrategy!=='dynamicDiagonal'||cuts.some(c=>c.layout==='diag'||Math.abs(c.params?.directionAngle||0)>=2));
 const dec=cuts.flatMap(c=>(c.decor||[]).map(x=>x.id));check('decoration:'+v.decorationStrategy,[...new Set(dec)],!v.decorationStrategy||v.decorationStrategy==='none'||dec.length>0);
 const modes={handheld:'handheld',beatDriven:'pulse',slowCinematic:'drift',static:'hold',gentleZoom:'push'};
 check('camera:'+v.cameraStrategy,d?.motionDNA?.cameraMode,!v.cameraStrategy||v.cameraStrategy===(d?.motionDNA?.cameraMode)||modes[v.cameraStrategy]===d?.motionDNA?.cameraMode);
 const sig=J.STYLES[plan.styleKey]?J.styleSignature(plan.styleKey):null;
 const font=sig&&cuts.some(c=>sig.core[0].values.includes(c.params?.font));
 const decor=sig?.decor&&dec.includes(sig.decor);const accent=!!plan.style?.schemes?.[0]?.accent;
 const measured=pixel?.metrics?.styleCues;const realization=measured ? (font&&measured.font>0.0001?45:0)+(decor&&measured.decor>0.0001?35:0)+(accent&&measured.accent>0.0001?20:0) : (font?45:0)+(decor?35:0)+(accent?20:0);
 check('style core cues',{font,decor:!!decor,accent,measured},!!font&&!!decor&&(!measured||realization>=65));
 const mismatches=checks.filter(x=>x.status==='mismatch');
 return {checks,mismatches,score:Math.round(100*(1-mismatches.length/Math.max(1,checks.length))),styleRealizationScore:realization,pixelsVerified:!!pixel?.completed,ok:!mismatches.length};
};
const originalQuality=J.scoreMVQuality;
J.scoreMVQuality=(report,project,plan,audio,range,pixel,capabilities,validation)=>{
 report=originalQuality(report,project,plan,audio,range,pixel,capabilities,validation);
 if(!project.autoDirection)return report;
 const audit=J.auditDirectionReality(plan,pixel);report.directionReality=audit;
 if(!audit.ok&&!report.issues.some(x=>x.code==='dna_mismatch'))report.issues.push({code:'dna_mismatch',severity:'WARNING',message:'演出の設計と実際の映像に不一致があります',fixable:true});
 const old=Object.fromEntries(report.quality.categories.map(x=>[x.key,x.score/x.max]));
 const decision=plan.artDirection?.styleDecision,candidate=decision?.candidates.find(c=>c.style===plan.styleKey);
 const categories=[['lyrics',20,old.lyrics],['motion',15,old.motion],['composition',15,old.composition],['styleSelection',10,candidate?.score??0],['styleRealization',10,audit.styleRealizationScore/100],['coherence',10,Math.min(old.coherence,audit.score/100)],['repetition',8,old.repetition],['title',5,old.title],['export',7,old.export]].map(([key,max,f])=>({key,max,score:+(max*C(f)).toFixed(1)}));
 const hardCodes=['lyrics_clipped','title_contrast','dna_mismatch','visual_motion_low','motion','export_validation','audio_missing','frames','black_frame','render_failed'];
 const gates=report.issues.filter(x=>x.severity==='ERROR'||hardCodes.includes(x.code));
 report.quality.categories=categories;report.quality.score=Math.min(gates.length?94:100,Math.round(categories.reduce((s,c)=>s+c.score,0)));
 if(!pixel?.completed||!validation)report.quality.score=Math.min(97,report.quality.score);
 report.errors=report.issues.filter(x=>x.severity==='ERROR');report.warnings=report.issues.filter(x=>x.severity==='WARNING');report.quality.hardGates={passed:!gates.length,total:gates.length};report.quality.styleRealizationScore=audit.styleRealizationScore;
 return report;
};
const originalFix=J.fixMVQuality;
J.fixMVQuality=(project,report,audio)=>{
 let n=originalFix(project,report,audio);
 if(report.issues.some(x=>x.code==='dna_mismatch')&&audio?.features){const p=J.proposeDirection(project,audio,project.autoPalette?.stats);Object.assign(project,{style:p.style,mood:p.mood,fx:p.fx,enabled:p.enabled,seed:p.seed,overrides:p.overrides});project.artDirection=J.makeArtDirection(project,audio,p);n++;}
 return n;
};
J.optimizeDirectionCandidatesRendered=async(project,audio,image,max=3,telemetry={})=>{
 telemetry.onProgress?.({label:'歌詞・曲構成からStyle・シーン・モーション・文字・効果を設計しています'});await new Promise(r=>setTimeout(r,0));
 const set=J.optimizeDirectionCandidates(project,audio,image,max),top=set.candidates.find(c=>c.variant===0),scores=top.proposal.debug.styleDecision.candidates;
 const competitive=scores[0].score-(scores[1]?.score||0)<.075;
 const candidates=competitive?set.candidates:[top];
 for(const [candidateIndex,c] of candidates.entries()){
  telemetry.onProgress?.({label:'演出案を描画して検査しています',detail:'案 '+(candidateIndex+1)+' / '+candidates.length,current:candidateIndex,total:candidates.length});
  await J.ensureFonts?.(c.plan.lines.map(l=>l.text).join(''),J.fontsOfPlan(c.plan));
  c.pixelQA=await J.analyzeRenderedFrames(c.plan,null,audio,{onProgress:event=>telemetry.onProgress?.({...event,detail:'案 '+(candidateIndex+1)+' / '+candidates.length})});
  const candidateProject={...project,fonts:{...c.plan.artDirection.typography},style:c.proposal.style,mood:c.proposal.mood,fx:c.proposal.fx,enabled:c.proposal.enabled,seed:c.proposal.seed,autoDirection:true,artDirection:c.plan.artDirection};
  c.repairs=[];
  for(let pass=0;pass<2;pass++){
   const report=J.checkMVQuality(candidateProject,c.plan,audio,null,c.pixelQA);
   const changes=J.fixMVQuality(candidateProject,report,audio);if(!changes)break;
   telemetry.onProgress?.({label:'検査で見つかった部分を再最適化しています',detail:'案 '+(candidateIndex+1)+' · 調整 '+(pass+1)});await new Promise(r=>setTimeout(r,0));
   c.repairs.push(report.issues.filter(x=>x.fixable).map(x=>x.code));c.plan=J.plan(candidateProject,audio);c.pixelQA=await J.analyzeRenderedFrames(c.plan,null,audio,{onProgress:event=>telemetry.onProgress?.({...event,detail:'案 '+(candidateIndex+1)+' / '+candidates.length})});
  }
  c.project=candidateProject;c.proposal={...c.proposal,style:candidateProject.style,mood:candidateProject.mood,fx:candidateProject.fx,enabled:candidateProject.enabled,seed:candidateProject.seed,overrides:candidateProject.overrides,visualDNA:candidateProject.artDirection.visualDNA,motionDNA:candidateProject.artDirection.motionDNA,styleSignature:candidateProject.artDirection.styleSignature};c.audit=J.auditDirectionReality(c.plan,c.pixelQA);
  c.quality=J.checkMVQuality(candidateProject,c.plan,audio,null,c.pixelQA).quality;
  c.score=(c.quality.overallScore??c.quality.score)-(c.pixelQA.completed?0:10);
  telemetry.onProgress?.({label:'演出案の検査を完了しました',current:candidateIndex+1,total:candidates.length});
 }
 candidates.sort((a,b)=>b.score-a.score||a.variant-b.variant);J.lastStyleDecision={...top.proposal.debug.styleDecision,selected:candidates[0].proposal.style,proxy:candidates.map(c=>({style:c.proposal.style,score:c.score,pixels:c.pixelQA.completed,repairs:c.repairs,realization:c.audit.styleRealizationScore}))};
 return {recommended:candidates[0],candidates};
};

// Ablation tests measure whether style cues change the rendered pixels.
const analyzeBase=J.analyzeRenderedFrames;
J.analyzeRenderedFrames=async(plan,range,audio,telemetry={})=>{
 const result=await analyzeBase(plan,range,audio,telemetry);
 if(!result.completed||plan.artDirection?.realityVersion!==2)return result;
 const canvas=document.createElement('canvas');canvas.width=256;canvas.height=Math.round(256*plan.H/plan.W);
 const ctx=canvas.getContext('2d',{willReadFrequently:true}),renderer=new J.Renderer(),scale=canvas.width/plan.W;
 const active=plan.cuts.filter(c=>c.line>=0&&c.start>=(range?.start||0)&&c.start<(range?.end||plan.duration));
 const cuts=[active[0],active[Math.floor(active.length/2)],active[active.length-1]].filter(Boolean);
 const totals={font:[],decor:[],accent:[]};
 try{
  if(plan.customBg?.enabled)await renderer.loadCustomBackground(plan.customBg.dataUrl);
  telemetry.onProgress?.({label:'Style・文字・装飾が実際に描画されているか検査しています'});
  for(const cut of cuts){if(telemetry.onProgress)await new Promise(r=>setTimeout(r,0));const t=cut.start+cut.dur*.5;renderer.frame(ctx,plan,t,{scale,production:true});const baseline=ctx.getImageData(0,0,canvas.width,canvas.height).data;
   for(const kind of Object.keys(totals)){
    const altered={...plan,cuts:plan.cuts.map(c=>({...c,params:{...c.params},decor:[...(c.decor||[])]})),style:{...plan.style,schemes:plan.style.schemes.map(x=>({...x}))}};
    if(kind==='decor')altered.cuts.forEach(c=>c.decor=[]);
    if(kind==='font')altered.cuts.forEach(c=>c.params.font=c.params.font==='mincho_light'?'gothic_black':'mincho_light');
    if(kind==='accent')altered.style.schemes.forEach(s=>{s.accent='#777777';s.accent2='#777777';});
    // Cuts retain their style object. Ablating only plan.style left the actual
    // cut palette untouched, making a visible accent appear unrealized.
    if(kind==='accent')altered.cuts.forEach(c=>{if(!c.styleKey||c.styleKey===plan.styleKey)c.style=altered.style;});
    renderer.frame(ctx,altered,t,{scale,production:true});const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let difference=0,count=0;
    for(let i=0;i<pixels.length;i+=4){difference+=Math.abs(pixels[i]-baseline[i])+Math.abs(pixels[i+1]-baseline[i+1])+Math.abs(pixels[i+2]-baseline[i+2]);count+=3;}
    totals[kind].push(difference/Math.max(1,count)/255);
   }
  }
  result.metrics.styleCues=Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,mean(v)]));
 }catch(e){result.issues.push({code:'style_pixel_failed',severity:'WARNING',message:'スタイルの描画差を確認できませんでした'});}
 finally{renderer.customBgBitmap?.close?.();canvas.width=canvas.height=1;}
 return result;
};
const drawCreditBase=J.Renderer.prototype.drawTitleCredit;
J.Renderer.prototype.drawTitleCredit=function(ctx,plan,t,scale){
 if(plan.artDirection?.realityVersion!==2||!plan.titleDisplay)return drawCreditBase.call(this,ctx,plan,t,scale);
 const d={...plan.titleDisplay};
 try{
  const cv=this.creditSample||(this.creditSample=document.createElement('canvas'));cv.width=24;cv.height=8;const sample=cv.getContext('2d',{willReadFrequently:true});
  const right=d.position[1]==='r',bottom=d.position[0]==='b',x=right?d.W-d.marginX-d.maxWidth:d.marginX,y=bottom?d.H-d.marginY-d.titleSize*2.6:d.marginY;
  sample.drawImage(ctx.canvas,x*scale,y*scale,d.maxWidth*scale,d.titleSize*2.6*scale,0,0,24,8);
  const data=sample.getImageData(0,0,24,8).data,lumas=[];for(let i=0;i<data.length;i+=4)lumas.push((data[i]*.2126+data[i+1]*.7152+data[i+2]*.0722)/255);
  const avg=mean(lumas),detail=Math.sqrt(mean(lumas.map(x=>(x-avg)**2)));d.color='#FFFFFF';d.opacity=C(.76+detail*.4,.76,.94);d.scrim=C(.24+avg*.34+detail*.28,.24,.65);
 }catch(e){/* retain conservative planned scrim when pixels are unavailable */}
 return drawCreditBase.call(this,ctx,{...plan,titleDisplay:d},t,scale);
};
})();
