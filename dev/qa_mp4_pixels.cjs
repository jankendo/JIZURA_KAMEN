/* Decode real MP4 pixels and compare every audited LRC checkpoint to Canvas. */
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const {J,createCanvas}=require('./raster_test_support.cjs');
async function verify(outDir,filename,plan,points,range){
 const file=path.join(outDir,filename),w=plan.H>plan.W?108:192,h=plan.H>plan.W?192:108,fps=plan.fps||30;
 const rawPath=path.join(outDir,filename+'.rgba'),decoded=cp.spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-i',file,'-vf',`scale=${w}:${h}`,'-f','rawvideo','-pix_fmt','rgba','-y',rawPath],{stdio:'ignore'});
 if(decoded.status!==0)throw Error('MP4 decode failed');
 decoded.stdout=fs.readFileSync(rawPath);fs.unlinkSync(rawPath);
 const frameBytes=w*h*4,frames=Math.floor(decoded.stdout.length/frameBytes),R=new J.Renderer(),canvas=createCanvas(w,h),audit=createCanvas(w,h),ctx=canvas.getContext('2d'),auditCtx=audit.getContext('2d');
 if(plan.customBg?.enabled&&plan.customBg.dataUrl)await R.loadCustomBackground(plan.customBg.dataUrl);
 const checked=[],failures=[];
 for(const point of points){
  const frameIndex=Math.max(0,Math.min(frames-1,Math.round((point.time-(range?.start||0))*fps))),time=(range?.start||0)+frameIndex/fps,items=[];
  R.frame(ctx,plan,time,{scale:w/plan.W,production:true,range,lyricAuditCtx:auditCtx,lyricAuditItems:items});
  const expected=ctx.getImageData(0,0,w,h).data,mask=auditCtx.getImageData(0,0,w,h).data,actual=decoded.stdout.subarray(frameIndex*frameBytes,(frameIndex+1)*frameBytes);
  let masked=0,maskCount=0,whole=0,wholeCount=0;
  for(let i=0;i<frameBytes;i+=4){const difference=(Math.abs(actual[i]-expected[i])+Math.abs(actual[i+1]-expected[i+1])+Math.abs(actual[i+2]-expected[i+2]))/765;
    whole+=difference;wholeCount++;if(mask[i+3]>32){masked+=difference;maskCount++;}}
  const error=masked/Math.max(1,maskCount),backgroundError=whole/Math.max(1,wholeCount),ok=(!point.allowEmpty?maskCount>=5:true)&&error<Math.max(.27,backgroundError*3+.1);
  const result={line:point.line,phase:point.phase,time:point.time,frameIndex,maskCount,maskedError:+error.toFixed(4),frameError:+backgroundError.toFixed(4),ok};checked.push(result);if(!ok)failures.push(result);
 }
 R.customBgBitmap?.close?.();return {file:filename,frames,width:w,height:h,checks:checked.length,failures,points:checked};
}
(async()=>{const outDir=process.argv[2];if(!outDir)throw Error('usage: node dev/qa_mp4_pixels.cjs OUT_DIR');
 const {full,social,hook}=JSON.parse(fs.readFileSync(path.join(outDir,'qa_render_plans.json'))),report=JSON.parse(fs.readFileSync(path.join(outDir,'render_report.json')));
 const special=[{time:.1,phase:'intro',allowEmpty:true},{time:full.lines[0].start+.15,phase:'first-lyric'},...(full.musicalStructure?.sections||[]).slice(1).flatMap(s=>[{time:Math.max(.1,s.from-.06),phase:'boundary-before'},{time:s.from+.08,phase:'boundary-after',allowEmpty:true}]),{time:full.duration/2,phase:'middle',allowEmpty:true},{time:(full.climax?.time||full.duration*.8)+.15,phase:'climax',allowEmpty:true},{time:full.duration-.15,phase:'ending',allowEmpty:true},...(report.pixelQA.visualHitAlignment?.samples||[]).map(s=>({time:s.peakTime,phase:'visual-hit',allowEmpty:true}))];
 const fullQA=await verify(outDir,'FULL_MV_SAMPLE.mp4',full,report.pixelQA.lyricPoints.concat(special),null);
 const socialQA=await verify(outDir,'SOCIAL_HYPE_SAMPLE.mp4',social,report.socialPixelQA.lyricPoints,{start:hook.start,end:hook.end});
 const result={full:fullQA,social:socialQA,totalChecks:fullQA.checks+socialQA.checks,failures:fullQA.failures.length+socialQA.failures.length};fs.writeFileSync(path.join(outDir,'mp4_pixel_qa.json'),JSON.stringify(result,null,2));
 console.log(JSON.stringify({full:{checks:fullQA.checks,failures:fullQA.failures},social:{checks:socialQA.checks,failures:socialQA.failures},total:result.totalChecks}));if(result.failures)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1});
