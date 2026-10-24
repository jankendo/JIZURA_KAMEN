import {registerAacEncoder} from '@mediabunny/aac-encoder';
import {Output,BufferTarget,Mp4OutputFormat,AudioBufferSource,Input,BufferSource,Mp4InputFormat,EncodedPacketSink,BlobSource,VideoSampleSink,AudioBufferSink,StreamTarget,EncodedPacket,EncodedVideoPacketSource,EncodedAudioPacketSource} from 'mediabunny';
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
  for await(const packet of sink.packets()){aborted();await onChunk(packet.toEncodedAudioChunk(),{decoderConfig});}
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
  const videoCodec=await track.getCodec(),audioTrack=await input.getPrimaryAudioTrack(),audioCodec=audioTrack?await audioTrack.getCodec():null;
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;const ctx=canvas.getContext('2d',{willReadFrequently:true});
  let index=0;
  for await(const sample of new VideoSampleSink(track).samplesAtTimestamps(timestamps)){
   try{if(signal?.aborted)throw Object.assign(new Error('Cancelled'),{name:'AbortError'});if(!sample)throw new Error('Missing decoded MP4 frame');sample.draw(ctx,0,0,width,height);onSample(timestamps[index++],ctx.getImageData(0,0,width,height).data,{timestamp:sample.timestamp,duration:sample.duration,width:sample.displayWidth,height:sample.displayHeight,videoCodec,audioCodec});}
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


// Positioned writes in fixed-size pages. Finalization patches only touched pages;
// no contiguous allocation proportional to the video size is made.
export class MP4BlockStore {
 constructor(pageSize=1024*1024){this.pageSize=pageSize;this.pages=[];this.size=0;}
 write(data,position){
  if(!Number.isSafeInteger(position)||position<0)throw Error('Invalid MP4 write position');
  for(let offset=0;offset<data.length;){const index=Math.floor(position/this.pageSize),start=position%this.pageSize,n=Math.min(data.length-offset,this.pageSize-start);this.pages[index]??=new Uint8Array(this.pageSize);this.pages[index].set(data.subarray(offset,offset+n),start);position+=n;offset+=n;}
  this.size=Math.max(this.size,position);
 }
 blob(){return new Blob(Array.from({length:Math.ceil(this.size/this.pageSize)},(_,i)=>(this.pages[i]||new Uint8Array(this.pageSize)).subarray(0,Math.min(this.pageSize,this.size-i*this.pageSize))),{type:'video/mp4'});}
 clear(){this.pages.length=0;}
}
window.JIZURAMedia.createMuxer=async({width,height,fps,audio})=>{
 const store=new MP4BlockStore(),target=new StreamTarget(new WritableStream({write:({data,position})=>store.write(data,position)}),{chunked:true,chunkSize:1024*1024});
 const output=new Output({format:new Mp4OutputFormat({fastStart:false}),target}),video=new EncodedVideoPacketSource('avc'),sound=audio?new EncodedAudioPacketSource('aac'):null;
 output.addVideoTrack(video,{frameRate:fps});if(sound)output.addAudioTrack(sound);
 await output.start();const pending={video:Promise.resolve(),audio:Promise.resolve()};let failure=null,complete=false;
 // Independent track queues prevent an ahead-of-video audio writer from blocking
 // the very video packets needed to release multiplexer backpressure.
 const enqueue=(kind,operation)=>{pending[kind]=pending[kind].then(operation).catch(e=>{failure??=e;});};
 const drain=async kind=>{await(kind?pending[kind]:Promise.all(Object.values(pending)));if(failure)throw failure;};
 return {
  addVideoChunk(chunk,meta){enqueue('video',()=>video.add(EncodedPacket.fromEncodedChunk(chunk),meta));},
  addAudioChunk(chunk,meta){if(!sound)throw Error('Unexpected audio packet');enqueue('audio',()=>sound.add(EncodedPacket.fromEncodedChunk(chunk),meta));},
  drain,
  async finalize(){await drain();video.close();sound?.close();await output.finalize();complete=true;},
  blob(){if(!complete)throw Error('MP4 is incomplete');return store.blob();},
  async cancel(){if(!complete)await output.cancel();store.clear();}
 };
};
window.JIZURAMedia.inspectMP4=async(blob,{requireAudio=true,signal}={})=>{
 const input=new Input({source:new BlobSource(blob),formats:[new Mp4InputFormat()]}),cancel=()=>input.dispose();signal?.addEventListener('abort',cancel,{once:true});
 try{
  if(signal?.aborted)throw new DOMException('Cancelled','AbortError');
  const video=await input.getPrimaryVideoTrack(),audio=await input.getPrimaryAudioTrack();
  if(!video||await video.getCodec()!=='avc')throw Error('H.264映像がありません');
  if(requireAudio&&(!audio||await audio.getCodec()!=='aac'))throw Error('AAC音声がありません');
  const stats=await video.computePacketStats(),duration=await video.computeDuration(),as=audio?await audio.computePacketStats():null,ad=audio?await audio.computeDuration():0;
  if(!stats.packetCount||!Number.isFinite(duration)||duration<=0||requireAudio&&!as?.packetCount)throw Error('映像・音声のサンプルが不足しています');
  return {container:'mp4',videoCodec:'avc1',audioCodec:audio?'mp4a':null,width:video.displayWidth,height:video.displayHeight,duration:Math.max(duration,ad),videoDuration:duration,audioDuration:ad,videoSamples:stats.packetCount,audioSamples:as?.packetCount||0,fps:stats.averagePacketRate,bytes:blob.size};
 }finally{signal?.removeEventListener('abort',cancel);input.dispose();}
};
