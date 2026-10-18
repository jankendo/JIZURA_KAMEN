'use strict';
// QA only. Disable precisely the executable uniform translation contract;
// leave the original grammar, camera, layout, typography and primary ink intact.
function installUniformLyricTranslationControl(J,mode,trace=[]){
 if(!['ON','OFF','ON_REPEAT'].includes(mode))throw Error('UNKNOWN_CONTROL_MODE');
 const original=J.cinemaLyricTemporalContract;if(typeof original!=='function')throw Error('TRANSLATION_CONTRACT_ABSENT');
 const stats={executableUniformCalls:0,disabledCalls:0};
 J.cinemaLyricTemporalContract=function(env,it){
  const contract=original.apply(this,arguments);
  if(contract?.status==='EXECUTABLE'&&contract.mode==='UNIFORM_TRANSLATION'){
   stats.executableUniformCalls++;
   trace.push({mode,time:env.t,cutIndex:env.cut.index,fragmentOrdinal:typeof window!=='undefined'&&window.qaResolveActualCutOrdinal?window.qaResolveActualCutOrdinal(env.plan,env.cut):null,line:env.cut.line,pass:env.pass,layout:env.cut.layout,target:'primary-uniform-translation',role:contract.state?.role,range:[env.cut.start,env.cut.end]});
   if(mode==='OFF'){stats.disabledCalls++;return {status:'NOT_APPLICABLE',reason:'QA_ISOLATED_UNIFORM_TRANSLATION_OFF'};}
  }
  return contract;
 };
 return {stats,restore(){J.cinemaLyricTemporalContract=original;}};
}
if(typeof module!=='undefined')module.exports={installUniformLyricTranslationControl};
