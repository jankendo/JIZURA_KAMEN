/* Three groups reuse the production Chrome/Canvas/short encoder harness. */
module.exports=async function randomChecksV15(){
 const J=window.J,{q,p,a}=window.comparisonV12,assert=(ok,msg)=>{if(!ok)throw Error(msg);};
 const selection=p.songNativeDirection.selection,c=p.cuts.find(c=>c.line===0),index=J.explorationCatalogV13(p),traces=selection.traces.map(t=>t.creative);
 assert(J.isRandomFinisherV15(p)&&selection.explorationVersion===15,'v15 explicit opt in');
 const generate=plan=>Array.from({length:24},(_,i)=>J.randomProposalV15(plan,c,index,i));
 const before=generate(p),random=Math.random;let after;
 try{Math.random=()=>{throw Error('unseeded random');};after=generate(p);}finally{Math.random=random;}
 assert(J.canonicalJSON(before)===J.canonicalJSON(after),'seeded replay');
 const normal=generate({...p,songNativeDirection:{...p.songNativeDirection,intensityV15:'normal'}}),count=rows=>rows.filter(c=>c.hold!=='still').length+rows.filter(c=>c.cam!=='stillCamera').length;
 assert(count(before)>count(normal),'intensity changes actual registry generation');
 const genome=J.creativeGenomeV15(c),initial=J.initialFinishV15(p,c);
 assert(!J.genomeChangesV15(genome,J.creativeGenomeV15(initial)).length,'initial numeric fit retains all role IDs');
 const changed=J.rerollRoleV15(p,c,index,'hold',5);
 assert(J.genomeChangesV15(genome,J.creativeGenomeV15(changed)).join(',')==='hold','partial reroll is local');
 const R=new J.Renderer();await R.loadCustomBackground(q.customBg.dataUrl);
 const cv=Object.assign(document.createElement('canvas'),{width:256,height:144}),mask=cv.cloneNode(),raw=J.createRegistryRenderProbe(p,R,cv,mask,{production:true}),probe=J.createCreativeProbeV10(raw,cv);probe.verifyScale=raw.verifyScale;
 const args={p,c,f:J.songLineFeaturesV8(p,a,c),sample:probe,phases:cut=>J.directionPhasesV11(p,cut,a),audio:a,budget:18,preserveCurrent:true,initialCuts:[c],initialPlan:p};
 const originalProposal=J.randomProposalV15;let preservedProposalCalls=0,first,second;
 try{J.randomProposalV15=(...x)=>{preservedProposalCalls++;return originalProposal(...x);};first=await J.optimizeRandomLineV15(args);second=await J.optimizeRandomLineV15(args);}finally{J.randomProposalV15=originalProposal;}
 assert(preservedProposalCalls===0,'preserveCurrent never creates a fresh genome');
 assert(J.canonicalJSON(first.map(x=>x.cut))===J.canonicalJSON(second.map(x=>x.cut)),'actual Canvas finish replay');
 assert(first.every(x=>!J.genomeChangesV15(genome,J.creativeGenomeV15(x.cut)).length),'actual timing/safety finishing retains IDs');
 let locked=false;try{await J.optimizeRandomLineV15({...args,p:{...p,overrides:{[c.line]:{lock:true}}}});}catch(e){locked=e.message==='V15_LOCKED_LINE';}assert(locked,'manual lock enforced');
 const phases=args.phases(c),checks=phases.map(t=>probe({...p,motionObservationV14:true},c,t));
 Object.assign(checks,{planWidthV14:p.W,planHeightV14:p.H,cutTextV14:c.lineText});
 const proposals=J.finishRepairsV15(p,c,checks.map(e=>({...e,eligible:false,safe:false})));assert(proposals.every(x=>!J.genomeChangesV15(genome,J.creativeGenomeV15(x)).length),'numeric repairs cannot replace genome');
 assert(proposals.some(x=>(x.explorationParamsV13?.size??1)!==(c.explorationParamsV13?.size??1)),'measured size correction exists');
 // TEST A: the first full genome and its numeric/local repairs all fail; an
 // independent seeded genome must be sampled and adopted only when safe.
 const proposalA=originalProposal(p,c,index,701),proposalB=J.clonePhotoRenderPlan(c),genomeB=J.creativeGenomeV15(proposalB);
 if(!J.genomeChangesV15(J.creativeGenomeV15(proposalA),genomeB).length){const alt=index.find(x=>x.group==='layout'&&x.eligible&&x.id!==proposalB.layout&&(!J.LAYOUTS[x.id].fits||J.LAYOUTS[x.id].fits(J.graphemes(c.lineText).length)));if(alt)Object.assign(proposalA,J.changeDirectionRoleV11(proposalA,'layout',alt.id));}
 proposalA.creativeGenomeV15=J.creativeGenomeV15(proposalA);proposalB.creativeGenomeV15=genomeB;const genomeA=J.creativeGenomeV15(proposalA);assert(J.genomeChangesV15(genomeA,genomeB).length,'retry fixture has independent genomes');
 const originalFinish=J.finishRepairsV15,originalReroll=J.rerollRoleV15,originalRecovery=J.recoverDirectionLineV112,originalMotion=J.motionDescriptorV14;
 let proposalNumber=0,beganSecondGenome=false;const rejected=Object.assign({},checks.find(e=>e.temporalStage==='HOLD'),{sampleOffset:.5,eligible:false,safe:false});
 try{
  J.randomProposalV15=()=>{if(proposalNumber++===0)return proposalA;beganSecondGenome=true;return proposalB;};
  J.finishRepairsV15=(_p,cut)=>[{...J.clonePhotoRenderPlan(cut),explorationParamsV13:{...cut.explorationParamsV13,size:(cut.explorationParamsV13?.size??1)*.91}}];
  J.rerollRoleV15=()=>null;J.recoverDirectionLineV112=async()=>Object.assign([],{examined:0});
  J.motionDescriptorV14=(items,plan)=>{const d=originalMotion(items,plan);return beganSecondGenome?{...d,holdMotion:{...d.holdMotion,value:Math.max(1e-5,d.holdMotion.value||0)}}:d;};
  const retry=await J.optimizeRandomLineV15({...args,preserveCurrent:false,initialCuts:[],budget:48,sample:(sp,cut,t)=>beganSecondGenome?probe(sp,cut,t):{...rejected,sampleOffset:t}}),audit=retry[0].optimizerEvidence.search;
  assert(retry[0].safe&&audit.fullRandomGenomeTrials>=2&&audit.newGenomeSwitches===1,'unsafe first genome switches to an independent safe genome');
  assert(audit.evaluatedCandidates<=audit.budget&&!audit.fallbackAttempted&&audit.safeCandidateFound,'independent genome safety is checked before spending its bounded repair budget');
  assert(J.canonicalJSON(retry[0].optimizerEvidence.genome.generated)===J.canonicalJSON(genomeB),'retry records the new genome, not the failed genome');
  assert(J.genomeChangesV15(genomeA,retry[0].optimizerEvidence.genome.generated).length,'retry does not inherit the failed genome identity');
  assert(args.phases(retry[0].cut).every(t=>probe({...p,style:retry[0].cut.style,styleKey:retry[0].cut.styleKey,motionObservationV14:true},retry[0].cut,t).eligible),'accepted retry passes actual Canvas safety');
 }finally{J.finishRepairsV15=originalFinish;J.rerollRoleV15=originalReroll;J.recoverDirectionLineV112=originalRecovery;J.motionDescriptorV14=originalMotion;J.randomProposalV15=originalProposal;}
 // Exhaust the ordinary frontier with a genuinely unsafe registered layout.
 // The recovery itself uses unmodified production Canvas at both resolutions.
 let stagedRow,stagedReplay;const unsafe=J.clonePhotoRenderPlan(proposalA);unsafe.layout='tile';unsafe.params={...J.LAYOUTS.tile.plan(J.rng(c.seed),c,p.style),font:c.params.font};unsafe.creativeGenomeV15=J.creativeGenomeV15(unsafe);
 try{
  J.randomProposalV15=()=>J.clonePhotoRenderPlan(unsafe);J.rerollRoleV15=()=>null;
  stagedRow=(await J.optimizeRandomLineV15({...args,preserveCurrent:false,initialCuts:[],budget:108}))[0];
  stagedReplay=(await J.optimizeRandomLineV15({...args,preserveCurrent:false,initialCuts:[],budget:108}))[0];
 }finally{J.randomProposalV15=originalProposal;J.rerollRoleV15=originalReroll;}
 const stagedAudit=stagedRow.optimizerEvidence.search;
 assert(J.canonicalJSON(stagedRow.cut)===J.canonicalJSON(stagedReplay.cut),'staged composition seed replay');
 const alreadySafe=(await J.optimizeRandomLineV15({...args,preserveCurrent:false,initialCuts:[c],budget:2}))[0];
 assert(!alreadySafe.optimizerEvidence.search.fallbackAttempted&&!J.genomeChangesV15(genome,J.creativeGenomeV15(alreadySafe.cut)).length,'safe initial random genome is retained');
 assert(stagedAudit.safetyAnchor.found&&stagedAudit.randomCompositions.attempted>0&&stagedAudit.recovery.safe,'real Canvas staged recovery discovers anchor and adds random roles');
 assert(stagedAudit.randomCompositions.rejected>0&&stagedAudit.randomCompositions.roles.some(x=>x.accepted),'real unsafe additions are rejected while safe roles survive');
 assert(stagedAudit.evaluatedCandidates<=108&&args.phases(stagedRow.cut).every(t=>probe.verifyScale({...p,style:stagedRow.cut.style,styleKey:stagedRow.cut.styleKey},stagedRow.cut,t).eligible),'staged completed genome passes 640px within budget');
 console.log('V15 STAGED PASS',JSON.stringify(stagedAudit));
 console.log('V15 TEST 1 PASS: actual Canvas retention, numeric fit, local reroll, locks and replay');
 let exhausted=null;const originalRerollB=J.rerollRoleV15,originalRecoveryB=J.recoverDirectionLineV112,base=checks.find(e=>e.temporalStage==='HOLD');
 try{J.rerollRoleV15=()=>null;J.recoverDirectionLineV112=async()=>Object.assign([],{examined:0});await J.optimizeRandomLineV15({...args,preserveCurrent:false,initialCuts:[],budget:36,phases:()=>[.5],sample:(_sp,_cut,t)=>({...base,sampleOffset:t,eligible:false,safe:false})});}
 catch(e){exhausted=e;}
 finally{J.rerollRoleV15=originalRerollB;J.recoverDirectionLineV112=originalRecoveryB;}
 assert(exhausted?.message==='V15_NO_SAFE_RANDOM_LINE_0','all unsafe candidates end in a clear failure');
 assert(exhausted.diagnostic.evaluatedCandidates<=exhausted.diagnostic.budget&&exhausted.diagnostic.fullRandomGenomeTrials>1&&exhausted.diagnostic.newGenomeSwitches>0,'all-unsafe search is bounded and retries full genomes');
 assert(exhausted.diagnostic.fallbackAttempted&&!exhausted.diagnostic.safeCandidateFound&&exhausted.diagnostic.primaryFailureReasons.length,'failure keeps compact safety diagnostics and adopts no unsafe state');
 assert(exhausted.diagnostic.perGenomeBudget<=28&&exhausted.diagnostic.perGenomeBudget<exhausted.diagnostic.frontierBudget&&exhausted.diagnostic.fallbackBudget>=3&&exhausted.diagnostic.frontierBudget+exhausted.diagnostic.fallbackBudget===exhausted.diagnostic.budget,'108-style budget is split between several bounded genomes and recovery');
 // TEST 2: actual production Canvas on a short Japanese LRC fixture. The user's
 // audio/photo are absent, so this deliberately uses generated audio and a
 // custom asymmetric Canvas background with the same 16:9/font/timing pressure.
 const fixture=J.clonePhotoRenderPlan(q);fixture.seed=15072;fixture.res=360;fixture.fps=24;fixture.aspect='16:9';fixture.timing={...fixture.timing,snap:false};
 fixture.lyrics='[00:00.511]山下アレ\n[00:04.331]山下アレ\n[00:06.072]ララーラーラー\n[00:08.211]山下アレ';
 const background=Object.assign(document.createElement('canvas'),{width:320,height:180}),bgx=background.getContext('2d'),gradient=bgx.createLinearGradient(0,0,320,180);gradient.addColorStop(0,'#11182f');gradient.addColorStop(.55,'#253b68');gradient.addColorStop(1,'#bc5a62');bgx.fillStyle=gradient;bgx.fillRect(0,0,320,180);bgx.fillStyle='rgba(20,12,35,.42)';bgx.fillRect(230,0,90,180);bgx.fillStyle='rgba(255,210,150,.35)';bgx.fillRect(18,25,38,120);
 fixture.customBg={...fixture.customBg,enabled:true,dataUrl:background.toDataURL()};J.applyImagePalette(fixture,J.analyzeCustomBackground(background,fixture),{palette:true,readability:true,mood:false});
 const duration=37.27,events=Array.from({length:Math.ceil(duration*4)},(_,i)=>{const time=i/4,beat=i%8===0||i%8===4,nearLine=[.511,4.331,6.072,8.211].some(t=>Math.abs(time-t)<.18),onset=nearLine ? .92 : beat ? .38 : .06;return {time,energy:.48,onset,brightness:.53,bass:.31,spectralFlux:nearLine ? .8 : beat ? .28 : .02,logBands:[.53,.31,.48,.08,.02,.14]};});
 const audio={duration,bpm:120,energyRate:4,energy:Float32Array.from(events.map(e=>e.energy)),onset:Float32Array.from(events.map(e=>e.onset)),features:{energy:.48,timeline:events,detailedTimeline:events}};
 const fixtureSet=await J.generateJizuraDirectionV15(fixture,audio);fixture.autoDirection=true;fixture.artDirection=J.makeArtDirection(fixture,audio,fixtureSet.recommended.proposal);fixture.fonts={...fixture.artDirection.typography};
 const fp=J.plan(fixture,audio),timed=[.511,4.331,6.072,8.211];assert(fp.W/fp.H===16/9&&fp.lines.length===4&&timed.every((t,i)=>Math.abs(fp.lines[i].start-t)<.01),'short Japanese LRC timing, 16:9 and custom-background fixture');
 const FR=new J.Renderer();await FR.loadCustomBackground(fixture.customBg.dataUrl);const fcv=Object.assign(document.createElement('canvas'),{width:256,height:144}),fm=fcv.cloneNode(),fraw=J.createRegistryRenderProbe(fp,FR,fcv,fm,{production:true}),fprobe=J.createCreativeProbeV10(fraw,fcv);fprobe.verifyScale=fraw.verifyScale;
 const fixtureRows=[],priorCuts=[];
 for(const line of [0,1,2]){
  const cut=fp.cuts.find(x=>x.line===line);let row;try{row=(await J.optimizeRandomLineV15({p:fp,c:cut,f:J.songLineFeaturesV8(fp,audio,cut),sample:fprobe,phases:x=>J.directionPhasesV11(fp,x,audio),audio,budget:108}))[0];}catch(error){console.error('V15 short-LRC Canvas diagnostic',JSON.stringify(error.diagnostic||{code:error.code||error.message}));throw error;}
  assert(row.safe&&row.phaseEvidence.every(e=>e.eligible)&&row.phaseEvidence.some(e=>e.temporalStage==='HOLD'&&e.readable&&e.full),'actual Canvas safe HOLD and allowed bounded entry/exit on fixture line '+(line+1));
  if(line===2)assert(row.cut.lineText==='ララーラーラー','target third lyric rendered');
  fixtureRows.push(row);priorCuts.push(J.canonicalJSON(row.cut));
  assert(fixtureRows.slice(0,line+1).every((saved,i)=>J.canonicalJSON(saved.cut)===priorCuts[i]),'later lyric search leaves prior safe candidate intact');
 }
 assert(fixtureRows.some(row=>row.ablations.some(x=>x.group==='cam'&&x.pixelDifference>1e-6)),'at least one short-line camera remains visibly active in production Canvas');
 assert(fixtureRows.some(row=>row.ablations.some(x=>x.group==='bg'&&x.pixelDifference>1e-6)),'at least one short-line background remains visibly active in production Canvas');
 assert(fixtureRows.some(row=>row.ablations.some(x=>x.group==='fx'&&x.pixelDifference>1e-6)),'at least one short-line FX remains visibly active in production Canvas');
 const fixtureSteps=fixtureRows.map(row=>({line:row.cut.line,candidates:[row],energy:row.features.energy})),fixturePick=J.chooseRandomStoryboardV15(fp,fixtureSteps);
 fprobe.recoverLine=(plan,pick,failures,b)=>J.recoverDirectionLineV112(plan,pick,failures,{sample:fprobe,phases:x=>J.directionPhasesV11(fp,x,audio),audio,budget:b});
 await window.v15FinalScaleChecks({fp,fixtureRows,fixtureSteps,fprobe,audio});
 const fixtureGate=await J.confirmRandomDirectionScaleV15(fp,fixtureSteps,fixturePick,fprobe,x=>J.directionPhasesV11(fp,x,audio));
 assert(fixtureGate.scaleSafety.status==='MEASURED_SAFE_SEQUENCE'&&fixtureGate.scaleSafety.width===640,'three short-fixture lines pass production 640px gate');
 assert(fixtureRows.every((row,i)=>J.canonicalJSON(row.cut)===priorCuts[i]),'scale gate does not mutate earlier safe random candidates');FR.disposeAssets?.();
 const canvasRegression={status:'PASS_SYNTHETIC_FIXTURE',realAssets:'NOT_AVAILABLE',aspect:'16:9',background:'generated custom Canvas',font:'NotoSansCJKjp-Bold',duration,lines:fixtureRows.map(row=>({line:row.cut.line,lyric:row.cut.lineText,camera:row.cut.cam,cameraContribution:row.ablations.find(x=>x.group==='cam')?.pixelDifference??null,background:row.cut.bg,backgroundContribution:row.ablations.find(x=>x.group==='bg')?.pixelDifference??null,fx:row.cut.registryFxV9||null,fxContribution:row.ablations.find(x=>x.group==='fx')?.pixelDifference??null,search:row.optimizerEvidence.search,hold:{full:row.phaseEvidence.some(e=>e.temporalStage==='HOLD'&&e.full),readable:row.phaseEvidence.some(e=>e.temporalStage==='HOLD'&&e.readable)}})),scaleGate:{status:fixtureGate.scaleSafety.status,width:fixtureGate.scaleSafety.width,rejected:fixtureGate.scaleSafety.rejected.length,recovery:fixtureGate.scaleSafety.recovery}};
 console.log('V15 TEST 2 PASS: three short Japanese lyrics measured by production Canvas at 256px and selected through the 640px gate',JSON.stringify(canvasRegression));
 // Dedicated selector is first-safe even if a later candidate scores higher.
 const firstPick={...first[0],score:0},later={...first[0],score:100};
 assert(J.chooseRandomStoryboardV15(p,[{line:0,candidates:[firstPick,later]}]).picks[0].score===0,'no score reselection');
 assert(traces.every(t=>t.compared<=t.budget&&t.genome.changedRoles.every(role=>t.repairSummary.changedRoles.includes(role))),'bounded causal changes with compact audit');
 assert(traces.some(t=>t.motionV14.holdMotion.value>1e-6),'actual selected HOLD evolution');
 const motion=traces.flatMap(t=>t.ablations);
 assert(before.some(c=>c.bg!=='none')&&before.some(c=>c.registryFxV9),'background and FX remain independently selectable in random generation');
 console.log('V15 TEST 3 PASS: selected HOLD, camera, background and FX pixels observed');
 J.assertSelectionV9(p,a);assert(selection.multiScaleEvidence.width===640&&selection.multiScaleEvidence.status==='MEASURED_SAFE_SEQUENCE','final 640px gate');
 const decisions=J.canonicalJSON(J.songNativeRenderDecisions(p));J.captureSongNativeResolved(q,a,p);
 const saved=J.compactPersistentProjectV111(q),restored=J.plan(saved,a);
 assert(restored.songNativeRestore.status==='RESTORED'&&J.canonicalJSON(J.songNativeRenderDecisions(restored))===decisions,'save restore exact render decisions');
 assert(restored.songNativeDirection.rendererCompatibilityId==='kamen-song-grammar-renderer-9','legacy renderer contract');
 assert(J.canonicalJSON(restored.lines.map(l=>l.start))===J.canonicalJSON(p.lines.map(l=>l.start)),'LRC preserved');
 const portrait=J.clonePhotoRenderPlan(q);portrait.aspect='9:16';delete portrait.artDirection.songNativeResolved;
 const set=await J.generateJizuraDirectionV15(portrait,a);portrait.artDirection=J.makeArtDirection(portrait,a,set.recommended.proposal);
 const pp=J.plan(portrait,a),pc=pp.cuts.find(c=>c.line===0),pv=Object.assign(document.createElement('canvas'),{width:256,height:Math.round(256*pp.H/pp.W)}),pm=pv.cloneNode(),pr=J.createRegistryRenderProbe(pp,R,pv,pm,{production:true}),ps=J.createCreativeProbeV10(pr,pv);ps.verifyScale=pr.verifyScale;
 const vertical=await J.optimizeRandomLineV15({p:pp,c:pc,f:J.songLineFeaturesV8(pp,a,pc),sample:ps,phases:cut=>J.directionPhasesV11(pp,cut,a),audio:a});
 const steps=[{line:0,candidates:vertical}],pick=J.chooseRandomStoryboardV15(pp,steps);ps.recoverLine=(plan,pick,failures,budget)=>J.recoverDirectionLineV112(plan,pick,failures,{sample:ps,phases:cut=>J.directionPhasesV11(pp,cut,a),audio:a,budget});
 const confirmed=await J.confirmRandomDirectionScaleV15(pp,steps,pick,ps,cut=>J.directionPhasesV11(pp,cut,a));assert(confirmed.scaleSafety.status==='MEASURED_SAFE_SEQUENCE','portrait 640px');
 // TEST D: cancellation and changed input stay explicit failures.
 const controller=new AbortController();controller.abort();let cancelled=false;try{await J.optimizeRandomLineV15({...args,signal:controller.signal});}catch(e){cancelled=e.name==='AbortError';}assert(cancelled,'cancelled preserveCurrent finishing is not reported as success');
 const mutable=J.clonePhotoRenderPlan(p);mutable.cuts=[];mutable.customBg={enabled:false};mutable.songNativeDirection={...mutable.songNativeDirection,version:8,optimizerVersion:null,explorationVersion:15};mutable.artDirection={...mutable.artDirection,songNativeDirection:mutable.songNativeDirection};
 const planHash=J.cinemaV3.planHash;let hashCall=0,changedInput=false;J.cinemaV3.planHash=async()=>++hashCall===1?'before':'changed';try{await J.searchJizuraDirectionV8(mutable,null,a,{ensureFonts:false});}catch(e){changedInput=e.message==='INPUT_CHANGED_DURING_SEARCH';}finally{J.cinemaV3.planHash=planHash;}assert(changedInput,'input changes during search remain a clear failure');
 R.disposeAssets?.();return {retention:'PASS',determinism:'PASS',freshRetry:'PASS',allUnsafeBoundedFailure:'PASS',localReroll:'PASS',preserveCurrent:'PASS',cancellation:'PASS',inputChange:'PASS',locks:'PASS',intensityDistribution:'PASS',productionRoles:'PASS',saveRestore:'PASS',LRC:'PASS',portrait:'PASS',scale:'PASS',canvasRegression,traces:traces.map(t=>({genome:t.genome,intensity:t.intensity,compared:t.compared,search:t.search,repairSummary:t.repairSummary,repairStats:t.repairStats,lightSafety:t.lightSafety})),artisticQuality:'UNVERIFIED'};
};

