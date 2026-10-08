'use strict';
// Complementary native QA: real application Canvas frames and MP4 inspection,
// FFmpeg encoding/decoding. This does NOT certify the browser WebCodecs/UI path.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process'),assert=require('node:assert/strict'),{once}=require('node:events');
const {engine}=require('./custom_test_support.cjs');
const out=process.argv[2];if(!out)throw Error('Provide QA output directory');fs.mkdirSync(out,{recursive:true});
const {J,createCanvas}=engine(),reports=[];
(async()=>{
 for(const aspect of ['16:9','9:16','1:1']){
  const p=J.defaultProject();Object.assign(p,{seed:777,title:'品質検証',artist:'',aspect,res:1080,fps:30,includeAudio:true,lyrics:'[00:00.00]光をつなぐ\n[00:01.00]未来へ進む'});
  p.exportSettings={...p.exportSettings,sampleRate:48000,audioBitrate:192000,platform:'x',fpsMode:'manual'};
  const a={duration:2,bpm:120,beats:[0,.5,1,1.5],features:{energy:.7,beatStrength:.8,density:.6}},plan=J.plan(p,a),[w,h]=J.outputSize(p),canvas=createCanvas(w,h),ctx=canvas.getContext('2d'),r=new J.Renderer(),estimate=J.estimateExport(p,2,true);
  const name='検証_'+aspect.replace(':','x')+'_日本語.mp4',file=path.join(out,name),fps=plan.fps,total=Math.round(2*fps);
  const encoder=cp.spawn('ffmpeg',['-hide_banner','-loglevel','error','-f','rawvideo','-pixel_format','rgba','-video_size',`${w}x${h}`,'-framerate',''+fps,'-i','pipe:0','-f','lavfi','-i','sine=frequency=440:sample_rate=48000:duration=2','-c:v','libx264','-threads','1','-b:v',''+Math.round(estimate.videoBitrate),'-pix_fmt','yuv420p','-c:a','aac','-b:a','192000','-ar','48000','-shortest','-movflags','+faststart','-y',file],{stdio:['pipe','ignore','pipe']});let errors='';encoder.stderr.on('data',d=>errors+=d);const done=once(encoder,'close');let start=performance.now();
  const reference=[];const tiny=createCanvas(96,Math.round(96*h/w)),tx=tiny.getContext('2d');
  for(let i=0;i<total;i++){r.frame(ctx,plan,i/fps,{scale:w/plan.W,production:true,range:{start:0,end:2}});if([0,15,30,59].includes(i)){tx.drawImage(canvas,0,0,tiny.width,tiny.height);reference.push({frame:i,data:Buffer.from(tx.getImageData(0,0,tiny.width,tiny.height).data)});}const pixels=ctx.getImageData(0,0,w,h).data;if(!encoder.stdin.write(Buffer.from(pixels.buffer,pixels.byteOffset,pixels.byteLength)))await once(encoder.stdin,'drain');}
  encoder.stdin.end();const [code]=await done;if(code!==0)throw Error(errors||'ffmpeg encoding failed');r.disposeAssets();const elapsed=performance.now()-start;
  const bytes=fs.readFileSync(file),inspection=J.inspectMP4Buffer(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));assert.equal(inspection.width,w);assert.equal(inspection.height,h);assert.equal(inspection.videoSamples,total);assert.equal(inspection.videoCodec,'avc1');assert.equal(inspection.audioCodec,'mp4a');assert(Math.abs(inspection.duration-2)<.2);
  const probe=JSON.parse(cp.execFileSync('ffprobe',['-v','error','-show_streams','-show_format','-of','json',file],{encoding:'utf8'}));assert(probe.streams.some(s=>s.codec_name==='aac'&&s.sample_rate==='48000'));assert(probe.streams.some(s=>s.codec_name==='h264'&&s.avg_frame_rate===`${fps}/1`));
  const decoded=cp.execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-i',file,'-vf',`scale=${tiny.width}:${tiny.height}`,'-pix_fmt','rgba','-f','rawvideo','pipe:1'],{maxBuffer:16e6});const stride=tiny.width*tiny.height*4;assert.equal(decoded.length/stride,total);
  const comparisons=reference.map(({frame,data})=>{const rgb=decoded.subarray(frame*stride,(frame+1)*stride);let error=0;for(let i=0;i<data.length;i+=4)error+=Math.abs(data[i]-rgb[i])+Math.abs(data[i+1]-rgb[i+1])+Math.abs(data[i+2]-rgb[i+2]);const mae=error/(data.length/4*3*255);assert(mae<.1);return {frame,meanAbsoluteRGBError:mae,nonBlack:J.nonBlackRGBFraction(rgb)};});
  const audio=cp.execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-i',file,'-vn','-f','f32le','pipe:1'],{maxBuffer:2e6}),pcm=new Float32Array(audio.buffer,audio.byteOffset,audio.length/4);let sum=0;for(const v of pcm)sum+=v*v;assert(sum/pcm.length>.0001);
  reports.push({aspect,status:'PASS',path:file,seconds:2,renderAndExternalEncodeMs:elapsed,inspection,requestedBitrate:estimate.videoBitrate,requestedAudioBitrate:192000,audioDecodedSamples:pcm.length,audioRMS:Math.sqrt(sum/pcm.length),decodedFrameComparisons:comparisons});console.log(aspect,'native Canvas → FFmpeg MP4 → real decode PASS');
 }
 const report={status:'PASS_COMPLEMENTARY_NATIVE_QA',browserWebCodecs:'NOT_TESTED',reports};fs.writeFileSync(path.join(out,'mp4-smoke-report.json'),JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
