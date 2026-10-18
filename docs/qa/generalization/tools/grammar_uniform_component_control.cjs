'use strict';
// Isolate exactly the existing uniform light/continuity dy summand. No new effect.
function installGrammarUniformComponentControl(J,mode,trustedFunctionBody,trace=[]){
 if(!['ON','OFF','ON_REPEAT'].includes(mode))throw Error('UNKNOWN_CONTROL_MODE');
 const original=J.applyTypography5,stats={targetCalls:0,matchedFunctions:0,modifiedEvaluations:0};
 J.applyTypography5=function(env,it){
  const s=J.cinemaTemporalState?.(env.plan,env.cut,env.t);
  if(!it.grammarMode||!s||!['light','continuity'].includes(s.role)||env.plan.cinemaSemanticNeutral||env.cut.locked||J.photoChoreographyLocked?.(env.plan,env.cut)||!J.cinemaV5.isPrimaryInternalLyric(env,it))return original.apply(this,arguments);
  stats.targetCalls++;const descriptor=Object.getOwnPropertyDescriptor(it,'charFns');if(descriptor&&!descriptor.configurable)throw Error('UNWRAPPABLE_CHAR_FUNCTION_PROPERTY');let array=it.charFns||[],proxy,matched=0;const wrapped=new WeakSet(),component=()=>s.role==='light'?-env.H*.018*s.travel:env.H*.002*Math.sin(s.u*Math.PI);
  const wrap=fn=>{if(typeof fn!=='function'||wrapped.has(fn))return fn;const body=Function.prototype.toString.call(fn);if(body!==trustedFunctionBody){if(body.includes("s.role==='light'")&&body.includes("s.role==='continuity'"))throw Error('UNTRUSTED_UNIFORM_FUNCTION_BODY');return fn;}matched++;stats.matchedFunctions++;function controlled(...args){const value=fn.apply(this,args),dy=component();if(mode!=='OFF'||dy===0)return value;if(!Number.isFinite(value?.dy))throw Error('UNIFORM_DY_NOT_FINITE');stats.modifiedEvaluations++;return {...value,dy:value.dy-dy};}wrapped.add(controlled);return controlled;};
  const arm=a=>{if(!Array.isArray(a))throw Error('NON_ARRAY_CHAR_FUNCTIONS');array=a;for(let i=0;i<a.length;i++)a[i]=wrap(a[i]);proxy=new Proxy(a,{get(target,key,receiver){return key==='push'?(...items)=>Array.prototype.push.apply(target,items.map(wrap)):Reflect.get(target,key,receiver);},set(target,key,value,receiver){return Reflect.set(target,key,typeof value==='function'?wrap(value):value,receiver);}});return proxy;};
  Object.defineProperty(it,'charFns',{configurable:true,enumerable:true,get:()=>proxy,set:arm});arm(array);
  try{return original.apply(this,arguments);}finally{const value=array;delete it.charFns;if(descriptor)Object.defineProperty(it,'charFns',{...descriptor,...('value'in descriptor?{value}:{})});else it.charFns=value;if(!matched)throw Error('EXPECTED_UNIFORM_FUNCTION_NOT_OBSERVED');const anchorBefore=it.cinemaAnchorMotion?{...it.cinemaAnchorMotion}:null;if(mode==='OFF'&&it.cinemaAnchorMotion){if(it.cinemaAnchorMotion.dx!==0||it.cinemaAnchorMotion.dy!==component())throw Error('UNEXPECTED_UNIFORM_ANCHOR_COMPONENT');it.cinemaAnchorMotion={...it.cinemaAnchorMotion,dy:0};}trace.push({kind:'isolatedGrammarUniformComponent',target:'primary-uniform-translation',pass:env.pass,mode,sourceTimestamp:env.t,cutIndex:env.cut.index,line:env.cut.line,range:[env.cut.start,env.cut.end],role:s.role,travel:s.travel,predictedUniformDY:component(),anchorBefore,anchorAfter:it.cinemaAnchorMotion??null,matchedFunctions:matched});}
 };
 return {stats,restore(){J.applyTypography5=original;}};
}
if(typeof module!=='undefined')module.exports={installGrammarUniformComponentControl};
