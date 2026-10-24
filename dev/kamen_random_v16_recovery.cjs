/* Production Canvas regression: an internal layout entry must not strand the
   selected draft behind three identical truncated recovery frontiers. */
module.exports=async()=>{
 const J=window.J,{p:base,a}=window.comparisonV12,copy=J.clonePhotoRenderPlan,check=(v,m)=>{if(!v)throw Error(m);};
 const p=copy(base),source=p.cuts.find(c=>c.line>=0),style=J.STYLES.transit;
 let cut=J.registryCandidateCut({...p,style,styleKey:'transit'},source,'bubble',source.params.font||'embedded_bold','cut','zoomSlow');
 for(const [role,id]of Object.entries({exit:'cut',cam:'panR',bg:'ripples',treat:'splitColor',decor:'none',fx:null,trans:'cut'}))cut=J.changeDirectionRoleV11(cut,role,id);
 cut=J.initialFinishV15(p,{...cut,style,styleKey:'transit',explorationParamsV13:{size:1,dx:0,dy:0,motion:1,camera:1,fx:1}});
 p.cuts=p.cuts.map(c=>c.index===source.index?cut:c);
 const R=new J.Renderer(),cv=Object.assign(document.createElement('canvas'),{width:256,height:Math.round(256*p.H/p.W)}),raw=J.createRegistryRenderProbe(p,R,cv,cv.cloneNode(),{production:true}),sample=J.createCreativeProbeV10(raw,cv);sample.verifyScale=raw.verifyScale;
 const recover=J.recoverDirectionLineV112,budgets=[];
 J.recoverDirectionLineV112=async(...args)=>{budgets.push(args[3].budget);return recover(...args);};
 try{
  if(p.customBg?.enabled&&p.customBg.dataUrl)await R.loadCustomBackground(p.customBg.dataUrl);
  const phases=c=>J.directionPhasesV11(p,c,a),early=sample(p,cut,.001);
  check(!early.eligible&&early.height<=.035,'real internal entry reproduces missing primary text');
  const rows=await J.optimizeCreativeLineV10({p,c:cut,f:J.songLineFeaturesV8(p,a,cut),sample,phases,audio:a,finishSelectedDraft:true,initialCuts:[cut]});
  check(budgets.length===1&&budgets[0]===48,'one shared bounded recovery frontier');
  const result=rows[0],changed=J.genomeChangesV15(J.creativeGenomeV15(cut),J.creativeGenomeV15(result.cut));
  check(result.safe&&result.checks.every(e=>e.eligible),'recovered phases pass unchanged gates');
  check(changed.join(',')==='layout','only the proven causal layout changes');
  check(J.canonicalJSON(p.cuts.find(c=>c.index===source.index))===J.canonicalJSON(cut),'original selection unchanged');
  let paired=J.registryCandidateCut({...p,style:J.STYLES.noir,styleKey:'noir'},source,'photoStatement',source.params.font||'embedded_bold','diagWipe','hWave');
  for(const [role,id]of Object.entries({exit:'cut',cam:'whipIn',bg:'none',treat:'none',decor:'none',fx:null,trans:'cut'}))paired=J.changeDirectionRoleV11(paired,role,id);
  paired=J.initialFinishV15(p,{...paired,style:J.STYLES.noir,styleKey:'noir',explorationParamsV13:{size:1,dx:0,dy:0,motion:1,camera:1,fx:1}});
  p.cuts=p.cuts.map(c=>c.index===source.index?paired:c);budgets.length=0;
  const pairRows=await J.optimizeCreativeLineV10({p,c:paired,f:J.songLineFeaturesV8(p,a,paired),sample,phases,audio:a,finishSelectedDraft:true,initialCuts:[paired]});
  check(pairRows[0].safe&&pairRows[0].checks.every(e=>e.eligible),'entry repair re-diagnoses the revealed camera failure');
  const pairChanges=J.genomeChangesV15(J.creativeGenomeV15(paired),J.creativeGenomeV15(pairRows[0].cut));
  check(pairChanges.every(role=>['enter','cam'].includes(role)),'masked failure repair preserves unrelated roles');
  check(budgets.length===1&&budgets[0]===48,'masked failure shares the same total budget');
  check(J.workflowErrorMessageV16(new Error('V16_SELECTED_LINE_UNSAFE_10')).startsWith('11行目'),'human-readable line number');
  console.log('V16 RECOVERY FRONTIER PASS',JSON.stringify({budgets,changed,examined:result.optimizerEvidence.recovery.examined}));
  return {budgets,changed,pairChanges,examined:result.optimizerEvidence.recovery.examined};
 }finally{J.recoverDirectionLineV112=recover;R.disposeAssets?.();}
};
