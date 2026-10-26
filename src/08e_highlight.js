/* LRC-boundary highlight selection. Output is an original-audio interval, never a stitched edit. */
(() => {
'use strict';
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
const mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0;
J.highlightCandidates=(plan,audio,maxSeconds=60)=>{
  if(!audio?.duration||!plan?.lines?.length||!plan.hasTimedLyrics)throw new Error('60秒版には時刻付きLRCと音源が必要です');
  const duration=audio.duration;
  if(duration<=maxSeconds+.1)return [{start:0,end:duration,score:1,reason:'曲全体',complete:true}];
  const lines=plan.lines.filter(l=>Number.isFinite(l.start)&&l.start>=0&&l.start<duration-.2);
  if(!lines.length||lines.some(l=>!Number.isFinite(l.start)))throw new Error('LRCの時刻を読み取れません');
  const starts=[0,...lines.map(l=>l.start)].filter((x,i,a)=>i===0||x>a[i-1]+.1);
  const boundaries=[...new Set([...starts,duration].map(x=>+x.toFixed(3)))].sort((a,b)=>a-b);
  const normalized=lines.map(l=>l.text.replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase());
  const counts=new Map();normalized.forEach(s=>counts.set(s,(counts.get(s)||0)+1));
  const chant=/CHANT|TEAM_CALL/.test(plan.artDirection?.visualDNA?.type||'');
  const timeline=audio.features?.timeline||[];
  const sample=(from,to)=>timeline.filter(v=>v.time>=from-1.5&&v.time<to-1.5);
  const profiles=plan.artDirection?.sectionProfiles||[];
  const candidates=[];
  for(const start of starts){
    if(start>duration-18)continue;
    const ends=boundaries.filter(end=>end>start+Math.min(18,maxSeconds*.55)&&end<=Math.min(duration,start+maxSeconds+.1));
    // A full verse or chant cycle often ends several seconds before 60.
    for(const end of ends){
      if(duration>maxSeconds+10&&end-start<Math.min(38,maxSeconds*.72))continue;
      const selected=lines.filter(l=>l.start>=start-.01&&l.start<end-.01),recent=sample(start,end),before=sample(Math.max(0,start-9),start);
      if(!selected.length)continue;
      const energy=mean(recent.map(v=>v.energy||0)),onsets=mean(recent.map(v=>v.density||0));
      const flux=mean(recent.map(v=>v.spectralFlux||0)),bass=mean(recent.map(v=>v.bass||0));
      const rise=clamp((energy-mean(before.map(v=>v.energy||0)))*2+.3);
      const repeat=mean(selected.map(l=>clamp(((counts.get(l.text.replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase())||1)-1)/3)));
      const memorable=mean(selected.map(l=>clamp(1-[...l.text].length/28)));
      const names=mean(selected.map(l=>+/(?:フォルツァ|ガンバ|[\p{Script=Han}]{2,4}アレー)/u.test(l.text)));
      const sections=profiles.filter(p=>p.start<end&&p.end>start);
      const structural=mean(sections.map(p=>p.type==='finalChorus'||p.type==='chorus'?.9:p.majorEvent?.85:p.intensity||.3));
      const phrase=[...selected].reverse()[0];
      const next=lines.find(l=>l.start>=end-.02);
      const complete=!!next||Math.abs(end-duration)<.15;
      // Repeated chant endings get a bonus when the end closes a complete phrase cycle.
      const cycle=chant&&phrase&&normalized.indexOf(phrase.text.replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase())>=0
        ?clamp(repeat*.65+((selected.length%Math.max(1,new Set(normalized).size))===0?.35:0)):0;
      const beatNear=audio.beats?.length?Math.min(...audio.beats.filter(b=>Math.abs(b-start)<.3).map(b=>Math.abs(b-start)),.3):.15;
      const score=(chant?.20:.29)*energy+.10*onsets+.055*flux+.035*bass+.09*rise+
        (chant?.23:.12)*repeat+.10*memorable+.055*names+.095*structural+(chant?.10:.04)*cycle+
        .045*(1-beatNear/.3)+.045*(complete?1:0)-.12*Math.abs((end-start)-Math.min(maxSeconds,duration)) / maxSeconds;
      candidates.push({start:+start.toFixed(2),end:+end.toFixed(2),score:+score.toFixed(4),reason:chant?'チャントの反復と区切り':'盛り上がりと歌詞の区切り',complete});
    }
  }
  candidates.sort((a,b)=>b.score-a.score||a.start-b.start);
  const picks=[];
  for(const c of candidates){if(picks.every(p=>Math.abs(c.start-p.start)>8)){picks.push(c);if(picks.length>=3)break;}}
  if(!picks.length)throw new Error('LRCの区切りから自然な60秒区間を選べませんでした。時刻を確認してください');
  return picks;
};
})();

