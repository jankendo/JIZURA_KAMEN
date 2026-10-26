/* Lyric-file validation for the browser editor. Planning is owned by pinned JIZURA. */
(()=>{
J.importLRC = raw => {
  const lyrics = String(raw || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  const parsed = J.parseLyrics(lyrics);
  if (!parsed.lines.length || parsed.lines.some(line => line.lrc == null)) throw new Error('時刻付きの歌詞が見つかりません。各行を [00:12.34]歌詞 の形式にしてください。');
  if (parsed.lines.some(line => !Number.isFinite(line.lrc))) throw new Error('LRCの時刻を読み取れませんでした');
  return { lyrics, title: parsed.meta.ti || '', artist: parsed.meta.ar || '', count: parsed.lines.length };
};

/* TXT may contain ordinary lyrics or the same timestamps as LRC. */
J.importLyricsFile = (raw, name='lyrics.lrc') => {
  if (/\.lrc$/i.test(name)) return {...J.importLRC(raw), timed:true};
  if (!/\.txt$/i.test(name)) throw new Error('LRCまたはTXTファイルを選んでください');
  const lyrics=String(raw||'').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n').trim();
  const parsed=J.parseLyrics(lyrics);
  if (!parsed.lines.length) throw new Error('歌詞が見つかりません。本文のあるTXTファイルを選んでください');
  const timed=parsed.lines.every(line=>Number.isFinite(line.lrc));
  if (parsed.lines.some(line=>line.lrc!=null)&&!timed) throw new Error('時刻付きTXTは全行に時刻を付けてください。時刻なしTXTも読み込めます');
  return {lyrics,title:parsed.meta.ti||'',artist:parsed.meta.ar||'',count:parsed.lines.length,timed};
};


})();
