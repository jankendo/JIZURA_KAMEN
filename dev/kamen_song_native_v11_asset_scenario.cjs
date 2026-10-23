'use strict';
async function runAssetSmokeV11(input){
 const J=window.J;J.enableSingleBackgroundMode();
 const bytes=Uint8Array.from(atob(input.audio),c=>c.charCodeAt(0));
 const audio=await J.analyzeAudio(new File([bytes],'audio.mp3',{type:'audio/mpeg'}));
 const q=input.savedProject||J.defaultProject();if(input.version==='v15'&&!input.savedProject)q.seed=15072;q.lyrics=input.lyrics;q.timing.snap=false;
 q.customBg={...q.customBg,enabled:true,dataUrl:'data:image/webp;base64,'+input.background};
 const img=await new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=reject;i.src=q.customBg.dataUrl;});
 if(!input.savedProject)J.applyImagePalette(q,J.analyzeCustomBackground(img,q),{palette:true,readability:true,mood:false});
 if(!input.savedProject){const direction=await (input.version==='v15'?J.generateJizuraDirectionV15:J.generateJizuraDirectionV11)(q,audio);q.autoDirection=true;q.artDirection=J.makeArtDirection(q,audio,direction.recommended.proposal);q.fonts={...q.artDirection.typography};}
 if(input.onlyLine!==undefined)for(let i=0;i<8;i++)if(i!==Number(input.onlyLine))q.overrides[i]={lock:true};
 const p=J.plan(q,audio);if(!input.savedProject)await J.searchSongNativeCandidates(p,null,audio,{ensureFonts:false,onProgress:x=>console.log('ASSET',x.current,'/',x.total)}).catch(e=>{console.log('DIAGNOSTIC',JSON.stringify(e.diagnostic));throw e;});J.assertSelectionV9(p,audio);
 J.captureSongNativeResolved(q,audio,p);const compact=J.compactPersistentProjectV111(q),roundCompact=J.plan(compact,audio);if(roundCompact.songNativeRestore.status!=='RESTORED'||J.canonicalJSON(J.songNativeRenderDecisions(roundCompact))!==J.canonicalJSON(J.songNativeRenderDecisions(p)))throw Error('COMPACT_RENDER_CONTRACT_CHANGED');console.log('COMPACT_BYTES',JSON.stringify({before:new Blob([JSON.stringify(q)]).size,after:new Blob([JSON.stringify(compact)]).size}));window.assetProjectV11=q;const restored=J.plan(JSON.parse(JSON.stringify(q)),audio);if(restored.songNativeRestore.status!=='RESTORED')throw Error('ASSET_RESTORE_FAILED');
 const R=new J.Renderer();await R.loadCustomBackground(q.customBg.dataUrl);
 const cv=Object.assign(document.createElement('canvas'),{width:640,height:360}),mask=Object.assign(document.createElement('canvas'),{width:640,height:360});
 const probe=J.createRegistryRenderProbe(p,R,cv,mask,{production:true});
 const cuts=p.cuts.filter(c=>c.line>=0),sheet=Object.assign(document.createElement('canvas'),{width:1280,height:720}),sx=sheet.getContext('2d');
 const measured=[];
 for(let i=0;i<cuts.length;i++){
  const c=cuts[i],checks=J.directionPhasesV11(p,c,audio).map(t=>({time:c.start+t,...probe.verifyScale(p,c,t)}));
  if(!checks.every(e=>e.eligible)||!checks.some(e=>e.temporalStage==='HOLD'&&e.readable)){console.log('ASSET_BAD_FRAME',JSON.stringify(checks.filter(e=>!e.eligible).map(({mask,...e})=>e)));throw Error('ASSET_PHASE_SAFETY_'+c.line);}
  measured.push({line:c.line,phases:checks.map(({mask,...e})=>e)});
  if(i<4){R.frame(cv.getContext('2d'),p,c.start+c.dur*.5,{scale:640/p.W,production:true,noHud:true});sx.drawImage(cv,(i%2)*640,Math.floor(i/2)*360);}
 }
 const selection=p.songNativeDirection.selection;
 const result={duration:audio.duration,bpm:audio.bpm,lines:p.lines.length,selected:selection.entries.map(e=>({line:e.line,text:e.cut.lineText,layout:e.cut.layout,style:e.cut.styleKey,enter:e.cut.enter,hold:e.cut.hold,exit:e.cut.exit,cam:e.cut.cam,bg:e.cut.bg,treat:e.cut.treat,decor:e.cut.decor,fx:e.cut.registryFxV9,trans:e.cut.trans})),framesCompared:selection.framesCompared,diagnostics:selection.traces.map(t=>({line:t.line,intent:t.creative.intent,counts:t.creative.counts,compared:t.creative.compared,search:t.creative.search,interactions:t.creative.interactions,ablations:t.creative.ablations})),measured,restore:restored.songNativeRestore.status,artisticQuality:'UNVERIFIED',sheet:sheet.toDataURL('image/png')};R.disposeAssets?.();return result;
}

module.exports=runAssetSmokeV11;