// Also callable alone so a failed final-scale assertion can be rerun without
// repeating generation, encodes or the unrelated regression scenarios.
module.exports.finalScale=async function finalScaleV15(input){
 const J=window.J,assert=(ok,msg)=>{if(!ok)throw Error(msg);};
 let {fp,fixtureRows,fixtureSteps,fprobe,audio}=input||{};let renderer;
 if(!fp){
  const {p,q,a}=window.comparisonV12;fp=J.clonePhotoRenderPlan(p);audio=a;
  const original=p.cuts.find(c=>c.line===0),third={...J.clonePhotoRenderPlan(original),line:2,start:4,end:4+original.dur,index:fp.cuts.length};
  fp.cuts.push(third);fp.lines.push({...fp.lines[0],start:third.start,end:third.end});fp.duration=third.end;
  const source=p.songNativeDirection.selection.traces.find(t=>t.line===0).creative;
  fixtureRows=fp.cuts.filter(c=>c.line>=0).map(cut=>({cut,safe:true,evidence:{eligible:true},optimizerEvidence:J.clonePhotoRenderPlan(source)}));
  fixtureSteps=fixtureRows.map(row=>({line:row.cut.line,candidates:[row]}));
  renderer=new J.Renderer();await renderer.loadCustomBackground(q.customBg.dataUrl);
  const cv=Object.assign(document.createElement('canvas'),{width:256,height:144}),raw=J.createRegistryRenderProbe(fp,renderer,cv,cv.cloneNode(),{production:true});fprobe=J.createCreativeProbeV10(raw,cv);fprobe.verifyScale=raw.verifyScale;
 }
 const phases=cut=>J.directionPhasesV11(fp,cut,audio);
 // Exercise production dispatch with no lyric work; deliberately changed input
 // stops before commit. Old versions must keep the original final gate.
 const randomGate=J.confirmRandomDirectionScaleV15,oldGate=J.confirmDirectionScaleV11,planHash=J.cinemaV3.planHash;
 let randomCalls=0,oldCalls=0;
 try{
  J.confirmRandomDirectionScaleV15=(...x)=>{randomCalls++;return randomGate(...x);};J.confirmDirectionScaleV11=(...x)=>{oldCalls++;return oldGate(...x);};
  for(const version of [11,12,13,14,15]){
   const plan=J.clonePhotoRenderPlan(fp);plan.cuts=[];plan.customBg={enabled:false};plan.songNativeDirection={...plan.songNativeDirection,version:8,optimizerVersion:11,explorationVersion:version>=13?version:undefined};plan.artDirection.songNativeDirection=plan.songNativeDirection;
   let calls=0,changed=false;J.cinemaV3.planHash=async()=>++calls===1?'before':'changed';
   try{await J.searchJizuraDirectionV8(plan,null,audio,{ensureFonts:false});}catch(e){changed=e.message==='INPUT_CHANGED_DURING_SEARCH';}assert(changed,'input changes abort final confirmation for version '+version);
  }
  assert(randomCalls===1&&oldCalls===4,'production v15 dispatch is dedicated; v11-v14 retain legacy gate');
  const controller=new AbortController();controller.abort();let cancelled=false;try{await randomGate(fp,fixtureSteps,J.chooseRandomStoryboardV15(fp,fixtureSteps),fprobe,phases,controller.signal);}catch(e){cancelled=e.name==='AbortError';}assert(cancelled,'final-scale cancellation propagates');
 }finally{J.confirmRandomDirectionScaleV15=randomGate;J.confirmDirectionScaleV11=oldGate;J.cinemaV3.planHash=planHash;}
 try{
 const entryContrast=await window.v15EntryContrastChecks({fp,fixtureRows,fixtureSteps,fprobe,audio});
 if(window.v15EntryOnly)return entryContrast;
 // TEST A: an actual post-composition wash exists only above 256px.
 // The third line has a singleton portfolio; the final gate must reach recovery.
 const washId='v15FinalScaleWash',originalFinal=J.confirmRandomDirectionScaleV15,legacyGate=J.confirmDirectionScaleV11;
 const washCut=J.clonePhotoRenderPlan(fixtureRows[2].cut);washCut.registryFxV9=washId;
 J.FXE[washId]={name:'test-only 640px wash',draw(ctx){if(ctx.canvas.width>256){ctx.save();ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='rgba(255,255,255,.9)';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);ctx.restore();}}};
 let gateCalls=0,recoveryCalls=0,suppliedChecks=false,recoveryResult;
 try{
  const badRow={...fixtureRows[2],cut:washCut},steps=fixtureSteps.map(step=>({...step,candidates:[step.line===2?badRow:step.candidates[0]]}));
  const beforeCuts=steps.map(step=>J.canonicalJSON(step.candidates[0].cut)),initialPick=J.chooseRandomStoryboardV15(fp,steps);
  assert(phases(washCut).every(t=>fprobe(fp,washCut,t).eligible),'256px wash candidate PASS');
  assert(phases(washCut).some(t=>!fprobe.verifyScale(fp,washCut,t).eligible),'actual 640px composed wash FAIL');
  fprobe.recoverLine=async(plan,pick,failures,budget)=>{recoveryCalls++;suppliedChecks=failures.every(f=>f.check&&f.stage&&Number.isFinite(f.time));return J.recoverDirectionLineV112(plan,pick,failures,{sample:fprobe,phases:phases,audio,budget});};
  J.confirmRandomDirectionScaleV15=async(...x)=>{gateCalls++;return originalFinal(...x);};
  recoveryResult=await J.confirmRandomDirectionScaleV15(fp,steps,initialPick,fprobe,phases);
  assert(gateCalls===1&&recoveryCalls===1&&suppliedChecks,'dedicated gate invokes existing recovery with measured phase checks');
  assert(recoveryResult.scaleSafety.rejected.length===1&&recoveryResult.scaleSafety.rejected[0].line===2&&recoveryResult.scaleSafety.rejected[0].failures.some(f=>f.contrastP10<3),'compact measured 640px contrast diagnosis');
  assert(recoveryResult.scaleSafety.recovery[0].examined<=recoveryResult.scaleSafety.recovery[0].budget&&recoveryResult.scaleSafety.recovery[0].recovered,'bounded recovery succeeds');
  assert(recoveryResult.picks.slice(0,2).every((row,i)=>J.canonicalJSON(row.cut)===beforeCuts[i]),'third-line recovery preserves other safe genomes exactly');
  assert(recoveryResult.scaleSafety.entries.length===3&&recoveryResult.scaleSafety.entries.every(row=>row.checks.every(e=>e.eligible)),'all final composed lines pass 640px');
  assert(J.canonicalJSON(recoveryResult.picks[2].optimizerEvidence.genome.generated)===J.canonicalJSON(badRow.optimizerEvidence.genome.generated),'original creative genome retained as provenance');
  assert(J.canonicalJSON(recoveryResult.picks[2].optimizerEvidence.genome.final)===J.canonicalJSON(J.creativeGenomeV15(recoveryResult.picks[2].cut)),'recovered evidence matches final cut');
  let refused=false;try{await originalFinal(fp,initialPick.picks.map(row=>({line:row.line,candidates:[row]})),initialPick,Object.assign((...x)=>fprobe(...x),{verifyScale:fprobe.verifyScale,recoverLine:async()=>[]}),phases);}catch(e){refused=e.code==='V15_SCALE_FRONTIER_EXHAUSTED';}assert(refused,'exhaustion cannot adopt unsafe candidate');
  let rendererError=false;try{await originalFinal(fp,initialPick.picks.map(row=>({line:row.line,candidates:[row]})),initialPick,Object.assign(()=>null,{verifyScale:()=>({renderErrors:[{message:'fixture renderer failure'}]})}),phases);}catch(e){rendererError=e.code==='RENDERER_ERROR';}assert(rendererError,'renderer errors are not safety exhaustion');
  assert(J.confirmDirectionScaleV11===legacyGate,'v11-v14 legacy final gate identity unchanged');
  console.log('V15 FINAL 640 RECOVERY PASS',JSON.stringify({status:recoveryResult.scaleSafety.status,lines:recoveryResult.scaleSafety.entries.length,rejected:recoveryResult.scaleSafety.rejected,recovery:recoveryResult.scaleSafety.recovery}));return recoveryResult.scaleSafety;
 }finally{delete J.FXE[washId];J.confirmRandomDirectionScaleV15=originalFinal;}
 }finally{renderer?.disposeAssets?.();}
};

