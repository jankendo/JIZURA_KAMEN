/* Exact-output profiling: decoded PCM is fixed; browser codec/decode time is excluded. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),baseline=process.argv[2]||root,pcmPath=process.argv[3],out=process.argv[4];
function load(directory,channels,sampleRate=48000){
 const duration=channels[0].length/sampleRate,audio={duration,sampleRate,length:channels[0].length,numberOfChannels:channels.length,getChannelData:c=>channels[c]},J={BPM_RANGE:{min:45,max:240}};
 class AudioContext{async decodeAudioData(){return audio;}async close(){}}
 const context=vm.createContext({J,window:{AudioContext},console,setTimeout,clearTimeout,performance,Float32Array,Float64Array,ArrayBuffer});
 vm.runInContext(fs.readFileSync(path.join(directory,'src/10_audio.js'),'utf8'),context);
 return {J,audio};
}
function normalize(result){const {buffer,...rest}=result;return structuredClone(rest);}
async function run(directory,channels,sampleRate=48000){const {J}=load(directory,channels,sampleRate),stages=[],stageTimes={},start=performance.now();let stageStart=start;const result=await J.analyzeAudio({name:'大阪・品質検証.m4a',arrayBuffer:async()=>new ArrayBuffer(0)},{onProgress:event=>{if(stages.at(-1)!==event.stage){const now=performance.now();if(stages.length)stageTimes[stages.at(-1)]=now-stageStart;stageStart=now;stages.push(event.stage);}}});stageTimes[stages.at(-1)]=performance.now()-stageStart;return {ms:performance.now()-start,result:normalize(result),stages,stageTimes};}
(async()=>{
 const fixtures=[];
 if(pcmPath){const data=fs.readFileSync(pcmPath),samples=new Float32Array(data.buffer,data.byteOffset,data.length/4),channels=[new Float32Array(samples.length/2),new Float32Array(samples.length/2)];for(let i=0;i<channels[0].length;i++){channels[0][i]=samples[i*2];channels[1][i]=samples[i*2+1];}fixtures.push({name:'provided-audio',channels});}
 const seconds=pcmPath?120:3,sr=48000,channels=[new Float32Array(sr*seconds),new Float32Array(sr*seconds)];for(let i=0;i<channels[0].length;i++){const pulse=(i%(sr/2))<sr*.045?Math.exp(-(i%(sr/2))/(sr*.009)):0;channels[0][i]=.25*Math.sin(i*2*Math.PI*110/sr)+pulse*.4;channels[1][i]=.2*Math.sin(i*2*Math.PI*173/sr)+pulse*.35;}fixtures.push({name:'stereo-rhythmic-'+seconds+'s',channels});
 fixtures.push({name:'silence',channels:[new Float32Array(sr*2)]});
 const reports=[];
 for(const fixture of fixtures){await run(baseline,fixture.channels);await run(root,fixture.channels);const before=[],after=[],beforeStages=[],afterStages=[];for(let i=0;i<3;i++){const a=await run(baseline,fixture.channels),b=await run(root,fixture.channels);assert.deepEqual(b.result,a.result,fixture.name+' exact analysis output');assert.deepEqual(b.stages,a.stages,fixture.name+' real stages');before.push(a.ms);after.push(b.ms);beforeStages.push(a.stageTimes);afterStages.push(b.stageTimes);}const median=a=>a.slice().sort((a,b)=>a-b)[1],b=median(before),a=median(after);reports.push({fixture:fixture.name,duration:fixture.channels[0].length/sr,beforeMs:b,afterMs:a,improvementPercent:(b-a)/b*100,beforeRunsMs:before,afterRunsMs:after,exactOutput:true,stageMediansMs:Object.fromEntries(Object.keys(beforeStages[0]).map(k=>[k,{before:median(beforeStages.map(s=>s[k])),after:median(afterStages.map(s=>s[k]))}]))});}
 const exactCases=[];
 for(const sampleRate of [22050,44100,96000]){
  const samples=sampleRate*3+137,channels=Array.from({length:3},(_,c)=>Float32Array.from({length:samples},(_,i)=>Math.sin(i*(.015+c*.023))*.23));
  const before=await run(baseline,channels,sampleRate),after=await run(root,channels,sampleRate);assert.deepEqual(after.result,before.result,'nonstandard sample rate and three-channel arithmetic');exactCases.push({sampleRate,channels:3,samples,exactOutput:true});
 }
 const report={exactCases,scope:'Application analysis of fixed decoded PCM; browser decode and input IO excluded',reports};if(out)fs.writeFileSync(out,JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
