/* Input-sensitive, deterministic art direction. All analysis stays in the browser. */
(() => {
'use strict';
const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, Number.isFinite(+x) ? +x : a));
const round = x => +clamp(x).toFixed(3);
const avg = a => a.length ? a.reduce((s,v) => s + v, 0) / a.length : 0;
const traits = ['energy','rhythm','dark','color','warm','detail','space','long','dynamics','bass'];
const archetypes = {
  cinematic: { name:'Cinematic Emotional', mood:'emotional', traits:[.38,.24,.72,.28,.52,.25,.65,.5,.75,.38], styles:['noir','mono','paper','specimen'], strategy:['centeredCinematic','impactWords','smooth','slowCinematic','soft','light'],
    layout:['center','vcols','gloss','stack','mixed'],enter:['blur','assemble','wipe'],exit:['blur','drift','wipe'],hold:['breathe','drift','still'],decor:['leaders','waveform','rings'],treat:['none'],cam:['push','panL','dollyIn'],fx:['chroma'],trans:['pushSlide','irisOpen'] },
  digital: { name:'Digital Aggressive', mood:'glitch', traits:[.9,.94,.72,.82,.22,.8,.25,.18,.62,.83], styles:['hud','mint','noir','crimson','blueprint'], strategy:['dynamicDiagonal','bigType','rhythmicImpact','beatDriven','digital','digitalNoise'],
    layout:['diag','huge','tile','condensed','marquee','stack'],enter:['slice','scramble','zoom','flicker'],exit:['slice','glitch','explode'],hold:['jitter','glitchtick'],decor:['barcode','grid','slash','bars'],treat:['none'],cam:['beatPunch','crashZoom','snapPan'],fx:['slice','block','chroma','flash','shake'],trans:['flashCross','blockDissolve'] },
  editorial: { name:'Editorial Minimal', mood:'editorial', traits:[.22,.22,.42,.17,.5,.35,.85,.85,.2,.25], styles:['specimen','paper','mono','transit'], strategy:['editorialAsymmetric','editorialTypesetting','minimal','static','invisible','light'],
    layout:['gloss','vcols','type','labels','mixed','stack'],enter:['type','wipe','blur'],exit:['wipe','blur','drift'],hold:['still','breathe'],decor:['leaders','brackets','counter'],treat:['none'],cam:['stillCamera','push'],fx:[],trans:['wipe'] },
  dreamy: { name:'Dreamy Atmospheric', mood:'calm', traits:[.3,.16,.54,.42,.54,.16,.72,.46,.44,.3], styles:['paper','magenta','mono','noir'], strategy:['wideMinimal','verticalMix','floating','slowCinematic','soft','particles'],
    layout:['vcols','circle','wave','center','gloss'],enter:['blur','wipe','assemble'],exit:['drift','blur','shrink'],hold:['drift','breathe','wave'],decor:['dots','rings','blobs'],treat:['none'],cam:['panL','push','floatNoise'],fx:[],trans:['irisOpen','pushSlide'] },
  brightPop: { name:'Bright Pop', mood:'pop', traits:[.75,.72,.08,.88,.72,.45,.44,.22,.37,.38], styles:['magenta','caution','rouge','transit','mint'], strategy:['layeredGraphic','bigSmallMix','floating','gentleZoom','graphic','particles'],
    layout:['mixed','scatter','ring','pill','wave','labels'],enter:['pop','drop','spin','stretch'],exit:['scatter','shrink','stretch'],hold:['wave','breathe','drift'],decor:['dots','shapes','sparks','blobs'],treat:['none'],cam:['bounce','beatPunch','push'],fx:['zoom','chroma'],trans:['diagonalWipe','clockWipe'] },
  rawRock: { name:'Raw Rock', mood:'graphic', traits:[.77,.71,.57,.42,.72,.73,.25,.28,.67,.58], styles:['crimson','noir','caution','rouge','mono'], strategy:['dynamicDiagonal','impactWords','impact','handheld','impact','graphicLines'],
    layout:['huge','diag','condensed','stack','marquee'],enter:['slice','stretch','assemble','zoom'],exit:['explode','fall','slice'],hold:['jitter','breathe'],decor:['slash','bars','brackets'],treat:['none'],cam:['handheld','crashZoom','push'],fx:['shake','slice','zoom'],trans:['whipPan','wipe'] },
  organic: { name:'Organic Warm', mood:'calm', traits:[.24,.23,.23,.37,.91,.2,.77,.54,.34,.19], styles:['paper','specimen','rouge','sakura'], strategy:['editorialAsymmetric','minimalCaption','smooth','static','soft','paper'],
    layout:['gloss','type','vcols','mixed','circle'],enter:['type','blur','wipe'],exit:['drift','blur','wipe'],hold:['still','breathe','drift'],decor:['leaders','waveform','dots'],treat:['none'],cam:['stillCamera','panL','push'],fx:[],trans:['pushSlide','wipe'] },
  darkGraphic: { name:'Dark Graphic', mood:'graphic', traits:[.6,.56,.92,.3,.14,.79,.25,.42,.56,.69], styles:['noir','hud','blueprint','mono'], strategy:['layeredGraphic','bigType','mechanical','beatDriven','graphic','graphicLines'],
    layout:['diag','labels','condensed','tile','huge'],enter:['slice','wipe','scramble'],exit:['slice','wipe','glitch'],hold:['still','jitter'],decor:['grid','barcode','brackets'],treat:['none'],cam:['snapPan','push','beatPunch'],fx:['chroma','block'],trans:['blockDissolve','wipe'] },
};
J.register('cam', 'stillCamera', { name: '固定', tags: ['calm', 'editorial'], w: 1, get: () => ({}) });
J.DIRECTION_ARCHETYPES = Object.fromEntries(Object.entries(archetypes).map(([k,v]) => [k,v.name]));
const fit = (input, target, weights) => 1 - traits.reduce((sum,_,i) => sum + weights[i] * Math.abs(input[i] - target[i]), 0) / weights.reduce((a,b)=>a+b,0);
const weights = [1.5,1.4,1.2,1.1,.85,.75,.8,.55,.7,.65];
J.lyricsProfile = (lines, duration) => {
  const lens = lines.map(l=>[...l.text].length), timed = lines.filter(l=>l.lrc != null);
  const gaps = timed.slice(1).map((l,i)=>l.lrc-timed[i].lrc).filter(x=>x>0);
  const normalized = lines.map(l=>l.text.replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase()).filter(Boolean);
  const repeated = normalized.length ? 1-new Set(normalized).size/normalized.length : 0;
  const nonLexical = avg(normalized.map(s=>+( /^(?:ラ|ら|lal?|oh|オ|お|ア|あ|レ|れ){3,}$/iu.test(s) || /^(.)\1{3,}$/u.test(s))));
  const words = normalized.join(' ');
  // Detect a player-name phrase from lyric structure rather than a roster of
  // hard-coded players. This stays useful for clubs and songs JIZURA has never
  // seen, while avoiding generic honorifics such as 「くん」「ちゃん」.
  const playerNamePhrase = /(?:フォルツァ|がんばれ|ガンバレ)([\p{Script=Han}]{2,4})|([\p{Script=Han}]{2,4})(?:アレー|アレ|ー)/u;
  const nameSignal = lines.some(line => playerNamePhrase.test(line.text.replace(/[\s\p{P}\p{S}]/gu,'')));
  return { lines:lines.length, averageLength:avg(lens), shortRatio:avg(lens.map(x=>+(x<=6))), longRatio:avg(lens.map(x=>+(x>=19))),
    lineDensity:clamp(lines.length*60/Math.max(1,duration)/30), silentRatio:avg(gaps.map(x=>clamp((x-5)/9))),
    repeatRatio:repeated, nonLexical, nameSignal,
    teamSignal:/(?:ガンバ|チームコール|大阪|アレー|アレアレ)/u.test(words), timed:timed.length===lines.length };
};
J.classifySong = (lyrics, music, duration) => {
  const m=music||{}, repetition=lyrics.repeatRatio, short=lyrics.shortRatio;
  const pulse=clamp((m.beatStrength??.35)*.4+(m.onsetDensity??m.density??.35)*.35+(m.percussive??.4)*.25);
  const steady=1-clamp(m.sectionContrast??m.development??.3);
  const chant=clamp(repetition*.52+short*.17+pulse*.15+steady*.12+lyrics.nonLexical*.15+(duration<90?.08:0)-lyrics.longRatio*.25);
  const chantLike=lyrics.lines>=2 && (short>=.35 || lyrics.averageLength<=9&&repetition>.6 || lyrics.nonLexical>.35 || lyrics.teamSignal && lyrics.averageLength<=16) &&
    ((m.sectionContrast??.3)<.62 || short>.55 || lyrics.nonLexical>.35 || lyrics.teamSignal) &&
    (chant>=.48 || repetition>=.54&&short>=.35);
  let type;
  if(chantLike) type=lyrics.nameSignal?'PLAYER_CHANT':lyrics.teamSignal&&lyrics.lines<=8?'TEAM_CALL':'CHANT';
  else if ((m.sectionContrast??.3)>.56 && (m.energy??.4)>.58) type='ANTHEM';
  else if ((m.energy??.4)>.72 && pulse>.58) type='AGGRESSIVE';
  else if ((m.energy??.4)<.33 && (m.smoothness??.5)>.55) type='BALLAD';
  else if ((m.sectionContrast??.3)>.52 && (m.bass??.35)>.5) type='EPIC';
  else if ((m.energy??.4)>.57 && (m.brightness??.4)>.5) type='POP';
  else if ((m.smoothness??.5)>.63 && (m.energy??.4)<.48) type='EMOTIONAL';
  else type='GENERAL_SONG';
  return {type, chantScore:round(chant), pulse:round(pulse), confidence:round(Math.abs(chant-.48)*.8+.5)};
};
const imageVector = i => ({ lightness:clamp(i?.median ?? .5), chroma:clamp((i?.chroma ?? .25)*1.8), warmth:clamp(i?.warmth ?? .5), contrast:clamp((i?.contrast ?? .35)*1.4),
  detail:clamp((i?.detail ?? .18)*2), edgeDensity:clamp((i?.edgeDensity ?? i?.detail ?? .18)*2), negativeSpace:clamp(i?.negativeSpace ?? .5),
  visualCenterX:clamp(i?.visualCenterX ?? .5),visualCenterY:clamp(i?.visualCenterY ?? .5), spaceLeft:clamp(i?.spaceLeft ?? .5),spaceRight:clamp(i?.spaceRight ?? .5),
  spaceCenter:clamp(i?.spaceCenter ?? .5),spaceTop:clamp(i?.spaceTop ?? .5),spaceBottom:clamp(i?.spaceBottom ?? .5), dominantHue:clamp(i?.dominantHue ?? 0),hueSpread:clamp(i?.hueSpread ?? 0) });
