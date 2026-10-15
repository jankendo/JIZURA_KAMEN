'use strict';
const fs=require('node:fs'),path=require('node:path');
exports.install=async(page,out)=>{
 await page.exposeFunction('qaRecordGeneration',event=>fs.appendFileSync(path.join(out,'generation-functions.jsonl'),JSON.stringify(event)+'\n'));
 await page.evaluate(()=>{
  let ordinal=0;
  const names=['compareRegistryCandidates','chooseRegistryStoryboard','optimizeDirectionCandidatesRendered','analyzeRenderedFrames','repairCinemaSequence','measureCinemaVideoProxy','measureCinemaEncodedProxy','measureCinemaOutputReadability','encodeCinemaVisualProxy','selectCinemaProxyStages','plan'];
  for(const name of names){const original=J[name];if(typeof original!=='function')continue;
   J[name]=function(...args){const id=++ordinal,start=performance.now(),p=args[0],memory=()=>performance.memory?.usedJSHeapSize??null;
    const base={id,function:name,startedAt:Date.now(),heapBytes:memory(),candidateId:p?.cinemaCandidateMode??null,cutCount:p?.cuts?.length??null,range:args[1]?.start!==undefined?args[1]:null,measurementOptions:name==='measureCinemaOutputReadability'?{inputHash:args[3]?.inputHash??null,physicalOnly:!!args[3]?.physicalOnly,backgroundConsistency:!!args[3]?.backgroundConsistency,times:args[3]?.times??null,additionalTimes:args[3]?.additionalTimes??[],lines:args[3]?.lines??null}:null};
    window.qaRecordGeneration({...base,event:'START'});
    if(p?.cuts&&J.cinemaV3?.planHash)J.cinemaV3.planHash(p).then(planHash=>window.qaRecordGeneration({id,event:'INPUT_PLAN_HASH',planHash})).catch(()=>{});
    const end=(value,error)=>{window.qaRecordGeneration({id,function:name,event:error?'ERROR':'END',elapsedMs:performance.now()-start,heapBytes:memory(),status:value?.status??null,completed:value?.completed??null,measurementReuse:value?.measurementReuse??null,cacheIdentity:value?.cacheIdentity??null,renderCounts:value?.renderCounts??null,error:error?String(error.stack):null});if(error)throw error;return value;};
    try{const result=original.apply(this,args);return result?.then?result.then(v=>end(v),e=>end(null,e)):end(result);}catch(error){return end(null,error);}
   };
  }
 });
};
