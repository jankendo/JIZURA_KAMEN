/* Song Grammar v5 short output: preserve exact LRC intervals and the generated
   acoustic trajectory. No named phases, event injection or loop-style forcing. */
(()=>{'use strict';const J=window.J,F=Number.isFinite,mean=a=>a.length?a.reduce((s,v)=>s+v,0)/a.length:0;
const active=p=>[5,6,7].includes(p?.songNativeDirection?.version);
const candidates=J.socialHookCandidates;
J.socialHookCandidates=(p,audio,...args)=>{
 const picks=candidates(p,audio,...args);if(!active(p))return picks;
 const d=p.songNativeDirection;
 return picks.map(c=>{
  const rows=d.structure.novelty.filter(n=>n.time>=c.start&&n.time<c.end),sections=d.sections.filter(s=>s.start<c.end&&s.end>c.start);
  const boundary=s=>d.structure.novelty.reduce((best,n)=>Math.abs(n.time-s)<Math.abs(best.time-s)?n:best,{time:Infinity,value:0});
  const first=boundary(c.start),last=boundary(c.end),strength=mean(rows.map(n=>n.value));
  const recurrence=mean(sections.map(s=>s.repeatSimilarity).filter(F));
  // Compare safe whole-phrase intervals on their actual acoustic development.
  // Scores select an interval only; they do not certify any visual quality.
  return {...c,score:c.score*.35+strength*.35+recurrence*.15+(first.value+last.value)*.075,
   reason:'LRC全文の区切りと音響転換・反復に基づく範囲',
   selectionEvidence:{...c.selectionEvidence,algorithm:'SONG_GRAMMAR_V5_INTERVAL',acousticNovelty:strength,acousticRecurrence:recurrence,boundaryStrength:[first.value,last.value],visualQuality:'UNMEASURED'}};
 }).sort((a,b)=>b.score-a.score||a.start-b.start);
};
const social=J.createSocialHookPlan;
J.createSocialHookPlan=(source,candidate)=>{
 if(!active(source))return social(source,candidate);
 const {start,end}=candidate||{};
 if(!F(start)||!F(end)||start<0||end>source.duration||end-start<12-1e-6||end-start>15+1e-6)throw Error('V5_SHORT_REQUIRES_12_TO_15_SECONDS');
 if(source.H<=source.W)throw Error('V5_SHORT_REQUIRES_PORTRAIT_REPLAN');
 if(source.lines.some(l=>l.start<end&&l.end>start&&(l.start<start-1e-6||l.end>end+1e-6)))throw Error('V5_SHORT_WOULD_TRUNCATE_LYRIC');
 const p=J.clonePhotoRenderPlan(source);
 p.socialHook={version:p.songNativeDirection.version,start,end,duration:end-start,dedicatedReedit:true,portraitComposition:true,loopRequired:candidate.loopRequired===true,method:'ACOUSTIC_TRAJECTORY_WITH_EXACT_LRC'};
 p.socialDirector={version:p.songNativeDirection.version,aspect:'9:16',independent:true,sections:p.songNativeDirection.sections.filter(s=>s.start<end&&s.end>start).map(s=>({from:Math.max(start,s.start),to:Math.min(end,s.end),boundaryConfidence:s.boundaryConfidence,repeatFrom:s.repeatFrom,quietIntent:s.quietIntent}))};
 p.socialHookAudit={dedicated:true,method:p.socialHook.method,phases:[],cuts:p.cuts.filter(c=>c.line>=0&&c.start<end&&c.end>start).length,quality:'UNMEASURED'};
 delete p.lastPixelQA;delete p.songGrammarV5Evidence;
 J.cinemaV3.invalidate(p);return p;
};
})();