const moodTargets = { glitch:[.92,.9,.72,.22], calm:[.24,.17,.24,.72], pop:[.78,.7,.3,.74],graphic:[.64,.65,.8,.43],editorial:[.27,.2,.48,.65],emotional:[.52,.42,.46,.64] };
const scoreTarget = (input, target) => 1 - input.reduce((sum,v,i)=>sum+Math.abs(v-target[i]),0)/input.length;
const rank = scores => Object.keys(scores).sort((a,b)=>scores[b]-scores[a] || a.localeCompare(b));
const chooseVocabulary = (project, a, image, lyric) => {
  const enabled = {};
  for (const g of J.GROUP_KEYS) {
    const candidates = J.order(g).filter(k=>!(J.registry(g)[k]||{}).special && J.randomOk(project,g,k));
    const curated = (a[g]||[]).filter(k=>candidates.includes(k));
    const tag = J.taggedWith(g,a.mood).filter(k=>candidates.includes(k) && !curated.includes(k));
    const limits = {layout:6,enter:5,exit:4,hold:3,decor:4,treat:2,bg:1,cam:3,fx:4,trans:2};
    const selected = [...curated,...tag.slice(0,Math.max(0,(limits[g]||3)-curated.length))].slice(0,limits[g]||3);
    if (g==='layout') {
      if (image.spaceRight > image.spaceLeft+.12) selected.unshift('gloss','type');
      if (image.spaceLeft > image.spaceRight+.12) selected.unshift('gloss','type');
      if (image.spaceCenter < .42) for(const k of ['center','huge','ring']) { const i=selected.indexOf(k); if(i>=0) selected.splice(i,1); }
      if(lyric.longRatio>.45) for(const k of ['marquee','scatter','ring','tile']) {const i=selected.indexOf(k);if(i>=0)selected.splice(i,1);}
    }
    const valid = [...new Set(selected)].filter(k=>candidates.includes(k)).slice(0,limits[g]||3);
    if(g==='layout'&&Math.abs(image.spaceLeft-image.spaceRight)>.12){
      for(const k of ['center','huge','ring','tile']){const i=valid.indexOf(k);if(i>=0)valid.splice(i,1);}
    }
    const fallback={layout:'center',enter:'cut',exit:'cut',hold:'still',treat:'none',bg:'none',cam:'push'}[g];
    if (!valid.length && fallback && J.registry(g)[fallback]) valid.push(fallback);
    if(g==='bg'&&J.registry(g).none&&!valid.includes('none'))valid.push('none');
    for(const override of Object.values(project.overrides||{})) if(override.lock&&override[g]&&candidates.includes(override[g])&&!valid.includes(override[g]))valid.push(override[g]);
    enabled[g]=Object.fromEntries(J.order(g).map(k=>[k,valid.includes(k)]));
  }
  if(project.customBg?.enabled) for(const k of Object.keys(enabled.bg)) enabled.bg[k]=k==='none';
  return enabled;
};
J.proposeDirection = (project,audio,imageStats,variant=0) => {
  variant=Math.max(0,Math.min(2,variant|0));
  const lines=J.parseLyrics(project.lyrics).lines;
  if(!lines.length) throw new Error('先に歌詞を入力してください');
  const music=audio?.features||null, image=imageStats||null;
  if(!music&&!image) throw new Error('背景画像か曲を読み込んでください');
  const lyrics=J.lyricsProfile(lines,audio?.duration||Math.max(20,lines.length*3));
  const img=imageVector(image), m=music||{};
  const energy=clamp(m.energy??m.intensity??.45), tempo=clamp(m.tempo??((m.bpm||105)-65)/115), rhythm=clamp(.42*tempo+.34*(m.onsetDensity??m.density??.35)+.24*(m.beatStrength??.4));
  const input=[energy,rhythm,1-img.lightness,img.chroma,img.warmth,img.detail,img.negativeSpace,lyrics.longRatio,clamp(m.sectionContrast??m.development??m.dynamics??.35),clamp(m.bass??.35)];
  const timbre={digital:.09*(clamp(m.percussive??.5)-.5)+.08*(clamp(m.spectralFlux??.5)-.5)+.04*(clamp(m.brightness??.5)-.5),
    dreamy:.09*(clamp(m.smoothness??.5)-.5)-.03*(clamp(m.brightness??.5)-.5),
    rawRock:.08*(clamp(m.percussive??.5)-.5)+.04*(clamp(m.brightness??.5)-.5),
    organic:.1*(clamp(m.smoothness??.5)-.5),darkGraphic:.06*(clamp(m.bass??.5)-.5)};
  const scores=Object.fromEntries(Object.entries(archetypes).map(([k,a])=>[k,round(fit(input,a.traits,weights)+(timbre[k]||0))]));
  // Coherent but distinctive: prefer the closest multi-axis archetype, without history or randomness.
  const ordered=rank(scores), key=ordered[0], a=archetypes[key];
  const classification=J.classifySong(lyrics,m,audio?.duration||Math.max(20,lines.length*3));
  const chant=/CHANT|TEAM_CALL/.test(classification.type);
  const styleInput=[input[2],img.chroma,img.warmth,clamp(img.contrast*.65+img.detail*.35)];
  const decision=J.rankStyles(project,music,image,lyrics,{archetype:key,mood:a.mood,classification});
  const styleScores=Object.fromEntries(decision.candidates.map(c=>[c.style,c.score]));
  const styleOrder=rank(styleScores),style=styleOrder[variant]||styleOrder[0]||J.STYLE_ORDER[0];
  const moodInput=[energy,rhythm,img.detail,clamp(img.warmth*.45+(1-img.detail)*.3+(m.smoothness??.4)*.25)];
  const moodScores=Object.fromEntries(Object.keys(moodTargets).map(k=>[k,round(.55*scoreTarget(moodInput,moodTargets[k])+.45*(k===a.mood?1:0))]));
  const mood=rank(moodScores)[0];
  const enabled=chooseVocabulary(project,a,img,lyrics);
  const spatial=img.spaceRight>img.spaceLeft+.12?'right':img.spaceLeft>img.spaceRight+.12?'left':img.spaceCenter>Math.max(img.spaceLeft,img.spaceRight)+.08?'center':'balanced';
  // Pick one readable song-wide anchor family from image space and lyric length.
  // "type" is a calm left-aligned setting; it does not reveal characters one by one.
  const useEditorialAnchor=spatial==='left'||spatial==='right'||lyrics.longRatio>.22&&img.detail>.58;
  const chantLayout=useEditorialAnchor?'type':'center';
  const songLayout=chant?chantLayout:(['editorial','organic'].includes(key)&&lyrics.longRatio>.38||useEditorialAnchor?'type':'center');
  const grammar={layout:[songLayout],
    enter:chant?(energy>.66&&rhythm>.55?['zoom']:['wipe']):energy>.7?['wipe','zoom']:['blur','wipe'],
    exit:['wipe'],hold:chant?['still','breathe']:['breathe'],cam:['push'],trans:[],decor:[],fx:[],treat:['none'],bg:['none']};
  for(const [group,allowed] of Object.entries(grammar))for(const k of Object.keys(enabled[group]||{}))enabled[group][k]=allowed.includes(k);
  if(chant)enabled.enter.wipe=true;
  if(variant){
    const layout=Object.keys(enabled.layout).filter(k=>enabled.layout[k]);
    const camera=Object.keys(enabled.cam).filter(k=>enabled.cam[k]);
    // Deliberate, bounded alternatives: a different typographic space and camera within the same mood.
    const selectedLayout=chant?layout:layout.filter((_,i)=>i%2===(variant-1)%2);
    if(selectedLayout.length)for(const k of layout)enabled.layout[k]=selectedLayout.includes(k);
    if(camera.length>1){const chosen=camera[Math.min(variant,camera.length-1)];for(const k of camera)enabled.cam[k]=k===chosen;}
  }
  const strategy=a.strategy.slice(); if(spatial==='right'||spatial==='left') strategy[0]=`${a.strategy[0]}${spatial==='right'?'Right':'Left'}`;
  if(lyrics.longRatio>.42)strategy[1]='editorialTypesetting'; else if(lyrics.shortRatio>.6 && energy>.6)strategy[1]='impactWords';
  const visualDNA={archetype:key,style,mood,variant,layoutStrategy:strategy[0],typographyStrategy:strategy[1],motionStrategy:strategy[2],cameraStrategy:strategy[3],transitionStrategy:strategy[4],decorationStrategy:strategy[5],spatialBias:spatial};
  const motionDNA=J.buildMotionDNA(m,lyrics,img,classification,visualDNA,audio);
  Object.assign(visualDNA,{readabilityPriority:chant?1:.85,cameraStyle:motionDNA.cameraMode,typographyStyle:motionDNA.font,transitionStyle:motionDNA.entranceMotion,backgroundTreatment:'image-preserving',
    motionVocabulary:[motionDNA.entranceMotion,motionDNA.sustainMotion,motionDNA.cameraMode],lyricPlacementStyle:spatial,layoutFamily:songLayout,decorationAmount:chant?0:.08,contrastStrategy:'local-shadow',motionSignature:motionDNA.signature});
  for(const k of Object.keys(enabled.enter))enabled.enter[k]=k===motionDNA.entranceMotion;
  for(const k of Object.keys(enabled.exit))enabled.exit[k]=k===motionDNA.exitMotion;
  for(const k of Object.keys(enabled.cam))enabled.cam[k]=k===motionDNA.cameraKey;
  const motion=chant?clamp(.14+energy*.16+rhythm*.14):clamp(.12+energy*.47+rhythm*.35), density=chant?clamp(.12+rhythm*.12):clamp(.18+rhythm*.36+lyrics.lineDensity*.25-lyrics.longRatio*.15);
  const fx=Object.assign({},project.fx,{motion:round(motion),density:round(density),glitch:0,
    chroma:0,decor:0,texture:round(.12+img.detail*.1),bgSwitch:0,
    flash:false,koma:0,onTwos:false,hud:'off'});
  if(chant)Object.assign(fx,{glitch:0,chroma:0,decor:0,flash:false,koma:0,onTwos:false,texture:Math.min(fx.texture,.22)});
  if(variant===1)Object.assign(fx,{motion:round(motion*.74),decor:round(fx.decor*.56),density:round(density*.78)});
  if(variant===2)Object.assign(fx,{motion:round(Math.min(.7,motion*1.13)),decor:round(fx.decor*.8),density:round(Math.min(.7,density*1.07))});
  visualDNA.type=classification.type;
  Object.assign(visualDNA,{energy:round(energy),aggression:round(rhythm*(m.percussive??.4)),emotion:round((m.smoothness??.5)*(m.sectionContrast??.3)),
    epicness:round((m.bass??.35)*.5+(m.sectionContrast??.3)*.5),warmth:img.warmth,contrast:img.contrast,density:round(density),motionAmount:round(motion),
    beatResponse:classification.pulse,sectionIntensity:round(m.sectionContrast??.3),colorStrategy:img.chroma>.4?'imagePalette':'neutral'});
  const signature=JSON.stringify([project.lyrics,img,music&&[m.bpm,m.energy,m.density,m.sectionContrast,(m.timeline||[]).map(x=>[x.energy,x.density])],visualDNA,variant]);
  let seed=2166136261;for(const c of signature)seed=Math.imul(seed^c.charCodeAt(0),16777619)>>>0;
  const confidence=round(clamp(.5+(scores[key]-scores[ordered[1]])*2));
  const debug={styleDecision:decision,audio:music?{...music,timeline:music.timeline||[]}:null,image:img,lyrics,classification,archetypeScores:scores,styleScores,moodScores,selected:visualDNA,confidence,
    reasons:[`音量 ${round(energy)} / リズム ${round(rhythm)}`,`画像の明度 ${round(img.lightness)} / 彩度 ${round(img.chroma)} / 余白 ${round(img.negativeSpace)}`,`歌詞密度 ${round(lyrics.lineDensity)} / 長文率 ${round(lyrics.longRatio)}`]};
  J.lastAutoDirectionDebug=debug;
  return {style,mood,fx,enabled,seed,visualDNA,motionDNA,debug,overrides:Object.fromEntries(Object.entries(project.overrides||{}).filter(([,v])=>v.lock)),
    summary:`${classification.type} · ${J.STYLES[style].name} × ${J.MOODS[mood].name}`,
    signals:{image:!!image,audio:!!music,lyricLines:lines.length,lyricDensity:round(lyrics.lineDensity),tempo:music?.bpm??null}};
};
J.visualDNASimilarity=(a,b)=>{
  const keys=['archetype','style','mood','layoutStrategy','typographyStrategy','motionStrategy','cameraStrategy','transitionStrategy','decorationStrategy','spatialBias'];
  const weights=[2,1.5,1,1.5,1,1.25,1.25,.9,.8,.5];
  return round(keys.reduce((s,k,i)=>s+weights[i]*+(a[k]===b[k]),0)/weights.reduce((s,x)=>s+x,0));
};
J.makeArtDirection=(project,audio,proposal)=>{
  const duration=Math.max(1,audio?.duration||J.computeTiming(project,J.parseLyrics(project.lyrics),null).duration);
  const lyrics=J.parseLyrics(project.lyrics).lines, timeline=audio?.features?.timeline||[];
  const n=Math.max(1,Math.ceil(duration/3)), rate=audio?.energyRate||50;
  const repeated=new Map();lyrics.forEach(l=>repeated.set(l.text,(repeated.get(l.text)||0)+1));
  const base=audio?.features?.energy??audio?.features?.intensity??.4;
  const raw=Array.from({length:n},(_,i)=>{
    const start=i*duration/n,end=(i+1)*duration/n;
    const samples=timeline.filter(x=>x.time>=start&&x.time<end), e=samples.length?avg(samples.map(x=>x.energy)):audio?.energy?.length?
      avg(Array.from(audio.energy.slice(Math.floor(start*rate),Math.min(audio.energy.length,Math.ceil(end*rate))))):base;
    const rhythm=samples.length?avg(samples.map(x=>x.density)):audio?.features?.density??.2;
    const lines=lyrics.filter(l=>l.lrc!=null&&l.lrc>=start&&l.lrc<end);
    return clamp(.07+e*.69+rhythm*.13+(lines.some(l=>repeated.get(l.text)>1)? .045:0)+Math.min(.05,lines.length*.015),.06,.97);
  });
  const contrast=clamp(audio?.features?.sectionContrast??audio?.features?.development??.3);
  const curve=raw.map((v,i)=>round(clamp(v*(.89+.11*contrast)+avg([raw[Math.max(0,i-1)],raw[Math.min(n-1,i+1)]])*.11*contrast,.08,.98)));
  const localPeaks=curve.map((v,i)=>({i,v})).filter(({i,v})=>v>.52&&v>=curve[Math.max(0,i-1)]&&v>=curve[Math.min(n-1,i+1)]).sort((a,b)=>b.v-a.v);
  const budget=Math.max(1,Math.min(8,Math.round(1+duration/45*contrast+base*2)));
  const peaks=[];for(const p of localPeaks){if(peaks.every(i=>Math.abs(i-p.i)>=2)){peaks.push(p.i);if(peaks.length>=budget)break;}}
  const first=lyrics.find(l=>l.lrc!=null)?.lrc??0,last=[...lyrics].reverse().find(l=>l.lrc!=null)?.lrc??duration;
  const sectionProfiles=curve.map((intensity,i)=>{
    const start=+(i*duration/n).toFixed(3),end=+((i+1)*duration/n).toFixed(3);
    const prev=curve[Math.max(0,i-1)],next=curve[Math.min(n-1,i+1)];
    let type=end<=first&&first>2?'intro':start>last+5?'outro':intensity<.29?'break':intensity>.66?'chorus':intensity>prev+.1&&next>intensity?'preChorus':'verse';
    if(type==='chorus'&&start>duration*.65&&peaks.includes(i))type='finalChorus';
    return {start,end,type,intensity,majorEvent:peaks.includes(i),textScale:round(.85+intensity*.32),motionScale:round(.55+intensity*.85),decorationScale:round(.28+intensity*.8)};
  });
  const vocabulary=Object.fromEntries(J.GROUP_KEYS.map(g=>[g,J.order(g).filter(k=>proposal.enabled[g]?.[k])]));
  const f=J.STYLES[proposal.style].fonts;
  const typography={display:proposal.motionDNA?.font||f.display[0],serif:f.serif[0],body:f.body[0]};
  return {version:5,style:proposal.style,mood:proposal.mood,visualDNA:proposal.visualDNA,motionDNA:proposal.motionDNA,confidence:proposal.debug.confidence,palette:project.autoPalette?.enabled?Object.assign({},project.autoPalette.palette):null,
    typography,vocabulary,layoutLanguage:vocabulary.layout,motionLanguage:{base:proposal.fx.motion,koma:proposal.fx.koma,enters:vocabulary.enter,exits:vocabulary.exit},
    cameraLanguage:vocabulary.cam,fxLanguage:{allowed:vocabulary.fx,budget:proposal.fx.glitch},decorationLanguage:{allowed:vocabulary.decor,budget:proposal.fx.decor},
    transitionLanguage:vocabulary.trans,intensityCurve:curve,sectionProfiles,visualEventBudget:budget,peakIndices:peaks,duration};
};
J.validArtDirection=(d,p)=>!!(d&&[1,2,3,4,5].includes(d.version)&&d.style===p.style&&d.mood===p.mood&&d.vocabulary&&Array.isArray(d.vocabulary.layout)&&Array.isArray(d.sectionProfiles)&&d.sectionProfiles.length);
J.directionSection=(d,t)=>d?.sectionProfiles?.[Math.max(0,Math.min(d.sectionProfiles.length-1,Math.floor(Math.max(0,t)/Math.max(1,d.duration)*d.sectionProfiles.length)))];
J.selectLyricPlacement=(project,W,H)=>{
  const portrait=H>W,stats=project.autoPalette?.stats,map=project.autoPalette?.localMap;
  if(!stats)return {x:.5,y:portrait ? .52 : .56,maxWidth:portrait ? .82 : .75,subjectOverlap:0};
  const wide=!!project.lyricPlacementWide;
  const preference=project.artDirection?.motionDNA?.placementBias;
  const lyrics=J.parseLyrics(project.lyrics||'').lines, longest=Math.max(1,...lyrics.map(l=>[...l.text].length));
  const slots=portrait?[[.5,.43],[.5,.54],[.5,.62]]:wide?[[.5,.66],[.5,.43],[.28,.56],[.72,.56]]:[[.28,.56],[.72,.56],[.5,.66],[.5,.44]];
  const ranked=slots.map(([x,y])=>{
    const w=portrait?.78:Math.min(wide?.84:.72,Math.max(.46, longest/28));
    const sample=map&&J.sampleLocalLuma?J.sampleLocalLuma(map,x,y,Math.max(2,Math.ceil(w*5)),portrait?3:2):{detail:0,luma:.4};
    const sx=stats?.visualCenterX??.5,sy=stats?.visualCenterY??.5;
    const subject=Math.exp(-((x-sx)**2/.036+(y-sy)**2/.03));
    const side=x<.4?stats?.spaceLeft??.5:x>.6?stats?.spaceRight??.5:stats?.spaceCenter??.5;
    const centerPenalty=project.artDirection?.visualDNA?.type?.includes('CHANT')&&subject>.55?.32:0;
    const subjectBoxPenalty=subject*Math.min(.45,.08+longest/80);
    return {x,y,score:(side||0)*.6-(sample.detail||0)*.8-subjectBoxPenalty-centerPenalty+(y>.6 ? .08 : 0)+
      (preference==='lower'&&y>.6 ? .1 : preference==='side'&&x!==.5 ? .08 : 0)};
  }).sort((a,b)=>b.score-a.score);
  const best=ranked[0];return {x:best.x,y:best.y,maxWidth:portrait ? .82 : wide ? .84 : best.x===.5 ? .75 : .48,
    subjectOverlap:stats?Math.exp(-((best.x-stats.visualCenterX)**2/.036+(best.y-stats.visualCenterY)**2/.03)):0};
};
J.inspectDirection=plan=>{
  const d=plan.artDirection;if(!d)return {coherent:true,violations:[]};
  const violations=[];if(plan.styleKey!==d.style)violations.push('style');
  for(const cut of plan.cuts.filter(c=>c.line>=0&&c.layout!=='interlude')){
    for(const g of ['layout','enter','exit','hold','bg','cam','treat','trans'])
      if(cut[g]&&!d.vocabulary[g]?.includes(cut[g])&&!(g==='enter'||g==='exit')&&cut[g]!=='cut')violations.push(g);
    if(cut.scheme!==0)violations.push('palette');
  }
  return {coherent:!violations.length,violations:[...new Set(violations)],vocabularySize:Object.values(d.vocabulary).reduce((s,a)=>s+a.length,0)};
};
J.auditDirectionRealization=(plan,rendered=null)=>{
  const d=plan?.artDirection,errors=[],warnings=[];if(!d||!d.motionDNA)return {ok:false,errors:['missing_direction'],warnings,metrics:{}};
  const md=d.motionDNA,expected=md.cameraKey,allowed=d.vocabulary?.cam||[],cuts=(plan.cuts||[]).filter(c=>c.line>=0&&c.layout!=='interlude');
  if(!expected||!allowed.includes(expected))errors.push('camera_not_enabled');
  if(cuts.some(c=>!allowed.includes(c.cam)))errors.push('planned_camera_outside_vocabulary');
  if(cuts.some(c=>!d.vocabulary?.layout?.includes(c.layout)))errors.push('planned_layout_outside_vocabulary');
  const layoutCount=new Set(cuts.map(c=>c.layout)).size;if(layoutCount>(plan.motionDirector5?7:3))errors.push('too_many_layout_families');
  const samples=[0,.25,.5,.75,.98].map(u=>J.cameraAt(plan,plan.duration*u));
  const scaleSpan=samples.length?Math.max(...samples.map(x=>x?.s??1))-Math.min(...samples.map(x=>x?.s??1)):0;
  const translationSpan=samples.length?Math.max(...samples.map(x=>Math.hypot((x?.x??0)/plan.W,(x?.y??0)/plan.H))):0;
  const motionEnergy=rendered?.motionEnergy??null;
  if(md.cameraMode==='push'&&scaleSpan<.0025)errors.push('push_camera_not_realized');
  if(md.cameraMode==='drift'&&translationSpan<.002)errors.push('drift_camera_not_realized');
  if(md.cameraMode==='pulse'&&md.beatResponse>.3&&scaleSpan<.0025)errors.push('beat_camera_not_realized');
  if(motionEnergy!=null&&d.visualDNA?.energy>.68&&motionEnergy<.001)warnings.push('high_energy_render_nearly_static');
  const samePhraseCuts=cuts.filter(c=>c.repetitionIndex>0),signature=c=>[c.layout,c.cam,c.enter,c.params?.font,(c.params?.intensityScale??1).toFixed(3)].join('|');
  let streak=0,maxStreak=0,last='';for(const c of samePhraseCuts){const now=signature(c);streak=now===last?streak+1:1;last=now;maxStreak=Math.max(maxStreak,streak);}
  if(maxStreak>=3&&d.visualDNA?.energy>.65)warnings.push('chant_visual_signature_repeats');
  if(rendered&&!rendered.completed)warnings.push('render_pixel_audit_incomplete');
  return {ok:errors.length===0,errors,warnings,metrics:{expectedCamera:expected,allowedCameras:allowed,plannedCameras:[...new Set(cuts.map(c=>c.cam))],layoutFamilies:[...new Set(cuts.map(c=>c.layout))],scaleSpan:+scaleSpan.toFixed(5),translationSpan:+translationSpan.toFixed(5),motionEnergy,maxRepeatedSignature:maxStreak}};
};
/* One screen-space credit placement for the whole movie, cached on the plan. */
J.planTitleDisplay = (project, title, artist, style, W, H, direction, lyricPlacement=null) => {
  const opts = Object.assign({ enabled: true, position: 'auto', opacity: .42, autoColor: true }, project.titleDisplay || {});
  if (!opts.enabled || (!title && !artist)) return null;
  const map = project.autoPalette && project.autoPalette.localMap;
  const portrait = H > W, marginX = W * (portrait ? .075 : .045), marginY = H * (portrait ? .19 : .06);
  const sites = { bl: [marginX / W, 1 - marginY / H], br: [1 - marginX / W, 1 - marginY / H],
    tl: [marginX / W, marginY / H], tr: [1 - marginX / W, marginY / H] };
  const colors = project.autoPalette?.enabled ? project.autoPalette.palette : style.schemes[0];
  const titleSize=Math.max(26,Math.min(W,H)*(portrait?.048:.084)),maxWidth=W*(portrait?.72:.42);
  const titleWidth=Math.min(maxWidth,J.measure?J.measure({text:title||artist,font:style.fonts.body[0],size:titleSize}).w:maxWidth);
  const candidates = Object.entries(sites).map(([key, [x, y]]) => {
    const sample = map && J.sampleLocalLuma ? J.sampleLocalLuma(map,x,y,Math.max(3,Math.ceil(titleWidth/W*12)),3) : { luma: J.paletteLuma ? J.paletteLuma(colors.bg) : .2, detail: 0 };
    const white = '#F6F5F2', black = '#161719';
    const lightContrast = (1.05) / (sample.luma + .05), darkContrast = (sample.luma + .05) / .055;
    const color = opts.autoColor ? (lightContrast >= darkContrast ? white : black) : (colors.fg || white);
    const overlap=lyricPlacement?Math.exp(-((x-lyricPlacement.x)**2/.1+(y-lyricPlacement.y)**2/.08)):0;
    const subject=project.autoPalette?.stats?Math.exp(-((x-project.autoPalette.stats.visualCenterX)**2/.07+(y-project.autoPalette.stats.visualCenterY)**2/.06)):0;
    const safePenalty=portrait&&key[1]==='r'?.24:0;
    return { key, color, score:Math.max(lightContrast,darkContrast)-sample.detail*2.1-overlap*.75-subject*.28-safePenalty, detail:sample.detail,contrast:Math.max(lightContrast,darkContrast) };
  });
  const picked = opts.position !== 'auto' && sites[opts.position] ? candidates.find(c => c.key === opts.position) : candidates.sort((a, b) => b.score - a.score)[0];
  return { title, artist, position: picked.key, color: project.keyBg === 'green' || project.keyBg === 'black' ? '#FFFFFF' : picked.color,
    opacity: J.clamp(Number(opts.opacity)||.54,direction?.5:.42,direction?.68:.6),detail:picked.detail,contrast:picked.contrast,
    marginX, marginY, font: style.fonts.body[0], titleSize,
    maxWidth, W, H };
};
})();
