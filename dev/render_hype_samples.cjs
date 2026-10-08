/* Renders representative FULL MV and SOCIAL HOOK samples from the shipped engine. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),{once}=require('node:events');
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
async function encode(plan,renderer,audioFile,outFile,range=null){
 const fps=plan.fps||30,w=plan.H>plan.W?720:1280,h=plan.H>plan.W?1280:Math.round(w*plan.H/plan.W),duration=range?range.end-range.start:plan.duration,start=range?.start||0;
 const args=['-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','mjpeg','-framerate',String(fps),'-i','pipe:0'];
 if(range)args.push('-ss',String(start));args.push('-i',audioFile,'-map','0:v:0','-map','1:a:0','-t',String(duration),'-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart','-y',outFile);
 const encoder=cp.spawn('ffmpeg',args,{stdio:['pipe','inherit','inherit']}),canvas=createCanvas(w,h),ctx=canvas.getContext('2d'),total=Math.ceil(duration*fps);
 for(let i=0;i<total;i++){
  const t=start+i/fps;if(t>=(range?.end??plan.duration))break;
  renderer.frame(ctx,plan,t,{scale:w/plan.W,production:true,range});
  if(!encoder.stdin.write(canvas.toBuffer('image/jpeg',94)))await once(encoder.stdin,'drain');
  if(i%240===0)console.log(path.basename(outFile),i+'/'+total);
 }
 encoder.stdin.end();const [code]=await once(encoder,'close');if(code)throw new Error('ffmpeg failed '+code);
}
(async()=>{
 const [fixture,pcm,audioFile,fontDir,outDir]=process.argv.slice(2);if(!outDir)throw new Error('Usage: node dev/render_hype_samples.cjs project.json audio.f32 audio.m4a fontDir outDir');
 fs.mkdirSync(outDir,{recursive:true});
 if(['ffmpeg','ffprobe'].some(name=>cp.spawnSync(name,['-version'],{stdio:'ignore'}).status!==0)){fs.writeFileSync(path.join(outDir,'environment_status.json'),JSON.stringify({status:'SKIPPED_ENVIRONMENT_MISSING',tools:['ffmpeg','ffprobe']}));console.log('SKIPPED_ENVIRONMENT_MISSING');return;}fs.mkdirSync(path.join(outDir,'representative_frames'),{recursive:true});
 for(const name of fs.readdirSync(fontDir).filter(n=>/\.ttf$/i.test(n)))GlobalFonts.registerFromPath(path.join(fontDir,name),'JIZURA Noto CJK JP');
 const raw=fs.readFileSync(pcm),samples=new Float32Array(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
 const audioBuffer={sampleRate:48000,length:samples.length,duration:samples.length/48000,numberOfChannels:1,getChannelData:()=>samples};class AC{async decodeAudioData(){return audioBuffer;}close(){}}
 const window={AudioContext:AC},document={getElementById:()=>null,createElement:tag=>tag==='canvas'?createCanvas(1,1):{setAttribute(){},appendChild(){}},fonts:{load:async()=>[],ready:Promise.resolve(),check:()=>true},head:{appendChild(){}}};
 const context=vm.createContext({window,document,console,Blob,TextEncoder,URL,fetch,createImageBitmap:async b=>loadImage(Buffer.from(await b.arrayBuffer())),ArrayBuffer,DataView,setTimeout,clearTimeout,performance,requestAnimationFrame:f=>setTimeout(()=>f(performance.now()),0)});
 const root=path.resolve(__dirname,'..');for(const name of fs.readdirSync(path.join(root,'src')).filter(x=>x.endsWith('.js')&&!x.startsWith('12_')).sort())vm.runInContext(fs.readFileSync(path.join(root,'src',name),'utf8'),context,{filename:name});
 const J=window.J;J.ensureFonts=async()=>{};const project=JSON.parse(fs.readFileSync(fixture,'utf8')),audio=await J.analyzeAudio(new Blob([raw]));
 const proposal=J.proposeDirection(project,audio,project.autoPalette?.stats||null);
 Object.assign(project,{style:proposal.style,mood:proposal.mood,fx:proposal.fx,enabled:proposal.enabled,seed:proposal.seed,autoDirection:true,fonts:{}});project.artDirection=J.makeArtDirection(project,audio,proposal);project.fonts={...project.artDirection.typography};
 const plan=J.plan(project,audio),renderer=new J.Renderer();await renderer.loadCustomBackground(plan.customBg.dataUrl);
 const qa=await J.analyzeRenderedFrames(plan,null,audio),full=path.join(outDir,'FULL_MV_SAMPLE.mp4');
 const socialCandidates=J.socialHookCandidates(plan,audio),hook=socialCandidates[0],social=path.join(outDir,'SOCIAL_HYPE_SAMPLE.mp4'),portrait=J.plan({...project,aspect:'9:16'},audio),socialPlan=J.createSocialHookPlan?J.createSocialHookPlan(portrait,hook):portrait;
 const packContext=J.directorContext(project,plan,audio),audioBlob=new Blob([fs.readFileSync(audioFile)],{type:'audio/mp4'});audioBlob.name=path.basename(audioFile);const pack=await J.createDirectorPack({context:packContext,project,audioFile:audioBlob});fs.writeFileSync(path.join(outDir,'JIZURA_DIRECTOR_PACK_SAMPLE.zip'),Buffer.from(await pack.arrayBuffer()));
 fs.writeFileSync(path.join(outDir,'qa_render_plans.json'),JSON.stringify({full:plan,social:socialPlan,hook}));
 const socialQA=await J.analyzeRenderedFrames(socialPlan,{start:hook.start,end:hook.end},audio);
 const fullReview=J.checkMVQuality(project,plan,audio,{start:0,end:plan.duration},qa),socialReview=J.checkMVQuality(project,socialPlan,audio,{start:hook.start,end:hook.end},socialQA);
 const report={director5:{musicalStructure:plan.musicalStructure,beatSync:plan.beatSync,motifFatigue:plan.motifFatigue,visualWorld:plan.visualWorld},renderer:'JIZURA current source with @napi-rs/canvas; FFmpeg H.264/AAC validation; audio analysis from supplied 48 kHz PCM',audio:{duration:audio.duration,bpm:audio.bpm,features:audio.features,beats:audio.beats.length,firstBeats:audio.beats.slice(0,8)},plan:{style:plan.styleKey,lines:plan.lines.length,duration:plan.duration,styleArc:plan.styleArc,styleCompatibility:plan.styleCompatibility,visualEnergyDensity:plan.visualEnergyDensity,hookEngine:{version:plan.hookEngine.version,window:plan.hookEngine.window,patternInterrupt:plan.hookEngine.patternInterrupt,openingPunch:plan.hookEngine.openingPunch,openingAt:plan.hookEngine.openingAt},earlyHypeEvents:plan.hypeTimeline.filter(e=>e.t<3),hypeAudit:plan.hypeAudit,cutSummary:plan.cuts.filter(c=>c.line>=0).map(c=>({t:+c.start.toFixed(3),line:c.line,text:c.lineText,rep:c.repetitionIndex,progress:c.repetitionProgress,layout:c.layout,style:c.styleKey,scene:c.backgroundScene?.id,tokens:c.kineticTokens})),hookMetrics:J.hypeQuality(project,plan,audio,{start:0,end:plan.duration},qa),socialHook:hook,socialReedit:socialPlan.socialHookAudit||null,socialHookMetrics:J.hypeQuality(project,socialPlan,audio,{start:hook.start,end:hook.end},socialQA)},quality:fullReview.quality,qualityIssues:fullReview.issues,socialQuality:socialReview.quality,socialQualityIssues:socialReview.issues,audit:J.auditDirectionReality(plan,qa),pixelQA:qa.metrics,socialPixelQA:socialQA.metrics,socialCandidates:socialCandidates.slice(0,5),candidates:[]};
 fs.writeFileSync(path.join(outDir,'render_report.json'),JSON.stringify(report,null,2));
 for(const [name,time] of [['full-00s.png',0],['full-opening-beat.png',plan.hookEngine.openingAt+.02],['full-01s.png',1],['full-10s.png',10],['full-25s.png',25],['full-40s.png',40],['full-55s.png',55],['hook-00s.png',hook.start+.1],['hook-02s.png',hook.start+2],['hook-07s.png',hook.start+7],['hook-13s.png',hook.start+13]]){
  const selected=name.startsWith('hook')?socialPlan:plan,portrait=selected.H>selected.W,c=createCanvas(portrait?720:1280,portrait?1280:720);renderer.frame(c.getContext('2d'),selected,time,{scale:c.width/selected.W,production:true,range:name.startsWith('hook')?{start:hook.start,end:hook.end}:null});fs.writeFileSync(path.join(outDir,'representative_frames',name),c.toBuffer('image/png'));
 }
 if(process.env.JIZURA_INSPECT_ONLY==='1'){renderer.customBgBitmap?.close?.();console.log('INSPECT',JSON.stringify({firstBeats:report.audio.firstBeats,hookEngine:report.plan.hookEngine,earlyHypeEvents:report.plan.earlyHypeEvents},null,2));return;}
 if(process.env.JIZURA_SOCIAL_ONLY!=='1')await encode(plan,renderer,audioFile,full);
 await encode(socialPlan,renderer,audioFile,social,{start:hook.start,end:hook.end});
 for(const name of ['FULL_MV_SAMPLE.mp4','SOCIAL_HYPE_SAMPLE.mp4']){
  const bytes=fs.readFileSync(path.join(outDir,name)),validation=J.inspectMP4Buffer(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
  if(validation.container!=='mp4'||validation.videoCodec!=='avc1'||validation.audioCodec!=='mp4a')throw new Error(`${name}: MP4 validation failed ${JSON.stringify(validation)}`);
  report[name]={...validation,bytes:bytes.length};
 }
 const caps={h264:true,aac:true,webCodecs:true};report.quality=J.checkMVQuality({...project,res:720,aspect:'16:9'},plan,audio,{start:0,end:plan.duration},qa,caps,report['FULL_MV_SAMPLE.mp4']).quality;report.socialQuality=J.checkMVQuality({...project,res:720,aspect:'9:16'},socialPlan,audio,{start:hook.start,end:hook.end},socialQA,caps,report['SOCIAL_HYPE_SAMPLE.mp4']).quality;
 fs.writeFileSync(path.join(outDir,'render_report.json'),JSON.stringify(report,null,2));renderer.customBgBitmap?.close?.();
 console.log('COMPLETE',JSON.stringify({style:plan.styleKey,tier:plan.visualEnergyDensity,hook,full:report['FULL_MV_SAMPLE.mp4'],social:report['SOCIAL_HYPE_SAMPLE.mp4'],quality:{overall:report.quality.overallScore,technical:report.quality.technicalScore,creative:report.quality.creativeScore,social:report.quality.socialScore,confidence:report.quality.confidence},socialQuality:{overall:report.socialQuality.overallScore,technical:report.socialQuality.technicalScore,creative:report.socialQuality.creativeScore,social:report.socialQuality.socialScore,confidence:report.socialQuality.confidence}},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
