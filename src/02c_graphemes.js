/* Shared, lossless text units. The fallback deliberately favours keeping clusters together. */
(()=>{'use strict';
const J=window.J;
J.graphemes=(value,{fallback=false}={})=>{
 const text=String(value??'');
 if(!fallback&&typeof Intl!=='undefined'&&typeof Intl.Segmenter==='function')try{return [...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(text)].map(s=>s.segment);}catch{}
 const result=[];let join=false,regional=0;
 for(const ch of Array.from(text)){
  const mark=/[\p{Mark}\uFE00-\uFE0F\u{E0100}-\u{E01EF}\u{1F3FB}-\u{1F3FF}\u{E0020}-\u{E007F}]/u.test(ch),ri=/[\u{1F1E6}-\u{1F1FF}]/u.test(ch);
  if(result.length&&(mark||join||ch==='\u200d'||ri&&regional%2===1||ch==='\n'&&result.at(-1)==='\r'))result[result.length-1]+=ch;
  else result.push(ch);
  join=ch==='\u200d';regional=ri?regional+1:0;
 }
 return result;
};
J.lyricBreaks=(value,{fallback=false}={})=>{
 const text=String(value??''),units=J.graphemes(text,{fallback}),offsets=[0];units.forEach(u=>offsets.push(offsets.at(-1)+u.length));
 const wordEnds=new Set();
 if(!fallback&&typeof Intl!=='undefined'&&typeof Intl.Segmenter==='function')try{for(const s of new Intl.Segmenter('ja',{granularity:'word'}).segment(text))wordEnds.add(s.index+s.segment.length);}catch{}
 const boundaries=[];
 for(let i=1;i<units.length;i++){
  const a=units[i-1],b=units[i];
  if(/[\r\n]/u.test(a+b)||/^[、。，．！？!?：:；;）)］\]｝}」』】〉》ぁぃぅぇぉっゃゅょァィゥェォッャュョー]/u.test(b)||/[（(［\[｛{「『【〈《]$/u.test(a))continue;
  if(/[\p{Script=Latin}\p{Number}]$/u.test(a)&&/^[\p{Script=Latin}\p{Number}]/u.test(b))continue;
  const punct=/[、。，．！？!?：:；;\s]$/u.test(a),script=/[\p{Script=Hiragana}]$/u.test(a)&&/^[\p{Script=Han}\p{Script=Katakana}]/u.test(b);
  if(punct||wordEnds.has(offsets[i])||script)boundaries.push({offset:offsets[i],cost:punct?0:script?1:2,source:punct?'punctuation':wordEnds.has(offsets[i])?'word-boundary':'deterministic-script-boundary'});
 }
 return {original:text,units,offsets,boundaries,method:wordEnds.size?'Intl.Segmenter plus Japanese punctuation constraints':'deterministic cluster/script fallback',semanticConfidence:wordEnds.size?.65:.3,limits:'Word boundaries are linguistic heuristics, not sung-syllable alignment or semantic understanding.'};
};
})();
