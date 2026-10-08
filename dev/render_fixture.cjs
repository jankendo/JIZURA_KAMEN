/* Optional offline verification renderer: npm-installed @napi-rs/canvas + ffmpeg.
   Usage: node dev/render_fixture.cjs fixture.json audio.f32 audio.m4a fontDir outputDir
   Audio analysis input is mono float32 little endian, 48kHz. Original audio is copied. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process'),{once}=require('node:events');
const {createCanvas,loadImage,GlobalFonts}=require('@napi-rs/canvas');
(async()=>{
const [fixture,pcm,audioFile,fontDir,outDir]=process.argv.slice(2);fs.mkdirSync(outDir,{recursive:true});
for(const name of fs.readdirSync(fontDir))GlobalFonts.registerFromPath(path.join(fontDir,name));
const raw=fs.readFileSync(pcm),samples=new Float32Array(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength));
const audioBuffer={sampleRate:48000,length:samples.length,duration:samples.length/48000,numberOfChannels:1,getChannelData:()=>samples};
class AC{async decodeAudioData(){return audioBuffer;}close(){}}
const window={AudioContext:AC},document={getElementById:()=>null,createElement:tag=>tag==='canvas'?createCanvas(1,1):{setAttribute(){},appendChild(){}},fonts:{load:async()=>[],ready:Promise.resolve(),check:()=>true},head:{appendChild(){}}};
const context=vm.createContext({window,document,console,Blob,TextEncoder,URL,fetch,createImageBitmap:async b=>loadImage(Buffer.from(await b.arrayBuffer())),ArrayBuffer,DataView,setTimeout,clearTimeout,performance,requestAnimationFrame:f=>setTimeout(()=>f(performance.now()),0)});
const root=path.resolve(__dirname,'..');for(const name of fs.readdirSync(path.join(root,'src')).filter(x=>x.endsWith('.js')&&!x.startsWith('12_')).sort())vm.runInContext(fs.readFileSync(path.join(root,'src',name),'utf8'),context,{filename:name});
const J=window.J;J.ensureFonts=async()=>{};
const project=JSON.parse(fs.readFileSync(fixture)),audio=await J.analyzeAudio(new Blob([raw]));
const original=J.plan(project,audio),beforePixels=await J.analyzeRenderedFrames(original,null,audio);
const before=J.checkMVQuality(project,original,audio,null,beforePixels);
const set=await J.optimizeDirectionCandidatesRendered(project,audio,project.autoPalette.stats,3),best=set.recommended;
Object.assign(project,{style:best.proposal.style,mood:best.proposal.mood,fx:best.proposal.fx,enabled:best.proposal.enabled,seed:best.proposal.seed,autoDirection:true,fonts:{}});project.artDirection=J.makeArtDirection(project,audio,best.proposal);project.fonts={...project.artDirection.typography};
const plan=J.plan(project,audio),pixels=await J.analyzeRenderedFrames(plan,null,audio);
const report={renderer:'JIZURA source with @napi-rs/canvas; independent offline encoder, not browser export validation',before:{quality:before.quality,audit:before.directionReality},after:{style:project.style,quality:J.checkMVQuality(project,plan,audio,null,pixels).quality,audit:J.auditDirectionReality(plan,pixels)},candidates:set.candidates.map(x=>({style:x.proposal.style,score:x.score})),pixels:pixels.metrics};
fs.writeFileSync(path.join(outDir,'QA.json'),JSON.stringify(report,null,2));console.log('Style',project.style,'font',plan.artDirection.typography,'quality',(report.after.quality.overallScore??report.after.quality.score));
const renderer=new J.Renderer();await renderer.loadCustomBackground(plan.customBg.dataUrl);const canvas=createCanvas(1280,720),ctx=canvas.getContext('2d');
const output=path.join(outDir,'JIZURA_After.mp4'),encoder=cp.spawn('ffmpeg',['-hide_banner','-loglevel','error','-f','image2pipe','-vcodec','mjpeg','-framerate','30','-i','pipe:0','-i',audioFile,'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','fast','-crf','18','-pix_fmt','yuv420p','-c:a','copy','-t',String(plan.duration),'-movflags','+faststart','-y',output],{stdio:['pipe','inherit','inherit']});
const total=Math.round(plan.duration*30);for(let i=0;i<total;i++){
 renderer.frame(ctx,plan,i/30,{scale:1280/plan.W,production:true});if(i===600)fs.writeFileSync(path.join(outDir,'After.png'),canvas.toBuffer('image/png'));
 if(!encoder.stdin.write(canvas.toBuffer('image/jpeg',95)))await once(encoder.stdin,'drain');if(i%150===0)console.log(i+'/'+total);
}encoder.stdin.end();const [code]=await once(encoder,'close');if(code)throw new Error('ffmpeg failed '+code);
const bytes=fs.readFileSync(output),validation=J.inspectMP4Buffer(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));report.offlineMP4=validation;report.after.qualityWithOfflineFile=J.checkMVQuality(project,plan,audio,null,pixels,null,validation).quality;fs.writeFileSync(path.join(outDir,'QA.json'),JSON.stringify(report,null,2));console.log('COMPLETE',validation);
})().catch(e=>{console.error(e);process.exitCode=1;});
