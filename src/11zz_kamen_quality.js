/* Offline lyric cues: conservative explicit Japanese actions, never an LLM. */
(()=>{'use strict';const J=window.J;
const tail='(?:よ)?(?:[!！、。\\s]|$)';
const cues=[
 {verb:'pierce',rule:new RegExp('(?:貫け|突き抜けろ)'+tail,'u')},
 {verb:'rise',rule:new RegExp('(?:昇れ|登れ|舞い上がれ)'+tail,'u')},
 {verb:'unite',rule:new RegExp('(?:集まれ|一つになれ|ひとつになれ)'+tail,'u')}
];
J.localLyricCue=text=>{
 const value=String(text||'');
 // Ambiguous, quoted or negative phrasing keeps the existing musical planner.
 if([...value].length>10||/[「」『』"“”]|ない|なく|ずに|なかった|(?:don't|not)\b/iu.test(value))return null;
 const matches=cues.filter(c=>c.rule.test(value));
 const found=matches.length===1?matches[0]:null;
 return found?{visualVerb:found.verb,source:'offline-explicit-verb'}:null;
};
const plan=J.plan;
J.plan=(project,audio)=>{
 const result=plan(project,audio);
 if(!project.autoDirection||project.directorPlan||!result.motionDirector7)return result;
 const applied=[];
 for(const cut of result.cuts){
  if(cut.line<0||cut.semanticIntent||cut.layout==='huge'||cut.repetitionRole==='payoff')continue;
  const world=result.visualWorld?.chapters?.find(w=>cut.start>=w.from&&cut.start<w.to);
  if(Object.values(world?.directorConstraints||{}).some(Boolean))continue;
  const manual=project.overrides?.[cut.line];
  if(manual&&Object.keys(manual).length)continue;
  const cue=J.localLyricCue(result.lines[cut.line]?.text);
  if(!cue)continue;
  // Square pierce trials lost their movement when the existing safety fit
  // clamped wide lettering. Preserve that composition rather than shrink it.
  if(cue.visualVerb==='pierce'&&result.W===result.H)continue;
  const resolved=J.resolveVisualVerb(cue.visualVerb);
  const intent={line:cut.line,role:'command',emotion:'neutral',importance:.65,...cue};
  cut.semanticIntent=intent;
  // Only the typography's existing semantic geometry is extended. Keep the
  // repetition arc, climax lettering, camera and kinetic grouping unchanged,
  // including when a later visual-world repair reapplies camera choices.
  cut.semanticResolved={...resolved,layout:cut.layout,motion:cut.cam};
  if(!applied.some(s=>s.line===cut.line))applied.push(intent);
 }
 if(applied.length){
  result.lineSemantics=[...(result.lineSemantics||[]),...applied.filter(s=>!(result.lineSemantics||[]).some(old=>old.line===s.line))];
  result.localLyricDirection={method:'offline explicit Japanese actions',count:applied.length,understanding:'Limited verb rules; unmatched lines keep musical direction.'};
  result.layoutFatigue=J.auditLayoutFatigue7(result);
  result.realityAudit=J.auditDirectionReality(result);
 }
 return result;
};
})();
