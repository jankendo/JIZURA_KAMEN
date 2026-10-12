/* Observe automatic legacy units before export; preserve source text/time/locks. */
(()=>{'use strict';const J=window.J,plain=s=>String(s??'').replace(/\s/gu,'');
J.LAYOUTS.globalReadableUnit={name:'読みやすさを保つ歌詞',special:true,plan:()=>({font:'embedded_bold'}),render(env){
 const {W,H,cut}=env,font=cut.params?.font||'embedded_bold',text=cut.text??cut.lineText,short=J.graphemes(plain(text)).length<=4,cap=H>W?(short?.15:.09):(short?.18:.12),size=Math.min(H*cap,J.fitSize(text,font,W*.72,H*.3,{track:.02,lead:1.2}));
 return J.mainDraw(env,{text,font,size,x:W/2,y:H/2,track:.02,lead:1.2,color:env.sc.fg,noHold:true});
}};
J.prepareAutomaticUnitSafety=async args=>{
 const p=args.plan;if(p.musicalPhoto||p.automaticUnitSafety)return;
 const cuts=p.cuts.filter(c=>c.line>=0&&!c.grammar&&!J.photoChoreographyLocked(p,c));if(!cuts.length)return;
 const R=new J.Renderer(),cv=document.createElement('canvas'),mask=document.createElement('canvas');cv.width=mask.width=256;cv.height=mask.height=Math.round(256*p.H/p.W);const ctx=cv.getContext('2d'),mc=mask.getContext('2d'),decisions=[];
 const observe=c=>{const span=Math.max(.01,c.dur-(c.inDur||0)-(c.outDur||0)),times=[.2,.5,.8].map(u=>Math.min(c.end-.001,c.start+(c.inDur||0)+span*u));
  return times.map(time=>{let actual=[],geometry=[];const original=J.drawItem;J.drawItem=(env,it)=>{if(env.ctx===ctx&&env.pass==='main'&&env.cut.index===c.index&&J.cinemaV5.isPrimaryInternalLyric(env,it)){actual.push(J.layoutText(it).filter(g=>{const x=it.charFn?.(g.i,g);return !x?.hide&&(it.alpha??1)*(x?.a??1)>=.55;}).map(g=>it.charFn?.(g.i,g)?.ch||g.ch).join(''));geometry.push(J.cinemaV5.nativeGlyphSafety(env,it));}return original(env,it);};let items=[];try{R.frame(ctx,p,time,{scale:256/p.W,production:true,noHud:true,lyricAuditCtx:mc,lyricAuditItems:items});}finally{J.drawItem=original;}
   return {time,complete:actual.some(text=>plain(text)===plain(c.text??c.lineText))||plain(actual.join(''))===plain(c.text??c.lineText),geometry,safe:items.every(({bounds:b})=>!b||(b.x0>=p.W*.075&&b.x1<=p.W*.925&&b.y0>=p.H*.06&&b.y1<=p.H*.94))};});};
 try{if(p.customBg?.enabled)await R.loadCustomBackground(p.customBg.dataUrl);await R.loadAssetDeck?.(p);
  for(const c of cuts){if(args.signal?.aborted)throw new DOMException('Aborted','AbortError');const before=observe(c),passes=x=>x.every(s=>s.complete&&s.safe&&s.geometry.length&&s.geometry.every(g=>g.readable));if(passes(before))continue;
   const previous={layout:c.layout,enter:c.enter,hold:c.hold,exit:c.exit,cam:c.cam,trans:c.trans,treat:c.treat,params:{...c.params},inDur:c.inDur,outDur:c.outDur,transDur:c.transDur,decor:c.decor};
   Object.assign(c,{layout:'globalReadableUnit',enter:'cut',hold:'still',exit:'cut',cam:'stillCamera',trans:'cut',treat:'none',decor:[],inDur:0,outDur:0,transDur:0,params:{...c.params,font:c.params?.font||'embedded_bold',sub:false}});const after=observe(c);if(!passes(after))Object.assign(c,previous);
   decisions.push({index:c.index,line:c.line,text:c.text,start:c.start,end:c.end,before,after,adopted:passes(after),reason:'Actual automatic primary unit was incomplete, too large, colliding or outside safe area; thresholds unchanged'});
  }
  p.automaticUnitSafety={status:decisions.some(d=>!d.adopted)?'UNRESOLVED':'NATIVE_PROBED',decisions,finalPixelVerification:'Required independently on the actual adopted MP4',manualLocksUntouched:true,textAndTimingUnchanged:true};
 }finally{R.disposeAssets?.();R.customBgBitmap?.close?.();cv.width=mask.width=1;}
};
for(const key of ['exportMP4','exportMP4Fallback']){const exportVideo=J[key];if(exportVideo)J[key]=async args=>{await J.prepareAutomaticUnitSafety(args);const result=await exportVideo(args);result.provenance.automaticUnitSafety=args.plan.automaticUnitSafety??null;result.sidecar=new Blob([JSON.stringify(result.provenance,null,2)],{type:'application/json'});return result;};}
})();
