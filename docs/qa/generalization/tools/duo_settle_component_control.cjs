'use strict';
// Diagnostic only: preserve all production wrappers, isolate one exact existing dx summand.
function installDuoSettleComponentControl(J, mode, trustedFunctionBody, trace) {
 if(!['ON','OFF','ON_REPEAT'].includes(mode))throw Error('UNKNOWN_CONTROL_MODE');
 const original=J.applyTypography5, stats={targetCalls:0,matchedPushes:0,unknownTargetCalls:0,modifiedEvaluations:0};
 J.applyTypography5=function(env,it){
  if(env.cut?.grammar?.mode!=='duo'||env.plan?.cinemaSemanticNeutral)return original.apply(this,arguments);
  stats.targetCalls++;const descriptor=Object.getOwnPropertyDescriptor(it,'charFns');if(descriptor&&!descriptor.configurable)throw Error('UNWRAPPABLE_CHAR_FUNCTION_PROPERTY');
  let array=it.charFns||[],proxy;const wrapped=new WeakSet();let matched=0;
  const wrap=fn=>{
   if(typeof fn!=='function'||wrapped.has(fn))return fn;
   const body=Function.prototype.toString.call(fn);
   if(body!==trustedFunctionBody){if(body.includes("mode==='gather'")&&body.includes("mode==='duo'"))throw Error('UNTRUSTED_DUO_SETTLE_FUNCTION_BODY');return fn;}
   matched++;stats.matchedPushes++;
   function controlled(...args){const result=fn.apply(this,args),glyph=args[1],u=Math.max(0,Math.min(1,env.lt/Math.max(.1,env.cut.dur))),v=Math.max(0,Math.min(1,u*3)),settle=1-v*v*(3-2*v),component=(glyph.li%2?1:-1)*env.W*.035*settle;if(mode!=='OFF'||component===0)return result;stats.modifiedEvaluations++;return {...result,dx:result.dx-component};}
   wrapped.add(controlled);return controlled;
  };
  const arm=a=>{if(!Array.isArray(a))throw Error('NON_ARRAY_CHAR_FUNCTIONS');array=a;for(let i=0;i<array.length;i++)array[i]=wrap(array[i]);proxy=new Proxy(array,{get(target,key,receiver){if(key==='push')return (...items)=>Array.prototype.push.apply(target,items.map(wrap));return Reflect.get(target,key,receiver);},set(target,key,value,receiver){return Reflect.set(target,key,typeof value==='function'?wrap(value):value,receiver);}});return proxy;};
  Object.defineProperty(it,'charFns',{configurable:true,enumerable:true,get:()=>proxy,set:arm});arm(array);
  try{return original.apply(this,arguments);}finally{const value=array;delete it.charFns;if(descriptor){Object.defineProperty(it,'charFns',{...descriptor,...('value'in descriptor?{value}:{})});}else it.charFns=value;if(matched===0){stats.unknownTargetCalls++;throw Error('EXPECTED_DUO_SETTLE_FUNCTION_NOT_OBSERVED');}if(trace)trace.push({time:env.t,cutIndex:env.cut.index,line:env.cut.line,pass:env.pass,localTime:env.lt,duration:env.cut.dur,settleActionRange:[env.cut.start,env.cut.start+env.cut.dur/3],matchedExactFunctions:matched,mode});}
 };
 return {stats,restore(){J.applyTypography5=original;}};
}
if(typeof module!=='undefined')module.exports={installDuoSettleComponentControl};
