/* LRC output uses saved musical timestamps; no guessing or storage migration. */
(()=>{'use strict';const J=window.J;
J.lrcTimestamp=time=>{
 if(!Number.isFinite(time)||time<0)throw new Error('歌詞の時刻が正しくありません。');
 const ms=Math.round(time*1000),minutes=Math.floor(ms/60000),seconds=Math.floor(ms%60000/1000),fraction=ms%1000;
 return `[${String(minutes).padStart(2,'0')}:${String(seconds).padStart(2,'0')}.${String(fraction).padStart(3,'0')}]`;
};
J.exportLRC=(project,audio)=>{
 const parsed=J.parseLyrics(project.lyrics),lines=parsed.lines;
 if(!lines.length)throw new Error('歌詞を入力してからLRCを書き出してください。');
 const manual=project.timing?.lineTimes||{};
 const missing=lines.findIndex((l,i)=>l.lrc==null&&manual[i]==null);
 if(missing>=0)throw new Error(`${missing+1}行目の時刻が未設定です。「タップで同期」で全行を記録してください。`);
 const timing=J.computeTiming(project,parsed,audio);let previous=-1;
 const out=lines.map((l,i)=>{
  const t=timing.starts[i];
  if(!Number.isFinite(t)||t<0||t<previous)throw new Error(`${i+1}行目の時刻を確認してください。前の行より前には設定できません。`);
  if(audio?.duration&&t>audio.duration)throw new Error(`${i+1}行目が音源の終了後です。タイミングを調整してください。`);
  previous=t;
  const words=l.wordTimes||[],delta=t-(l.lrc??t);
  const enhanced=words.length&&words.map(w=>w.text).join('')===l.text;
  if(enhanced&&!words.every((w,k)=>Number.isFinite(w.start)&&w.start+delta>=0&&(!audio?.duration||w.start+delta<=audio.duration)&&(!k||w.start>=words[k-1].start)))throw new Error(`${i+1}行目の単語ごとの時刻を確認してください。`);
  return J.lrcTimestamp(t)+(enhanced?words.map(w=>J.lrcTimestamp(w.start+delta).replace('[','<').replace(']','>')+w.text).join(''):l.text);
 });
 const clean=x=>String(x||'').replace(/[\r\n\[\]]/g,' ').trim();
 const tags=[];for(const [k,v] of [['ti',project.title],['ar',project.artist]])if(clean(v))tags.push(`[${k}:${clean(v)}]`);
 // Offset has already been folded into computeTiming; never emit it twice.
 return [...tags,'[re:KAMEN]',...out].join('\n')+'\n';
};
})();
