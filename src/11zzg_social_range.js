/* Optional short selection: original audio interval, exact supplied lyric times. */
(()=>{'use strict';const J=window.J;
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,Number.isFinite(x)?x:a));
const mean=a=>a.length?a.reduce((s,x)=>s+x,0)/a.length:0;
const norm=s=>String(s||'').normalize('NFKC').replace(/[\s\p{P}\p{S}]/gu,'').toLowerCase();
J.socialHookCandidates=(plan,audio,minSeconds=12,maxSeconds=15)=>{
 if(!Number.isFinite(audio?.duration)||!plan?.hasTimedLyrics||!plan?.lines?.length)throw Error('短いSNS版には時刻付き歌詞と音源が必要です');
 const min=clamp(minSeconds,12,15),max=clamp(maxSeconds,min,15),duration=Math.min(audio.duration,Number.isFinite(plan.duration)?plan.duration:audio.duration);
 if(plan.lines.some(l=>String(l.text||'').trim()&&(!Number.isFinite(l.start)||!Number.isFinite(l.visEnd??l.end)||(l.visEnd??l.end)<=l.start)))throw Error('歌詞の表示時刻を確認してください');
 const lines=plan.lines.filter(l=>String(l.text||'').trim()&&Number.isFinite(l.start)&&l.start>=0&&l.start<duration&&Number.isFinite(l.visEnd??l.end)&&(l.visEnd??l.end)>l.start).map(l=>({...l,displayEnd:l.visEnd??l.end}));
 if(!lines.length||lines.some((l,i)=>i&&l.start<lines[i-1].start))throw Error('歌詞の表示時刻を確認してください');
 const texts=lines.map(l=>norm(l.text)),counts=new Map();texts.forEach(t=>counts.set(t,(counts.get(t)||0)+1));
 let block=0;for(let n=2;n<=lines.length/2;n++)if(lines.length%n===0&&texts.every((t,i)=>t===texts[i%n])){block=n;break;}
 const timeline=audio.features?.detailedTimeline||audio.features?.timeline||[],energy=(from,to,key='energy')=>mean(timeline.filter(f=>f.time>=from&&f.time<to).map(f=>clamp(f[key]||0)));
 const candidates=[];
 for(let i=0;i<lines.length;i++){
  const start=lines[i].start;
  // An overlapping earlier lyric is still a held phrase. Do not begin inside it.
  if(lines.slice(0,i).some(l=>l.start<start&&l.displayEnd>start+1e-6))continue;
  for(let j=i;j<lines.length;j++){
   const selected=lines.slice(i,j+1),heldEnd=Math.max(...selected.map(l=>l.displayEnd));
   if(heldEnd-start>max+1e-6)break;
   const next=lines[j+1]?.start;
   // Use a following onset only for an adjacent phrase; a long empty tail adds no lyric content.
   const endings=[heldEnd];if(Number.isFinite(next)&&next>=heldEnd&&next-heldEnd<=.45)endings.push(next);
   for(const end of [...new Set(endings)]){
    const length=end-start;if(length<min-1e-6||length>max+1e-6||end>duration+1e-6)continue;
    if(lines.some(l=>l.start<end-1e-6&&l.start>=start&&l.displayEnd>end+1e-6))continue;
    const repeat=mean(selected.map(l=>clamp(((counts.get(norm(l.text))||1)-1)/2))),wholeBlock=!!(block&&i%block===0&&(j+1)%block===0);
    const score=.30*energy(start,end)+.20*energy(start,Math.min(end,start+3))+.12*energy(start,end,'density')+.15*repeat+.18*+wholeBlock+.05*(1-clamp(Math.abs(length-13.5)/1.5));
    const first=selected[0],last=selected.at(-1);
    candidates.push({start,end,duration:length,score:+score.toFixed(4),complete:true,first3Energy:+energy(start,Math.min(end,start+3)).toFixed(3),reason:wholeBlock?'反復フレーズ全体・歌詞開始と表示終了の区切り':'歌詞開始から表示中のフレーズを完了する区間',selectionEvidence:{firstLine:i,lastLine:j,wholeRepeatedBlock:wholeBlock,startSource:'supplied-lyric-onset',endSource:end===heldEnd?'planned-lyric-display-end':'adjacent-lyric-onset',leadingLyricFreeSeconds:0,lastLyricText:last.text,firstLyricText:first.text,displayEndIsVocalEnd:false,viralityMeasured:false}});
   }
  }
 }
 candidates.sort((a,b)=>b.score-a.score||a.start-b.start||a.end-b.end);
 const picks=[];for(const c of candidates)if(picks.every(p=>Math.abs(p.start-c.start)>=10)){picks.push(c);if(picks.length===3)break;}
 if(!picks.length)throw Error('表示中の歌詞を途中で切らずに12〜15秒へ収める区間がありません。歌詞時刻を変更せず、曲全体をご利用ください');
 return picks;
};
})();
