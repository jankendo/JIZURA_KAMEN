'use strict';
const fs=require('node:fs'),path=require('node:path'),{engine}=require('./custom_test_support.cjs');
(async()=>{
 const dir=process.argv[2],out=process.argv[3],{J,context}=engine();context.Path2D=require('@napi-rs/canvas').Path2D;
 const c=JSON.parse(fs.readFileSync(path.join(dir,'DIRECTOR_CONTEXT.json'))),p=J.defaultProject();J.enableSingleBackgroundMode();
 Object.assign(p,{title:'闘い極めろ',artist:'@Arijigoku_GMB',lyrics:fs.readFileSync(path.join(dir,'lyrics.lrc'),'utf8'),res:720,fps:30,autoDirection:true});
 const key=c.registrySelection.backgroundKey;p.customBg={...p.customBg,...JSON.parse(key.slice(key.indexOf('{'))),dataUrl:'data:image/png;base64,'+fs.readFileSync(path.join(dir,'assets/background.png')).toString('base64')};
 p.visualAssets=c.assets.map(a=>({...a,dataUrl:p.customBg.dataUrl}));const audio={duration:c.duration,beats:c.beats,features:c.audioFeatures},d=J.proposeDirection(p,audio,c.imageFeatures);
 Object.assign(d,{style:c.registrySelection.style,registrySelection:{...c.registrySelection,backgroundKey:J.registrySelectionBackgroundKey(p)}});Object.assign(p,{style:d.style,mood:d.mood,fx:d.fx,enabled:d.enabled,seed:d.seed,overrides:d.overrides});p.artDirection=J.makeArtDirection(p,audio,d);
 d.visualDNA={...d.visualDNA,layoutStrategy:'phraseRenderSelection',decorationStrategy:'none',typographyStyle:c.registrySelection.font};d.motionDNA={...d.motionDNA,font:c.registrySelection.font};p.artDirection=J.makeArtDirection(p,audio,d);
 const bytes=fs.readFileSync(path.join(dir,'audio.f32')),pcm=new Float32Array(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.length));audio.buffer={length:pcm.length,sampleRate:48000,numberOfChannels:1,duration:audio.duration,getChannelData:()=>pcm};
 context.window.AudioContext=class{async decodeAudioData(){return audio.buffer;}async close(){}};audio.buffer.duration=audio.duration;const measured=await J.analyzeAudio(new Blob([]));Object.assign(audio,measured);audio.beats=c.beats;
 const plan=J.plan(p,audio),pixel=await J.analyzeRenderedFrames(plan,null,audio),r=J.checkMVQuality(p,plan,audio,null,pixel);
 fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'project.json'),JSON.stringify(p));fs.writeFileSync(path.join(out,'plan.json'),JSON.stringify(plan));fs.writeFileSync(path.join(out,'score.json'),JSON.stringify({quality:r.quality,issues:r.issues,metrics:pixel.metrics},null,2));
 console.log(JSON.stringify({quality:r.quality.productionDomains,creative:r.quality.creativeScore,total:r.quality.overallScore,social:r.quality.socialScore,issues:r.issues.map(i=>i.code),alignment:pixel.metrics.observedVisualHitAlignment?.peaks.filter(x=>x.tier!=='Medium').map(x=>({t:x.time,aligned:x.aligned,error:x.timingErrorMs}))}));
})().catch(e=>{console.error(e);process.exitCode=1;});
