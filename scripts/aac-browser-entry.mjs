import {registerAacEncoder} from '@mediabunny/aac-encoder';
import {Output,BufferTarget,Mp4OutputFormat,AudioBufferSource,Input,BufferSource,Mp4InputFormat,EncodedPacketSink,BlobSource,VideoSampleSink,AudioBufferSink} from 'mediabunny';
let registered=false;
window.JIZURAAAC={async encode(buffer,bitrate,onChunk,{signal,onProgress}={}){
 if(!registered){registerAacEncoder();registered=true;}
 const target=new BufferTarget(),output=new Output({format:new Mp4OutputFormat(),target}),source=new AudioBufferSource({codec:'aac',bitrate});
 const aborted=()=>{if(signal?.aborted)throw Object.assign(new Error('Cancelled'),{name:'AbortError'});};
 const cancel=()=>{void output.cancel().catch(()=>{});};signal?.addEventListener('abort',cancel,{once:true});
 let input;
 try{
  aborted();output.addAudioTrack(source);await output.start();
  // Small PCM blocks make progress and cancellation observable during WASM work.
  const block=buffer.sampleRate;
  for(let off=0;off<buffer.length;off+=block){aborted();const n=Math.min(block,buffer.length-off),part=new AudioBuffer({length:n,sampleRate:buffer.sampleRate,numberOfChannels:buffer.numberOfChannels});
   for(let c=0;c<buffer.numberOfChannels;c++)part.copyToChannel(buffer.getChannelData(c).subarray(off,off+n),c);
   await source.add(part);onProgress?.(off+n,buffer.length);await new Promise(r=>setTimeout(r,0));
  }
  aborted();await output.finalize();aborted();
  input=new Input({source:new BufferSource(target.buffer),formats:[new Mp4InputFormat()]});
  const track=await input.getPrimaryAudioTrack(),decoderConfig=await track.getDecoderConfig(),sink=new EncodedPacketSink(track);
  for await(const packet of sink.packets()){aborted();onChunk(packet.toEncodedAudioChunk(),{decoderConfig});}
 }finally{signal?.removeEventListener('abort',cancel);input?.dispose();}
}};

// Ordered timestamps let the decoder process each H.264 packet at most once.
// Keep the exact observer sampling cadence; release each decoded frame immediately.
window.JIZURAMedia={async sampleMP4(blob,timestamps,{width,height,onSample,signal}={}){
 const input=new Input({source:new BlobSource(blob),formats:[new Mp4InputFormat()]});
 const cancel=()=>input.dispose();signal?.addEventListener('abort',cancel,{once:true});
 try{
  if(signal?.aborted)throw Object.assign(new Error('Cancelled'),{name:'AbortError'});
  const track=await input.getPrimaryVideoTrack();if(!track||!await track.canDecode())throw new Error('Sequential H.264 decoder unavailable');
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:true});
  let index=0;
  for await(const sample of new VideoSampleSink(track).samplesAtTimestamps(timestamps)){
   try{if(signal?.aborted)throw Object.assign(new Error('Cancelled'),{name:'AbortError'});if(!sample)throw new Error('Missing decoded MP4 frame');sample.draw(ctx,0,0,width,height);onSample(timestamps[index++],ctx.getImageData(0,0,width,height).data);}
   finally{sample?.close();}
  }
  if(index!==timestamps.length)throw new Error('Incomplete decoded MP4 samples');
 }finally{signal?.removeEventListener('abort',cancel);input.dispose();}
}};

// Inspect the encoded AAC track, not the input PCM. Retain only 20 ms per end.
window.JIZURAMedia.audioEndpoints=async(blob,{signal}={})=>{
 const input=new Input({source:new BlobSource(blob),formats:[new Mp4InputFormat()]}),cancel=()=>input.dispose();signal?.addEventListener('abort',cancel,{once:true});
 try{if(signal?.aborted)throw Object.assign(Error('Cancelled'),{name:'AbortError'});const track=await input.getPrimaryAudioTrack();if(!track||!await track.canDecode())return null;const duration=await track.computeDuration(),sink=new AudioBufferSink(track),ends=[];
 for(const [from,to] of [[0,.02],[Math.max(0,duration-.02),duration]]){const channels=[];let rate=0;for await(const part of sink.buffers(Math.max(0,from-.05),to)){if(signal?.aborted)throw Object.assign(Error('Cancelled'),{name:'AbortError'});const b=part.buffer;rate=b.sampleRate;const a=Math.max(0,Math.ceil((from-part.timestamp)*rate)),z=Math.min(b.length,Math.ceil((to-part.timestamp)*rate));if(z>a)for(let c=0;c<b.numberOfChannels;c++){channels[c]??=[];channels[c].push(...b.getChannelData(c).subarray(a,z));}}ends.push({channels,sampleRate:rate});}
 return {duration,head:ends[0],tail:ends[1],source:'decoded final MP4 AAC endpoint PCM',windowSeconds:.02};
 }finally{signal?.removeEventListener('abort',cancel);input.dispose();}
};
