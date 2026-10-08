'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),os=require('node:os'),path=require('node:path'),vm=require('node:vm'),cp=require('node:child_process');
if(['ffmpeg','ffprobe'].some(name=>cp.spawnSync(name,['-version'],{stdio:'ignore'}).status!==0)){console.log('SKIPPED_ENVIRONMENT_MISSING: ffmpeg/ffprobe');process.exit(0);}
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'jizura-mp4-'));const mp4=path.join(dir,'test.mp4');
try{
 cp.execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-f','lavfi','-i','color=c=blue:s=320x240:r=30:d=1','-f','lavfi','-i','sine=frequency=440:duration=1','-c:v','libx264','-pix_fmt','yuv420p','-c:a','aac','-shortest','-movflags','+faststart',mp4],{stdio:'ignore'});
 const J={outputSize:()=>[320,240]},context={J,ArrayBuffer,DataView,Blob,TextEncoder,URL,console,Number,Set};
 vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/11_export.js'),'utf8'),context);
 const src=fs.readFileSync(mp4),bytes=src.buffer.slice(src.byteOffset,src.byteOffset+src.byteLength);
 const result=J.inspectMP4Buffer(bytes);assert.equal(result.videoCodec,'avc1');assert.equal(result.audioCodec,'mp4a');
 assert(result.duration>.9&&result.videoSamples>0&&result.audioSamples>0&&result.width===320);
 const fragmented=path.join(dir,'fragmented.mp4');
 cp.execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-i',mp4,'-c','copy','-movflags','+frag_keyframe+empty_moov+default_base_moof',fragmented],{stdio:'ignore'});
 const fragment=fs.readFileSync(fragmented),fr=J.inspectMP4Buffer(fragment.buffer.slice(fragment.byteOffset,fragment.byteOffset+fragment.byteLength));
 assert(fr.videoSamples>=30&&fr.audioSamples>0&&fr.duration>.9,'Fragmented MP4 must validate real sample runs');
 assert.throws(()=>J.inspectMP4Buffer(new ArrayBuffer(0)));
 const altered=bytes.slice(0),data=new Uint8Array(altered),marker=Buffer.from('avc1');
 for(let i=data.length-4;i>=0;i--)if(data[i]===marker[0]&&data[i+1]===marker[1]&&data[i+2]===marker[2]&&data[i+3]===marker[3]){data[i]=104;break;}
 assert.throws(()=>J.inspectMP4Buffer(altered));
 console.log('Real MP4 H.264/AAC structure and rejection tests passed.');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
