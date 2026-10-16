'use strict';
// Isolate the existing continuity dy summand only; never modify the production source.
function installTemporalContinuityComponentControl(J,mode,trustedFunctionBody,trace){
 if(!['ON','OFF','ON_REPEAT'].includes(mode))throw Error('UNKNOWN_CONTROL_MODE');
 const original=J.applyTypography5,stats={targetCalls:0,matchedPushes:0,modifiedEvaluations:0};
 J.applyTypography5=function(env,it){
  if(env.cut?.grammar?.temporal?.role!=='continuity'||!it.grammarMode||env.plan?.cinemaSemanticNeutral||env.cut.locked||J.photoChoreographyLocked?.(env.plan,env.cut))return original.apply(this,arguments);
  stats.targetCalls++;const descriptor=Object.getOwnPropertyDescriptor(it,'charFns');if(descriptor&&!descriptor.configurable)throw Error('UNWRAPPABLE_CHAR_FUNCTION_PROPERTY');
  let array=it.charFns||[],proxy,matched=0;const wrapped=new WeakSet();
  const wrap=fn=>{if(typeof fn!=='function'||wrapped.has(fn))return fn;const body=Function.prototype.toString.call(fn);if(body!==trustedFunctionBody){if(body.includes("s.role==='continuity'")&&body.includes('s.travel'))throw Error('UNTRUSTED_TEMPORAL_CONTINUITY_FUNCTION_BODY');return fn;}
   matched++;stats.matchedPushes++;function controlled(...args){const value=fn.apply(this,args);if(mode!=='OFF')return value;const u=Math.max(0,Math.min(1,(env.t-env.cut.start)/Math.max(.1,env.cut.dur))),component=env.H*.002*Math.sin(u*Math.PI);if(component===0)return value;if(!Number.isFinite(value?.dy))throw Error('CONTINUITY_DY_NOT_FINITE');stats.modifiedEvaluations++;return{...value,dy:value.dy-component};}wrapped.add(controlled);return controlled;};
  const arm=a=>{if(!Array.isArray(a))throw Error('NON_ARRAY_CHAR_FUNCTIONS');array=a;for(let i=0;i<a.length;i++)a[i]=wrap(a[i]);proxy=new Proxy(a,{get(target,key,receiver){return key==='push'?(...items)=>Array.prototype.push.apply(target,items.map(wrap)):Reflect.get(target,key,receiver);},set(target,key,value,receiver){return Reflect.set(target,key,typeof value==='function'?wrap(value):value,receiver);}});return proxy;};
  Object.defineProperty(it,'charFns',{configurable:true,enumerable:true,get:()=>proxy,set:arm});arm(array);
  try{return original.apply(this,arguments);}finally{const value=array;delete it.charFns;if(descriptor)Object.defineProperty(it,'charFns',{...descriptor,...('value'in descriptor?{value}:{})});else it.charFns=value;if(!matched)throw Error('EXPECTED_CONTINUITY_FUNCTION_NOT_OBSERVED');trace?.push({mode,time:env.t,cutIndex:env.cut.index,line:env.cut.line,pass:env.pass,range:[env.cut.start,env.cut.end],target:'primary-local-glyph-dy',component:'H*.002*sin(clamp((t-start)/duration)*PI)',matchedExactFunctions:matched});}
 };
 return{stats,restore(){J.applyTypography5=original;}};
}
if(typeof module!=='undefined')module.exports={installTemporalContinuityComponentControl};
