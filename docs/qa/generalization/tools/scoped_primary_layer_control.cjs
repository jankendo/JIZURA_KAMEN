'use strict';
// Browser-installable diagnostic. Targets a source cut at an outer output clock,
// including recursive outgoing snapshots. This is not an encoded-effect proof.
function installScopedPrimaryLayerControl(J, plan, outputContext, target, mode) {
 if (!['TRACE','OMIT'].includes(mode)) throw Error('INVALID_LAYER_CONTROL_MODE');
 if (!Number.isInteger(target.ordinal) || target.ordinal < 0 || !plan.cuts[target.ordinal]) throw Error('INVALID_TARGET_ORDINAL');
 if (!Array.isArray(target.outputClocks) || !target.outputClocks.length || target.outputClocks.some(t=>!Number.isFinite(t))) throw Error('EXACT_OUTPUT_CLOCKS_REQUIRED');
 const source=target.sourceRange;
 if (!Array.isArray(source)||source.length!==2||!source.every(Number.isFinite)||source[0]>=source[1]) throw Error('SOURCE_INTERVAL_REQUIRED');
 const clocks=new Set(target.outputClocks),frame=J.Renderer.prototype.frame,draw=J.drawItem,records=[];
 let outputClock=null,depth=0,restored=false;
 function frameWrapper(ctx,p,t,...args) {
  const outer=p===plan&&ctx===outputContext&&depth===0,previous=outputClock;
  if(outer) outputClock=t;
  depth++;
  try{return frame.call(this,ctx,p,t,...args);}finally{depth--;if(outer)outputClock=previous;}
 }
 function drawWrapper(env,it) {
  const primary=env.plan===plan&&env.pass==='main'&&J.cinemaV5.isPrimaryInternalLyric(env,it);
  if(primary&&outputClock!==null) {
   let ordinal=plan.cuts.indexOf(env.cut);
   if(ordinal<0){const matches=plan.cuts.flatMap((c,i)=>c.index===env.cut.index&&c.line===env.cut.line&&c.start===env.cut.start&&c.end===env.cut.end&&String(c.text??c.lineText)===String(env.cut.text??env.cut.lineText)?[i]:[]);if(matches.length!==1)throw Error('ACTUAL_CUT_CONTRACT_NOT_UNIQUE');ordinal=matches[0];}
   const selected=ordinal===target.ordinal&&clocks.has(outputClock)&&env.t>=source[0]&&env.t<source[1];
   const matrix=env.ctx.getTransform();
   records.push({outputTimestamp:outputClock,sourceTimestamp:env.t,ordinal,canvasIsOutput:env.ctx===outputContext,selected,omitted:selected&&mode==='OMIT',text:it.text,matrix:[matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f]});
   if(selected&&mode==='OMIT')return null;
  }
  return draw.call(this,env,it);
 }
 J.Renderer.prototype.frame=frameWrapper;J.drawItem=drawWrapper;
 return {records,restore(){if(restored)return;restored=true;if(J.Renderer.prototype.frame!==frameWrapper||J.drawItem!==drawWrapper)throw Error('CONTROL_HOOK_REPLACED');J.Renderer.prototype.frame=frame;J.drawItem=draw;}};
}
module.exports={installScopedPrimaryLayerControl};
