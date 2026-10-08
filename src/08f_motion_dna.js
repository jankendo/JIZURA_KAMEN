/* Deterministic song-level motion, typography and continuous camera direction. */
(() => {
'use strict';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
const avg=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
J.chantSubtype=(lyrics,m,type)=>{
  if(!/CHANT|TEAM_CALL/.test(type))return null;
  if(type==='PLAYER_CHANT')return 'PLAYER_CHANT';
  if(lyrics.nonLexical>.48||lyrics.repeatRatio>.7)return 'REPETITIVE_CHANT';
  if(type==='TEAM_CALL'&&lyrics.lines<=8)return 'SHORT_CALL';
  if((m.sectionContrast??0)>.48&&(m.energy??0)>.55)return 'ANTHEM_CHANT';
  if(lyrics.shortRatio>.55&&(m.beatStrength??0)>.58)return 'MARCH_CHANT';
  if(lyrics.lines>=8&&lyrics.shortRatio>.4&&lyrics.repeatRatio<.45)return 'CALL_RESPONSE';
  return 'MELODIC_CHANT';
};
J.buildMotionDNA=(music,lyrics,image,classification,visualDNA,audio)=>{
  const m=music||{},chant=/CHANT|TEAM_CALL/.test(classification.type),subtype=J.chantSubtype(lyrics,m,classification.type);
  const bpm=clamp(((m.bpm||105)-65)/115),onset=clamp(m.onsetDensity??m.density??.35);
  const beat=clamp(m.beatStrength??.4),energy=clamp(m.energy??.45),flux=clamp(m.spectralFlux??.3);
  const beats=audio?.beats||[],intervals=beats.slice(1).map((v,i)=>v-beats[i]).filter(v=>v>.2&&v<2);
  const spread=intervals.length?Math.sqrt(avg(intervals.map(v=>(v-avg(intervals))**2)))/avg(intervals):.25;
  const stability=clamp(1-spread*2),phraseSeconds=audio?.duration&&lyrics.lines?audio.duration/lyrics.lines:4;
  const shortness=clamp((5-phraseSeconds)/4),dynamics=clamp(m.dynamicRange??m.dynamics??m.sectionContrast??.3),rms=clamp(m.rms??m.energy??.45);
  const speed=clamp(.25*bpm+.2*onset+.16*beat+.14*shortness+.09*energy+.06*stability+.05*dynamics+.05*rms);
  const emotional=clamp((m.smoothness??.5)*.45+(m.sectionContrast??.3)*.35+(1-bpm)*.2);
  const repetition=clamp(lyrics.repeatRatio*.65+lyrics.nonLexical*.25+shortness*.1);
  const scores={
    wipe:.28+.28*speed+.16*onset+.1*(1-image.detail)-.15*(chant&&speed>.65),
    blur:.18+.43*emotional+.16*(1-speed)-.2*(chant&&speed>.62),
    zoom:.13+.26*beat+.24*energy+.16*speed-.28*(lyrics.longRatio>.45)-.1*(image.detail>.7),
  };
  const entrances=Object.keys(scores).sort((a,b)=>scores[b]-scores[a]||a.localeCompare(b));
  const variant=clamp(visualDNA?.variant??0,0,2);
  const alternate=entrances.slice(1).find(k=>scores[entrances[0]]-scores[k]<.28 && !(chant&&speed>.62&&k==='blur'));
  const entrance=variant===1&&alternate ? alternate : entrances[0];
  const fontScores={
    gothic_black:.15+.55*energy+.3*beat+(chant ? .12 : 0)-lyrics.longRatio*.2,
    zenkaku:.15+.36*energy+.32*onset+.15*image.contrast,
    gothic_bold:.3+.23*energy+.14*(1-image.detail),
    gothic_med:.27+.32*lyrics.longRatio+.1*(1-energy),
    round:.12+.43*image.warmth+.24*(m.brightness??.4)+.1*(classification.type==='POP'),
    mincho_bold:.15+.34*emotional+.25*(m.sectionContrast??.3)+.12*(1-chant),
    mincho:.12+.4*emotional+.18*lyrics.longRatio+.1*(1-energy),
    mincho_black:.12+.38*(m.bass??.3)+.27*(m.sectionContrast??.3)+.13*(m.sectionContrast??.3)*energy+.08*(classification.type==='ANTHEM'),
    sansui:.18+.27*lyrics.longRatio+.22*(1-image.chroma)+.12*(1-energy),
  };
  if(chant&&!['ANTHEM_CHANT','MELODIC_CHANT'].includes(subtype))for(const k of ['mincho','mincho_bold','mincho_black'])fontScores[k]-=.45;
  if(subtype==='PLAYER_CHANT')fontScores.zenkaku+=.28;
  if(subtype==='REPETITIVE_CHANT'&&energy>.55)fontScores.gothic_black+=.2;
  const fonts=Object.keys(fontScores).sort((a,b)=>fontScores[b]-fontScores[a]||a.localeCompare(b));
  const alternateFont=fonts.slice(1).find(k=>fontScores[fonts[0]]-fontScores[k]<.24 && !(chant&&!['ANTHEM_CHANT','MELODIC_CHANT'].includes(subtype)&&k.startsWith('mincho')));
  const font=variant===2&&alternateFont ? alternateFont : fonts[0];
  const beatResponse=clamp(beat*.48+onset*.27+repetition*.18+flux*.07)*(chant?1:.72);
  const mainCamera=chant ? (subtype==='REPETITIVE_CHANT' ? (beatResponse>.42?'pulse':'push') :
    subtype==='SHORT_CALL' ? (beat>.48?'push':'hold') :
    subtype==='PLAYER_CHANT' ? (beatResponse>.43?'pulse':'push') :
    subtype==='MARCH_CHANT' ? (stability>.55?'pulse':'push') :
    subtype==='ANTHEM_CHANT' ? ((m.sectionContrast??0)>.5?'push':'drift') :
    subtype==='CALL_RESPONSE' ? 'push' : beatResponse>.45?'push':'drift') :
    (m.sectionContrast??0)>.65&&(m.bass??0)>.55?'push':emotional>.62?'drift':beat>.68&&energy>.7?'pulse':image.detail>.7?'hold':'push';
  const cameraMode=variant===2 ? (mainCamera==='hold'?'push':mainCamera==='drift'?'push':chant&&mainCamera==='pulse'?'push':'drift') : mainCamera;
  const cameraKey=({hold:'stillCamera',push:'push',drift:image.spaceLeft>image.spaceRight?'panL':'panR',pulse:'beatPunch'})[cameraMode]||'push';
  const repetitionBehavior=subtype==='REPETITIVE_CHANT'?'holdPulse':subtype==='PLAYER_CHANT'?'microPush':subtype==='MARCH_CHANT'?'beatPunch':subtype==='SHORT_CALL'?'scaleAccent':subtype==='CALL_RESPONSE'?'positionAccent':'microPush';
  const repetitionStrength=clamp(.28+repetition*.42+beatResponse*.3);
  return {subtype,fontCategory:J.FONTS[font].kind,font,entranceMotion:entrance,sustainMotion:beatResponse>.35?'beatPulse':'breathe',exitMotion:chant?'wipe':'wipe',
    beatResponse:+beatResponse.toFixed(3),motionSpeed:+speed.toFixed(3),motionAmplitude:+clamp(.45+energy*.35+beat*.2).toFixed(3),
    cameraMode,cameraKey,cameraSpeed:+clamp(.32+speed*.55).toFixed(3),cameraDirection:image.spaceLeft>image.spaceRight ? -1 : 1,
    phraseChangeBehavior:entrance,repetitionBehavior,repetitionStrength:+repetitionStrength.toFixed(3),climaxIntensity:+clamp(1+.22*(m.sectionContrast??.3),1,1.25).toFixed(3),
    transitionDuration:+clamp((chant ? .32 : .55)-speed*(chant ? .19 : .25),chant ? .1 : .2,chant ? .35 : .55).toFixed(3),
    motionEasing:speed>.62?'easeOutCubic':'easeInOutCubic',placementBias:emotional>.55?'lower':'side',
    score:{entrance:scores,font:fontScores},signature:[font,entrance,cameraMode,beatResponse>.48?'pulse':'breath',subtype||classification.type].join('|')};
};
J.motionEnergyAt=(direction,t)=>{
  const curve=direction?.intensityCurve||[];if(!curve.length)return .45;
  const at=clamp(t/Math.max(.01,direction.duration))*Math.max(0,curve.length-1),i=Math.floor(at),a=at-i;
  const s=a*a*(3-2*a);return (curve[i]||0)*(1-s)+(curve[Math.min(curve.length-1,i+1)]||0)*s;
};
J.cameraAt=(plan,t,range=null)=>{
  const d=plan.artDirection?.motionDNA;if(!d)return null;
  const from=range?.start??0,dur=Math.max(.001,(range?.end??plan.duration)-from),u=clamp((t-from)/dur),cycles=Math.max(1,Math.round(dur/(d.cameraSpeed>.65?65:95))),cycle=Math.PI*2*cycles*u;
  const energy=J.motionEnergyAt(plan.artDirection,t);
  const amplitude=(d.cameraMode==='hold' ? .004 : d.cameraMode==='drift' ? .013 : d.cameraMode==='pulse' ? .019 : .022)*d.cameraSpeed*(.78+energy*.32);
  const amp=amplitude;
  const taper=Math.sin(Math.PI*u)**2;
  const x=plan.W*amp*Math.sin(cycle)*d.cameraDirection*(d.cameraMode==='drift' ? 1.3 : 1);
  const y=plan.H*amp*(d.cameraMode==='drift' ? .85 : .45)*Math.sin(cycle+Math.PI/3)*taper;
  let s=d.cameraMode==='hold' ? 1+amp*.28*taper : 1+amp*(.5-.5*Math.cos(cycle))*(d.cameraMode==='drift' ? .28 : .62+energy*.38);
  if(d.cameraMode==='pulse'&&plan.beats?.length){
    let lo=0,hi=plan.beats.length-1,prev=-1;
    while(lo<=hi){const mid=(lo+hi)>>1;if(plan.beats[mid]<=t){prev=mid;lo=mid+1;}else hi=mid-1;}
    if(prev>=0){
      const beatStart=plan.beats[prev],beatEnd=plan.beats[prev+1]??(beatStart+60/(plan.bpm||120));
      const phase=clamp((t-beatStart)/Math.max(.2,beatEnd-beatStart));
      s+=.009*d.beatResponse*(.5+.5*Math.cos(Math.PI*2*phase))*taper;
    }
  }
  return {s,x,y,rot:0};
};
J.motionSignature=plan=>{
  const d=plan.artDirection?.motionDNA,p=plan.lyricPlacement;
  return d?{font:d.font,placement:p?`${Math.round(p.x*10)}:${Math.round(p.y*10)}`:'center',entrance:d.entranceMotion,
    sustain:d.sustainMotion,exit:d.exitMotion,camera:d.cameraMode,beatResponse:Math.round(d.beatResponse*5)/5}:null;
};
J.auditMotionDiversity=(plans,features)=>{
  const out=[];
  for(let i=0;i<plans.length;i++)for(let j=i+1;j<plans.length;j++){
    const a=J.motionSignature(plans[i]),b=J.motionSignature(plans[j]);if(!a||!b)continue;
    const m=features[i]||{},n=features[j]||{};
    const distance=avg(['energy','onsetDensity','beatStrength','sectionContrast','spectralFlux','bass'].map(k=>Math.abs((m[k]??.5)-(n[k]??.5))));
    if(distance>.23&&JSON.stringify(a)===JSON.stringify(b))out.push({a:i,b:j,distance:+distance.toFixed(3),issue:'same_motion_bias'});
  }
  return out;
};
J.loopQuality=(plan,audio,range=null)=>{
  const start=range?.start??0,end=range?.end??plan.duration,a=J.cameraAt(plan,start,range),b=J.cameraAt(plan,end,range);
  const cameraDifference=a&&b?Math.abs(a.s-b.s)+Math.abs(a.x-b.x)/plan.W+Math.abs(a.y-b.y)/plan.H:0;
  const timeline=audio?.features?.timeline||[];
  const first=timeline.find(x=>x.time>=start),last=[...timeline].reverse().find(x=>x.time<=end);
  const audioDifference=first&&last?Math.abs((first.energy??0)-(last.energy??0)):0;
  return {cameraDifference,audioDifference,score:clamp(1-cameraDifference*6-audioDifference*.8)};
};
})();