(()=>{const C=(x,a=0,b=1)=>J.clamp(x,a,b),avg=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:0,norm=s=>String(s||'').replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase();
J.socialHookCandidates=(plan,audio,minSeconds=12,maxSeconds=15)=>{
 if(!audio?.duration||!plan?.lines?.length||!plan.hasTimedLyrics)throw new Error('15秒版には時刻付きLRCと音源が必要です');
 minSeconds=C(minSeconds,12,15);maxSeconds=C(maxSeconds,minSeconds,15);
 const duration=Math.min(audio.duration,plan.duration||audio.duration),lines=plan.lines.filter(l=>Number.isFinite(l.start)&&l.start>=0&&l.start<duration-.1);
 if(!lines.length)throw new Error('LRCの時刻を読み取れません');
 const bounds=[...new Set([...lines.map(l=>+l.start.toFixed(3)),+duration.toFixed(3)])].sort((a,b)=>a-b),timeline=audio.features?.timeline||[],beats=audio.beats||plan.beats||[];
 const sample=(from,to)=>timeline.filter(v=>v.time>=from&&v.time<to),meanKey=(items,key)=>avg(items.map(v=>C(v[key]||0)));
 const normalized=lines.map(l=>norm(l.text)),freq=new Map();normalized.forEach(s=>freq.set(s,(freq.get(s)||0)+1));
 const candidates=[];
 for(const start of bounds.slice(0,-1)){
  if(start+minSeconds>duration)continue;
  const ends=bounds.filter(e=>e-start>=minSeconds-.02&&e-start<=maxSeconds+.05);
  for(const end of ends){
   const selected=lines.filter(l=>l.start>=start-.01&&l.start<end-.01);if(selected.length<3)continue;
   const all=sample(start,end),first=sample(start,Math.min(end,start+3)),before=sample(Math.max(0,start-6),start);
   const energy=meanKey(all,'energy'),early=meanKey(first,'energy'),density=meanKey(all,'density'),rise=C((early-meanKey(before,'energy'))*1.5+.45);
   const repeats=avg(selected.map(l=>C(((freq.get(norm(l.text))||1)-1)/2))),memorable=avg(selected.map(l=>C(1-[...l.text].length/24)));
   const chant=selected.filter(l=>/ガンバ|アレー|フォルツァ|アレ/u.test(l.text)).length/selected.length;
   const beat=beats.length?Math.min(...beats.map(b=>Math.abs(b-start))):.2;
   const firstStrong=C(early*.7+density*.3),score=.29*energy+.19*firstStrong+.12*rise+.14*repeats+.10*memorable+.11*chant+.05*(1-C(beat/.25))-.025*Math.abs((end-start)-13.5);
   candidates.push({start:+start.toFixed(2),end:+end.toFixed(2),duration:+(end-start).toFixed(2),score:+score.toFixed(4),reason:'冒頭3秒の強さ・チャントの反復・LRC区切り',complete:true,first3Energy:+early.toFixed(3)});
  }
 }
 candidates.sort((a,b)=>b.score-a.score||a.start-b.start);
 const picks=[];for(const c of candidates){if(picks.every(p=>Math.abs(p.start-c.start)>=10)){picks.push(c);if(picks.length===3)break;}}
 if(!picks.length)throw new Error('12〜15秒に収まる自然なLRC区間がありません');
 return picks;
};
})();
