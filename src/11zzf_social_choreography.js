/* Phrase-level direction: one composition, developed across repeated lyrics. */
(()=>{'use strict';const J=window.J;
const normalized=t=>String(t||'').replace(/\s/g,'');
const locked=(p,c)=>!!(Object.keys(p.directionOverrides7?.[c.line]||{}).length||p.directorLyricDirectives7?.some(d=>d.line===c.line)||c.assetScene?.locked||c.semanticIntent||p.directorSections7?.some(s=>c.start>=s.from&&c.start<s.to&&(s.typographyIntent||s.motionIntent)));
J.photoChoreographyLocked=locked;
// Prefer real word/script boundaries. Never split a Latin word, small kana,
// closing punctuation or an emoji sequence merely to balance the rows.
J.composeLyricPhrase=text=>{
 const source=String(text||'');if(source.includes('\n'))return source;
 let units;try{units=[...new Intl.Segmenter('ja',{granularity:'grapheme'}).segment(source)].map(s=>s.segment);}catch{units=Array.from(source);}
 if(units.length<6)return source;
 const offsets=[];let n=0;for(const u of units){n+=u.length;offsets.push(n);}
 const boundaries=new Set();try{for(const s of new Intl.Segmenter('ja',{granularity:'word'}).segment(source))boundaries.add(s.index+s.segment.length);}catch{}
 let best=null;for(let i=1;i<units.length;i++){
  const a=units[i-1],b=units[i],offset=offsets[i-1];if(/[A-Za-z0-9]/.test(a)&&/[A-Za-z0-9]/.test(b)||/^[ーっゃゅょぁぃぅぇぉ、。！？!?」』）】〉》]/u.test(b))continue;
  const left=units.slice(0,i).join(''),right=units.slice(i).join('');if(!left.trim()||!right.trim())continue;
  const width=s=>[...s.trim()].reduce((sum,ch)=>sum+(/[\x00-\x7f]/.test(ch)?.52:1),0),wl=width(left),wr=width(right);
  const leftEnd=left.trimEnd().at(-1),rightStart=right.trimStart()[0],scriptBoundary=/[A-Za-z0-9]/.test(leftEnd)&&/[^\x00-\x7f]/.test(rightStart);
  const particleStart=/^(?:も|は|が|を|に|の|へ|と|で|や|ね|よ|ぜ|けど|から|まで)/.test(right.trimStart()), phraseEnd=/(?:今日も|いつものように|と共に|ここに|たちよ|だろ|できること)$/.test(left.trimEnd());
  const score=(particleStart?3:0)+(phraseEnd?-1.25:0)+Math.abs(wl-wr)/Math.max(wl,wr)+(boundaries.has(offset)?0:.7)+(J.isHira?.(a)&&J.isHira?.(b)?1:0)+(/\s/.test(a)||/\s/.test(b)?-.15:0)+(J.isHira?.(a)&&!J.isHira?.(b)?-.6:0)+(scriptBoundary?-.7:0)+('のをにがはでと'.includes(a)&&a.trim()?.55:0)+(/\s/.test(b)?.03:0);
  if(!best||score<best.score)best={offset,score};
 }
 return best?source.slice(0,best.offset)+'\n'+source.slice(best.offset):source;
};
J.ENTER.photoSettle={name:'全文を保った短い収束',apply(env,it,u){const e=1-(1-J.clamp(u))**3;it.size*=.96+.04*e;}};
J.ENTER.photoResolve={name:'二段のまとまり',apply(env,it,u){const e=1-(1-J.clamp(u))**3;it.track=(it.track||0)+.025*(1-e);it.size*=.98+.02*e;}};
for(const [key,name,mode] of [['photoStatement','中央の一行','statement'],['photoPhrase','中央の語句二段','phrase'],['photoChant','短語の見出し','chant']]){
 J.LAYOUTS[key]={name,special:true,fits:()=>true,plan:()=>({font:'gothic_bold',readablePhoto:true,composition:mode}),render(env){
  const {W,H,cut}=env,P=cut.params,source=String(cut.lineText||cut.text||''),text=P.displayText||source,font=P.font||'gothic_bold',portrait=H>W,lead=mode==='phrase'?1.25:1.18,track=mode==='chant'?.055:.012;
  const cap=mode==='chant'?Math.min(H*.22,W*.29)*(P.developed?1.08:1):mode==='phrase'?H*(portrait?.092:.14):H*(portrait?.07:.115);
  const size=Math.min(cap,J.fitSize(text,font,W*.74,H*(mode==='phrase'?.40:.32),{track,lead})/(mode==='phrase'?1.16:1));
  return J.mainDraw(env,{text,font,size,x:W/2,y:H/2,track,lead,color:env.sc.fg,noHold:!cut.registrySelected});
 }};
}
// A single text item retains safe-area fitting, full-phrase centering, audit
// masks and all original characters, including spaces between Latin words.
const typography=J.applyTypography5;J.applyTypography5=(env,it)=>{
 if(!env.cut?.photoChoreography)return typography?.(env,it);
 const P=env.cut.params;if(env.cut.registrySelected&&normalized(env.cut.lineText).length<=4)it.size=Math.min(it.size,env.H*(env.H>env.W?.22:.26));if(!env.cut.registrySelected){it.rot=0;it.skew=0;it.charFns=[];it.pieceFns=[];}
 if(P.composition==='phrase')it.charFns.push((i,g)=>{const k=(P.emphasisRow??1)===g.li?1.16:1;return {s:k,dx:g.x*(k-1)};});
};
J.applyPhotoChoreography=p=>{
 if(!p.photoCompositionPolicy)return p;
 const occurrences=new Map(),lineOccurrences=new Map();for(const [i,l] of (p.lines||[]).entries()){const text=normalized(l.text),n=occurrences.get(text)||0;lineOccurrences.set(i,n);occurrences.set(text,n+1);}
 const cuts=[];
 for(const c0 of p.cuts||[]){
  if(c0.line<0||locked(p,c0)||c0.photoExit){cuts.push(c0);continue;}
  const previous=cuts.at(-1),text=p.lines?.[c0.line]?.text||c0.lineText||c0.text;
  if(previous?.photoChoreography&&previous.line===c0.line&&Math.abs(previous.end-c0.start)<.002){previous.end=c0.end;previous.dur=previous.end-previous.start;continue;}
  const c={...c0,params:{...c0.params}},n=lineOccurrences.get(c.line)||0,role=p.musicalStructure?.sections?.find(s=>c.start>=s.from&&c.start<s.to)?.role,count=[...normalized(text)].length;
  const mode=count<=4?'chant':n>0||['climax','build','hook'].includes(role)||(/[A-Za-z]{2}/.test(text)&&/[^\x00-\x7f]/.test(text))?'phrase':'statement';
  c.layout=mode==='chant'?'photoChant':mode==='phrase'?'photoPhrase':'photoStatement';c.text=text;c.lineText=text;c.photoChoreography=true;c.kineticGrouped=false;c.treat=null;c.decor=[];c.hold='still';c.enter=mode==='phrase'?'photoResolve':'photoSettle';c.exit='cut';c.inDur=Math.min(.12,c.dur*.15);c.outDur=0;c.stagger=0;c.trans='cut';c.transDur=0;
  const displayText=mode==='phrase'?J.composeLyricPhrase(text):p.H>p.W?J.splitLines(text,10):J.splitLines(text,18);
  c.params={...c.params,font:p.artDirection?.typography?.display==='gothic_black'?'gothic_bold':p.artDirection?.typography?.display||'gothic_bold',displayText,composition:mode,emphasisRow:n>1?n%2:1,developed:n>0,readablePhoto:true,align:'center',prompt:false,directionAngle:0};
  const selection=p.artDirection?.registrySelection,selected=selection?.lyricsKey===J.registrySelectionLyricsKey?.(p)&&selection?.style===p.styleKey&&(!selection.backgroundKey||selection.backgroundKey===J.registrySelectionBackgroundKey?.(p))?selection.entries?.[c.line]:null;
  if(selected&&J.LAYOUTS[selected.layout]){c.layout=selected.layout;c.params={...c.params,...selected.params};c.enter=J.ENTER[selected.enter]?selected.enter:c.enter;c.hold=J.HOLD[selected.hold]?selected.hold:'still';c.inDur=selected.inDur??c.inDur;c.registrySelected=true;c.architecture=selected.family;c.chapter={...c.chapter,typographyMode:selected.family};}
  if(!c.registrySelected){c.architecture=mode;c.chapter={...c.chapter,typographyMode:mode};}cuts.push(c);
 }
 p.cuts=cuts;p.photoChoreography={algorithm:'phrase-development-v1',meaning:'phrase / role / repetition direction; no word-level singing inference',presentations:cuts.filter(c=>c.photoChoreography).map(c=>({line:c.line,start:c.start,end:c.end,mode:c.params.composition,text:c.params.displayText,occurrence:(lineOccurrences.get(c.line)||0)+1}))};
 if(p.artDirection?.vocabulary)for(const key of ['layout','enter','hold','trans'])p.artDirection.vocabulary[key]=[...new Set(cuts.map(c=>c[key]).filter(Boolean))];
 // Do not add a recurring chromatic hit over every readable phrase. Manual
 // event/section direction remains intact; the typography carries the accent.
 for(const key of ['events','hypeTimeline'])p[key]=(p[key]||[]).filter(e=>{const c=J.cutAt(p,e.t);return !c?.photoChoreography||!/chroma|rgb|glitch|strobe|flash|colorField|wipe/i.test(e.type||'')||e.manual||e.directorIntent;});
 for(const chapter of p.visualWorld?.chapters||[]){const modes=[...new Set(cuts.filter(c=>c.photoChoreography&&c.start>=chapter.from&&c.start<chapter.to).map(c=>c.params.composition))];if(modes.length)chapter.architecture=modes.join('+');}
 if(p.socialHookAudit){const visible=cuts.filter(c=>c.line>=0&&c.start<p.socialHook.end&&c.end>p.socialHook.start);p.socialHookAudit.cuts=visible.length;p.socialHookAudit.nativeArchitectures=[...new Set(visible.map(c=>c.layout))];}
 p.layoutFatigue=J.auditLayoutFatigue7?.(p);p.realityAudit=J.auditDirectionReality?.(p);
 return p;
};
const plan=J.plan;J.plan=(project,audio)=>J.applyPhotoChoreography(plan(project,audio));
const social=J.createSocialHookPlan;if(social)J.createSocialHookPlan=(p,candidate)=>J.applyPhotoChoreography(social(p,candidate));
const context=J.directorContext;if(context)J.directorContext=(project,p,...args)=>({...context(project,p,...args),photoChoreography:p.photoChoreography||null});
const provenance=J.createExportProvenance;if(provenance)J.createExportProvenance=async(...args)=>({...await provenance(...args),photoChoreography:args[0]?.plan.photoChoreography||null});
})();
