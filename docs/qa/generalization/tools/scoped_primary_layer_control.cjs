'use strict';
// Browser-installable diagnostic. Targets a source cut at an outer output clock,
// including recursive outgoing snapshots. This is not an encoded-effect proof.
function installScopedPrimaryLayerControl(J, plan, outputContext, target, mode) {
 if (!['TRACE','OMIT','SHIFT_SENSOR'].includes(mode)) throw Error('INVALID_LAYER_CONTROL_MODE');
 if (!Number.isInteger(target.ordinal) || target.ordinal < 0 || !plan.cuts[target.ordinal]) throw Error('INVALID_TARGET_ORDINAL');
 if (!Array.isArray(target.outputClocks) || !target.outputClocks.length || target.outputClocks.some(t=>!Number.isFinite(t))) throw Error('EXACT_OUTPUT_CLOCKS_REQUIRED');
 const source=target.sourceRange;
 if (!Array.isArray(source)||source.length!==2||!source.every(Number.isFinite)||source[0]>=source[1]) throw Error('SOURCE_INTERVAL_REQUIRED');
 if(!outputContext&&(!Array.isArray(target.outputDimensions)||target.outputDimensions.length!==2||target.outputDimensions.some(v=>!Number.isInteger(v)||v<=0)))throw Error('OUTPUT_SURFACE_DIMENSIONS_REQUIRED');
 if(mode==='SHIFT_SENSOR'&&(!(target.shiftPixels>2)||!Number.isFinite(target.shiftPixels)||target.outputClocks.at(-1)<=target.outputClocks[0]))throw Error('INDEPENDENT_MOVING_SENSOR_CONTROL_REQUIRED');
 if(typeof J.mainDraw!=='function')throw Error('PRIMARY_DRAW_OWNER_REQUIRED');
 const clocks=new Set(target.outputClocks),frame=J.Renderer.prototype.frame,draw=J.drawItem,main=J.mainDraw,records=[],owners=[];
 let outputClock=null,activeOutput=outputContext,depth=0,restored=false;
 function frameWrapper(ctx,p,t,...args) {
  const surface=outputContext?ctx===outputContext:ctx.canvas?.width===target.outputDimensions[0]&&ctx.canvas?.height===target.outputDimensions[1]&&ctx.getContextAttributes?.().alpha===false;
  const outer=p===plan&&surface&&depth===0,previous=outputClock,previousOutput=activeOutput;
  if(outer){outputClock=t;activeOutput=ctx;}
  depth++;
  try{return frame.call(this,ctx,p,t,...args);}finally{depth--;if(outer){outputClock=previous;activeOutput=previousOutput;}}
 }
 function drawWrapper(env,it) {
  const owned=owners.some(o=>o.plan===env.plan&&o.ctx===env.ctx);
  const primary=owned&&env.plan===plan&&env.pass==='main'&&J.cinemaV5.isPrimaryInternalLyric(env,it);
  if(primary&&outputClock!==null) {
   let ordinal=plan.cuts.indexOf(env.cut);
   if(ordinal<0){const matches=plan.cuts.flatMap((c,i)=>c.index===env.cut.index&&c.line===env.cut.line&&c.start===env.cut.start&&c.end===env.cut.end&&String(c.text??c.lineText)===String(env.cut.text??env.cut.lineText)?[i]:[]);if(matches.length!==1)throw Error('ACTUAL_CUT_CONTRACT_NOT_UNIQUE');ordinal=matches[0];}
   const selected=ordinal===target.ordinal&&clocks.has(outputClock)&&env.t>=source[0]&&env.t<source[1];
   const matrix=env.ctx.getTransform();
   const shift=selected&&mode==='SHIFT_SENSOR'?target.shiftPixels*(outputClock-target.outputClocks[0])/(target.outputClocks.at(-1)-target.outputClocks[0]):0;
   records.push({outputTimestamp:outputClock,sourceTimestamp:env.t,ordinal,canvasIsOutput:env.ctx===activeOutput,owner:'J.mainDraw',selected,omitted:selected&&mode==='OMIT',shiftOutputPixels:shift,text:it.text,matrix:[matrix.a,matrix.b,matrix.c,matrix.d,matrix.e,matrix.f]});
   if(selected&&mode==='OMIT')return null;
   if(selected&&mode==='SHIFT_SENSOR'){if(env.ctx!==activeOutput)throw Error('SHIFT_TARGET_IS_NOT_FINAL_OUTPUT_SURFACE');env.ctx.save();try{env.ctx.setTransform(matrix.a,matrix.b,matrix.c,matrix.d,matrix.e+shift,matrix.f);return draw.call(this,env,it);}finally{env.ctx.restore();}}
  }
  return draw.call(this,env,it);
 }
 function mainWrapper(env,...args){owners.push({plan:env.plan,ctx:env.ctx});try{return main.call(this,env,...args);}finally{owners.pop();}}
 J.Renderer.prototype.frame=frameWrapper;J.drawItem=drawWrapper;J.mainDraw=mainWrapper;
 return {records,restore(){if(restored)return;restored=true;if(J.Renderer.prototype.frame!==frameWrapper||J.drawItem!==drawWrapper||J.mainDraw!==mainWrapper)throw Error('CONTROL_HOOK_REPLACED');J.Renderer.prototype.frame=frame;J.drawItem=draw;J.mainDraw=main;}};
}
module.exports={installScopedPrimaryLayerControl};