// Reported failure: curtain/stamp/echoTrail/gradientV, no FX, ENTRY contrast.
// Reconstruct the technique combination; the user's original cut seed is unknown.
module.exports.entryContrast=async function entryContrastV15({fp,fixtureRows,fixtureSteps,fprobe,audio}){
 const J=window.J,copy=J.clonePhotoRenderPlan,assert=(ok,msg)=>{if(!ok)throw Error(msg);},source=fixtureRows[2].cut,style=J.STYLES.paper;
 let cut={...J.registryCandidateCut({...fp,style,styleKey:'paper'},source,'curtain','embedded_bold','stamp','echoTrail'),style,styleKey:'paper',registrySelectedV8:true,stagger:0};
 for(const [role,id] of Object.entries({enter:'stamp',hold:'echoTrail',exit:'cut',cam:'driftDiag',bg:'splitDiag',treat:'gradientV',decor:'none',fx:null,trans:'cut'}))cut=J.changeDirectionRoleV11(cut,role,id);
 cut=J.initialFinishV15(fp,cut);cut.params={...cut.params,variant:'rise',drape:true,pleats:true,col:'velvet'};cut.explorationParamsV13={size:1,dx:0,dy:0,motion:1,camera:1,fx:1,color:'#ffffff'};
 const generated=J.creativeGenomeV15(cut);cut.creativeGenomeV15=generated;
 const row={...fixtureRows[2],cut,safe:true,evidence:{eligible:true},optimizerEvidence:{...copy(fixtureRows[2].optimizerEvidence),genome:{generated,final:generated}}};
 const phases=c=>J.directionPhasesV11(fp,c,audio),checks=phases(cut).map(t=>fprobe.verifyScale(fp,cut,t));
 assert(checks.some(e=>e.temporalStage==='ENTRY'&&!e.eligible&&(e.compositedContrast?.renderedVsBackgroundContrastP10??e.contrast?.renderedVsBackgroundContrastP10)<3),'reported curtain ENTRY contrast failure reproduced on actual Canvas');
 const steps=fixtureSteps.map(step=>({...step,candidates:[step.line===2?row:step.candidates[0]]})),initial=J.chooseRandomStoryboardV15(fp,steps),before=initial.picks.map(row=>J.canonicalJSON(row.cut)),originalHook=fprobe.recoverLine;
 try{
  fprobe.recoverLine=(plan,pick,failures,budget)=>J.recoverDirectionLineV112(plan,pick,failures,{sample:fprobe,phases,audio,budget});
  const result=await J.confirmRandomDirectionScaleV15(fp,steps,initial,fprobe,phases).catch(e=>{console.log('V15 ENTRY DIAGNOSTIC',JSON.stringify(e.diagnostic));throw e;}),recovery=result.scaleSafety.recovery.find(r=>r.line===2),chosen=result.picks.find(row=>row.line===2);
  assert(recovery?.recovered&&recovery.examined<=recovery.budget&&recovery.budget===24,'reported ENTRY failure repaired within bounded per-line budget');
  assert(result.picks.filter(row=>row.line!==2).every(row=>J.canonicalJSON(row.cut)===before[initial.picks.findIndex(x=>x.line===row.line)]),'reported failure leaves all other safe lines unchanged');
  assert(result.scaleSafety.entries.every(row=>row.checks.every(e=>e.eligible)),'reconstructed reported failure passes full composed 640px gate');
  assert(recovery.diagnostic.attempts.every(a=>a.role!=='fx'),'no FX introduced to repair a line with no FX');
  assert(chosen.cut.layout!=='curtain'&&['styleKey','hold','exit','cam','bg','treat','trans','registryFxV9'].every(k=>chosen.cut[k]===cut[k]),'occlusion/entry repair retains all unrelated technique IDs');
  assert(chosen.checks.every(e=>e.lowEligible&&e.detailEligible),'recovery independently passes 256px and 640px');
  assert(J.canonicalJSON(chosen.optimizerEvidence.genome.final)===J.canonicalJSON(J.creativeGenomeV15(chosen.cut)),'repaired cut and genome evidence agree');
  console.log('V15 REPORTED ENTRY RECOVERY PASS',JSON.stringify({examined:recovery.examined,from:cut.layout,to:chosen.cut.layout,changedRoles:chosen.optimizerEvidence.genome.changedRoles,attempts:recovery.diagnostic.attempts}));
  return {status:'PASS_RECONSTRUCTED_REPORTED_TECHNIQUES',examined:recovery.examined,layout:chosen.cut.layout,exactOriginalSeed:'UNAVAILABLE'};
 }finally{fprobe.recoverLine=originalHook;}
};
